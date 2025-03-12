import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { ScrollArea } from "./scroll-area";
import { PromptMessage } from "@/types/story";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { encode } from "gpt-tokenizer";

interface PromptPreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    messages: PromptMessage[] | undefined;
    isLoading: boolean;
    error: string | null;
}

// Function to count tokens using gpt-tokenizer
function countTokens(text: string): number {
    return encode(text).length;
}

// Function to count tokens for a full conversation
function countConversationTokens(messages: PromptMessage[]): number {
    // Base tokens for the messages format
    let tokens = 3; // Every reply is primed with <|start|>assistant<|message|>

    for (const message of messages) {
        // Add tokens for each message
        tokens += 4; // Every message follows <|start|>{role}<|message|>

        // Add tokens for the content
        tokens += countTokens(message.content);
    }

    return tokens;
}

export function PromptPreviewDialog({
    open,
    onOpenChange,
    messages,
    isLoading,
    error
}: PromptPreviewDialogProps) {
    // Calculate total token count for all messages
    const tokenCount = useMemo(() => {
        if (!messages) return 0;
        return countConversationTokens(messages);
    }, [messages]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex justify-between items-center">
                        <span>Resolved Prompt Preview</span>
                        {messages && !isLoading && !error && (
                            <span className="text-sm font-normal text-muted-foreground">
                                {tokenCount.toLocaleString()} tokens
                            </span>
                        )}
                    </DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[500px] w-full rounded-md border p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="text-destructive">
                            Error: {error}
                        </div>
                    ) : messages ? (
                        <div className="space-y-4">
                            {messages.map((message, index) => (
                                <div key={index} className="space-y-2">
                                    <div className="font-semibold capitalize text-sm text-muted-foreground flex justify-between">
                                        <span>{message.role}:</span>
                                        <span className="text-xs">
                                            {countTokens(message.content).toLocaleString()} tokens
                                        </span>
                                    </div>
                                    <div className="whitespace-pre-wrap">
                                        {message.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-muted-foreground">
                            No preview available
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
} 