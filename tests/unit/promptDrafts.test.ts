import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import Dexie from 'dexie';
import { db } from '@/services/database';
import { usePromptDraftStore } from '@/features/drafts/stores/usePromptDraftStore';
import { useBrainstormStore } from '@/features/brainstorm/stores/useBrainstormStore';
import { flushBrainstormInputs, saveBrainstormInput } from '@/features/brainstorm/services/brainstormInputPersistence';
import { createSiteBackupPayload, siteBackupService } from '@/services/siteBackupService';
import { storyExportService } from '@/services/storyExportService';
import { resetTestDb } from './testDb';

const story = { id: 'draft-story', title: 'Draft story', author: '', language: 'English', createdAt: new Date() };
const chat = { id: 'draft-chat', storyId: story.id, title: 'Draft chat', messages: [], createdAt: new Date() };
const model = { id: 'local/fixture', name: 'Fixture', provider: 'local' as const };

describe('prompt drafts and unfinished inputs', () => {
    beforeEach(async () => {
        await flushBrainstormInputs();
        await resetTestDb();
        await db.stories.put(story);
        await db.aiChats.put(chat);
        usePromptDraftStore.setState({ drafts: [], storyId: null, error: null, loading: false });
        useBrainstormStore.setState({ chats: [chat], selectedChat: chat, draftMessage: '', draftMessages: {}, loadedStoryId: story.id });
    });
    afterEach(async () => { await flushBrainstormInputs(); vi.restoreAllMocks(); });

    test('saves distinct snapshots without changing the input or response drafts', async () => {
        useBrainstormStore.getState().setDraftMessage('An unfinished idea.');
        const input = { storyId: story.id, source: 'brainstorm' as const, content: 'An unfinished idea.\nKeep the second line.', promptId: 'fixture-prompt', model };
        await usePromptDraftStore.getState().saveDraft(input);
        await usePromptDraftStore.getState().saveDraft({ ...input, content: 'Another idea.' });
        const drafts = await db.promptDrafts.toArray();
        expect(drafts).toHaveLength(2);
        expect(drafts.find(draft => draft.name === 'An unfinished idea.')).toMatchObject(input);
        expect(useBrainstormStore.getState().draftMessage).toBe('An unfinished idea.');
        expect(await db.drafts.count()).toBe(0);
        await expect(usePromptDraftStore.getState().saveDraft({ ...input, content: '   ' })).rejects.toThrow('Write a prompt');
    });

    test('renames, isolates by story, and keeps snapshots after their source is deleted', async () => {
        await usePromptDraftStore.getState().saveDraft({ storyId: story.id, source: 'scene_beat', content: 'A SceneBeat idea.' });
        const saved = (await db.promptDrafts.toArray())[0];
        await usePromptDraftStore.getState().renameDraft(saved.id, 'The door scene');
        await db.aiChats.delete(chat.id);
        await usePromptDraftStore.getState().fetchDrafts('different-story');
        expect(usePromptDraftStore.getState().drafts).toEqual([]);
        await usePromptDraftStore.getState().fetchDrafts(story.id);
        expect(usePromptDraftStore.getState().drafts[0].name).toBe('The door scene');
        await usePromptDraftStore.getState().deleteDraft(saved.id);
        expect(await db.promptDrafts.count()).toBe(0);
    });

    test('serializes input saves and restores each chat after in-memory state is cleared', async () => {
        const second = { ...chat, id: 'second-draft-chat' };
        await db.aiChats.put(second);
        useBrainstormStore.getState().setDraftMessage('First');
        useBrainstormStore.getState().setDraftMessage('First complete idea');
        useBrainstormStore.getState().selectChat(second);
        useBrainstormStore.getState().setDraftMessage('Second idea');
        await flushBrainstormInputs();
        useBrainstormStore.setState({ chats: [], selectedChat: null, draftMessage: '', draftMessages: {} });
        await useBrainstormStore.getState().fetchChats(story.id);
        useBrainstormStore.getState().selectChat(useBrainstormStore.getState().chats.find(row => row.id === chat.id)!);
        expect(useBrainstormStore.getState().draftMessage).toBe('First complete idea');
        useBrainstormStore.getState().clearDraftMessage();
        await flushBrainstormInputs();
        expect((await db.aiChats.get(chat.id))?.draftInput).toBe('');
        expect((await db.aiChats.get(second.id))?.draftInput).toBe('Second idea');
        await db.aiChats.delete(second.id);
        await saveBrainstormInput(second.id, 'Late write');
        expect(await db.aiChats.get(second.id)).toBeUndefined();
    });

    test('backs up prompt snapshots and unfinished input and remaps their story, chapter and prompt', async () => {
        await db.chapters.put({ id: 'draft-chapter', storyId: story.id, title: 'Chapter', order: 0, content: '', createdAt: new Date() });
        await db.prompts.put({ id: 'draft-prompt', name: 'Custom draft prompt', promptType: 'brainstorm', createdAt: new Date(), messages: [{ role: 'user', content: '{{user_input}}' }], allowedModels: [model] });
        await usePromptDraftStore.getState().saveDraft({ storyId: story.id, chapterId: 'draft-chapter', source: 'brainstorm', content: 'Portable idea.', promptId: 'draft-prompt', model });
        useBrainstormStore.getState().setDraftMessage('Portable unfinished input.');
        const { backup, summary } = await createSiteBackupPayload();
        expect(summary.promptDrafts).toBe(1);
        expect(backup.data.aiChats[0].draftInput).toBe('Portable unfinished input.');
        await siteBackupService.deleteAllUserContent();
        expect(await db.promptDrafts.count()).toBe(0);
        const result = await siteBackupService.importSiteBackup(JSON.stringify(backup));
        const draft = (await db.promptDrafts.toArray())[0];
        expect(result.promptDrafts).toBe(1);
        expect(draft.storyId).toBe(result.importedStoryIds[0]);
        expect(draft.chapterId).not.toBe('draft-chapter');
        expect(draft.promptId).not.toBe('draft-prompt');
        expect(draft.updatedAt).toBeInstanceOf(Date);
        expect(draft.model).toEqual(model);
        expect((await db.aiChats.toArray())[0].draftInput).toBe('Portable unfinished input.');
        await db.deleteStoryWithRelated(draft.storyId);
        expect(await db.promptDrafts.count()).toBe(0);
    });

    test('includes snapshots and unfinished input in legacy story exports and imports', async () => {
        await usePromptDraftStore.getState().saveDraft({ storyId: story.id, source: 'scene_beat', content: 'A portable SceneBeat idea.' });
        useBrainstormStore.getState().setDraftMessage('Legacy unfinished input.');
        let exported = '';
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
            exported = decodeURIComponent(this.getAttribute('href')!.split(',')[1]);
        });
        await storyExportService.exportStory(story.id);
        const importedId = await storyExportService.importStory(exported);
        expect((await db.promptDrafts.where('storyId').equals(importedId).first())?.content).toBe('A portable SceneBeat idea.');
        expect((await db.aiChats.where('storyId').equals(importedId).first())?.draftInput).toBe('Legacy unfinished input.');
    });

    test('upgrades the existing database without losing stories or chats', async () => {
        const legacySchema = Object.fromEntries(db.tables.filter(table => table.name !== 'promptDrafts').map(table => [
            table.name, [table.schema.primKey.src, ...table.schema.indexes.map(index => index.src)].join(', '),
        ]));
        await db.delete();
        const legacy = new Dexie('StoryDatabase');
        legacy.version(19).stores(legacySchema);
        await legacy.open();
        await legacy.table('stories').put(story);
        await legacy.table('aiChats').put(chat);
        legacy.close();
        await db.open();
        expect((await db.stories.get(story.id))?.title).toBe(story.title);
        expect((await db.aiChats.get(chat.id))?.title).toBe(chat.title);
        await usePromptDraftStore.getState().saveDraft({ storyId: story.id, source: 'brainstorm', content: 'After upgrade.' });
        expect(await db.promptDrafts.count()).toBe(1);
    });
});
