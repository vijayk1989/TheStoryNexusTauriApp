import { useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useChapterStore } from '@/features/chapters/stores/useChapterStore';
import { useStoryContext } from '@/features/stories/context/StoryContext';

export function LoadChapterContentPlugin(): null {
    const [editor] = useLexicalComposerContext();
    const { currentChapterId } = useStoryContext();
    const { getChapter, currentChapter } = useChapterStore();
    const [hasLoaded, setHasLoaded] = useState(false);

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

    useEffect(() => {
        if (currentChapterId) {
            console.log('LoadChapterContent - Loading chapter:', currentChapterId);
            getChapter(currentChapterId);
            setHasLoaded(false);
        }
    }, [currentChapterId, getChapter]);

    useEffect(() => {
        if (!hasLoaded && currentChapter?.content && currentChapter.id === currentChapterId) {
            console.log('LoadChapterContent - Attempting to load content:', {
                chapterId: currentChapter.id,
                contentLength: currentChapter.content.length,
                contentPreview: currentChapter.content.substring(0, 100) + '...'
            });

            // Wrap the editor state update in a micro task
            Promise.resolve().then(() => {
                try {
                    // Ensure content is valid JSON
                    let contentToLoad = currentChapter.content;

                    // Check if content is a valid JSON string
                    try {
                        // Try parsing to validate it's JSON
                        JSON.parse(contentToLoad);
                    } catch (jsonError) {
                        console.warn('LoadChapterContent - Content is not valid JSON, attempting to format it:', jsonError);

                        // If not valid JSON, create a simple editor state with the content as text
                        const formattedContent = {
                            root: {
                                children: [
                                    {
                                        children: [
                                            {
                                                detail: 0,
                                                format: 0,
                                                mode: "normal",
                                                style: "",
                                                text: contentToLoad,
                                                type: "text",
                                                version: 1
                                            }
                                        ],
                                        direction: "ltr",
                                        format: "",
                                        indent: 0,
                                        type: "paragraph",
                                        version: 1
                                    }
                                ],
                                direction: "ltr",
                                format: "",
                                indent: 0,
                                type: "root",
                                version: 1
                            }
                        };

                        contentToLoad = JSON.stringify(formattedContent);
                        console.log('LoadChapterContent - Reformatted content as Lexical JSON');
                    }

                    const parsedState = editor.parseEditorState(contentToLoad);
                    editor.setEditorState(parsedState);
                    setHasLoaded(true);
                    console.log('LoadChapterContent - Content loaded successfully');
                } catch (error) {
                    console.error('LoadChapterContent - Failed to load content:', error);
                    // Try to recover by creating an empty editor state
                    try {
                        console.log('LoadChapterContent - Attempting recovery with empty state');
                        editor.setEditorState(editor.parseEditorState('{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}'));
                        setHasLoaded(true);
                    } catch (recoveryError) {
                        console.error('LoadChapterContent - Recovery failed:', recoveryError);
                    }
                }
            });
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
