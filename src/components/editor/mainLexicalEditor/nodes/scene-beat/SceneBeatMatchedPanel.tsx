/**
 * SceneBeat matched entries panel — inline display of chapter-matched,
 * scene-beat-matched, and custom-context matched lorebook entries as badges.
 */
import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSBStore } from '@/features/scenebeats/stores/useSceneBeatInstanceStore';
import { useLorebookStore } from '@/features/lorebook/stores/useLorebookStore';
import { useStoryContext } from '@/features/stories/context/StoryContext';
import { CreateEntryDialog } from '@/features/lorebook/components/CreateEntryDialog';
import type { LorebookEntry } from '@/types/story';

export function SceneBeatMatchedPanel() {
    const showMatchedEntries = useSBStore((s) => s.showMatchedEntries);
    const showAdditionalContext = useSBStore((s) => s.showAdditionalContext);
    const useMatchedChapter = useSBStore((s) => s.useMatchedChapter);
    const useMatchedSceneBeat = useSBStore((s) => s.useMatchedSceneBeat);
    const useCustomContext = useSBStore((s) => s.useCustomContext);
    const localMatchedEntries = useSBStore((s) => s.localMatchedEntries);
    const selectedItems = useSBStore((s) => s.selectedItems);
    const set = useSBStore((s) => s.set);

    const { chapterMatchedEntries } = useLorebookStore();
    const { currentStoryId } = useStoryContext();

    const [editingEntry, setEditingEntry] = useState<LorebookEntry | null>(null);

    // After edit dialog closes, sync updated entry back into instance store
    const handleEditDialogClose = (open: boolean) => {
        if (!open && editingEntry) {
            // Use getState() to ensure we get the very latest version from the store
            // immediately after the update, bypassing any React render delays.
            const { entries } = useLorebookStore.getState();
            const freshEntry = entries.find((e) => e.id === editingEntry.id);
            
            if (freshEntry) {
                // Update selectedItems
                const updatedItems = selectedItems.map((item) =>
                    item.id === freshEntry.id ? freshEntry : item
                );
                
                // Update localMatchedEntries (Map)
                const updatedMatched = new Map(localMatchedEntries);
                if (updatedMatched.has(freshEntry.id)) {
                    updatedMatched.set(freshEntry.id, freshEntry);
                }
                
                set({ selectedItems: updatedItems, localMatchedEntries: updatedMatched });
            }
            setEditingEntry(null);
        }
    };

    if (!showMatchedEntries && !showAdditionalContext) return null;

    return (
        <>
            {/* Matched Entries Panel */}
            {showMatchedEntries && (
                <div className="p-3 md:p-4 border-t">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                        <h3 className="font-medium text-sm md:text-base">Matched Entries</h3>
                        <div className="text-xs text-muted-foreground">
                            Entries that match tags in your content
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Chapter Matched */}
                        <EntryBadgeSection
                            title="Chapter Matched Entries"
                            included={useMatchedChapter}
                            entries={chapterMatchedEntries ? Array.from(chapterMatchedEntries.values()) : []}
                            onEdit={setEditingEntry}
                        />

                        {/* Scene Beat Matched */}
                        <EntryBadgeSection
                            title="Scene Beat Matched Entries"
                            included={useMatchedSceneBeat}
                            entries={Array.from(localMatchedEntries.values())}
                            onEdit={setEditingEntry}
                        />

                        {/* Custom Context */}
                        {useCustomContext && (
                            <EntryBadgeSection
                                title="Custom Context Entries"
                                included={true}
                                entries={selectedItems}
                                onEdit={setEditingEntry}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Lorebook entry edit dialog */}
            {editingEntry && currentStoryId && (
                <CreateEntryDialog
                    open={true}
                    onOpenChange={handleEditDialogClose}
                    storyId={currentStoryId}
                    entry={editingEntry}
                />
            )}
        </>
    );
}

// ── Helper ─────────────────────────────────────────────────────

function EntryBadgeSection({
    title,
    included,
    entries,
    onEdit,
}: {
    title: string;
    included: boolean;
    entries: LorebookEntry[];
    onEdit: (entry: LorebookEntry) => void;
}) {
    return (
        <div>
            <div className="text-xs md:text-sm font-medium mb-2">
                {title}{' '}
                {included && (
                    <span className="text-xs text-green-500">(Included)</span>
                )}
            </div>
            <div className="mb-4 border rounded-md p-2 md:p-3 bg-muted/10">
                <div className="flex flex-wrap gap-1 md:gap-2 max-h-[120px] md:max-h-[150px] overflow-y-auto">
                    {entries.length === 0 ? (
                        <div className="text-muted-foreground text-xs">
                            No matched entries found
                        </div>
                    ) : (
                        entries.map((entry) => (
                            <Badge
                                key={entry.id}
                                variant="secondary"
                                className="flex items-center gap-1 px-2 py-0.5 md:px-3 md:py-1 text-xs"
                            >
                                <span className="truncate max-w-[80px] md:max-w-none">{entry.name}</span>
                                <span className="text-xs text-muted-foreground ml-1 capitalize hidden sm:inline">
                                    ({entry.category})
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onEdit(entry)}
                                    className="ml-0.5 hover:text-primary flex-shrink-0"
                                    title="Edit entry"
                                >
                                    <Pencil className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
