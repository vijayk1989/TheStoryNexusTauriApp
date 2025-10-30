import React, { useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Square } from 'lucide-react';
import type { Prompt } from '@/types/story';

interface MessageInputAreaProps {
    input: string;
    isGenerating: boolean;
    selectedPrompt: Prompt | null;
    onInputChange: (value: string) => void;
    onSend: () => void;
    onStop: () => void;
}

export function MessageInputArea({
    input,
    isGenerating,
    selectedPrompt,
    onInputChange,
    onSend,
    onStop
}: MessageInputAreaProps) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const INITIAL_TEXTAREA_HEIGHT = 80;
    const MAX_TEXTAREA_HEIGHT = 600;

    useEffect(() => {
        const ta = textareaRef.current;
        if (ta) {
            if (!input) {
                ta.style.height = `${INITIAL_TEXTAREA_HEIGHT}px`;
                ta.style.overflowY = 'hidden';
            } else {
                const contentHeight = ta.scrollHeight;
                const newHeight = Math.min(
                    Math.max(contentHeight, INITIAL_TEXTAREA_HEIGHT),
                    MAX_TEXTAREA_HEIGHT
                );
                ta.style.height = 'auto';
                ta.style.height = `${newHeight}px`;
                ta.style.overflowY = contentHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
            }
        }
    }, [input]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isGenerating) {
                onSend();
            }
        }
    };

    return (
        <div className="border-t border-border p-4">
            <div className="flex gap-2">
                <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me anything about your story..."
                    className="min-h-[80px] resize-none"
                    disabled={isGenerating}
                />
                {isGenerating ? (
                    <Button onClick={onStop} variant="destructive">
                        <Square className="h-4 w-4" />
                    </Button>
                ) : (
                    <Button
                        onClick={onSend}
                        disabled={!input.trim() || !selectedPrompt}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
