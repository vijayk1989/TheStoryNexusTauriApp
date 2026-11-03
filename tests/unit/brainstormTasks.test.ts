import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { db } from '@/services/database';
import { startBrainstormGeneration, type BrainstormGenerationRequest } from '@/features/brainstorm/services/brainstormGeneration';
import { useBrainstormStore } from '@/features/brainstorm/stores/useBrainstormStore';
import { useBrainstormTaskStore } from '@/features/brainstorm/stores/useBrainstormTaskStore';
import type { AIChat, ChatMessage } from '@/types/story';
import { resetTestDb } from './testDb';

const model = { id: 'local/fixture', name: 'Fixture', provider: 'local' as const };
const first: AIChat = { id: 'first-chat', storyId: 'task-story', title: 'First chat', messages: [], createdAt: new Date() };
const second: AIChat = { ...first, id: 'second-chat', title: 'Second chat' };
const streams: Array<{ controller: ReadableStreamDefaultController<Uint8Array>; signal?: AbortSignal }> = [];
const encode = (content: string) => new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`);

function request(chatId = first.id): BrainstormGenerationRequest {
    const user: ChatMessage = { id: `user-${chatId}`, role: 'user', content: 'Write an idea.', timestamp: new Date() };
    return {
        chatId, mode: 'submission', previousMessages: [], messagesBeforeReply: [user], submittedInput: user.content,
        model, config: { storyId: first.storyId, promptId: 'task-prompt', scenebeat: user.content, additionalContext: { chatHistory: [] } },
    };
}

function finish(index: number, text: string) {
    streams[index].controller.enqueue(encode(text));
    streams[index].controller.close();
}

describe('background Brainstorm tasks', () => {
    beforeEach(async () => {
        await resetTestDb();
        streams.length = 0;
        useBrainstormTaskStore.setState({ tasks: {} });
        useBrainstormStore.setState({ chats: [first, second], selectedChat: first, loadedStoryId: first.storyId, draftMessage: '', draftMessages: {} });
        await db.aiChats.bulkPut([first, second]);
        await db.stories.put({ id: first.storyId, title: 'Task story', author: '', language: 'English', createdAt: new Date() });
        await db.prompts.put({ id: 'task-prompt', name: 'Task prompt', promptType: 'brainstorm', createdAt: new Date(), allowedModels: [model], messages: [{ role: 'user', content: '{{user_input}}' }] });
        await db.aiSettings.put({ id: 'task-settings', createdAt: new Date(), localApiUrl: 'http://localhost:1234/v1', availableModels: [{ ...model, contextLength: 32768, enabled: true }] });
        vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
            if (url !== 'http://localhost:1234/v1/chat/completions') throw new Error(`Unexpected network request: ${url}`);
            return new Response(new ReadableStream<Uint8Array>({
                start(controller) {
                    streams.push({ controller, signal: init?.signal });
                    init?.signal?.addEventListener('abort', () => controller.error(new DOMException('Stopped', 'AbortError')), { once: true });
                },
            }));
        }));
    });
    afterEach(() => vi.unstubAllGlobals());

    test('finishes in the original chat after another chat is selected', async () => {
        const running = startBrainstormGeneration(request());
        await vi.waitFor(() => expect(streams).toHaveLength(1));
        useBrainstormStore.getState().selectChat(second);
        finish(0, 'A finished background idea.');
        await running;
        expect(useBrainstormStore.getState().selectedChat?.id).toBe(second.id);
        expect((await db.aiChats.get(first.id))?.messages.at(-1)?.content).toBe('A finished background idea.');
        expect((await db.aiChats.get(second.id))?.messages).toEqual([]);
        expect(useBrainstormTaskStore.getState().tasks[first.id].status).toBe('completed');
    });

    test('isolates cancellation between simultaneous chats and blocks duplicate tasks', async () => {
        const a = startBrainstormGeneration(request());
        await vi.waitFor(() => expect(streams).toHaveLength(1));
        await startBrainstormGeneration(request());
        expect(streams).toHaveLength(1);
        const b = startBrainstormGeneration(request(second.id));
        await vi.waitFor(() => expect(streams).toHaveLength(2));
        streams[0].controller.enqueue(encode('First partial.'));
        await vi.waitFor(() => expect(useBrainstormTaskStore.getState().tasks[first.id].messages.at(-1)?.content).toBe('First partial.'));
        useBrainstormTaskStore.getState().stop(first.id);
        expect(streams[0].signal?.aborted).toBe(true);
        expect(streams[1].signal?.aborted).toBe(false);
        finish(1, 'Second complete.');
        await Promise.all([a, b]);
        expect(useBrainstormTaskStore.getState().tasks[first.id].status).toBe('stopped');
        expect(useBrainstormTaskStore.getState().tasks[second.id].status).toBe('completed');
        expect((await db.aiChats.get(first.id))?.messages.at(-1)?.content).toBe('First partial.');
        expect((await db.aiChats.get(second.id))?.messages.at(-1)?.content).toBe('Second complete.');
    });

    test('deleting a running chat cancels it without recreating it', async () => {
        const running = startBrainstormGeneration(request());
        await vi.waitFor(() => expect(streams).toHaveLength(1));
        streams[0].controller.enqueue(encode('Discard this.'));
        await vi.waitFor(() => expect(useBrainstormTaskStore.getState().tasks[first.id].messages.at(-1)?.content).toBe('Discard this.'));
        await useBrainstormStore.getState().deleteChat(first.id);
        await running;
        expect(streams[0].signal?.aborted).toBe(true);
        expect(await db.aiChats.get(first.id)).toBeUndefined();
        expect(useBrainstormTaskStore.getState().tasks[first.id]).toBeUndefined();
        expect(useBrainstormStore.getState().chats.map(chat => chat.id)).toEqual([second.id]);
    });

    test('keeps partial text and records an error when a background stream fails', async () => {
        const running = startBrainstormGeneration(request());
        await vi.waitFor(() => expect(streams).toHaveLength(1));
        streams[0].controller.enqueue(encode('Recovered partial.'));
        await vi.waitFor(() => expect(useBrainstormTaskStore.getState().tasks[first.id].messages.at(-1)?.content).toBe('Recovered partial.'));
        useBrainstormStore.getState().selectChat(second);
        streams[0].controller.error(new Error('Disconnected'));
        await running;
        expect(useBrainstormTaskStore.getState().tasks[first.id]).toMatchObject({ status: 'failed', error: 'Disconnected Partial response has been kept.' });
        expect((await db.aiChats.get(first.id))?.messages.at(-1)?.content).toBe('Recovered partial.');
        expect(useBrainstormStore.getState().selectedChat?.id).toBe(second.id);
    });

    test('restores failed input to its own draft without overwriting another chat draft', async () => {
        const running = startBrainstormGeneration(request());
        await vi.waitFor(() => expect(streams).toHaveLength(1));
        useBrainstormStore.getState().selectChat(second);
        useBrainstormStore.getState().setDraftMessage('Second chat draft.');
        streams[0].controller.error(new Error('No response'));
        await running;
        expect(useBrainstormStore.getState().draftMessage).toBe('Second chat draft.');
        useBrainstormStore.getState().selectChat(first);
        expect(useBrainstormStore.getState().draftMessage).toBe('Write an idea.');
    });

    test('does not add a completed chat to the list for a different story', async () => {
        const running = startBrainstormGeneration(request());
        await vi.waitFor(() => expect(streams).toHaveLength(1));
        await useBrainstormStore.getState().fetchChats('another-story');
        finish(0, 'Saved to the original story.');
        await running;
        expect(useBrainstormStore.getState().chats).toEqual([]);
        expect(useBrainstormStore.getState().selectedChat).toBeNull();
        expect((await db.aiChats.get(first.id))?.messages.at(-1)?.content).toBe('Saved to the original story.');
    });

    test('runs an isolated pipeline and retains its progress and result after switching chats', async () => {
        await db.agentPresets.put({ id: 'task-agent', createdAt: new Date(), name: 'Task writer', role: 'prose_writer', systemPrompt: 'Write an idea.', model, temperature: 0.7, maxTokens: 400 });
        await db.pipelinePresets.put({ id: 'task-pipeline', createdAt: new Date(), name: 'Task pipeline', steps: [{ agentPresetId: 'task-agent', order: 0, streamOutput: true }] });
        const running = startBrainstormGeneration({ ...request(), mode: 'pipeline', pipeline: { id: 'task-pipeline', input: { scenebeat: 'Write an idea.' } } });
        await vi.waitFor(() => expect(streams).toHaveLength(1));
        useBrainstormStore.getState().selectChat(second);
        finish(0, 'A pipeline idea.');
        await running;
        expect(useBrainstormTaskStore.getState().tasks[first.id]).toMatchObject({ status: 'completed', currentStep: 0, currentAgentName: 'Task writer', stepResults: [{ output: 'A pipeline idea.' }] });
        expect((await db.aiChats.get(first.id))?.messages.at(-1)?.content).toBe('A pipeline idea.');
        expect(useBrainstormStore.getState().selectedChat?.id).toBe(second.id);
    });
});
