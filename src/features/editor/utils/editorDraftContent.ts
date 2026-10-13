import type { Chapter } from "@/types/story";

const pendingContents = new Map<string, string>();

export function setEditorDraftContent(chapterId: string, content: string): void {
    pendingContents.set(chapterId, content);
}

export function clearSavedEditorDraft(chapterId: string, savedContent: string): void {
    if (pendingContents.get(chapterId) === savedContent) pendingContents.delete(chapterId);
}

export function getChapterContentForReading(chapter: Pick<Chapter, "id" | "content">): string {
    return pendingContents.get(chapter.id) ?? chapter.content;
}
