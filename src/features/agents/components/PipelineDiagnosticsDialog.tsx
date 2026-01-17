import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Clock, MessageSquare, Bot, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import type { AgentResult, PromptMessage } from '@/types/story';
import { cn } from '@/lib/utils';

interface PipelineDiagnosticsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    results: AgentResult[];
    pipelineName?: string;
}

function formatMessages(messages: PromptMessage[]): string {
    return messages.map(msg => {
        const roleLabel = msg.role.toUpperCase();
        return `[${roleLabel}]\n${msg.content}`;
    }).join('\n\n' + '─'.repeat(50) + '\n\n');
}

function getStatusIcon(result: AgentResult) {
    if (result.metadata?.error) {
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
    if (result.output.toUpperCase().includes('ISSUE') || 
        result.output.toUpperCase().includes('INCONSISTENT') ||
        result.output.toUpperCase().includes('ERROR')) {
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
}

function StepSection({ result, index }: { result: AgentResult; index: number }) {
    const [isOpen, setIsOpen] = useState(index === 0); // First step open by default

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="w-full">
                <div className={cn(
                    "flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors",
                    isOpen && "bg-accent/30"
                )}>
                    {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Bot className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-medium truncate">{result.agentName}</span>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                            {result.role}
                        </Badge>
                        {result.metadata?.isRevision && (
                            <Badge variant="secondary" className="text-xs flex-shrink-0">
                                Revision
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                        {getStatusIcon(result)}
                        {result.duration && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {result.duration}ms
                            </div>
                        )}
                    </div>
                </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
                <div className="px-3 pb-3 space-y-4">
                    {/* Prompt Sent Section */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <MessageSquare className="h-4 w-4" />
                            Prompt Sent
                        </div>
                        <div className="relative">
                            <ScrollArea className="h-[300px] w-full rounded-md border bg-muted/30">
                                <pre className="p-3 text-xs whitespace-pre-wrap font-mono">
                                    {result.promptSent 
                                        ? formatMessages(result.promptSent)
                                        : 'No prompt data available'}
                                </pre>
                            </ScrollArea>
                        </div>
                    </div>

                    {/* Response Received Section */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Bot className="h-4 w-4" />
                            Response Received
                        </div>
                        <div className="relative">
                            <ScrollArea className="h-[300px] w-full rounded-md border bg-muted/30">
                                <pre className="p-3 text-xs whitespace-pre-wrap font-mono">
                                    {result.output || 'No output'}
                                </pre>
                            </ScrollArea>
                        </div>
                    </div>

                    {/* Error if present */}
                    {result.metadata?.error && (
                        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30">
                            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                                <XCircle className="h-4 w-4" />
                                Error
                            </div>
                            <p className="mt-1 text-xs text-destructive">
                                {String(result.metadata.error)}
                            </p>
                        </div>
                    )}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

export function PipelineDiagnosticsDialog({
    open,
    onOpenChange,
    results,
    pipelineName,
}: PipelineDiagnosticsDialogProps) {
    const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
    const hasIssues = results.some(r => 
        r.output.toUpperCase().includes('ISSUE') || 
        r.output.toUpperCase().includes('INCONSISTENT')
    );
    const hasErrors = results.some(r => r.metadata?.error);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <Bot className="h-5 w-5" />
                        Pipeline Diagnostics
                        {pipelineName && (
                            <Badge variant="outline">{pipelineName}</Badge>
                        )}
                    </DialogTitle>
                </DialogHeader>

                {/* Summary Bar */}
                <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Steps:</span>
                        <span className="font-medium">{results.length}</span>
                    </div>
                    <Separator orientation="vertical" className="h-4" />
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Total:</span>
                        <span className="font-medium">{totalDuration}ms</span>
                    </div>
                    <Separator orientation="vertical" className="h-4" />
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Status:</span>
                        {hasErrors ? (
                            <Badge variant="destructive">Failed</Badge>
                        ) : hasIssues ? (
                            <Badge variant="secondary">Issues Found</Badge>
                        ) : (
                            <Badge variant="default">Success</Badge>
                        )}
                    </div>
                </div>

                {/* Steps List */}
                <ScrollArea className="flex-1 min-h-0">
                    <div className="space-y-2 pr-4">
                        {results.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No pipeline results to display
                            </div>
                        ) : (
                            results.map((result, index) => (
                                <StepSection
                                    key={`${result.agentName}-${index}`}
                                    result={result}
                                    index={index}
                                />
                            ))
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
