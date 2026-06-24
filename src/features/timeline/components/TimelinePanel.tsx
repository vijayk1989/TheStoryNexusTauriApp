import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronRight, Edit, Plus, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useChapterStore } from "@/features/chapters/stores/useChapterStore";
import { useLorebookStore } from "@/features/lorebook/stores/useLorebookStore";
import { useStoryContext } from "@/features/stories/context/StoryContext";
import { useTimelineStore } from "@/features/timeline/stores/useTimelineStore";
import type { Chapter, TimelineEvent } from "@/types/story";

type TimelineFormState = {
    title: string;
    summary: string;
    chapterId: string;
    participantIds: string[];
    unresolvedParticipants: string;
    relatedLorebookEntryIds: string[];
    locationId: string;
    timeLabel: string;
    isDisabled: boolean;
};

const noChapterValue = "__none__";

function emptyForm(chapterId?: string | null): TimelineFormState {
    return {
        title: "",
        summary: "",
        chapterId: chapterId || noChapterValue,
        participantIds: [],
        unresolvedParticipants: "",
        relatedLorebookEntryIds: [],
        locationId: noChapterValue,
        timeLabel: "",
        isDisabled: false,
    };
}

export function TimelinePanel() {
    const { currentStoryId, currentChapterId, setCurrentChapterId } = useStoryContext();
    const { chapters, fetchChapters, getChapter } = useChapterStore();
    const { entries, loadEntries } = useLorebookStore();
    const {
        events,
        isLoading,
        loadEvents,
        createEvent,
        updateEvent,
        deleteEvent,
        reorderEvent,
    } = useTimelineStore();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
    const [form, setForm] = useState<TimelineFormState>(() => emptyForm(currentChapterId));
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!currentStoryId) return;
        loadEvents(currentStoryId).catch((error) => toast.error(error instanceof Error ? error.message : "Failed to load timeline"));
        fetchChapters(currentStoryId);
        loadEntries(currentStoryId);
    }, [currentStoryId, fetchChapters, loadEntries, loadEvents]);

    const storyEvents = useMemo(
        () => events.filter((event) => event.storyId === currentStoryId),
        [events, currentStoryId]
    );
    const storyEntries = useMemo(
        () => entries.filter((entry) => entry.storyId === currentStoryId && !entry.isDisabled),
        [entries, currentStoryId]
    );
    const characters = useMemo(
        () => storyEntries.filter((entry) => entry.category === "character"),
        [storyEntries]
    );
    const locations = useMemo(
        () => storyEntries.filter((entry) => entry.category === "location"),
        [storyEntries]
    );
    const entriesById = useMemo(
        () => new Map(storyEntries.map((entry) => [entry.id, entry])),
        [storyEntries]
    );
    const chaptersById = useMemo<Map<string, Chapter>>(
        () => new Map(chapters.map((chapter) => [chapter.id, chapter])),
        [chapters]
    );

    const groupedEvents = useMemo(() => {
        const groups = new Map<string, TimelineEvent[]>();
        for (const event of storyEvents) {
            const key = event.chapterId || noChapterValue;
            groups.set(key, [...(groups.get(key) || []), event]);
        }
        return Array.from(groups.entries()).sort(([leftId, leftEvents], [rightId, rightEvents]) => {
            const leftOrder = chaptersById.get(leftId)?.order ?? leftEvents[0]?.chapterOrder ?? Number.MAX_SAFE_INTEGER;
            const rightOrder = chaptersById.get(rightId)?.order ?? rightEvents[0]?.chapterOrder ?? Number.MAX_SAFE_INTEGER;
            return leftOrder - rightOrder;
        });
    }, [chaptersById, storyEvents]);

    const openCreateDialog = () => {
        setEditingEvent(null);
        setForm(emptyForm(currentChapterId));
        setDialogOpen(true);
    };

    const openEditDialog = (event: TimelineEvent) => {
        setEditingEvent(event);
        setForm({
            title: event.title,
            summary: event.summary,
            chapterId: event.chapterId || noChapterValue,
            participantIds: event.participantIds || [],
            unresolvedParticipants: (event.unresolvedParticipants || []).join(", "),
            relatedLorebookEntryIds: event.relatedLorebookEntryIds || [],
            locationId: event.locationId || noChapterValue,
            timeLabel: event.timeLabel || "",
            isDisabled: Boolean(event.isDisabled),
        });
        setDialogOpen(true);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!currentStoryId || !form.title.trim() || !form.summary.trim()) return;

        const chapterId = form.chapterId === noChapterValue ? undefined : form.chapterId;
        const chapter = chapterId ? chaptersById.get(chapterId) : undefined;
        const unresolvedParticipants = parseCommaList(form.unresolvedParticipants);
        const relatedLorebookEntryIds = Array.from(new Set([...form.relatedLorebookEntryIds, ...form.participantIds]));

        try {
            if (editingEvent) {
                await updateEvent(editingEvent.id, {
                    title: form.title.trim(),
                    summary: form.summary.trim(),
                    chapterId,
                    chapterOrder: chapter?.order,
                    participantIds: form.participantIds,
                    unresolvedParticipants,
                    relatedLorebookEntryIds,
                    locationId: form.locationId === noChapterValue ? undefined : form.locationId,
                    timeLabel: form.timeLabel.trim() || undefined,
                    isDisabled: form.isDisabled,
                });
                toast.success("Timeline event updated");
            } else {
                await createEvent({
                    storyId: currentStoryId,
                    chapterId,
                    chapterOrder: chapter?.order,
                    eventOrder: 0,
                    title: form.title.trim(),
                    summary: form.summary.trim(),
                    participantIds: form.participantIds,
                    unresolvedParticipants,
                    relatedLorebookEntryIds,
                    locationId: form.locationId === noChapterValue ? undefined : form.locationId,
                    timeLabel: form.timeLabel.trim() || undefined,
                    source: "manual",
                    isDisabled: form.isDisabled,
                });
                toast.success("Timeline event created");
            }
            setDialogOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to save timeline event");
        }
    };

    const handleDelete = async (event: TimelineEvent) => {
        if (!window.confirm(`Delete "${event.title}"?`)) return;
        await deleteEvent(event.id);
        toast.success("Timeline event deleted");
    };

    const handleJumpToChapter = async (chapterId?: string) => {
        if (!chapterId) return;
        setCurrentChapterId(chapterId);
        await getChapter(chapterId);
    };

    return (
        <div className="flex h-full flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">{storyEvents.length} event{storyEvents.length === 1 ? "" : "s"}</span>
                <Button size="sm" onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Event
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                </div>
            ) : storyEvents.length === 0 ? (
                <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No timeline events yet.
                </div>
            ) : (
                <ScrollArea className="min-h-0 flex-1 pr-3">
                    <div className="space-y-5">
                        {groupedEvents.map(([chapterId, chapterEvents]) => {
                            const chapter = chaptersById.get(chapterId);
                            const chapterLabel = chapter ? `Chapter ${chapter.order}: ${chapter.title}` : "Unassigned";
                            const isOpen = openGroups[chapterId] ?? false;
                            return (
                                <Collapsible
                                    key={chapterId}
                                    open={isOpen}
                                    onOpenChange={(open) => setOpenGroups((state) => ({ ...state, [chapterId]: open }))}
                                    className="rounded-md border bg-card"
                                >
                                    <div className="flex items-center justify-between gap-2 px-3 py-2">
                                        <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 text-left">
                                            <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                                            <span className="truncate text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                                {chapterLabel}
                                            </span>
                                            <Badge variant="outline" className="shrink-0">
                                                {chapterEvents.length}
                                            </Badge>
                                        </CollapsibleTrigger>
                                        {chapter && (
                                            <Button variant="ghost" size="sm" onClick={() => handleJumpToChapter(chapter.id)}>
                                                Open
                                            </Button>
                                        )}
                                    </div>
                                    <CollapsibleContent className="space-y-2 border-t p-3 pt-2">
                                        {chapterEvents.map((event) => (
                                            <TimelineEventCard
                                                key={event.id}
                                                event={event}
                                                participantNames={event.participantIds.map((id) => entriesById.get(id)?.name).filter(Boolean) as string[]}
                                                locationName={event.locationId ? entriesById.get(event.locationId)?.name : undefined}
                                                onEdit={() => openEditDialog(event)}
                                                onDelete={() => handleDelete(event)}
                                                onMoveUp={() => reorderEvent(event.id, "up")}
                                                onMoveDown={() => reorderEvent(event.id, "down")}
                                                onToggleDisabled={() => updateEvent(event.id, { isDisabled: !event.isDisabled })}
                                            />
                                        ))}
                                    </CollapsibleContent>
                                </Collapsible>
                            );
                        })}
                    </div>
                </ScrollArea>
            )}

            <TimelineEventDialog
                open={dialogOpen}
                form={form}
                editingEvent={editingEvent}
                chapters={chapters}
                characters={characters}
                locations={locations}
                onOpenChange={setDialogOpen}
                onFormChange={setForm}
                onSubmit={handleSubmit}
            />
        </div>
    );
}

function TimelineEventCard({
    event,
    participantNames,
    locationName,
    onEdit,
    onDelete,
    onMoveUp,
    onMoveDown,
    onToggleDisabled,
}: {
    event: TimelineEvent;
    participantNames: string[];
    locationName?: string;
    onEdit: () => void;
    onDelete: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onToggleDisabled: () => void;
}) {
    return (
        <Card className={event.isDisabled ? "opacity-60" : ""}>
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <CardTitle className="text-base">{event.eventOrder}. {event.title}</CardTitle>
                        <div className="mt-2 flex flex-wrap gap-1">
                            <Badge variant={event.source === "extracted" ? "secondary" : "outline"}>{event.source}</Badge>
                            {event.timeLabel && <Badge variant="outline">{event.timeLabel}</Badge>}
                            {locationName && <Badge variant="outline">{locationName}</Badge>}
                            {event.isDisabled && <Badge variant="outline">Disabled</Badge>}
                        </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveUp} title="Move up">
                            <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveDown} title="Move down">
                            <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Edit event">
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete} title="Delete event">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{event.summary}</p>
                {(participantNames.length > 0 || event.unresolvedParticipants?.length) && (
                    <div className="flex flex-wrap gap-1">
                        {participantNames.map((name) => (
                            <Badge key={name} variant="secondary">{name}</Badge>
                        ))}
                        {(event.unresolvedParticipants || []).map((name) => (
                            <Badge key={name} variant="outline">{name}</Badge>
                        ))}
                    </div>
                )}
                <Button variant="outline" size="sm" onClick={onToggleDisabled}>
                    {event.isDisabled ? "Enable" : "Disable"}
                </Button>
            </CardContent>
        </Card>
    );
}

function TimelineEventDialog({
    open,
    form,
    editingEvent,
    chapters,
    characters,
    locations,
    onOpenChange,
    onFormChange,
    onSubmit,
}: {
    open: boolean;
    form: TimelineFormState;
    editingEvent: TimelineEvent | null;
    chapters: Array<{ id: string; order: number; title: string }>;
    characters: Array<{ id: string; name: string }>;
    locations: Array<{ id: string; name: string }>;
    onOpenChange: (open: boolean) => void;
    onFormChange: (form: TimelineFormState) => void;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
    const toggleParticipant = (id: string, checked: boolean) => {
        onFormChange({
            ...form,
            participantIds: checked
                ? [...form.participantIds, id]
                : form.participantIds.filter((participantId) => participantId !== id),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
                <form onSubmit={onSubmit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>{editingEvent ? "Edit Timeline Event" : "New Timeline Event"}</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-2">
                        <Label>Title</Label>
                        <Input
                            value={form.title}
                            onChange={(event) => onFormChange({ ...form, title: event.target.value })}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>Chapter</Label>
                        <Select value={form.chapterId} onValueChange={(value) => onFormChange({ ...form, chapterId: value })}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={noChapterValue}>Unassigned</SelectItem>
                                {chapters.map((chapter) => (
                                    <SelectItem key={chapter.id} value={chapter.id}>
                                        {chapter.order}. {chapter.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>Summary</Label>
                        <Textarea
                            value={form.summary}
                            onChange={(event) => onFormChange({ ...form, summary: event.target.value })}
                            rows={5}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label>Time Label</Label>
                            <Input
                                value={form.timeLabel}
                                onChange={(event) => onFormChange({ ...form, timeLabel: event.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Location</Label>
                            <Select value={form.locationId} onValueChange={(value) => onFormChange({ ...form, locationId: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={noChapterValue}>None</SelectItem>
                                    {locations.map((location) => (
                                        <SelectItem key={location.id} value={location.id}>
                                            {location.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Participants</Label>
                        <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                            {characters.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No character entries available.</p>
                            ) : (
                                characters.map((character) => (
                                    <label key={character.id} className="flex items-center gap-2 text-sm">
                                        <Checkbox
                                            checked={form.participantIds.includes(character.id)}
                                            onCheckedChange={(checked) => toggleParticipant(character.id, Boolean(checked))}
                                        />
                                        {character.name}
                                    </label>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Unresolved Participants</Label>
                        <Input
                            value={form.unresolvedParticipants}
                            onChange={(event) => onFormChange({ ...form, unresolvedParticipants: event.target.value })}
                        />
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={form.isDisabled}
                            onCheckedChange={(checked) => onFormChange({ ...form, isDisabled: Boolean(checked) })}
                        />
                        Disable this event
                    </label>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">{editingEvent ? "Update" : "Create"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function parseCommaList(value: string): string[] {
    const seen = new Set<string>();
    return value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => {
            const key = item.toLowerCase();
            if (!item || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}
