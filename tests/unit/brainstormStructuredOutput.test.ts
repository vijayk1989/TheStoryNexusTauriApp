import { describe, expect, test } from "vitest";

import parseLorebookJson from "@/features/brainstorm/utils/parseLorebookJson";
import {
  buildBrainstormUserInput,
  parseBrainstormStructuredOutput,
} from "@/features/brainstorm/utils/structuredOutput";

describe("brainstorm structured output", () => {
  test("appends hidden lorebook entry instructions for lorebook mode", () => {
    const input = buildBrainstormUserInput("Extract this character.", "lorebook_entries");

    expect(input).toContain("Extract this character.");
    expect(input).toContain("STRUCTURED OUTPUT MODE: Lorebook Entries");
    expect(input).toContain('"lorebookEntries"');
  });

  test("leaves normal brainstorm input unchanged", () => {
    expect(buildBrainstormUserInput("Talk through this scene.", "normal")).toBe("Talk through this scene.");
  });

  test("parses chapter outline structured JSON", () => {
    const parsed = parseBrainstormStructuredOutput(`
\`\`\`json
{
  "chapterOutline": {
    "title": "The Crossing",
    "content": "## Beats\\n- Arrival\\n- Reversal"
  }
}
\`\`\`
`);

    expect(parsed.chapterOutline).toEqual({
      title: "The Crossing",
      content: "## Beats\n- Arrival\n- Reversal",
    });
  });

  test("parses decisions and open questions structured JSON", () => {
    const parsed = parseBrainstormStructuredOutput(`
\`\`\`json
{
  "storyDecisions": [
    { "decision": "Mara hides the map.", "rationale": "It preserves the mystery." }
  ],
  "openQuestions": [
    { "question": "Who taught Mara the cipher?", "context": "This affects the backstory." }
  ]
}
\`\`\`
`);

    expect(parsed.storyDecisions).toEqual([
      { decision: "Mara hides the map.", rationale: "It preserves the mystery." },
    ]);
    expect(parsed.openQuestions).toEqual([
      { question: "Who taught Mara the cipher?", context: "This affects the backstory." },
    ]);
  });

  test("parses lorebookEntries wrapper for lorebook extraction", () => {
    const parsed = parseLorebookJson(`
\`\`\`json
{
  "lorebookEntries": [
    {
      "name": "Mara",
      "description": "A cartographer with a hidden map.",
      "category": "character",
      "tags": ["cartographer"]
    }
  ]
}
\`\`\`
`);

    expect(parsed.error).toBeUndefined();
    expect(parsed.entries).toEqual([
      {
        name: "Mara",
        description: "A cartographer with a hidden map.",
        category: "character",
        tags: ["cartographer"],
      },
    ]);
  });
});
