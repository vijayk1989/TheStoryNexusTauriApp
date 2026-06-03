/**
 * Dialog for regenerating a SceneBeat AI response with user refinement.
 *
 * Shows a collapsible view of the original prompt + AI response,
 * plus a textarea for the user's custom refinement message.
 */
import { useState } from 'react';
import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { PromptMessage } from '@/types/story';

interface RegenerateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    messages: PromptMessage[] | undefined;
    previousResponse: string;
    onRegenerate: (customMessage: string) => Promise<void>;
    isStreaming: boolean;
}

export function RegenerateDialog({
    open,
    onOpenChange,
    messages,
    previousResponse,
    onRegenerate,
    isStreaming,
}: RegenerateDialogProps) {
    const [customMessage, setCustomMessage] = useState('');
    const [contextOpen, setContextOpen] = useState(false);

    const handleSubmit = async () => {
        if (!customMessage.trim()) return;
        await onRegenerate(customMessage.trim());
        setCustomMessage('');
    };

    const handleOpenChange = (v: boolean) => {
        if (!v) {
            setCustomMessage('');
            setContextOpen(false);
        }
        onOpenChange(v);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto"
                onPointerDownCapture={(e) => e.stopPropagation()}
                onPointerUpCapture={(e) => e.stopPropagation()}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Regenerate Response
                    </DialogTitle>
                </DialogHeader>

                {/* Collapsible: Previous prompt + response */}
                <Collapsible open={contextOpen} onOpenChange={setContextOpen}>
                    <CollapsibleTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
                        >
                            {contextOpen ? (
                                <ChevronDown className="h-3 w-3" />
                            ) : (
                                <ChevronRight className="h-3 w-3" />
                            )}
                            View previous prompt &amp; response
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className="max-h-[300px] overflow-y-auto rounded-md border bg-muted/20 p-3 space-y-3 text-xs mt-1">
                            {/* Original prompt messages */}
                            {messages?.map((msg, idx) => (
                                <div key={idx} className="space-y-1">
                                    <span className="font-semibold uppercase text-[10px] tracking-wider text-muted-foreground">
                                        {msg.role}
                                    </span>
                                    <p className="whitespace-pre-wrap text-foreground/90">
                                        {msg.content}
                                    </p>
                                </div>
                            ))}

                            {/* AI response */}
                            {previousResponse && (
                                <div className="space-y-1 border-t pt-2">
                                    <span className="font-semibold uppercase text-[10px] tracking-wider text-muted-foreground">
                                        assistant (previous response)
                                    </span>
                                    <p className="whitespace-pre-wrap text-foreground/90">
                                        {previousResponse}
                                    </p>
                                </div>
                            )}
                        </div>
                    </CollapsibleContent>
                </Collapsible>

                {/* Custom regeneration message */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">
                        Refinement instructions
                    </label>
                    <Textarea
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        placeholder='e.g. "Make it more dramatic" or "Focus on the dialogue between the two characters"'
                        className="min-h-[100px] resize-y text-sm"
                    />
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenChange(false)}
                        disabled={isStreaming}
                    >
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={!customMessage.trim() || isStreaming}
                    >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Regenerate
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
