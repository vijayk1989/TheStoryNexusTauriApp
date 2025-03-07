import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Send, ChevronDown, ChevronUp, X, Plus } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PromptSelectMenu } from '@/components/ui/prompt-select-menu';
import { PromptPreviewDialog } from '@/components/ui/prompt-preview-dialog';
import { useLorebookStore } from '@/features/lorebook/stores/useLorebookStore';
import { usePromptStore } from '@/features/prompts/store/promptStore';
import { useAIStore } from '@/features/ai/stores/useAIStore';
import { useBrainstormStore } from '../stores/useBrainstormStore';
import { useChapterStore } from '@/features/chapters/stores/useChapterStore';
import { db } from '@/services/database';
import MarkdownRenderer from './MarkdownRenderer';
import { LorebookEntry, ChatMessage, Prompt, AllowedModel, PromptParserConfig, PromptMessage, Chapter } from '@/types/story';
import { createPromptParser } from '@/features/prompts/services/promptParser';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ChatInterfaceProps {
    storyId: string;
}

interface CategoryToggle {
    name: string;
    enabled: boolean;
    displayName: string;
}

export default function ChatInterface({ storyId }: ChatInterfaceProps) {
    // State for chat
    const [input, setInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // State for context selection
    const [includeFullContext, setIncludeFullContext] = useState(false);
    const [contextOpen, setContextOpen] = useState(false);
    const [categoryToggles, setCategoryToggles] = useState<CategoryToggle[]>([
        { name: 'character', enabled: false, displayName: 'Characters' },
        { name: 'location', enabled: false, displayName: 'Locations' },
        { name: 'item', enabled: false, displayName: 'Items' },
        { name: 'event', enabled: false, displayName: 'Events' },
        { name: 'note', enabled: false, displayName: 'Notes' },
    ]);

    // State for chapter summaries
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [selectedSummary, setSelectedSummary] = useState<string>('none');

    // State for prompt preview
    const [showPreview, setShowPreview] = useState(false);
    const [previewMessages, setPreviewMessages] = useState<PromptMessage[] | undefined>(undefined);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);

    // Get stores
    const { loadEntries, entries: lorebookEntries } = useLorebookStore();
    const { fetchPrompts, prompts, isLoading: promptsLoading, error: promptsError } = usePromptStore();
    const { initialize: initializeAI, getAvailableModels, generateWithPrompt, processStreamedResponse } = useAIStore();
    const { fetchChats, addChat, updateChat, selectedChat } = useBrainstormStore();
    const { fetchChapters, getChapterSummaries, getChapterSummary, getAllChapterSummaries } = useChapterStore();

    // State for AI
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
    const [selectedModel, setSelectedModel] = useState<AllowedModel | null>(null);
    const [availableModels, setAvailableModels] = useState<AllowedModel[]>([]);

    // Get chat messages
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string>('');

    // State for selected lorebook items
    const [selectedItems, setSelectedItems] = useState<LorebookEntry[]>([]);

    // Initialize
    useEffect(() => {
        const loadData = async () => {
            await loadEntries(storyId);
            await fetchPrompts();
            await initializeAI();

            // Fetch chapters for the story
            await fetchChapters(storyId);
            const chaptersData = await db.chapters
                .where('storyId')
                .equals(storyId)
                .sortBy('order');
            setChapters(chaptersData);

            const models = await getAvailableModels();
            if (models.length > 0) {
                setAvailableModels(models.map(model => ({
                    id: model.id,
                    name: model.name,
                    provider: model.provider
                })));
            }
        };

        // Reset context selections when story changes
        setSelectedItems([]);
        setSelectedSummary('none');
        setCategoryToggles(prev => prev.map(toggle => ({ ...toggle, enabled: false })));

        loadData();
    }, [storyId]);

    // Reset input when a new chat is created or selected
    useEffect(() => {
        setInput('');
    }, [selectedChat]);

    // Load selected chat messages when a chat is selected
    useEffect(() => {
        if (selectedChat) {
            // If a chat is selected, load its messages
            setCurrentChatId(selectedChat.id);
            setMessages(selectedChat.messages || []);

            // Scroll to bottom when loading a chat
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } else {
            // If no chat is selected, create a new empty chat
            setCurrentChatId(uuidv4());
            setMessages([]);
        }
    }, [selectedChat]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Get filtered entries based on enabled categories
    const getFilteredEntries = () => {
        const enabledCategories = categoryToggles
            .filter(toggle => toggle.enabled)
            .map(toggle => toggle.name);

        return lorebookEntries.filter(entry =>
            enabledCategories.includes(entry.category)
        );
    };

    // Check if any context is selected
    const anyContextSelected = categoryToggles.some(toggle => toggle.enabled) ||
        selectedSummary !== 'none' ||
        selectedItems.length > 0;

    // Toggle category
    const handleToggleCategory = (name: string) => {
        setCategoryToggles(prev => {
            const newToggles = prev.map(item =>
                item.name === name
                    ? { ...item, enabled: !item.enabled }
                    : item
            );

            return newToggles;
        });
    };

    // Toggle full context
    const toggleIncludeFullContext = () => {
        setIncludeFullContext(!includeFullContext);
    };

    // Handle lorebook item selection
    const handleItemSelect = (itemId: string) => {
        const item = lorebookEntries.find(entry => entry.id === itemId);
        if (item && !selectedItems.some(i => i.id === itemId)) {
            setSelectedItems([...selectedItems, item]);
        }
    };

    // Remove lorebook item
    const removeItem = (itemId: string) => {
        setSelectedItems(selectedItems.filter(item => item.id !== itemId));
    };

    // Create prompt config for brainstorming
    const createPromptConfig = (prompt: Prompt): PromptParserConfig => {
        const selectedCategories = categoryToggles
            .filter(toggle => toggle.enabled)
            .map(toggle => toggle.name);

        if (selectedCategories.length === 0 && selectedItems.length === 0 && selectedSummary === 'none') {
            console.log('No context selected for prompt config. The AI will not have access to story context.');
        }

        return {
            promptId: prompt.id,
            storyId,
            scenebeat: input.trim(),
            additionalContext: {
                chatHistory: messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                includeFullContext,
                selectedCategories,
                selectedSummary,
                selectedItems: selectedItems.map(item => item.id)
            }
        };
    };

    // Handle prompt selection
    const handlePromptSelect = (prompt: Prompt, model: AllowedModel) => {
        setSelectedPrompt(prompt);
        setSelectedModel(model);
    };

    // Handle prompt preview
    const handlePreviewPrompt = async () => {
        if (!selectedPrompt) return;

        try {
            setPreviewLoading(true);
            setPreviewError(null);
            setPreviewMessages(undefined);

            const config = createPromptConfig(selectedPrompt);

            // Log the config for debugging
            console.log('Preview prompt config:', {
                promptId: config.promptId,
                storyId: config.storyId,
                scenebeat: config.scenebeat,
                additionalContext: {
                    includeFullContext: config.additionalContext?.includeFullContext,
                    selectedCategories: config.additionalContext?.selectedCategories,
                    selectedSummary: config.additionalContext?.selectedSummary,
                    selectedItems: config.additionalContext?.selectedItems,
                    chatHistoryLength: config.additionalContext?.chatHistory?.length
                }
            });

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

    // Update preview when context settings change
    useEffect(() => {
        if (showPreview && selectedPrompt) {
            handlePreviewPrompt();
        }
    }, [categoryToggles, includeFullContext, selectedSummary, input]);

    // Log when context settings change
    useEffect(() => {
        console.log('Context settings changed:', {
            includeFullContext,
            enabledCategories: categoryToggles
                .filter(toggle => toggle.enabled)
                .map(toggle => toggle.name),
            selectedSummary,
            selectedItemsCount: selectedItems.length
        });
    }, [includeFullContext, categoryToggles, selectedSummary, selectedItems]);

    // Handle submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !selectedPrompt || !selectedModel || isGenerating) return;

        try {
            setIsGenerating(true);

            // Create user message
            const userMessage: ChatMessage = {
                id: uuidv4(),
                role: 'user',
                content: input.trim(),
                timestamp: new Date()
            };

            // Add user message to chat
            const updatedMessages = [...messages, userMessage];
            setMessages(updatedMessages);
            setInput('');

            // Create assistant message placeholder
            const assistantMessageId = uuidv4();
            const assistantMessage: ChatMessage = {
                id: assistantMessageId,
                role: 'assistant',
                content: '',
                timestamp: new Date()
            };

            // Add assistant message to chat
            setMessages([...updatedMessages, assistantMessage]);

            // Create prompt config with latest context settings
            const config = createPromptConfig(selectedPrompt);

            // Generate response
            const response = await generateWithPrompt(config, selectedModel);

            // Process streamed response
            let fullResponse = '';
            await processStreamedResponse(
                response,
                (token) => {
                    fullResponse += token;
                    setMessages(prev =>
                        prev.map(msg =>
                            msg.id === assistantMessageId
                                ? { ...msg, content: fullResponse }
                                : msg
                        )
                    );
                },
                () => {
                    // On complete
                    const finalMessages: ChatMessage[] = [...updatedMessages, {
                        id: assistantMessageId,
                        role: 'assistant',
                        content: fullResponse,
                        timestamp: new Date()
                    }];

                    // Generate a title from the first user message if this is a new chat
                    let chatTitle = '';
                    if (selectedChat) {
                        // Use existing title for existing chat
                        chatTitle = selectedChat.title;
                    } else {
                        // Generate title from first message for new chat
                        const firstUserMessage = finalMessages.find(msg => msg.role === 'user');
                        chatTitle = firstUserMessage
                            ? firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '')
                            : `New Chat ${new Date().toLocaleString()}`;
                    }

                    // Save the chat
                    if (selectedChat) {
                        // Update existing chat
                        updateChat(selectedChat.id, {
                            messages: finalMessages,
                            title: chatTitle
                        });
                    } else {
                        // Create new chat or update current chat
                        addChat(
                            storyId,
                            chatTitle,
                            finalMessages
                        ).then(newChatId => {
                            setCurrentChatId(newChatId);
                        });
                    }

                    setMessages(finalMessages);
                    setIsGenerating(false);
                },
                (error) => {
                    // On error
                    toast.error(`Error generating response: ${error.message}`);
                    setIsGenerating(false);
                }
            );
        } catch (error) {
            toast.error(`Error generating response: ${error instanceof Error ? error.message : String(error)}`);
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Chat messages */}
            <div className="flex-1 overflow-hidden p-4">
                <ScrollArea className="h-full pr-4">
                    {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <p>No messages yet. Start a conversation!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-lg p-3 ${message.role === 'user'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted'
                                            }`}
                                    >
                                        <MarkdownRenderer content={message.content} />
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* Context selection */}
            <div className="border-t p-2">
                <Collapsible open={contextOpen} onOpenChange={setContextOpen}>
                    <div className="flex items-center justify-between">
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="flex items-center gap-1">
                                Context
                                {!anyContextSelected && (
                                    <span className="text-muted-foreground ml-1 text-xs" title="No context selected">(none)</span>
                                )}
                                {contextOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                        </CollapsibleTrigger>
                        <div className="flex items-center gap-2">
                            {selectedSummary !== 'none' && (
                                <Badge variant="outline" className="mr-2">
                                    {selectedSummary === 'all'
                                        ? 'All Summaries'
                                        : `Ch. ${chapters.find(c => c.id === selectedSummary)?.order || ''}`}
                                </Badge>
                            )}
                            {selectedItems.length > 0 && (
                                <Badge variant="outline" className="mr-2">
                                    {selectedItems.length} Lorebook {selectedItems.length === 1 ? 'Item' : 'Items'}
                                </Badge>
                            )}
                            <span className="text-sm">Include Full Context</span>
                            <Switch
                                checked={includeFullContext}
                                onCheckedChange={toggleIncludeFullContext}
                            />
                        </div>
                    </div>
                    <CollapsibleContent>
                        <div className="pt-2">
                            <div className="flex flex-wrap gap-1 mb-2">
                                {categoryToggles.map(toggle => (
                                    <Button
                                        key={toggle.name}
                                        variant={toggle.enabled ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleToggleCategory(toggle.name)}
                                    >
                                        {toggle.displayName}
                                    </Button>
                                ))}
                            </div>

                            {/* Chapter summaries dropdown */}
                            <div className="mb-2">
                                <div className="text-sm font-medium mb-1">Chapter Summaries</div>
                                <Select
                                    value={selectedSummary}
                                    onValueChange={(value) => {
                                        setSelectedSummary(value);
                                        // If a chapter is selected, log its title
                                        if (value !== 'none' && value !== 'all') {
                                            const chapter = chapters.find(c => c.id === value);
                                            if (chapter) {
                                                console.log(`Selected chapter: ${chapter.order} - ${chapter.title}`);
                                            }
                                        }
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select chapter summary" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        <SelectItem value="all">All Summaries</SelectItem>
                                        {chapters.map((chapter) => (
                                            <SelectItem key={chapter.id} value={chapter.id}>
                                                Chapter {chapter.order}: {chapter.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Lorebook items multi-select */}
                            <div className="mb-2">
                                <div className="text-sm font-medium mb-1">Lorebook Items</div>

                                {/* Selected items */}
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {selectedItems.map((item) => (
                                        <Badge
                                            key={item.id}
                                            variant="secondary"
                                            className="flex items-center gap-1 px-3 py-1"
                                        >
                                            {item.name}
                                            <button
                                                type="button"
                                                onClick={() => removeItem(item.id)}
                                                className="ml-1 hover:text-destructive"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>

                                {/* Item selector */}
                                <Select onValueChange={handleItemSelect}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select lorebook item" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {/* Group by category */}
                                        {['character', 'location', 'item', 'event', 'note'].map((category) => {
                                            const categoryItems = lorebookEntries.filter(entry => entry.category === category);
                                            if (categoryItems.length === 0) return null;

                                            return (
                                                <div key={category}>
                                                    <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted capitalize">
                                                        {category}s
                                                    </div>
                                                    {categoryItems.map((entry) => (
                                                        <SelectItem
                                                            key={entry.id}
                                                            value={entry.id}
                                                            disabled={selectedItems.some(item => item.id === entry.id)}
                                                        >
                                                            {entry.name}
                                                        </SelectItem>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>

                            {!anyContextSelected && (
                                <div className="text-muted-foreground text-sm mb-2">
                                    No context selected. The AI will not have access to your story context.
                                </div>
                            )}
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </div>

            {/* Input area */}
            <div className="border-t p-4">
                <div className="flex flex-col gap-2">
                    <div className="flex-1">
                        <Textarea
                            placeholder="Type your message..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="min-h-[80px]"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                        />
                    </div>
                    <div className="flex gap-2">
                        <PromptSelectMenu
                            isLoading={promptsLoading}
                            error={promptsError}
                            prompts={prompts}
                            promptType="brainstorm"
                            selectedPrompt={selectedPrompt}
                            selectedModel={selectedModel}
                            onSelect={handlePromptSelect}
                        />
                        {selectedPrompt && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handlePreviewPrompt}
                                >
                                    Preview Prompt
                                </Button>
                            </>
                        )}
                        <Button
                            type="submit"
                            disabled={isGenerating || !input.trim() || !selectedPrompt || !selectedModel}
                            onClick={handleSubmit}
                            className="mb-[3px]"
                        >
                            {isGenerating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Prompt preview dialog */}
            <PromptPreviewDialog
                open={showPreview}
                onOpenChange={setShowPreview}
                messages={previewMessages}
                isLoading={previewLoading}
                error={previewError}
            />
        </div>
    );
} 