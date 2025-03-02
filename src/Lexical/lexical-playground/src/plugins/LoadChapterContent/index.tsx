import { useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useChapterStore } from '@/features/chapters/stores/useChapterStore';
import { useStoryContext } from '@/features/stories/context/StoryContext';
import { SceneBeatNode } from '../../nodes/SceneBeatNode';

export function LoadChapterContentPlugin(): null {
    const [editor] = useLexicalComposerContext();
    const { currentChapterId } = useStoryContext();
    const { getChapter, currentChapter } = useChapterStore();
    const [hasLoaded, setHasLoaded] = useState(false);

    // Check if SceneBeatNode is registered
    useEffect(() => {
        // SceneBeatNode should already be registered in PlaygroundNodes.ts
        // Just log if it's available
        if (editor.hasNodes([SceneBeatNode])) {
            console.log('LoadChapterContent - SceneBeatNode is registered');
        } else {
            console.warn('LoadChapterContent - SceneBeatNode is NOT registered - this may cause issues with loading scene beats');
        }
    }, [editor]);

    // Debug logging
    useEffect(() => {
        console.log('LoadChapterContent - State:', {
            currentChapterId,
            hasCurrentChapter: !!currentChapter,
            chapterId: currentChapter?.id,
            hasContent: !!currentChapter?.content,
            contentLength: currentChapter?.content?.length,
            hasLoaded
        });
    }, [currentChapterId, currentChapter, hasLoaded]);

    // Load chapter data when chapter ID changes
    useEffect(() => {
        if (currentChapterId) {
            console.log('LoadChapterContent - Loading chapter:', currentChapterId);
            getChapter(currentChapterId);
            setHasLoaded(false);
        }
    }, [currentChapterId, getChapter]);

    // Set editor content when chapter data is available
    useEffect(() => {
        if (!hasLoaded && currentChapter?.content && currentChapter.id === currentChapterId) {
            console.log('LoadChapterContent - Attempting to load content:', {
                chapterId: currentChapter.id,
                contentLength: currentChapter.content.length,
                contentPreview: currentChapter.content.substring(0, 100) + '...'
            });

            // Ensure we have a small delay to make sure all nodes are registered
            setTimeout(() => {
                try {
                    // Check if content contains SceneBeatNode data
                    const contentObj = JSON.parse(currentChapter.content);
                    const hasSceneBeatNodes = JSON.stringify(contentObj).includes('"type":"scene-beat"');

                    if (hasSceneBeatNodes) {
                        console.log('LoadChapterContent - Content contains SceneBeatNodes');
                    }

                    // Parse and set the editor state
                    const parsedState = editor.parseEditorState(currentChapter.content);
                    editor.setEditorState(parsedState);
                    setHasLoaded(true);
                    console.log('LoadChapterContent - Content loaded successfully');
                } catch (error) {
                    console.error('LoadChapterContent - Failed to load content:', error);

                    // Only in case of error, try to create an empty editor state
                    try {
                        console.log('LoadChapterContent - Attempting recovery with empty state');
                        editor.setEditorState(editor.parseEditorState('{"root":{"children":[{"children":[],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}'));
                        setHasLoaded(true);
                    } catch (recoveryError) {
                        console.error('LoadChapterContent - Recovery failed:', recoveryError);
                    }
                }
            }, 100); // Small delay to ensure node registration
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
