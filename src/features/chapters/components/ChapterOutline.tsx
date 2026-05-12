import { useState, useEffect } from "react";
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
        try {
            await updateChapterOutline(currentChapter.id, {
                content: outlineContent,
                lastUpdated: new Date()
            });
        } catch (error) {
            console.error("Failed to save outline:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex h-full min-h-[calc(100vh-96px)] flex-col">
            <div className="flex items-center justify-end border-b pb-3">
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
            <div className="min-h-0 flex-1 pt-3">
                <Textarea
                    className="h-full min-h-[420px] resize-none"
                    placeholder="Enter your chapter outline here..."
                    value={outlineContent}
                    onChange={(e) => setOutlineContent(e.target.value)}
                    disabled={!currentChapter}
                />
            </div>
        </div>
    );
} 
