import { beforeEach, describe, expect, test, vi } from "vitest";

import { aiService } from "@/services/ai/AIService";

describe("AIService.generateWithOpenAI", () => {
  let createCompletion: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createCompletion = vi.fn(async function* () {
      // Empty stream; these tests only assert the generated request body.
    });

    const service = aiService as any;
    service.settings = {
      id: "settings",
      createdAt: new Date(),
      openaiKey: "test-key",
      availableModels: [],
    };
    service.openAI = {
      chat: {
        completions: {
          create: createCompletion,
        },
      },
    };
    service.abortController = null;
  });

  test("uses max_tokens for OpenAI models that still accept it", async () => {
    await aiService.generateWithOpenAI(
      [{ role: "user", content: "Write a line." }],
      "gpt-4.1-mini",
      0.7,
      512
    );

    expect(createCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4.1-mini",
        max_tokens: 512,
      }),
      expect.any(Object)
    );
    expect(createCompletion.mock.calls[0][0]).not.toHaveProperty("max_completion_tokens");
  });

  test.each(["gpt-5", "gpt-5-mini", "o1", "o3-mini", "o4-mini"])(
    "uses max_completion_tokens for %s",
    async (modelId) => {
      await aiService.generateWithOpenAI(
        [{ role: "user", content: "Write a line." }],
        modelId,
        0.7,
        512
      );

      expect(createCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          model: modelId,
          max_completion_tokens: 512,
        }),
        expect.any(Object)
      );
      expect(createCompletion.mock.calls[0][0]).not.toHaveProperty("max_tokens");
    }
  );
});
