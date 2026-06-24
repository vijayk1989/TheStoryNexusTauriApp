import type { Chapter, LorebookEntry, Story } from "@/types/story";
import exampleStoryMarkdown from "../../docs/ExampleStory.md?raw";

type LoreSeed = Omit<LorebookEntry, "createdAt">;
type ChapterSeed = Omit<Chapter, "createdAt">;

export const EXAMPLE_STORY_ID = "example-story-iron-salt";

function normalizeLexicalParagraphText(content: string): string {
  return content
    .replace(/\s*\r?\n\s*/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function createParagraphNode(text: string) {
  return {
    children: [
      {
        detail: 0,
        format: 0,
        mode: "normal",
        style: "",
        text,
        type: "text",
        version: 1,
      },
    ],
    direction: "ltr",
    format: "",
    indent: 0,
    type: "paragraph",
    version: 1,
  };
}

function createSceneBeatNode(command: string, sceneBeatId: string) {
  return {
    type: "scene-beat",
    version: 2,
    sceneBeatId,
    command,
    generatedContent: "",
    accepted: false,
    collapsed: false,
  };
}

function getSceneBeatCommand(block: string): string | null {
  const match = block.match(/^\[SceneBeat:\s*([\s\S]+)\]$/);
  return match?.[1]?.trim() || null;
}

function createLexicalState(content: string, idPrefix: string): string {
  const blocks = content
    .split(/(?:\r?\n){2,}/)
    .map(normalizeLexicalParagraphText)
    .filter(Boolean);

  return JSON.stringify({
    root: {
      children: blocks.map((block, index) => {
        const sceneBeatCommand = getSceneBeatCommand(block);
        if (sceneBeatCommand) {
          return createSceneBeatNode(sceneBeatCommand, `${idPrefix}-scene-beat-${index + 1}`);
        }

        return createParagraphNode(block);
      }),
      direction: "ltr",
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  });
}

function countWords(content: string): number {
  const proseOnly = content.replace(/^\[SceneBeat:[\s\S]+?\]$/gm, "");
  const matches = proseOnly.match(/\b[\w']+\b/g);
  return matches?.length ?? 0;
}

function normalizeBody(content: string): string {
  return content
    .replace(/^\s*---\s*$/gm, "")
    .replace(/(?:\r?\n){3,}/g, "\n\n")
    .trim();
}

function splitHeadingSections(markdown: string): Array<{ title: string; body: string }> {
  const sections: Array<{ title: string; body: string }> = [];
  const headingPattern = /^##\s+(.+)$/gm;
  const headings = [...markdown.matchAll(headingPattern)];

  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const nextHeading = headings[index + 1];
    const title = heading[1].trim();
    const start = (heading.index ?? 0) + heading[0].length;
    const end = nextHeading?.index ?? markdown.length;
    const body = normalizeBody(markdown.slice(start, end));
    sections.push({ title, body });
  }

  return sections;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function categoryForLore(title: string): LorebookEntry["category"] {
  const characterNames = new Set(["Mara Venn", "Jonas Pell", "Captain Anik"]);
  const eventNames = new Set(["Arrival Watch", "Themes and Structural Notes"]);
  const locationNames = new Set(["The Merian", "Ring Three Orchard"]);

  if (characterNames.has(title)) return "character";
  if (locationNames.has(title)) return "location";
  if (eventNames.has(title)) return "event";
  if (title === "Horizon Probe" || title === "The Gray Growth") {
    return "item";
  }
  return "note";
}

function aliasesForLore(title: string): string[] {
  const withoutArticle = title.replace(/^The\s+/i, "");
  return Array.from(new Set([title, withoutArticle])).filter(Boolean);
}

function parseExampleStory() {
  const titleMatch = exampleStoryMarkdown.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1]?.trim() || "The Orchard Line";
  const loreHeadingPattern = /^#\s+Glossary and World Lore\s*$/m;
  const loreHeading = exampleStoryMarkdown.match(loreHeadingPattern);
  const loreStart = loreHeading?.index ?? exampleStoryMarkdown.length;
  const storyMarkdown = exampleStoryMarkdown.slice(0, loreStart);
  const loreMarkdown = exampleStoryMarkdown.slice(loreStart);

  const chapters = splitHeadingSections(storyMarkdown).map<ChapterSeed>((chapter, index) => ({
    id: `${EXAMPLE_STORY_ID}-chapter-${index + 1}`,
    storyId: EXAMPLE_STORY_ID,
    title: chapter.title,
    order: index + 1,
    content: createLexicalState(chapter.body, `${EXAMPLE_STORY_ID}-chapter-${index + 1}`),
    summary: "",
    wordCount: countWords(chapter.body),
    povType: "Third Person Limited",
    povCharacter: "Mara Venn",
    isDemo: true,
  }));

  const lorebookEntries = splitHeadingSections(loreMarkdown).map<LoreSeed>((entry) => ({
    id: `${EXAMPLE_STORY_ID}-lore-${slugify(entry.title)}`,
    storyId: EXAMPLE_STORY_ID,
    name: entry.title,
    description: entry.body,
    category: categoryForLore(entry.title),
    aliases: aliasesForLore(entry.title),
    tags: [],
    metadata: {
      importance: "major",
      status: "active",
    },
    isDemo: true,
  }));

  const story: Omit<Story, "createdAt"> = {
    id: EXAMPLE_STORY_ID,
    title,
    synopsis:
      "A compact generation-ship mystery about an ecology apprentice who discovers that the promised planet no longer matches the probe survey her ship has trusted for generations.",
    author: "Example Seed",
    language: "English",
    isDemo: true,
  };

  return { story, chapters, lorebookEntries };
}

export const exampleStorySeed = parseExampleStory();
