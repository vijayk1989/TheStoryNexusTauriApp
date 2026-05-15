import { useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useChapterStore } from '@/features/chapters/stores/useChapterStore';
import { useStoryContext } from '@/features/stories/context/StoryContext';
import { normalizeChapterContent } from '@/features/chapters/utils/emptyChapterContent';
import { useSceneBeatStore } from '@/features/scenebeats/stores/useSceneBeatStore';

export const CHAPTER_LOAD_TAG = 'chapter-load';

export function LoadChapterContentPlugin(): null {
    const [editor] = useLexicalComposerContext();
    const { currentChapterId } = useStoryContext();
    const { getChapter, currentChapter } = useChapterStore();
    const fetchSceneBeatsByChapter = useSceneBeatStore((state) => state.fetchSceneBeatsByChapter);
    const clearSceneBeats = useSceneBeatStore((state) => state.clearSceneBeats);
    const [hasLoaded, setHasLoaded] = useState(false);

    // Load chapter data when chapter ID changes
    useEffect(() => {
        if (currentChapterId) {
            getChapter(currentChapterId);
            fetchSceneBeatsByChapter(currentChapterId).catch((error) => {
                console.error('LoadChapterContent - Failed to preload scene beats:', error);
            });
            setHasLoaded(false);
        } else {
            clearSceneBeats();
        }
    }, [currentChapterId, getChapter, fetchSceneBeatsByChapter, clearSceneBeats]);

    // Set editor content when chapter data is available
    useEffect(() => {
        if (!hasLoaded && currentChapter && currentChapter.id === currentChapterId) {
            let cancelled = false;
            const schedule = typeof queueMicrotask === 'function'
                ? queueMicrotask
                : (callback: () => void) => window.setTimeout(callback, 0);

            schedule(() => {
                if (cancelled) return;

                try {
                    // Parse and set the editor state after React finishes the current effect.
                    const parsedState = editor.parseEditorState(normalizeChapterContent(currentChapter.content));
                    editor.setEditorState(parsedState, { tag: CHAPTER_LOAD_TAG });
                    setHasLoaded(true);
                } catch (error) {
                    console.error('LoadChapterContent - Failed to load content:', error);

                    // Only in case of error, try to create an empty editor state
                    try {
                        editor.setEditorState(editor.parseEditorState(normalizeChapterContent()), { tag: CHAPTER_LOAD_TAG });
                        setHasLoaded(true);
                    } catch (recoveryError) {
                        console.error('LoadChapterContent - Recovery failed:', recoveryError);
                    }
                }
            });

            return () => {
                cancelled = true;
            };
        }
    }, [editor, currentChapter, currentChapterId, hasLoaded]);

    // Reset hasLoaded when chapter changes
    useEffect(() => {
        if (currentChapterId) {
            setHasLoaded(false);
        }
    }, [currentChapterId]);

    return null;
}
