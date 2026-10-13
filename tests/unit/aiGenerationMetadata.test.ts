import { afterEach, describe, expect, test, vi } from "vitest";
import { useAIStore } from "@/features/ai/stores/useAIStore";
import { aiService } from "@/services/ai/AIService";
import { db } from "@/services/database";
import type { Prompt } from "@/types/story";

describe("generation metadata request capture", () => {
    afterEach(async () => {
        await db.prompts.delete("metadata-test-prompt");
        useAIStore.setState({ isInitialized: false, settings: null });
    });

    test("captures the resolved producing model and stored prompt before dispatching", async () => {
        const prompt: Prompt = {
            id: "metadata-test-prompt", name: "Stored prompt name", createdAt: new Date(),
            promptType: "scene_beat", messages: [{ role: "user", content: "Template" }], allowedModels: [],
        };
        await db.prompts.put(prompt);
        useAIStore.setState({ isInitialized: true, settings: null });
        const actual = { id: "local/concrete", name: "Concrete model", provider: "local" as const };
        vi.spyOn(aiService, "getGenerationModel").mockReturnValue(actual);
        const generate = vi.spyOn(aiService, "generateWithLocalModel").mockResolvedValue(new Response(""));
        const capture = vi.fn();
        await useAIStore.getState().generateWithParsedMessages(
            [{ role: "user", content: "Resolved prompt" }],
            { id: "unavailable-hosted", name: "Unavailable hosted model", provider: "openrouter" },
            prompt.id, capture,
        );
        expect(capture).toHaveBeenCalledWith(actual, expect.objectContaining({ name: "Stored prompt name" }));
        expect(capture.mock.invocationCallOrder[0]).toBeLessThan(generate.mock.invocationCallOrder[0]);
        expect(generate).toHaveBeenCalledTimes(1);
    });
});
