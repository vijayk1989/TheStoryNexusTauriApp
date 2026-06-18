/**
 * CustomRewritePanel — the "custom instruction" form that appears when the
 * user clicks "Custom" in the floating toolbar.
 */

import type { JSX } from "react";
import { useRef, useEffect } from "react";

import {
    Book,
    ChevronDown,
    ChevronUp,
    Loader2,
    Square,
    Wand2,
    X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PromptSelectMenu } from "@/components/ui/prompt-select-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLorebookStore } from "@/features/lorebook/stores/useLorebookStore";

import type { useSelectionAiRewrite } from "./useSelectionAiRewrite";

type Ai = ReturnType<typeof useSelectionAiRewrite>;

interface CustomRewritePanelProps {
    ai: Ai;
    onClose: () => void;
}

export function CustomRewritePanel({ ai, onClose }: CustomRewritePanelProps): JSX.Element {
    const customInputRef = useRef<HTMLTextAreaElement>(null);

    // Focus the textarea on mount
    useEffect(() => {
        const timer = setTimeout(() => customInputRef.current?.focus(), 50);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="sn-floating-custom-rewrite">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Custom Rewrite</span>
                <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Selected text preview */}
            <div className="text-xs text-muted-foreground px-2 py-1.5 bg-muted rounded border mb-3 max-h-[60px] overflow-y-auto">
                "{ai.savedSelectionText.length > 100
                    ? ai.savedSelectionText.substring(0, 100) + "..."
                    : ai.savedSelectionText}"
            </div>

            {/* Prompt selection */}
            <div className="mb-3">
                <PromptSelectMenu
                    isLoading={ai.isLoading}
                    error={ai.error}
                    prompts={ai.prompts}
                    promptType="selection_specific"
                    selectedPrompt={ai.customSelectedPrompt}
                    selectedModel={ai.customSelectedModel}
                    onSelect={ai.handleCustomPromptSelect}
                />
            </div>

            {/* Lorebook context section */}
            <LorebookContextSection ai={ai} />

            {/* Custom instruction textarea */}
            <textarea
                ref={customInputRef}
                value={ai.customInstruction}
                onChange={(e) => ai.setCustomInstruction(e.target.value)}
                placeholder="How should it be rewritten? (e.g., 'Make it more dramatic')"
                className="w-full min-h-[60px] p-2 rounded text-sm resize-none bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary mb-3"
                onMouseDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        if (ai.customSelectedPrompt && ai.customSelectedModel) {
                            ai.handleCustomGenerate();
                        }
                    }
                    if (e.key === "Escape") {
                        onClose();
                    }
                }}
            />

            {/* Action buttons */}
            {ai.customSelectedPrompt && ai.customSelectedModel && (
                <div className="flex gap-2 mb-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={ai.handleCustomPreviewPrompt}
                        className="flex-1"
                    >
                        Preview
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        onClick={ai.handleCustomGenerate}
                        disabled={ai.isGenerating}
                        className="flex-1 flex items-center justify-center gap-1"
                    >
                        {ai.isGenerating ? (
                            <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>Rewriting...</span>
                            </>
                        ) : (
                            <>
                                <Wand2 className="h-3 w-3" />
                                <span>Change</span>
                            </>
                        )}
                    </Button>
                    {ai.isGenerating && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={ai.handleAbortGeneration}
                            className="flex items-center justify-center gap-1"
                            title="Stop generation"
                        >
                            <Square className="h-3 w-3" />
                            <span>Stop</span>
                        </Button>
                    )}
                </div>
            )}

            {/* Inline prompt preview */}
            {ai.showInlinePreview && (
                <div className="mb-3 border rounded-md bg-muted/30">
                    <button
                        type="button"
                        onClick={() => ai.setShowInlinePreview(false)}
                        className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 rounded-t-md"
                    >
                        <span>Prompt Preview</span>
                        <ChevronUp className="h-3 w-3" />
                    </button>
                    <div className="px-2 py-1.5 border-t h-[200px] overflow-y-auto">
                        {ai.inlinePreviewLoading ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                        ) : ai.inlinePreviewError ? (
                            <div className="text-xs text-destructive">Error: {ai.inlinePreviewError}</div>
                        ) : ai.inlinePreviewMessages ? (
                            <div className="space-y-2">
                                {ai.inlinePreviewMessages.map((message, index) => (
                                    <div key={index} className="space-y-1">
                                        <div className="text-xs font-semibold capitalize text-muted-foreground">
                                            {message.role}:
                                        </div>
                                        <div className="text-xs whitespace-pre-wrap bg-background rounded p-1.5 border max-h-[150px] overflow-y-auto">
                                            {message.content}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-xs text-muted-foreground">No preview available</div>
                        )}
                    </div>
                </div>
            )}

            {/* Streaming preview */}
            {ai.isGenerating && ai.rewrittenText && (
                <div className="text-xs text-muted-foreground px-2 py-1.5 bg-primary/10 rounded border border-primary/30 max-h-[80px] overflow-y-auto mb-3">
                    <span className="text-primary font-medium">Preview: </span>
                    {ai.rewrittenText}
                    <span className="inline-block w-1.5 h-3 ml-0.5 bg-primary animate-pulse" />
                </div>
            )}

            <span className="text-xs text-muted-foreground text-center block">
                Ctrl+Enter to submit • Esc to cancel
            </span>
        </div>
    );
}

/* ─── Lorebook context sub-section ─────────────────────────── */

function LorebookContextSection({ ai }: { ai: Ai }): JSX.Element {
    const { entries } = useLorebookStore();

    return (
        <div className="mb-3 border rounded-md bg-muted/30">
            <button
                type="button"
                onClick={() => ai.setShowContextSection(!ai.showContextSection)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 rounded-t-md"
            >
                <div className="flex items-center gap-1">
                    <Book className="h-3 w-3" />
                    <span>Lorebook Context</span>
                    {ai.selectedContextItems.length > 0 && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-1">
                            {ai.selectedContextItems.length}
                        </Badge>
                    )}
                </div>
                {ai.showContextSection ? (
                    <ChevronUp className="h-3 w-3" />
                ) : (
                    <ChevronDown className="h-3 w-3" />
                )}
            </button>

            {ai.showContextSection && (
                <div className="p-2 border-t space-y-3 bg-background/50 rounded-b-md">
                    {/* Enable switch */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">Use Custom Context</span>
                        <Switch
                            checked={ai.useCustomContext}
                            onCheckedChange={ai.setUseCustomContext}
                            className="h-4 w-7"
                        />
                    </div>

                    {ai.useCustomContext && (
                        <>
                            {/* Include all switch */}
                            <div className="flex items-center justify-between">
                                <span className="text-xs">Include All Lorebook</span>
                                <Switch
                                    checked={ai.includeAllLorebook}
                                    onCheckedChange={(v: boolean) => {
                                        ai.setIncludeAllLorebook(v);
                                        if (v) {
                                            const allEntries = useLorebookStore
                                                .getState()
                                                .getFilteredEntries();
                                            ai.setSelectedContextItems(allEntries);
                                        } else {
                                            ai.setSelectedContextItems([]);
                                        }
                                    }}
                                    className="h-4 w-7"
                                />
                            </div>

                            {/* Item select */}
                            <div>
                                <Select
                                    onValueChange={(value) => ai.handleContextItemSelect(value)}
                                    value=""
                                >
                                    <SelectTrigger className="h-7 text-xs w-full">
                                        <SelectValue placeholder="Select lorebook item..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                        {["character", "location", "item", "event", "note"].map(
                                            (category) => {
                                                const categoryItems = entries.filter(
                                                    (entry) => entry.category === category,
                                                );
                                                if (categoryItems.length === 0) return null;

                                                return (
                                                    <div key={category}>
                                                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted capitalize">
                                                            {category}s
                                                        </div>
                                                        {categoryItems.map((entry) => (
                                                            <SelectItem
                                                                key={entry.id}
                                                                value={entry.id}
                                                                disabled={ai.selectedContextItems.some(
                                                                    (item) => item.id === entry.id,
                                                                )}
                                                                className="text-xs"
                                                            >
                                                                {entry.name}
                                                            </SelectItem>
                                                        ))}
                                                    </div>
                                                );
                                            },
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Selected items badges */}
                            {ai.selectedContextItems.length > 0 && (
                                <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto p-1 border rounded bg-muted/10">
                                    {ai.selectedContextItems.map((item) => (
                                        <Badge
                                            key={item.id}
                                            variant="secondary"
                                            className="flex items-center gap-1 px-1.5 py-0 text-[10px]"
                                        >
                                            <span className="truncate max-w-[80px]">{item.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => ai.removeContextItem(item.id)}
                                                className="hover:text-destructive flex-shrink-0"
                                            >
                                                <X className="h-2.5 w-2.5" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
