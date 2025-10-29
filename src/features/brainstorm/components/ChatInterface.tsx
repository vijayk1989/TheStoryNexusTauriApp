import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { useLorebookStore } from "@/features/lorebook/stores/useLorebookStore";
import { usePromptStore } from "@/features/prompts/store/promptStore";
import { useAIStore } from "@/features/ai/stores/useAIStore";
import { useBrainstormStore } from "../stores/useBrainstormStore";
import { useChapterStore } from "@/features/chapters/stores/useChapterStore";
import { db } from "@/services/database";
import { ChatMessageList } from "./ChatMessageList";
import { ContextSelector } from "./ContextSelector";
import { PromptControls } from "./PromptControls";
import { MessageInputArea } from "./MessageInputArea";
import {
  LorebookEntry,
  ChatMessage,
  Prompt,
  AllowedModel,
  PromptParserConfig,
  Chapter,
} from "@/types/story";
import { createPromptParser } from "@/features/prompts/services/promptParser";

interface ChatInterfaceProps {
  storyId: string;
}

export default function ChatInterface({ storyId }: ChatInterfaceProps) {
  // Chat state
  const [input, setInput] = useState(useBrainstormStore.getState().draftMessage);
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>("");

  // Context state
  const [includeFullContext, setIncludeFullContext] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedSummaries, setSelectedSummaries] = useState<string[]>([]);
  const [selectedChapterContent, setSelectedChapterContent] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<LorebookEntry[]>([]);

  // Prompt state
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [selectedModel, setSelectedModel] = useState<AllowedModel | null>(null);
  const [availableModels, setAvailableModels] = useState<AllowedModel[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMessages, setPreviewMessages] = useState<any>(undefined);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Editing state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const editingTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Stores
  const { loadEntries, entries: lorebookEntries } = useLorebookStore();
  const { fetchPrompts, prompts, isLoading: promptsLoading, error: promptsError } = usePromptStore();
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
      setChapters(chaptersData);

      const models = await getAvailableModels();
      if (models.length > 0) {
        setAvailableModels(
          models.map((model) => ({
            id: model.id,
            name: model.name,
            provider: model.provider,
          }))
        );
      }
    };

    setSelectedItems([]);
    setSelectedSummaries([]);
    setIncludeFullContext(false);

    loadData();
  }, [storyId]);

  useEffect(() => {
    setInput(useBrainstormStore.getState().draftMessage);
  }, [selectedChat]);

  useEffect(() => {
    if (selectedChat) {
      setCurrentChatId(selectedChat.id);
      setMessages(selectedChat.messages || []);
    }
  }, [selectedChat]);

  useEffect(() => {
    if (includeFullContext) {
      setSelectedSummaries([]);
      setSelectedItems([]);
      setSelectedChapterContent([]);
    }
  }, [includeFullContext]);

  useEffect(() => {
    if (showPreview && selectedPrompt) {
      handlePreviewPrompt();
    }
  }, [includeFullContext, selectedSummaries, selectedItems, selectedChapterContent, input]);

  // Helper functions
  const getFilteredEntries = () => {
    return useLorebookStore.getState().getFilteredEntries();
  };

  const createPromptConfig = (prompt: Prompt): PromptParserConfig => {
    return {
      promptId: prompt.id,
      storyId,
      scenebeat: input.trim(),
      additionalContext: {
        chatHistory: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        includeFullContext,
        selectedSummaries: includeFullContext ? [] : selectedSummaries,
        selectedItems: includeFullContext ? [] : selectedItems.map((item) => item.id),
        selectedChapterContent: includeFullContext ? [] : selectedChapterContent,
      },
    };
  };

  // Event handlers
  const handlePromptSelect = (prompt: Prompt, model: AllowedModel) => {
    setSelectedPrompt(prompt);
    setSelectedModel(model);
  };

  const handlePreviewPrompt = async () => {
    if (!selectedPrompt) return;

    try {
      setPreviewLoading(true);
      setPreviewError(null);
      setPreviewMessages(undefined);

      const config = createPromptConfig(selectedPrompt);
      const promptParser = createPromptParser();
      const parsedPrompt = await promptParser.parse(config);

      if (parsedPrompt.error) {
        setPreviewError(parsedPrompt.error);
        toast.error(`Error parsing prompt: ${parsedPrompt.error}`);
        return;
      }

      setPreviewMessages(parsedPrompt.messages);
      setShowPreview(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setPreviewError(errorMessage);
      toast.error(`Error previewing prompt: ${errorMessage}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || !selectedPrompt || !selectedModel || isGenerating) return;

    try {
      setIsGenerating(true);
      setPreviewError(null);
      clearDraftMessage();

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: input.trim(),
        timestamp: new Date(),
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);

      let chatId = currentChatId;
      if (!chatId) {
        const newTitle = userMessage.content.substring(0, 40) + (userMessage.content.length > 40 ? '...' : '');
        chatId = await addChat(storyId, newTitle, newMessages);
        setCurrentChatId(chatId);
      } else {
        await updateChat(chatId, { messages: newMessages });
      }

      const config = createPromptConfig(selectedPrompt);
      const response = await generateWithPrompt(config, selectedModel);

      if (!response.ok && response.status !== 204) {
        throw new Error("Failed to generate response");
      }

      if (response.status === 204) {
        console.log('Generation was aborted.');
        setIsGenerating(false);
        return;
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingMessageId(assistantMessage.id);

      let fullResponse = "";
      await processStreamedResponse(
        response,
        (token) => {
          fullResponse += token;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessage.id ? { ...msg, content: fullResponse } : msg
            )
          );
        },
        () => {
          setIsGenerating(false);
          setStreamingMessageId(null);
          updateChat(chatId, {
            messages: [...newMessages, { ...assistantMessage, content: fullResponse }],
          });
        },
        (error) => {
          console.error("Streaming error:", error);
          setPreviewError("Failed to stream response");
          setIsGenerating(false);
          setStreamingMessageId(null);
        }
      );
    } catch (error) {
      console.error("Error during generation:", error);
      setPreviewError(error instanceof Error ? error.message : "An unknown error occurred");
      setIsGenerating(false);
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    setDraftMessage(value);
  };

  const handleStopGeneration = () => {
    abortGeneration();
    setIsGenerating(false);
    setStreamingMessageId(null);
  };

  const handleStartEdit = (message: ChatMessage) => {
    if (streamingMessageId === message.id) {
      if (!confirm('This message is still being generated. Stop generation and edit?')) return;
      abortGeneration();
      setStreamingMessageId(null);
    }
    setEditingMessageId(message.id);
    setEditingContent(message.content);
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editingContent.trim()) {
      toast.error('Edited content cannot be empty');
      return;
    }

    try {
      setMessages(prev =>
        prev.map(m =>
          m.id === messageId
            ? { ...m, content: editingContent, editedAt: new Date().toISOString(), originalContent: m.originalContent ?? m.content }
            : m
        )
      );

      if (!selectedChat) throw new Error('No chat selected');
      await setMessageEdited(selectedChat.id, messageId, editingContent);

      toast.success('Message edited');
      setEditingMessageId(null);
      setEditingContent('');
    } catch (error) {
      console.error('Failed to save edit', error);
      toast.error('Failed to save edit');

      if (selectedChat) {
        const fresh = await db.aiChats.get(selectedChat.id);
        if (fresh) setMessages(fresh.messages || []);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleToggleSummary = (chapterId: string) => {
    if (selectedSummaries.includes(chapterId)) {
      setSelectedSummaries(selectedSummaries.filter(id => id !== chapterId));
    } else {
      setSelectedSummaries([...selectedSummaries, chapterId]);
    }
  };

  const handleItemSelect = (itemId: string) => {
    const filteredEntries = useLorebookStore.getState().getFilteredEntries();
    const item = filteredEntries.find((entry) => entry.id === itemId);
    if (item && !selectedItems.some((i) => i.id === itemId)) {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter((item) => item.id !== itemId));
  };

  const handleChapterContentSelect = (chapterId: string) => {
    if (!selectedChapterContent.includes(chapterId)) {
      setSelectedChapterContent([...selectedChapterContent, chapterId]);
    }
  };

  const handleRemoveChapterContent = (chapterId: string) => {
    setSelectedChapterContent(selectedChapterContent.filter((id) => id !== chapterId));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4">
        <PromptControls
          prompts={prompts}
          promptsLoading={promptsLoading}
          promptsError={promptsError}
          selectedPrompt={selectedPrompt}
          selectedModel={selectedModel}
          availableModels={availableModels}
          showPreview={showPreview}
          previewMessages={previewMessages}
          previewLoading={previewLoading}
          previewError={previewError}
          onPromptSelect={handlePromptSelect}
          onPreviewPrompt={handlePreviewPrompt}
          onClosePreview={() => setShowPreview(false)}
        />

        <ContextSelector
          includeFullContext={includeFullContext}
          contextOpen={contextOpen}
          selectedSummaries={selectedSummaries}
          selectedItems={selectedItems}
          selectedChapterContent={selectedChapterContent}
          chapters={chapters}
          lorebookEntries={lorebookEntries}
          onToggleFullContext={() => setIncludeFullContext(!includeFullContext)}
          onToggleContextOpen={() => setContextOpen(!contextOpen)}
          onToggleSummary={handleToggleSummary}
          onItemSelect={handleItemSelect}
          onRemoveItem={handleRemoveItem}
          onChapterContentSelect={handleChapterContentSelect}
          onRemoveChapterContent={handleRemoveChapterContent}
          getFilteredEntries={getFilteredEntries}
        />
      </div>

      <ChatMessageList
        messages={messages}
        editingMessageId={editingMessageId}
        editingContent={editingContent}
        streamingMessageId={streamingMessageId}
        onStartEdit={handleStartEdit}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={handleCancelEdit}
        onEditContentChange={setEditingContent}
        editingTextareaRef={editingTextareaRef}
      />

      <MessageInputArea
        input={input}
        isGenerating={isGenerating}
        selectedPrompt={selectedPrompt}
        onInputChange={handleInputChange}
        onSend={handleSubmit}
        onStop={handleStopGeneration}
      />
    </div>
  );
}
