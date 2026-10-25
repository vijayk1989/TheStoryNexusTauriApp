import { beforeEach, describe, expect, test } from 'vitest';
import { createPromptParser } from '@/features/prompts/services/promptParser';
import { usePromptStore } from '@/features/prompts/store/promptStore';
import { db } from '@/services/database';
import type { Prompt, PromptMessage } from '@/types/story';
import { resetTestDb } from './testDb';

const originalMessages: PromptMessage[] = [
    { role: 'system', content: 'Original system instructions.' },
    { role: 'user', content: 'Write {{scenebeat}}' },
    { role: 'assistant', content: 'Example response.' },
    { role: 'system', content: 'Keep these later instructions.' },
];

function universalPrompt(overrides: Partial<Prompt> = {}): Prompt {
    return {
        id: 'universal-prompt', name: 'Universal instructions', createdAt: new Date(),
        promptType: 'universal_system', allowedModels: [],
        messages: [{ role: 'system', content: 'Universal: {{scenebeat}}' }],
        ...overrides,
    };
}

describe('universal system prompts', () => {
    beforeEach(async () => {
        await resetTestDb();
        usePromptStore.setState({ prompts: [], error: null, isLoading: false });
        await db.prompts.put({
            id: 'task-prompt', name: 'Task', createdAt: new Date(), promptType: 'scene_beat',
            messages: originalMessages, allowedModels: [], temperature: 0.4, maxTokens: 512,
        });
        await db.prompts.put(universalPrompt());
    });

    const parse = (universalSystemPromptId?: string) => createPromptParser().parse({
        promptId: 'task-prompt', storyId: 'story-1', scenebeat: 'the harbor scene', universalSystemPromptId,
    });

    test('None preserves existing messages and resolves their variables', async () => {
        expect(await parse()).toEqual({ messages: [
            originalMessages[0], { role: 'user', content: 'Write the harbor scene' },
            ...originalMessages.slice(2),
        ] });
    });

    test('replaces only the first system message, resolves variables, and leaves saved prompts intact', async () => {
        const result = await parse('universal-prompt');
        expect(result.error).toBeUndefined();
        expect(result.messages).toEqual([
            { role: 'system', content: 'Universal: the harbor scene' },
            { role: 'user', content: 'Write the harbor scene' },
            ...originalMessages.slice(2),
        ]);
        expect(await db.prompts.get('task-prompt')).toMatchObject({
            messages: originalMessages, temperature: 0.4, maxTokens: 512,
        });
        expect((await db.prompts.get('universal-prompt'))?.messages[0].content).toBe('Universal: {{scenebeat}}');
        expect((await parse()).messages[0]).toEqual(originalMessages[0]);
    });

    test('inserts a system message at the start when the task has none', async () => {
        await db.prompts.update('task-prompt', { messages: originalMessages.slice(1, 3) });
        expect((await parse('universal-prompt')).messages).toEqual([
            { role: 'system', content: 'Universal: the harbor scene' },
            { role: 'user', content: 'Write the harbor scene' },
            originalMessages[2],
        ]);
    });

    test('reports a missing selection instead of silently sending the original prompt', async () => {
        const result = await parse('deleted-prompt');
        expect(result.messages).toEqual([]);
        expect(result.error).toContain('no longer exists');
    });

    test('rejects a regular prompt selected as a universal system prompt', async () => {
        expect((await parse('task-prompt')).error).toContain('exactly one non-empty system message');
    });

    test.each<PromptMessage[][]>([
        [[]],
        [[{ role: 'user', content: 'Wrong role' }]],
        [[{ role: 'assistant', content: 'Wrong role' }]],
        [[{ role: 'system', content: '   ' }]],
        [[{ role: 'system', content: 'One' }, { role: 'system', content: 'Two' }]],
        [[{ role: 'system', content: 'One' }, { role: 'user', content: 'Two' }]],
    ])('rejects invalid universal messages on create, update, import, and parsing: %j', async (messages) => {
        const invalid = universalPrompt({ id: 'invalid', name: 'Invalid', messages });
        await expect(usePromptStore.getState().createPrompt(invalid)).rejects.toThrow('Invalid prompt');
        await expect(usePromptStore.getState().updatePrompt('universal-prompt', { messages })).rejects.toThrow('Invalid prompt');
        await usePromptStore.getState().importPrompts(JSON.stringify({ type: 'prompts', prompts: [invalid] }));
        expect(await db.prompts.where('name').equals('Invalid').count()).toBe(0);
        // Simulate legacy or externally corrupted data bypassing the store.
        await db.prompts.put(invalid);
        expect((await parse('invalid')).error).toContain('exactly one non-empty system message');
    });

    test('validates type-only updates against the existing messages', async () => {
        await expect(usePromptStore.getState().updatePrompt('task-prompt', {
            promptType: 'universal_system',
        })).rejects.toThrow('Invalid prompt');
        expect((await db.prompts.get('task-prompt'))?.promptType).toBe('scene_beat');
    });

    test('creates, edits, clones, and imports universal prompts without an associated model', async () => {
        await usePromptStore.getState().createPrompt(universalPrompt({ name: 'New universal' }));
        const created = await db.prompts.where('name').equals('New universal').first();
        expect(created).toMatchObject({ promptType: 'universal_system', allowedModels: [] });
        await usePromptStore.getState().updatePrompt(created!.id, {
            messages: [{ role: 'system', content: 'Updated instructions' }],
        });
        await usePromptStore.getState().clonePrompt(created!.id);
        const cloned = await db.prompts.where('name').equals('New universal (Copy)').first();
        expect(cloned).toMatchObject({
            promptType: 'universal_system', isSystem: false, allowedModels: [],
            messages: [{ role: 'system', content: 'Updated instructions' }],
        });
        await usePromptStore.getState().importPrompts(JSON.stringify({ type: 'prompts', prompts: [cloned] }));
        const imported = await db.prompts.where('name').equals('New universal (Copy) (Imported)').first();
        expect(imported?.id).not.toBe(cloned?.id);
        expect(imported?.messages).toEqual(cloned?.messages);
        expect(imported?.promptType).toBe('universal_system');
    });
});
