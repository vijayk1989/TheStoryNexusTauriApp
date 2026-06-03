import { useEffect } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot } from "lexical";

import { countWordsInText } from "../serialization/lexicalToPlainText";

type WordCountPluginProps = {
    onChange: (wordCount: number) => void;
};

export function WordCountPlugin({ onChange }: WordCountPluginProps) {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        const updateWordCount = () => {
            editor.getEditorState().read(() => {
                onChange(countWordsInText($getRoot().getTextContent()));
            });
        };

        updateWordCount();

        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                onChange(countWordsInText($getRoot().getTextContent()));
            });
        });
    }, [editor, onChange]);

    return null;
}
