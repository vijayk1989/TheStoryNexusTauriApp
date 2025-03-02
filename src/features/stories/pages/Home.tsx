import { useEffect, useState } from "react";
import { useStoryStore } from "@/features/stories/stores/useStoryStore";
import { CreateStoryDialog } from "@/features/stories/components/CreateStoryDialog";
import { EditStoryDialog } from "@/features/stories/components/EditStoryDialog";
import { StoryCard } from "@/features/stories/components/StoryCard";
import type { Story } from "@/types/story";
import { useStoryContext } from "@/features/stories/context/StoryContext";


export default function Home() {
    const { stories, fetchStories } = useStoryStore();
    const { resetContext } = useStoryContext();
    const [editingStory, setEditingStory] = useState<Story | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    useEffect(() => {
        resetContext();
        fetchStories();
    }, [fetchStories, resetContext]);

    const handleEditStory = (story: Story) => {
        setEditingStory(story);
        setEditDialogOpen(true);
    };

    return (
        <div className="p-8">
            <div className="max-w-7xl mx-auto space-y-12">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-8">Story Writing App</h1>
                    <CreateStoryDialog />
                </div>

                {stories.length === 0 ? (
                    <div className="text-center text-muted-foreground">
                        No stories yet. Create your first story to get started!
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 place-items-center">
                        {stories.map((story) => (
                            <StoryCard
                                key={story.id}
                                story={story}
                                onEdit={handleEditStory}
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