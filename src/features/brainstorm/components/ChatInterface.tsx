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

export default function ChatInterface({ storyId }: ChatInterfaceProps) {
    // State for chat
    const [input, setInput] = useState(useBrainstormStore.getState().draftMessage);
    const [isGenerating, setIsGenerating] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // State for context selection
    const [includeFullContext, setIncludeFullContext] = useState(false);
    const [contextOpen, setContextOpen] = useState(false);

    // State for chapter summaries
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [selectedSummaries, setSelectedSummaries] = useState<string[]>([]);

    // State for prompt preview
    const [showPreview, setShowPreview] = useState(false);
    const [previewMessages, setPreviewMessages] = useState<PromptMessage[] | undefined>(undefined);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);

    // State for chapter content
    const [selectedChapterContent, setSelectedChapterContent] = useState<string[]>([]);

    // Get stores
    const { loadEntries, entries: lorebookEntries } = useLorebookStore();
    const { fetchPrompts, prompts, isLoading: promptsLoading, error: promptsError } = usePromptStore();
    const { initialize: initializeAI, getAvailableModels, generateWithPrompt, processStreamedResponse } = useAIStore();
    const { addChat, updateChat, selectedChat, draftMessage, setDraftMessage, clearDraftMessage } = useBrainstormStore();
    const { fetchChapters } = useChapterStore();

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
        setSelectedSummaries([]);
        setIncludeFullContext(false);

        loadData();
    }, [storyId]);

    // Reset input when a new chat is created or selected
    useEffect(() => {
        setInput(useBrainstormStore.getState().draftMessage);
    }, [selectedChat]);

    // Load selected chat messages when a chat is selected
    useEffect(() => {
        if (selectedChat) {
            // Load the selected chat's messages
            setCurrentChatId(selectedChat.id);
            setMessages(selectedChat.messages || []);

            // Scroll to bottom when loading a chat
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [selectedChat]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Get filtered entries based on enabled categories
    const getFilteredEntries = () => {
        // Use the centralized method from the store
        return useLorebookStore.getState().getFilteredEntries();
    };

    // Check if any context is selected
    const anyContextSelected = selectedSummaries.length > 0 || selectedItems.length > 0;

    // Toggle full context
    const toggleIncludeFullContext = () => {
        const newValue = !includeFullContext;
        setIncludeFullContext(newValue);

        // If turning off full context, clear all selections
        if (!newValue) {
            setSelectedSummaries([]);
            setSelectedItems([]);
            setSelectedChapterContent([]);
        }
    };

    // Handle lorebook item selection
    const handleItemSelect = (itemId: string) => {
        // Use the filtered entries from the store
        const filteredEntries = useLorebookStore.getState().getFilteredEntries();
        const item = filteredEntries.find(entry => entry.id === itemId);
        if (item && !selectedItems.some(i => i.id === itemId)) {
            setSelectedItems([...selectedItems, item]);
        }
    };

    // Remove lorebook item
    const removeItem = (itemId: string) => {
        setSelectedItems(selectedItems.filter(item => item.id !== itemId));
    };

    // Handle chapter content selection
    const handleChapterContentSelect = (chapterId: string) => {
        if (!selectedChapterContent.includes(chapterId)) {
            setSelectedChapterContent([...selectedChapterContent, chapterId]);
        }
    };

    // Remove chapter content
    const removeChapterContent = (chapterId: string) => {
        setSelectedChapterContent(selectedChapterContent.filter(id => id !== chapterId));
    };

    // Create prompt config for brainstorming
    const createPromptConfig = (prompt: Prompt): PromptParserConfig => {
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
                selectedSummaries: includeFullContext ? [] : selectedSummaries,
                selectedItems: includeFullContext ? [] : selectedItems.map(item => item.id),
                selectedChapterContent: includeFullContext ? [] : selectedChapterContent
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

            // Add this log
            console.log('DEBUG: Preview config:', {
                ...config,
                additionalContext: {
                    ...config.additionalContext,
                    selectedChapterContent: config.additionalContext?.selectedChapterContent,
                    selectedSummaries: config.additionalContext?.selectedSummaries,
                    selectedItems: config.additionalContext?.selectedItems
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
    }, [includeFullContext, selectedSummaries, selectedItems, selectedChapterContent, input]);

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

            // Clear both the input and the draft message
            setInput('');
            clearDraftMessage();

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

    // Handle chapter summary selection
    const handleSummarySelect = (summaryId: string) => {
        if (summaryId === 'all') {
            // If 'all' is selected, clear other selections and just use 'all'
            setSelectedSummaries(['all']);
        } else if (summaryId !== 'none' && !selectedSummaries.includes(summaryId)) {
            // If 'all' is already selected, remove it
            const newSummaries = selectedSummaries.filter(id => id !== 'all');
            setSelectedSummaries([...newSummaries, summaryId]);
        }
    };

    // Remove chapter summary
    const removeSummary = (summaryId: string) => {
        setSelectedSummaries(selectedSummaries.filter(id => id !== summaryId));
    };

    // Clear selections when full context is enabled
    useEffect(() => {
        if (includeFullContext) {
            setSelectedSummaries([]);
            setSelectedItems([]);
            setSelectedChapterContent([]);
        }
    }, [includeFullContext]);

    // Update the input change handler
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setInput(newValue);
        setDraftMessage(newValue);
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
                                {!anyContextSelected && !includeFullContext && (
                                    <span className="text-muted-foreground ml-1 text-xs" title="No context selected">(none)</span>
                                )}
                                {contextOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                        </CollapsibleTrigger>
                        <div className="flex items-center gap-2">
                            {includeFullContext ? (
                                <Badge variant="default" className="mr-2">
                                    Full Context
                                </Badge>
                            ) : (
                                <>
                                    {selectedSummaries.length > 0 && (
                                        <Badge variant="outline" className="mr-2">
                                            {selectedSummaries.includes('all')
                                                ? 'All Summaries'
                                                : `${selectedSummaries.length} ${selectedSummaries.length === 1 ? 'Summary' : 'Summaries'}`}
                                        </Badge>
                                    )}
                                    {selectedItems.length > 0 && (
                                        <Badge variant="outline" className="mr-2">
                                            {selectedItems.length} Lorebook {selectedItems.length === 1 ? 'Item' : 'Items'}
                                        </Badge>
                                    )}
                                </>
                            )}
                            <span className="text-sm">Full Context</span>
                            <div className="relative group">
                                <Switch
                                    checked={includeFullContext}
                                    onCheckedChange={toggleIncludeFullContext}
                                    className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30"
                                />
                                <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity">
                                    When enabled, all lorebook entries and chapter summaries will be included
                                </div>
                            </div>
                        </div>
                    </div>
                    <CollapsibleContent>
                        <div className="pt-2">
                            <div className="flex flex-wrap gap-4 mb-4">
                                {/* Chapter summaries dropdown */}
                                <div className="flex-1 min-w-[200px]">
                                    <div className="text-sm font-medium mb-1">Chapter Summaries</div>
                                    <Select
                                        onValueChange={(value) => {
                                            handleSummarySelect(value);
                                            // Reset the select value after selection
                                            const selectElement = document.querySelector('[data-chapter-select="true"]');
                                            if (selectElement) {
                                                (selectElement as HTMLSelectElement).value = '';
                                            }
                                        }}
                                        disabled={includeFullContext}
                                        value=""
                                    >
                                        <SelectTrigger className="w-full" data-chapter-select="true">
                                            <SelectValue placeholder="Select chapter summary" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem
                                                value="all"
                                                disabled={selectedSummaries.includes('all')}
                                            >
                                                All Summaries
                                            </SelectItem>
                                            {chapters.map((chapter) => (
                                                <SelectItem
                                                    key={chapter.id}
                                                    value={chapter.id}
                                                    disabled={selectedSummaries.includes(chapter.id) || selectedSummaries.includes('all')}
                                                >
                                                    Chapter {chapter.order}: {chapter.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* New chapter content dropdown */}
                                <div className="flex-1 min-w-[200px]">
                                    <div className="text-sm font-medium mb-1">Chapter Content</div>
                                    <Select
                                        onValueChange={(value) => {
                                            handleChapterContentSelect(value);
                                            // Reset the select value after selection
                                            const selectElement = document.querySelector('[data-chapter-content-select="true"]');
                                            if (selectElement) {
                                                (selectElement as HTMLSelectElement).value = '';
                                            }
                                        }}
                                        disabled={includeFullContext}
                                        value=""
                                    >
                                        <SelectTrigger className="w-full" data-chapter-content-select="true">
                                            <SelectValue placeholder="Select chapter content" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {chapters.map((chapter) => (
                                                <SelectItem
                                                    key={chapter.id}
                                                    value={chapter.id}
                                                    disabled={selectedChapterContent.includes(chapter.id)}
                                                >
                                                    Chapter {chapter.order}: {chapter.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Lorebook items multi-select */}
                                <div className="flex-1 min-w-[200px]">
                                    <div className="text-sm font-medium mb-1">Lorebook Items</div>
                                    <Select
                                        onValueChange={(value) => {
                                            handleItemSelect(value);
                                            // Reset the select value after selection
                                            const selectElement = document.querySelector('[data-lorebook-select="true"]');
                                            if (selectElement) {
                                                (selectElement as HTMLSelectElement).value = '';
                                            }
                                        }}
                                        disabled={includeFullContext}
                                        value=""
                                    >
                                        <SelectTrigger className="w-full" data-lorebook-select="true">
                                            <SelectValue placeholder="Select lorebook item" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {/* Group by all available categories */}
                                            {[
                                                'character',
                                                'location',
                                                'item',
                                                'event',
                                                'note',
                                                'synopsis',
                                                'starting scenario',
                                                'timeline'
                                            ].map((category) => {
                                                const categoryItems = getFilteredEntries().filter(entry => entry.category === category);
                                                if (categoryItems.length === 0) return null;

                                                return (
                                                    <div key={category}>
                                                        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted capitalize">
                                                            {category === 'starting scenario' ? 'Starting Scenarios' : `${category}s`}
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
                            </div>

                            {/* Badges section */}
                            <div className="mb-4 border rounded-md p-3 bg-muted/10">
                                <div className="text-sm font-medium mb-2">Selected Context</div>
                                <div className="flex flex-wrap gap-2">
                                    {/* Chapter summary badges */}
                                    {selectedSummaries.map((summaryId) => {
                                        if (summaryId === 'all') {
                                            return (
                                                <Badge
                                                    key={summaryId}
                                                    variant="secondary"
                                                    className="flex items-center gap-1 px-3 py-1"
                                                >
                                                    All Summaries
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSummary(summaryId)}
                                                        className="ml-1 hover:text-destructive"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </Badge>
                                            );
                                        }

                                        const chapter = chapters.find(c => c.id === summaryId);
                                        if (!chapter) return null;

                                        return (
                                            <Badge
                                                key={summaryId}
                                                variant="secondary"
                                                className="flex items-center gap-1 px-3 py-1"
                                            >
                                                Ch. {chapter.order}: {chapter.title.substring(0, 15)}{chapter.title.length > 15 ? '...' : ''}
                                                <button
                                                    type="button"
                                                    onClick={() => removeSummary(summaryId)}
                                                    className="ml-1 hover:text-destructive"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        );
                                    })}

                                    {/* Chapter content badges */}
                                    {selectedChapterContent.map((chapterId) => {
                                        const chapter = chapters.find(c => c.id === chapterId);
                                        if (!chapter) return null;

                                        return (
                                            <Badge
                                                key={chapterId}
                                                variant="secondary"
                                                className="flex items-center gap-1 px-3 py-1"
                                            >
                                                Ch. {chapter.order} Content
                                                <button
                                                    type="button"
                                                    onClick={() => removeChapterContent(chapterId)}
                                                    className="ml-1 hover:text-destructive"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        );
                                    })}

                                    {/* Lorebook item badges */}
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

                                    {!selectedSummaries.length && !selectedItems.length && (
                                        <div className="text-muted-foreground text-sm">
                                            No items selected
                                        </div>
                                    )}
                                </div>
                            </div>

                            {!anyContextSelected && !includeFullContext && (
                                <div className="text-muted-foreground text-sm mb-2 p-2">
                                    No context selected.
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
                            onChange={handleInputChange}
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