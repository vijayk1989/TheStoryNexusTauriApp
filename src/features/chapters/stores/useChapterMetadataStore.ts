import { create } from 'zustand';
import { attemptPromise } from '@jfdi/attempt';
import { db } from '@/services/database';
import { formatError } from '@/utils/errorUtils';
import { ERROR_MESSAGES } from '@/constants/errorMessages';
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
        const [error] = await attemptPromise(() => db.chapters.update(id, { summary }));
        if (error) {
            const message = formatError(error, ERROR_MESSAGES.UPDATE_FAILED('chapter summary'));
            console.error(message, error);
            throw error;
        }
    },

    updateChapterSummaryOptimistic: async (id: string, summary: string) => {
        const [error] = await attemptPromise(() => db.chapters.update(id, { summary }));
        if (error) {
            const message = formatError(error, ERROR_MESSAGES.UPDATE_FAILED('summary'));
            console.error(message, error);
            throw error;
        }
    },

    getPreviousChapterSummaries: async (storyId: string, currentOrder: number) => {
        const [error, previousChapters] = await attemptPromise(() =>
            db.chapters
                .where('storyId')
                .equals(storyId)
                .filter(chapter => chapter.order <= currentOrder)
                .sortBy('order')
        );

        if (error) {
            console.error(formatError(error, ERROR_MESSAGES.FETCH_FAILED('previous chapter summaries')), error);
            return '';
        }

        const summaries = previousChapters
            .map(chapter => chapter.summary?.trim() || '')
            .filter(Boolean)
            .join(' ');

        set({ summariesSoFar: summaries });
        return summaries;
    },

    getChapterSummaries: async (storyId: string, currentOrder: number, includeLatest: boolean = false) => {
        const [error, chapters] = await attemptPromise(() =>
            db.chapters
                .where('storyId')
                .equals(storyId)
                .filter(chapter => includeLatest
                    ? true
                    : chapter.order < currentOrder)
                .sortBy('order')
        );

        if (error) {
            console.error(formatError(error, ERROR_MESSAGES.FETCH_FAILED('chapter summaries')), error);
            return '';
        }

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
    },

    getChapterSummary: async (id: string) => {
        const [error, chapter] = await attemptPromise(() => db.chapters.get(id));

        if (error) {
            console.error(formatError(error, ERROR_MESSAGES.FETCH_FAILED('chapter summary')), error);
            return '';
        }

        if (!chapter || !chapter.summary) {
            return '';
        }

        return `Chapter ${chapter.order} - ${chapter.title}:\n${chapter.summary.trim()}`;
    },

    getAllChapterSummaries: async (storyId: string) => {
        const [error, chapters] = await attemptPromise(() =>
            db.chapters
                .where('storyId')
                .equals(storyId)
                .sortBy('order')
        );

        if (error) {
            console.error(formatError(error, ERROR_MESSAGES.FETCH_FAILED('chapter summaries')), error);
            return '';
        }

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
    },

    updateChapterOutline: async (id: string, outline: ChapterOutline) => {
        const [error] = await attemptPromise(() => db.chapters.update(id, { outline }));
        if (error) {
            const message = formatError(error, ERROR_MESSAGES.UPDATE_FAILED('chapter outline'));
            console.error(message, error);
            throw error;
        }
    },

    getChapterOutline: async (id: string | undefined) => {
        if (!id) return null;

        const [error, chapter] = await attemptPromise(() => db.chapters.get(id));

        if (error) {
            console.error(formatError(error, ERROR_MESSAGES.FETCH_FAILED('chapter outline')), error);
            return null;
        }

        return chapter?.outline || null;
    },

    updateChapterNotes: async (id: string, notes: ChapterNotes) => {
        const [error] = await attemptPromise(() => db.chapters.update(id, { notes }));
        if (error) {
            const message = formatError(error, ERROR_MESSAGES.UPDATE_FAILED('chapter notes'));
            console.error(message, error);
            throw error;
        }
    },

    getChapterNotes: async (id: string) => {
        const [error, chapter] = await attemptPromise(() => db.chapters.get(id));

        if (error) {
            console.error(formatError(error, ERROR_MESSAGES.FETCH_FAILED('chapter notes')), error);
            return null;
        }

        return chapter?.notes || null;
    }
}));
