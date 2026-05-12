import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    BookOpen,
    ChevronDown,
    Edit,
    FilePlus,
    GripVertical,
    Import,
    Menu,
    MoreHorizontal,
    Plus,
    ScrollText,
    Trash2,
    Upload,
} from "lucide-react";
import {
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AIGenerateMenu } from "@/components/ui/ai-generate-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { CreateStoryDialog } from "@/features/stories/components/CreateStoryDialog";
import { EditStoryDialog } from "@/features/stories/components/EditStoryDialog";
import { useStoryContext } from "@/features/stories/context/StoryContext";
import { useStoryStore } from "@/features/stories/stores/useStoryStore";
import { useChapterStore } from "@/features/chapters/stores/useChapterStore";
import { useAIStore } from "@/features/ai/stores/useAIStore";
import { usePromptStore } from "@/features/prompts/store/promptStore";
import { useLorebookStore } from "@/features/lorebook/stores/useLorebookStore";
import { StoryEditor } from "@/features/chapters/components/StoryEditor";
import { db } from "@/services/database";
import { storyExportService } from "@/services/storyExportService";
import type { AllowedModel, Chapter, Prompt, PromptParserConfig, Story } from "@/types/story";
import { cn } from "@/lib/utils";
import {
    readLastEditorTarget,
    saveLastEditorTarget,
} from "@/features/editor/utils/lastEditorTarget";

type ChapterForm = {
    title: string;
    povType: "First Person" | "Third Person Limited" | "Third Person Omniscient";
    povCharacter?: string;
};

const emptyChapterForm: ChapterForm = {
    title: "",
    povType: "Third Person Omniscient",
    povCharacter: undefined,
};

export default function EditorWorkspace() {
    const [isReady, setIsReady] = useState(false);
    const [leftSheetOpen, setLeftSheetOpen] = useState(false);
    const [createChapterOpen, setCreateChapterOpen] = useState(false);
    const [editingStory, setEditingStory] = useState<Story | null>(null);
    const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
    const [chapterForm, setChapterForm] = useState<ChapterForm>(emptyChapterForm);
    const [summaryChapter, setSummaryChapter] = useState<Chapter | null>(null);
    const [summaryText, setSummaryText] = useState("");
    const [summaryBeforeGeneration, setSummaryBeforeGeneration] = useState("");
    const [hasGeneratedSummary, setHasGeneratedSummary] = useState(false);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { stories, fetchStories, getStory, currentStory, deleteStory } = useStoryStore();
    const {
        chapters,
        currentChapter,
        fetchChapters,
        getChapter,
        createChapter,
        updateChapter,
        updateChapterSummary,
        deleteChapter,
        updateChapterOrders,
        getChapterPlainText,
        setCurrentChapter,
        getLastEditedChapterId,
        setLastEditedChapterId,
    } = useChapterStore();
    const { currentStoryId, currentChapterId, setCurrentStoryId, setCurrentChapterId } = useStoryContext();
    const { loadEntries, buildTagMap, entries } = useLorebookStore();
    const { generateWithPrompt, processStreamedResponse } = useAIStore();
    const { prompts, isLoading: promptsLoading, error: promptsError } = usePromptStore();

    const currentStoryEntries = useMemo(
        () => entries.filter((entry) => entry.storyId === currentStoryId),
        [entries, currentStoryId]
    );

    const characterEntries = useMemo(
        () => currentStoryEntries.filter((entry) => entry.category === "character"),
        [currentStoryEntries]
    );

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const activateStory = useCallback(async (storyId: string, preferredChapterId?: string | null) => {
        setCurrentStoryId(storyId);
        await Promise.all([
            getStory(storyId),
            fetchChapters(storyId),
            loadEntries(storyId).then(() => buildTagMap()),
        ]);

        const storyChapters = await db.chapters
            .where("storyId")
            .equals(storyId)
            .sortBy("order");

        let nextChapterId = preferredChapterId || getLastEditedChapterId(storyId);
        if (nextChapterId && !storyChapters.some((chapter) => chapter.id === nextChapterId)) {
            nextChapterId = null;
        }
        nextChapterId = nextChapterId || storyChapters[0]?.id || null;

        if (nextChapterId) {
            setCurrentChapterId(nextChapterId);
            await getChapter(nextChapterId);
            setLastEditedChapterId(storyId, nextChapterId);
            saveLastEditorTarget({ storyId, chapterId: nextChapterId });
        } else {
            setCurrentChapterId(null);
            setCurrentChapter(null);
        }
    }, [
        buildTagMap,
        fetchChapters,
        getChapter,
        getLastEditedChapterId,
        getStory,
        loadEntries,
        setCurrentChapter,
        setCurrentChapterId,
        setCurrentStoryId,
        setLastEditedChapterId,
    ]);

    useEffect(() => {
        let cancelled = false;

        const initialize = async () => {
            await fetchStories();
            const allStories = await db.stories.toArray();
            if (cancelled) return;

            if (allStories.length === 0) {
                setCurrentStoryId(null);
                setCurrentChapterId(null);
                setCurrentChapter(null);
                setIsReady(true);
                return;
            }

            const lastTarget = readLastEditorTarget();
            if (lastTarget) {
                const [story, chapter] = await Promise.all([
                    db.stories.get(lastTarget.storyId),
                    db.chapters.get(lastTarget.chapterId),
                ]);
                if (!cancelled && story && chapter && chapter.storyId === story.id) {
                    await activateStory(story.id, chapter.id);
                    if (!cancelled) setIsReady(true);
                    return;
                }
            }

            const firstStory = allStories.sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            )[0];
            await activateStory(firstStory.id);
            if (!cancelled) setIsReady(true);
        };

        initialize().catch((error) => {
            console.error("Failed to initialize editor workspace:", error);
            toast.error("Failed to open editor workspace");
            setIsReady(true);
        });

        return () => {
            cancelled = true;
        };
    }, [activateStory, fetchStories, setCurrentChapter, setCurrentChapterId, setCurrentStoryId]);

    const handleStorySelect = async (storyId: string) => {
        await activateStory(storyId);
        setLeftSheetOpen(false);
    };

    const handleCreatedStory = async (storyId: string) => {
        await fetchStories();
        await activateStory(storyId, null);
    };

    const handleImportStory = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files?.length) return;
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                const storyId = await storyExportService.importStory(content);
                await fetchStories();
                await activateStory(storyId);
            } catch (error) {
                console.error("Import failed:", error);
            }
        };
        reader.readAsText(file);
        event.target.value = "";
    };

    const handleDeleteStory = async () => {
        if (!currentStoryId || !currentStory) return;
        if (!window.confirm(`Delete "${currentStory.title}" and its related data?`)) return;

        await deleteStory(currentStoryId);
        await fetchStories();
        const remainingStories = await db.stories.toArray();
        if (remainingStories.length > 0) {
            await activateStory(remainingStories[0].id);
        } else {
            setCurrentStoryId(null);
            setCurrentChapterId(null);
            setCurrentChapter(null);
        }
    };

    const openCreateChapter = () => {
        setChapterForm(emptyChapterForm);
        setCreateChapterOpen(true);
    };

    const openEditChapter = (chapter: Chapter) => {
        setEditingChapter(chapter);
        setChapterForm({
            title: chapter.title,
            povType: chapter.povType || "Third Person Omniscient",
            povCharacter: chapter.povCharacter,
        });
    };

    const openSummaryChapter = (chapter: Chapter) => {
        setSummaryChapter(chapter);
        setSummaryText(chapter.summary || "");
        setSummaryBeforeGeneration(chapter.summary || "");
        setHasGeneratedSummary(false);
    };

    const handleCreateChapter = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!currentStoryId || !chapterForm.title.trim()) return;

        const povCharacter = chapterForm.povType !== "Third Person Omniscient"
            ? chapterForm.povCharacter
            : undefined;
        const chapterId = await createChapter({
            storyId: currentStoryId,
            title: chapterForm.title.trim(),
            content: "",
            povType: chapterForm.povType,
            povCharacter,
            order: chapters.length + 1,
            outline: { content: "", lastUpdated: new Date() },
        });
        await fetchChapters(currentStoryId);
        await activateStory(currentStoryId, chapterId);
        setCreateChapterOpen(false);
        setChapterForm(emptyChapterForm);
        toast.success("Chapter created");
    };

    const handleUpdateChapter = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!editingChapter || !chapterForm.title.trim()) return;

        const povCharacter = chapterForm.povType !== "Third Person Omniscient"
            ? chapterForm.povCharacter
            : undefined;
        await updateChapter(editingChapter.id, {
            title: chapterForm.title.trim(),
            povType: chapterForm.povType,
            povCharacter,
        });
        if (currentStoryId) await fetchChapters(currentStoryId);
        if (currentChapterId === editingChapter.id) await getChapter(editingChapter.id);
        setEditingChapter(null);
        toast.success("Chapter updated");
    };

    const handleUpdateSummary = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!summaryChapter) return;

        await updateChapterSummary(summaryChapter.id, summaryText.trim());
        if (currentChapterId === summaryChapter.id) await getChapter(summaryChapter.id);
        setSummaryChapter(null);
        setSummaryText("");
        setSummaryBeforeGeneration("");
        setHasGeneratedSummary(false);
        toast.success("Chapter summary updated");
    };

    const handleGenerateSummary = async (prompt: Prompt, model: AllowedModel) => {
        if (!summaryChapter || !currentStoryId) return;

        try {
            setIsGeneratingSummary(true);
            setHasGeneratedSummary(false);
            setSummaryBeforeGeneration(summaryChapter.summary || "");
            const plainTextContent = await getChapterPlainText(summaryChapter.id);
            const config: PromptParserConfig = {
                promptId: prompt.id,
                storyId: currentStoryId,
                chapterId: summaryChapter.id,
                additionalContext: {
                    plainTextContent,
                },
            };

            const response = await generateWithPrompt(config, model);
            if (!response.ok) {
                const errorText = await response.text().catch(() => "");
                throw new Error(
                    `AI request failed with ${response.status} ${response.statusText}${errorText ? `: ${errorText}` : ""}`
                );
            }

            let text = "";

            await new Promise<void>((resolve, reject) => {
                processStreamedResponse(
                    response,
                    (token) => {
                        text += token;
                        setSummaryText(text);
                    },
                    resolve,
                    reject
                );
            });

            if (!text.trim()) {
                throw new Error("The model returned an empty summary.");
            }

            setHasGeneratedSummary(true);
            toast.success("Summary generated. Accept or reject it.");
        } catch (error) {
            console.error("Failed to generate summary:", error);
            toast.error(error instanceof Error ? error.message : "Failed to generate summary");
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    const handleAcceptGeneratedSummary = async () => {
        if (!summaryChapter) return;

        await updateChapterSummary(summaryChapter.id, summaryText.trim());
        if (currentChapterId === summaryChapter.id) await getChapter(summaryChapter.id);
        setSummaryBeforeGeneration(summaryText);
        setHasGeneratedSummary(false);
        toast.success("Generated summary accepted");
    };

    const handleRejectGeneratedSummary = () => {
        setSummaryText(summaryBeforeGeneration);
        setHasGeneratedSummary(false);
        toast.info("Generated summary rejected");
    };

    const handleDeleteChapter = async (chapter: Chapter) => {
        if (!window.confirm(`Delete Chapter ${chapter.order}: ${chapter.title}?`)) return;

        await deleteChapter(chapter.id);
        const remaining = await db.chapters
            .where("storyId")
            .equals(chapter.storyId)
            .sortBy("order");
        await fetchChapters(chapter.storyId);

        if (currentChapterId === chapter.id) {
            await activateStory(chapter.storyId, remaining[0]?.id || null);
        }
    };

    const handleChapterSelect = async (chapter: Chapter) => {
        setCurrentStoryId(chapter.storyId);
        setCurrentChapterId(chapter.id);
        await getChapter(chapter.id);
        setLastEditedChapterId(chapter.storyId, chapter.id);
        saveLastEditorTarget({ storyId: chapter.storyId, chapterId: chapter.id });
        setLeftSheetOpen(false);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id || !currentStoryId) return;

        const oldIndex = chapters.findIndex((chapter) => chapter.id === active.id);
        const newIndex = chapters.findIndex((chapter) => chapter.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove<Chapter>(chapters, oldIndex, newIndex);
        await updateChapterOrders(
            reordered.map((chapter, index) => ({
                id: chapter.id,
                order: index + 1,
            }))
        );
        await fetchChapters(currentStoryId);
    };

    const leftRail = (
        <EditorLeftRail
            stories={stories}
            currentStory={currentStory}
            currentStoryId={currentStoryId}
            chapters={chapters}
            currentChapterId={currentChapterId}
            onStorySelect={handleStorySelect}
            onCreatedStory={handleCreatedStory}
            onImportClick={() => fileInputRef.current?.click()}
            onEditStory={() => setEditingStory(currentStory)}
            onExportStory={() => currentStoryId && storyExportService.exportStory(currentStoryId)}
            onDeleteStory={handleDeleteStory}
            onCreateChapter={openCreateChapter}
            onEditChapter={openEditChapter}
            onSummaryChapter={openSummaryChapter}
            onDeleteChapter={handleDeleteChapter}
            onChapterSelect={handleChapterSelect}
            onDragEnd={handleDragEnd}
            sensors={sensors}
        />
    );

    if (!isReady) {
        return (
            <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
                Opening your writing desk...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportStory}
            />

            <div className="hidden min-h-screen md:grid md:grid-cols-[300px_minmax(0,1fr)]">
                {leftRail}
                <main className="min-w-0">
                    {currentStoryId && currentChapterId ? (
                        <StoryEditor />
                    ) : (
                        <EditorEmptyState
                            hasStories={stories.length > 0}
                            onCreateStory={handleCreatedStory}
                            onImportClick={() => fileInputRef.current?.click()}
                            onCreateChapter={openCreateChapter}
                        />
                    )}
                </main>
            </div>

            <div className="flex min-h-screen flex-col md:hidden">
                <div className="sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setLeftSheetOpen(true)}
                        title="Stories and chapters"
                    >
                        <Menu className="h-5 w-5" />
                    </Button>
                    <div className="min-w-0 text-center">
                        <div className="truncate font-heading text-sm font-semibold text-primary">
                            {currentStory?.title || "The Story Nexus"}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                            {currentChapter?.title || "Choose a chapter"}
                        </div>
                    </div>
                    <div className="h-9 w-9" />
                </div>
                <main className="flex-1">
                    {currentStoryId && currentChapterId ? (
                        <StoryEditor />
                    ) : (
                        <EditorEmptyState
                            hasStories={stories.length > 0}
                            onCreateStory={handleCreatedStory}
                            onImportClick={() => fileInputRef.current?.click()}
                            onCreateChapter={openCreateChapter}
                        />
                    )}
                </main>
                <Sheet open={leftSheetOpen} onOpenChange={setLeftSheetOpen}>
                    <SheetContent side="left" className="w-[310px] p-0">
                        <SheetHeader className="sr-only">
                            <SheetTitle>Stories and chapters</SheetTitle>
                        </SheetHeader>
                        {leftRail}
                    </SheetContent>
                </Sheet>
            </div>

            <EditStoryDialog
                story={editingStory}
                open={!!editingStory}
                onOpenChange={(open) => !open && setEditingStory(null)}
            />

            <ChapterDialog
                title="Create Chapter"
                description="Add a chapter to the current story."
                open={createChapterOpen}
                onOpenChange={setCreateChapterOpen}
                form={chapterForm}
                setForm={setChapterForm}
                characterEntries={characterEntries}
                onSubmit={handleCreateChapter}
                submitLabel="Create Chapter"
            />

            <ChapterDialog
                title="Edit Chapter"
                description="Update chapter title and point of view."
                open={!!editingChapter}
                onOpenChange={(open) => !open && setEditingChapter(null)}
                form={chapterForm}
                setForm={setChapterForm}
                characterEntries={characterEntries}
                onSubmit={handleUpdateChapter}
                submitLabel="Save Changes"
            />

            <ChapterSummaryDialog
                chapter={summaryChapter}
                summary={summaryText}
                setSummary={setSummaryText}
                onSubmit={handleUpdateSummary}
                onOpenChange={(open) => {
                    if (!open) {
                        setSummaryChapter(null);
                        setSummaryText("");
                        setSummaryBeforeGeneration("");
                        setHasGeneratedSummary(false);
                        setIsGeneratingSummary(false);
                    }
                }}
                hasGeneratedSummary={hasGeneratedSummary}
                isGenerating={isGeneratingSummary}
                isLoading={promptsLoading}
                error={promptsError}
                prompts={prompts}
                onGenerate={handleGenerateSummary}
                onAcceptGenerated={handleAcceptGeneratedSummary}
                onRejectGenerated={handleRejectGeneratedSummary}
            />
        </div>
    );
}

function EditorLeftRail({
    stories,
    currentStory,
    currentStoryId,
    chapters,
    currentChapterId,
    onStorySelect,
    onCreatedStory,
    onImportClick,
    onEditStory,
    onExportStory,
    onDeleteStory,
    onCreateChapter,
    onEditChapter,
    onSummaryChapter,
    onDeleteChapter,
    onChapterSelect,
    onDragEnd,
    sensors,
}: {
    stories: Story[];
    currentStory: Story | null;
    currentStoryId: string | null;
    chapters: Chapter[];
    currentChapterId: string | null;
    onStorySelect: (storyId: string) => void;
    onCreatedStory: (storyId: string) => void;
    onImportClick: () => void;
    onEditStory: () => void;
    onExportStory: () => void;
    onDeleteStory: () => void;
    onCreateChapter: () => void;
    onEditChapter: (chapter: Chapter) => void;
    onSummaryChapter: (chapter: Chapter) => void;
    onDeleteChapter: (chapter: Chapter) => void;
    onChapterSelect: (chapter: Chapter) => void;
    onDragEnd: (event: DragEndEvent) => void;
    sensors: ReturnType<typeof useSensors>;
}) {
    return (
        <aside className="sticky top-0 flex h-screen min-h-0 flex-col border-r border-border bg-surface">
            <div className="border-b border-border p-4">
                <div className="mb-4 flex items-center gap-2 text-primary">
                    <BookOpen className="h-5 w-5" />
                    <div className="font-heading text-lg font-semibold tracking-wide">
                        The Story Nexus
                    </div>
                </div>

                <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Current Story
                </Label>
                <div className="mt-2 flex gap-2">
                    <Select value={currentStoryId || ""} onValueChange={onStorySelect}>
                        <SelectTrigger className="h-9 min-w-0 flex-1 bg-elevated">
                            <SelectValue placeholder="Choose story" />
                        </SelectTrigger>
                        <SelectContent>
                            {stories.map((story) => (
                                <SelectItem key={story.id} value={story.id}>
                                    {story.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <CreateStoryDialog
                                trigger={
                                    <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        New Story
                                    </DropdownMenuItem>
                                }
                                onCreated={onCreatedStory}
                            />
                            <DropdownMenuItem onClick={onImportClick}>
                                <Import className="mr-2 h-4 w-4" />
                                Import Story
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onEditStory} disabled={!currentStory}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Story
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onExportStory} disabled={!currentStory}>
                                <Upload className="mr-2 h-4 w-4" />
                                Export Story
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={onDeleteStory}
                                disabled={!currentStory}
                                className="text-destructive focus:text-destructive"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Story
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex items-center justify-between px-4 py-3">
                    <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Chapters
                    </Label>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-primary"
                        onClick={onCreateChapter}
                        disabled={!currentStoryId}
                    >
                        <FilePlus className="h-3.5 w-3.5" />
                        New
                    </Button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
                    {chapters.length === 0 ? (
                        <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                            No chapters yet.
                        </div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={onDragEnd}
                        >
                            <SortableContext
                                items={chapters.map((chapter) => chapter.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-1">
                                    {chapters
                                        .slice()
                                        .sort((a, b) => a.order - b.order)
                                        .map((chapter) => (
                                            <ChapterRailItem
                                                key={chapter.id}
                                                chapter={chapter}
                                                active={chapter.id === currentChapterId}
                                                onSelect={() => onChapterSelect(chapter)}
                                                onEdit={() => onEditChapter(chapter)}
                                                onSummary={() => onSummaryChapter(chapter)}
                                                onDelete={() => onDeleteChapter(chapter)}
                                            />
                                        ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </div>
            </div>
        </aside>
    );
}

function ChapterRailItem({
    chapter,
    active,
    onSelect,
    onEdit,
    onSummary,
    onDelete,
}: {
    chapter: Chapter;
    active: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onSummary: () => void;
    onDelete: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: chapter.id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <button
                type="button"
                onClick={onSelect}
                className={cn(
                    "group flex w-full items-start gap-2 rounded-md border px-2 py-2 text-left transition-colors",
                    active
                        ? "border-primary/40 bg-primary/10 text-foreground shadow-glow"
                        : "border-transparent text-muted-foreground hover:border-border hover:bg-elevated hover:text-foreground"
                )}
            >
                <span
                    className="mt-0.5 cursor-grab text-muted-foreground active:cursor-grabbing"
                    {...attributes}
                    {...listeners}
                    onClick={(event) => event.stopPropagation()}
                >
                    <GripVertical className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                        {chapter.order}. {chapter.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {chapter.povCharacter
                            ? `${chapter.povCharacter} - ${chapter.povType}`
                            : chapter.povType || "No POV set"}
                    </span>
                </span>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <span
                            role="button"
                            tabIndex={0}
                            className="rounded p-1 opacity-70 hover:bg-background hover:opacity-100"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <ChevronDown className="h-3.5 w-3.5" />
                        </span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onEdit}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onSummary}>
                            <ScrollText className="mr-2 h-4 w-4" />
                            Summary
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={onDelete}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </button>
        </div>
    );
}

function ChapterDialog({
    title,
    description,
    open,
    onOpenChange,
    form,
    setForm,
    characterEntries,
    onSubmit,
    submitLabel,
}: {
    title: string;
    description: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    form: ChapterForm;
    setForm: (form: ChapterForm) => void;
    characterEntries: Array<{ id: string; name: string }>;
    onSubmit: (event: React.FormEvent) => void;
    submitLabel: string;
}) {
    const showCharacter = form.povType !== "Third Person Omniscient";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={onSubmit}>
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription>{description}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor={`${title}-title`}>Title</Label>
                            <Input
                                id={`${title}-title`}
                                value={form.title}
                                onChange={(event) => setForm({ ...form, title: event.target.value })}
                                placeholder="Chapter title"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>POV Type</Label>
                            <Select
                                value={form.povType}
                                onValueChange={(value: ChapterForm["povType"]) =>
                                    setForm({
                                        ...form,
                                        povType: value,
                                        povCharacter:
                                            value === "Third Person Omniscient"
                                                ? undefined
                                                : form.povCharacter,
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select POV type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="First Person">First Person</SelectItem>
                                    <SelectItem value="Third Person Limited">Third Person Limited</SelectItem>
                                    <SelectItem value="Third Person Omniscient">Third Person Omniscient</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {showCharacter && (
                            <div className="grid gap-2">
                                <Label>POV Character</Label>
                                <Select
                                    value={form.povCharacter}
                                    onValueChange={(value) =>
                                        setForm({ ...form, povCharacter: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select character" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {characterEntries.length === 0 ? (
                                            <SelectItem value="none" disabled>
                                                No characters available
                                            </SelectItem>
                                        ) : (
                                            characterEntries.map((character) => (
                                                <SelectItem key={character.id} value={character.name}>
                                                    {character.name}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="submit">{submitLabel}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function ChapterSummaryDialog({
    chapter,
    summary,
    setSummary,
    onSubmit,
    onOpenChange,
    hasGeneratedSummary,
    isGenerating,
    isLoading,
    error,
    prompts,
    onGenerate,
    onAcceptGenerated,
    onRejectGenerated,
}: {
    chapter: Chapter | null;
    summary: string;
    setSummary: (summary: string) => void;
    onSubmit: (event: React.FormEvent) => void;
    onOpenChange: (open: boolean) => void;
    hasGeneratedSummary: boolean;
    isGenerating: boolean;
    isLoading: boolean;
    error: string | null;
    prompts: Prompt[];
    onGenerate: (prompt: Prompt, model: AllowedModel) => Promise<void>;
    onAcceptGenerated: () => Promise<void>;
    onRejectGenerated: () => void;
}) {
    return (
        <Dialog open={!!chapter} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[640px]">
                <form onSubmit={onSubmit}>
                    <DialogHeader>
                        <DialogTitle>Chapter Summary</DialogTitle>
                        <DialogDescription>
                            {chapter ? `Update the summary for Chapter ${chapter.order}: ${chapter.title}.` : ""}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="chapter-summary">Summary</Label>
                        <Textarea
                            id="chapter-summary"
                            value={summary}
                            onChange={(event) => setSummary(event.target.value)}
                            placeholder="Enter a brief summary of this chapter..."
                            className="mt-2 min-h-[220px] resize-y"
                        />
                    </div>
                    {hasGeneratedSummary && (
                        <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-muted-foreground">
                            A generated summary is ready. Accept it to save, or reject it to restore the previous summary.
                        </div>
                    )}
                    <DialogFooter className="gap-2 sm:justify-between">
                        <AIGenerateMenu
                            isGenerating={isGenerating}
                            isLoading={isLoading}
                            error={error}
                            prompts={prompts}
                            promptType="gen_summary"
                            buttonText="Generate Summary"
                            onGenerate={onGenerate}
                        />
                        <div className="flex flex-wrap justify-end gap-2">
                            {hasGeneratedSummary && (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={isGenerating}
                                        onClick={onRejectGenerated}
                                    >
                                        Reject
                                    </Button>
                                    <Button
                                        type="button"
                                        disabled={isGenerating}
                                        onClick={onAcceptGenerated}
                                    >
                                        Accept
                                    </Button>
                                </>
                            )}
                            <Button type="submit" disabled={isGenerating}>Save Summary</Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function EditorEmptyState({
    hasStories,
    onCreateStory,
    onImportClick,
    onCreateChapter,
}: {
    hasStories: boolean;
    onCreateStory: (storyId: string) => void;
    onImportClick: () => void;
    onCreateChapter: () => void;
}) {
    return (
        <div className="flex h-full items-center justify-center p-8">
            <div className="max-w-md text-center">
                <div className="font-heading text-3xl font-semibold text-primary">
                    {hasStories ? "Choose or create a chapter" : "Begin a new story"}
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {hasStories
                        ? "Your story is ready. Add a chapter to open the writing surface."
                        : "Create a story or import an existing export to open the editor-first workspace."}
                </p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                    {hasStories ? (
                        <Button onClick={onCreateChapter}>
                            <FilePlus className="mr-2 h-4 w-4" />
                            New Chapter
                        </Button>
                    ) : (
                        <>
                            <CreateStoryDialog
                                trigger={
                                    <Button>
                                        <Plus className="mr-2 h-4 w-4" />
                                        New Story
                                    </Button>
                                }
                                onCreated={onCreateStory}
                            />
                            <Button variant="outline" onClick={onImportClick}>
                                <Import className="mr-2 h-4 w-4" />
                                Import Story
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
