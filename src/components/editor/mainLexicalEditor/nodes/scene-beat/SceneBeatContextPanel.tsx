/**
 * SceneBeat context toggles panel — matched chapter/scene-beat tags,
 * custom context selection, lorebook item picker + badges.
 */
import { useState } from 'react';
import { ChevronRight, ChevronDown, X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Collapsible,
    CollapsibleTrigger,
    CollapsibleContent,
} from '@/components/ui/collapsible';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useSBStore } from '@/features/scenebeats/stores/useSceneBeatInstanceStore';
import { useLorebookStore } from '@/features/lorebook/stores/useLorebookStore';
import { useStoryContext } from '@/features/stories/context/StoryContext';
import { CreateEntryDialog } from '@/features/lorebook/components/CreateEntryDialog';
import type { LorebookEntry } from '@/types/story';

export function SceneBeatContextPanel() {
    const showContext = useSBStore((s) => s.showContext);
    const useMatchedChapter = useSBStore((s) => s.useMatchedChapter);
    const useMatchedSceneBeat = useSBStore((s) => s.useMatchedSceneBeat);
    const useCustomContext = useSBStore((s) => s.useCustomContext);
    const includeAllLorebook = useSBStore((s) => s.includeAllLorebook);
    const selectedItems = useSBStore((s) => s.selectedItems);
    const set = useSBStore((s) => s.set);
    const handleItemSelect = useSBStore((s) => s.handleItemSelect);
    const removeItem = useSBStore((s) => s.removeItem);
    const handleIncludeAllLorebook = useSBStore((s) => s.handleIncludeAllLorebook);

    const { entries } = useLorebookStore();
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
                // Update selectedItems in the instance store
                const updatedItems = selectedItems.map((item) =>
                    item.id === freshEntry.id ? freshEntry : item
                );
                set({ selectedItems: updatedItems });
            }
            setEditingEntry(null);
        }
    };

    return (
        <div className="px-4 pb-2">
            <Collapsible open={showContext} onOpenChange={(v) => set({ showContext: v })}>
                <CollapsibleTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center justify-between p-1 h-auto"
                    >
                        {showContext ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-medium">Context</span>
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="space-y-4 mb-4">
                        {/* Matched Chapter Tags Toggle with All Lorebook switch */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm">Matched Chapter Tags</div>
                                <div className="text-xs text-muted-foreground">
                                    Include entries matched from the entire chapter
                                </div>
                            </div>
                            <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={useMatchedChapter}
                                        onCheckedChange={(v) => set({ useMatchedChapter: v as boolean })}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">All Lorebook</span>
                                    <Switch
                                        checked={includeAllLorebook}
                                        onCheckedChange={(v) => handleIncludeAllLorebook(v as boolean)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Matched Scene Beat Tags Toggle */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm">Matched Scene Beat Tags</div>
                                <div className="text-xs text-muted-foreground">
                                    Include entries matched from this scene beat
                                </div>
                            </div>
                            <Switch
                                checked={useMatchedSceneBeat}
                                onCheckedChange={(v) => set({ useMatchedSceneBeat: v as boolean })}
                                className="flex-shrink-0"
                            />
                        </div>

                        {/* Custom Context Toggle */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm">Custom Context Selection</div>
                                <div className="text-xs text-muted-foreground">
                                    Manually select additional lorebook entries
                                </div>
                            </div>
                            <Switch
                                checked={useCustomContext}
                                onCheckedChange={(v) => set({ useCustomContext: v as boolean })}
                                className="flex-shrink-0"
                            />
                        </div>
                    </div>

                    {/* Custom Context Selection */}
                    {useCustomContext && (
                        <div className="mb-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm">All Lorebook</div>
                                    <div className="text-xs text-muted-foreground">
                                        Select all lorebook entries as custom context
                                    </div>
                                </div>
                                <Switch
                                    checked={includeAllLorebook}
                                    onCheckedChange={(v) => handleIncludeAllLorebook(v as boolean)}
                                    className="flex-shrink-0"
                                />
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium text-sm">Custom Context</h4>
                            </div>

                            <div className="mb-4">
                                <div className="w-full">
                                    <div className="text-xs font-medium mb-1">Lorebook Items</div>
                                    <Select
                                        onValueChange={(value) => {
                                            handleItemSelect(value);
                                            const el = document.querySelector('[data-lorebook-select="true"]');
                                            if (el) (el as HTMLSelectElement).value = '';
                                        }}
                                        value=""
                                    >
                                        <SelectTrigger className="w-full" data-lorebook-select="true">
                                            <SelectValue placeholder="Select lorebook item" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px]">
                                            {['character', 'location', 'item', 'event', 'note'].map((category) => {
                                                const categoryItems = entries.filter((e) => e.category === category);
                                                if (categoryItems.length === 0) return null;
                                                return (
                                                    <div key={category}>
                                                        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted capitalize">
                                                            {category}s
                                                        </div>
                                                        {categoryItems.map((entry) => (
                                                            <SelectItem
                                                                key={entry.id}
                                                                value={entry.id}
                                                                disabled={selectedItems.some((i) => i.id === entry.id)}
                                                            >
                                                                {entry.name}
                                                            </SelectItem>
                                                        ))}
                                                    </div>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Selected items badges */}
                            <div className="border rounded-md p-2 md:p-3 bg-muted/10">
                                <div className="text-xs font-medium mb-2">
                                    Selected Items ({selectedItems.length})
                                </div>
                                <div className="flex flex-wrap gap-1 md:gap-2 max-h-[120px] md:max-h-[150px] overflow-y-auto">
                                    {selectedItems.map((item) => (
                                        <Badge
                                            key={item.id}
                                            variant="secondary"
                                            className="flex items-center gap-1 px-2 py-0.5 md:px-3 md:py-1 text-xs"
                                        >
                                            <span className="truncate max-w-[100px] md:max-w-none">{item.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => setEditingEntry(item)}
                                                className="ml-0.5 hover:text-primary flex-shrink-0"
                                                title="Edit entry"
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeItem(item.id)}
                                                className="ml-0.5 hover:text-destructive flex-shrink-0"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                    {selectedItems.length === 0 && (
                                        <div className="text-muted-foreground text-xs">No items selected</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </CollapsibleContent>
            </Collapsible>

            {/* Lorebook entry edit dialog */}
            {editingEntry && currentStoryId && (
                <CreateEntryDialog
                    open={true}
                    onOpenChange={handleEditDialogClose}
                    storyId={currentStoryId}
                    entry={editingEntry}
                />
            )}
        </div>
    );
}
