import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { CreateEntryDialog } from '@/features/lorebook/components/CreateEntryDialog';
import { useStoryContext } from '@/features/stories/context/StoryContext';
import { LorebookEntry } from '@/types/story';

interface SceneBeatMatchedEntriesProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    matchedEntries: Set<LorebookEntry>;
}

export function SceneBeatMatchedEntries({
    open,
    onOpenChange,
    matchedEntries
}: SceneBeatMatchedEntriesProps) {
    const { currentStoryId } = useStoryContext();
    const [openStates, setOpenStates] = useState<Record<string, boolean>>({});
    const [editingEntry, setEditingEntry] = useState<LorebookEntry | null>(null);

    if (matchedEntries.size === 0 || !currentStoryId) return null;

    const handleOpenChange = (id: string, isOpen: boolean) => {
        setOpenStates(prev => ({ ...prev, [id]: isOpen }));
    };

    const handleEdit = (entry: LorebookEntry) => {
        setEditingEntry({
            ...entry,
            storyId: currentStoryId,
            metadata: {
                importance: entry.metadata?.importance || 'minor',
                status: entry.metadata?.status || 'active',
                type: entry.metadata?.type || '',
                relationships: entry.metadata?.relationships || [],
                customFields: entry.metadata?.customFields || {},
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Scene Beat Matched Entries</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                    {Array.from(matchedEntries).map((entry) => (
                        <Collapsible
                            key={entry.id}
                            open={openStates[entry.id]}
                            onOpenChange={(isOpen) => handleOpenChange(entry.id, isOpen)}
                        >
                            <div className="flex items-center gap-2">
                                <CollapsibleTrigger className="flex flex-1 items-center gap-2 w-full text-left p-2 hover:bg-accent rounded-lg">
                                    <ChevronRight className="h-4 w-4" />
                                    <span>{entry.name}</span>
                                </CollapsibleTrigger>
                                {openStates[entry.id] && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEdit(entry);
                                        }}
                                        className="h-8 w-8"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            <CollapsibleContent className="p-2 text-sm space-y-2">
                                <div>
                                    <span className="font-semibold">Tags: </span>
                                    {entry.tags.join(', ')}
                                </div>
                                <div>
                                    <span className="font-semibold">Description: </span>
                                    {entry.description}
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    ))}
                </div>

                {editingEntry && (
                    <CreateEntryDialog
                        open={!!editingEntry}
                        onOpenChange={(open) => !open && setEditingEntry(null)}
                        storyId={currentStoryId}
                        entry={editingEntry}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
} 