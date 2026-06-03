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

type SerializedLexicalNode = {
    children?: SerializedLexicalNode[];
    text?: string;
    type?: string;
};

function sanitizeTextNodeNewlines(node: SerializedLexicalNode): boolean {
    let changed = false;

    if (node.type === "text" && typeof node.text === "string" && /\r?\n/.test(node.text)) {
        node.text = node.text
            .replace(/\s*\r?\n\s*/g, " ")
            .replace(/[ \t]{2,}/g, " ");
        changed = true;
    }

    if (Array.isArray(node.children)) {
        for (const child of node.children) {
            changed = sanitizeTextNodeNewlines(child) || changed;
        }
    }

    return changed;
}

function sanitizeMainLexicalEditorState(content: string): string {
    try {
        const parsed = JSON.parse(content) as SerializedLexicalNode;
        return sanitizeTextNodeNewlines(parsed) ? JSON.stringify(parsed) : content;
    } catch {
        return content;
    }
}

export function normalizeMainLexicalEditorState(content?: string | null): string {
    return content?.trim()
        ? sanitizeMainLexicalEditorState(content)
        : EMPTY_MAIN_LEXICAL_EDITOR_STATE;
}
