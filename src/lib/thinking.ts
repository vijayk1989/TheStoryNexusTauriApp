export interface ThinkingSplit {
    thinkingText: string;
    proseText: string;
}

export function splitThinkingContent(raw: string): ThinkingSplit {
    const thinkParts: string[] = [];
    let prose = raw.replace(/<think>([\s\S]*?)<\/think>/gi, (_match, content: string) => {
        thinkParts.push(content.trim());
        return "";
    });

    const openThinkIndex = prose.search(/<think>/i);
    if (openThinkIndex !== -1) {
        thinkParts.push(prose.slice(openThinkIndex + "<think>".length).trim());
        prose = prose.slice(0, openThinkIndex);
    }

    if (thinkParts.length === 0) {
        const closeThinkIndex = prose.search(/<\/think>/i);
        if (closeThinkIndex !== -1) {
            thinkParts.push(prose.slice(0, closeThinkIndex).trim());
            prose = prose.slice(closeThinkIndex + "</think>".length);
        }
    }

    return {
        thinkingText: thinkParts.filter(Boolean).join("\n\n").trim(),
        proseText: prose.trimStart(),
    };
}
