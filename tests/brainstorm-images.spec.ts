/// <reference path="./e2e-globals.d.ts" />
import { expect, test } from '@playwright/test';
import { installPaidProviderGuard } from './local-llm';

test('pastes, resizes, previews, saves, sends, and regenerates images through a local vision model', async ({ page, context }, testInfo) => {
  test.setTimeout(120_000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const paidGuard = await installPaidProviderGuard(page);
  let supportsVision = true;
  let rejectNextRequest = false;
  let responseGate: Promise<void> | undefined;
  const requests: any[] = [];
  await page.route('http://localhost:1234/**', async route => {
    const url = route.request().url();
    if (url.endsWith('/api/v1/models')) {
      await route.fulfill({ json: { models: [{ key: 'fixture-vision', capabilities: { vision: supportsVision } }] } });
    } else if (url.endsWith('/chat/completions')) {
      requests.push(route.request().postDataJSON());
      await responseGate;
      if (rejectNextRequest) {
        rejectNextRequest = false;
        await route.fulfill({ status: 400, body: 'Image input was rejected by the server.' });
        return;
      }
      await route.fulfill({ contentType: 'text/event-stream', body: `data: ${JSON.stringify({ choices: [
        { delta: { content: 'The picture contains a red rectangle.' }, finish_reason: null },
      ] })}\n\ndata: [DONE]\n\n` });
    } else {
      await route.fulfill({ json: { data: [{ id: 'fixture-vision', object: 'model' }] } });
    }
  });
  await page.goto('/');
  await expect(page.locator('[aria-label="Chapter editor"]').first()).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => !!window.__STORY_NEXUS_E2E__?.getEditorSnapshot().currentChapterId);
  await page.evaluate(() => window.__STORY_NEXUS_E2E__!.configureLocalLLM({ apiUrl: 'http://localhost:1234/v1', modelId: 'fixture-vision' }));
  const imageBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 1000;
    const drawing = canvas.getContext('2d')!;
    drawing.fillStyle = 'red';
    drawing.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.getByRole('button', { name: 'Brainstorm', exact: true }).click();
  const brainstorm = page.getByRole('dialog', { name: 'Brainstorm', exact: true });
  await brainstorm.getByRole('button', { name: 'Start New Brainstorm', exact: true }).click();
  const chatTitle = await brainstorm.getByRole('button', { name: /^New Chat / }).innerText();
  const input = brainstorm.getByPlaceholder('Type your message...');
  const send = brainstorm.getByRole('button', { name: 'Send message', exact: true });
  const upload = brainstorm.getByLabel('Attach images', { exact: true });
  await upload.setInputFiles({ name: 'unsupported.txt', mimeType: 'text/plain', buffer: Buffer.from('text') });
  await expect(page.getByText('Attach a PNG, JPEG, or WebP image.', { exact: true })).toBeVisible();

  await page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': new Blob([bytes], { type: 'image/png' }) })]);
  }, imageBase64);
  await input.focus();
  await page.keyboard.press('Control+V');
  const attachedImage = brainstorm.getByRole('img', { name: 'Attached image 1', exact: true });
  await expect(attachedImage).toBeVisible();
  await expect(send).toBeEnabled();
  expect(await input.inputValue()).toBe('');
  expect(await attachedImage.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(1600);
  await brainstorm.getByRole('button', { name: 'Preview Prompt', exact: true }).click();
  const preview = page.getByRole('dialog', { name: /Resolved Prompt Preview/ });
  await expect(preview.getByRole('img', { name: 'Attached image 1', exact: true })).toBeVisible();
  await expect(preview).toContainText('text tokens (images extra)');
  await page.keyboard.press('Escape');
  await expect(preview).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath('brainstorm-pasted-image.png') });
  await page.keyboard.press('Escape');
  await expect(brainstorm).toBeHidden();
  await page.getByRole('button', { name: 'Brainstorm', exact: true }).click();
  await expect(attachedImage).toBeVisible();

  supportsVision = false;
  await send.click();
  await expect(brainstorm.getByRole('alert')).toContainText('does not support image input');
  expect(requests).toHaveLength(0);
  await expect(brainstorm.getByRole('button', { name: 'Remove attached image 1', exact: true })).toBeVisible();
  supportsVision = true;
  rejectNextRequest = true;
  await send.click();
  await expect(brainstorm.getByRole('alert')).toContainText('Image input was rejected by the server.');
  await expect(brainstorm.getByRole('article', { name: 'Your message', exact: true })).toHaveCount(0);
  await expect(brainstorm.getByRole('button', { name: 'Remove attached image 1', exact: true })).toBeVisible();
  await expect(brainstorm.getByRole('status').filter({ hasText: 'Waiting for response...' })).toHaveCount(0);
  requests.length = 0;

  let releaseResponse!: () => void;
  responseGate = new Promise(resolve => { releaseResponse = resolve; });
  try {
    await send.click();
    await expect.poll(() => requests.length).toBe(1);
    await expect(brainstorm.getByRole('article', { name: 'Your message', exact: true }).getByRole('img', { name: 'Attached image 1', exact: true })).toBeVisible();
    await expect(attachedImage).toHaveCount(1);
    await expect(brainstorm.getByRole('button', { name: 'Remove attached image 1', exact: true })).toHaveCount(0);
    await expect(input).toHaveValue('');
    await expect(brainstorm.getByRole('status')).toContainText('Waiting for response...');
  } finally {
    releaseResponse();
    responseGate = undefined;
  }
  const regenerate = brainstorm.getByRole('button', { name: 'Regen', exact: true });
  await expect(regenerate).toBeEnabled();
  await expect(brainstorm.getByRole('article', { name: 'Your message', exact: true })).toHaveCount(1);
  await expect(brainstorm.getByRole('status').filter({ hasText: 'Waiting for response...' })).toHaveCount(0);
  expect(requests).toHaveLength(1);
  expect(imagesIn(requests[0])).toHaveLength(1);
  expect(imagesIn(requests[0])[0].image_url.url).toMatch(/^data:image\/png;base64,/);
  expect(requests[0].messages[0].role).toBe('system');
  await expect(brainstorm.getByRole('button', { name: 'Remove attached image 1', exact: true })).toHaveCount(0);

  await input.fill('What color was the picture?');
  responseGate = new Promise(resolve => { releaseResponse = resolve; });
  try {
    await send.click();
    await expect.poll(() => requests.length).toBe(2);
    await expect(input).toHaveValue('');
    await expect(brainstorm.getByRole('article', { name: 'Your message', exact: true }).last()).toContainText('What color was the picture?');
    await expect(brainstorm.getByRole('status')).toContainText('Waiting for response...');
    await input.fill('A draft for later.');
  } finally {
    releaseResponse();
    responseGate = undefined;
  }
  await expect(regenerate).toBeEnabled();
  await expect(input).toHaveValue('A draft for later.');
  await input.fill('');
  expect(imagesIn(requests[1])).toHaveLength(1);
  expect(imagesIn(requests[1])[0]).toEqual(imagesIn(requests[0])[0]);
  const imageMessageIndex = requests[1].messages.findIndex((message: any) => Array.isArray(message.content));
  expect(requests[1].messages[imageMessageIndex].role).toBe('user');
  expect(JSON.stringify(requests[1].messages.slice(imageMessageIndex + 1))).toContain('What color was the picture?');
  await regenerate.click();
  await expect.poll(() => requests.length).toBe(3);
  await expect(regenerate).toBeEnabled();
  expect(imagesIn(requests[2])).toHaveLength(1);

  await upload.setInputFiles({ name: 'second.png', mimeType: 'image/png', buffer: Buffer.from(imageBase64, 'base64') });
  await expect(brainstorm.getByRole('button', { name: 'Remove attached image 1', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('[aria-label="Chapter editor"]').first()).toBeVisible();
  await page.getByRole('button', { name: 'Brainstorm', exact: true }).click();
  await brainstorm.getByRole('button', { name: 'Select a chat', exact: true }).click();
  await page.getByRole('menuitem').filter({ hasText: chatTitle }).click();
  await expect(attachedImage).toHaveCount(2);
  await expect(brainstorm.getByRole('button', { name: 'Remove attached image 1', exact: true })).toBeVisible();
  await brainstorm.getByRole('button', { name: 'Remove attached image 1', exact: true }).click();
  await expect(attachedImage).toHaveCount(1);
  await expect(send).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(attachedImage).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('brainstorm-images-mobile.png') });
  await brainstorm.getByRole('button', { name: 'Delete image message', exact: true }).click();
  await expect(attachedImage).toHaveCount(0);
  supportsVision = false;
  await input.fill('Continue without the picture.');
  await send.click();
  await expect.poll(() => requests.length).toBe(4);
  await expect(regenerate).toBeEnabled();
  expect(imagesIn(requests[3])).toHaveLength(0);
  expect(paidGuard.getBlockedUrls()).toEqual([]);
});

function imagesIn(request: any) {
  return request.messages.flatMap((message: any) => Array.isArray(message.content) ? message.content.filter((part: any) => part.type === 'image_url') : []);
}
