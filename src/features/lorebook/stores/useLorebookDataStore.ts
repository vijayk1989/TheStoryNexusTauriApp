import { create } from 'zustand';
import { attemptPromise } from '@jfdi/attempt';
import { db } from '@/services/database';
import { formatError } from '@/utils/errorUtils';
import { ERROR_MESSAGES } from '@/constants/errorMessages';
import { generateLorebookEntryId } from '@/utils/idGenerator';
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

        const [error, entries] = await attemptPromise(() => db.getLorebookEntriesByStory(storyId));

        if (error) {
            set({
                error: formatError(error, ERROR_MESSAGES.FETCH_FAILED('lorebook entries')),
                isLoading: false
            });
            return;
        }

        set({ entries, isLoading: false });
    },

    createEntry: async (entryData) => {
        const newEntry: LorebookEntry = {
            ...entryData,
            id: generateLorebookEntryId(),
            createdAt: new Date(),
            isDisabled: false,
        };

        const [error] = await attemptPromise(() => db.lorebookEntries.add(newEntry));

        if (error) {
            const message = formatError(error, ERROR_MESSAGES.CREATE_FAILED('lorebook entry'));
            set({ error: message });
            throw error;
        }

        set(state => ({ entries: [...state.entries, newEntry] }));
    },

    updateEntry: async (id, data) => {
        const [error] = await attemptPromise(() => db.lorebookEntries.update(id, data));

        if (error) {
            const message = formatError(error, ERROR_MESSAGES.UPDATE_FAILED('lorebook entry'));
            set({ error: message });
            throw error;
        }

        set(state => ({
            entries: state.entries.map(entry =>
                entry.id === id ? { ...entry, ...data } : entry
            ),
        }));
    },

    deleteEntry: async (id) => {
        const [error] = await attemptPromise(() => db.lorebookEntries.delete(id));

        if (error) {
            const message = formatError(error, ERROR_MESSAGES.DELETE_FAILED('lorebook entry'));
            set({ error: message });
            throw error;
        }

        set(state => ({
            entries: state.entries.filter(entry => entry.id !== id),
        }));
    },

    setEditorContent: (content: string) => set({ editorContent: content }),
    setMatchedEntries: (entries: Map<string, LorebookEntry>) => set({ matchedEntries: entries }),
    setChapterMatchedEntries: (entries: Map<string, LorebookEntry>) => set({ chapterMatchedEntries: entries }),
}));
