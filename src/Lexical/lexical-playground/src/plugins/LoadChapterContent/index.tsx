import { useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useChapterStore } from '@/features/chapters/stores/useChapterStore';
import { useStoryContext } from '@/features/stories/context/StoryContext';
import { normalizeChapterContent } from '@/features/chapters/utils/emptyChapterContent';

export const CHAPTER_LOAD_TAG = 'chapter-load';

export function LoadChapterContentPlugin(): null {
    const [editor] = useLexicalComposerContext();
    const { currentChapterId } = useStoryContext();
    const { getChapter, currentChapter } = useChapterStore();
    const [hasLoaded, setHasLoaded] = useState(false);

    // Load chapter data when chapter ID changes
    useEffect(() => {
        if (currentChapterId) {
            getChapter(currentChapterId);
            setHasLoaded(false);
        }
    }, [currentChapterId, getChapter]);

    // Set editor content when chapter data is available
    useEffect(() => {
        if (!hasLoaded && currentChapter && currentChapter.id === currentChapterId) {
            try {
                // Parse and set the editor state
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
