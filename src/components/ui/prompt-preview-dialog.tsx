import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { ScrollArea } from "./scroll-area";
import { PromptMessage } from "@/types/story";
import { Loader2 } from "lucide-react";

interface PromptPreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    messages: PromptMessage[] | undefined;
    isLoading: boolean;
    error: string | null;
}

export function PromptPreviewDialog({
    open,
    onOpenChange,
    messages,
    isLoading,
    error
}: PromptPreviewDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Resolved Prompt Preview</DialogTitle>
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
                                    <div className="font-semibold capitalize text-sm text-muted-foreground">
                                        {message.role}:
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