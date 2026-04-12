import { useEffect, useCallback, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useChapterStore } from '@/features/chapters/stores/useChapterStore';
import { useStoryContext } from '@/features/stories/context/StoryContext';
import { debounce } from 'lodash';

export function SaveChapterContentPlugin(): null {
    const [editor] = useLexicalComposerContext();
    const { currentChapterId } = useStoryContext();
    const { updateChapter } = useChapterStore();

    // Track the "saved" timer so we can clear it on each new save
    const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounced save function
    const saveContent = useCallback(
        debounce((content: string) => {
            if (!currentChapterId) return;

            useChapterStore.setState({ saveStatus: 'saving' });
            updateChapter(currentChapterId, { content })
                .then(() => {
                    useChapterStore.setState({ saveStatus: 'saved' });
                    // Auto-clear "Saved" indicator after 2 seconds
                    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
                    savedTimerRef.current = setTimeout(() => {
                        useChapterStore.setState({ saveStatus: 'idle' });
                    }, 2000);
                })
                .catch((error) => {
                    console.error('SaveChapterContent - Failed to save content:', error);
                    useChapterStore.setState({ saveStatus: 'idle' });
                });
        }, 1000),
        [currentChapterId, updateChapter]
    );

    // Register update listener
    useEffect(() => {
        if (!currentChapterId) return;

        const removeUpdateListener = editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
            // Skip if no changes
            if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;

            const content = JSON.stringify(editorState.toJSON());
            saveContent(content);
        });

        return () => {
            removeUpdateListener();
            // Flush any pending debounced save before unmounting to prevent data loss
            // when the user navigates away within the 1-second debounce window.
            saveContent.flush();
        };
    }, [editor, currentChapterId, saveContent]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        };
    }, []);

    return null;
}
