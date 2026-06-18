/**
 * useSelectionAiRewrite — hook that owns AI generation, selection bookmarking,
 * accept/reject, and context state for the floating toolbar's rewrite flow.
 */

import { useCallback, useRef, useState } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
    $getSelection,
    $isRangeSelection,
    $isTextNode,
    $setSelection,
    type RangeSelection,
} from "lexical";
import { toast } from "react-toastify";

import { useAIStore } from "@/features/ai/stores/useAIStore";
import { useChapterStore } from "@/features/chapters/stores/useChapterStore";
import { useLorebookStore } from "@/features/lorebook/stores/useLorebookStore";
import { usePromptStore } from "@/features/prompts/store/promptStore";
import { createPromptParser } from "@/features/prompts/services/promptParser";
import { useStoryContext } from "@/features/stories/context/StoryContext";
import { useStoryStore } from "@/features/stories/stores/useStoryStore";
import type {
    AllowedModel,
    LorebookEntry,
    Prompt,
    PromptMessage,
    PromptParserConfig,
} from "@/types/story";

import { $isSceneBeatNode } from "../nodes/SceneBeatNode";

export function useSelectionAiRewrite() {
    const [editor] = useLexicalComposerContext();
    const { currentStoryId, currentChapterId } = useStoryContext();
    const { prompts, fetchPrompts, isLoading, error } = usePromptStore();
    const { generateWithPrompt, processStreamedResponse, abortGeneration } = useAIStore();
    const { currentStory } = useStoryStore();
    const { currentChapter } = useChapterStore();
    const { entries } = useLorebookStore();

    // ── quick-fire prompt selection ────────────────────────────
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt>();
    const [selectedModel, setSelectedModel] = useState<AllowedModel>();

    // ── custom rewrite panel ──────────────────────────────────
    const [showCustomRewrite, setShowCustomRewrite] = useState(false);
    const [customInstruction, setCustomInstruction] = useState("");
    const [customSelectedPrompt, setCustomSelectedPrompt] = useState<Prompt>();
    const [customSelectedModel, setCustomSelectedModel] = useState<AllowedModel>();

    // ── shared generation state ───────────────────────────────
    const [isGenerating, setIsGenerating] = useState(false);
    const [savedSelectionText, setSavedSelectionText] = useState("");
    const [rewrittenText, setRewrittenText] = useState("");
    const [showConfirmation, setShowConfirmation] = useState(false);
    const savedSelectionRef = useRef<RangeSelection | null>(null);

    // ── prompt preview ────────────────────────────────────────
    const [showPreviewDialog, setShowPreviewDialog] = useState(false);
    const [previewMessages, setPreviewMessages] = useState<PromptMessage[]>();
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);

    // ── inline prompt preview ─────────────────────────────────
    const [showInlinePreview, setShowInlinePreview] = useState(false);
    const [inlinePreviewMessages, setInlinePreviewMessages] = useState<PromptMessage[]>();
    const [inlinePreviewLoading, setInlinePreviewLoading] = useState(false);
    const [inlinePreviewError, setInlinePreviewError] = useState<string | null>(null);

    // ── lorebook context ──────────────────────────────────────
    const [useCustomContext, setUseCustomContext] = useState(false);
    const [includeAllLorebook, setIncludeAllLorebook] = useState(false);
    const [selectedContextItems, setSelectedContextItems] = useState<LorebookEntry[]>([]);
    const [showContextSection, setShowContextSection] = useState(false);

    // ── helpers ───────────────────────────────────────────────

    /** Collect text before the current selection for previous-words context. */
    const collectPreviousText = useCallback((): string => {
        let previousWords = "";
        editor.getEditorState().read(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;

            const anchorNode = selection.anchor.getNode();
            const anchorOffset = selection.anchor.offset;
            const focusNode = selection.focus.getNode();
            const focusOffset = selection.focus.offset;
            const isBackward = selection.isBackward();
            const startNode = isBackward ? focusNode : anchorNode;
            const startOffset = isBackward ? focusOffset : anchorOffset;

            const textParts: string[] = [];
            let reachedStartNode = false;

            const traverseNodes = (node: any): boolean => {
                if (reachedStartNode) return true;
                if ($isSceneBeatNode(node)) return false;

                if (node.is(startNode)) {
                    if ($isTextNode(node)) {
                        textParts.push(node.getTextContent().substring(0, startOffset));
                    }
                    reachedStartNode = true;
                    return true;
                }

                if ($isTextNode(node)) {
                    textParts.push(node.getTextContent());
                    return false;
                }

                if (typeof node.getChildren === "function") {
                    for (const child of node.getChildren()) {
                        if (traverseNodes(child)) return true;
                    }
                }

                return false;
            };

            const rootNode = editor.getEditorState()._nodeMap.get("root");
            if (rootNode) traverseNodes(rootNode);
            previousWords = textParts.join("");
        });
        return previousWords;
    }, [editor]);

    /** Build a PromptParserConfig for a quick-fire or custom rewrite. */
    const buildConfig = useCallback(
        (prompt: Prompt, selectionText: string, instruction?: string): PromptParserConfig => {
            if (!currentStoryId || !currentChapterId) {
                throw new Error("No story or chapter context found");
            }

            const previousWords = collectPreviousText();

            const config: PromptParserConfig = {
                promptId: prompt.id,
                storyId: currentStoryId,
                chapterId: currentChapterId,
                previousWords,
                additionalContext: { selectedText: selectionText },
                storyLanguage: currentStory?.language || "English",
                povType: currentChapter?.povType || "Third Person Omniscient",
                povCharacter: currentChapter?.povCharacter || "",
            };

            if (instruction !== undefined) {
                config.scenebeat = instruction.trim() || undefined;
                config.sceneBeatContext = {
                    useMatchedChapter: true,
                    useMatchedSceneBeat: false,
                    useCustomContext,
                    customContextItems: useCustomContext
                        ? selectedContextItems.map((item) => item.id)
                        : [],
                };
            }

            return config;
        },
        [
            collectPreviousText,
            currentChapter,
            currentChapterId,
            currentStory,
            currentStoryId,
            selectedContextItems,
            useCustomContext,
        ],
    );

    // ── quick-fire prompt handlers ────────────────────────────

    const handlePromptSelect = useCallback((prompt: Prompt, model: AllowedModel) => {
        setSelectedPrompt(prompt);
        setSelectedModel(model);
    }, []);

    const handleGenerateWithPrompt = useCallback(async () => {
        if (!selectedPrompt || !selectedModel) {
            toast.error("Please select a prompt and model first");
            return;
        }

        let selectionText = "";
        editor.getEditorState().read(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                selectionText = selection.getTextContent();
                savedSelectionRef.current = selection.clone();
            }
        });

        if (!selectionText) {
            toast.error("No text selected");
            return;
        }

        setSavedSelectionText(selectionText);
        setIsGenerating(true);
        setRewrittenText("");

        try {
            const config = buildConfig(selectedPrompt, selectionText);
            const response = await generateWithPrompt(config, selectedModel);

            if (!response.ok && response.status !== 204) {
                throw new Error("Failed to generate response");
            }
            if (response.status === 204) {
                setIsGenerating(false);
                return { aborted: true };
            }

            let accumulatedText = "";
            await processStreamedResponse(
                response,
                (token) => {
                    accumulatedText += token;
                    setRewrittenText(accumulatedText);
                },
                () => {
                    setShowConfirmation(true);
                    setIsGenerating(false);
                },
                (error) => {
                    console.error("Error streaming response:", error);
                    toast.error("Failed to generate text");
                    setIsGenerating(false);
                },
            );
            return { aborted: false };
        } catch (error) {
            console.error("Error generating text:", error);
            toast.error("Failed to generate text");
            setIsGenerating(false);
            return { aborted: false };
        }
    }, [buildConfig, editor, generateWithPrompt, processStreamedResponse, selectedModel, selectedPrompt]);

    // ── preview ───────────────────────────────────────────────

    const handlePreviewPrompt = useCallback(async () => {
        if (!selectedPrompt) {
            toast.error("Please select a prompt first");
            return;
        }

        setPreviewLoading(true);
        setPreviewError(null);
        setPreviewMessages(undefined);

        try {
            let selectionText = "";
            editor.getEditorState().read(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    selectionText = selection.getTextContent();
                }
            });

            const promptParser = createPromptParser();
            const config = buildConfig(selectedPrompt, selectionText);
            const result = await promptParser.parse(config);

            if (result.error) {
                setPreviewError(result.error);
            } else {
                setPreviewMessages(result.messages);
            }
        } catch (error) {
            console.error("Error previewing prompt:", error);
            setPreviewError(
                error instanceof Error ? error.message : "Failed to preview prompt",
            );
        } finally {
            setPreviewLoading(false);
            setShowPreviewDialog(true);
        }
    }, [buildConfig, editor, selectedPrompt]);

    // ── custom rewrite ────────────────────────────────────────

    const handleOpenCustomRewrite = useCallback(() => {
        editor.getEditorState().read(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                const text = selection.getTextContent();
                setSavedSelectionText(text);
                savedSelectionRef.current = selection.clone();
                setShowCustomRewrite(true);
                setCustomInstruction("");
                setCustomSelectedPrompt(undefined);
                setCustomSelectedModel(undefined);
            }
        });
    }, [editor]);

    const handleCustomPromptSelect = useCallback((prompt: Prompt, model: AllowedModel) => {
        setCustomSelectedPrompt(prompt);
        setCustomSelectedModel(model);
    }, []);

    const handleCustomGenerate = useCallback(async () => {
        if (!customSelectedPrompt || !customSelectedModel) {
            toast.error("Please select a prompt and model first");
            return;
        }
        if (!savedSelectionText) {
            toast.error("No text selected");
            return;
        }

        setIsGenerating(true);
        setRewrittenText("");
        setShowInlinePreview(false);

        try {
            const config = buildConfig(customSelectedPrompt, savedSelectionText, customInstruction);
            const response = await generateWithPrompt(config, customSelectedModel);

            if (!response.ok && response.status !== 204) {
                throw new Error("Failed to generate response");
            }
            if (response.status === 204) {
                setIsGenerating(false);
                return;
            }

            let accumulatedText = "";
            await processStreamedResponse(
                response,
                (token) => {
                    accumulatedText += token;
                    setRewrittenText(accumulatedText);
                },
                () => {
                    setShowCustomRewrite(false);
                    setShowConfirmation(true);
                    setIsGenerating(false);
                },
                (error) => {
                    console.error("Error streaming response:", error);
                    toast.error("Failed to generate text");
                    setIsGenerating(false);
                },
            );
        } catch (error) {
            console.error("Error generating text:", error);
            toast.error("Failed to generate text");
            setIsGenerating(false);
        }
    }, [
        buildConfig,
        customInstruction,
        customSelectedModel,
        customSelectedPrompt,
        generateWithPrompt,
        processStreamedResponse,
        savedSelectionText,
    ]);

    const handleCustomPreviewPrompt = useCallback(async () => {
        if (!customSelectedPrompt) {
            toast.error("Please select a prompt first");
            return;
        }

        if (showInlinePreview) {
            setShowInlinePreview(false);
            return;
        }

        setInlinePreviewLoading(true);
        setInlinePreviewError(null);
        setInlinePreviewMessages(undefined);
        setShowInlinePreview(true);

        try {
            const promptParser = createPromptParser();
            const config = buildConfig(customSelectedPrompt, savedSelectionText, customInstruction);
            const result = await promptParser.parse(config);

            if (result.error) {
                setInlinePreviewError(result.error);
            } else {
                setInlinePreviewMessages(result.messages);
            }
        } catch (error) {
            console.error("Error previewing prompt:", error);
            setInlinePreviewError(
                error instanceof Error ? error.message : "Failed to preview prompt",
            );
        } finally {
            setInlinePreviewLoading(false);
        }
    }, [buildConfig, customInstruction, customSelectedPrompt, savedSelectionText, showInlinePreview]);

    const handleAbortGeneration = useCallback(() => {
        abortGeneration();
    }, [abortGeneration]);

    // ── accept / reject ───────────────────────────────────────

    const handleAcceptRewrite = useCallback(() => {
        editor.update(() => {
            if (savedSelectionRef.current) {
                $setSelection(savedSelectionRef.current);
                const currentSelection = $getSelection();
                if ($isRangeSelection(currentSelection)) {
                    currentSelection.insertText(rewrittenText);
                }
            }
        });

        setShowConfirmation(false);
        setSavedSelectionText("");
        setRewrittenText("");
        setCustomInstruction("");
        savedSelectionRef.current = null;
        setUseCustomContext(false);
        setIncludeAllLorebook(false);
        setSelectedContextItems([]);
        setShowContextSection(false);
    }, [editor, rewrittenText]);

    const handleRejectRewrite = useCallback(() => {
        setShowConfirmation(false);
        setSavedSelectionText("");
        setRewrittenText("");
        setCustomInstruction("");
        savedSelectionRef.current = null;
        setUseCustomContext(false);
        setIncludeAllLorebook(false);
        setSelectedContextItems([]);
        setShowContextSection(false);
    }, []);

    const handleCancelCustomRewrite = useCallback(() => {
        setShowCustomRewrite(false);
        setCustomInstruction("");
        setCustomSelectedPrompt(undefined);
        setCustomSelectedModel(undefined);
        setShowInlinePreview(false);
        setInlinePreviewMessages(undefined);
        savedSelectionRef.current = null;
        setUseCustomContext(false);
        setIncludeAllLorebook(false);
        setSelectedContextItems([]);
        setShowContextSection(false);
    }, []);

    // ── lorebook context helpers ──────────────────────────────

    const handleContextItemSelect = useCallback(
        (itemId: string) => {
            const item = entries.find((entry) => entry.id === itemId);
            if (item && !selectedContextItems.some((i) => i.id === itemId)) {
                setSelectedContextItems([...selectedContextItems, item]);
            }
        },
        [entries, selectedContextItems],
    );

    const removeContextItem = useCallback(
        (itemId: string) => {
            setSelectedContextItems(selectedContextItems.filter((item) => item.id !== itemId));
        },
        [selectedContextItems],
    );

    return {
        // prompt store data
        prompts,
        fetchPrompts,
        isLoading,
        error,
        entries,

        // quick-fire selection
        selectedPrompt,
        selectedModel,
        handlePromptSelect,
        handleGenerateWithPrompt,
        handlePreviewPrompt,
        showPreviewDialog,
        setShowPreviewDialog,
        previewMessages,
        previewLoading,
        previewError,

        // custom rewrite
        showCustomRewrite,
        customInstruction,
        setCustomInstruction,
        customSelectedPrompt,
        customSelectedModel,
        handleOpenCustomRewrite,
        handleCustomPromptSelect,
        handleCustomGenerate,
        handleCustomPreviewPrompt,
        handleCancelCustomRewrite,

        // inline preview
        showInlinePreview,
        setShowInlinePreview,
        inlinePreviewMessages,
        inlinePreviewLoading,
        inlinePreviewError,

        // generation state
        isGenerating,
        handleAbortGeneration,
        savedSelectionText,
        rewrittenText,
        showConfirmation,

        // accept / reject
        handleAcceptRewrite,
        handleRejectRewrite,

        // lorebook context
        useCustomContext,
        setUseCustomContext,
        includeAllLorebook,
        setIncludeAllLorebook,
        selectedContextItems,
        setSelectedContextItems,
        showContextSection,
        setShowContextSection,
        handleContextItemSelect,
        removeContextItem,
    };
}
