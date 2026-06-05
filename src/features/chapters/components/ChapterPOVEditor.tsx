import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useChapterStore } from "../stores/useChapterStore";
import { useStoryContext } from "@/features/stories/context/StoryContext";
import { useLorebookStore } from "@/features/lorebook/stores/useLorebookStore";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PovInfoPopover } from "@/features/chapters/components/PovInfoPopover";
import { POV_OPTIONS, povUsesCharacter } from "@/features/chapters/utils/pov";
import type { PovType } from "@/types/story";

interface ChapterPOVEditorProps {
    onClose?: () => void;
}

interface POVForm {
    povType: PovType;
    povCharacter?: string;
}

export function ChapterPOVEditor({ onClose }: ChapterPOVEditorProps) {
    const { currentChapterId } = useStoryContext();
    const { currentChapter, updateChapter } = useChapterStore();
    const { entries } = useLorebookStore();

    const characterEntries = useMemo(() => {
        return entries.filter(entry => entry.category === 'character');
    }, [entries]);

    const form = useForm<POVForm>({
        defaultValues: {
            povType: currentChapter?.povType || 'Third Person Omniscient',
            povCharacter: currentChapter?.povCharacter,
        },
    });

    const povType = form.watch('povType');

    // Reset POV character when switching to a narrator style without a character.
    useEffect(() => {
        if (!povUsesCharacter(povType)) {
            form.setValue('povCharacter', undefined);
        }
    }, [povType, form]);

    const handleSubmit = async (data: POVForm) => {
        if (!currentChapter) return;

        try {
            const povCharacter = povUsesCharacter(data.povType) ? data.povCharacter : undefined;

            await updateChapter(currentChapter.id, {
                povType: data.povType,
                povCharacter
            });

            toast.success('Chapter POV updated successfully', {
                position: "bottom-center",
                autoClose: 1000,
                closeOnClick: true,
            });

            if (onClose) onClose();
        } catch (error) {
            console.error('Failed to update chapter POV:', error);
            toast.error('Failed to update chapter POV');
        }
    };

    if (!currentChapter) {
        return (
            <div className="flex items-center justify-center p-4">
                <p className="text-muted-foreground">No chapter selected</p>
            </div>
        );
    }

    return (
        <div className="p-4">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="povType"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center gap-1">
                                    <FormLabel>Point of View</FormLabel>
                                    <PovInfoPopover />
                                </div>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select POV type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {POV_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {povUsesCharacter(povType) && (
                        <FormField
                            control={form.control}
                            name="povCharacter"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>POV Character</FormLabel>
                                    {characterEntries.length > 0 ? (
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select character" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {characterEntries.map(character => (
                                                    <SelectItem key={character.id} value={character.name}>
                                                        {character.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <FormControl>
                                            <Input
                                                placeholder="Enter character name"
                                                {...field}
                                                value={field.value || ''}
                                            />
                                        </FormControl>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            Save Changes
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
