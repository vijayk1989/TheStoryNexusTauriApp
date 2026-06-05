/// <reference path="./e2e-globals.d.ts" />

import { expect, type Locator, type Page, test } from "@playwright/test";

import {
  fetchLocalLlmModel,
  getLocalLlmApiUrl,
  installPaidProviderGuard,
} from "./local-llm";

const EXAMPLE_STORY_ID = "example-story-iron-salt";
const CHAPTER_ID = `${EXAMPLE_STORY_ID}-chapter-1`;
const CHAPTER_EDITOR = '[aria-label="Chapter editor"]';

test.describe("local LLM generation", () => {
  test("generates a chapter summary through LM Studio only", async ({ page }) => {
    test.setTimeout(120_000);

    const model = await fetchLocalLlmModel();
    const paidGuard = await installPaidProviderGuard(page);
    const localRequests: string[] = [];

    page.on("request", (request) => {
      const url = request.url();
      if (url.startsWith(getLocalLlmApiUrl()) && url.endsWith("/chat/completions")) {
        localRequests.push(url);
      }
    });

    await openEditor(page);
    await configureLocalLlm(page, model);

    await page.getByTestId(`chapter-actions-${CHAPTER_ID}`).click();
    await page.getByRole("menuitem", { name: "Summary" }).click();

    await expect(page.getByRole("heading", { name: "Chapter Summary" })).toBeVisible();
    await page.getByTestId("ai-generate-gen_summary-trigger").click();
    await page.getByTestId("ai-generate-prompt-gen-summary-system").hover();
    await page.getByTestId("ai-generate-model-gen-summary-system-local-local").click();

    const summaryInput = page.locator("#chapter-summary");
    await expect.poll(async () => (await summaryInput.inputValue()).trim(), {
      timeout: 90_000,
    }).not.toBe("");

    await expect(page.getByText("A generated summary is ready")).toBeVisible({ timeout: 10_000 });
    expect(localRequests.length).toBeGreaterThan(0);
    expect(paidGuard.getBlockedUrls()).toEqual([]);
  });

  test("writes chapter prose from multiple SceneBeats and accepts both outputs", async ({ page }) => {
    test.setTimeout(240_000);

    const model = await fetchLocalLlmModel();
    const paidGuard = await installPaidProviderGuard(page);
    const localRequests: string[] = [];

    page.on("request", (request) => {
      const url = request.url();
      if (url.startsWith(getLocalLlmApiUrl()) && url.endsWith("/chat/completions")) {
        localRequests.push(url);
      }
    });

    await openEditor(page);
    await configureLocalLlm(page, model);

    const initial = await getEditorSnapshot(page);

    const firstBlock = await insertSceneBeatAtTopLevelNode(page, 0, 1);
    const firstOutput = await generateAndAcceptSceneBeat(
      firstBlock,
      "Write 2 short sentences: Tavin hears the under-hill bell again and notices blue dust drifting from the western tunnel."
    );

    await expectChapterTextToContainGeneratedOutput(page, firstOutput);

    const secondBlock = await insertSceneBeatAtTopLevelNode(page, 2, 2);
    const secondOutput = await generateAndAcceptSceneBeat(
      secondBlock,
      "Write 2 short sentences: Mira arrives with a lantern and warns Tavin that the sealed stair has opened."
    );

    const finalSnapshot = await expectChapterTextToContainGeneratedOutput(page, secondOutput);

    expect(finalSnapshot.sceneBeatCount).toBe(2);
    expect(finalSnapshot.paragraphCount).toBeGreaterThanOrEqual(initial.paragraphCount + 4);
    expect(localRequests.length).toBeGreaterThanOrEqual(2);
    expect(paidGuard.getBlockedUrls()).toEqual([]);
  });
});

async function openEditor(page: Page) {
  await page.goto("/");

  await expect(page.locator(CHAPTER_EDITOR).first()).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const api = window.__STORY_NEXUS_E2E__;
    return !!api?.getEditorSnapshot().currentChapterId;
  });
}

async function configureLocalLlm(page: Page, model: { id: string; name: string }) {
  await page.evaluate(
    ({ apiUrl, model }) => {
      const api = window.__STORY_NEXUS_E2E__;
      if (!api) {
        throw new Error("Story Nexus E2E API is not available.");
      }

      return api.configureLocalLLM({
        apiUrl,
        modelId: model.id,
        modelName: model.name,
      });
    },
    { apiUrl: getLocalLlmApiUrl(), model }
  );
}

async function insertSceneBeatAtTopLevelNode(page: Page, topLevelIndex: number, expectedCount: number) {
  await page.evaluate(
    ({ topLevelIndex }) => {
      const api = window.__STORY_NEXUS_E2E__;
      if (!api) {
        throw new Error("Story Nexus E2E API is not available.");
      }
      return api.placeCursorAtTopLevelNode(topLevelIndex, "end");
    },
    { topLevelIndex }
  );

  await page.keyboard.press("Alt+S");
  await expect(page.getByTestId("scene-beat-block")).toHaveCount(expectedCount, { timeout: 10_000 });

  return page.getByTestId("scene-beat-block").nth(expectedCount - 1);
}

async function generateAndAcceptSceneBeat(
  block: Locator,
  command: string
): Promise<string> {
  await block.getByTestId("scene-beat-command").fill(command);

  const generateButton = block.getByTestId("scene-beat-generate");
  await expect(generateButton).toBeEnabled({ timeout: 15_000 });
  await generateButton.click();

  const output = block.getByTestId("scene-beat-output");
  await expect.poll(async () => (await output.textContent())?.replace(/\s+/g, " ").trim() || "", {
    timeout: 120_000,
  }).not.toBe("");

  const generatedText = ((await output.textContent()) || "").replace(/\s+/g, " ").trim();
  await expect(block.getByTestId("scene-beat-accept")).toBeVisible({ timeout: 10_000 });
  await block.getByTestId("scene-beat-accept").click();

  return generatedText;
}

async function getEditorSnapshot(page: Page) {
  return page.evaluate(() => {
    const api = window.__STORY_NEXUS_E2E__;
    if (!api) {
      throw new Error("Story Nexus E2E API is not available.");
    }
    return api.getEditorSnapshot();
  });
}

async function expectChapterTextToContainGeneratedOutput(page: Page, generatedText: string) {
  const signature = generatedText.split(/\s+/).slice(0, 8).join(" ");

  await expect.poll(async () => {
    const snapshot = await getEditorSnapshot(page);
    return snapshot.plainText.includes(signature);
  }, {
    timeout: 10_000,
  }).toBe(true);

  return getEditorSnapshot(page);
}
