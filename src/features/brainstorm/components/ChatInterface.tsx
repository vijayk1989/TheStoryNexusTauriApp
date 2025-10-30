import { useAIStore } from "@/features/ai/stores/useAIStore";
import { useChapterStore } from "@/features/chapters/stores/useChapterStore";
import { useLorebookStore } from "@/features/lorebook/stores/useLorebookStore";
import { createPromptParser } from "@/features/prompts/services/promptParser";
import { usePromptStore } from "@/features/prompts/store/promptStore";
import { db } from "@/services/database";
import {
    AllowedModel,
    ChatMessage,
    Prompt,
    PromptParserConfig,
} from "@/types/story";
import { useEffect, useReducer, useRef } from "react";
import { toast } from "react-toastify";
import { chatReducer, initialChatState } from "../reducers/chatReducer";
import { useBrainstormStore } from "../stores/useBrainstormStore";
import { ChatMessageList } from "./ChatMessageList";
import { ContextSelector } from "./ContextSelector";
import { MessageInputArea } from "./MessageInputArea";
import { PromptControls } from "./PromptControls";

interface ChatInterfaceProps {
    storyId: string;
}

export default function ChatInterface({ storyId }: ChatInterfaceProps) {
    const [state, dispatch] = useReducer(chatReducer, {
        ...initialChatState,
        input: useBrainstormStore.getState().draftMessage,
    });
    const editingTextareaRef = useRef<HTMLTextAreaElement | null>(null);

    // Stores
    const { loadEntries, entries: lorebookEntries } = useLorebookStore();
    const {
        fetchPrompts,
        prompts,
        isLoading: promptsLoading,
        error: promptsError,
    } = usePromptStore();
    const {
        initialize: initializeAI,
        getAvailableModels,
        generateWithPrompt,
        processStreamedResponse,
        abortGeneration,
    } = useAIStore();
    const {
        addChat,
        updateChat,
        selectedChat,
        draftMessage,
        setDraftMessage,
        clearDraftMessage,
        setMessageEdited,
    } = useBrainstormStore();
    const { fetchChapters } = useChapterStore();

    // Initialize
    useEffect(() => {
        const loadData = async () => {
            await loadEntries(storyId);
            await fetchPrompts();
            await initializeAI();
            await fetchChapters(storyId);

            const chaptersData = await db.chapters
                .where("storyId")
                .equals(storyId)
                .sortBy("order");
            dispatch({ type: "SET_CHAPTERS", payload: chaptersData });

            const models = await getAvailableModels();
            if (models.length > 0) {
                dispatch({
                    type: "SET_AVAILABLE_MODELS",
                    payload: models.map((model) => ({
                        id: model.id,
                        name: model.name,
                        provider: model.provider,
                    })),
                });
            }
        };

        dispatch({ type: "CLEAR_CONTEXT_SELECTIONS" });
        loadData();
    }, [
        storyId,
        loadEntries,
        fetchPrompts,
        initializeAI,
        fetchChapters,
        getAvailableModels,
    ]);

    useEffect(() => {
        dispatch({ type: "SET_INPUT", payload: draftMessage });
    }, [draftMessage]);

    useEffect(() => {
        if (selectedChat) {
            dispatch({ type: "SET_CURRENT_CHAT_ID", payload: selectedChat.id });
            dispatch({
                type: "SET_MESSAGES",
                payload: selectedChat.messages || [],
            });
        }
    }, [selectedChat]);

    useEffect(() => {
        if (state.includeFullContext) {
            dispatch({ type: "CLEAR_CONTEXT_SELECTIONS" });
        }
    }, [state.includeFullContext]);

    // Helper functions
    const getFilteredEntries = () => {
        return useLorebookStore.getState().getFilteredEntries();
    };

    const createPromptConfig = (prompt: Prompt): PromptParserConfig => {
        return {
            promptId: prompt.id,
            storyId,
            scenebeat: state.input.trim(),
            additionalContext: {
                chatHistory: state.messages.map((msg) => ({
                    role: msg.role,
                    content: msg.content,
                })),
                includeFullContext: state.includeFullContext,
                selectedSummaries: state.includeFullContext
                    ? []
                    : state.selectedSummaries,
                selectedItems: state.includeFullContext
                    ? []
                    : state.selectedItems.map((item) => item.id),
                selectedChapterContent: state.includeFullContext
                    ? []
                    : state.selectedChapterContent,
            },
        };
    };

    // Event handlers
    const handlePromptSelect = (prompt: Prompt, model: AllowedModel) => {
        dispatch({ type: "SET_PROMPT_AND_MODEL", payload: { prompt, model } });
    };

    const handlePreviewPrompt = async () => {
        if (!state.selectedPrompt) return;

        try {
            dispatch({ type: "START_PREVIEW" });

            const config = createPromptConfig(state.selectedPrompt);
            const promptParser = createPromptParser();
            const parsedPrompt = await promptParser.parse(config);

            if (parsedPrompt.error) {
                dispatch({
                    type: "PREVIEW_ERROR",
                    payload: parsedPrompt.error,
                });
                toast.error(`Error parsing prompt: ${parsedPrompt.error}`);
                return;
            }

            dispatch({
                type: "PREVIEW_SUCCESS",
                payload: parsedPrompt.messages,
            });
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            dispatch({ type: "PREVIEW_ERROR", payload: errorMessage });
            toast.error(`Error previewing prompt: ${errorMessage}`);
        }
    };

    const handleSubmit = async () => {
        if (
            !state.input.trim() ||
            !state.selectedPrompt ||
            !state.selectedModel ||
            state.isGenerating
        )
            return;

        try {
            clearDraftMessage();

            const userMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: "user",
                content: state.input.trim(),
                timestamp: new Date(),
            };

            let chatId = state.currentChatId;
            if (!chatId) {
                const newTitle =
                    userMessage.content.substring(0, 40) +
                    (userMessage.content.length > 40 ? "..." : "");
                chatId = await addChat(storyId, newTitle, [userMessage]);
            }

            const config = createPromptConfig(state.selectedPrompt);
            const response = await generateWithPrompt(
                config,
                state.selectedModel
            );

            if (!response.ok && response.status !== 204) {
                throw new Error("Failed to generate response");
            }

            if (response.status === 204) {
                console.log("Generation was aborted.");
                dispatch({ type: "ABORT_GENERATION" });
                return;
            }

            const assistantMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: "",
                timestamp: new Date(),
            };

            dispatch({
                type: "START_GENERATION",
                payload: { userMessage, assistantMessage, chatId },
            });

            let fullResponse = "";
            await processStreamedResponse(
                response,
                (token) => {
                    fullResponse += token;
                    dispatch({
                        type: "UPDATE_MESSAGE",
                        payload: {
                            id: assistantMessage.id,
                            content: fullResponse,
                        },
                    });
                },
                () => {
                    dispatch({ type: "COMPLETE_GENERATION" });
                    updateChat(chatId, {
                        messages: [
                            ...state.messages,
                            userMessage,
                            { ...assistantMessage, content: fullResponse },
                        ],
                    });
                },
                (error) => {
                    console.error("Streaming error:", error);
                    dispatch({
                        type: "SET_PREVIEW_ERROR",
                        payload: "Failed to stream response",
                    });
                    dispatch({ type: "ABORT_GENERATION" });
                }
            );
        } catch (error) {
            console.error("Error during generation:", error);
            dispatch({
                type: "SET_PREVIEW_ERROR",
                payload:
                    error instanceof Error
                        ? error.message
                        : "An unknown error occurred",
            });
            dispatch({ type: "ABORT_GENERATION" });
        }
    };

    const handleInputChange = (value: string) => {
        dispatch({ type: "SET_INPUT", payload: value });
        setDraftMessage(value);
    };

    const handleStopGeneration = () => {
        abortGeneration();
        dispatch({ type: "ABORT_GENERATION" });
    };

    const handleStartEdit = (message: ChatMessage) => {
        if (state.streamingMessageId === message.id) {
            if (
                !confirm(
                    "This message is still being generated. Stop generation and edit?"
                )
            )
                return;
            abortGeneration();
            dispatch({ type: "SET_STREAMING_MESSAGE_ID", payload: null });
        }
        dispatch({
            type: "START_EDIT",
            payload: { id: message.id, content: message.content },
        });
    };

    const handleSaveEdit = async (messageId: string) => {
        if (!state.editingContent.trim()) {
            toast.error("Edited content cannot be empty");
            return;
        }

        try {
            dispatch({
                type: "UPDATE_EDITED_MESSAGE",
                payload: {
                    id: messageId,
                    content: state.editingContent,
                    editedAt: new Date().toISOString(),
                },
            });

            if (!selectedChat) throw new Error("No chat selected");
            await setMessageEdited(
                selectedChat.id,
                messageId,
                state.editingContent
            );

            toast.success("Message edited");
            dispatch({ type: "CANCEL_EDIT" });
        } catch (error) {
            console.error("Failed to save edit", error);
            toast.error("Failed to save edit");

            if (selectedChat) {
                const fresh = await db.aiChats.get(selectedChat.id);
                if (fresh)
                    dispatch({
                        type: "SET_MESSAGES",
                        payload: fresh.messages || [],
                    });
            }
        }
    };

    const handleCancelEdit = () => {
        dispatch({ type: "CANCEL_EDIT" });
    };

    const handleToggleSummary = (chapterId: string) => {
        dispatch({ type: "TOGGLE_SUMMARY", payload: chapterId });
    };

    const handleItemSelect = (itemId: string) => {
        const filteredEntries = useLorebookStore
            .getState()
            .getFilteredEntries();
        const item = filteredEntries.find((entry) => entry.id === itemId);
        if (item) {
            dispatch({ type: "ADD_ITEM", payload: item });
        }
    };

    const handleRemoveItem = (itemId: string) => {
        dispatch({ type: "REMOVE_ITEM", payload: itemId });
    };

    const handleChapterContentSelect = (chapterId: string) => {
        dispatch({ type: "ADD_CHAPTER_CONTENT", payload: chapterId });
    };

    const handleRemoveChapterContent = (chapterId: string) => {
        dispatch({ type: "REMOVE_CHAPTER_CONTENT", payload: chapterId });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 space-y-4">
                <PromptControls
                    prompts={prompts}
                    promptsLoading={promptsLoading}
                    promptsError={promptsError}
                    selectedPrompt={state.selectedPrompt}
                    selectedModel={state.selectedModel}
                    availableModels={state.availableModels}
                    showPreview={state.showPreview}
                    previewMessages={state.previewMessages}
                    previewLoading={state.previewLoading}
                    previewError={state.previewError}
                    onPromptSelect={handlePromptSelect}
                    onPreviewPrompt={handlePreviewPrompt}
                    onClosePreview={() => dispatch({ type: "CLOSE_PREVIEW" })}
                />

                <ContextSelector
                    includeFullContext={state.includeFullContext}
                    contextOpen={state.contextOpen}
                    selectedSummaries={state.selectedSummaries}
                    selectedItems={state.selectedItems}
                    selectedChapterContent={state.selectedChapterContent}
                    chapters={state.chapters}
                    lorebookEntries={lorebookEntries}
                    onToggleFullContext={() =>
                        dispatch({ type: "TOGGLE_FULL_CONTEXT" })
                    }
                    onToggleContextOpen={() =>
                        dispatch({ type: "TOGGLE_CONTEXT_OPEN" })
                    }
                    onToggleSummary={handleToggleSummary}
                    onItemSelect={handleItemSelect}
                    onRemoveItem={handleRemoveItem}
                    onChapterContentSelect={handleChapterContentSelect}
                    onRemoveChapterContent={handleRemoveChapterContent}
                    getFilteredEntries={getFilteredEntries}
                />
            </div>

            <ChatMessageList
                messages={state.messages}
                editingMessageId={state.editingMessageId}
                editingContent={state.editingContent}
                streamingMessageId={state.streamingMessageId}
                onStartEdit={handleStartEdit}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onEditContentChange={(value) =>
                    dispatch({ type: "SET_EDITING_CONTENT", payload: value })
                }
                editingTextareaRef={editingTextareaRef}
            />

            <MessageInputArea
                input={state.input}
                isGenerating={state.isGenerating}
                selectedPrompt={state.selectedPrompt}
                onInputChange={handleInputChange}
                onSend={handleSubmit}
                onStop={handleStopGeneration}
            />
        </div>
    );
}
