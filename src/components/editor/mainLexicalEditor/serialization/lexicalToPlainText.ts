type SerializedLexicalNode = {
    type?: string;
    text?: string;
    children?: SerializedLexicalNode[];
};

const BLOCK_TYPES = new Set([
    "paragraph",
    "heading",
    "quote",
    "listitem",
    "linebreak",
]);

function appendNodeText(node: SerializedLexicalNode, chunks: string[]) {
    if (node.type === "text" && typeof node.text === "string") {
        chunks.push(node.text);
        return;
    }

    if (node.children) {
        for (const child of node.children) {
            appendNodeText(child, chunks);
        }
    }

    if (node.type && BLOCK_TYPES.has(node.type)) {
        chunks.push("\n");
    }
}

export function lexicalToPlainText(content: string | SerializedLexicalNode | null | undefined): string {
    if (!content) return "";

    try {
        const state = typeof content === "string" ? JSON.parse(content) : content;
        const chunks: string[] = [];

        if (state.root?.children) {
            for (const child of state.root.children) {
                appendNodeText(child, chunks);
            }
        } else {
            appendNodeText(state, chunks);
        }

        return chunks
            .join("")
            .replace(/[ \t]+\n/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    } catch (error) {
        console.error("lexicalToPlainText - Failed to parse editor content:", error);
        return "";
    }
}

export function countWordsInText(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
}
