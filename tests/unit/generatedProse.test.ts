import { describe, expect, test } from "vitest";
import { $getRoot, createEditor } from "lexical";
import { $generateHtmlFromNodes } from "@lexical/html";
import { GeneratedProseNode, $createAcceptedProse } from "@/components/editor/mainLexicalEditor/nodes/GeneratedProseNode";
import { lexicalToPlainText, countWordsInText } from "@/components/editor/mainLexicalEditor/serialization/lexicalToPlainText";
import { convertLexicalToHtml } from "@/utils/exportUtils";
import { captureProseGeneration } from "@/features/scenebeats/services/proseGenerationMetadata";

describe("generated prose attribution", () => {
    test("snapshots generation inputs independently of later model and prompt changes", () => {
        const model = { id: "local/test-model", name: "Test model", provider: "local" as const };
        const messages = [{ role: "user" as const, content: "Original prompt" }];
        const prompt = { id: "prompt-1", name: "Original name" };
        const generation = captureProseGeneration({ sceneBeatId: "beat-1", command: "Original instruction" }, prompt, messages, model, "standard");
        model.name = "Changed model";
        messages[0].content = "Changed prompt";
        prompt.name = "Renamed prompt";
        expect(generation.model?.name).toBe("Test model");
        expect(generation.promptName).toBe("Original name");
        expect(generation.promptMessages[0].content).toBe("Original prompt");
    });

    test("round-trips editable paragraphs and exports only manuscript prose", async () => {
        const generation = captureProseGeneration({ sceneBeatId: "beat-1", command: "Instruction" }, { id: "prompt-1", name: "Secret prompt label" }, [{ role: "user", content: "Secret prompt text" }], { id: "test", name: "Secret model label", provider: "local" }, "standard");
        const editor = createEditor({ nodes: [GeneratedProseNode], onError: (error) => { throw error; } });
        editor.update(() => { $getRoot().append($createAcceptedProse("First paragraph.\n\nSecond paragraph.", generation)); }, { discrete: true });
        const serialized = JSON.stringify(editor.getEditorState().toJSON());
        const restored = createEditor({ nodes: [GeneratedProseNode], onError: (error) => { throw error; } });
        restored.setEditorState(restored.parseEditorState(serialized));
        expect(restored.getEditorState().toJSON()).toEqual(editor.getEditorState().toJSON());
        const prose = lexicalToPlainText(serialized);
        expect(prose).toBe("First paragraph.\nSecond paragraph.");
        expect(countWordsInText(prose)).toBe(4);
        const html = await convertLexicalToHtml(serialized);
        expect(html).toBe("<p>First paragraph.</p><p>Second paragraph.</p>");
        editor.getEditorState().read(() => {
            const clipboardHtml = $generateHtmlFromNodes(editor);
            expect(clipboardHtml).toContain("Second paragraph.");
            expect(clipboardHtml).not.toContain("Secret");
            expect($getRoot().getTextContent()).not.toContain("Secret");
        });
    });
});
