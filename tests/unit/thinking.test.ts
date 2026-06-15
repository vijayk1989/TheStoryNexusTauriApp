import { describe, expect, test } from "vitest";

import { splitThinkingContent } from "@/lib/thinking";

describe("splitThinkingContent", () => {
  test("returns prose unchanged when no thinking tags are present", () => {
    expect(splitThinkingContent("The scene opens in rain.")).toEqual({
      thinkingText: "",
      proseText: "The scene opens in rain.",
    });
  });

  test("extracts complete thinking blocks and keeps surrounding prose", () => {
    expect(splitThinkingContent("<think>plan quietly</think>The scene opens.")).toEqual({
      thinkingText: "plan quietly",
      proseText: "The scene opens.",
    });
  });

  test("combines multiple thinking blocks in order", () => {
    expect(splitThinkingContent("<think>first</think>\nProse\n<think>second</think>")).toEqual({
      thinkingText: "first\n\nsecond",
      proseText: "Prose\n",
    });
  });

  test("handles an unclosed thinking block by dropping it from prose", () => {
    expect(splitThinkingContent("Visible prose\n<think>unfinished notes")).toEqual({
      thinkingText: "unfinished notes",
      proseText: "Visible prose\n",
    });
  });

  test("handles an orphan closing tag from streamed content", () => {
    expect(splitThinkingContent("hidden notes</think>Visible prose")).toEqual({
      thinkingText: "hidden notes",
      proseText: "Visible prose",
    });
  });
});
