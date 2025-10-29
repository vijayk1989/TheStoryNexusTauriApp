import { create } from 'zustand';
import { db } from '@/services/database';
import type { ChapterOutline, ChapterNotes } from '@/types/story';

interface ChapterMetadataState {
    summariesSoFar: string;

    // Summary operations
    updateChapterSummary: (id: string, summary: string) => Promise<void>;
    updateChapterSummaryOptimistic: (id: string, summary: string) => Promise<void>;
    getPreviousChapterSummaries: (storyId: string, currentOrder: number) => Promise<string>;
    getChapterSummaries: (storyId: string, currentOrder: number, includeLatest?: boolean) => Promise<string>;
    getAllChapterSummaries: (storyId: string) => Promise<string>;
    getChapterSummary: (id: string) => Promise<string>;

    // Outline operations
    updateChapterOutline: (id: string, outline: ChapterOutline) => Promise<void>;
    getChapterOutline: (id: string | undefined) => Promise<ChapterOutline | null>;

    // Notes operations
    updateChapterNotes: (id: string, notes: ChapterNotes) => Promise<void>;
    getChapterNotes: (id: string) => Promise<ChapterNotes | null>;
}

export const useChapterMetadataStore = create<ChapterMetadataState>((set) => ({
    summariesSoFar: '',

    updateChapterSummary: async (id: string, summary: string) => {
        try {
            await db.chapters.update(id, { summary });
        } catch (error) {
            console.error('Failed to update chapter summary:', error);
            throw error;
        }
    },

    updateChapterSummaryOptimistic: async (id: string, summary: string) => {
        try {
            await db.chapters.update(id, { summary });
        } catch (error) {
            console.error('Failed to update summary:', error);
            throw error;
        }
    },

    getPreviousChapterSummaries: async (storyId: string, currentOrder: number) => {
        try {
            const previousChapters = await db.chapters
                .where('storyId')
                .equals(storyId)
                .filter(chapter => chapter.order <= currentOrder)
                .sortBy('order');

            const summaries = previousChapters
                .map(chapter => chapter.summary?.trim() || '')
                .filter(Boolean)
                .join(' ');

            set({ summariesSoFar: summaries });
            return summaries;
        } catch (error) {
            console.error('Error getting previous chapter summaries:', error);
            return '';
        }
    },

    getChapterSummaries: async (storyId: string, currentOrder: number, includeLatest: boolean = false) => {
        try {
            const chapters = await db.chapters
                .where('storyId')
                .equals(storyId)
                .filter(chapter => includeLatest
                    ? true
                    : chapter.order < currentOrder)
                .sortBy('order');

            const summaries = chapters
                .map(chapter => {
                    const summary = chapter.summary?.trim();
                    return summary
                        ? `Chapter ${chapter.order} - ${chapter.title}: ${summary}`
                        : '';
                })
                .filter(Boolean)
                .join(', ');

            return summaries;
        } catch (error) {
            console.error('Error getting chapter summaries:', error);
            return '';
        }
    },

    getChapterSummary: async (id: string) => {
        try {
            const chapter = await db.chapters.get(id);
            if (!chapter || !chapter.summary) {
                return '';
            }
            return `Chapter ${chapter.order} - ${chapter.title}:\n${chapter.summary.trim()}`;
        } catch (error) {
            console.error('Error getting chapter summary:', error);
            return '';
        }
    },

    getAllChapterSummaries: async (storyId: string) => {
        try {
            const chapters = await db.chapters
                .where('storyId')
                .equals(storyId)
                .sortBy('order');

            const summaries = chapters
                .map(chapter => {
                    const summary = chapter.summary?.trim();
                    return summary
                        ? `Chapter ${chapter.order} - ${chapter.title}:\n${summary}`
                        : '';
                })
                .filter(Boolean)
                .join('\n\n');

            return summaries;
        } catch (error) {
            console.error('Error getting all chapter summaries:', error);
            return '';
        }
    },

    updateChapterOutline: async (id: string, outline: ChapterOutline) => {
        try {
            await db.chapters.update(id, { outline });
        } catch (error) {
            console.error('Failed to update chapter outline:', error);
            throw error;
        }
    },

    getChapterOutline: async (id: string | undefined) => {
        if (!id) return null;

        try {
            const chapter = await db.chapters.get(id);
            return chapter?.outline || null;
        } catch (error) {
            console.error('Error getting chapter outline:', error);
            return null;
        }
    },

    updateChapterNotes: async (id: string, notes: ChapterNotes) => {
        try {
            await db.chapters.update(id, { notes });
        } catch (error) {
            console.error('Failed to update chapter notes:', error);
            throw error;
        }
    },

    getChapterNotes: async (id: string) => {
        try {
            const chapter = await db.chapters.get(id);
            return chapter?.notes || null;
        } catch (error) {
            console.error('Error getting chapter notes:', error);
            return null;
        }
    }
}));
