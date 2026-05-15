import { create } from 'zustand';
import { SceneBeat } from '@/types/story';
import { sceneBeatService } from '../services/sceneBeatService';

interface SceneBeatState {
    sceneBeats: SceneBeat[];
    sceneBeatsById: Record<string, SceneBeat>;
    loadedChapterId: string | null;
    currentSceneBeat: SceneBeat | null;
    loading: boolean;
    error: string | null;

    // Fetch all SceneBeats for a chapter
    fetchSceneBeatsByChapter: (chapterId: string) => Promise<SceneBeat[]>;

    // Get a single SceneBeat
    getSceneBeat: (id: string) => Promise<SceneBeat | undefined>;

    // Get a cached SceneBeat without touching IndexedDB
    getCachedSceneBeat: (id: string) => SceneBeat | undefined;

    // Create a new SceneBeat
    createSceneBeat: (data: Omit<SceneBeat, 'id' | 'createdAt'>) => Promise<string>;

    // Update a SceneBeat
    updateSceneBeat: (id: string, data: Partial<SceneBeat>) => Promise<void>;

    // Delete a SceneBeat
    deleteSceneBeat: (id: string) => Promise<void>;

    // Set the current SceneBeat
    setCurrentSceneBeat: (sceneBeat: SceneBeat | null) => void;

    // Update cache after direct service calls or node hydration
    upsertSceneBeat: (sceneBeat: SceneBeat) => void;

    // Clear all SceneBeats
    clearSceneBeats: () => void;
}

export const useSceneBeatStore = create<SceneBeatState>((set, get) => ({
    sceneBeats: [],
    sceneBeatsById: {},
    loadedChapterId: null,
    currentSceneBeat: null,
    loading: false,
    error: null,

    fetchSceneBeatsByChapter: async (chapterId: string) => {
        set({ loading: true, error: null });
        try {
            const sceneBeats = await sceneBeatService.getSceneBeatsByChapter(chapterId);
            set({
                sceneBeats,
                sceneBeatsById: Object.fromEntries(sceneBeats.map((sceneBeat) => [sceneBeat.id, sceneBeat])),
                loadedChapterId: chapterId,
                loading: false
            });
            return sceneBeats;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch scene beats';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    getSceneBeat: async (id: string) => {
        const cached = get().sceneBeatsById[id];
        if (cached) {
            set({ currentSceneBeat: cached, error: null });
            return cached;
        }

        set({ loading: true, error: null });
        try {
            const sceneBeat = await sceneBeatService.getSceneBeat(id);
            if (sceneBeat) {
                set(state => ({
                    sceneBeats: state.sceneBeats.some(sb => sb.id === id)
                        ? state.sceneBeats.map(sb => sb.id === id ? sceneBeat : sb)
                        : [...state.sceneBeats, sceneBeat],
                    sceneBeatsById: {
                        ...state.sceneBeatsById,
                        [id]: sceneBeat,
                    },
                    currentSceneBeat: sceneBeat,
                    loading: false
                }));
            } else {
                set({ loading: false });
            }
            return sceneBeat;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to get scene beat';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    getCachedSceneBeat: (id: string) => get().sceneBeatsById[id],

    createSceneBeat: async (data: Omit<SceneBeat, 'id' | 'createdAt'>) => {
        set({ loading: true, error: null });
        try {
            const id = await sceneBeatService.createSceneBeat(data);
            const newSceneBeat = await sceneBeatService.getSceneBeat(id);
            if (newSceneBeat) {
                set(state => ({
                    sceneBeats: [...state.sceneBeats, newSceneBeat],
                    sceneBeatsById: {
                        ...state.sceneBeatsById,
                        [newSceneBeat.id]: newSceneBeat,
                    },
                    currentSceneBeat: newSceneBeat,
                    loading: false
                }));
            } else {
                set({ loading: false });
            }
            return id;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create scene beat';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    updateSceneBeat: async (id: string, data: Partial<SceneBeat>) => {
        set({ loading: true, error: null });
        try {
            await sceneBeatService.updateSceneBeat(id, data);

            // Update the scene beat in the store
            set(state => {
                const updatedSceneBeats = state.sceneBeats.map(sb =>
                    sb.id === id ? { ...sb, ...data } : sb
                );
                const previous = state.sceneBeatsById[id];
                const updatedCachedSceneBeat = previous ? { ...previous, ...data } : previous;

                // Also update currentSceneBeat if it's the one being updated
                const updatedCurrentSceneBeat = state.currentSceneBeat && state.currentSceneBeat.id === id
                    ? { ...state.currentSceneBeat, ...data }
                    : state.currentSceneBeat;

                return {
                    sceneBeats: updatedSceneBeats,
                    sceneBeatsById: updatedCachedSceneBeat
                        ? {
                            ...state.sceneBeatsById,
                            [id]: updatedCachedSceneBeat,
                        }
                        : state.sceneBeatsById,
                    currentSceneBeat: updatedCurrentSceneBeat,
                    loading: false
                };
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update scene beat';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    deleteSceneBeat: async (id: string) => {
        set({ loading: true, error: null });
        try {
            await sceneBeatService.deleteSceneBeat(id);

            // Remove the scene beat from the store
            set(state => ({
                sceneBeats: state.sceneBeats.filter(sb => sb.id !== id),
                sceneBeatsById: Object.fromEntries(
                    Object.entries(state.sceneBeatsById).filter(([sceneBeatId]) => sceneBeatId !== id)
                ),
                currentSceneBeat: state.currentSceneBeat?.id === id ? null : state.currentSceneBeat,
                loading: false
            }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete scene beat';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    setCurrentSceneBeat: (sceneBeat: SceneBeat | null) => {
        set({ currentSceneBeat: sceneBeat });
    },

    upsertSceneBeat: (sceneBeat: SceneBeat) => {
        set(state => ({
            sceneBeats: state.sceneBeats.some(sb => sb.id === sceneBeat.id)
                ? state.sceneBeats.map(sb => sb.id === sceneBeat.id ? sceneBeat : sb)
                : [...state.sceneBeats, sceneBeat],
            sceneBeatsById: {
                ...state.sceneBeatsById,
                [sceneBeat.id]: sceneBeat,
            },
            currentSceneBeat: state.currentSceneBeat?.id === sceneBeat.id
                ? sceneBeat
                : state.currentSceneBeat,
        }));
    },

    clearSceneBeats: () => {
        set({ sceneBeats: [], sceneBeatsById: {}, loadedChapterId: null, currentSceneBeat: null });
    }
})); 
