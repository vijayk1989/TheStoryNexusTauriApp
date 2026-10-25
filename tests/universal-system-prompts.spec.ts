/// <reference path="./e2e-globals.d.ts" />

import { expect, test, type Locator } from '@playwright/test';
import { installPaidProviderGuard } from './local-llm';

test('creates a universal system prompt and previews, persists, generates, and restores SceneBeat messages', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const paidGuard = await installPaidProviderGuard(page);
  const requests: Array<{ messages: Array<{ role: string; content: string }>; max_tokens: number; model: string }> = [];
  await page.route('http://localhost:1234/**', async route => {
    if (route.request().url().endsWith('/chat/completions')) {
      requests.push(route.request().postDataJSON());
      const chunk = { choices: [{ delta: { content: 'The fixture harbor lights flickered.' }, finish_reason: null }] };
      await route.fulfill({
        contentType: 'text/event-stream',
        body: `data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`,
      });
    } else {
      await route.fulfill({ json: { data: [{ id: 'fixture-local', object: 'model' }] } });
    }
  });

  await page.goto('/');
  await expect(page.locator('[aria-label="Chapter editor"]').first()).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => !!window.__STORY_NEXUS_E2E__?.getEditorSnapshot().currentChapterId);
  await page.evaluate(() => window.__STORY_NEXUS_E2E__!.configureLocalLLM({
    apiUrl: 'http://localhost:1234/v1', modelId: 'fixture-local', modelName: 'Fixture local',
  }));

  // Use the real prompt form rather than introducing a fixture-only creation path.
  await page.getByRole('button', { name: 'Prompts', exact: true }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('button', { name: 'New Prompt', exact: true }).click();
  await sheet.getByPlaceholder('Prompt name', { exact: true }).fill('Universal fixture');
  await sheet.getByRole('combobox', { name: 'Prompt Type', exact: true }).click();
  await page.getByRole('option', { name: 'Universal System', exact: true }).click();
  await expect(sheet.locator('textarea')).toHaveCount(1);
  await expect(sheet.getByText('Available Models', { exact: true })).toHaveCount(0);
  await expect(sheet.getByText('Prompt Settings', { exact: true })).toHaveCount(0);
  await expect(sheet.getByRole('button', { name: 'User', exact: true })).toHaveCount(0);
  await expect(sheet.getByRole('button', { name: 'Assistant', exact: true })).toHaveCount(0);
  await sheet.getByPlaceholder('Enter system message...').fill('Universal fixture: {{scenebeat}}');
  await sheet.getByRole('button', { name: 'Create Prompt', exact: true }).click();
  await expect(page.getByText('Prompt created successfully', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();

  await page.evaluate(() => window.__STORY_NEXUS_E2E__!.placeCursorAtTopLevelNode(0, 'end'));
  await page.keyboard.press('Alt+S');
  const block = page.getByTestId('scene-beat-block').filter({ visible: true });
  await expect(block).toHaveCount(1);
  await block.getByTestId('scene-beat-command').fill('Write the harbor scene.');
  const universalSelect = block.getByRole('combobox', { name: 'Universal system prompt', exact: true });
  await expect(universalSelect).toContainText('None');
  await expect(block.getByTestId('scene-beat-generate')).toBeEnabled();
  await expectUniformControlHeights([
    block.getByRole('menubar'), universalSelect,
    block.getByRole('button', { name: 'Preview Prompt', exact: true }),
    block.getByRole('button', { name: 'Edit Prompt', exact: true }),
    block.getByTestId('scene-beat-generate'),
  ]);

  await block.getByRole('button', { name: 'Preview Prompt', exact: true }).click();
  const preview = page.getByRole('dialog');
  await expect(preview.getByText('Resolved Prompt Preview', { exact: true })).toBeVisible();
  const originalContents = await preview.locator('.whitespace-pre-wrap').allTextContents();
  expect(originalContents[0]).toContain('expert fiction writer');
  await page.keyboard.press('Escape');

  await universalSelect.click();
  await page.getByRole('option', { name: 'Universal fixture', exact: true }).click();
  await expect(universalSelect).toContainText('Universal fixture');
  await block.getByRole('button', { name: 'Preview Prompt', exact: true }).click();
  await expect(preview.getByText('Resolved Prompt Preview', { exact: true })).toBeVisible();
  const overriddenContents = await preview.locator('.whitespace-pre-wrap').allTextContents();
  expect(overriddenContents[0]).toBe('Universal fixture: Write the harbor scene.');
  expect(overriddenContents.slice(1)).toEqual(originalContents.slice(1));
  await page.keyboard.press('Escape');
  await expect(preview).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath('universal-system-selector.png') });

  await expect.poll(() => page.evaluate(() => window.__STORY_NEXUS_E2E__!.getPersistedChapterContent())).toContain('universalSystemPromptId');
  await page.reload();
  await page.waitForFunction(() => !!window.__STORY_NEXUS_E2E__?.getEditorSnapshot().currentChapterId);
  await expect(universalSelect).toContainText('Universal fixture');
  await expect(block.getByTestId('scene-beat-generate')).toBeEnabled();
  await block.getByTestId('scene-beat-generate').click();
  await expect(block.getByTestId('scene-beat-accept')).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0].messages.map(message => message.content)).toEqual(overriddenContents);
  expect(requests[0].max_tokens).toBe(160);
  expect(requests[0].model).toBe('fixture-local');

  await block.getByRole('button', { name: 'Regenerate', exact: true }).click();
  await page.getByRole('dialog').locator('textarea').fill('Make it shorter.');
  await page.getByRole('dialog').getByRole('button', { name: 'Regenerate', exact: true }).click();
  await expect.poll(() => requests.length).toBe(2);
  await expect(block.getByTestId('scene-beat-accept')).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[1].messages.slice(0, overriddenContents.length).map(message => message.content)).toEqual(overriddenContents);
  expect(requests[1].messages.filter(message => message.role === 'system')).toHaveLength(1);
  await block.getByTestId('scene-beat-accept').click();
  await expect(page.locator('.sn-generated-prose:visible')).toContainText('The fixture harbor lights flickered.');

  await universalSelect.click();
  await page.getByRole('option', { name: 'None', exact: true }).click();
  await block.getByRole('button', { name: 'Preview Prompt', exact: true }).click();
  await expect(preview.getByText('Resolved Prompt Preview', { exact: true })).toBeVisible();
  expect(await preview.locator('.whitespace-pre-wrap').allTextContents()).toEqual(originalContents);
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => window.__STORY_NEXUS_E2E__!.getPersistedChapterContent())).not.toContain('universalSystemPromptId');
  await page.reload();
  await page.waitForFunction(() => !!window.__STORY_NEXUS_E2E__?.getEditorSnapshot().currentChapterId);
  await expect(universalSelect).toContainText('None');
  const state = await page.evaluate(() => window.__STORY_NEXUS_E2E__!.getEditorSnapshot());
  expect(state.plainText).toContain('The fixture harbor lights flickered.');

  await block.getByRole('button', { name: 'Delete SceneBeat', exact: true }).click();
  await expect(block).toHaveCount(0);
  await expect(page.locator('.sn-generated-prose:visible')).toContainText('The fixture harbor lights flickered.');
  expect(paidGuard.getBlockedUrls()).toEqual([]);
});

test('Brainstorm applies universal prompts to preview, generation, regeneration, and saved chat selections', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const paidGuard = await installPaidProviderGuard(page);
  const requests: Array<{ messages: Array<{ role: string; content: string }>; model: string }> = [];
  await page.route('http://localhost:1234/**', async route => {
    if (route.request().url().endsWith('/chat/completions')) {
      requests.push(route.request().postDataJSON());
      await route.fulfill({ contentType: 'text/event-stream', body: `data: ${JSON.stringify({
        choices: [{ delta: { content: 'A fixture brainstorm idea.' }, finish_reason: null }],
      })}\n\ndata: [DONE]\n\n` });
    } else {
      await route.fulfill({ json: { data: [{ id: 'fixture-local', object: 'model' }] } });
    }
  });
  await page.goto('/');
  await expect(page.locator('[aria-label="Chapter editor"]').first()).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => !!window.__STORY_NEXUS_E2E__?.getEditorSnapshot().currentChapterId);
  await page.evaluate(() => window.__STORY_NEXUS_E2E__!.configureLocalLLM({
    apiUrl: 'http://localhost:1234/v1', modelId: 'fixture-local', modelName: 'Fixture local',
  }));

  await page.getByRole('button', { name: 'Prompts', exact: true }).click();
  const promptSheet = page.getByRole('dialog', { name: 'Prompts', exact: true });
  await promptSheet.getByRole('button', { name: 'New Prompt', exact: true }).click();
  await promptSheet.getByPlaceholder('Prompt name', { exact: true }).fill('Universal brainstorm fixture');
  await promptSheet.getByRole('combobox', { name: 'Prompt Type', exact: true }).click();
  await page.getByRole('option', { name: 'Universal System', exact: true }).click();
  await promptSheet.getByPlaceholder('Enter system message...').fill('Universal brainstorming instructions.');
  await promptSheet.getByRole('button', { name: 'Create Prompt', exact: true }).click();
  await expect(page.getByText('Prompt created successfully', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(promptSheet).toBeHidden();

  await page.getByRole('button', { name: 'Brainstorm', exact: true }).click();
  const brainstorm = page.getByRole('dialog', { name: 'Brainstorm', exact: true });
  await brainstorm.getByRole('button', { name: 'Start New Brainstorm', exact: true }).click();
  const chatTitle = await brainstorm.getByRole('button', { name: /^New Chat / }).innerText();
  const input = brainstorm.getByPlaceholder('Type your message...');
  const universalSelect = brainstorm.getByRole('combobox', { name: 'Universal system prompt', exact: true });
  await expect(universalSelect).toContainText('None');
  await input.fill('Suggest a harbor mystery.');
  await brainstorm.getByRole('button', { name: 'Preview Prompt', exact: true }).click();
  const preview = page.getByRole('dialog', { name: /Resolved Prompt Preview/ });
  await expect(preview).toBeVisible();
  const originalContents = await preview.locator('.whitespace-pre-wrap').allTextContents();
  await page.keyboard.press('Escape');
  await expect(preview).toBeHidden();
  await universalSelect.click();
  await page.getByRole('option', { name: 'Universal brainstorm fixture', exact: true }).click();

  const pin = brainstorm.getByTestId('brainstorm-pin-to-chapter');
  await pin.click();
  await page.keyboard.press('Escape');
  await expect(brainstorm).toBeHidden();
  await page.getByRole('button', { name: 'Brainstorm', exact: true }).click();
  await expect(universalSelect).toContainText('Universal brainstorm fixture');
  await expect(input).toHaveValue('Suggest a harbor mystery.');
  await expect(pin).toHaveAttribute('data-state', 'checked');
  await pin.click();

  await expectUniformControlHeights([
    brainstorm.getByRole('menubar'), universalSelect, brainstorm.locator('[data-template-select="true"]'),
    brainstorm.getByRole('button', { name: 'Preview Prompt', exact: true }),
    brainstorm.getByRole('button', { name: 'Edit Prompt', exact: true }),
    brainstorm.getByRole('button', { name: 'Send message', exact: true }),
  ]);
  await page.screenshot({ path: testInfo.outputPath('brainstorm-universal-toolbar.png') });
  await brainstorm.getByRole('button', { name: 'Preview Prompt', exact: true }).click();
  await expect(preview).toBeVisible();
  const resolvedContents = await preview.locator('.whitespace-pre-wrap').allTextContents();
  expect(resolvedContents[0]).toBe('Universal brainstorming instructions.');
  expect(resolvedContents.slice(1)).toEqual(originalContents.slice(1));
  await page.keyboard.press('Escape');
  await brainstorm.getByRole('button', { name: 'Send message', exact: true }).click();
  const regenerate = brainstorm.getByRole('button', { name: 'Regen', exact: true });
  await expect(regenerate).toBeEnabled();
  expect(requests).toHaveLength(1);
  expect(requests[0].messages.map(message => message.content)).toEqual(resolvedContents);
  expect(requests[0].model).toBe('fixture-local');
  await regenerate.click();
  await expect.poll(() => requests.length).toBe(2);
  await expect(regenerate).toBeEnabled();
  expect(requests[1].messages[0]).toEqual({ role: 'system', content: 'Universal brainstorming instructions.' });
  expect(requests[1].messages.filter(message => message.role === 'system')).toHaveLength(1);

  await brainstorm.getByRole('button', { name: 'New Chat', exact: true }).click();
  await expect(universalSelect).toContainText('None');
  await brainstorm.getByRole('button', { name: /^New Chat / }).click();
  await page.getByRole('menuitem').filter({ hasText: chatTitle }).click();
  await expect(universalSelect).toContainText('Universal brainstorm fixture');
  await page.reload();
  await expect(page.locator('[aria-label="Chapter editor"]').first()).toBeVisible();
  await page.getByRole('button', { name: 'Brainstorm', exact: true }).click();
  await brainstorm.getByRole('button', { name: 'Select a chat', exact: true }).click();
  await page.getByRole('menuitem').filter({ hasText: chatTitle }).click();
  await expect(universalSelect).toContainText('Universal brainstorm fixture');
  await universalSelect.click();
  await page.getByRole('option', { name: 'None', exact: true }).click();
  await input.fill('Suggest another idea.');
  await brainstorm.getByRole('button', { name: 'Preview Prompt', exact: true }).click();
  await expect(preview).toBeVisible();
  expect((await preview.locator('.whitespace-pre-wrap').allTextContents())[0]).toBe(originalContents[0]);
  await page.keyboard.press('Escape');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(universalSelect).toBeVisible();
  const bounds = await universalSelect.boundingBox();
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(bounds!.height).toBeCloseTo(40, 1);
  await page.screenshot({ path: testInfo.outputPath('brainstorm-universal-mobile.png') });
  expect(paidGuard.getBlockedUrls()).toEqual([]);
});

async function expectUniformControlHeights(controls: Locator[]) {
  for (const control of controls) {
    await expect(control).toBeVisible();
    const bounds = await control.boundingBox();
    expect(bounds?.height).toBeCloseTo(40, 1);
  }
}
