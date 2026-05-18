export const EMPTY_MAIN_LEXICAL_EDITOR_STATE = JSON.stringify({
    root: {
        children: [
            {
                children: [],
                direction: "ltr",
                format: "",
                indent: 0,
                type: "paragraph",
                version: 1,
            },
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "root",
        version: 1,
    },
});

export function normalizeMainLexicalEditorState(content?: string | null): string {
    return content?.trim() ? content : EMPTY_MAIN_LEXICAL_EDITOR_STATE;
}
