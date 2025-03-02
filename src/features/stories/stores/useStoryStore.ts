import { create } from 'zustand';
import { db } from '@/services/database';
import type { Story } from '@/types/story';

interface StoryState {
    stories: Story[];
    currentStory: Story | null;
    loading: boolean;
    error: string | null;

    // Actions
    fetchStories: () => Promise<void>;
    getStory: (id: string) => Promise<void>;
    createStory: (story: Omit<Story, 'id' | 'createdAt'>) => Promise<string>;
    updateStory: (id: string, story: Partial<Story>) => Promise<void>;
    deleteStory: (id: string) => Promise<void>;
    setCurrentStory: (story: Story | null) => void;
    clearError: () => void;
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
    createStory: async (storyData) => {
        const storyDataWithId = {
            ...storyData,
            id: crypto.randomUUID()
        };
        set({ loading: true, error: null });
        try {
            const storyId = await db.createNewStory(storyDataWithId);
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
    }
})); 