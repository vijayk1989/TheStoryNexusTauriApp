import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest';
import { Blob as NodeBlob } from 'node:buffer';
import { db } from '@/services/database';
import { buildBrainstormMessages } from '@/features/brainstorm/services/brainstormMessages';
import { bytesToImageDataUrl, decodeChatImage, prepareChatImage } from '@/features/brainstorm/services/chatImages';
import { googleMessageContents, hasImageInput, messageText, validateImageModel } from '@/services/ai/multimodal';
import { createSiteBackupPayload, siteBackupService } from '@/services/siteBackupService';
import type { AISettings, ChatMessage, GenerationMessage } from '@/types/story';
import { resetTestDb } from './testDb';
import { aiService } from '@/services/ai/AIService';
import { useImageGenerationStore } from '@/features/images/stores/useImageGenerationStore';

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const imageUrl = `data:image/png;base64,${PNG}`;
const config = { storyId: 'image-story', promptId: 'image-task', scenebeat: 'Describe the new image.', additionalContext: {} };

describe('Brainstorm image messages', () => {
    beforeEach(async () => {
        await resetTestDb();
        // fake-indexeddb uses Node structuredClone, which requires a native Blob.
        vi.stubGlobal('Blob', NodeBlob);
        await db.stories.put({ id: config.storyId, createdAt: new Date(), title: 'Image story', author: '', language: 'English' });
        await db.prompts.put({ id: config.promptId, createdAt: new Date(), name: 'Image task', promptType: 'brainstorm', allowedModels: [], messages: [
            { role: 'system', content: 'System instructions.' },
            { role: 'user', content: 'History: {{chat_history}}' },
            { role: 'user', content: 'Question: {{user_input}}' },
            { role: 'assistant', content: 'Prefill' },
        ] });
        await seedImage('picture');
    });
    afterEach(() => { vi.unstubAllGlobals(); (aiService as any).settings = null; (aiService as any).googleAI = null; });

    test('combines image and text input while preserving template roles and system instructions', async () => {
        const messages = await buildBrainstormMessages(config, [], ['picture']);
        expect(messages[0]).toEqual({ role: 'system', content: 'System instructions.' });
        expect(messages.at(-1)).toEqual({ role: 'assistant', content: 'Prefill' });
        expect(messages.find(message => Array.isArray(message.content))).toEqual({ role: 'user', content: [
            { type: 'text', text: 'Question: Describe the new image.' }, { type: 'image_url', image_url: { url: imageUrl } },
        ] });
    });

    test('retains historical images with their original user messages, once per request', async () => {
        const history: ChatMessage[] = [
            { id: 'user', role: 'user', content: 'Look at this.', imageAssetIds: ['picture'], timestamp: new Date() },
            { id: 'assistant', role: 'assistant', content: 'A red square.', timestamp: new Date() },
        ];
        const result = await buildBrainstormMessages({ ...config, additionalContext: { chatHistory: history } }, history, []);
        expect(result.filter(message => Array.isArray(message.content))).toHaveLength(1);
        expect(result.map(message => message.role)).toEqual(['system', 'user', 'user', 'assistant', 'user', 'assistant']);
        expect(result.map(message => messageText(message.content))).toContain('Look at this.');
        expect(result.map(message => messageText(message.content))).toContain('A red square.');
        expect(result.at(-2)?.content).toBe('Question: Describe the new image.');
    });

    test('keeps image history even when a custom template has no chat_history placeholder', async () => {
        await db.prompts.update(config.promptId, { messages: [{ role: 'user', content: '{{user_input}}' }] });
        const history: ChatMessage[] = [{ id: 'older', role: 'user', content: '', imageAssetIds: ['picture'], timestamp: new Date() }];
        const result = await buildBrainstormMessages(config, history, []);
        expect(result).toHaveLength(2);
        expect(Array.isArray(result[0].content)).toBe(true);
        expect(result[1].content).toBe(config.scenebeat);
    });

    test('leaves text-only parsing unchanged', async () => {
        const result = await buildBrainstormMessages(config, [], []);
        expect(result.map(message => message.content)).toEqual(['System instructions.', 'History: No previous conversation history.', 'Question: Describe the new image.', 'Prefill']);
    });

    test('fails clearly for missing images and cross-story references', async () => {
        await expect(buildBrainstormMessages(config, [], ['deleted'])).rejects.toThrow('missing');
        await db.mediaAssets.update('picture', { storyId: 'other-story' });
        await expect(buildBrainstormMessages(config, [], ['picture'])).rejects.toThrow('missing');
    });

    test('limits conversation image counts without silently omitting images', async () => {
        await expect(buildBrainstormMessages(config, [], Array(13).fill('picture'))).rejects.toThrow('more than 12');
    });

    test('validates file types and encoded sizes', async () => {
        expect(decodeChatImage(imageUrl).mimeType).toBe('image/png');
        expect(bytesToImageDataUrl(decodeChatImage(imageUrl).bytes, 'image/png')).toBe(imageUrl);
        expect(() => decodeChatImage('data:image/svg+xml;base64,PHN2Zz4=')).toThrow('Invalid');
        expect(() => decodeChatImage('data:image/png;base64,%%%')).toThrow('Invalid');
        await expect(prepareChatImage(new File(['text'], 'file.txt', { type: 'text/plain' }), true)).rejects.toThrow('PNG');
        await expect(prepareChatImage(new File([], 'empty.png', { type: 'image/png' }), true)).rejects.toThrow('20 MB');
    });

    test('maps image parts to Gemini inline data and counts only actual text', async () => {
        const messages: GenerationMessage[] = [{ role: 'user', content: [
            { type: 'text', text: 'Describe this.' }, { type: 'image_url', image_url: { url: imageUrl } },
        ] }];
        expect(hasImageInput(messages)).toBe(true);
        expect(messageText(messages[0].content)).toBe('Describe this.');
        expect(googleMessageContents(messages)).toEqual([{ role: 'user', parts: [
            { text: 'Describe this.' }, { inlineData: { mimeType: 'image/png', data: PNG } },
        ] }]);
    });

    test('rejects a known text-only local model using native LM Studio metadata', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ models: [
            { key: 'text-model', capabilities: { vision: false } },
        ] })));
        const settings = { availableModels: [], localRuntime: 'lm_studio', localApiUrl: 'http://localhost:1234/v1' } as AISettings;
        await expect(validateImageModel([{ role: 'user', content: [{ type: 'image_url', image_url: { url: imageUrl } }] }],
            { provider: 'local', id: 'local/text-model', name: 'Text model' }, settings)).rejects.toThrow('vision-capable');
    });

    test('includes chat image bytes in Site Backup and remaps imported references', async () => {
        await db.aiChats.put({ id: 'image-chat', storyId: config.storyId, title: 'Image chat', createdAt: new Date(),
            draftImageAssetIds: ['picture'], messages: [{ id: 'message', role: 'user', content: 'Picture', imageAssetIds: ['picture'], timestamp: new Date() }] });
        const { backup, summary } = await createSiteBackupPayload();
        expect(backup.data.chatImages).toHaveLength(1);
        expect(backup.data.chatImages![0].dataUrl).toBe(imageUrl);
        expect(summary.skippedImages).toBe(0);
        const result = await siteBackupService.importSiteBackup(JSON.stringify(backup));
        const imported = await db.aiChats.where('storyId').equals(result.importedStoryIds[0]).first();
        const newId = imported!.messages[0].imageAssetIds![0];
        expect(newId).not.toBe('picture');
        expect(imported?.draftImageAssetIds).toEqual([newId]);
        expect((await db.mediaBlobs.get(newId))?.blob.size).toBe(decodeChatImage(imageUrl).bytes.length);
        expect((await db.mediaAssets.get(newId))?.storyId).toBe(result.importedStoryIds[0]);
        const roundTrip = await createSiteBackupPayload();
        expect(roundTrip.backup.data.chatImages?.map(image => image.dataUrl)).toEqual([imageUrl, imageUrl]);
    });

    test('sends multimodal content unchanged through the local compatible endpoint', async () => {
        const service = aiService as any;
        service.settings = { availableModels: [], localRuntime: 'lm_studio', localApiUrl: 'http://localhost:1234/v1' };
        const fetchMock = vi.fn(async (url: string) => url.endsWith('/api/v1/models')
            ? Response.json({ models: [{ key: 'fixture-vision', capabilities: { vision: true } }] })
            : new Response('data: [DONE]\n\n'));
        vi.stubGlobal('fetch', fetchMock);
        const messages: GenerationMessage[] = [{ role: 'user', content: [{ type: 'image_url', image_url: { url: imageUrl } }] }];
        await aiService.generateWithLocalModel(messages, 0.5, 200, undefined, undefined, undefined, undefined, 'fixture-vision');
        expect(JSON.parse((fetchMock.mock.calls.at(-1) as any)[1].body).messages).toEqual(messages);
    });

    test('the Gemini adapter sends inline image data and retains system instructions', async () => {
        const stream = vi.fn(async function* () { yield { text: 'Image description' }; });
        const service = aiService as any;
        service.settings = { googleKey: 'unit-placeholder', availableModels: [] };
        service.googleAI = { models: { generateContentStream: vi.fn(async () => stream()) } };
        const response = await aiService.generateWithGoogle([
            { role: 'system', content: 'System instructions' },
            { role: 'user', content: [{ type: 'image_url', image_url: { url: imageUrl } }] },
        ], 'fixture-vision');
        expect(service.googleAI.models.generateContentStream).toHaveBeenCalledWith(expect.objectContaining({
            config: expect.objectContaining({ systemInstruction: 'System instructions' }),
            contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/png', data: PNG } }] }],
        }));
        expect(await response.text()).toContain('Image description');
    });

    test('rejects invalid backup image data before importing any stories', async () => {
        const { backup } = await createSiteBackupPayload();
        backup.data.chatImages = [{ asset: (await db.mediaAssets.get('picture'))!, dataUrl: 'data:text/html;base64,eA==' }];
        await expect(siteBackupService.importSiteBackup(JSON.stringify(backup))).rejects.toThrow('Invalid');
        expect(await db.stories.count()).toBe(1);
    });

    test('gallery deletion archives a chat image without removing the bytes used by history', async () => {
        await db.aiChats.put({ id: 'image-chat', storyId: config.storyId, title: 'Image chat', createdAt: new Date(),
            messages: [{ id: 'message', role: 'user', content: '', imageAssetIds: ['picture'], timestamp: new Date() }] });
        await useImageGenerationStore.getState().archiveOrDeleteAsset('picture');
        expect((await db.mediaAssets.get('picture'))?.archivedAt).toBeTruthy();
        expect(await db.mediaBlobs.get('picture')).toBeTruthy();
        expect(await buildBrainstormMessages(config, [], ['picture'])).toBeTruthy();
    });
});

async function seedImage(id: string) {
    const { bytes, mimeType } = decodeChatImage(imageUrl);
    await db.mediaAssets.put({ id, createdAt: new Date(), storyId: config.storyId, kind: 'uploaded', mimeType,
        filename: 'pixel.png', storageBackend: 'indexeddb_blob', storageKey: id, sizeBytes: bytes.length, source: 'upload' });
    await db.mediaBlobs.put({ assetId: id, blob: new Blob([bytes], { type: mimeType }), createdAt: new Date() });
}
