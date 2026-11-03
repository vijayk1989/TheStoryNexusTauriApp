/// <reference path="./e2e-globals.d.ts" />
import { expect, test, type Page } from '@playwright/test';
import { installPaidProviderGuard } from './local-llm';

type FixtureStream = { respond: () => void; emit: (text: string) => void; finish: (text: string) => void; aborted: boolean };
type FixtureWindow = Window & { backgroundStreams: FixtureStream[] };

test.beforeEach(async ({ page }) => {
  await installPaidProviderGuard(page);
  await page.route('http://localhost:1234/**', route => route.fulfill({ json: { data: [{ id: 'fixture-background', object: 'model' }] } }));
  await page.goto('/');
  await page.waitForFunction(() => !!window.__STORY_NEXUS_E2E__?.getEditorSnapshot().currentChapterId);
  await page.evaluate(async () => {
    await window.__STORY_NEXUS_E2E__!.configureLocalLLM({ apiUrl: 'http://localhost:1234/v1', modelId: 'fixture-background' });
    const storyId = window.__STORY_NEXUS_E2E__!.getEditorSnapshot().currentStoryId;
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('StoryDatabase');
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction('aiChats', 'readwrite');
        for (const suffix of ['A', 'B']) transaction.objectStore('aiChats').put({ id: `background-${suffix}`, storyId, title: `Background chat ${suffix}`, messages: [], createdAt: new Date() });
        transaction.oncomplete = () => { database.close(); resolve(); };
        transaction.onerror = () => reject(transaction.error);
      };
    });
    const fixture = window as FixtureWindow;
    fixture.backgroundStreams = [];
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      if (String(input).startsWith('http://localhost:1234/') && String(input).endsWith('/chat/completions')) {
        return new Promise<Response>((resolve, reject) => {
          let streamController!: ReadableStreamDefaultController<Uint8Array>;
          const response = new Response(new ReadableStream<Uint8Array>({ start(controller) { streamController = controller; } }), { headers: { 'Content-Type': 'text/event-stream' } });
          const stream: FixtureStream = {
            aborted: false,
            respond: () => resolve(response),
            emit: (text) => { resolve(response); streamController.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`)); },
            finish: (text) => { stream.emit(text); streamController.close(); },
          };
          fixture.backgroundStreams.push(stream);
          init?.signal?.addEventListener('abort', () => {
            stream.aborted = true;
            const error = new DOMException('Stopped', 'AbortError');
            streamController.error(error);
            reject(error);
          }, { once: true });
        });
      }
      return originalFetch(input, init);
    };
  });
});

test('closes Brainstorm before response headers arrive, edits the chapter, and returns to the completed response', async ({ page }) => {
  const chat = await selectChat(page, 'A');
  await chat.getByPlaceholder('Type your message...').fill('Give me a background idea.');
  await chat.getByRole('button', { name: 'Send message', exact: true }).click();
  await waitForRequests(page, 1);
  await expect(chat.getByRole('status').filter({ hasText: 'Waiting for response...' })).toBeVisible();
  await chat.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(chat).toBeHidden();
  await page.evaluate(() => window.__STORY_NEXUS_E2E__!.placeCursorAtTopLevelNode(0, 'end'));
  await page.keyboard.type(' Editing while Brainstorm runs.');
  await expect.poll(() => page.evaluate(() => window.__STORY_NEXUS_E2E__!.getPersistedChapterContent())).toContain('Editing while Brainstorm runs.');
  await finish(page, 0, 'Completed while the panel was closed.');
  await expect.poll(() => savedChat(page, 'A')).toContain('Completed while the panel was closed.');
  await page.getByRole('button', { name: 'Brainstorm', exact: true }).click();
  await expect(chat.getByRole('article', { name: 'Assistant message', exact: true })).toContainText('Completed while the panel was closed.');
  await expect(chat.getByRole('status', { name: 'Generation completed', exact: true })).toBeVisible();
  await expect(chat.getByRole('button', { name: 'Stop', exact: true })).toHaveCount(0);
});

test('switches chats during streams and stops one without interrupting the other', async ({ page }) => {
  const chat = await selectChat(page, 'A');
  await chat.getByPlaceholder('Type your message...').fill('First request.');
  await chat.getByRole('button', { name: 'Send message', exact: true }).click();
  await waitForRequests(page, 1);
  await page.evaluate(() => (window as FixtureWindow).backgroundStreams[0].emit('First chat partial.'));
  await expect(chat).toContainText('First chat partial.');
  await chat.getByPlaceholder('Type your message...').fill('Draft for A.');
  await selectChat(page, 'B');
  await expect(chat.getByPlaceholder('Type your message...')).toHaveValue('');
  await expect(chat).not.toContainText('First chat partial.');
  await chat.getByPlaceholder('Type your message...').fill('Second request.');
  await chat.getByRole('button', { name: 'Send message', exact: true }).click();
  await waitForRequests(page, 2);
  await selectChat(page, 'A');
  await expect(chat).toContainText('First chat partial.');
  await expect(chat.getByPlaceholder('Type your message...')).toHaveValue('Draft for A.');
  await chat.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(chat.getByRole('status', { name: 'Generation stopped', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as FixtureWindow).backgroundStreams.map(stream => stream.aborted))).toEqual([true, false]);
  await finish(page, 1, 'Second chat completed.');
  await selectChat(page, 'B');
  await expect(chat).toContainText('Second chat completed.');
  await expect(chat).not.toContainText('First chat partial.');
  await expect.poll(() => savedChat(page, 'A')).toContain('First chat partial.');
  await expect.poll(() => savedChat(page, 'B')).toContain('Second chat completed.');
});

test('regeneration completes after closing and reopening the panel', async ({ page }) => {
  const chat = await selectChat(page, 'A');
  await chat.getByPlaceholder('Type your message...').fill('An idea to revise.');
  await chat.getByRole('button', { name: 'Send message', exact: true }).click();
  await waitForRequests(page, 1);
  await finish(page, 0, 'Original idea.');
  await expect(chat.getByRole('button', { name: 'Regen', exact: true })).toBeEnabled();
  await chat.getByRole('button', { name: 'Regen', exact: true }).click();
  await waitForRequests(page, 2);
  await chat.getByRole('button', { name: 'Close', exact: true }).click();
  await finish(page, 1, 'Revised in the background.');
  await expect.poll(() => savedChat(page, 'A')).toContain('Revised in the background.');
  await page.getByRole('button', { name: 'Brainstorm', exact: true }).click();
  await expect(chat).toContainText('Revised in the background.');
  await expect(chat).not.toContainText('Original idea.');
  await expect(chat.getByRole('article', { name: 'Your message', exact: true })).toHaveCount(1);
});

async function selectChat(page: Page, suffix: string) {
  const chat = page.getByRole('dialog', { name: 'Brainstorm', exact: true });
  if (!await chat.isVisible()) await page.getByRole('button', { name: 'Brainstorm', exact: true }).click();
  await chat.getByRole('button', { name: /^(Select a chat|Background chat)/ }).click();
  await page.getByRole('menuitem').filter({ hasText: `Background chat ${suffix}` }).click();
  return chat;
}

async function waitForRequests(page: Page, count: number) {
  await page.waitForFunction(count => (window as FixtureWindow).backgroundStreams.length === count, count);
}

async function finish(page: Page, index: number, text: string) {
  await page.evaluate(({ index, text }) => (window as FixtureWindow).backgroundStreams[index].finish(text), { index, text });
}

async function savedChat(page: Page, suffix: string) {
  return page.evaluate(suffix => new Promise<string>((resolve, reject) => {
    const request = indexedDB.open('StoryDatabase');
    request.onsuccess = () => {
      const database = request.result;
      const row = database.transaction('aiChats').objectStore('aiChats').get(`background-${suffix}`);
      row.onsuccess = () => { database.close(); resolve(JSON.stringify(row.result)); };
      row.onerror = () => reject(row.error);
    };
  }), suffix);
}
