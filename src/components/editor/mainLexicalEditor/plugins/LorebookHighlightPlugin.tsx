import { useEffect } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import debounce from "lodash/debounce";
import { $getRoot } from "lexical";

import { useLorebookStore } from "@/features/lorebook/stores/useLorebookStore";
import type { LorebookEntry } from "@/types/story";

export function LorebookHighlightPlugin(): null {
    const [editor] = useLexicalComposerContext();
    const {
        aliasMap,
        setChapterMatchedEntries,
        setEditorContent,
    } = useLorebookStore();

    useEffect(() => {
        setChapterMatchedEntries(new Map());

        const updateMatches = debounce(() => {
            editor.getEditorState().read(() => {
                const content = $getRoot().getTextContent();
                const normalizedContent = content.toLowerCase();
                const matchedEntries = new Map<string, LorebookEntry>();

                Object.entries(aliasMap).forEach(([alias, entry]) => {
                    if (alias.trim() && normalizedContent.includes(alias.toLowerCase())) {
                        matchedEntries.set(entry.id, entry);
                    }
                });

                setEditorContent(content);
                setChapterMatchedEntries(matchedEntries);
            });
        }, 500);

        const removeListener = editor.registerTextContentListener(updateMatches);
        updateMatches();

        return () => {
            removeListener();
            updateMatches.cancel();
            setEditorContent("");
            setChapterMatchedEntries(new Map());
        };
    }, [editor, setChapterMatchedEntries, setEditorContent, aliasMap]);

    return null;
}
