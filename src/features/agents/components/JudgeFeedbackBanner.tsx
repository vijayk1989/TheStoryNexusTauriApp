import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, X } from 'lucide-react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface JudgeFeedbackBannerProps {
    feedback: string;
    agentName?: string;
    onDismiss: () => void;
}

/**
 * Inline banner shown during agentic pipeline execution when a judge step
 * finds issues. Appears between the thinking block and the streamed prose,
 * signalling that a revision step is in progress.
 */
export function JudgeFeedbackBanner({ feedback, agentName, onDismiss }: JudgeFeedbackBannerProps) {
    const [open, setOpen] = useState(false);

    return (
        <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 text-yellow-200 text-xs my-2">
            <Collapsible open={open} onOpenChange={setOpen}>
                <div className="flex items-center justify-between px-3 py-2">
                    <CollapsibleTrigger asChild>
                        <button
                            className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity"
                        >
                            <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                            <span className="font-medium">
                                {agentName ? `${agentName}: issues found` : 'Judge found issues'} — Revision in progress…
                            </span>
                            {open
                                ? <ChevronDown className="h-3.5 w-3.5 ml-auto shrink-0" />
                                : <ChevronRight className="h-3.5 w-3.5 ml-auto shrink-0" />
                            }
                        </button>
                    </CollapsibleTrigger>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 ml-2 text-yellow-300 hover:text-yellow-100 hover:bg-yellow-500/20"
                        onClick={onDismiss}
                        title="Dismiss"
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
                <CollapsibleContent>
                    <div className={cn('px-3 pb-3 border-t border-yellow-500/30 pt-2')}>
                        <pre className="whitespace-pre-wrap font-mono text-[11px] text-yellow-100/80 max-h-48 overflow-y-auto">
                            {feedback}
                        </pre>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}
