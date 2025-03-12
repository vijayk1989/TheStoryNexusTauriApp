import { Story } from "@/types/story";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { useNavigate } from "react-router";
import { useStoryStore } from "@/features/stories/stores/useStoryStore";
import { DownloadMenu } from "@/components/ui/DownloadMenu";

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
        <Card className="w-full cursor-pointer hover:bg-accent/10 transition-colors" onClick={handleCardClick}>
            <CardHeader>
                <CardTitle>{story.title}</CardTitle>
                <CardDescription>By {story.author}</CardDescription>
            </CardHeader>
            <CardContent>
                {story.synopsis && <p className="text-sm text-muted-foreground">{story.synopsis}</p>}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <DownloadMenu type="story" id={story.id} />
                <Button variant="ghost" size="icon" onClick={handleEdit}>
                    <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    );
} 