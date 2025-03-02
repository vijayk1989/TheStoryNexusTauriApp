import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';

export function LocalStoragePlugin(): null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        const unregisterListener = editor.registerUpdateListener(({ editorState }) => {
            // Wrap in a read() to safely access the state snapshot.
            editorState.read(() => {
                const jsonState = JSON.stringify(editorState.toJSON());
                localStorage.setItem('lexicalEditorState', jsonState);
                console.log('Editor state saved to localStorage:', jsonState);
            });
        });

        return unregisterListener;
    }, [editor]);

    return null;
} 