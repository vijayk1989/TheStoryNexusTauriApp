import { useEffect, useCallback } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useChapterStore } from '@/features/chapters/stores/useChapterStore';
import { useStoryContext } from '@/features/stories/context/StoryContext';
import { toast } from 'react-toastify';
import { TOAST_CLOSE_TIMER, TOAST_POSITION } from '@/constants';
import { debounce } from 'lodash';
import { $isSceneBeatNode } from '../../nodes/SceneBeatNode';
import { $getRoot, $getNodeByKey } from 'lexical';

export function SaveChapterContentPlugin(): null {
    const [editor] = useLexicalComposerContext();
    const { currentChapterId } = useStoryContext();
    const { updateChapter } = useChapterStore();

    // Debounced save function
    const saveContent = useCallback(
        debounce((content: string) => {
            if (currentChapterId) {
                console.log('SaveChapterContent - Saving content for chapter:', currentChapterId);
                updateChapter(currentChapterId, { content })
                    .then(() => {
                        console.log('SaveChapterContent - Content saved successfully');
                    })
                    .catch((error) => {
                        console.error('SaveChapterContent - Failed to save content:', error);
                    });
            }
        }, 1000),
        [currentChapterId, updateChapter]
    );

    // Register update listener
    useEffect(() => {
        if (!currentChapterId) return;

        const removeUpdateListener = editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
            // Skip if no changes
            if (dirtyElements.size === 0 && dirtyLeaves.size === 0) {
                return;
            }

            // Get the editor state as JSON
            const content = JSON.stringify(editorState.toJSON());

            // Save the content
            saveContent(content);
        });

        return () => {
            removeUpdateListener();
            saveContent.cancel();
        };
    }, [editor, currentChapterId, saveContent]);

    return null;
}
