/// <reference path="./e2e-globals.d.ts" />

import { expect, type Page, test } from "@playwright/test";

type EditorSnapshot = {
  currentStoryId: string | null;
  currentChapterId: string | null;
  paragraphCount: number;
  sceneBeatCount: number;
  topLevelTypes: string[];
  plainText: string;
  selection: null | {
    isRange: boolean;
    isCollapsed: boolean;
  };
};

const EXAMPLE_STORY_ID = "example-story-iron-salt";
const CHAPTER_EDITOR = '[aria-label="Chapter editor"]';

test.describe("main Lexical editor", () => {
  test.beforeEach(async ({ page }) => {
    await openEditor(page);
  });

  test("loads the seeded Iron Salt chapter as multiple paragraphs", async ({ page }) => {
    const snapshot = await getEditorSnapshot(page);

    expect(snapshot.currentStoryId).toBe(EXAMPLE_STORY_ID);
    expect(snapshot.currentChapterId).toBe(`${EXAMPLE_STORY_ID}-chapter-1`);
    expect(snapshot.paragraphCount).toBeGreaterThan(10);
    expect(snapshot.sceneBeatCount).toBe(0);
    expect(snapshot.topLevelTypes[0]).toBe("paragraph");
    expect(snapshot.plainText).toContain("Tavin");
  });

  test("keeps a valid selection after pressing Enter in seeded prose", async ({ page }) => {
    const before = await getEditorSnapshot(page);

    await placeCursorAtTopLevelNode(page, 0, "end");
    await page.keyboard.press("Enter");

    await expect.poll(() => getEditorSnapshot(page).then((snapshot) => snapshot.paragraphCount)).toBeGreaterThan(before.paragraphCount);

    const after = await getEditorSnapshot(page);
    expect(after.selection).toMatchObject({
      isRange: true,
      isCollapsed: true,
    });
  });

  test("inserts a SceneBeat with a trailing paragraph", async ({ page }) => {
    await placeCursorAtTopLevelNode(page, 0, "end");
    await page.keyboard.press("Alt+S");

    const after = await waitForEditorSnapshot(page, (snapshot) => snapshot.sceneBeatCount === 1);

    expect(after.topLevelTypes[1]).toBe("scene-beat");
    expect(after.topLevelTypes[2]).toBe("paragraph");
  });

  test("Backspace from an empty paragraph after a SceneBeat removes only the SceneBeat", async ({ page }) => {
    const before = await getEditorSnapshot(page);

    await placeCursorAtTopLevelNode(page, 0, "end");
    await page.keyboard.press("Alt+S");
    await waitForEditorSnapshot(page, (snapshot) => snapshot.sceneBeatCount === 1);

    await placeCursorAtTopLevelNode(page, 2, "start");
    await page.keyboard.press("Backspace");

    const after = await waitForEditorSnapshot(page, (snapshot) => snapshot.sceneBeatCount === 0);
    expect(after.paragraphCount).toBe(before.paragraphCount + 1);
    expect(after.selection).toMatchObject({
      isRange: true,
      isCollapsed: true,
    });
  });

  test("autosaves edited prose back to IndexedDB", async ({ page }) => {
    const marker = ` E2E autosave marker ${Date.now()}.`;

    await placeCursorAtTopLevelNode(page, 0, "end");
    await page.keyboard.type(marker);

    await expect.poll(() => getPersistedChapterContent(page), {
      timeout: 8_000,
    }).toContain(marker.trim());
  });

  test("resolves chapter_content from the current chapter", async ({ page }) => {
    const messages = await resolvePromptMessages(page, "Chapter text:\n{{chapter_content}}");

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("Chapter text:");
    expect(messages[0]).toContain("Tavin");
    expect(messages[0]).not.toContain("{{chapter_content}}");
  });

  test("resolves full previous chapter content variables", async ({ page }) => {
    const chapterThreeId = `${EXAMPLE_STORY_ID}-chapter-3`;
    const messages = await resolvePromptMessages(
      page,
      [
        "All previous:",
        "{{all_previous_chapters}}",
        "Last previous:",
        "{{previous_chapter(1)}}",
      ].join("\n"),
      { chapterId: chapterThreeId }
    );

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("Chapter 1: Chapter One");
    expect(messages[0]).toContain("Tavin broke the");
    expect(messages[0]).toContain("Chapter 2: Chapter Two");
    expect(messages[0]).toContain("The fever hit before dawn.");
    expect(messages[0]).not.toContain("Chapter 3: Chapter Three");
    expect(messages[0]).not.toContain("{{all_previous_chapters}}");
    expect(messages[0]).not.toContain("{{previous_chapter(1)}}");

    const lastPrevious = messages[0]?.split("Last previous:")[1] || "";
    expect(lastPrevious).not.toContain("Chapter 1: Chapter One");
    expect(lastPrevious).toContain("Chapter 2: Chapter Two");
  });
});

async function openEditor(page: Page) {
  await page.goto("/");

  await expect(page.locator(CHAPTER_EDITOR).first()).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const api = window.__STORY_NEXUS_E2E__;
    return !!api?.getEditorSnapshot().currentChapterId;
  });

  await waitForEditorSnapshot(page, (snapshot) => snapshot.paragraphCount > 0);
}

async function getEditorSnapshot(page: Page): Promise<EditorSnapshot> {
  return page.evaluate(() => {
    const api = window.__STORY_NEXUS_E2E__;
    if (!api) {
      throw new Error("Story Nexus E2E API is not available. Did Vite start with VITE_E2E=true?");
    }
    return api.getEditorSnapshot();
  });
}

async function waitForEditorSnapshot(
  page: Page,
  predicate: (snapshot: EditorSnapshot) => boolean
): Promise<EditorSnapshot> {
  let latest: EditorSnapshot | null = null;

  await expect.poll(async () => {
    latest = await getEditorSnapshot(page);
    return predicate(latest);
  }).toBe(true);

  if (!latest) {
    throw new Error("Editor snapshot never became available.");
  }

  return latest;
}

async function placeCursorAtTopLevelNode(
  page: Page,
  index: number,
  position: "start" | "end"
) {
  await page.evaluate(
    ({ index, position }) => {
      const api = window.__STORY_NEXUS_E2E__;
      if (!api) {
        throw new Error("Story Nexus E2E API is not available.");
      }
      return api.placeCursorAtTopLevelNode(index, position);
    },
    { index, position }
  );
}

async function getPersistedChapterContent(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const api = window.__STORY_NEXUS_E2E__;
    if (!api) {
      throw new Error("Story Nexus E2E API is not available.");
    }
    return api.getPersistedChapterContent();
  });
}

async function resolvePromptMessages(
  page: Page,
  content: string,
  options?: { chapterId?: string }
): Promise<Array<string | null>> {
  return page.evaluate(({ promptContent, promptOptions }) => {
    const api = window.__STORY_NEXUS_E2E__;
    if (!api) {
      throw new Error("Story Nexus E2E API is not available.");
    }
    return api.resolvePromptMessages(promptContent, promptOptions);
  }, { promptContent: content, promptOptions: options });
}
