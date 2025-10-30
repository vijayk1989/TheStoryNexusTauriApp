import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useChapterStore } from '@/features/chapters/stores/useChapterStore';
import { useStoryContext } from '@/features/stories/context/StoryContext';
import { debounce } from 'lodash';

export function SaveChapterContentPlugin(): null {
    const [editor] = useLexicalComposerContext();
    const { currentChapterId } = useStoryContext();
    const { updateChapter } = useChapterStore();

    // Create stable debounced save function using ref
    const saveContentRef = useRef(
        debounce((chapterId: string, content: string) => {
            console.log('SaveChapterContent - Saving content for chapter:', chapterId);
            updateChapter(chapterId, { content })
                .then(() => {
                    console.log('SaveChapterContent - Content saved successfully');
                })
                .catch((error) => {
                    console.error('SaveChapterContent - Failed to save content:', error);
                });
        }, 1000)
    );

    // Register update listener
    useEffect(() => {
        if (!currentChapterId) return;

        const saveContent = saveContentRef.current;

        const removeUpdateListener = editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
            // Skip if no changes
            if (dirtyElements.size === 0 && dirtyLeaves.size === 0) {
                return;
            }

            // Get the editor state as JSON
            const content = JSON.stringify(editorState.toJSON());

            // Save the content
            saveContent(currentChapterId, content);
        });

        return () => {
            removeUpdateListener();
            saveContent.cancel();
        };
    }, [editor, currentChapterId]);

    return null;
}
