import { Story } from "@/types/story";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { useNavigate } from "react-router";
import { useStoryStore } from "@/features/stories/stores/useStoryStore";

interface StoryCardProps {
    story: Story;
    onEdit: (story: Story) => void;
}

export function StoryCard({ story, onEdit }: StoryCardProps) {
    const deleteStory = useStoryStore((state) => state.deleteStory);
    const navigate = useNavigate();

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this story?")) {
            await deleteStory(story.id);
        }
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit(story);
    };

    const handleCardClick = () => {
        navigate(`/dashboard/${story.id}/chapters`);
    };

    return (
        <Card
            className="w-[350px] hover:bg-accent/50 cursor-pointer transition-colors"
            onClick={handleCardClick}
        >
            <CardHeader className="pb-3">
                <CardTitle className="text-xl">{story.title}</CardTitle>
                <CardDescription>by {story.author}</CardDescription>
            </CardHeader>
            <CardContent className="pb-3">
                <div className="space-y-2">
                    <div className="text-sm">
                        <span className="font-medium">Language:</span> {story.language}
                    </div>
                    {story.synopsis && (
                        <div className="text-sm text-muted-foreground">
                            {story.synopsis}
                        </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                        Created: {new Date(story.createdAt).toLocaleDateString()}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Edit className="h-4 w-4" />
                    Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4" />
                    Delete
                </Button>
            </CardFooter>
        </Card>
    );
} 