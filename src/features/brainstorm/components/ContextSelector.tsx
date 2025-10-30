import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { LorebookEntry, Chapter } from '@/types/story';

interface ContextSelectorProps {
    includeFullContext: boolean;
    contextOpen: boolean;
    selectedSummaries: string[];
    selectedItems: LorebookEntry[];
    selectedChapterContent: string[];
    chapters: Chapter[];
    lorebookEntries: LorebookEntry[];
    onToggleFullContext: () => void;
    onToggleContextOpen: () => void;
    onToggleSummary: (chapterId: string) => void;
    onItemSelect: (itemId: string) => void;
    onRemoveItem: (itemId: string) => void;
    onChapterContentSelect: (chapterId: string) => void;
    onRemoveChapterContent: (chapterId: string) => void;
    getFilteredEntries: () => LorebookEntry[];
}

export function ContextSelector({
    includeFullContext,
    contextOpen,
    selectedSummaries,
    selectedItems,
    selectedChapterContent,
    chapters,
    lorebookEntries: _lorebookEntries,
    onToggleFullContext,
    onToggleContextOpen,
    onToggleSummary,
    onItemSelect,
    onRemoveItem,
    onChapterContentSelect,
    onRemoveChapterContent,
    getFilteredEntries
}: ContextSelectorProps) {
    const anyContextSelected = selectedSummaries.length > 0 || selectedItems.length > 0;

    return (
        <Collapsible open={contextOpen} onOpenChange={onToggleContextOpen}>
            <div className="flex items-center justify-between rounded-lg border border-border p-4 mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Story Context</span>
                    {anyContextSelected && (
                        <Badge variant="secondary">
                            {selectedSummaries.length + selectedItems.length} items
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                            {contextOpen ? (
                                <ChevronUp className="h-4 w-4" />
                            ) : (
                                <ChevronDown className="h-4 w-4" />
                            )}
                        </Button>
                    </CollapsibleTrigger>
                </div>
            </div>

            <CollapsibleContent>
                <div className="space-y-4 mb-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Include Full Context</span>
                        <Switch
                            checked={includeFullContext}
                            onCheckedChange={onToggleFullContext}
                        />
                    </div>

                    {!includeFullContext && (
                        <>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Chapter Summaries</span>
                                </div>
                                <div className="space-y-2">
                                    {chapters.map((chapter) => (
                                        <div
                                            key={chapter.id}
                                            className="flex items-center justify-between"
                                        >
                                            <span className="text-sm">
                                                Chapter {chapter.order}: {chapter.title}
                                            </span>
                                            <Switch
                                                checked={selectedSummaries.includes(chapter.id)}
                                                onCheckedChange={() => onToggleSummary(chapter.id)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Chapter Content</span>
                                    <Select onValueChange={onChapterContentSelect}>
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue placeholder="Add chapter..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {chapters
                                                .filter(
                                                    (ch) => !selectedChapterContent.includes(ch.id)
                                                )
                                                .map((chapter) => (
                                                    <SelectItem key={chapter.id} value={chapter.id}>
                                                        Chapter {chapter.order}: {chapter.title}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedChapterContent.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedChapterContent.map((chapterId) => {
                                            const chapter = chapters.find(
                                                (ch) => ch.id === chapterId
                                            );
                                            return (
                                                <Badge key={chapterId} variant="secondary">
                                                    Chapter {chapter?.order}: {chapter?.title}
                                                    <button
                                                        className="ml-2"
                                                        onClick={() =>
                                                            onRemoveChapterContent(chapterId)
                                                        }
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Lorebook Entries</span>
                                    <Select onValueChange={onItemSelect}>
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue placeholder="Add entry..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {getFilteredEntries()
                                                .filter(
                                                    (entry) =>
                                                        !selectedItems.some((i) => i.id === entry.id)
                                                )
                                                .map((entry) => (
                                                    <SelectItem key={entry.id} value={entry.id}>
                                                        {entry.category}: {entry.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedItems.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedItems.map((item) => (
                                            <Badge key={item.id} variant="secondary">
                                                {item.category}: {item.name}
                                                <button
                                                    className="ml-2"
                                                    onClick={() => onRemoveItem(item.id)}
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
