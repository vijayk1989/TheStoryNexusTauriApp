import { useEffect } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext.js";
import debounce from "lodash/debounce";
import { lexicalToPlainText } from "../serialization/lexicalToPlainText";

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
                const content = lexicalToPlainText(editor.getEditorState().toJSON());
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

        const removeListener = editor.registerUpdateListener(updateMatches);
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
