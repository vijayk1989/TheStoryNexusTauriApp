import { useEffect, useCallback } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useChapterStore } from '@/features/chapters/stores/useChapterStore';
import { useStoryContext } from '@/features/stories/context/StoryContext';
import { toast } from 'react-toastify';
import { TOAST_CLOSE_TIMER, TOAST_POSITION } from '@/constants';
import { debounce } from 'lodash';
import { $isSceneBeatNode } from '../../nodes/SceneBeatNode';
import { $getRoot, $getNodeByKey } from 'lexical';
import { saveLastEditorTarget } from '@/features/editor/utils/lastEditorTarget';
import { useEditorSaveStatusStore } from '@/features/editor/stores/useEditorSaveStatusStore';
import { CHAPTER_LOAD_TAG } from '../LoadChapterContent';

export function SaveChapterContentPlugin(): null {
    const [editor] = useLexicalComposerContext();
    const { currentStoryId, currentChapterId } = useStoryContext();
    const { updateChapter } = useChapterStore();
    const { setStatus, markSaved } = useEditorSaveStatusStore();

    // Debounced save function
    const saveContent = useCallback(
        debounce((content: string) => {
            if (currentChapterId) {
                setStatus('saving');
                console.log('SaveChapterContent - Saving content for chapter:', currentChapterId);
                updateChapter(currentChapterId, { content })
                    .then(() => {
                        if (currentStoryId) {
                            saveLastEditorTarget({ storyId: currentStoryId, chapterId: currentChapterId });
                        }
                        markSaved();
                        console.log('SaveChapterContent - Content saved successfully');
                    })
                    .catch((error) => {
                        setStatus('error');
                        console.error('SaveChapterContent - Failed to save content:', error);
                    });
            }
        }, 1000),
        [currentChapterId, currentStoryId, updateChapter, setStatus, markSaved]
    );

    // Register update listener
    useEffect(() => {
        if (!currentChapterId) return;

        setStatus('saved');

        const removeUpdateListener = editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves, tags }) => {
            if (tags.has(CHAPTER_LOAD_TAG)) {
                setStatus('saved');
                return;
            }

            // Skip if no changes
            if (dirtyElements.size === 0 && dirtyLeaves.size === 0) {
                return;
            }

            // Get the editor state as JSON
            const content = JSON.stringify(editorState.toJSON());

            // Save the content
            setStatus('pending');
            saveContent(content);
        });

        return () => {
            removeUpdateListener();
            saveContent.flush();
        };
    }, [editor, currentChapterId, saveContent, setStatus]);

    return null;
}
