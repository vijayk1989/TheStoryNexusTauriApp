import { create } from 'zustand';
import { db } from '@/services/database';
import type { LorebookEntry } from '@/types/story';

interface LorebookDataState {
    entries: LorebookEntry[];
    isLoading: boolean;
    error: string | null;
    editorContent: string;
    matchedEntries: Map<string, LorebookEntry>;
    chapterMatchedEntries: Map<string, LorebookEntry>;

    // Actions
    loadEntries: (storyId: string) => Promise<void>;
    createEntry: (entry: Omit<LorebookEntry, 'id' | 'createdAt'>) => Promise<void>;
    updateEntry: (id: string, data: Partial<LorebookEntry>) => Promise<void>;
    deleteEntry: (id: string) => Promise<void>;
    setEditorContent: (content: string) => void;
    setMatchedEntries: (entries: Map<string, LorebookEntry>) => void;
    setChapterMatchedEntries: (entries: Map<string, LorebookEntry>) => void;
}

export const useLorebookDataStore = create<LorebookDataState>((set) => ({
    entries: [],
    isLoading: false,
    error: null,
    editorContent: '',
    matchedEntries: new Map(),
    chapterMatchedEntries: new Map(),

    loadEntries: async (storyId: string) => {
        set({ isLoading: true, error: null });
        try {
            const entries = await db.getLorebookEntriesByStory(storyId);
            set({ entries, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    createEntry: async (entryData) => {
        try {
            const id = crypto.randomUUID();
            const newEntry: LorebookEntry = {
                ...entryData,
                id,
                createdAt: new Date(),
                isDisabled: false,
            };

            await db.lorebookEntries.add(newEntry);
            set(state => ({ entries: [...state.entries, newEntry] }));
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    updateEntry: async (id, data) => {
        try {
            await db.lorebookEntries.update(id, data);
            set(state => ({
                entries: state.entries.map(entry =>
                    entry.id === id ? { ...entry, ...data } : entry
                ),
            }));
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    deleteEntry: async (id) => {
        try {
            await db.lorebookEntries.delete(id);
            set(state => ({
                entries: state.entries.filter(entry => entry.id !== id),
            }));
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    setEditorContent: (content: string) => set({ editorContent: content }),
    setMatchedEntries: (entries: Map<string, LorebookEntry>) => set({ matchedEntries: entries }),
    setChapterMatchedEntries: (entries: Map<string, LorebookEntry>) => set({ chapterMatchedEntries: entries }),
}));
