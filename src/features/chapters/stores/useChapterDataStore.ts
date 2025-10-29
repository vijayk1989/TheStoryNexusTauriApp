import { create } from 'zustand';
import { db } from '@/services/database';
import type { Chapter } from '@/types/story';

interface ChapterDataState {
    chapters: Chapter[];
    currentChapter: Chapter | null;
    loading: boolean;
    error: string | null;
    lastEditedChapterIds: Record<string, string>;

    // Data CRUD operations
    fetchChapters: (storyId: string) => Promise<void>;
    getChapter: (id: string) => Promise<void>;
    createChapter: (chapterData: Omit<Chapter, 'id' | 'createdAt' | 'wordCount'>) => Promise<string>;
    updateChapter: (id: string, chapterData: Partial<Chapter>) => Promise<void>;
    deleteChapter: (id: string) => Promise<void>;
    setCurrentChapter: (chapter: Chapter | null) => void;
    updateChapterOrders: (updates: Array<{ id: string, order: number }>) => Promise<void>;
    clearError: () => void;

    // Last edited tracking
    setLastEditedChapterId: (storyId: string, chapterId: string) => void;
    getLastEditedChapterId: (storyId: string) => string | null;
    getPreviousChapter: (chapterId: string) => Promise<Chapter | null>;
}

export const useChapterDataStore = create<ChapterDataState>((set, get) => ({
    chapters: [],
    currentChapter: null,
    loading: false,
    error: null,
    lastEditedChapterIds: JSON.parse(localStorage.getItem('lastEditedChapterIds') || '{}'),

    fetchChapters: async (storyId: string) => {
        set({ loading: true, error: null });
        try {
            const chapters = await db.chapters
                .where('storyId')
                .equals(storyId)
                .sortBy('order');
            set({ chapters, loading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to fetch chapters',
                loading: false
            });
        }
    },

    getChapter: async (id: string) => {
        set({ loading: true, error: null });
        try {
            const chapter = await db.chapters.get(id);
            if (!chapter) {
                throw new Error('Chapter not found');
            }
            set({ currentChapter: chapter, loading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to fetch chapter',
                loading: false
            });
        }
    },

    createChapter: async (chapterData) => {
        set({ loading: true, error: null });
        try {
            const storyChapters = await db.chapters
                .where('storyId')
                .equals(chapterData.storyId)
                .toArray();

            const nextOrder = storyChapters.length === 0
                ? 1
                : Math.max(...storyChapters.map(chapter => chapter.order)) + 1;

            const chapterId = crypto.randomUUID();

            await db.chapters.add({
                ...chapterData,
                id: chapterId,
                order: nextOrder,
                createdAt: new Date(),
                wordCount: chapterData.content.split(/\s+/).length
            });

            const newChapter = await db.chapters.get(chapterId);
            if (!newChapter) throw new Error('Failed to create chapter');

            set(state => ({
                chapters: [...state.chapters, newChapter].sort((a, b) => a.order - b.order),
                currentChapter: newChapter,
                loading: false
            }));

            return chapterId;
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to create chapter',
                loading: false
            });
            throw error;
        }
    },

    updateChapter: async (id: string, chapterData: Partial<Chapter>) => {
        set({ loading: true, error: null });
        try {
            if (chapterData.content) {
                chapterData.wordCount = chapterData.content.split(/\s+/).length;
                const chapter = await db.chapters.get(id);
                if (chapter) {
                    const { lastEditedChapterIds } = get();
                    const newLastEdited = {
                        ...lastEditedChapterIds,
                        [chapter.storyId]: id
                    };
                    set({ lastEditedChapterIds: newLastEdited });
                    localStorage.setItem('lastEditedChapterIds', JSON.stringify(newLastEdited));
                }
            }

            await db.chapters.update(id, chapterData);
            const updatedChapter = await db.chapters.get(id);
            if (!updatedChapter) throw new Error('Chapter not found after update');

            set(state => ({
                chapters: state.chapters.map(chapter =>
                    chapter.id === id ? updatedChapter : chapter
                ),
                currentChapter: state.currentChapter?.id === id ? updatedChapter : state.currentChapter,
                loading: false
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to update chapter',
                loading: false
            });
        }
    },

    deleteChapter: async (id: string) => {
        set({ loading: true, error: null });
        try {
            await db.chapters.delete(id);
            set(state => ({
                chapters: state.chapters.filter(chapter => chapter.id !== id),
                currentChapter: state.currentChapter?.id === id ? null : state.currentChapter,
                loading: false
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to delete chapter',
                loading: false
            });
        }
    },

    setCurrentChapter: (chapter: Chapter | null) => {
        set({ currentChapter: chapter });
    },

    updateChapterOrders: async (updates: Array<{ id: string, order: number }>) => {
        set({ loading: true, error: null });
        try {
            await db.transaction('rw', db.chapters, async () => {
                for (const update of updates) {
                    await db.chapters.update(update.id, { order: update.order });
                }
            });

            const { chapters } = get();
            const updatedChapters = chapters.map(chapter => {
                const update = updates.find(u => u.id === chapter.id);
                return update ? { ...chapter, order: update.order } : chapter;
            }).sort((a, b) => a.order - b.order);

            set({ chapters: updatedChapters, loading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to update chapter orders',
                loading: false
            });
        }
    },

    clearError: () => set({ error: null }),

    setLastEditedChapterId: (storyId: string, chapterId: string) => {
        const { lastEditedChapterIds } = get();
        const newLastEdited = {
            ...lastEditedChapterIds,
            [storyId]: chapterId
        };
        set({ lastEditedChapterIds: newLastEdited });
        localStorage.setItem('lastEditedChapterIds', JSON.stringify(newLastEdited));
    },

    getLastEditedChapterId: (storyId: string) => {
        const { lastEditedChapterIds } = get();
        return lastEditedChapterIds[storyId] || null;
    },

    getPreviousChapter: async (chapterId: string) => {
        try {
            const currentChapter = await db.chapters.get(chapterId);
            if (!currentChapter) return null;

            const previousChapter = await db.chapters
                .where('storyId')
                .equals(currentChapter.storyId)
                .and(chapter => chapter.order === currentChapter.order - 1)
                .first();

            return previousChapter || null;
        } catch (error) {
            console.error('Error getting previous chapter:', error);
            return null;
        }
    }
}));
