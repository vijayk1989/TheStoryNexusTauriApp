import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Save, Trash2 } from "lucide-react";
import { PromptSelectMenu } from "@/components/ui/prompt-select-menu";
import { usePromptStore } from "@/features/prompts/store/promptStore";
import { useAIStore } from "@/features/ai/stores/useAIStore";
import { useStoryContext } from "@/features/stories/context/StoryContext";
import MarkdownRenderer from "@/features/brainstorm/components/MarkdownRenderer";
import { ChatMessage, Prompt, AllowedModel, PromptParserConfig, AIChat } from "@/types/story";
import { useQuickChatStore } from "../stores/useQuickChatStore";
import { db } from "@/services/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";

export function QuickChatPanel() {
  const { currentStoryId, currentChapterId } = useStoryContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [selectedModel, setSelectedModel] = useState<AllowedModel | null>(null);
  
  // Persistence state
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { fetchPrompts, prompts, isLoading: promptsLoading, error: promptsError } = usePromptStore();
  const { settings, initialize: initializeAI, getAvailableModels, generateWithPrompt, processStreamedResponse } = useAIStore();
  const { loadedChat, clearLoadedChat } = useQuickChatStore();

  useEffect(() => {
    const init = async () => {
      await fetchPrompts();
      await initializeAI();
      const models = await getAvailableModels();
      // Auto select first model if available
      if (models.length > 0 && !selectedModel) {
        setSelectedModel(models[0]);
      }
    };
    init();
  }, []);

  // Auto select prompt once prompts are loaded
  useEffect(() => {
    if (prompts.length > 0 && !selectedPrompt) {
      if (settings?.enablePromptDefaults && settings.defaultQuickChatPromptId) {
        const defaultPrompt = prompts.find(p => p.id === settings.defaultQuickChatPromptId);
        if (defaultPrompt) {
          setSelectedPrompt(defaultPrompt);
          if (settings.defaultQuickChatModelId && settings.availableModels) {
            const defaultModel = settings.availableModels.find(m => m.id === settings.defaultQuickChatModelId);
            if (defaultModel) {
              setSelectedModel(defaultModel);
            }
          }
          return;
        }
      }

      const brainstormPrompts = prompts.filter(p => p.promptType === 'brainstorm');
      if (brainstormPrompts.length > 0) {
        setSelectedPrompt(brainstormPrompts[0]);
      } else {
        setSelectedPrompt(prompts[0]);
      }
    }
  }, [prompts, settings]);

  // Handle loading a chat from ChapterChatsPanel
  useEffect(() => {
    if (loadedChat) {
      setMessages(loadedChat.messages);
      setCurrentChatId(loadedChat.id);
      clearLoadedChat();
      toast.success("Chat loaded!");
    }
  }, [loadedChat, clearLoadedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handlePromptSelect = (prompt: Prompt, model: AllowedModel) => {
    setSelectedPrompt(prompt);
    setSelectedModel(model);
  };

  const createPromptConfig = (prompt: Prompt): PromptParserConfig => {
    return {
      promptId: prompt.id,
      storyId: currentStoryId || "",
      chapterId: currentChapterId || undefined,
      scenebeat: input.trim(),
      additionalContext: {
        chatHistory: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        includeFullContext: false,
        selectedSummaries: [],
        selectedItems: [],
        selectedChapterContent: [],
      },
    };
  };

  const autoSaveIfPersisted = async (newMessages: ChatMessage[]) => {
    if (currentChatId) {
      try {
        await db.aiChats.update(currentChatId, {
          messages: newMessages,
          updatedAt: new Date()
        });
      } catch (err) {
        console.error("Failed to auto-update chat", err);
      }
    }
  };

  const handleSave = async () => {
    if (!currentStoryId) return;
    try {
      const title = saveTitle.trim() || `Quick Chat ${new Date().toLocaleTimeString()}`;
      const newChat: AIChat = {
        id: crypto.randomUUID(),
        storyId: currentStoryId,
        chapterId: currentChapterId || undefined,
        title,
        messages,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.aiChats.add(newChat);
      setCurrentChatId(newChat.id);
      setSaveDialogOpen(false);
      setSaveTitle("");
      toast.success("Chat saved!");
    } catch (err) {
      console.error("Failed to save chat", err);
      toast.error("Failed to save chat.");
    }
  };

  const handleClear = () => {
    setMessages([]);
    setCurrentChatId(null);
    setClearDialogOpen(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !selectedPrompt || !selectedModel || isGenerating || !currentStoryId) return;

    try {
      setIsGenerating(true);
      
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: input.trim(),
        timestamp: new Date(),
      };
      
      const updatedMessagesWithUser = [...messages, userMessage];
      setMessages(updatedMessagesWithUser);
      await autoSaveIfPersisted(updatedMessagesWithUser);

      const currentInput = input;
      setInput("");

      const config = createPromptConfig(selectedPrompt);
      config.scenebeat = currentInput.trim();

      const response = await generateWithPrompt(config, selectedModel);

      if (!response.ok && response.status !== 204) {
        throw new Error("Failed to generate response");
      }

      if (response.status === 204) {
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
        async () => {
          setIsGenerating(false);
          // Auto save once streaming completes
          await autoSaveIfPersisted([...updatedMessagesWithUser, { ...assistantMessage, content: fullResponse }]);
        },
        (error) => {
          console.error("Streaming error:", error);
          toast.error("Failed to stream response");
          setIsGenerating(false);
        }
      );
    } catch (error) {
      console.error("Error during generation:", error);
      toast.error("An error occurred during quick chat generation.");
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <div className="p-2 border-b shrink-0 flex items-center justify-between">
        <span className="text-sm font-semibold ml-1">
          {currentChatId ? "Quick Chat (Saved)" : "Quick Chat"}
        </span>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs px-2"
            onClick={() => setSaveDialogOpen(true)}
            disabled={messages.length === 0 || isGenerating || currentChatId !== null}
            title={currentChatId ? "Already saved" : "Save this chat"}
          >
            <Save className="w-3 h-3 mr-1" /> Save
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setClearDialogOpen(true)}
            disabled={messages.length === 0 || isGenerating}
          >
            <Trash2 className="w-3 h-3 mr-1" /> Clear
          </Button>
        </div>
      </div>
      
      <div className="p-2 border-b shrink-0 bg-muted/30">
        <PromptSelectMenu
          isLoading={promptsLoading}
          error={promptsError}
          prompts={prompts}
          promptType="brainstorm"
          selectedPrompt={selectedPrompt || undefined}
          selectedModel={selectedModel || undefined}
          onSelect={handlePromptSelect}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-muted-foreground text-xs px-4">
            Need a quick idea, synonym, or lore reminder? Ask here! You can save it if it becomes important.
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col space-y-1 ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`text-xs px-3 py-2 rounded-md max-w-[90%] ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.role === "user" ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                     <MarkdownRenderer content={msg.content} />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-2 shrink-0 border-t bg-background">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask something..."
            className="min-h-[60px] max-h-[150px] text-sm resize-none"
            disabled={isGenerating}
          />
          <Button
            type="submit"
            disabled={!input.trim() || !selectedPrompt || !selectedModel || isGenerating}
            size="sm"
            className="w-full flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Send className="h-3 w-3" />
                <span>Send</span>
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Quick Chat</DialogTitle>
            <DialogDescription>
              Give this chat a title to save it for future reference in this chapter.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="E.g., Research on medieval armor" 
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Chat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Dialog */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear Chat?</DialogTitle>
            <DialogDescription>
              {currentChatId 
                ? "This will clear the panel. Your chat is safely saved and can be loaded from 'Chapter Chats'." 
                : "Are you sure you want to clear this chat? Unsaved progress will be lost."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setClearDialogOpen(false)}>Cancel</Button>
            <Button variant={currentChatId ? "default" : "destructive"} onClick={handleClear}>
              {currentChatId ? "Clear Panel" : "Yes, discard it"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
