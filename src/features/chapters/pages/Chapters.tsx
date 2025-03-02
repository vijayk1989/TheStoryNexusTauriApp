import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChapterCard } from "@/features/chapters/components/ChapterCard";
import { useChapterStore } from "@/features/chapters/stores/useChapterStore";
import { usePromptStore } from "@/features/prompts/store/promptStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { toast } from 'react-toastify';
import { useStoryContext } from "@/features/stories/context/StoryContext";
import { useLorebookStore } from "@/features/lorebook/stores/useLorebookStore";

interface CreateChapterForm {
    title: string;
    povCharacter?: string;
    povType?: 'First Person' | 'Third Person Limited' | 'Third Person Omniscient';
}

export default function Chapters() {
    const { storyId } = useParams();
    const { setCurrentStoryId } = useStoryContext();
    const { chapters, loading, error, fetchChapters, createChapter } = useChapterStore();
    const { fetchPrompts } = usePromptStore();
    const { entries } = useLorebookStore();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const form = useForm<CreateChapterForm>({
        defaultValues: {
            povType: 'Third Person Omniscient'
        }
    });

    const povType = form.watch('povType');
    const characterEntries = entries.filter(entry => entry.category === 'character');

    useEffect(() => {
        if (storyId) {
            setCurrentStoryId(storyId);
            Promise.all([
                fetchChapters(storyId),
                fetchPrompts()
            ]).catch(console.error);
        }
    }, [storyId, fetchChapters, setCurrentStoryId, fetchPrompts]);

    // Reset POV character when switching to omniscient
    useEffect(() => {
        if (povType === 'Third Person Omniscient') {
            form.setValue('povCharacter', undefined);
        }
    }, [povType, form]);

    const handleCreateChapter = async (data: CreateChapterForm) => {
        if (!storyId) return;

        try {
            const nextOrder = chapters.length === 0
                ? 1
                : Math.max(...chapters.map(chapter => chapter.order ?? 0)) + 1;

            // Only include povCharacter if not omniscient
            const povCharacter = data.povType !== 'Third Person Omniscient' ? data.povCharacter : undefined;

            await createChapter({
                storyId,
                title: data.title,
                content: '',
                povCharacter,
                povType: data.povType,
                order: nextOrder,
                outline: { content: '', lastUpdated: new Date() }
            });
            setIsCreateDialogOpen(false);
            form.reset({
                title: '',
                povType: 'Third Person Omniscient',
                povCharacter: undefined
            });
            toast.success('Chapter created successfully');
        } catch (error) {
            console.error('Failed to create chapter:', error);
            toast.error('Failed to create chapter');
        }
    };

    if (!storyId) return null;

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground">Loading chapters...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full flex items-center justify-center">
                <p className="text-destructive">{error}</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-4xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">Chapters</h1>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            New Chapter
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <form onSubmit={form.handleSubmit(handleCreateChapter)}>
                            <DialogHeader>
                                <DialogTitle>Create New Chapter</DialogTitle>
                                <DialogDescription>
                                    Add a new chapter to your story. You can edit the content after creating it.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="title">Title</Label>
                                    <Input
                                        id="title"
                                        placeholder="Enter chapter title"
                                        {...form.register("title", { required: true })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="povType">POV Type</Label>
                                    <Select
                                        defaultValue="Third Person Omniscient"
                                        onValueChange={(value) => form.setValue("povType", value as any)}
                                    >
                                        <SelectTrigger id="povType">
                                            <SelectValue placeholder="Select POV type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="First Person">First Person</SelectItem>
                                            <SelectItem value="Third Person Limited">Third Person Limited</SelectItem>
                                            <SelectItem value="Third Person Omniscient">Third Person Omniscient</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {povType && povType !== 'Third Person Omniscient' && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="povCharacter">POV Character</Label>
                                        <Select
                                            onValueChange={(value) => form.setValue("povCharacter", value)}
                                        >
                                            <SelectTrigger id="povCharacter">
                                                <SelectValue placeholder="Select character" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {characterEntries.length === 0 ? (
                                                    <SelectItem value="" disabled>
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
                                <Button type="submit">Create Chapter</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <ScrollArea className="h-[calc(100vh-10rem)]">
                {chapters.length === 0 ? (
                    <div className="h-[200px] flex flex-col items-center justify-center text-center p-6">
                        <p className="text-muted-foreground mb-4">
                            No chapters yet. Start writing your story by creating a new chapter.
                        </p>
                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create First Chapter
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {chapters
                            .sort((a, b) => a.order - b.order)
                            .map((chapter) => (
                                <ChapterCard
                                    key={chapter.id}
                                    chapter={chapter}
                                    storyId={storyId}
                                />
                            ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
} 