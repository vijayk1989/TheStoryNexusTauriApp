import React, { useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Loader2 } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import { ChatMessage } from '@/types/story';

interface ChatMessageListProps {
    messages: ChatMessage[];
    editingMessageId: string | null;
    editingContent: string;
    streamingMessageId: string | null;
    onStartEdit: (message: ChatMessage) => void;
    onSaveEdit: (messageId: string) => void;
    onCancelEdit: () => void;
    onEditContentChange: (content: string) => void;
    editingTextareaRef: React.RefObject<HTMLTextAreaElement>;
}

export function ChatMessageList({
    messages,
    editingMessageId,
    editingContent,
    streamingMessageId,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onEditContentChange,
    editingTextareaRef
}: ChatMessageListProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const ta = editingTextareaRef.current;
        if (ta && editingMessageId) {
            const contentHeight = ta.scrollHeight;
            ta.style.height = 'auto';
            ta.style.height = `${contentHeight}px`;
        }
    }, [editingContent, editingMessageId, editingTextareaRef]);

    return (
        <ScrollArea className="flex-1 px-4">
            <div className="space-y-4 py-4">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[85%] rounded-lg px-4 py-3 ${
                                message.role === 'user'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                            }`}
                        >
                            {message.role === 'assistant' && editingMessageId === message.id ? (
                                <div className="space-y-2">
                                    <Textarea
                                        ref={editingTextareaRef}
                                        value={editingContent}
                                        onChange={(e) => onEditContentChange(e.target.value)}
                                        className="min-h-[100px] w-full resize-none overflow-hidden"
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => onSaveEdit(message.id)}
                                        >
                                            Save
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={onCancelEdit}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative group">
                                    {message.role === 'assistant' && streamingMessageId === message.id ? (
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span className="text-sm">Generating...</span>
                                        </div>
                                    ) : (
                                        <MarkdownRenderer content={message.content} />
                                    )}
                                    {message.role === 'assistant' && !streamingMessageId && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => onStartEdit(message)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
        </ScrollArea>
    );
}
