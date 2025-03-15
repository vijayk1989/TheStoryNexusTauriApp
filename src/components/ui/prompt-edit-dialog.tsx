import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { PromptMessage } from '@/types/story';
import { Loader2, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

// THIS IS CURRENTLY NOT USED

interface PromptEditDialogProps {
    messages: PromptMessage[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isLoading?: boolean;
    error?: string | null;
    onMessagesChange: (messages: PromptMessage[]) => void;
}

export function PromptEditDialog({
    messages,
    open,
    onOpenChange,
    isLoading = false,
    error = null,
    onMessagesChange,
}: PromptEditDialogProps) {
    const [activeTab, setActiveTab] = useState('preview');
    const dialogRef = useRef<HTMLDivElement>(null);

    // Create a local copy of messages for editing
    const [localMessages, setLocalMessages] = useState<PromptMessage[]>(messages);

    // Update local messages when prop changes
    useEffect(() => {
        setLocalMessages(messages);
    }, [messages]);

    // Handle content change for a specific message
    const handleContentChange = (index: number, content: string) => {
        const updatedMessages = [...localMessages];
        updatedMessages[index] = { ...updatedMessages[index], content };
        setLocalMessages(updatedMessages);

        // Auto-save changes
        onMessagesChange(updatedMessages);
    };

    // Use a custom handler for the dialog
    const handleOpenChange = (newOpen: boolean) => {
        // Only allow closing through the explicit close button
        if (open && !newOpen) {
            // Prevent automatic closing
            return;
        }
        onOpenChange(newOpen);
    };

    // Handle explicit close button click
    const handleClose = () => {
        onOpenChange(false);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={handleOpenChange}
        >
            <DialogContent
                ref={dialogRef}
                className="sm:max-w-[800px] max-h-[80vh] flex flex-col"
                onPointerDownCapture={(e) => {
                    // Only stop propagation if clicking inside the dialog
                    if (dialogRef.current?.contains(e.target as Node)) {
                        e.stopPropagation();
                    }
                }}
                onPointerUpCapture={(e) => {
                    if (dialogRef.current?.contains(e.target as Node)) {
                        e.stopPropagation();
                    }
                }}
            >
                <DialogHeader className="flex justify-between items-center">
                    <DialogTitle>Edit Prompt</DialogTitle>
                    <button
                        onClick={handleClose}
                        className="rounded-full p-1 hover:bg-muted"
                        aria-label="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <path d="M18 6 6 18"></path>
                            <path d="m6 6 12 12"></path>
                        </svg>
                    </button>
                </DialogHeader>

                {/* Warning alert */}
                <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        All edits in this window are final and will be used for generation.
                    </AlertDescription>
                </Alert>

                {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="ml-2">Parsing prompt...</span>
                    </div>
                ) : error ? (
                    <div className="text-destructive p-4 border border-destructive rounded-md">
                        Error: {error}
                    </div>
                ) : (
                    <Tabs defaultValue="preview" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                        <TabsList>
                            <TabsTrigger value="preview">Preview</TabsTrigger>
                            <TabsTrigger value="edit">Edit</TabsTrigger>
                            <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                        </TabsList>

                        <TabsContent value="preview" className="flex-1 overflow-hidden">
                            <ScrollArea className="h-[400px] rounded-md border p-4">
                                {localMessages.map((message, index) => (
                                    <div key={index} className="mb-4">
                                        <div className="font-bold capitalize">{message.role}:</div>
                                        <div className="whitespace-pre-wrap">{message.content}</div>
                                    </div>
                                ))}
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="edit" className="flex-1 overflow-hidden">
                            <ScrollArea className="h-[400px]">
                                {localMessages.map((message, index) => (
                                    <div key={index} className="mb-4">
                                        <div className="font-bold capitalize mb-1">{message.role}:</div>
                                        <div
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onPointerUp={(e) => e.stopPropagation()}
                                            className="relative"
                                        >
                                            <Textarea
                                                value={message.content}
                                                onChange={(e) => handleContentChange(index, e.target.value)}
                                                className="min-h-[100px]"
                                                onPointerDown={(e) => e.stopPropagation()}
                                                onPointerUp={(e) => e.stopPropagation()}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="raw" className="flex-1 overflow-hidden">
                            <ScrollArea className="h-[400px]">
                                <pre className="p-4 bg-muted rounded-md overflow-auto">
                                    {JSON.stringify(localMessages, null, 2)}
                                </pre>
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    );
} 