/**
 * DraftsPanel — displays all drafts for the current chapter.
 * Each draft is a collapsible card showing metadata and generated content.
 */
import { useEffect, useState } from 'react';
import { Trash2, ChevronDown, ChevronRight, FileText, Bot, BookOpen, Tag, Copy, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDraftStore } from '@/features/drafts/stores/useDraftStore';
import { useStoryContext } from '@/features/stories/context/StoryContext';
import type { Draft } from '@/types/story';
import { toast } from 'react-toastify';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function DraftsPanel() {
    const { currentChapterId } = useStoryContext();
    const { drafts, isLoading, fetchDrafts, deleteDraft } = useDraftStore();
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    useEffect(() => {
        if (currentChapterId) {
            fetchDrafts(currentChapterId);
        }
    }, [currentChapterId, fetchDrafts]);

    const toggleExpand = (id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleCopy = async (content: string) => {
        try {
            await navigator.clipboard.writeText(content);
            toast.success('Copied to clipboard');
        } catch {
            toast.error('Failed to copy');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        await deleteDraft(deleteTarget);
        setDeleteTarget(null);
        toast.success('Draft deleted');
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
                Loading drafts…
            </div>
        );
    }

    if (drafts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                <FileText className="h-10 w-10 opacity-40" />
                <p className="text-sm">No drafts saved for this chapter yet.</p>
                <p className="text-xs">Generate prose and click "Save Draft" to keep it here.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3 p-1">
            <div className="text-xs text-muted-foreground mb-2">
                {drafts.length} draft{drafts.length !== 1 ? 's' : ''} saved
            </div>

            {drafts.map((draft) => (
                <DraftCard
                    key={draft.id}
                    draft={draft}
                    expanded={expandedIds.has(draft.id)}
                    onToggle={() => toggleExpand(draft.id)}
                    onCopy={() => handleCopy(draft.content)}
                    onDelete={() => setDeleteTarget(draft.id)}
                    formatDate={formatDate}
                />
            ))}

            {/* Delete confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Draft</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this draft. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// ── Individual draft card ──────────────────────────────────────

function DraftCard({
    draft,
    expanded,
    onToggle,
    onCopy,
    onDelete,
    formatDate,
}: {
    draft: Draft;
    expanded: boolean;
    onToggle: () => void;
    onCopy: () => void;
    onDelete: () => void;
    formatDate: (d: Date) => string;
}) {
    return (
        <div className="border rounded-lg bg-card overflow-hidden">
            {/* Header — always visible */}
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-2 p-3 text-left hover:bg-muted/50 transition-colors"
            >
                {expanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{draft.name}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(draft.createdAt)}
                        </span>
                        <span>{draft.wordCount} words</span>
                    </div>
                </div>
            </button>

            {/* Expanded body */}
            {expanded && (
                <div className="border-t px-3 pb-3">
                    {/* Metadata */}
                    <div className="py-3 space-y-2">
                        {draft.sceneBeatCommand && (
                            <div className="flex items-start gap-2">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div>
                                    <div className="text-xs font-medium text-muted-foreground">Scene Beat</div>
                                    <div className="text-sm">{draft.sceneBeatCommand}</div>
                                </div>
                            </div>
                        )}
                        {draft.modelName && (
                            <div className="flex items-start gap-2">
                                <Bot className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div>
                                    <div className="text-xs font-medium text-muted-foreground">Model</div>
                                    <div className="text-sm">{draft.modelName}</div>
                                </div>
                            </div>
                        )}
                        {draft.promptName && (
                            <div className="flex items-start gap-2">
                                <BookOpen className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div>
                                    <div className="text-xs font-medium text-muted-foreground">Prompt</div>
                                    <div className="text-sm">{draft.promptName}</div>
                                </div>
                            </div>
                        )}
                        {draft.lorebookContext && draft.lorebookContext.length > 0 && (
                            <div className="flex items-start gap-2">
                                <Tag className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div>
                                    <div className="text-xs font-medium text-muted-foreground mb-1">Lorebook Context</div>
                                    <div className="flex flex-wrap gap-1">
                                        {draft.lorebookContext.map((name, i) => (
                                            <Badge key={i} variant="secondary" className="text-xs">
                                                {name}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Generated content */}
                    <div className="rounded-md border p-3 bg-muted/10 text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto leading-relaxed">
                        {draft.content}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                        <Button variant="outline" size="sm" onClick={onCopy} className="text-xs">
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                        </Button>
                        <Button variant="ghost" size="sm" onClick={onDelete} className="text-xs text-destructive hover:text-destructive">
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
