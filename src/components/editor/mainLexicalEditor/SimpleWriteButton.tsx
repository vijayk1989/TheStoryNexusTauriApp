import { useCallback, useRef, useState } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext.js";
import {
    $getRoot,
    $getSelection,
    $isElementNode,
    $isRangeSelection,
    $isTextNode,
    $setSelection,
    type LexicalNode,
    type RangeSelection,
} from "lexical";
import { Pencil, Square } from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { GenerationSetupDialog } from "@/features/ai/components/GenerationSetupDialog";
import { useAIStore } from "@/features/ai/stores/useAIStore";
import {
    getGenerationSetupIssue,
    resolveIntendedGenerationModel,
} from "@/features/ai/utils/generationSetup";
import { useChapterStore } from "@/features/chapters/stores/useChapterStore";
import { useEditorSaveStatusStore } from "@/features/editor/stores/useEditorSaveStatusStore";
import { saveLastEditorTarget } from "@/features/editor/utils/lastEditorTarget";
import { useLorebookStore } from "@/features/lorebook/stores/useLorebookStore";
import { SUPPLIED_CONTINUE_WRITING_PROMPT_ID } from "@/features/prompts/constants";
import { usePromptStore } from "@/features/prompts/store/promptStore";
import { useStoryContext } from "@/features/stories/context/StoryContext";
import { useStoryStore } from "@/features/stories/stores/useStoryStore";
import type { AllowedModel, Prompt, PromptParserConfig } from "@/types/story";

import { $isSceneBeatNode } from "./nodes/SceneBeatNode";
import { SIMPLE_WRITE_STREAM_TAG } from "./simpleWrite";

type SimpleWriteButtonProps = {
    onStreamingChange?: (isStreaming: boolean) => void;
};

type PendingSimpleWrite = {
    config: PromptParserConfig;
};

export function SimpleWriteButton({ onStreamingChange }: SimpleWriteButtonProps) {
    const [editor] = useLexicalComposerContext();
    const { currentStoryId, currentChapterId } = useStoryContext();
    const { currentStory } = useStoryStore();
    const { currentChapter, updateChapter } = useChapterStore();
    const { chapterMatchedEntries } = useLorebookStore();
    const { initialize, generateWithPrompt, processStreamedResponse, abortGeneration } = useAIStore();
    const { fetchPrompts } = usePromptStore();
    const { setStatus, markSaved } = useEditorSaveStatusStore();
    const [isGenerating, setIsGenerating] = useState(false);
    const [setupOpen, setSetupOpen] = useState(false);
    const [setupPrompt, setSetupPrompt] = useState<Prompt | null>(null);
    const [setupModel, setSetupModel] = useState<AllowedModel>();
    const savedSelectionRef = useRef<RangeSelection | null>(null);
    const pendingWriteRef = useRef<PendingSimpleWrite | null>(null);
    const abortRequestedRef = useRef(false);
    const hasInsertedTokensRef = useRef(false);

    const captureCursorContext = useCallback(() => {
        let previousWords = "";
        let afterWords = "";
        let hasCursor = false;
        let hasExpandedSelection = false;

        editor.getEditorState().read(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;

            if (!selection.isCollapsed()) {
                hasExpandedSelection = true;
                return;
            }

            hasCursor = true;
            savedSelectionRef.current = selection.clone();
            previousWords = collectTextBeforeSelection(selection);
            afterWords = collectTextAfterSelection(selection);
        });

        return { previousWords, afterWords, hasCursor, hasExpandedSelection };
    }, [editor]);

    const insertTokenAtSavedSelection = useCallback((token: string) => {
        editor.update(() => {
            if (!savedSelectionRef.current) return;

            $setSelection(savedSelectionRef.current);
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;

            selection.insertText(token);
            savedSelectionRef.current = selection.clone();
            hasInsertedTokensRef.current = true;
        }, { tag: SIMPLE_WRITE_STREAM_TAG });
    }, [editor]);

    const saveFinalContent = useCallback(async () => {
        if (!currentChapterId) return;

        const content = JSON.stringify(editor.getEditorState().toJSON());
        setStatus("saving");

        try {
            await updateChapter(currentChapterId, { content });
            if (currentStoryId) {
                saveLastEditorTarget({ storyId: currentStoryId, chapterId: currentChapterId });
            }
            markSaved();
        } catch (error) {
            console.error("Simple Write save failed:", error);
            setStatus("error");
            throw error;
        }
    }, [currentChapterId, currentStoryId, editor, markSaved, setStatus, updateChapter]);

    const executeSimpleWrite = useCallback(async (
        pendingWrite: PendingSimpleWrite,
        model: AllowedModel,
    ) => {
        setIsGenerating(true);
        onStreamingChange?.(true);
        abortRequestedRef.current = false;
        hasInsertedTokensRef.current = false;

        try {
            const response = await generateWithPrompt(pendingWrite.config, model);

            if (!response.ok && response.status !== 204) {
                throw new Error("Failed to generate response");
            }
            if (response.status === 204) return;

            let streamCompleted = false;
            await processStreamedResponse(
                response,
                insertTokenAtSavedSelection,
                () => {
                    streamCompleted = true;
                    if (abortRequestedRef.current) {
                        toast.info("Write stopped.");
                    } else {
                        toast.success("Simple Write complete.");
                    }
                },
                (error) => {
                    console.error("Simple Write stream failed:", error);
                    toast.error("Simple Write failed.");
                }
            );

            if (streamCompleted && hasInsertedTokensRef.current) {
                await saveFinalContent();
            }
        } catch (error) {
            console.error("Simple Write failed:", error);
            if (abortRequestedRef.current) {
                toast.info("Write stopped.");
                if (hasInsertedTokensRef.current) {
                    await saveFinalContent();
                }
            } else {
                toast.error(error instanceof Error ? error.message : "Simple Write failed.");
            }
        } finally {
            savedSelectionRef.current = null;
            setIsGenerating(false);
            onStreamingChange?.(false);
            abortRequestedRef.current = false;
            hasInsertedTokensRef.current = false;
        }
    }, [
        abortGeneration,
        generateWithPrompt,
        insertTokenAtSavedSelection,
        onStreamingChange,
        processStreamedResponse,
        saveFinalContent,
    ]);

    const handleSimpleWrite = useCallback(async () => {
        if (isGenerating) {
            abortRequestedRef.current = true;
            abortGeneration();
            return;
        }

        if (!currentStoryId || !currentChapterId) {
            toast.error("Open a chapter before using Simple Write.");
            return;
        }

        const { previousWords, afterWords, hasCursor, hasExpandedSelection } = captureCursorContext();
        if (hasExpandedSelection) {
            toast.error("Place the cursor where Simple Write should continue.");
            return;
        }
        if (!hasCursor) {
            editor.focus();
            toast.error("Place the cursor where Simple Write should continue.");
            return;
        }

        try {
            await initialize();
            await fetchPrompts();

            const settings = useAIStore.getState().settings;
            const prompts = usePromptStore.getState().prompts;
            const prompt = resolveContinueWritingPrompt(
                prompts,
                settings?.simpleWriteUseCustomPrompt,
                settings?.defaultContinueWritingPromptId,
            );
            if (!prompt) throw new Error("No Continue Writing prompt is available.");

            const includeAfterWords = Boolean(
                settings?.simpleWriteUseCustomPrompt || settings?.simpleWriteIncludeAfterCursor,
            );
            const pendingWrite: PendingSimpleWrite = {
                config: {
                    promptId: prompt.id,
                    storyId: currentStoryId,
                    chapterId: currentChapterId,
                    previousWords,
                    afterWords: includeAfterWords ? afterWords : undefined,
                    chapterMatchedEntries: new Set(
                        chapterMatchedEntries ? Array.from(chapterMatchedEntries.values()) : [],
                    ),
                    matchedEntries: new Set(
                        chapterMatchedEntries ? Array.from(chapterMatchedEntries.values()) : [],
                    ),
                    storyLanguage: currentStory?.language || "English",
                    povType: currentChapter?.povType,
                    povCharacter: currentChapter?.povCharacter,
                },
            };
            const model = resolveIntendedGenerationModel(
                settings,
                settings?.defaultContinueWritingModelId,
                prompt.allowedModels,
            );

            if (getGenerationSetupIssue(settings, model)) {
                pendingWriteRef.current = pendingWrite;
                setSetupPrompt(prompt);
                setSetupModel(model);
                setSetupOpen(true);
                return;
            }

            await executeSimpleWrite(pendingWrite, model);
        } catch (error) {
            savedSelectionRef.current = null;
            console.error("Simple Write failed:", error);
            toast.error(error instanceof Error ? error.message : "Simple Write failed.");
        }
    }, [
        abortGeneration,
        captureCursorContext,
        chapterMatchedEntries,
        currentChapter,
        currentChapterId,
        currentStory,
        currentStoryId,
        editor,
        executeSimpleWrite,
        fetchPrompts,
        initialize,
        isGenerating,
    ]);

    const handleSetupOpenChange = useCallback((open: boolean) => {
        setSetupOpen(open);
        if (!open && pendingWriteRef.current) {
            pendingWriteRef.current = null;
            savedSelectionRef.current = null;
        }
    }, []);

    const handleSetupRetry = useCallback(async (model: AllowedModel) => {
        const pendingWrite = pendingWriteRef.current;
        if (!pendingWrite) return;
        pendingWriteRef.current = null;
        await executeSimpleWrite(pendingWrite, model);
    }, [executeSimpleWrite]);

    return (
        <>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5"
                aria-label={isGenerating ? "Stop Write" : "Simple Write"}
                title={isGenerating ? "Stop Write" : "Simple Write"}
                data-testid="simple-write-button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={handleSimpleWrite}
            >
                {isGenerating ? (
                    <Square className="h-3.5 w-3.5" />
                ) : (
                    <Pencil className="h-4 w-4" />
                )}
                <span>{isGenerating ? "Stop" : "Write"}</span>
            </Button>
            <GenerationSetupDialog
                open={setupOpen}
                prompt={setupPrompt}
                initialModel={setupModel}
                onOpenChange={handleSetupOpenChange}
                onRetry={handleSetupRetry}
            />
        </>
    );
}

function resolveContinueWritingPrompt(
    prompts: Prompt[],
    useCustomPrompt: boolean | undefined,
    savedPromptId: string | undefined
): Prompt | undefined {
    const suppliedPrompt = prompts.find((prompt) => prompt.id === SUPPLIED_CONTINUE_WRITING_PROMPT_ID);
    const savedPrompt = savedPromptId
        ? prompts.find((prompt) => prompt.id === savedPromptId)
        : undefined;
    const firstCustomPrompt = prompts.find(
        (prompt) => prompt.promptType === "continue_writing" && !prompt.isSystem
    );
    const firstContinueWritingPrompt = prompts.find((prompt) => prompt.promptType === "continue_writing");

    return useCustomPrompt
        ? savedPrompt || firstCustomPrompt || suppliedPrompt || firstContinueWritingPrompt
        : suppliedPrompt || savedPrompt || firstContinueWritingPrompt;
}

function collectTextBeforeSelection(selection: RangeSelection): string {
    const anchorNode = selection.anchor.getNode();
    const anchorOffset = selection.anchor.offset;
    const textParts: string[] = [];
    let reachedAnchor = false;

    const traverse = (node: LexicalNode): boolean => {
        if (reachedAnchor) return true;
        if ($isSceneBeatNode(node)) return false;

        if (node.is(anchorNode)) {
            if ($isTextNode(node)) {
                textParts.push(node.getTextContent().substring(0, anchorOffset));
            } else if ($isElementNode(node)) {
                for (const child of node.getChildren().slice(0, anchorOffset)) {
                    collectNodeText(child, textParts);
                }
            }
            reachedAnchor = true;
            return true;
        }

        if ($isTextNode(node)) {
            textParts.push(node.getTextContent());
            return false;
        }

        if ($isElementNode(node)) {
            for (const child of node.getChildren()) {
                if (traverse(child)) return true;
            }
        }

        return false;
    };

    traverse($getRoot());
    return textParts.join("");
}

function collectTextAfterSelection(selection: RangeSelection): string {
    const anchorNode = selection.anchor.getNode();
    const anchorOffset = selection.anchor.offset;
    const textParts: string[] = [];
    let reachedAnchor = false;

    const traverse = (node: LexicalNode): void => {
        if ($isSceneBeatNode(node)) return;

        if (node.is(anchorNode)) {
            if ($isTextNode(node)) {
                textParts.push(node.getTextContent().substring(anchorOffset));
            } else if ($isElementNode(node)) {
                for (const child of node.getChildren().slice(anchorOffset)) {
                    collectNodeText(child, textParts);
                }
            }
            reachedAnchor = true;
            return;
        }

        if (reachedAnchor) {
            collectNodeText(node, textParts);
            return;
        }

        if ($isElementNode(node)) {
            for (const child of node.getChildren()) {
                traverse(child);
            }
        }
    };

    traverse($getRoot());
    return textParts.join("");
}

function collectNodeText(node: LexicalNode, textParts: string[]): void {
    if ($isSceneBeatNode(node)) return;
    if ($isTextNode(node)) {
        textParts.push(node.getTextContent());
        return;
    }
    if ($isElementNode(node)) {
        for (const child of node.getChildren()) {
            collectNodeText(child, textParts);
        }
    }
}
