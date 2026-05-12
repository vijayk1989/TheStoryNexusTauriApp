export interface LastEditorTarget {
    storyId: string;
    chapterId: string;
}

const LAST_EDITOR_TARGET_KEY = "lastEditedEditorTarget";

export function saveLastEditorTarget(target: LastEditorTarget) {
    localStorage.setItem(LAST_EDITOR_TARGET_KEY, JSON.stringify(target));
}

export function readLastEditorTarget(): LastEditorTarget | null {
    try {
        const raw = localStorage.getItem(LAST_EDITOR_TARGET_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (
            parsed &&
            typeof parsed.storyId === "string" &&
            typeof parsed.chapterId === "string"
        ) {
            return parsed;
        }
    } catch {
        localStorage.removeItem(LAST_EDITOR_TARGET_KEY);
    }
    return null;
}

export function clearLastEditorTarget() {
    localStorage.removeItem(LAST_EDITOR_TARGET_KEY);
}
