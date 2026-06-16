import { useEffect } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
    $getRoot,
    $getSelection,
    $isRangeSelection,
    type EditorState,
    type LexicalEditor,
} from "lexical";

import { useStoryContext } from "@/features/stories/context/StoryContext";
import { useAIStore } from "@/features/ai/stores/useAIStore";
import { createPromptParser } from "@/features/prompts/services/promptParser";
import { db } from "@/services/database";
import type { AISettings } from "@/types/story";

type SerializedLexicalNode = {
    type?: string;
    text?: string;
    children?: SerializedLexicalNode[];
};

type CursorPosition = "start" | "end";

type ConfigureLocalLLMOptions = {
    apiUrl: string;
    modelId: string;
    modelName?: string;
};

type ResolvePromptMessagesOptions = {
    chapterId?: string;
};

export type EditorE2ESnapshot = {
    currentStoryId: string | null;
    currentChapterId: string | null;
    paragraphCount: number;
    sceneBeatCount: number;
    topLevelTypes: string[];
    plainText: string;
    selection: null | {
        isRange: boolean;
        isCollapsed: boolean;
        anchor: {
            key: string;
            offset: number;
            type: string;
        };
        focus: {
            key: string;
            offset: number;
            type: string;
        };
    };
    state: unknown;
};

export type StoryNexusE2EApi = {
    getEditorSnapshot: () => EditorE2ESnapshot;
    getPersistedChapterContent: () => Promise<string | null>;
    resolvePromptMessages: (content: string, options?: ResolvePromptMessagesOptions) => Promise<Array<string | null>>;
    placeCursorAtTopLevelNode: (index: number, position?: CursorPosition) => Promise<void>;
    configureLocalLLM: (options: ConfigureLocalLLMOptions) => Promise<void>;
};

declare global {
    interface Window {
        __STORY_NEXUS_E2E__?: StoryNexusE2EApi;
    }
}

export function EditorE2EBridge() {
    const [editor] = useLexicalComposerContext();
    const { currentStoryId, currentChapterId } = useStoryContext();

    useEffect(() => {
        const api = createApi(editor, {
            getCurrentStoryId: () => currentStoryId,
            getCurrentChapterId: () => currentChapterId,
        });

        const publishVisibleEditorApi = () => {
            if (isEditorVisible(editor)) {
                window.__STORY_NEXUS_E2E__ = api;
            } else if (window.__STORY_NEXUS_E2E__ === api) {
                delete window.__STORY_NEXUS_E2E__;
            }
        };

        publishVisibleEditorApi();
        const intervalId = window.setInterval(publishVisibleEditorApi, 250);

        return () => {
            window.clearInterval(intervalId);
            if (window.__STORY_NEXUS_E2E__ === api) {
                delete window.__STORY_NEXUS_E2E__;
            }
        };
    }, [currentChapterId, currentStoryId, editor]);

    return null;
}

function isEditorVisible(editor: LexicalEditor): boolean {
    const rootElement = editor.getRootElement();
    return !!rootElement && rootElement.offsetParent !== null;
}

function createApi(
    editor: LexicalEditor,
    context: {
        getCurrentStoryId: () => string | null;
        getCurrentChapterId: () => string | null;
    }
): StoryNexusE2EApi {
    return {
        getEditorSnapshot: () => {
            const editorState = editor.getEditorState();
            return readEditorSnapshot(editorState, context);
        },

        getPersistedChapterContent: async () => {
            const chapterId = context.getCurrentChapterId();
            if (!chapterId) return null;
            const chapter = await db.chapters.get(chapterId);
            return chapter?.content ?? null;
        },

        resolvePromptMessages: async (content, options = {}) => {
            const storyId = context.getCurrentStoryId();
            const chapterId = options.chapterId || context.getCurrentChapterId();
            if (!storyId || !chapterId) {
                throw new Error("No story or chapter context is available.");
            }

            const promptId = `e2e-prompt-${crypto.randomUUID()}`;
            await db.prompts.add({
                id: promptId,
                name: "E2E prompt parser check",
                promptType: "other",
                messages: [{ role: "user", content }],
                allowedModels: [],
                storyId,
                createdAt: new Date(),
            });

            try {
                const parser = createPromptParser();
                const result = await parser.parse({ storyId, chapterId, promptId });
                if (result.error) {
                    throw new Error(result.error);
                }
                return result.messages.map((message) => message.content);
            } finally {
                await db.prompts.delete(promptId);
            }
        },

        placeCursorAtTopLevelNode: async (index, position = "end") => {
            editor.focus();
            editor.update(() => {
                const node = $getRoot().getChildAtIndex(index);
                if (!node) {
                    throw new Error(`No top-level editor node exists at index ${index}.`);
                }

                if (position === "start") {
                    node.selectStart();
                } else {
                    node.selectEnd();
                }
            });
        },

        configureLocalLLM: async ({ apiUrl, modelId, modelName }) => {
            const localModel = {
                id: `local/${modelId.replace(/^local\//, "")}`,
                name: modelName || modelId,
                provider: "local" as const,
                contextLength: 32768,
                enabled: true,
            };

            const settings: AISettings = {
                id: "e2e-local-lm-studio",
                createdAt: new Date(),
                localApiUrl: apiUrl.replace(/\/$/, ""),
                availableModels: [localModel],
                lastModelsFetch: new Date(),
                enablePromptDefaults: true,
                defaultSceneBeatPromptId: "scene-beat-system",
                defaultSceneBeatModelId: localModel.id,
                defaultContinueWritingPromptId: "continue-writing-system",
                defaultContinueWritingModelId: localModel.id,
                simpleWriteUseCustomPrompt: false,
                simpleWriteIncludeAfterCursor: false,
            };

            await db.transaction("rw", [db.aiSettings, db.prompts], async () => {
                await db.aiSettings.clear();
                await db.aiSettings.add(settings);

                await db.prompts.update("gen-summary-system", {
                    maxTokens: 128,
                    allowedModels: [{
                        id: "local",
                        name: "local",
                        provider: "local",
                    }],
                });
                await db.prompts.update("scene-beat-system", {
                    maxTokens: 160,
                    allowedModels: [{
                        id: "local",
                        name: "local",
                        provider: "local",
                    }],
                });
                await db.prompts.update("continue-writing-system", {
                    maxTokens: 160,
                    allowedModels: [{
                        id: "local",
                        name: "local",
                        provider: "local",
                    }],
                });
            });

            useAIStore.setState({
                settings,
                favoriteModelIds: [],
                isInitialized: false,
                isLoading: false,
                error: null,
            });
        },

    };
}

function readEditorSnapshot(
    editorState: EditorState,
    context: {
        getCurrentStoryId: () => string | null;
        getCurrentChapterId: () => string | null;
    }
): EditorE2ESnapshot {
    const serializedState = editorState.toJSON();
    const rootChildren = getRootChildren(serializedState);

    let selection: EditorE2ESnapshot["selection"] = null;
    editorState.read(() => {
        const currentSelection = $getSelection();
        if ($isRangeSelection(currentSelection)) {
            selection = {
                isRange: true,
                isCollapsed: currentSelection.isCollapsed(),
                anchor: {
                    key: currentSelection.anchor.key,
                    offset: currentSelection.anchor.offset,
                    type: currentSelection.anchor.type,
                },
                focus: {
                    key: currentSelection.focus.key,
                    offset: currentSelection.focus.offset,
                    type: currentSelection.focus.type,
                },
            };
        } else if (currentSelection) {
            selection = {
                isRange: false,
                isCollapsed: false,
                anchor: { key: "", offset: 0, type: "" },
                focus: { key: "", offset: 0, type: "" },
            };
        }
    });

    return {
        currentStoryId: context.getCurrentStoryId(),
        currentChapterId: context.getCurrentChapterId(),
        paragraphCount: countNodesByType(rootChildren, "paragraph"),
        sceneBeatCount: countNodesByType(rootChildren, "scene-beat"),
        topLevelTypes: rootChildren.map((node) => node.type || ""),
        plainText: collectText(rootChildren).replace(/\s+/g, " ").trim(),
        selection,
        state: serializedState,
    };
}

function getRootChildren(state: unknown): SerializedLexicalNode[] {
    const root = (state as { root?: { children?: SerializedLexicalNode[] } })?.root;
    return Array.isArray(root?.children) ? root.children : [];
}

function countNodesByType(nodes: SerializedLexicalNode[], type: string): number {
    return nodes.reduce((count, node) => {
        const ownCount = node.type === type ? 1 : 0;
        const childCount = Array.isArray(node.children)
            ? countNodesByType(node.children, type)
            : 0;
        return count + ownCount + childCount;
    }, 0);
}

function collectText(nodes: SerializedLexicalNode[]): string {
    return nodes.map((node) => {
        const ownText = node.type === "text" && typeof node.text === "string"
            ? node.text
            : "";
        const childText = Array.isArray(node.children) ? collectText(node.children) : "";
        return `${ownText} ${childText}`;
    }).join(" ");
}
