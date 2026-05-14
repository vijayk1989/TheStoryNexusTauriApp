export const EMPTY_CHAPTER_CONTENT = JSON.stringify({
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

export function normalizeChapterContent(content?: string | null): string {
    return content?.trim() ? content : EMPTY_CHAPTER_CONTENT;
}
