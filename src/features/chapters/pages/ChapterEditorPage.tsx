import { useEffect } from "react";
import { useParams } from "react-router";
import { useStoryStore } from "@/features/stories/stores/useStoryStore";
import { useChapterStore } from "@/features/chapters/stores/useChapterStore";
import { useStoryContext } from "@/features/stories/context/StoryContext";
import { useLorebookStore } from "@/features/lorebook/stores/useLorebookStore";
import { StoryEditor } from "@/features/chapters/components/StoryEditor";

export default function ChapterEditorPage() {
    const { storyId, chapterId } = useParams<{ storyId: string; chapterId: string }>();
    const { getStory, currentStory } = useStoryStore();
    const { currentChapter, getChapter } = useChapterStore();
    const { loadEntries, buildTagMap } = useLorebookStore();
    const { setCurrentStoryId, setCurrentChapterId } = useStoryContext();

    useEffect(() => {
        if (storyId) {
            setCurrentStoryId(storyId);
            getStory(storyId);
        }
        if (chapterId) {
            setCurrentChapterId(chapterId);
            getChapter(chapterId);
        }

        return () => {
            setCurrentChapterId(null);
        };
    }, [storyId, chapterId, getStory, getChapter, setCurrentStoryId, setCurrentChapterId]);

    // Load lorebook entries once the story (and its lorebookIds) is available
    useEffect(() => {
        if (currentStory?.lorebookIds) {
            loadEntries(currentStory.lorebookIds).then(() => {
                buildTagMap();
            });
        }
    }, [currentStory, loadEntries, buildTagMap]);

    if (!currentStory) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-muted-foreground">Loading story...</div>
            </div>
        );
    }

    if (chapterId && !currentChapter) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-muted-foreground">Loading chapter...</div>
            </div>
        );
    }

    return (
        <div className="h-full">
            <StoryEditor />
        </div>
    );
} 