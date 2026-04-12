import { create } from 'zustand';
import { db } from '@/services/database';
import { LoreBook } from '@/types/story';

interface LoreBooksState {
    loreBooks: LoreBook[];
    allLoreBooks: LoreBook[];
    lorebookEntryCounts: Record<string, number>;
    isLoading: boolean;
    error: string | null;

    /** Load lore books associated with a specific story. */
    loadLoreBooksForStory: (storyId: string) => Promise<void>;
    /** Load all lore books in the database (for the "link existing" picker and the global lorebooks screen). */
    loadAllLoreBooks: () => Promise<void>;
    /** Create a new lore book and return its ID. Does NOT auto-associate with any story. */
    createLoreBook: (name: string, description?: string, isDemo?: boolean) => Promise<string>;
    updateLoreBook: (id: string, data: Partial<Pick<LoreBook, 'name' | 'description'>>) => Promise<void>;
    /**
     * Delete a lore book.
     * Throws if the book is still referenced by other stories (callers must confirm first).
     * @param lorebookId The lore book to delete
     * @param storyId    The story context (omit when deleting from the global lorebooks screen)
     */
    deleteLoreBook: (lorebookId: string, storyId?: string) => Promise<void>;
    /** Add a lore book to a story's lorebookIds list. */
    associateLoreBook: (storyId: string, lorebookId: string) => Promise<void>;
    /** Remove a lore book from a story's lorebookIds list. Does NOT delete the book. */
    dissociateLoreBook: (storyId: string, lorebookId: string) => Promise<void>;
    clearError: () => void;
}

export const useLoreBooksStore = create<LoreBooksState>((set, get) => ({
    loreBooks: [],
    allLoreBooks: [],
    lorebookEntryCounts: {},
    isLoading: false,
    error: null,

    loadLoreBooksForStory: async (storyId) => {
        set({ isLoading: true, error: null });
        try {
            const books = await db.getLoreBooksByStory(storyId);
            set({ loreBooks: books, isLoading: false });
        } catch (e) {
            set({ error: String(e), isLoading: false });
        }
    },

    loadAllLoreBooks: async () => {
        try {
            const books = await db.loreBooks.orderBy('name').toArray();
            const allEntries = await db.lorebookEntries.toArray();
            const counts: Record<string, number> = {};
            for (const entry of allEntries) {
                counts[entry.lorebookId] = (counts[entry.lorebookId] ?? 0) + 1;
            }
            set({ allLoreBooks: books, lorebookEntryCounts: counts });
        } catch (e) {
            set({ error: String(e) });
        }
    },

    createLoreBook: async (name, description, isDemo) => {
        const id = crypto.randomUUID();
        await db.createLoreBook({ id, name, description, isDemo });
        set(state => ({ loreBooks: [...state.loreBooks, { id, name, description, isDemo, createdAt: new Date() }] }));
        return id;
    },

    updateLoreBook: async (id, data) => {
        await db.loreBooks.update(id, data);
        set(state => ({
            loreBooks: state.loreBooks.map(b => b.id === id ? { ...b, ...data } : b),
            allLoreBooks: state.allLoreBooks.map(b => b.id === id ? { ...b, ...data } : b),
        }));
    },

    deleteLoreBook: async (lorebookId, storyId?) => {
        const refs = await db.getLoreBookReferences(lorebookId);
        const otherRefs = storyId ? refs.filter(s => s.id !== storyId) : refs;
        if (otherRefs.length > 0) {
            throw new Error(
                `This lore book is linked to ${otherRefs.length} other ${otherRefs.length === 1 ? 'story' : 'stories'}. Remove those links first.`
            );
        }
        await db.deleteLoreBookWithEntries(lorebookId);
        // Also remove from the referencing story's lorebookIds (when called from story context)
        if (storyId) {
            const story = await db.stories.get(storyId);
            if (story) {
                await db.stories.update(storyId, {
                    lorebookIds: (story.lorebookIds ?? []).filter(id => id !== lorebookId),
                });
            }
        }
        set(state => ({
            loreBooks: state.loreBooks.filter(b => b.id !== lorebookId),
            allLoreBooks: state.allLoreBooks.filter(b => b.id !== lorebookId),
        }));
    },

    associateLoreBook: async (storyId, lorebookId) => {
        const story = await db.stories.get(storyId);
        if (!story) return;
        const existing = story.lorebookIds ?? [];
        if (existing.includes(lorebookId)) return;
        const updated = [...existing, lorebookId];
        await db.stories.update(storyId, { lorebookIds: updated });
        // Add the book to the loaded loreBooks if not already present
        const { loreBooks } = get();
        if (!loreBooks.find(b => b.id === lorebookId)) {
            const book = await db.loreBooks.get(lorebookId);
            if (book) set(state => ({ loreBooks: [...state.loreBooks, book] }));
        }
    },

    dissociateLoreBook: async (storyId, lorebookId) => {
        const story = await db.stories.get(storyId);
        if (!story) return;
        await db.stories.update(storyId, {
            lorebookIds: (story.lorebookIds ?? []).filter(id => id !== lorebookId),
        });
        set(state => ({ loreBooks: state.loreBooks.filter(b => b.id !== lorebookId) }));
    },

    clearError: () => set({ error: null }),
}));
