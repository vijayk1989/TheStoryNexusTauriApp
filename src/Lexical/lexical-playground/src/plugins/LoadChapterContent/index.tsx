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

    // Load chapter data when chapter ID changes
    useEffect(() => {
        if (currentChapterId) {
            getChapter(currentChapterId);
            setHasLoaded(false);
        }
    }, [currentChapterId, getChapter]);

    // Set editor content when chapter data is available
    useEffect(() => {
        if (!hasLoaded && currentChapter?.content && currentChapter.id === currentChapterId) {

            // Ensure we have a small delay to make sure all nodes are registered
            setTimeout(() => {
                try {
                    // Check if content contains SceneBeatNode data
                    const contentObj = JSON.parse(currentChapter.content);
                    const hasSceneBeatNodes = JSON.stringify(contentObj).includes('"type":"scene-beat"');

                    // Parse and set the editor state
                    const parsedState = editor.parseEditorState(currentChapter.content);
                    editor.setEditorState(parsedState);
                    setHasLoaded(true);
                } catch (error) {
                    console.error('LoadChapterContent - Failed to load content:', error);

                    // Only in case of error, try to create an empty editor state
                    try {
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
