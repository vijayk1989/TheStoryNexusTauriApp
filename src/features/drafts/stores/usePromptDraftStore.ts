import { create } from 'zustand';
import { db } from '@/services/database';
import type { PromptDraft } from '@/types/story';

export type PromptDraftInput = Omit<PromptDraft, 'id' | 'name' | 'createdAt' | 'updatedAt'>;

interface PromptDraftState {
    drafts: PromptDraft[];
    storyId: string | null;
    loading: boolean;
    error: string | null;
    fetchDrafts: (storyId: string) => Promise<void>;
    saveDraft: (input: PromptDraftInput) => Promise<void>;
    renameDraft: (id: string, name: string) => Promise<void>;
    deleteDraft: (id: string) => Promise<void>;
}

export const usePromptDraftStore = create<PromptDraftState>((set, get) => ({
    drafts: [], storyId: null, loading: false, error: null,
    fetchDrafts: async storyId => {
        set({ storyId, loading: true, error: null });
        try {
            const drafts = await db.promptDrafts.where('storyId').equals(storyId).reverse().sortBy('updatedAt');
            if (get().storyId === storyId) set({ drafts, loading: false });
        } catch (error) {
            if (get().storyId === storyId) set({ loading: false, error: error instanceof Error ? error.message : 'Could not load prompt drafts.' });
        }
    },
    saveDraft: async input => {
        if (!input.content.trim()) throw new Error('Write a prompt before saving a draft.');
        if (!await db.stories.get(input.storyId)) throw new Error('The story is no longer available.');
        const now = new Date();
        await db.promptDrafts.add({
            ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now,
            name: input.content.trim().split(/\r?\n/)[0].slice(0, 80),
        });
        await get().fetchDrafts(input.storyId);
    },
    renameDraft: async (id, name) => {
        if (!name.trim()) throw new Error('Enter a draft name.');
        const draft = await db.promptDrafts.get(id);
        if (!draft) throw new Error('Prompt draft no longer exists.');
        await db.promptDrafts.update(id, { name: name.trim(), updatedAt: new Date() });
        await get().fetchDrafts(draft.storyId);
    },
    deleteDraft: async id => {
        const draft = await db.promptDrafts.get(id);
        await db.promptDrafts.delete(id);
        if (draft) await get().fetchDrafts(draft.storyId);
    },
}));
