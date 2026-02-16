/**
 * Compact Lorebook panel for the Story Editor sidebar Sheet.
 * Lists entries grouped by category as collapsible items.
 */
import { useState } from 'react';
import { useLorebookStore } from '../stores/useLorebookStore';
import { CreateEntryDialog } from './CreateEntryDialog';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight, Plus, Trash2, Edit, X, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';
import type { LorebookEntry } from '@/types/story';
import { cn } from '@/lib/utils';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useStoryContext } from '@/features/stories/context/StoryContext';

export function LorebookPanel() {
    const { entries, deleteEntry, updateEntry } = useLorebookStore();
    const { currentStoryId } = useStoryContext();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showNewDialog, setShowNewDialog] = useState(false);
    const [editingEntry, setEditingEntry] = useState<LorebookEntry | null>(null);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

    // Group entries by category
    const grouped = entries.reduce<Record<string, LorebookEntry[]>>((acc, entry) => {
        const category = entry.category || 'other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(entry);
        return acc;
    }, {});

    const toggleGroup = (category: string) => {
        setOpenGroups(prev => ({ ...prev, [category]: !prev[category] }));
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await deleteEntry(id);
        if (expandedId === id) setExpandedId(null);
        toast.success('Entry deleted');
    };

    const handleToggleDisabled = async (e: React.MouseEvent, entry: LorebookEntry) => {
        e.stopPropagation();
        await updateEntry(entry.id, { isDisabled: !entry.isDisabled });
        toast.success(`Entry ${entry.isDisabled ? 'enabled' : 'disabled'}`);
    }

    return (
        <div className="space-y-3">
            {/* Header / New Entry Button */}
            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{entries.length} entr{entries.length !== 1 ? 'ies' : 'y'}</span>
                <Button
                    variant={showNewDialog ? "secondary" : "default"}
                    size="sm"
                    onClick={() => setShowNewDialog(true)}
                >
                    <Plus className="h-3 w-3 mr-1" /> New Entry
                </Button>
            </div>

            {/* Create/Edit Dialog */}
            {(showNewDialog || editingEntry) && currentStoryId && (
                <CreateEntryDialog
                    open={showNewDialog || !!editingEntry}
                    onOpenChange={(open) => {
                        if (!open) {
                            setShowNewDialog(false);
                            setEditingEntry(null);
                        }
                    }}
                    storyId={currentStoryId}
                    entry={editingEntry || undefined}
                />
            )}

            {/* Grouped Entry List */}
            {Object.entries(grouped).map(([category, categoryEntries]) => (
                <Collapsible
                    key={category}
                    open={openGroups[category] !== false} // default open
                    onOpenChange={() => toggleGroup(category)}
                >
                    <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
                        <ChevronRight className={cn(
                            "h-3.5 w-3.5 transition-transform flex-shrink-0",
                            openGroups[category] !== false && "rotate-90"
                        )} />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {category}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                            {categoryEntries.length}
                        </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 mt-1">
                        {categoryEntries.map(entry => (
                            <LorebookItem
                                key={entry.id}
                                entry={entry}
                                isExpanded={expandedId === entry.id}
                                onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                                onEdit={(e) => {
                                    e.stopPropagation();
                                    setEditingEntry(entry);
                                }}
                                onDelete={handleDelete}
                                onToggleDisabled={handleToggleDisabled}
                            />
                        ))}
                    </CollapsibleContent>
                </Collapsible>
            ))}

            {entries.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                    No entries yet. Click "New Entry" to create one.
                </div>
            )}
        </div>
    );
}

// ── Lorebook Item ────────────────────────────────────────────────

function LorebookItem({
    entry,
    isExpanded,
    onToggle,
    onEdit,
    onDelete,
    onToggleDisabled,
}: {
    entry: LorebookEntry;
    isExpanded: boolean;
    onToggle: () => void;
    onEdit: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
    onToggleDisabled: (e: React.MouseEvent, entry: LorebookEntry) => void;
}) {
    return (
        <div className={cn(
            "border rounded-lg transition-colors",
            isExpanded ? "bg-muted/20 border-primary/30" : "hover:bg-muted/30",
            entry.isDisabled && "opacity-60"
        )}>
            {/* Header row */}
            <div
                className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                onClick={onToggle}
            >
                <ChevronRight className={cn(
                    "h-3.5 w-3.5 transition-transform flex-shrink-0 text-muted-foreground",
                    isExpanded && "rotate-90"
                )} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="text-sm font-medium truncate">{entry.name}</div>
                        {entry.isValid === false && (
                            <span className="text-[10px] text-destructive" title="Invalid keys">⚠️</span>
                        )}
                         {entry.isDisabled && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                                Disabled
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => onToggleDisabled(e, entry)}
                        title={entry.isDisabled ? "Enable entry" : "Disable entry"}
                    >
                         {entry.isDisabled ? (
                            <Eye className="h-3 w-3" />
                        ) : (
                            <EyeOff className="h-3 w-3" />
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={onEdit}
                        title="Edit entry"
                    >
                        <Edit className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={(e) => e.stopPropagation()}
                                title="Delete entry"
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to delete "{entry.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={(e) => onDelete(e, entry.id)}
                                >
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            {/* Expanded: Details */}
            {isExpanded && (
                <div className="px-3 pb-3 pt-0 border-t-0 pl-8">
                     {entry.tags && entry.tags.length > 0 && (
                        <div className="bg-muted/50 rounded p-2 mb-2 text-xs">
                             <span className="font-semibold text-muted-foreground">Tags: </span>
                             <span className="text-muted-foreground">{entry.tags.join(', ')}</span>
                        </div>
                    )}
                    <div className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-6">
                        {entry.description}
                    </div>
                </div>
            )}
        </div>
    );
}
