import { useState, useEffect } from "react";
import { attemptPromise } from "@jfdi/attempt";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { useChapterStore } from "../stores/useChapterStore";
import { Save } from "lucide-react";

export function ChapterOutline() {
    const { currentChapter, updateChapterOutline } = useChapterStore();
    const [outlineContent, setOutlineContent] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Load outline content when current chapter changes
    useEffect(() => {
        if (currentChapter?.outline?.content) {
            setOutlineContent(currentChapter.outline.content);
        } else {
            setOutlineContent("");
        }
    }, [currentChapter]);

    const handleSave = async () => {
        if (!currentChapter) return;

        setIsSaving(true);

        const [error] = await attemptPromise(async () =>
            updateChapterOutline(currentChapter.id, {
                content: outlineContent,
                lastUpdated: new Date()
            })
        );

        if (error) {
            console.error("Failed to save outline:", error);
        }

        setIsSaving(false);
    };

    return (
        <div className="chapter-outline-container">
            <div className="p-4 border-b flex justify-between items-center">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving || !currentChapter}
                >
                    <Save className="h-4 w-4 mr-1" />
                    Save Outline
                </Button>
            </div>
            <div className="chapter-outline-content">
                <Textarea
                    className="h-full min-h-[200px] resize-none"
                    placeholder="Enter your chapter outline here..."
                    value={outlineContent}
                    onChange={(e) => setOutlineContent(e.target.value)}
                    disabled={!currentChapter}
                />
            </div>
        </div>
    );
} 