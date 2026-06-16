import type { BrainstormOutputMode } from "@/types/story";

export type StructuredOutputOption = {
  value: BrainstormOutputMode;
  label: string;
  description: string;
};

export type ParsedBrainstormStructuredOutput = {
  chapterOutline?: {
    title?: string;
    content: string;
  };
  storyDecisions: Array<{
    decision: string;
    rationale?: string;
  }>;
  openQuestions: Array<{
    question: string;
    context?: string;
  }>;
};

export const STRUCTURED_OUTPUT_OPTIONS: StructuredOutputOption[] = [
  {
    value: "normal",
    label: "Normal",
    description: "Open-ended brainstorm response.",
  },
  {
    value: "lorebook_entries",
    label: "Lorebook Entries",
    description: "Return importable lorebook entry JSON.",
  },
  {
    value: "chapter_outline",
    label: "Chapter Outline",
    description: "Return a structured chapter outline.",
  },
  {
    value: "story_decisions",
    label: "Story Decisions",
    description: "Return settled decisions from the discussion.",
  },
  {
    value: "open_questions",
    label: "Open Questions",
    description: "Return unresolved story questions.",
  },
];

export function buildBrainstormUserInput(input: string, mode: BrainstormOutputMode): string {
  const instruction = getStructuredOutputInstruction(mode);
  if (!instruction) return input;

  return `${input.trim()}\n\n${instruction}`;
}

export function getStructuredOutputInstruction(mode: BrainstormOutputMode): string {
  switch (mode) {
    case "lorebook_entries":
      return `STRUCTURED OUTPUT MODE: Lorebook Entries
Return useful story knowledge as JSON inside one fenced \`\`\`json code block. Do not include prose outside the code block.
Use this exact shape:
{
  "lorebookEntries": [
    {
      "name": "Entry name",
      "description": "Concise description of the story fact",
      "tags": ["alias", "search term"],
      "category": "character",
      "metadata": {
        "importance": "major",
        "status": "active"
      },
      "isDisabled": false
    }
  ]
}
Allowed category values: "character", "location", "item", "event", "note", "synopsis", "starting scenario", "timeline".
Only include entries that are specific enough to save to a lorebook.`;

    case "chapter_outline":
      return `STRUCTURED OUTPUT MODE: Chapter Outline
Return a chapter outline as JSON inside one fenced \`\`\`json code block. Do not include prose outside the code block.
Use this exact shape:
{
  "chapterOutline": {
    "title": "Optional chapter outline title",
    "content": "Markdown outline with sections, beats, conflicts, turning points, and ending state."
  }
}
Make the outline actionable for drafting and grounded in the provided story context.`;

    case "story_decisions":
      return `STRUCTURED OUTPUT MODE: Story Decisions
Return settled story decisions as JSON inside one fenced \`\`\`json code block. Do not include prose outside the code block.
Use this exact shape:
{
  "storyDecisions": [
    {
      "decision": "The decided story fact or creative direction",
      "rationale": "Why this decision fits, if relevant"
    }
  ]
}
Only include decisions that appear settled by the user or the discussion.`;

    case "open_questions":
      return `STRUCTURED OUTPUT MODE: Open Questions
Return unresolved questions as JSON inside one fenced \`\`\`json code block. Do not include prose outside the code block.
Use this exact shape:
{
  "openQuestions": [
    {
      "question": "The unresolved story question",
      "context": "Why it matters or what needs to be decided"
    }
  ]
}
Focus on questions that would help the writer make the next useful decision.`;

    case "normal":
    default:
      return "";
  }
}

export function parseBrainstormStructuredOutput(message: string): ParsedBrainstormStructuredOutput {
  const parsedBlocks = extractJsonValues(message);
  const result: ParsedBrainstormStructuredOutput = {
    storyDecisions: [],
    openQuestions: [],
  };

  for (const value of parsedBlocks) {
    const outline = parseChapterOutline(value);
    if (outline && !result.chapterOutline) {
      result.chapterOutline = outline;
    }

    result.storyDecisions.push(...parseStoryDecisions(value));
    result.openQuestions.push(...parseOpenQuestions(value));
  }

  return result;
}

function extractJsonValues(message: string): unknown[] {
  if (!message?.trim()) return [];

  const values: unknown[] = [];
  const parse = (text: string): void => {
    try {
      values.push(JSON.parse(text));
    } catch {
      // Ignore non-JSON blocks.
    }
  };

  const fencedJsonRegex = /```json\s*([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;
  while ((match = fencedJsonRegex.exec(message)) !== null) {
    parse(match[1].trim());
  }

  if (values.length > 0) return values;

  const fencedAnyRegex = /```\s*([\s\S]*?)```/gi;
  while ((match = fencedAnyRegex.exec(message)) !== null) {
    parse(match[1].trim());
  }

  if (values.length > 0) return values;

  parse(message.trim());
  return values;
}

function parseChapterOutline(value: unknown): ParsedBrainstormStructuredOutput["chapterOutline"] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const outlineValue = (value as Record<string, unknown>).chapterOutline;

  if (typeof outlineValue === "string" && outlineValue.trim()) {
    return { content: outlineValue.trim() };
  }

  if (!outlineValue || typeof outlineValue !== "object") return undefined;
  const outline = outlineValue as Record<string, unknown>;
  const content = typeof outline.content === "string" ? outline.content.trim() : "";
  if (!content) return undefined;

  return {
    title: typeof outline.title === "string" ? outline.title.trim() : undefined,
    content,
  };
}

function parseStoryDecisions(value: unknown): ParsedBrainstormStructuredOutput["storyDecisions"] {
  if (!value || typeof value !== "object") return [];
  const decisions = (value as Record<string, unknown>).storyDecisions;
  if (!Array.isArray(decisions)) return [];

  const result: ParsedBrainstormStructuredOutput["storyDecisions"] = [];

  for (const item of decisions) {
    if (typeof item === "string") {
      const decision = item.trim();
      if (decision) result.push({ decision });
      continue;
    }

    if (!item || typeof item !== "object") continue;

    const decision = typeof (item as Record<string, unknown>).decision === "string"
      ? ((item as Record<string, unknown>).decision as string).trim()
      : "";
    if (!decision) continue;

    const rationale = typeof (item as Record<string, unknown>).rationale === "string"
      ? ((item as Record<string, unknown>).rationale as string).trim()
      : undefined;

    result.push({ decision, rationale });
  }

  return result;
}

function parseOpenQuestions(value: unknown): ParsedBrainstormStructuredOutput["openQuestions"] {
  if (!value || typeof value !== "object") return [];
  const questions = (value as Record<string, unknown>).openQuestions;
  if (!Array.isArray(questions)) return [];

  const result: ParsedBrainstormStructuredOutput["openQuestions"] = [];

  for (const item of questions) {
    if (typeof item === "string") {
      const question = item.trim();
      if (question) result.push({ question });
      continue;
    }

    if (!item || typeof item !== "object") continue;

    const question = typeof (item as Record<string, unknown>).question === "string"
      ? ((item as Record<string, unknown>).question as string).trim()
      : "";
    if (!question) continue;

    const context = typeof (item as Record<string, unknown>).context === "string"
      ? ((item as Record<string, unknown>).context as string).trim()
      : undefined;

    result.push({ question, context });
  }

  return result;
}
