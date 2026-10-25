import { beforeEach, describe, expect, test } from 'vitest';
import { useBrainstormStore } from '@/features/brainstorm/stores/useBrainstormStore';
import { db } from '@/services/database';
import { resetTestDb } from './testDb';

describe('Brainstorm universal system prompt selection', () => {
    beforeEach(async () => {
        await resetTestDb();
        useBrainstormStore.setState({ chats: [], selectedChat: null, pinnedSession: null, pinnedChapterId: null });
    });

    test('persists a selection with a chat and keeps new chats at None', async () => {
        const store = useBrainstormStore.getState();
        const chatId = await store.addChat('story-1', 'First chat', [], 'universal-1');
        expect((await db.aiChats.get(chatId))?.universalSystemPromptId).toBe('universal-1');
        expect(useBrainstormStore.getState().selectedChat?.universalSystemPromptId).toBe('universal-1');

        const otherId = await store.createNewChat('story-1');
        expect((await db.aiChats.get(otherId))?.universalSystemPromptId).toBeUndefined();
        expect(useBrainstormStore.getState().selectedChat?.universalSystemPromptId).toBeUndefined();

        await store.fetchChats('story-1');
        store.selectChat(useBrainstormStore.getState().chats.find(chat => chat.id === chatId)!);
        expect(useBrainstormStore.getState().selectedChat?.universalSystemPromptId).toBe('universal-1');
        await store.updateChat(chatId, { universalSystemPromptId: undefined });
        expect((await db.aiChats.get(chatId))?.universalSystemPromptId).toBeUndefined();
        expect(useBrainstormStore.getState().selectedChat?.universalSystemPromptId).toBeUndefined();
    });
});
