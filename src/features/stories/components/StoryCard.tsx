import { Story } from "@/types/story";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Edit, Trash2, FolderUp, Link, Link2Off, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router";
import { useStoryStore } from "@/features/stories/stores/useStoryStore";
import { DownloadMenu } from "@/components/ui/DownloadMenu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface StoryCardProps {
    story: Story;
    onEdit: (story: Story) => void;
    onExport: (story: Story) => void;
}

export function StoryCard({ story, onEdit, onExport }: StoryCardProps) {
    const deleteStory = useStoryStore((state) => state.deleteStory);
    const linkStoryToFile = useStoryStore((state) => state.linkStoryToFile);
    const syncStoryToFile = useStoryStore((state) => state.syncStoryToFile);
    const unlinkStoryFile = useStoryStore((state) => state.unlinkStoryFile);
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

    const handleExport = (e: React.MouseEvent) => {
        e.stopPropagation();
        onExport(story);
    };

    const handleLinkToFile = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await linkStoryToFile(story.id);
    };

    const handleSyncNow = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await syncStoryToFile(story.id);
    };

    const handleUnlink = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await unlinkStoryFile(story.id);
    };

    const handleCardClick = () => {
        navigate(`/dashboard/${story.id}/chapters`);
    };

    // Truncate a long path for display: show last 40 chars
    const displayPath = story.saveFilePath
        ? story.saveFilePath.length > 40
            ? `…${story.saveFilePath.slice(-40)}`
            : story.saveFilePath
        : null;

    return (
        <Card className="w-full cursor-pointer border-2 border-gray-300 dark:border-gray-700 hover:bg-accent hover:text-accent-foreground transition-colors shadow-sm" onClick={handleCardClick}>
            <CardHeader>
                <CardTitle>{story.title}</CardTitle>
                <CardDescription>By {story.author}</CardDescription>
            </CardHeader>
            <CardContent>
                {story.synopsis && <p className="text-sm text-muted-foreground">{story.synopsis}</p>}
                {displayPath && (
                    <p className="mt-2 text-xs text-muted-foreground font-mono truncate" title={story.saveFilePath}>
                        {displayPath}
                    </p>
                )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div>
                                <DownloadMenu type="story" id={story.id} />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Download options</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {story.saveFilePath ? (
                    <>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={handleSyncNow}>
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Sync to file now</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={handleUnlink}>
                                        <Link2Off className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Unlink file</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </>
                ) : (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={handleLinkToFile}>
                                    <Link className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Link to file for auto-save</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handleEdit}>
                                <Edit className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Edit story details</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handleExport}>
                                <FolderUp className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Export story as JSON</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handleDelete}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Delete story</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </CardFooter>
        </Card>
    );
}
