import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import debounce from 'lodash/debounce';
import { $getRoot } from 'lexical';
import { useLorebookStore } from '@/features/lorebook/stores/useLorebookStore';
import { LorebookEntry } from '@/types/story';

export default function LorebookTagPlugin(): null {
    const [editor] = useLexicalComposerContext();
    const { tagMap, setChapterMatchedEntries } = useLorebookStore();

    useEffect(() => {
        // Clear matched entries when plugin mounts with new editor
        setChapterMatchedEntries(new Map());

        const debouncedUpdate = debounce(() => {
            editor.getEditorState().read(() => {
                const content = $getRoot().getTextContent();
                const matchedEntries = new Map<string, LorebookEntry>();

                // Check for each tag in the content
                Object.entries(tagMap).forEach(([tag, entry]) => {
                    if (content.toLowerCase().includes(tag.toLowerCase())) {
                        // Use entry.id as key to prevent duplicates
                        matchedEntries.set(entry.id, entry);
                    }
                });

                // Update the store with matched entries only
                setChapterMatchedEntries(matchedEntries);
            });
        }, 500);

        const removeListener = editor.registerTextContentListener(debouncedUpdate);

        // Run initial check
        debouncedUpdate();

        return () => {
            removeListener();
            debouncedUpdate.cancel();
            // Clear matched entries when plugin unmounts
            setChapterMatchedEntries(new Map());
        };
    }, [editor, tagMap, setChapterMatchedEntries]);

    return null;
} 