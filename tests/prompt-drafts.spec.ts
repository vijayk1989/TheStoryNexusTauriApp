/// <reference path="./e2e-globals.d.ts" />
import { expect, test, type Locator, type Page } from '@playwright/test';
import { installPaidProviderGuard } from './local-llm';

let generationRequests = 0;
test.beforeEach(async ({ page }) => {
  generationRequests = 0;
  await installPaidProviderGuard(page);
  await page.route('http://localhost:1234/**', async route => {
    if (route.request().url().endsWith('/chat/completions')) generationRequests += 1;
    await route.fulfill({ json: { data: [{ id: 'fixture-drafts', object: 'model' }] } });
  });
  await page.goto('/');
  await page.waitForFunction(() => !!window.__STORY_NEXUS_E2E__?.getEditorSnapshot().currentChapterId);
  await page.evaluate(() => window.__STORY_NEXUS_E2E__!.configureLocalLLM({ apiUrl: 'http://localhost:1234/v1', modelId: 'fixture-drafts' }));
});
test.afterEach(() => expect(generationRequests).toBe(0));

test('saves SceneBeat prompt text, restores unsent text after reload, and loads by appending or replacing', async ({ page }, testInfo) => {
  await page.evaluate(() => window.__STORY_NEXUS_E2E__!.placeCursorAtTopLevelNode(0, 'end'));
  await page.keyboard.press('Alt+S');
  const beat = page.getByTestId('scene-beat-block').filter({ visible: true });
  const command = beat.getByTestId('scene-beat-command');
  await command.fill('The lantern reveals a hidden door.');
  await expect(beat.getByTestId('scene-beat-generate')).toBeEnabled();
  await savePrompt(page, beat);
  await expect(command).toHaveValue('The lantern reveals a hidden door.');
  await expect.poll(() => readTable(page, 'promptDrafts')).toContain('The lantern reveals a hidden door.');
  await expect.poll(() => page.evaluate(() => window.__STORY_NEXUS_E2E__!.getPersistedChapterContent())).toContain('The lantern reveals a hidden door.');
  await page.reload();
  await expect(command).toHaveValue('The lantern reveals a hidden door.');
  await command.fill('An existing idea.');
  await openDrafts(page, beat);
  await page.getByRole('dialog', { name: 'Load prompt draft', exact: true }).getByRole('button', { name: 'Load', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Append to input', exact: true }).click();
  await expect(command).toHaveValue('An existing idea.\n\nThe lantern reveals a hidden door.');
  await openDrafts(page, beat);
  await page.getByRole('dialog', { name: 'Load prompt draft', exact: true }).getByRole('button', { name: 'Load', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Replace input', exact: true }).click();
  await expect(command).toHaveValue('The lantern reveals a hidden door.');
  await expect(page.getByRole('alertdialog')).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Load prompt draft', exact: true })).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath('scene-prompt-drafts-toolbar.png') });
  await beat.getByRole('button', { name: 'Delete SceneBeat', exact: true }).click();
  expect(await readTable(page, 'promptDrafts')).toContain('The lantern reveals a hidden door.');
});

test('autosaves Brainstorm input and manages saved ideas independently of the original chat', async ({ page }, testInfo) => {
  const chat = await newChat(page);
  const input = chat.getByPlaceholder('Type your message...');
  await input.fill('A floating city with a missing shadow.');
  await savePrompt(page, chat);
  await expect.poll(() => readTable(page, 'aiChats')).toContain('A floating city with a missing shadow.');
  await page.reload();
  await page.waitForFunction(() => !!window.__STORY_NEXUS_E2E__);
  await page.getByRole('button', { name: 'Brainstorm', exact: true }).click();
  await chat.getByRole('button', { name: 'Select a chat', exact: true }).click();
  await page.getByRole('menuitem').filter({ hasText: /^New Chat/ }).click();
  await expect(input).toHaveValue('A floating city with a missing shadow.');
  await chat.getByRole('button', { name: /^New Chat / }).click();
  await page.getByTitle('Delete chat', { exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await chat.getByRole('button', { name: 'Start New Brainstorm', exact: true }).click();
  await openDrafts(page, chat);
  const library = page.getByRole('dialog', { name: 'Load prompt draft', exact: true });
  await library.getByRole('button', { name: 'Rename', exact: true }).click();
  await library.getByRole('textbox', { name: 'Prompt draft name', exact: true }).fill('Floating city idea');
  await library.getByRole('button', { name: 'Save name', exact: true }).click();
  await expect(library.getByRole('article', { name: 'Prompt draft: Floating city idea', exact: true })).toBeVisible();
  await library.getByRole('button', { name: 'Load', exact: true }).click();
  await expect(input).toHaveValue('A floating city with a missing shadow.');
  await expect(chat.getByRole('article', { name: 'Assistant message', exact: true })).toHaveCount(0);
  const settings = await chat.getByRole('group', { name: 'Brainstorm prompt settings', exact: true }).boundingBox();
  const actions = await chat.getByRole('group', { name: 'Brainstorm input actions', exact: true }).boundingBox();
  expect(actions!.y).toBeGreaterThan(settings!.y);
  await page.screenshot({ path: testInfo.outputPath('brainstorm-prompt-drafts-toolbar.png') });
  await chat.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Drafts', exact: true }).click();
  const drafts = page.getByRole('dialog', { name: 'Drafts', exact: true });
  await drafts.getByRole('tab', { name: 'Prompt Drafts', exact: true }).click();
  await expect(drafts.getByRole('article', { name: 'Prompt draft: Floating city idea', exact: true })).toBeVisible();
  await drafts.getByRole('tab', { name: 'Response Drafts', exact: true }).click();
  await expect(drafts).toContainText('No drafts saved for this chapter yet.');
  await drafts.getByRole('tab', { name: 'Prompt Drafts', exact: true }).click();
  await drafts.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete draft', exact: true }).click();
  await expect(drafts).toContainText('No prompt drafts saved for this story yet.');
});

test('moves image resizing to persistent Prompt Defaults and keeps mobile actions reachable', async ({ page }, testInfo) => {
  await newChat(page);
  await page.getByRole('dialog', { name: 'Brainstorm', exact: true }).getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Prompt Defaults', exact: true }).click();
  const defaults = page.getByRole('dialog', { name: 'Prompt Defaults', exact: true });
  const resize = defaults.getByRole('switch', { name: 'Resize large Brainstorm images', exact: true });
  await expect(resize).toBeChecked();
  await resize.click();
  await defaults.getByRole('button', { name: 'Save Defaults', exact: true }).click();
  await expect(page.getByText('Prompt defaults saved!', { exact: true })).toBeVisible();
  await page.reload();
  await page.waitForFunction(() => !!window.__STORY_NEXUS_E2E__);
  await page.getByRole('button', { name: 'Prompt Defaults', exact: true }).click();
  await expect(resize).not.toBeChecked();
  await defaults.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Brainstorm', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'Brainstorm', exact: true });
  await chat.getByRole('button', { name: 'Select a chat', exact: true }).click();
  await page.getByRole('menuitem').filter({ hasText: /^New Chat/ }).click();
  await expect(chat.getByText('Resize large images', { exact: true })).toHaveCount(0);
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 2000; canvas.height = 1000;
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await chat.getByLabel('Attach images', { exact: true }).setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  const image = chat.getByRole('img', { name: 'Attached image 1', exact: true });
  await expect(image).toBeVisible();
  expect(await image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBe(2000);
  await chat.getByPlaceholder('Type your message...').fill('A small-window idea.');
  await page.setViewportSize({ width: 390, height: 720 });
  const menu = chat.getByRole('button', { name: 'Prompt drafts', exact: true });
  await menu.scrollIntoViewIfNeeded();
  await expect(menu).toBeInViewport();
  await savePrompt(page, chat);
  await expect(chat.getByPlaceholder('Type your message...')).toHaveValue('A small-window idea.');
  await expect(page.getByText('Prompt draft saved', { exact: true })).toBeHidden({ timeout: 10000 });
  await chat.getByRole('group', { name: 'Brainstorm input actions', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('brainstorm-prompt-drafts-mobile.png') });
});

async function newChat(page: Page) {
  await page.getByRole('button', { name: 'Brainstorm', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'Brainstorm', exact: true });
  await chat.getByRole('button', { name: 'Start New Brainstorm', exact: true }).click();
  return chat;
}
async function savePrompt(page: Page, scope: Locator) {
  await scope.getByRole('button', { name: 'Prompt drafts', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Save prompt draft', exact: true }).click();
  await expect(page.getByText('Prompt draft saved', { exact: true })).toBeVisible();
}
async function openDrafts(page: Page, scope: Locator) {
  await scope.getByRole('button', { name: 'Prompt drafts', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Load prompt draft', exact: true }).click();
}
async function readTable(page: Page, table: string) {
  return page.evaluate(table => new Promise<string>((resolve, reject) => {
    const request = indexedDB.open('StoryDatabase');
    request.onsuccess = () => {
      const database = request.result;
      const rows = database.transaction(table).objectStore(table).getAll();
      rows.onsuccess = () => { database.close(); resolve(JSON.stringify(rows.result)); };
      rows.onerror = () => reject(rows.error);
    };
  }), table);
}
