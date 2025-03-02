import { useEffect, useCallback } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useChapterStore } from '@/features/chapters/stores/useChapterStore';
import { useStoryContext } from '@/features/stories/context/StoryContext';
import { toast } from 'react-toastify';
import { TOAST_CLOSE_TIMER, TOAST_POSITION } from '@/constants';
import debounce from 'lodash/debounce';

export function SaveChapterContentPlugin(): null {
    const [editor] = useLexicalComposerContext();
    const { currentChapterId } = useStoryContext();
    const { updateChapter, currentChapter } = useChapterStore();

    const saveContent = useCallback(
        debounce(async (content: string) => {
            if (!currentChapterId || !currentChapter || currentChapter.id !== currentChapterId) {
                console.log('AutoSave - Skipped: No valid chapter');
                return;
            }

            try {
                console.log('AutoSave - Saving chapter:', currentChapterId);
                await updateChapter(currentChapterId, { content });
                console.log('AutoSave - Chapter saved successfully');
            } catch (error) {
                console.error('AutoSave - Failed to save:', error);
                toast.error('Failed to auto-save chapter', {
                    position: TOAST_POSITION,
                    autoClose: TOAST_CLOSE_TIMER,
                });
            }
        }, 1000), // 1 second debounce
        [currentChapterId, currentChapter, updateChapter]
    );

    useEffect(() => {
        if (!currentChapterId) return;

        const removeListener = editor.registerUpdateListener(
            ({ editorState }) => {
                const serializedState = JSON.stringify(editorState.toJSON());
                saveContent(serializedState);
            }
        );

        return () => {
            removeListener();
            saveContent.cancel();
        };
    }, [editor, currentChapterId, saveContent]);

    return null;
}
