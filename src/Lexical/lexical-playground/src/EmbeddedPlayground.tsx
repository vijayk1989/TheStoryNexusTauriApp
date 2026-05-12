import { useStoryContext } from '@/features/stories/context/StoryContext';
import { useChapterStore } from '@/features/chapters/stores/useChapterStore';
import { useEffect, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Save } from 'lucide-react';
import PlaygroundApp from './App' // using the lexical playground App component
import './index.css' // Ensure the CSS is imported
import { cn } from '@/lib/utils';
import { useEditorSaveStatusStore } from '@/features/editor/stores/useEditorSaveStatusStore';

interface EmbeddedPlaygroundProps {
    maximizeButton?: ReactNode;
}

export default function EmbeddedPlayground({ maximizeButton }: EmbeddedPlaygroundProps) {
    const { currentChapterId } = useStoryContext();
    const { getChapter, currentChapter } = useChapterStore();
    const { status } = useEditorSaveStatusStore();

    useEffect(() => {
        if (currentChapterId) {
            getChapter(currentChapterId);
        }
    }, [currentChapterId, getChapter]);

    if (!currentChapterId || !currentChapter) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Select a chapter to start editing</p>
            </div>
        );
    }

    return (
        <div>
            <div className="sticky top-0 z-20 flex items-center justify-between gap-3 px-3 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <h2 className="min-w-0 flex-1 truncate font-heading text-lg font-semibold text-primary">{currentChapter.title}</h2>
                <div className="flex shrink-0 items-center gap-2">
                    <SaveStatusIndicator status={status} />
                    {maximizeButton}
                </div>
            </div>
            <div>
                <PlaygroundApp />
            </div>
        </div>
    );
}

function SaveStatusIndicator({ status }: { status: ReturnType<typeof useEditorSaveStatusStore.getState>['status'] }) {
    const isSaved = status === 'saved';
    const isSaving = status === 'saving';
    const isError = status === 'error';
    const label = isSaved ? 'Saved' : isSaving ? 'Saving...' : isError ? 'Save failed' : 'Unsaved changes';

    return (
        <div className="flex items-center gap-2 text-xs">
            <div
                className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap",
                    isSaved && "text-emerald-400",
                    isSaving && "text-muted-foreground",
                    status === 'pending' && "text-amber-400",
                    isError && "text-destructive"
                )}
            >
                {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isError ? (
                    <AlertCircle className="h-3.5 w-3.5" />
                ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>{label}</span>
            </div>
            <button
                type="button"
                disabled
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/50 bg-muted/45 px-3 text-xs font-medium text-muted-foreground opacity-70"
                title={label}
            >
                <Save className="h-3.5 w-3.5" />
                Save
            </button>
        </div>
    );
}
