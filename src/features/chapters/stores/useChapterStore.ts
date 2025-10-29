import { create } from 'zustand';
import { useChapterDataStore } from './useChapterDataStore';
import { useChapterContentStore } from './useChapterContentStore';
import { useChapterMetadataStore } from './useChapterMetadataStore';
import type { Chapter, ChapterOutline, ChapterNotes } from '@/types/story';

interface ChapterState {
    chapters: Chapter[];
    currentChapter: Chapter | null;
    loading: boolean;
    error: string | null;
    summariesSoFar: string;
    lastEditedChapterIds: Record<string, string>;

    // Actions
    fetchChapters: (storyId: string) => Promise<void>;
    getChapter: (id: string) => Promise<void>;
    createChapter: (chapterData: Omit<Chapter, 'id' | 'createdAt' | 'wordCount'>) => Promise<string>;
    updateChapter: (id: string, chapterData: Partial<Chapter>) => Promise<void>;
    deleteChapter: (id: string) => Promise<void>;
    setCurrentChapter: (chapter: Chapter | null) => void;
    getPreviousChapterSummaries: (storyId: string, currentOrder: number) => Promise<string>;
    clearError: () => void;
    updateChapterSummary: (id: string, summary: string) => Promise<void>;
    updateChapterSummaryOptimistic: (id: string, summary: string) => Promise<void>;
    getChapterPlainText: (id: string) => Promise<string>;
    getChapterSummaries: (storyId: string, currentOrder: number, includeLatest?: boolean) => Promise<string>;
    getAllChapterSummaries: (storyId: string) => Promise<string>;
    updateChapterOutline: (id: string, outline: ChapterOutline) => Promise<void>;
    getChapterOutline: (id: string | undefined) => Promise<ChapterOutline | null>;
    getChapterSummary: (id: string) => Promise<string>;
    getPreviousChapter: (chapterId: string) => Promise<Chapter | null>;
    getChapterPlainTextByChapterOrder: (chapterOrder: number) => Promise<string>;
    updateChapterNotes: (id: string, notes: ChapterNotes) => Promise<void>;
    getChapterNotes: (id: string) => Promise<ChapterNotes | null>;
    setLastEditedChapterId: (storyId: string, chapterId: string) => void;
    getLastEditedChapterId: (storyId: string) => string | null;
    updateChapterOrders: (updates: Array<{ id: string, order: number }>) => Promise<void>;
    extractPlainTextFromLexicalState: (editorStateJSON: string) => string;
}

/**
 * Unified facade for chapter operations that delegates to specialized stores.
 * Maintains backward compatibility with the original useChapterStore API.
 */
export const useChapterStore = create<ChapterState>((set, get) => {
    // Subscribe to underlying stores to maintain reactivity
    useChapterDataStore.subscribe((state) => {
        set({
            chapters: state.chapters,
            currentChapter: state.currentChapter,
            loading: state.loading,
            error: state.error,
            lastEditedChapterIds: state.lastEditedChapterIds
        });
    });

    useChapterMetadataStore.subscribe((state) => {
        set({ summariesSoFar: state.summariesSoFar });
    });

    return {
    // Initial state from data store
    chapters: useChapterDataStore.getState().chapters,
    currentChapter: useChapterDataStore.getState().currentChapter,
    loading: useChapterDataStore.getState().loading,
    error: useChapterDataStore.getState().error,
    lastEditedChapterIds: useChapterDataStore.getState().lastEditedChapterIds,
    summariesSoFar: useChapterMetadataStore.getState().summariesSoFar,

    // Delegate to data store
    fetchChapters: (storyId) => useChapterDataStore.getState().fetchChapters(storyId),
    getChapter: (id) => useChapterDataStore.getState().getChapter(id),
    createChapter: (chapterData) => useChapterDataStore.getState().createChapter(chapterData),
    updateChapter: (id, chapterData) => useChapterDataStore.getState().updateChapter(id, chapterData),
    deleteChapter: (id) => useChapterDataStore.getState().deleteChapter(id),
    setCurrentChapter: (chapter) => useChapterDataStore.getState().setCurrentChapter(chapter),
    updateChapterOrders: (updates) => useChapterDataStore.getState().updateChapterOrders(updates),
    clearError: () => useChapterDataStore.getState().clearError(),
    setLastEditedChapterId: (storyId, chapterId) => useChapterDataStore.getState().setLastEditedChapterId(storyId, chapterId),
    getLastEditedChapterId: (storyId) => useChapterDataStore.getState().getLastEditedChapterId(storyId),
    getPreviousChapter: (chapterId) => useChapterDataStore.getState().getPreviousChapter(chapterId),

    // Delegate to content store
    getChapterPlainText: (id) => useChapterContentStore.getState().getChapterPlainText(id),
    getChapterPlainTextByChapterOrder: (chapterOrder) => useChapterContentStore.getState().getChapterPlainTextByChapterOrder(chapterOrder),
    extractPlainTextFromLexicalState: (editorStateJSON) => useChapterContentStore.getState().extractPlainTextFromLexicalState(editorStateJSON),

    // Delegate to metadata store
    updateChapterSummary: (id, summary) => useChapterMetadataStore.getState().updateChapterSummary(id, summary),
    updateChapterSummaryOptimistic: (id, summary) => useChapterMetadataStore.getState().updateChapterSummaryOptimistic(id, summary),
    getPreviousChapterSummaries: (storyId, currentOrder) => useChapterMetadataStore.getState().getPreviousChapterSummaries(storyId, currentOrder),
    getChapterSummaries: (storyId, currentOrder, includeLatest) => useChapterMetadataStore.getState().getChapterSummaries(storyId, currentOrder, includeLatest),
    getAllChapterSummaries: (storyId) => useChapterMetadataStore.getState().getAllChapterSummaries(storyId),
    getChapterSummary: (id) => useChapterMetadataStore.getState().getChapterSummary(id),
    updateChapterOutline: (id, outline) => useChapterMetadataStore.getState().updateChapterOutline(id, outline),
    getChapterOutline: (id) => useChapterMetadataStore.getState().getChapterOutline(id),
    updateChapterNotes: (id, notes) => useChapterMetadataStore.getState().updateChapterNotes(id, notes),
    getChapterNotes: (id) => useChapterMetadataStore.getState().getChapterNotes(id),
};
});

// Export individual stores for direct access when needed
export { useChapterDataStore, useChapterContentStore, useChapterMetadataStore };
