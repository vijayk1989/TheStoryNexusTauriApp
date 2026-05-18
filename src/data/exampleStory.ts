import type { Chapter, LorebookEntry, Story } from "@/types/story";
import exampleStoryMarkdown from "../../docs/ExampleStory.md?raw";

type LoreSeed = Omit<LorebookEntry, "createdAt">;
type ChapterSeed = Omit<Chapter, "createdAt">;

export const EXAMPLE_STORY_ID = "example-story-iron-salt";

function createLexicalState(content: string): string {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return JSON.stringify({
    root: {
      children: paragraphs.map((paragraph) => ({
        children: [
          {
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text: paragraph,
            type: "text",
            version: 1,
          },
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1,
      })),
      direction: "ltr",
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  });
}

function countWords(content: string): number {
  const matches = content.match(/\b[\w']+\b/g);
  return matches?.length ?? 0;
}

function normalizeBody(content: string): string {
  return content
    .replace(/^\s*---\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
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
  const characterNames = new Set(["Tavin", "Mira", "Captain Varo", "Sered", "Bren"]);
  const eventNames = new Set(["The Flood Wars", "Themes and Structural Notes"]);
  const locationNames = new Set(["Kel Harrow", "The Hollow Stair"]);

  if (characterNames.has(title)) return "character";
  if (locationNames.has(title)) return "location";
  if (eventNames.has(title)) return "event";
  if (title === "Deepstone" || title === "The Bells" || title === "Seal Contracts") {
    return "item";
  }
  return "note";
}

function tagsForLore(title: string): string[] {
  const withoutArticle = title.replace(/^The\s+/i, "");
  return Array.from(new Set([title, withoutArticle])).filter(Boolean);
}

function parseExampleStory() {
  const titleMatch = exampleStoryMarkdown.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1]?.trim() || "Iron Salt";
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
    content: createLexicalState(chapter.body),
    summary: "",
    wordCount: countWords(chapter.body),
    povType: "Third Person Limited",
    povCharacter: "Tavin",
    isDemo: true,
  }));

  const lorebookEntries = splitHeadingSections(loreMarkdown).map<LoreSeed>((entry) => ({
    id: `${EXAMPLE_STORY_ID}-lore-${slugify(entry.title)}`,
    storyId: EXAMPLE_STORY_ID,
    name: entry.title,
    description: entry.body,
    category: categoryForLore(entry.title),
    tags: tagsForLore(entry.title),
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
      "A fantasy-industrial story about a forge laborer altered by deepstone after an ancient warning bell wakes beneath Kel Harrow.",
    author: "Example Seed",
    language: "English",
    isDemo: true,
  };

  return { story, chapters, lorebookEntries };
}

export const exampleStorySeed = parseExampleStory();
