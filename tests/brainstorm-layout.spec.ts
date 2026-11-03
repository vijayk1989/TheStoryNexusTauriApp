/// <reference path="./e2e-globals.d.ts" />
import { expect, test, type Locator, type Page } from '@playwright/test';
import { installPaidProviderGuard } from './local-llm';

test.beforeEach(async ({ page }) => {
  await installPaidProviderGuard(page);
  await page.route('http://localhost:1234/**', route => route.fulfill({ json: { data: [{ id: 'fixture-layout', object: 'model' }] } }));
  await page.goto('/');
  await page.waitForFunction(() => !!window.__STORY_NEXUS_E2E__?.getEditorSnapshot().currentChapterId);
  await page.evaluate(async () => {
    await window.__STORY_NEXUS_E2E__!.configureLocalLLM({ apiUrl: 'http://localhost:1234/v1', modelId: 'fixture-layout' });
    const storyId = window.__STORY_NEXUS_E2E__!.getEditorSnapshot().currentStoryId;
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('StoryDatabase');
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction('aiChats', 'readwrite');
        transaction.objectStore('aiChats').put({
          id: 'layout-chat', storyId, title: 'Layout fixture', createdAt: new Date(),
          messages: [{ id: 'layout-reply', role: 'assistant', content: Array.from({ length: 60 }, (_, i) => `Response paragraph ${i + 1}. Mara follows the lantern through the city.`).join('\n\n'), timestamp: new Date() }],
        });
        transaction.oncomplete = () => { database.close(); resolve(); };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  });
  await page.getByRole('button', { name: 'Brainstorm', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'Brainstorm', exact: true });
  await chat.getByRole('button', { name: 'Select a chat', exact: true }).click();
  await page.getByRole('menuitem').filter({ hasText: 'Layout fixture' }).click();
});

test('drags the divider both ways, preserves content, and remembers the layout on reopen', async ({ page }, testInfo) => {
  const chat = page.getByRole('dialog', { name: 'Brainstorm', exact: true });
  const responses = chat.getByRole('region', { name: 'Brainstorm responses', exact: true });
  const inputPanel = chat.getByRole('region', { name: 'Brainstorm input panel', exact: true });
  const divider = chat.getByRole('separator', { name: 'Resize Brainstorm input area' });
  const input = chat.getByPlaceholder('Type your message...');
  await input.fill('Keep this draft while resizing.');
  await chat.getByRole('button', { name: /^Context/ }).click();
  const before = await responses.boundingBox();
  const panelBefore = await inputPanel.boundingBox();
  await dragDivider(page, divider, 120);
  await expect.poll(async () => (await responses.boundingBox())!.height).toBeGreaterThan(before!.height + 75);
  expect((await inputPanel.boundingBox())!.height).toBeLessThan(panelBefore!.height - 75);
  await expect(input).toHaveValue('Keep this draft while resizing.');
  await expect(responses).toContainText('Response paragraph 60.');
  await page.screenshot({ path: testInfo.outputPath('brainstorm-compact-input.png') });
  const compactHeight = (await responses.boundingBox())!.height;
  await dragDivider(page, divider, -90);
  await expect.poll(async () => (await responses.boundingBox())!.height).toBeLessThan(compactHeight - 60);
  const savedRatio = Number(await divider.getAttribute('aria-valuenow'));
  await chat.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Brainstorm', exact: true }).click();
  await expect.poll(async () => Number(await divider.getAttribute('aria-valuenow'))).toBeCloseTo(savedRatio, 0);
  await expect(input).toHaveValue('Keep this draft while resizing.');
});

test('keeps both panels bounded and controls reachable in expanded and small windows', async ({ page }, testInfo) => {
  const chat = page.getByRole('dialog', { name: 'Brainstorm', exact: true });
  const divider = chat.getByRole('separator', { name: 'Resize Brainstorm input area' });
  await chat.getByTitle('Expand Brainstorm').click();
  await divider.focus();
  const initialSize = Number(await divider.getAttribute('aria-valuenow'));
  await divider.press('ArrowDown');
  await expect.poll(async () => Number(await divider.getAttribute('aria-valuenow'))).toBeGreaterThan(initialSize);
  await divider.press('End');
  await assertPanelsFit(chat);
  await chat.getByPlaceholder('Type your message...').fill('A usable input at the minimum size.');
  const send = chat.getByRole('button', { name: 'Send message', exact: true });
  await send.scrollIntoViewIfNeeded();
  await expect(send).toBeInViewport();
  await expect(send).toBeEnabled();
  await divider.press('Home');
  await assertPanelsFit(chat);
  await page.screenshot({ path: testInfo.outputPath('brainstorm-expanded-input.png') });
  await page.setViewportSize({ width: 390, height: 640 });
  await divider.focus();
  await divider.press('End');
  await assertPanelsFit(chat);
  await send.scrollIntoViewIfNeeded();
  await expect(send).toBeInViewport();
  await expect(send).toBeEnabled();
  await chat.getByPlaceholder('Type your message...').scrollIntoViewIfNeeded();
  await expect(chat.getByPlaceholder('Type your message...')).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('brainstorm-small-window.png') });
});

async function dragDivider(page: Page, divider: Locator, offset: number) {
  const box = (await divider.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + offset, { steps: 12 });
  await page.mouse.up();
}

async function assertPanelsFit(chat: Locator) {
  const responses = (await chat.getByRole('region', { name: 'Brainstorm responses', exact: true }).boundingBox())!;
  const input = (await chat.getByRole('region', { name: 'Brainstorm input panel', exact: true }).boundingBox())!;
  const container = (await chat.boundingBox())!;
  expect(responses.height).toBeGreaterThanOrEqual((responses.height + input.height) * 0.19);
  expect(input.height).toBeGreaterThanOrEqual((responses.height + input.height) * 0.19);
  expect(responses.y).toBeGreaterThanOrEqual(container.y);
  expect(input.y + input.height).toBeLessThanOrEqual(container.y + container.height + 1);
  expect(await chat.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
}
