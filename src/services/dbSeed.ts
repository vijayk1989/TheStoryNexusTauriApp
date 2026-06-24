import { db } from "./database";
import { Prompt } from "../types/story";
import { EXAMPLE_STORY_ID, exampleStorySeed } from "../data/exampleStory";
import systemPrompts from "../data/systemPrompts";

export class DatabaseSeeder {
  private static instance: DatabaseSeeder;
  private static isInitialized = false;

  private constructor() {}

  public static getInstance(): DatabaseSeeder {
    if (!DatabaseSeeder.instance) {
      DatabaseSeeder.instance = new DatabaseSeeder();
    }
    return DatabaseSeeder.instance;
  }

  /**
   * Initialize the database with seed data
   * @param forceReseed If true, will reseed system prompts even if they already exist
   */
  public async initialize(forceReseed = false): Promise<void> {
    await db.open();

    // Only run once per app lifecycle unless forceReseed is true
    if (DatabaseSeeder.isInitialized && !forceReseed) {
      console.log("Database already initialized in this session.");
      return;
    }

    try {
      console.log("Initializing database with seed data...");

      const needsSystemPromptSeeding = await this.checkIfSystemPromptSeedingNeeded();

      if (needsSystemPromptSeeding || forceReseed) {
        await this.seedSystemPrompts(forceReseed);
      } else {
        console.log("Database already contains system prompts. Skipping prompt seeding.");
      }

      await this.syncContinueWritingSystemPrompt();
      await this.disableSystemPromptAdvancedSampling();
      await this.seedExampleStory(forceReseed);

      console.log("Database seeding complete.");
      DatabaseSeeder.isInitialized = true;
    } catch (error) {
      console.error("Error initializing database:", error);
      throw error;
    }
  }

  /**
   * Force a reseed of system prompts
   */
  public async forceReseedSystemPrompts(): Promise<void> {
    console.log("Force reseeding system prompts...");
    await this.seedSystemPrompts(true);
    console.log("System prompts reseeded successfully.");
  }

  /**
   * Check if seeding is needed by looking for system prompts
   */
  private async checkIfSystemPromptSeedingNeeded(): Promise<boolean> {
    // Get all system prompt IDs from the systemPrompts data
    const systemPromptIds = systemPrompts.map((prompt) => prompt.id);

    // Check if all system prompts exist in the database
    for (const promptId of systemPromptIds) {
      const exists = await db.prompts.get(promptId);
      if (!exists) {
        console.log(
          `System prompt with ID ${promptId} not found. Seeding needed.`
        );
        return true;
      }
    }

    return false;
  }

  /**
   * Seed system prompts
   * @param forceReseed If true, will replace existing prompts with the same ID
   */
  private async seedSystemPrompts(forceReseed = false): Promise<void> {
    console.log("Seeding system prompts...");

    if (forceReseed) {
      // Clear all existing system prompts when force reseeding
      console.log("Force reseeding - clearing all existing system prompts...");
      const systemPromptCount = await db.prompts
        .where("isSystem")
        .equals(1)
        .count();
      if (systemPromptCount > 0) {
        await db.prompts.where("isSystem").equals(1).delete();
        console.log(`Deleted ${systemPromptCount} existing system prompts.`);
      }
    }

    for (const promptData of systemPrompts) {
      // Check if this prompt already exists
      const exists = await db.prompts.get(promptData.id!);

      if (exists && !forceReseed) {
        console.log(
          `System prompt ${promptData.name} already exists. Skipping.`
        );
        continue;
      }

      if (exists && forceReseed) {
        console.log(`Replacing system prompt: ${promptData.name}`);
        await db.prompts.update(promptData.id!, {
          ...promptData,
          createdAt: exists.createdAt, // Keep the original creation date
        });
      } else {
        console.log(`Adding system prompt: ${promptData.name}`);
        await db.prompts.add({
          ...promptData,
          createdAt: new Date(),
        } as Prompt);
      }
    }
  }

  private async syncContinueWritingSystemPrompt(): Promise<void> {
    const promptData = systemPrompts.find((prompt) => prompt.id === "continue-writing-system");
    if (!promptData?.id) return;

    const existing = await db.prompts.get(promptData.id);
    if (!existing?.isSystem) return;

    const existingMessages = JSON.stringify(existing.messages ?? []);
    if (existingMessages.includes("{{after_words")) return;

    console.log("Updating Continue Writing system prompt with after-cursor context support.");
    await db.prompts.update(promptData.id, {
      ...promptData,
      createdAt: existing.createdAt,
      isSystem: true,
    });
  }

  private async disableSystemPromptAdvancedSampling(): Promise<void> {
    await db.transaction("rw", db.prompts, async () => {
      for (const promptData of systemPrompts) {
        const existingPrompt = await db.prompts.get(promptData.id!);
        if (!existingPrompt?.isSystem) continue;

        await db.prompts.update(promptData.id!, {
          top_p: 0,
          top_k: 0,
          repetition_penalty: 0,
          min_p: 0,
        });
      }
    });
  }

  /**
   * Seed the example story from docs/ExampleStory.md.
   * This runs independently from prompt seeding so existing local databases get
   * the test story on their next startup without duplicate rows.
   */
  private async seedExampleStory(forceReseed = false): Promise<void> {
    const existing = await db.stories.get(EXAMPLE_STORY_ID);

    const shouldReplaceLegacyDemo =
      existing?.isDemo === true &&
      existing.title === "Iron Salt" &&
      exampleStorySeed.story.title !== existing.title;

    if (existing && !forceReseed && !shouldReplaceLegacyDemo) {
      await this.repairExistingExampleStoryChapters();
      console.log("Example story already exists. Skipping.");
      return;
    }

    if (existing && (forceReseed || shouldReplaceLegacyDemo)) {
      console.log("Force reseeding - replacing example story...");
      await db.deleteStoryWithRelated(EXAMPLE_STORY_ID);
    }

    const createdAt = new Date();

    await db.transaction(
      "rw",
      [db.stories, db.chapters, db.lorebookEntries],
      async () => {
        await db.stories.add({
          ...exampleStorySeed.story,
          createdAt,
        });

        await db.chapters.bulkAdd(
          exampleStorySeed.chapters.map((chapter) => ({
            ...chapter,
            createdAt,
          }))
        );

        await db.lorebookEntries.bulkAdd(
          exampleStorySeed.lorebookEntries.map((entry) => ({
            ...entry,
            createdAt,
          }))
        );
      }
    );

    console.log(
      `Seeded example story "${exampleStorySeed.story.title}" with ${exampleStorySeed.chapters.length} chapters and ${exampleStorySeed.lorebookEntries.length} lore entries.`
    );
  }

  private async repairExistingExampleStoryChapters(): Promise<void> {
    const seedChaptersById = new Map(
      exampleStorySeed.chapters.map((chapter) => [chapter.id, chapter])
    );
    const chapters = await db.chapters
      .where("storyId")
      .equals(EXAMPLE_STORY_ID)
      .toArray();
    const updates = chapters
      .map((chapter) => {
        const seedChapter = seedChaptersById.get(chapter.id);
        if (!seedChapter || !chapter.isDemo) return null;
        if (!isSameLexicalPlainText(chapter.content, seedChapter.content)) return null;
        if (!shouldRepairSeededChapterContent(chapter.content)) return null;
        return { id: chapter.id, content: seedChapter.content };
      })
      .filter((update): update is { id: string; content: string } => update !== null);

    if (updates.length === 0) return;

    await db.transaction("rw", db.chapters, async () => {
      for (const update of updates) {
        await db.chapters.update(update.id, { content: update.content });
      }
    });

    console.log(`Repaired ${updates.length} existing example story chapter(s).`);
  }
}

function shouldRepairSeededChapterContent(content: string): boolean {
  try {
    const parsed = JSON.parse(content);
    const children = parsed?.root?.children;
    if (!Array.isArray(children)) return false;

    const textNodes = collectTextNodes(parsed.root);
    const hasTextNodeNewlines = textNodes.some((node) => /\r?\n/.test(node.text));
    return hasTextNodeNewlines || children.length <= 3;
  } catch {
    return false;
  }
}

function isSameLexicalPlainText(left: string, right: string): boolean {
  return normalizePlainText(extractLexicalPlainText(left)) === normalizePlainText(extractLexicalPlainText(right));
}

function extractLexicalPlainText(content: string): string {
  try {
    const parsed = JSON.parse(content);
    return collectTextNodes(parsed?.root)
      .map((node) => node.text)
      .join(" ");
  } catch {
    return "";
  }
}

function collectTextNodes(node: unknown): Array<{ text: string }> {
  if (!node || typeof node !== "object") return [];
  const current = node as { children?: unknown; text?: unknown; type?: unknown };
  const ownText = current.type === "text" && typeof current.text === "string"
    ? [{ text: current.text }]
    : [];
  if (!Array.isArray(current.children)) return ownText;
  return ownText.concat(current.children.flatMap(collectTextNodes));
}

function normalizePlainText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// Export singleton instance
export const dbSeeder = DatabaseSeeder.getInstance();
