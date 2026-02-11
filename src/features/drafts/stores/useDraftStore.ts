import { create } from 'zustand';
import { db } from '@/services/database';
import type { Draft } from '@/types/story';

interface DraftStore {
    drafts: Draft[];
    isLoading: boolean;
    error: string | null;

    fetchDrafts: (chapterId: string) => Promise<void>;
    saveDraft: (data: Omit<Draft, 'id' | 'createdAt'>) => Promise<string>;
    deleteDraft: (id: string) => Promise<void>;
    clearDrafts: () => void;
}

export const useDraftStore = create<DraftStore>((set, get) => ({
    drafts: [],
    isLoading: false,
    error: null,

    fetchDrafts: async (chapterId: string) => {
        set({ isLoading: true, error: null });
        try {
            const drafts = await db.getDraftsByChapter(chapterId);
            set({ drafts, isLoading: false });
        } catch (error) {
            console.error('Error fetching drafts:', error);
            set({ error: 'Failed to load drafts', isLoading: false });
        }
    },

    saveDraft: async (data) => {
        try {
            const id = await db.createDraft(data);
            // Re-fetch to keep list in sync
            const drafts = await db.getDraftsByChapter(data.chapterId);
            set({ drafts });
            return id;
        } catch (error) {
            console.error('Error saving draft:', error);
            throw error;
        }
    },

    deleteDraft: async (id: string) => {
        try {
            const currentDrafts = get().drafts;
            // Optimistic removal
            set({ drafts: currentDrafts.filter((d) => d.id !== id) });
            await db.deleteDraft(id);
        } catch (error) {
            console.error('Error deleting draft:', error);
            // Re-fetch on failure
            const first = get().drafts[0];
            if (first) {
                const drafts = await db.getDraftsByChapter(first.chapterId);
                set({ drafts });
            }
        }
    },

    clearDrafts: () => set({ drafts: [], error: null }),
}));
