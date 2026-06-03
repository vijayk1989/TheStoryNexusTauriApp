import { create } from 'zustand';
import { db } from '@/services/database';
import type { Story } from '@/types/story';
import { storyExportService } from '@/services/storyExportService';

interface StoryState {
    stories: Story[];
    currentStory: Story | null;
    loading: boolean;
    error: string | null;

    // Actions
    fetchStories: () => Promise<void>;
    getStory: (id: string) => Promise<void>;
    /** Pass `createDedicatedLoreBook: true` to auto-create and link a lore book named after the story. */
    createStory: (story: Omit<Story, 'id' | 'createdAt'>, createDedicatedLoreBook?: boolean) => Promise<string>;
    updateStory: (id: string, story: Partial<Story>) => Promise<void>;
    deleteStory: (id: string) => Promise<void>;
    setCurrentStory: (story: Story | null) => void;
    clearError: () => void;
    // File-based save/load actions
    linkStoryToFile: (storyId: string) => Promise<string | null>;
    syncStoryToFile: (storyId: string) => Promise<void>;
    unlinkStoryFile: (storyId: string) => Promise<void>;
    importFromFile: () => Promise<string | null>;
}

export const useStoryStore = create<StoryState>((set, _get) => ({
    stories: [],
    currentStory: null,
    loading: false,
    error: null,

    // Fetch all stories
    fetchStories: async () => {
        set({ loading: true, error: null });
        try {
            const stories = await db.stories.toArray();
            set({ stories, loading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to fetch stories',
                loading: false
            });
        }
    },

    // Get a single story
    getStory: async (id: string) => {
        set({ loading: true, error: null });
        try {
            const story = await db.getFullStory(id);
            if (!story) {
                throw new Error('Story not found');
            }
            set({ currentStory: story, loading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to fetch story',
                loading: false
            });
        }
    },

    // Create a new story
    createStory: async (storyData, createDedicatedLoreBook = true) => {
        const storyId = crypto.randomUUID();
        set({ loading: true, error: null });
        try {
            let lorebookIds: string[] = [];

            if (createDedicatedLoreBook) {
                const lorebookId = crypto.randomUUID();
                await db.createLoreBook({ id: lorebookId, name: storyData.title, isDemo: storyData.isDemo });
                lorebookIds = [lorebookId];
            }

            await db.createNewStory({ ...storyData, id: storyId, lorebookIds });
            const newStory = await db.stories.get(storyId);
            if (!newStory) throw new Error('Failed to create story');

            set(state => ({
                stories: [...state.stories, newStory],
                currentStory: newStory,
                loading: false
            }));

            return storyId;
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to create story',
                loading: false
            });
            throw error;
        }
    },

    // Update a story
    updateStory: async (id: string, storyData: Partial<Story>) => {
        set({ loading: true, error: null });
        try {
            await db.stories.update(id, storyData);
            const updatedStory = await db.stories.get(id);
            if (!updatedStory) throw new Error('Story not found after update');

            set(state => ({
                stories: state.stories.map(story =>
                    story.id === id ? updatedStory : story
                ),
                currentStory: state.currentStory?.id === id ? updatedStory : state.currentStory,
                loading: false
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to update story',
                loading: false
            });
        }
    },

    // Delete a story
    deleteStory: async (id: string) => {
        set({ loading: true, error: null });
        try {
            await db.deleteStoryWithRelated(id);
            set(state => ({
                stories: state.stories.filter(story => story.id !== id),
                currentStory: state.currentStory?.id === id ? null : state.currentStory,
                loading: false
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to delete story',
                loading: false
            });
        }
    },

    // Set current story
    setCurrentStory: (story) => {
        set({ currentStory: story });
    },

    // Clear error
    clearError: () => {
        set({ error: null });
    },

    // Open native save dialog, link story to chosen file, write initial snapshot
    linkStoryToFile: async (storyId: string) => {
        const filePath = await storyExportService.linkStoryToFile(storyId);
        if (filePath) {
            // Refresh the story record so saveFilePath is reflected in Zustand
            const updated = await db.stories.get(storyId);
            if (updated) {
                set(state => ({
                    stories: state.stories.map(s => s.id === storyId ? updated : s),
                    currentStory: state.currentStory?.id === storyId ? updated : state.currentStory,
                }));
            }
        }
        return filePath;
    },

    // Write current story snapshot to the linked file (no-op if no file linked)
    syncStoryToFile: async (storyId: string) => {
        await storyExportService.syncStoryToFile(storyId, { explicit: true });
    },

    // Remove file link from story
    unlinkStoryFile: async (storyId: string) => {
        await storyExportService.unlinkStoryFile(storyId);
        const updated = await db.stories.get(storyId);
        if (updated) {
            set(state => ({
                stories: state.stories.map(s => s.id === storyId ? updated : s),
                currentStory: state.currentStory?.id === storyId ? updated : state.currentStory,
            }));
        }
    },

    // Open native file-open dialog and import the chosen story JSON
    importFromFile: async () => {
        const newStoryId = await storyExportService.importFromFile();
        if (newStoryId) {
            const stories = await db.stories.toArray();
            set({ stories });
        }
        return newStoryId;
    },
})); 