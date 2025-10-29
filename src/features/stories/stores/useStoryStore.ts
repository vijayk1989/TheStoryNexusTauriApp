import { create } from 'zustand';
import { attemptPromise } from '@jfdi/attempt';
import { db } from '@/services/database';
import { formatError } from '@/utils/errorUtils';
import { ERROR_MESSAGES } from '@/constants/errorMessages';
import { generateStoryId } from '@/utils/idGenerator';
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

        const [error, stories] = await attemptPromise(() => db.stories.toArray());

        if (error) {
            set({
                error: formatError(error, ERROR_MESSAGES.FETCH_FAILED('stories')),
                loading: false
            });
            return;
        }

        set({ stories, loading: false });
    },

    // Get a single story
    getStory: async (id: string) => {
        set({ loading: true, error: null });

        const [error, story] = await attemptPromise(() => db.getFullStory(id));

        if (error) {
            set({
                error: formatError(error, ERROR_MESSAGES.FETCH_FAILED('story')),
                loading: false
            });
            return;
        }

        if (!story) {
            set({
                error: ERROR_MESSAGES.NOT_FOUND('Story'),
                loading: false
            });
            return;
        }

        set({ currentStory: story, loading: false });
    },

    // Create a new story
    createStory: async (storyData) => {
        const storyDataWithId = {
            ...storyData,
            id: generateStoryId()
        };
        set({ loading: true, error: null });

        const [createError, storyId] = await attemptPromise(() =>
            db.createNewStory(storyDataWithId)
        );

        if (createError) {
            set({
                error: formatError(createError, ERROR_MESSAGES.CREATE_FAILED('story')),
                loading: false
            });
            throw createError;
        }

        const [getError, newStory] = await attemptPromise(() => db.stories.get(storyId));

        if (getError || !newStory) {
            const error = getError || new Error('Failed to retrieve created story');
            set({
                error: formatError(error, ERROR_MESSAGES.CREATE_FAILED('story')),
                loading: false
            });
            throw error;
        }

        set(state => ({
            stories: [...state.stories, newStory],
            currentStory: newStory,
            loading: false
        }));

        return storyId;
    },

    // Update a story
    updateStory: async (id: string, storyData: Partial<Story>) => {
        set({ loading: true, error: null });

        const [updateError] = await attemptPromise(() => db.stories.update(id, storyData));

        if (updateError) {
            set({
                error: formatError(updateError, ERROR_MESSAGES.UPDATE_FAILED('story')),
                loading: false
            });
            return;
        }

        const [getError, updatedStory] = await attemptPromise(() => db.stories.get(id));

        if (getError || !updatedStory) {
            const error = getError || new Error('Story not found after update');
            set({
                error: formatError(error, ERROR_MESSAGES.UPDATE_FAILED('story')),
                loading: false
            });
            return;
        }

        set(state => ({
            stories: state.stories.map(story =>
                story.id === id ? updatedStory : story
            ),
            currentStory: state.currentStory?.id === id ? updatedStory : state.currentStory,
            loading: false
        }));
    },

    // Delete a story
    deleteStory: async (id: string) => {
        set({ loading: true, error: null });

        const [error] = await attemptPromise(() => db.deleteStoryWithRelated(id));

        if (error) {
            set({
                error: formatError(error, ERROR_MESSAGES.DELETE_FAILED('story')),
                loading: false
            });
            return;
        }

        set(state => ({
            stories: state.stories.filter(story => story.id !== id),
            currentStory: state.currentStory?.id === id ? null : state.currentStory,
            loading: false
        }));
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