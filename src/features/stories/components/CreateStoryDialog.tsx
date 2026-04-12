import { useState } from "react";
import { useStoryStore } from "@/features/stories/stores/useStoryStore";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusCircle } from "lucide-react";
import { StoryFormat, UniverseType } from "@/types/story";


export function CreateStoryDialog() {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [language, setLanguage] = useState("English");
    const [synopsis, setSynopsis] = useState("");
    const [storyFormat, setStoryFormat] = useState<StoryFormat>("novel");
    const [universeType, setUniverseType] = useState<UniverseType>("shared_universe");
    const [createDedicatedLoreBook, setCreateDedicatedLoreBook] = useState(true);
    const createStory = useStoryStore((state) => state.createStory);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createStory({
                title,
                author,
                language,
                synopsis,
                storyFormat,
                universeType: storyFormat === "short_story_collection" ? universeType : undefined,
            }, createDedicatedLoreBook);
            setOpen(false);
            // Reset form
            setTitle("");
            setAuthor("");
            setLanguage("English");
            setSynopsis("");
            setStoryFormat("novel");
            setUniverseType("shared_universe");
            setCreateDedicatedLoreBook(true);
        } catch (error) {
            console.error("Failed to create story:", error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="lg" className="w-64">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Create New Story
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create New Story</DialogTitle>
                        <DialogDescription>
                            Fill in the details for your new story. You can edit these later.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter story title"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="author">Author</Label>
                            <Input
                                id="author"
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                placeholder="Enter author name"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="language">Language</Label>
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
                            <Label htmlFor="synopsis">Synopsis</Label>
                            <Input
                                id="synopsis"
                                value={synopsis}
                                onChange={(e) => setSynopsis(e.target.value)}
                                placeholder="Enter a brief synopsis (optional)"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="storyFormat">Format</Label>
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
                                <Label htmlFor="universeType">Collection Type</Label>
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
                        <div className="flex items-start gap-3">
                            <Checkbox
                                id="createLoreBook"
                                checked={createDedicatedLoreBook}
                                onCheckedChange={(checked) => setCreateDedicatedLoreBook(!!checked)}
                                className="mt-0.5"
                            />
                            <div className="grid gap-1">
                                <Label htmlFor="createLoreBook" className="cursor-pointer">
                                    Create a dedicated lore book
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    A lore book stores characters, locations, and world-building entries. You can share lore books across multiple stories.
                                </p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">Create Story</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
