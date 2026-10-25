/// <reference path="./e2e-globals.d.ts" />

import { expect, type Page, test } from "@playwright/test";
import type { ProseGenerationMetadata } from "../src/types/story";

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

  test("loads the seeded example chapter as multiple paragraphs", async ({ page }) => {
    const snapshot = await getEditorSnapshot(page);

    expect(snapshot.currentStoryId).toBe(EXAMPLE_STORY_ID);
    expect(snapshot.currentChapterId).toBe(`${EXAMPLE_STORY_ID}-chapter-1`);
    expect(snapshot.paragraphCount).toBeGreaterThan(10);
    expect(snapshot.sceneBeatCount).toBe(0);
    expect(snapshot.topLevelTypes[0]).toBe("paragraph");
    expect(snapshot.plainText).toContain("Mara Venn");
  });

  test("copies the whole chapter from Download and pastes rich text without generation controls", async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await acceptProseFixture(page);
    await placeCursorAtTopLevelNode(page, 3, 'start');
    await page.locator('#main-editor-block-type:visible').selectOption('h2');
    await page.getByRole('button', { name: 'Download', exact: true }).filter({ visible: true }).click();
    await page.getByRole('menuitem', { name: 'Copy to clipboard', exact: true }).click();
    await expect(page.getByText('Chapter copied to clipboard', { exact: true })).toBeVisible();
    const clipboard = await page.evaluate(async () => {
      const [item] = await navigator.clipboard.read();
      return { html: await (await item.getType('text/html')).text(), text: await (await item.getType('text/plain')).text() };
    });
    expect(clipboard.text).toContain('Mara Venn');
    expect(clipboard.text).toContain('Fixture first paragraph.');
    expect(clipboard.text).toContain('Fixture second paragraph.');
    expect(clipboard.html).not.toMatch(/Fixture model|Fixture prompt|Original prompt sent|Write fixture prose|Generation details/);
    await page.evaluate(() => {
      const target = document.createElement('div');
      target.contentEditable = 'true';
      target.setAttribute('role', 'textbox');
      target.setAttribute('aria-label', 'Rich text paste target');
      document.body.append(target);
      target.focus();
    });
    await page.keyboard.press('Control+V');
    const target = page.getByRole('textbox', { name: 'Rich text paste target' });
    await expect(target.locator('h2')).toHaveText('Fixture first paragraph.');
    await expect(target).toContainText('Mara Venn');
    await expect(target).toContainText('Fixture second paragraph.');
  });

  test("accepts attributed prose, hides labels without losing metadata, and reloads it", async ({ page }) => {
    await acceptProseFixture(page);
    const block = page.locator(".sn-generated-prose:visible");
    await expect(block.locator(".sn-generated-prose-content p")).toHaveCount(2);
    await expect(block.getByRole("button", { name: "Select generated prose:" })).toContainText("Fixture model · Fixture prompt");
    await block.getByRole("button", { name: "Generation details" }).click();
    await expect(page.getByRole("dialog")).toContainText("Original prompt sent");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Show generation labels", exact: true }).click();
    await expect(block.locator(".sn-generated-prose-header")).toBeHidden();
    await expect.poll(() => getPersistedChapterContent(page)).toContain('"type":"generated-prose"');
    await page.reload();
    await page.waitForFunction(() => !!window.__STORY_NEXUS_E2E__);
    await expect(page.getByRole("button", { name: "Show generation labels", exact: true })).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".sn-generated-prose:visible .sn-generated-prose-header")).toBeHidden();
    await page.getByRole("button", { name: "Show generation labels", exact: true }).click();
    await expect(page.getByRole("button", { name: "Select generated prose:" })).toBeVisible();
    const persisted = JSON.parse((await getPersistedChapterContent(page))!);
    const savedBlock = persisted.root.children.find((node: { type: string }) => node.type === "generated-prose");
    expect(savedBlock.generation).toMatchObject({ promptName: "Fixture prompt", model: { name: "Fixture model" } });
    expect(savedBlock.children).toHaveLength(2);
  });

  test("selects and deletes the labelled prose block with undo and redo", async ({ page }) => {
    await acceptProseFixture(page);
    await page.getByRole("button", { name: "Select generated prose:" }).click();
    await expect(page.locator(".sn-generated-prose:visible")).toHaveClass(/sn-generated-prose-selected/);
    await page.keyboard.press("Delete");
    await expect(page.locator(".sn-generated-prose:visible")).toHaveCount(0);
    expect((await getEditorSnapshot(page)).sceneBeatCount).toBe(1);
    expect((await getEditorSnapshot(page)).plainText).not.toContain("Fixture first paragraph");
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.locator(".sn-generated-prose:visible")).toHaveCount(1);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(page.locator(".sn-generated-prose:visible")).toHaveCount(0);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await page.getByRole("button", { name: "Select generated prose:" }).click();
    await page.keyboard.press("Backspace");
    await expect(page.locator(".sn-generated-prose:visible")).toHaveCount(0);
  });

  test("removes a prose label and border while preserving formatted content, history, and persistence", async ({ page }) => {
    await acceptProseFixture(page);
    await placeCursorAtTopLevelNode(page, 3, "start");
    await page.locator("#main-editor-block-type:visible").selectOption("h2");
    await placeCursorAtTopLevelNode(page, 3, "end");
    await page.keyboard.type(" Edited prose.");
    const before = await page.evaluate(() => window.__STORY_NEXUS_E2E__!.getEditorSnapshot().state) as { root: { children: Array<{ type: string; children?: unknown[] }> } };
    const proseChildren = before.root.children[3].children;
    await page.locator(".sn-generated-prose:visible").getByRole("button", { name: "Remove label", exact: true }).click();
    await expect(page.locator(".sn-generated-prose:visible")).toHaveCount(0);
    const after = await page.evaluate(() => window.__STORY_NEXUS_E2E__!.getEditorSnapshot().state) as typeof before;
    expect(after.root.children.slice(3, 5)).toEqual(proseChildren);
    expect((await getEditorSnapshot(page)).sceneBeatCount).toBe(1);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.locator(".sn-generated-prose:visible")).toHaveCount(1);
    await expect(page.locator(".sn-generated-prose:visible h2")).toHaveText("Fixture first paragraph.");
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(page.locator(".sn-generated-prose:visible")).toHaveCount(0);
    await expect.poll(async () => JSON.parse((await getPersistedChapterContent(page))!).root.children.slice(3, 5)).toEqual(proseChildren);
    await page.reload();
    await page.waitForFunction(() => !!window.__STORY_NEXUS_E2E__);
    await expect(page.locator(".sn-generated-prose:visible")).toHaveCount(0);
    await expect(page.locator(`${CHAPTER_EDITOR}:visible > h2`)).toHaveText("Fixture first paragraph.");
    await expect(page.locator(`${CHAPTER_EDITOR}:visible`)).toContainText("Fixture second paragraph. Edited prose.");
    await placeCursorAtTopLevelNode(page, 4, "end");
    await page.keyboard.type(" Still editable.");
    await expect(page.locator(`${CHAPTER_EDITOR}:visible`)).toContainText("Edited prose. Still editable.");
  });

  test("removes only the chosen prose block's label", async ({ page }) => {
    await acceptProseFixture(page);
    await acceptProseFixture(page, "-second", 2);
    await page.locator(".sn-generated-prose:visible").first().getByRole("button", { name: "Remove label", exact: true }).click();
    await expect(page.locator(".sn-generated-prose:visible")).toHaveCount(1);
    expect((await getEditorSnapshot(page)).sceneBeatCount).toBe(2);
    const generations = await page.evaluate(() => {
      const state = window.__STORY_NEXUS_E2E__!.getEditorSnapshot().state as { root: { children: Array<{ type: string; generation?: { id: string } }> } };
      return state.root.children.filter((node) => node.type === "generated-prose").map((node) => node.generation?.id);
    });
    expect(generations).toEqual(["fixture-generation"]);
  });

  test("disables a block for context and word counts, locks editing, and persists the switch", async ({ page }) => {
    await acceptProseFixture(page);
    const block = page.locator(".sn-generated-prose:visible");
    const wordCount = page.locator(".sn-main-editor-header-word-count:visible");
    const originalCount = Number.parseInt((await wordCount.textContent())!, 10);
    await block.getByRole("button", { name: "Disable block", exact: true }).click();
    await expect(block).toHaveClass(/sn-generated-prose-disabled/);
    await expect(block.locator(".sn-generated-prose-content")).toHaveAttribute("contenteditable", "false");
    await expect(block.getByRole("button", { name: "Remove label", exact: true })).toBeDisabled();
    await expect.poll(async () => Number.parseInt((await wordCount.textContent())!, 10)).toBe(originalCount - 6);
    await block.getByRole("button", { name: "Select generated prose:" }).click();
    await page.keyboard.type("Disallowed replacement");
    await page.getByRole("button", { name: "Bold", exact: true }).click();
    await expect(block.locator(".sn-generated-prose-content")).toHaveText("Fixture first paragraph.Fixture second paragraph.");
    await expect(block.locator("strong")).toHaveCount(0);
    const summaryText = await page.evaluate(() => window.__STORY_NEXUS_E2E__!.getActiveChapterText());
    expect(summaryText).not.toContain("Fixture first paragraph.");
    expect((await resolvePromptMessages(page, "{{chapter_content}}"))[0]).not.toContain("Fixture first paragraph.");
    await placeCursorAtTopLevelNode(page, 4, "end");
    const previous = await page.evaluate(() => window.__STORY_NEXUS_E2E__!.getCursorContext());
    expect(previous.previousWords).not.toContain("Fixture");
    await placeCursorAtTopLevelNode(page, 0, "end");
    const after = await page.evaluate(() => window.__STORY_NEXUS_E2E__!.getCursorContext());
    expect(after.afterWords).not.toContain("Fixture");
    await block.locator(".sn-generated-prose-content p").last().click();
    await page.keyboard.type("Blocked edit");
    await expect(block.locator(".sn-generated-prose-content")).toHaveText("Fixture first paragraph.Fixture second paragraph.");
    await page.getByRole("button", { name: "Show generation labels", exact: true }).click();
    await expect(block.getByRole("button", { name: "Enable block", exact: true })).toBeVisible();
    await expect(block.getByRole("button", { name: "Select generated prose:" })).toBeHidden();
    await expect.poll(async () => JSON.parse((await getPersistedChapterContent(page))!).root.children.find((node: { type: string }) => node.type === "generated-prose")?.disabled).toBe(true);
    await page.reload();
    await expect(block).toHaveClass(/sn-generated-prose-disabled/);
    await block.getByRole("button", { name: "Enable block", exact: true }).click();
    await expect(block).not.toHaveClass(/sn-generated-prose-disabled/);
    await expect.poll(() => page.evaluate(() => window.__STORY_NEXUS_E2E__!.getActiveChapterText())).toContain("Fixture first paragraph.");
    await placeCursorAtTopLevelNode(page, 3, "end");
    await page.keyboard.type(" Enabled edit.");
    await expect(block.locator(".sn-generated-prose-content")).toContainText("Enabled edit.");
  });

  test("undo restores an enabled block without dropping its contents", async ({ page }) => {
    await acceptProseFixture(page);
    const block = page.locator(".sn-generated-prose:visible");
    await block.getByRole("button", { name: "Disable block", exact: true }).click();
    await expect(block).toHaveClass(/sn-generated-prose-disabled/);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(block).not.toHaveClass(/sn-generated-prose-disabled/);
    await expect(block).toContainText("Fixture first paragraph.");
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(block).toHaveClass(/sn-generated-prose-disabled/);
  });

  test("keeps edits and new paragraphs attributed, exits to ordinary prose, and survives SceneBeat deletion", async ({ page }) => {
    await acceptProseFixture(page);
    const block = page.locator(".sn-generated-prose:visible");
    await placeCursorAtTopLevelNode(page, 3, "end");
    await page.keyboard.type(" Edited.");
    await page.keyboard.press("Enter");
    await page.keyboard.type("New attributed paragraph.");
    await expect(block.locator(".sn-generated-prose-content p")).toHaveCount(3);
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Outside attribution.");
    await expect(block).not.toContainText("Outside attribution.");
    await expect(block).toContainText("New attributed paragraph.");
    await page.getByTestId("scene-beat-block").getByRole("button", { name: "Delete SceneBeat" }).click();
    await expect(page.getByTestId("scene-beat-block")).toHaveCount(0);
    await expect(block).toContainText("Edited.");
    await expect.poll(() => getPersistedChapterContent(page)).toContain("New attributed paragraph.");
  });

  test("preserves attribution when formatting and at prose block boundaries", async ({ page }) => {
    await acceptProseFixture(page);
    const block = page.locator(".sn-generated-prose:visible");
    await placeCursorAtTopLevelNode(page, 3, "start");
    await page.keyboard.press("Backspace");
    await expect(block).toContainText("Fixture first paragraph.");
    expect((await getEditorSnapshot(page)).sceneBeatCount).toBe(1);
    await page.locator("#main-editor-block-type:visible").selectOption("h2");
    await expect(block.locator("h2")).toContainText("Fixture first paragraph.");
    await expect(page.locator("#main-editor-block-type:visible")).toHaveValue("h2");
    await placeCursorAtTopLevelNode(page, 3, "end");
    await page.keyboard.press("Delete");
    await expect(block).toContainText("Fixture second paragraph.");
    await placeCursorAtTopLevelNode(page, 4, "start");
    await page.keyboard.press("Backspace");
    await expect(block).toHaveCount(1);
    await expect(block.locator(".sn-generated-prose-content p")).toHaveCount(1);
  });

  test("leaves a clickable editable line between SceneBeat and accepted prose", async ({ page }) => {
    await acceptProseFixture(page);
    expect((await getEditorSnapshot(page)).topLevelTypes.slice(1, 4)).toEqual(["scene-beat", "paragraph", "generated-prose"]);
    const gap = page.locator(`${CHAPTER_EDITOR}:visible > .scene-beat-node + p`);
    await expect(gap).toBeEmpty();
    await gap.click();
    await page.keyboard.type("Text between the SceneBeat and prose.");
    await expect(gap).toHaveText("Text between the SceneBeat and prose.");
    const prose = page.locator(".sn-generated-prose:visible");
    await expect(prose).not.toContainText("Text between the SceneBeat and prose.");
    await expect(prose.locator(".sn-generated-prose-content p")).toHaveCount(2);
    await page.getByRole("button", { name: "Show generation labels", exact: true }).click();
    await gap.click();
    await page.keyboard.press("End");
    await page.keyboard.type(" Still editable.");
    await expect.poll(() => getPersistedChapterContent(page)).toContain("Still editable.");
    await page.reload();
    await expect(gap).toHaveText("Text between the SceneBeat and prose. Still editable.");
    await expect(prose.locator(".sn-generated-prose-content p")).toHaveCount(2);
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

  test('preserves SceneBeat typing while its initial database save is pending', async ({ page }) => {
    await page.evaluate(async () => {
      const database = (await indexedDB.databases()).find(item => item.name && !item.name.startsWith('__'))!;
      const request = indexedDB.open(database.name!);
      const connection = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const gate = { held: true };
      (window as any).__sceneBeatSaveGate = gate;
      const transaction = connection.transaction('sceneBeats', 'readwrite');
      transaction.oncomplete = () => connection.close();
      const store = transaction.objectStore('sceneBeats');
      const hold = () => { store.get('__e2e_save_gate__').onsuccess = () => { if (gate.held) hold(); }; };
      hold();
    });
    await placeCursorAtTopLevelNode(page, 0, 'end');
    await page.keyboard.press('Alt+S');
    const command = page.getByTestId('scene-beat-block').filter({ visible: true }).getByTestId('scene-beat-command');
    await command.fill('Keep text entered before the first save finishes.');
    await page.evaluate(() => { (window as any).__sceneBeatSaveGate.held = false; });
    await expect(command).toHaveValue('Keep text entered before the first save finishes.');
    await expect.poll(() => getPersistedChapterContent(page)).toContain('Keep text entered before the first save finishes.');
    await page.reload();
    await page.waitForFunction(() => !!window.__STORY_NEXUS_E2E__);
    await expect(command).toHaveValue('Keep text entered before the first save finishes.');
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

  test("keeps Tab focus in the prose editor after a SceneBeat", async ({ page }) => {
    await placeCursorAtTopLevelNode(page, 0, "end");
    await page.keyboard.press("Alt+S");
    await waitForEditorSnapshot(page, (snapshot) => snapshot.sceneBeatCount === 1);

    const visibleEditor = page.locator(`${CHAPTER_EDITOR}:visible`).first();
    await visibleEditor.focus();
    await placeCursorAtTopLevelNode(page, 2, "end");

    await expect.poll(() => getActiveElementInfo(page)).toMatchObject({
      ariaLabel: "Chapter editor",
    });

    await page.keyboard.press("Tab");

    await expect.poll(() => getActiveElementInfo(page)).toMatchObject({
      ariaLabel: "Chapter editor",
    });
    await expect(page.locator("textarea:focus")).toHaveCount(0);
    expect(getTopLevelText(await getEditorSnapshot(page), 2)).toBe("    ");
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
    expect(messages[0]).toContain("Mara Venn");
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
    expect(messages[0]).toContain("Mara Venn tightened the");
    expect(messages[0]).toContain("Chapter 2: Chapter Two");
    expect(messages[0]).toContain("Captain Anik sealed Cartography");
    expect(messages[0]).not.toContain("Chapter 3: Chapter Three");
    expect(messages[0]).not.toContain("{{all_previous_chapters}}");
    expect(messages[0]).not.toContain("{{previous_chapter(1)}}");

    const lastPrevious = messages[0]?.split("Last previous:")[1] || "";
    expect(lastPrevious).not.toContain("Chapter 1: Chapter One");
    expect(lastPrevious).toContain("Chapter 2: Chapter Two");
  });

  test("expands and collapses the Brainstorm sheet", async ({ page }) => {
    await page.getByRole("button", { name: "Brainstorm" }).click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    const collapsedWidth = await getElementWidth(page, '[role="dialog"]');
    const viewportWidth = page.viewportSize()?.width || 0;

    await page.locator('[role="dialog"]').evaluate((dialog) => {
      const wideContent = document.createElement("div");
      wideContent.setAttribute("data-testid", "forced-wide-brainstorm-content");
      wideContent.style.width = "2200px";
      wideContent.style.height = "1px";
      dialog.appendChild(wideContent);
    });
    await expect.poll(() => getElementWidth(page, '[role="dialog"]')).toBeLessThanOrEqual(collapsedWidth + 8);

    await page.locator('button[title="Expand Brainstorm"]').click();
    await expect(page.locator('button[title="Collapse Brainstorm"]')).toBeVisible();
    await expect.poll(() => getElementWidth(page, '[role="dialog"]')).toBeGreaterThan(viewportWidth - 8);

    await page.locator('button[title="Collapse Brainstorm"]').click();
    await expect(page.locator('button[title="Expand Brainstorm"]')).toBeVisible();
    await expect.poll(() => getElementWidth(page, '[role="dialog"]')).toBeLessThan(collapsedWidth + 8);
  });

  test("opens the Prompts sheet from the Brainstorm prompt selector", async ({ page }) => {
    await page.getByRole("button", { name: "Brainstorm" }).click();
    await expect(page.locator('[role="dialog"]').getByRole("heading", { name: "Brainstorm" })).toBeVisible();

    await page.getByRole("button", { name: "Start New Brainstorm" }).click();
    await expect(page.getByTestId("prompt-select-brainstorm-trigger")).toBeVisible();
    await page.getByTestId("prompt-select-brainstorm-trigger").click();
    await page.getByTestId("prompt-select-configure-prompts").click();

    await expect(page.locator('[role="dialog"]').getByRole("heading", { name: "Prompts" })).toBeVisible();
  });

  test("preserves pinned Brainstorm context across sheet remounts", async ({ page }) => {
    await page.getByRole("button", { name: "Brainstorm" }).click();
    await expect(page.locator('[role="dialog"]').getByRole("heading", { name: "Brainstorm" })).toBeVisible();

    const startButton = page.getByRole("button", { name: "Start New Brainstorm" });
    if (await startButton.isVisible().catch(() => false)) {
      await startButton.click();
    }

    const pinSwitch = page.getByTestId("brainstorm-pin-to-chapter");
    const fullContextSwitch = page.getByTestId("brainstorm-full-context");

    await expect(pinSwitch).toBeVisible();
    await expect(pinSwitch).toHaveAttribute("data-state", "unchecked");

    await pinSwitch.click();
    await fullContextSwitch.click();
    await expect(pinSwitch).toHaveAttribute("data-state", "checked");
    await expect(fullContextSwitch).toHaveAttribute("data-state", "checked");

    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).toBeHidden();

    await page.getByRole("button", { name: "Brainstorm" }).click();
    await expect(page.getByTestId("brainstorm-pin-to-chapter")).toHaveAttribute("data-state", "checked");
    await expect(page.getByTestId("brainstorm-full-context")).toHaveAttribute("data-state", "checked");

    await page.getByTestId("brainstorm-pin-to-chapter").click();
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).toBeHidden();

    await page.getByRole("button", { name: "Brainstorm" }).click();
    await expect(page.getByTestId("brainstorm-pin-to-chapter")).toHaveAttribute("data-state", "unchecked");
    await expect(page.getByTestId("brainstorm-full-context")).toHaveAttribute("data-state", "unchecked");
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

async function acceptProseFixture(page: Page, suffix = "", expectedBlockCount = 1) {
  const generation: ProseGenerationMetadata = {
    id: `fixture-generation${suffix}`, sceneBeatId: `fixture-beat${suffix}`, sceneBeatCommand: "Write fixture prose.",
    generatedAt: "2026-10-12T10:00:00.000Z", mode: "standard",
    model: { id: "fixture-model", name: "Fixture model", provider: "local" },
    promptId: "fixture-prompt", promptName: "Fixture prompt",
    promptMessages: [{ role: "user", content: "Original prompt sent" }],
  };
  await page.evaluate((generation) => window.__STORY_NEXUS_E2E__!.insertPendingSceneBeat("Fixture first paragraph.\n\nFixture second paragraph.", generation), generation);
  await expect(page.getByTestId("scene-beat-accept")).toBeVisible();
  await page.getByTestId("scene-beat-accept").click();
  await expect(page.locator(".sn-generated-prose:visible")).toHaveCount(expectedBlockCount);
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

async function getElementWidth(page: Page, selector: string): Promise<number> {
  return page.locator(selector).evaluate((element) => element.getBoundingClientRect().width);
}

async function getActiveElementInfo(page: Page): Promise<{
  ariaLabel: string | null;
  tagName: string | null;
}> {
  return page.evaluate(() => {
    const activeElement = document.activeElement;
    return {
      ariaLabel: activeElement?.getAttribute("aria-label") ?? null,
      tagName: activeElement?.tagName ?? null,
    };
  });
}

function getTopLevelText(snapshot: EditorSnapshot, index: number): string {
  const root = (snapshot.state as { root?: { children?: SerializedLexicalNode[] } })?.root;
  const topLevelNode = Array.isArray(root?.children) ? root.children[index] : null;
  return topLevelNode ? collectSerializedText(topLevelNode) : "";
}

function collectSerializedText(node: SerializedLexicalNode): string {
  const ownText = typeof node.text === "string" ? node.text : "";
  const childText = Array.isArray(node.children)
    ? node.children.map(collectSerializedText).join("")
    : "";
  return `${ownText}${childText}`;
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
