import { useState, useEffect, useMemo } from "react";
import { Button } from "../../../components/ui/button";
import { Pencil, Trash2, PenLine, ChevronUp, ChevronDown } from "lucide-react";
import { useChapterStore } from "../stores/useChapterStore";
import type { AllowedModel, Chapter, Prompt } from "../../../types/story";
import { useNavigate } from "react-router";
import { Textarea } from "../../../components/ui/textarea";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../../../components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../../components/ui/select";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardFooter } from "../../../components/ui/card";
import { Bounce, toast } from 'react-toastify';
import { useStoryContext } from '@/features/stories/context/StoryContext';
import { useAIStore } from '@/features/ai/stores/useAIStore';
import { usePromptStore } from '@/features/prompts/store/promptStore';
import { PromptParserConfig } from '@/types/story';
import { AIGenerateMenu } from "@/components/ui/ai-generate-menu";
import { useLorebookStore } from '@/features/lorebook/stores/useLorebookStore';
import { DownloadMenu } from "@/components/ui/DownloadMenu";

interface ChapterCardProps {
    chapter: Chapter;
    storyId: string;
}

interface EditChapterForm {
    title: string;
    povCharacter?: string;
    povType?: 'First Person' | 'Third Person Limited' | 'Third Person Omniscient';
}

export function ChapterCard({ chapter, storyId }: ChapterCardProps) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const expandedStateKey = `chapter-${chapter.id}-expanded`;
    const [isExpanded, setIsExpanded] = useState(() => {
        const stored = localStorage.getItem(expandedStateKey);
        return stored ? JSON.parse(stored) : false;
    });
    const [summary, setSummary] = useState(chapter.summary || '');
    const deleteChapter = useChapterStore(state => state.deleteChapter);
    const updateChapter = useChapterStore(state => state.updateChapter);
    const updateChapterSummaryOptimistic = useChapterStore(state => state.updateChapterSummaryOptimistic);
    const form = useForm<EditChapterForm>({
        defaultValues: {
            title: chapter.title,
            povCharacter: chapter.povCharacter,
            povType: chapter.povType || 'Third Person Omniscient',
        },
    });
    const povType = form.watch('povType');
    const { setCurrentChapterId } = useStoryContext();
    const navigate = useNavigate();
    const { generateWithPrompt, processStreamedResponse } = useAIStore();
    const { prompts, isLoading, error } = usePromptStore();
    const [isGenerating, setIsGenerating] = useState(false);
    const getChapterPlainText = useChapterStore(state => state.getChapterPlainText);
    const { entries } = useLorebookStore();
    const characterEntries = useMemo(() => {
        return entries.filter(entry => entry.category === 'character');
    }, [entries]);

    useEffect(() => {
        localStorage.setItem(expandedStateKey, JSON.stringify(isExpanded));
    }, [isExpanded, expandedStateKey]);

    // Reset POV character when switching to omniscient
    useEffect(() => {
        if (povType === 'Third Person Omniscient') {
            form.setValue('povCharacter', undefined);
        }
    }, [povType, form]);

    const handleDelete = async () => {
        try {
            await deleteChapter(chapter.id);
            setShowDeleteDialog(false);
            toast.success(`Chapter ${chapter.order}: ${chapter.title} deleted`);
        } catch (error) {
            console.error('Failed to delete chapter:', error);
            toast.error('Failed to delete chapter');
        }
    };

    const handleEdit = async (data: EditChapterForm) => {
        try {
            // Only include povCharacter if not omniscient
            const povCharacter = data.povType !== 'Third Person Omniscient' ? data.povCharacter : undefined;

            await updateChapter(chapter.id, {
                ...data,
                povCharacter
            });
            setShowEditDialog(false);
            toast.success('Chapter updated successfully', {
                position: "bottom-center",
                autoClose: 1000,
                closeOnClick: true,
            });
        } catch (error) {
            console.error('Failed to update chapter:', error);
            toast.error('Failed to update chapter');
        }
    };

    const handleSaveSummary = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (summary !== chapter.summary) {
            try {
                await updateChapterSummaryOptimistic(chapter.id, summary);
                toast.success('Summary saved successfully', {
                    position: "bottom-center",
                    autoClose: 1000,
                    closeOnClick: true,
                });
            } catch (error) {
                console.error('Failed to save summary:', error);
                toast.error('Failed to save summary');
            }
        }
    };

    const handleGenerateSummary = async (prompt: Prompt, model: AllowedModel) => {
        try {
            setIsGenerating(true);
            const plainTextContent = await getChapterPlainText(chapter.id);

            const config: PromptParserConfig = {
                promptId: prompt.id,
                storyId: storyId,
                chapterId: chapter.id,
                additionalContext: {
                    plainTextContent
                }
            };

            const response = await generateWithPrompt(config, model);
            let text = '';

            await new Promise<void>((resolve, reject) => {
                processStreamedResponse(
                    response,
                    (token) => {
                        text += token;
                        setSummary(text);
                    },
                    resolve,
                    reject
                );
            });

            await updateChapterSummaryOptimistic(chapter.id, text);
            toast.success('Summary generated successfully');
        } catch (error) {
            console.error('Failed to generate summary:', error);
            toast.error('Failed to generate summary');
        } finally {
            setIsGenerating(false);
        }
    };

    const toggleExpanded = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsExpanded(prev => !prev);
    };

    const handleWriteClick = () => {
        setCurrentChapterId(chapter.id);
        navigate(`/dashboard/${storyId}/chapters/${chapter.id}`);
    };

    const cardContent = useMemo(() => (
        <CardContent className="p-4">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor={`summary-${chapter.id}`}>Chapter Summary</Label>
                    <Textarea
                        id={`summary-${chapter.id}`}
                        placeholder="Enter a brief summary of this chapter..."
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        className="min-h-[100px] resize-none"
                    />
                    <div className="flex justify-between items-center">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handleSaveSummary}
                        >
                            Save Summary
                        </Button>
                        <AIGenerateMenu
                            isGenerating={isGenerating}
                            isLoading={isLoading}
                            error={error}
                            prompts={prompts}
                            promptType="gen_summary"
                            buttonText="Generate Summary"
                            onGenerate={handleGenerateSummary}
                        />
                    </div>
                </div>
            </div>
        </CardContent>
    ), [summary, chapter.id, isGenerating, isLoading, error, prompts]);

    return (
        <>
            <Card className="w-full">
                <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 flex items-center gap-2">
                            <h3 className="text-lg font-semibold">Chapter {chapter.order}: {chapter.title}</h3>
                            {chapter.povCharacter && (
                                <span className="text-xs text-muted-foreground">
                                    POV: {chapter.povCharacter} ({chapter.povType})
                                </span>
                            )}
                            {!chapter.povCharacter && chapter.povType && (
                                <span className="text-xs text-muted-foreground">
                                    POV: {chapter.povType}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setShowEditDialog(true)}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleWriteClick}>
                                <PenLine className="h-4 w-4 mr-2" />
                                Write
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setShowDeleteDialog(true)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={toggleExpanded}
                            >
                                {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                ) : (
                                    <ChevronDown className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                {isExpanded && cardContent}
                <CardFooter className="flex justify-end gap-2 pt-3 border-t">
                    <DownloadMenu type="chapter" id={chapter.id} />
                </CardFooter>
            </Card>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete Chapter {chapter.order}: {chapter.title}.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                    <form onSubmit={form.handleSubmit(handleEdit)}>
                        <DialogHeader>
                            <DialogTitle>Edit Chapter</DialogTitle>
                            <DialogDescription>
                                Make changes to your chapter details.
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
                                    defaultValue={chapter.povType || 'Third Person Omniscient'}
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
                                        value={form.getValues("povCharacter")}
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
                            <Button type="submit">Save Changes</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
