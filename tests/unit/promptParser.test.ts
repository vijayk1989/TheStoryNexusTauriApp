import { beforeEach, describe, expect, test } from "vitest";

import { createPromptParser } from "@/features/prompts/services/promptParser";
import { db } from "@/services/database";
import type { Prompt } from "@/types/story";
import { resetTestDb } from "./testDb";

describe("PromptParser", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  test("resolves after_words with a word limit from the start of afterWords", async () => {
    await addPrompt("After text: {{after_words(4)}}");

    const result = await createPromptParser().parse({
      promptId: "unit-prompt",
      storyId: "story-1",
      afterWords: "one two three four five six",
    });

    expect(result.error).toBeUndefined();
    expect(result.messages[0].content).toBe("After text: one two three four");
  });

  test("resolves after_words without arguments using the default limit", async () => {
    await addPrompt("After text: {{after_words}}");

    const result = await createPromptParser().parse({
      promptId: "unit-prompt",
      storyId: "story-1",
      afterWords: "one two three",
    });

    expect(result.error).toBeUndefined();
    expect(result.messages[0].content).toBe("After text: one two three");
  });

  test("resolves after_words to an explicit no-context note when no afterWords context exists", async () => {
    await addPrompt("After text: {{after_words(5)}}");

    const result = await createPromptParser().parse({
      promptId: "unit-prompt",
      storyId: "story-1",
    });

    expect(result.error).toBeUndefined();
    expect(result.messages[0].content).toBe("After text: No after-cursor text was provided.");
  });

  test("resolves after_words to an explicit no-context note when afterWords is blank", async () => {
    await addPrompt("After text: {{after_words(5)}}");

    const result = await createPromptParser().parse({
      promptId: "unit-prompt",
      storyId: "story-1",
      afterWords: "   ",
    });

    expect(result.error).toBeUndefined();
    expect(result.messages[0].content).toBe("After text: No after-cursor text was provided.");
  });
});

async function addPrompt(content: string): Promise<void> {
  const prompt: Prompt = {
    id: "unit-prompt",
    createdAt: new Date(),
    name: "Unit Prompt",
    promptType: "continue_writing",
    messages: [{ role: "user", content }],
    allowedModels: [{ id: "local", name: "local", provider: "local" }],
  };

  await db.prompts.add(prompt);
}
