import { useEffect, useState } from "react";
import { Story, StoryFormat, UniverseType } from "@/types/story";
import { useStoryStore } from "@/features/stories/stores/useStoryStore";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,

    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";



interface EditStoryDialogProps {
    story: Story | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditStoryDialog({ story, open, onOpenChange }: EditStoryDialogProps) {
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [language, setLanguage] = useState("English");
    const [synopsis, setSynopsis] = useState("");
    const [storyFormat, setStoryFormat] = useState<StoryFormat>("novel");
    const [universeType, setUniverseType] = useState<UniverseType>("shared_universe");
    const updateStory = useStoryStore((state) => state.updateStory);

    useEffect(() => {
        if (story) {
            setTitle(story.title);
            setAuthor(story.author);
            setLanguage(story.language);
            setSynopsis(story.synopsis || "");
            setStoryFormat(story.storyFormat ?? "novel");
            setUniverseType(story.universeType ?? "shared_universe");
        }
    }, [story]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!story) return;

        try {
            await updateStory(story.id, {
                title,
                author,
                language,
                synopsis,
                storyFormat,
                universeType: storyFormat === "short_story_collection" ? universeType : undefined,
            });
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to update story:", error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Edit Story</DialogTitle>
                        <DialogDescription>
                            Make changes to your story details here.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-title">Title</Label>
                            <Input
                                id="edit-title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter story title"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-author">Author</Label>
                            <Input
                                id="edit-author"
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                placeholder="Enter author name"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-language">Language</Label>
                            <Select value={language} onValueChange={setLanguage}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="English">English</SelectItem>
                                    <SelectItem value="Spanish">Spanish</SelectItem>
                                    <SelectItem value="French">French</SelectItem>
                                    <SelectItem value="German">German</SelectItem>
                                    <SelectItem value="Chinese">Chinese</SelectItem>
                                    <SelectItem value="Japanese">Japanese</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-synopsis">Synopsis</Label>
                            <Input
                                id="edit-synopsis"
                                value={synopsis}
                                onChange={(e) => setSynopsis(e.target.value)}
                                placeholder="Enter a brief synopsis (optional)"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-storyFormat">Format</Label>
                            <Select value={storyFormat} onValueChange={(v) => setStoryFormat(v as StoryFormat)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select format" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="novel">Novel</SelectItem>
                                    <SelectItem value="short_story_collection">Short Story Collection</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {storyFormat === "short_story_collection" && (
                            <div className="grid gap-2">
                                <Label htmlFor="edit-universeType">Collection Type</Label>
                                <Select value={universeType} onValueChange={(v) => setUniverseType(v as UniverseType)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select collection type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="shared_universe">Shared Universe</SelectItem>
                                        <SelectItem value="standalone">Standalone Stories</SelectItem>
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
    );
}
