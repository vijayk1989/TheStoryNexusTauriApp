import { useEffect, useState, useRef } from "react";
import { useStoryStore } from "@/features/stories/stores/useStoryStore";
import { CreateStoryDialog } from "@/features/stories/components/CreateStoryDialog";
import { EditStoryDialog } from "@/features/stories/components/EditStoryDialog";
import { StoryCard } from "@/features/stories/components/StoryCard";
import type { Story } from "@/types/story";
import { useStoryContext } from "@/features/stories/context/StoryContext";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { storyExportService } from "@/services/storyExportService";

export default function Home() {
    const { stories, fetchStories } = useStoryStore();
    const { resetContext } = useStoryContext();
    const [editingStory, setEditingStory] = useState<Story | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        resetContext();
        fetchStories();
    }, [fetchStories, resetContext]);

    const handleEditStory = (story: Story) => {
        setEditingStory(story);
        setEditDialogOpen(true);
    };

    const handleExportStory = (story: Story) => {
        void storyExportService.exportStory(story.id);
    };

    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleImportStory = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return;

        const file = event.target.files[0];
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                await storyExportService.importStory(content);

                // Just refresh the story list without navigating
                await fetchStories();
            } catch (error) {
                console.error("Import failed:", error);
            }
        };

        reader.readAsText(file);
        // Reset the input
        event.target.value = '';
    };

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8 md:space-y-12">
                <div className="text-center">
                    <h1 className="text-2xl md:text-4xl font-bold mb-6 md:mb-8">Story Writing App</h1>
                    <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4 mb-6 md:mb-8">
                        <CreateStoryDialog />
                        <Button variant="outline" onClick={handleImportClick}>
                            <Upload className="w-4 h-4 mr-2" />
                            Import Story
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={handleImportStory}
                        />
                    </div>
                </div>

                {stories.length === 0 ? (
                    <div className="text-center text-muted-foreground">
                        No stories yet. Create your first story to get started!
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 place-items-center">
                        {stories.map((story) => (
                            <StoryCard
                                key={story.id}
                                story={story}
                                onEdit={handleEditStory}
                                onExport={handleExportStory}
                            />
                        ))}
                    </div>
                )}

                <EditStoryDialog
                    story={editingStory}
                    open={editDialogOpen}
                    onOpenChange={setEditDialogOpen}
                />
            </div>
        </div>
    );
} 
