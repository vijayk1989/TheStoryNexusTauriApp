import * as React from "react";
import { AllowedModel } from "@/types/story";
import { ParallelResponse } from "@/features/agents/hooks/useParallelGeneration";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
    DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
    ChevronDown, 
    ChevronRight, 
    Check, 
    X, 
    Loader2,
    AlertCircle,
    Square
} from "lucide-react";

interface ParallelResponsesDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    responses: ParallelResponse[];
    isGenerating: boolean;
    onAccept: (text: string, model: AllowedModel) => void;
    onAbortAll: () => void;
}

/**
 * Drawer component for displaying parallel LLM responses with real-time streaming.
 * Each response is in a collapsible section with status indicators and accept buttons.
 */
export function ParallelResponsesDrawer({
    open,
    onOpenChange,
    responses,
    isGenerating,
    onAccept,
    onAbortAll,
}: ParallelResponsesDrawerProps) {
    // Track which sections are expanded (all expanded by default)
    const [expandedSections, setExpandedSections] = React.useState<Set<number>>(
        new Set(responses.map((_, i) => i))
    );

    // Expand all sections when responses change
    React.useEffect(() => {
        setExpandedSections(new Set(responses.map((_, i) => i)));
    }, [responses.length]);

    const toggleSection = (index: number) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    const getStatusBadge = (status: ParallelResponse['status']) => {
        switch (status) {
            case 'pending':
                return (
                    <Badge variant="secondary" className="gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Pending
                    </Badge>
                );
            case 'streaming':
                return (
                    <Badge variant="default" className="gap-1 bg-blue-500">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Streaming
                    </Badge>
                );
            case 'complete':
                return (
                    <Badge variant="default" className="gap-1 bg-green-500">
                        <Check className="h-3 w-3" />
                        Complete
                    </Badge>
                );
            case 'error':
                return (
                    <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Error
                    </Badge>
                );
        }
    };

    const allComplete = responses.length > 0 && responses.every(
        r => r.status === 'complete' || r.status === 'error'
    );

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="max-h-[85vh]">
                <DrawerHeader className="border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <DrawerTitle>Compare Model Responses</DrawerTitle>
                            <DrawerDescription>
                                {isGenerating 
                                    ? "Generating responses from multiple models..."
                                    : allComplete 
                                        ? "All responses complete. Select one to use."
                                        : "Waiting for responses..."
                                }
                            </DrawerDescription>
                        </div>
                        {isGenerating && (
                            <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={onAbortAll}
                                className="gap-1"
                            >
                                <Square className="h-3 w-3" />
                                Stop All
                            </Button>
                        )}
                    </div>
                </DrawerHeader>

                <ScrollArea className="flex-1 p-4 max-h-[60vh]">
                    <div className="space-y-3">
                        {responses.map((response, index) => (
                            <Collapsible
                                key={index}
                                open={expandedSections.has(index)}
                                onOpenChange={() => toggleSection(index)}
                                className="border rounded-lg"
                            >
                            <CollapsibleTrigger asChild>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2 cursor-pointer hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {expandedSections.has(index) ? (
                                                <ChevronDown className="h-4 w-4 flex-shrink-0" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4 flex-shrink-0" />
                                            )}
                                            <span className="font-medium truncate">
                                                {response.model.name}
                                            </span>
                                            <span className="text-xs text-muted-foreground hidden sm:inline">
                                                ({response.model.provider})
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 ml-6 sm:ml-0">
                                            {getStatusBadge(response.status)}
                                            {response.status === 'complete' && response.text && (
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onAccept(response.text, response.model);
                                                    }}
                                                    className="gap-1"
                                                >
                                                    <Check className="h-3 w-3" />
                                                    <span className="hidden sm:inline">Accept</span>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div className="px-3 pb-3">
                                        {response.status === 'error' ? (
                                            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                                <p className="text-sm text-destructive flex items-center gap-2">
                                                    <AlertCircle className="h-4 w-4" />
                                                    {response.error || "Unknown error occurred"}
                                                </p>
                                            </div>
                                        ) : response.text ? (
                                            <div className="p-3 bg-muted/30 rounded-md max-h-64 overflow-y-auto">
                                                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                                    {response.text}
                                                </p>
                                                {response.status === 'streaming' && (
                                                    <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
                                                )}
                                            </div>
                                        ) : response.status === 'pending' || response.status === 'streaming' ? (
                                            <div className="p-3 bg-muted/30 rounded-md flex items-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span className="text-sm">
                                                    {response.status === 'pending' ? 'Starting...' : 'Generating...'}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="p-3 bg-muted/30 rounded-md text-muted-foreground text-sm">
                                                No content generated.
                                            </div>
                                        )}
                                        
                                        {/* Word count for complete responses */}
                                        {response.status === 'complete' && response.text && (
                                            <div className="mt-2 text-xs text-muted-foreground">
                                                {response.text.split(/\s+/).filter(Boolean).length} words
                                            </div>
                                        )}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        ))}
                    </div>
                </ScrollArea>

                <DrawerFooter className="border-t">
                    <DrawerClose asChild>
                        <Button variant="outline" className="w-full">
                            <X className="h-4 w-4 mr-2" />
                            Close
                        </Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}
