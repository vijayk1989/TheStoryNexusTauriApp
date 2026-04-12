/**
 * Utilities for handling <think>...</think> blocks emitted by reasoning models.
 * The thinking content is separated so it can be displayed independently from
 * the prose output.
 */

export interface ThinkingSplit {
    /** The model's internal reasoning text (content of <think> blocks). */
    thinkingText: string;
    /** The actual prose output, with all <think> blocks removed. */
    proseText: string;
}

/**
 * Split raw model output that may contain `<think>...</think>` blocks.
 *
 * Handles:
 * - Multiple complete `<think>...</think>` blocks
 * - An unclosed `<think>` block that is still streaming
 */
export function splitThinkingContent(raw: string): ThinkingSplit {
    const thinkParts: string[] = [];

    // Extract complete <think>...</think> blocks (case-insensitive, greedy-safe)
    let prose = raw.replace(/<think>([\s\S]*?)<\/think>/gi, (_, content: string) => {
        thinkParts.push(content.trim());
        return '';
    });

    // Handle an incomplete open <think> block still being streamed
    const openIdx = prose.search(/<think>/i);
    if (openIdx !== -1) {
        const innerContent = prose.slice(openIdx + '<think>'.length);
        thinkParts.push(innerContent);
        prose = prose.slice(0, openIdx);
    }

    // Handle orphan </think>: some models (via LMStudio) suppress the opening <think> token
    // but emit </think> as plain text. Everything before </think> is thinking content.
    if (thinkParts.length === 0) {
        const closeIdx = prose.search(/<\/think>/i);
        if (closeIdx !== -1) {
            thinkParts.push(prose.slice(0, closeIdx).trim());
            prose = prose.slice(closeIdx + '</think>'.length);
        }
    }

    return {
        proseText: prose.trimStart(),
        thinkingText: thinkParts.join('\n\n').trim(),
    };
}
