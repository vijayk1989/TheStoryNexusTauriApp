import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { $createParagraphNode, $createTextNode, $getRoot, createEditor } from "lexical";
import { GeneratedProseNode, $createAcceptedProse } from "@/components/editor/mainLexicalEditor/nodes/GeneratedProseNode";
import { lexicalToPlainText } from "@/components/editor/mainLexicalEditor/serialization/lexicalToPlainText";
import { captureProseGeneration } from "@/features/scenebeats/services/proseGenerationMetadata";
import { useChapterStore } from "@/features/chapters/stores/useChapterStore";
import { getChapterContentForReading, setEditorDraftContent, clearSavedEditorDraft } from "@/features/editor/utils/editorDraftContent";
import { createPromptParser } from "@/features/prompts/services/promptParser";
import { convertLexicalToHtml, downloadChapter, downloadStory } from "@/utils/exportUtils";
import { db } from "@/services/database";
import { resetTestDb } from "./testDb";

function editorFixture(disabled = true) {
    const editor = createEditor({ nodes: [GeneratedProseNode], onError: (error) => { throw error; } });
    editor.update(() => {
        const metadata = captureProseGeneration({ sceneBeatId: "beat", command: "Write prose" }, { id: "prompt", name: "Prompt" }, [], { id: "local/test", name: "Test", provider: "local" }, "standard");
        const block = $createAcceptedProse("EXCLUDED_SENTINEL\n\nEXCLUDED_SECOND_PARAGRAPH", metadata) as GeneratedProseNode;
        block.setDisabled(disabled);
        $getRoot().append($createParagraphNode().append($createTextNode("Active opening.")), block, $createParagraphNode().append($createTextNode("Active ending.")));
    }, { discrete: true });
    return editor;
}

describe("disabled prose", () => {
    beforeEach(async () => {
        await resetTestDb();
        await db.stories.put({ id: "disabled-story", title: "Story", author: "Test", language: "English", createdAt: new Date() });
        await db.chapters.put({ id: "disabled-chapter", storyId: "disabled-story", title: "Chapter", order: 1, wordCount: 0, createdAt: new Date(), content: JSON.stringify(editorFixture().getEditorState().toJSON()) });
    });
    afterEach(() => clearSavedEditorDraft("disabled-chapter", getChapterContentForReading({ id: "disabled-chapter", content: "" })));

    test("persists disabled contents but excludes them from chapter and summary prompt text", async () => {
        const chapter = (await db.chapters.get("disabled-chapter"))!;
        const restored = editorFixture(false);
        restored.setEditorState(restored.parseEditorState(chapter.content));
        expect(restored.getEditorState().toJSON().root.children[1]).toMatchObject({ disabled: true });
        expect(chapter.content).toContain("EXCLUDED_SENTINEL");
        expect(lexicalToPlainText(chapter.content)).toBe("Active opening.\nActive ending.");
        expect(await useChapterStore.getState().getChapterPlainText(chapter.id)).toBe("Active opening.\n\nActive ending.");
        await db.prompts.put({ id: "disabled-prompt", name: "Summary test", createdAt: new Date(), promptType: "gen_summary", allowedModels: [], messages: [{ role: "user", content: "Summarize: {{chapter_content}}" }] });
        const parsed = await createPromptParser().parse({ storyId: chapter.storyId, chapterId: chapter.id, promptId: "disabled-prompt" });
        expect(parsed.error).toBeUndefined();
        expect(parsed.messages[0].content).toContain("Active ending.");
        expect(parsed.messages[0].content).not.toContain("EXCLUDED");
        await useChapterStore.getState().updateChapter(chapter.id, { content: chapter.content });
        expect((await db.chapters.get(chapter.id))?.wordCount).toBe(4);
    });

    test("excludes disabled prose from chapter and story manuscript exports", async () => {
        const content = (await db.chapters.get("disabled-chapter"))!.content;
        expect(await convertLexicalToHtml(content)).not.toContain("EXCLUDED");
        const blobs: Blob[] = [];
        vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => { blobs.push(blob as Blob); return "blob:test"; });
        vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
        vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
        await downloadChapter("disabled-chapter", "html");
        await downloadChapter("disabled-chapter", "text");
        await downloadStory("disabled-story", "html");
        await downloadStory("disabled-story", "text");
        expect(blobs).toHaveLength(4);
        for (const blob of blobs) {
            const exported = await blob.text();
            expect(exported).toContain("Active opening.");
            expect(exported).toContain("Active ending.");
            expect(exported).not.toContain("EXCLUDED");
        }
    });

    test("uses a pending disabled-state change before autosave and keeps newer edits when an older save finishes", async () => {
        const chapter = (await db.chapters.get("disabled-chapter"))!;
        const enabledContent = JSON.stringify(editorFixture(false).getEditorState().toJSON());
        await db.chapters.update(chapter.id, { content: enabledContent });
        setEditorDraftContent(chapter.id, chapter.content);
        expect(await useChapterStore.getState().getChapterPlainText(chapter.id)).not.toContain("EXCLUDED");
        clearSavedEditorDraft(chapter.id, enabledContent);
        expect(getChapterContentForReading({ ...chapter, content: enabledContent })).toBe(chapter.content);
        clearSavedEditorDraft(chapter.id, chapter.content);
        expect(await useChapterStore.getState().getChapterPlainText(chapter.id)).toContain("EXCLUDED_SENTINEL");
    });
});
