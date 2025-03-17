import { create } from 'zustand';
import { db } from '../../../services/database';
import type { Chapter, ChapterOutline } from '../../../types/story';

interface ChapterState {
    chapters: Chapter[];
    currentChapter: Chapter | null;
    loading: boolean;
    error: string | null;
    summariesSoFar: string;

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
    getChapterOutline: (id: string) => Promise<ChapterOutline | null>;
    getChapterSummary: (id: string) => Promise<string>;
    getPreviousChapter: (chapterId: string) => Promise<Chapter | null>;
    getChapterPlainTextByChapterOrder: (chapterOrder: number) => Promise<string>;
}

export const useChapterStore = create<ChapterState>((set, _get) => ({
    chapters: [],
    currentChapter: null,
    loading: false,
    error: null,
    summariesSoFar: '',

    // Fetch all chapters for a story
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

    // Get a single chapter
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

    // Create a new chapter
    createChapter: async (chapterData) => {
        set({ loading: true, error: null });
        try {
            // Get all chapters for this story and find the highest order
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

    // Update a chapter
    updateChapter: async (id: string, chapterData: Partial<Chapter>) => {
        set({ loading: true, error: null });
        try {
            // If content is being updated, recalculate word count
            if (chapterData.content) {
                chapterData.wordCount = chapterData.content.split(/\s+/).length;
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

    // Delete a chapter
    deleteChapter: async (id: string) => {
        set({ loading: true, error: null });
        try {
            // Use a transaction to ensure all operations complete together
            await db.transaction('rw', [db.chapters], async () => {
                const chapterToDelete = await db.chapters.get(id);
                if (!chapterToDelete) throw new Error('Chapter not found');

                // Delete the chapter
                await db.chapters.delete(id);

                // Update all chapters with higher order in one operation
                await db.chapters
                    .where('storyId')
                    .equals(chapterToDelete.storyId)
                    .filter(chapter => chapter.order > chapterToDelete.order)
                    .modify(chapter => {
                        chapter.order -= 1;
                    });

                // Fetch updated chapters to reflect in state
                const updatedChapters = await db.chapters
                    .where('storyId')
                    .equals(chapterToDelete.storyId)
                    .sortBy('order');

                set(state => ({
                    chapters: updatedChapters,
                    currentChapter: state.currentChapter?.id === id ? null : state.currentChapter,
                    loading: false
                }));
            });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to delete chapter',
                loading: false
            });
        }
    },

    // Set current chapter
    setCurrentChapter: (chapter) => {
        set({ currentChapter: chapter });
    },

    // Get summaries for previous chapters
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

    // Clear error
    clearError: () => {
        set({ error: null });
    },

    // Add new dedicated summary update function
    updateChapterSummary: async (id: string, summary: string) => {
        set({ loading: true, error: null });
        try {
            await db.chapters.update(id, { summary });
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
                error: error instanceof Error ? error.message : 'Failed to update chapter summary',
                loading: false
            });
        }
    },

    // Add a new action that doesn't trigger full chapter list update
    updateChapterSummaryOptimistic: async (id: string, summary: string) => {
        try {
            await db.chapters.update(id, { summary });
            // Optimistic update
            set(state => ({
                chapters: state.chapters.map(chapter =>
                    chapter.id === id
                        ? { ...chapter, summary }
                        : chapter
                )
            }));
        } catch (error) {
            console.error('Failed to update summary:', error);
            throw error;
        }
    },

    // New method to get chapter plain text
    getChapterPlainText: async (id: string) => {
        try {
            console.log('DEBUG: getChapterPlainText called for chapter ID:', id);
            const chapter = await db.chapters.get(id);
            if (!chapter) {
                console.error('getChapterPlainText - Chapter not found:', id);
                return '';
            }

            // Parse the Lexical state
            const editorState = JSON.parse(chapter.content);
            let plainText = '';

            const processNode = (node: any) => {
                if (node.type === 'text') {
                    plainText += node.text;
                } else if (node.children) {
                    node.children.forEach(processNode);
                }
                if (node.type === 'paragraph') {
                    plainText += '\n\n';
                }
            };

            if (editorState.root?.children) {
                editorState.root.children.forEach(processNode);
            }

            const finalText = plainText.trim();

            return finalText;
        } catch (error) {
            console.error('getChapterPlainText - Failed to parse chapter content:', error);
            return '';
        }
    },

    // Enhanced summary gathering function with detailed formatting
    getChapterSummaries: async (storyId: string, currentOrder: number, includeLatest: boolean = false) => {
        try {
            const chapters = await db.chapters
                .where('storyId')
                .equals(storyId)
                .filter(chapter => includeLatest
                    ? true  // Include all chapters
                    : chapter.order < currentOrder) // Only include previous chapters
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

    // Get a specific chapter summary by ID
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

    // Fetch all summaries for a story
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

    // Update chapter outline
    updateChapterOutline: async (id: string, outline: ChapterOutline) => {
        set({ loading: true, error: null });
        try {
            await db.chapters.update(id, { outline });
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
                error: error instanceof Error ? error.message : 'Failed to update chapter outline',
                loading: false
            });
            throw error;
        }
    },

    // Get chapter outline
    getChapterOutline: async (id: string) => {
        try {
            const chapter = await db.chapters.get(id);
            return chapter?.outline || null;
        } catch (error) {
            return null;
        }
    },

    getPreviousChapter: async (chapterId: string): Promise<Chapter | null> => {
        try {
            // First get the current chapter to determine its order and storyId
            const currentChapter = await db.chapters.get(chapterId);
            if (!currentChapter) {
                console.error('Current chapter not found:', chapterId);
                return null;
            }

            // Find all chapters with lower order in the same story
            const previousChapters = await db.chapters
                .where('storyId')
                .equals(currentChapter.storyId)
                .and(chapter => chapter.order < currentChapter.order)
                .toArray();

            if (previousChapters.length === 0) {
                return null; // No previous chapters
            }

            // Find the chapter with the highest order (the immediate previous chapter)
            return previousChapters.reduce((prev, current) =>
                prev.order > current.order ? prev : current
            );
        } catch (error) {
            console.error('Error fetching previous chapter:', error);
            return null;
        }
    },

    getChapterPlainTextByChapterOrder: async (chapterOrder: number) => {
        const { getChapterPlainText } = useChapterStore.getState();
        const chapter = await db.chapters.where('order').equals(chapterOrder).first();
        if (!chapter) {
            return 'No chapter data is available for this order number.';
        }
        return getChapterPlainText(chapter.id);
    }
})); 