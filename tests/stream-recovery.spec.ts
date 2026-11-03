/// <reference path="./e2e-globals.d.ts" />
import { expect, test, type Page } from '@playwright/test';
import { installPaidProviderGuard } from './local-llm';

const PARTIAL = 'The lantern flickered as Mara opened the door.';

test.beforeEach(async ({ page }) => {
  await installPaidProviderGuard(page);
  await page.route('http://localhost:1234/**', route => route.fulfill({ json: { data: [{ id: 'fixture-stream', object: 'model' }] } }));
  await page.goto('/');
  await page.waitForFunction(() => !!window.__STORY_NEXUS_E2E__?.getEditorSnapshot().currentChapterId);
  await page.evaluate(() => window.__STORY_NEXUS_E2E__!.configureLocalLLM({ apiUrl: 'http://localhost:1234/v1', modelId: 'fixture-stream' }));
  // Browser streams let tests deliver real tokens, then simulate disconnects or Stop.
  await page.evaluate((partial) => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      if (String(input).startsWith('http://localhost:1234/') && String(input).endsWith('/chat/completions')) {
        const fixture = window as unknown as { fixtureStreamRequests?: number };
        fixture.fixtureStreamRequests = (fixture.fixtureStreamRequests || 0) + 1;
        return new Response(new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content: partial } }] })}\n\n`));
            const disconnect = () => controller.error(new TypeError('Connection lost'));
            Object.assign(window, { disconnectFixtureStream: disconnect });
            init?.signal?.addEventListener('abort', () => controller.error(new DOMException('Stopped', 'AbortError')), { once: true });
          },
        }), { headers: { 'Content-Type': 'text/event-stream' } });
      }
      return originalFetch(input, init);
    };
  }, PARTIAL);
});

test('SceneBeat recovers disconnected generation and regeneration, then accepts saved partial prose', async ({ page }) => {
  await page.evaluate(() => window.__STORY_NEXUS_E2E__!.placeCursorAtTopLevelNode(0, 'end'));
  await page.keyboard.press('Alt+S');
  const beat = page.getByTestId('scene-beat-block').filter({ visible: true });
  await beat.getByTestId('scene-beat-command').fill('Open the mysterious door.');
  await expect.poll(() => page.evaluate(() => window.__STORY_NEXUS_E2E__!.getPersistedChapterContent())).toContain('scene-beat');
  await beat.getByTestId('scene-beat-generate').click();
  await expect(beat.getByTestId('scene-beat-output')).toContainText(PARTIAL);
  await disconnect(page);
  await expect(beat.getByTestId('scene-beat-accept')).toBeVisible();
  await expect.poll(() => persistedRows(page, 'sceneBeats')).toContain(PARTIAL);
  await beat.getByRole('button', { name: 'Regenerate', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Regenerate Response' });
  await dialog.getByRole('textbox').fill('Add more detail.');
  await dialog.getByRole('button', { name: 'Regenerate', exact: true }).click();
  await expect(beat.getByTestId('scene-beat-output')).toContainText(PARTIAL);
  await disconnect(page);
  await expect(beat.getByTestId('scene-beat-accept')).toBeVisible();
  await page.reload();
  await expect(beat.getByTestId('scene-beat-output')).toContainText(PARTIAL);
  await beat.getByTestId('scene-beat-accept').click();
  await expect(page.locator('.sn-generated-prose:visible .sn-generated-prose-content')).toContainText(PARTIAL);
  await expect.poll(() => page.evaluate(() => window.__STORY_NEXUS_E2E__!.getPersistedChapterContent())).toContain('"type":"generated-prose"');
});

test('SceneBeat checkpoints a still-running stream across reload and can reject recovered text', async ({ page }) => {
  await page.evaluate(() => window.__STORY_NEXUS_E2E__!.placeCursorAtTopLevelNode(0, 'end'));
  await page.keyboard.press('Alt+S');
  const beat = page.getByTestId('scene-beat-block').filter({ visible: true });
  await beat.getByTestId('scene-beat-command').fill('Open the mysterious door.');
  await expect.poll(() => page.evaluate(() => window.__STORY_NEXUS_E2E__!.getPersistedChapterContent())).toContain('scene-beat');
  await beat.getByTestId('scene-beat-generate').click();
  await expect(beat.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
  await expect.poll(() => persistedRows(page, 'sceneBeats')).toContain(PARTIAL);
  await page.reload();
  await expect(beat.getByTestId('scene-beat-output')).toContainText(PARTIAL);
  await beat.getByTestId('scene-beat-reject').click();
  await expect(beat.getByTestId('scene-beat-output')).toHaveCount(0);
  await expect.poll(() => persistedRows(page, 'sceneBeats')).not.toContain(PARTIAL);
});

test('brainstorm keeps stopped and disconnected regenerated text after reload', async ({ page }) => {
  const { brainstorm, title } = await openChat(page);
  await brainstorm.getByPlaceholder('Type your message...').fill('What happens at the door?');
  await brainstorm.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(brainstorm).toContainText(PARTIAL);
  await brainstorm.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(brainstorm.getByRole('button', { name: 'Regen', exact: true })).toBeEnabled();
  await expect.poll(() => persistedRows(page, 'aiChats')).toContain(PARTIAL);
  await brainstorm.getByRole('button', { name: 'Regen', exact: true }).click();
  await page.waitForFunction(() => (window as unknown as { fixtureStreamRequests: number }).fixtureStreamRequests === 2);
  await expect(brainstorm.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
  await expect(brainstorm).toContainText(PARTIAL);
  await disconnect(page);
  await expect(brainstorm.getByRole('button', { name: 'Regen', exact: true })).toBeEnabled();
  await reopenChat(page, title);
  await expect(brainstorm).toContainText(PARTIAL);
  await expect(brainstorm).toContainText('What happens at the door?');
});

test('brainstorm checkpoints a running response before reload', async ({ page }) => {
  const { brainstorm, title } = await openChat(page);
  await brainstorm.getByPlaceholder('Type your message...').fill('What happens next?');
  await brainstorm.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(brainstorm.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
  await expect.poll(() => persistedRows(page, 'aiChats')).toContain(PARTIAL);
  await reopenChat(page, title);
  await expect(brainstorm).toContainText(PARTIAL);
});

async function disconnect(page: Page) {
  await page.evaluate(() => (window as unknown as { disconnectFixtureStream: () => void }).disconnectFixtureStream());
}

async function openChat(page: Page) {
  await page.getByRole('button', { name: 'Brainstorm', exact: true }).click();
  const brainstorm = page.getByRole('dialog', { name: 'Brainstorm', exact: true });
  await brainstorm.getByRole('button', { name: 'Start New Brainstorm', exact: true }).click();
  const title = await brainstorm.getByRole('button', { name: /^New Chat / }).innerText();
  return { brainstorm, title };
}

async function reopenChat(page: Page, title: string) {
  await page.reload();
  await page.waitForFunction(() => !!window.__STORY_NEXUS_E2E__?.getEditorSnapshot().currentChapterId);
  await page.getByRole('button', { name: 'Brainstorm', exact: true }).click();
  await page.getByRole('button', { name: 'Select a chat', exact: true }).click();
  await page.getByRole('menuitem').filter({ hasText: title }).click();
}

async function persistedRows(page: Page, table: string) {
  return page.evaluate((tableName) => new Promise<string>((resolve, reject) => {
    const request = indexedDB.open('StoryDatabase');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const rows = database.transaction(tableName).objectStore(tableName).getAll();
      rows.onsuccess = () => { database.close(); resolve(JSON.stringify(rows.result)); };
      rows.onerror = () => { database.close(); reject(rows.error); };
    };
  }), table);
}
