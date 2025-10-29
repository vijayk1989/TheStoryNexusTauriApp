import { create } from 'zustand';
import { attemptPromise } from '@jfdi/attempt';
import { SceneBeat } from '@/types/story';
import { formatError } from '@/utils/errorUtils';
import { ERROR_MESSAGES } from '@/constants/errorMessages';
import { sceneBeatService } from '../services/sceneBeatService';

interface SceneBeatState {
    sceneBeats: SceneBeat[];
    currentSceneBeat: SceneBeat | null;
    loading: boolean;
    error: string | null;

    // Fetch all SceneBeats for a chapter
    fetchSceneBeatsByChapter: (chapterId: string) => Promise<SceneBeat[]>;

    // Get a single SceneBeat
    getSceneBeat: (id: string) => Promise<SceneBeat | undefined>;

    // Create a new SceneBeat
    createSceneBeat: (data: Omit<SceneBeat, 'id' | 'createdAt'>) => Promise<string>;

    // Update a SceneBeat
    updateSceneBeat: (id: string, data: Partial<SceneBeat>) => Promise<void>;

    // Delete a SceneBeat
    deleteSceneBeat: (id: string) => Promise<void>;

    // Set the current SceneBeat
    setCurrentSceneBeat: (sceneBeat: SceneBeat | null) => void;

    // Clear all SceneBeats
    clearSceneBeats: () => void;
}

export const useSceneBeatStore = create<SceneBeatState>((set, get) => ({
    sceneBeats: [],
    currentSceneBeat: null,
    loading: false,
    error: null,

    fetchSceneBeatsByChapter: async (chapterId: string) => {
        set({ loading: true, error: null });

        const [error, sceneBeats] = await attemptPromise(() =>
            sceneBeatService.getSceneBeatsByChapter(chapterId)
        );

        if (error) {
            const errorMessage = formatError(error, ERROR_MESSAGES.FETCH_FAILED('scene beats'));
            set({ error: errorMessage, loading: false });
            throw error;
        }

        set({ sceneBeats, loading: false });
        return sceneBeats;
    },

    getSceneBeat: async (id: string) => {
        set({ loading: true, error: null });

        const [error, sceneBeat] = await attemptPromise(() => sceneBeatService.getSceneBeat(id));

        if (error) {
            const errorMessage = formatError(error, ERROR_MESSAGES.FETCH_FAILED('scene beat'));
            set({ error: errorMessage, loading: false });
            throw error;
        }

        if (sceneBeat) {
            set({ currentSceneBeat: sceneBeat, loading: false });
        } else {
            set({ loading: false });
        }

        return sceneBeat;
    },

    createSceneBeat: async (data: Omit<SceneBeat, 'id' | 'createdAt'>) => {
        set({ loading: true, error: null });

        const [createError, id] = await attemptPromise(() => sceneBeatService.createSceneBeat(data));

        if (createError) {
            const errorMessage = formatError(createError, ERROR_MESSAGES.CREATE_FAILED('scene beat'));
            set({ error: errorMessage, loading: false });
            throw createError;
        }

        const [fetchError, newSceneBeat] = await attemptPromise(() => sceneBeatService.getSceneBeat(id));

        if (fetchError) {
            const errorMessage = formatError(fetchError, ERROR_MESSAGES.FETCH_FAILED('scene beat'));
            set({ error: errorMessage, loading: false });
            throw fetchError;
        }

        if (newSceneBeat) {
            set(state => ({
                sceneBeats: [...state.sceneBeats, newSceneBeat],
                currentSceneBeat: newSceneBeat,
                loading: false
            }));
        } else {
            set({ loading: false });
        }

        return id;
    },

    updateSceneBeat: async (id: string, data: Partial<SceneBeat>) => {
        set({ loading: true, error: null });

        const [error] = await attemptPromise(() => sceneBeatService.updateSceneBeat(id, data));

        if (error) {
            const errorMessage = formatError(error, ERROR_MESSAGES.UPDATE_FAILED('scene beat'));
            set({ error: errorMessage, loading: false });
            throw error;
        }

        // Update the scene beat in the store
        set(state => {
            const updatedSceneBeats = state.sceneBeats.map(sb =>
                sb.id === id ? { ...sb, ...data } : sb
            );

            // Also update currentSceneBeat if it's the one being updated
            const updatedCurrentSceneBeat = state.currentSceneBeat && state.currentSceneBeat.id === id
                ? { ...state.currentSceneBeat, ...data }
                : state.currentSceneBeat;

            return {
                sceneBeats: updatedSceneBeats,
                currentSceneBeat: updatedCurrentSceneBeat,
                loading: false
            };
        });
    },

    deleteSceneBeat: async (id: string) => {
        set({ loading: true, error: null });

        const [error] = await attemptPromise(() => sceneBeatService.deleteSceneBeat(id));

        if (error) {
            const errorMessage = formatError(error, ERROR_MESSAGES.DELETE_FAILED('scene beat'));
            set({ error: errorMessage, loading: false });
            throw error;
        }

        // Remove the scene beat from the store
        set(state => ({
            sceneBeats: state.sceneBeats.filter(sb => sb.id !== id),
            currentSceneBeat: state.currentSceneBeat?.id === id ? null : state.currentSceneBeat,
            loading: false
        }));
    },

    setCurrentSceneBeat: (sceneBeat: SceneBeat | null) => {
        set({ currentSceneBeat: sceneBeat });
    },

    clearSceneBeats: () => {
        set({ sceneBeats: [], currentSceneBeat: null });
    }
})); 