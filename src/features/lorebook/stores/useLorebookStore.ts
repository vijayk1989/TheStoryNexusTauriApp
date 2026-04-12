import { create } from 'zustand';
import { db } from '@/services/database';
import type { LorebookEntry } from '@/types/story';

interface LorebookState {
    entries: LorebookEntry[];
    isLoading: boolean;
    error: string | null;
    tagMap: Record<string, LorebookEntry>;
    buildTagMap: () => void;
    editorContent: string;
    setEditorContent: (content: string) => void;
    matchedEntries: Map<string, LorebookEntry>;
    setMatchedEntries: (entries: Map<string, LorebookEntry>) => void;
    chapterMatchedEntries: Map<string, LorebookEntry>;
    setChapterMatchedEntries: (entries: Map<string, LorebookEntry>) => void;

    // Actions
    loadEntries: (lorebookIds: string[]) => Promise<void>;
    createEntry: (entry: Omit<LorebookEntry, 'id' | 'createdAt'>) => Promise<void>;
    updateEntry: (id: string, data: Partial<LorebookEntry>) => Promise<void>;
    deleteEntry: (id: string) => Promise<void>;
    updateEntryAndRebuildTags: (id: string, data: Partial<LorebookEntry>) => Promise<void>;

    // Queries
    getEntriesByTag: (tag: string) => LorebookEntry[];
    getEntriesByCategory: (category: LorebookEntry['category']) => LorebookEntry[];
    getFilteredEntries: (includeDisabled?: boolean) => LorebookEntry[];
    getFilteredEntriesByIds: (ids: string[], includeDisabled?: boolean) => LorebookEntry[];

    // New Helper Methods
    getAllCharacters: () => LorebookEntry[];
    getAllLocations: () => LorebookEntry[];
    getAllItems: () => LorebookEntry[];
    getAllEvents: () => LorebookEntry[];
    getAllNotes: () => LorebookEntry[];
    getAllSynopsis: () => LorebookEntry[];
    getAllStartingScenarios: () => LorebookEntry[];
    getAllTimelines: () => LorebookEntry[];
    getAllEntries: () => LorebookEntry[];
    getEntriesByImportance: (importance: 'major' | 'minor' | 'background') => LorebookEntry[];
    getEntriesByStatus: (status: 'active' | 'inactive' | 'historical') => LorebookEntry[];
    getEntriesByType: (type: string) => LorebookEntry[];
    getEntriesByRelationship: (targetId: string) => LorebookEntry[];
    getEntriesByCustomField: (field: string, value: unknown) => LorebookEntry[];

    // Export/Import functions
    exportEntries: (lorebookId: string) => void;
    importEntries: (jsonData: string, targetLorebookId: string) => Promise<void>;
}

export const useLorebookStore = create<LorebookState>((set, get) => ({
    entries: [],
    isLoading: false,
    error: null,
    tagMap: {},
    editorContent: '',
    matchedEntries: new Map(),
    chapterMatchedEntries: new Map(),

    buildTagMap: () => {
        const { entries } = get();
        const newTagMap: Record<string, LorebookEntry> = {};

        entries.forEach(entry => {
            // Skip disabled entries when building the tag map
            if (entry.isDisabled) return;

            // Add the entry name as a tag (normalized to lowercase for case-insensitive matching)
            const normalizedName = entry.name.toLowerCase().trim();
            newTagMap[normalizedName] = entry;

            // Process the explicit tags
            entry.tags.forEach(tag => {
                // Add the full tag
                const normalizedTag = tag.toLowerCase().trim();
                newTagMap[normalizedTag] = entry;

                // If this tag is a single word, we're done
                if (!normalizedTag.includes(' ')) {
                    return;
                }

                // For multi-word tags, add individual words only if they're also standalone tags
                const words = normalizedTag.split(' ');
                words.forEach(word => {
                    // Only add individual words if they exist as standalone tags
                    if (entry.tags.some(t => t.toLowerCase() === word)) {
                        newTagMap[word] = entry;
                    }
                });
            });
        });

        set({ tagMap: newTagMap });
    },

    loadEntries: async (lorebookIds: string[]) => {
        set({ isLoading: true, error: null });
        try {
            const entries = await db.getLorebookEntriesByLoreBooks(lorebookIds);
            set({ entries, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    createEntry: async (entryData) => {
        try {
            const id = crypto.randomUUID();
            const newEntry: LorebookEntry = {
                ...entryData,
                id,
                createdAt: new Date(),
                isDisabled: false, // Set isDisabled to false by default
            };

            await db.lorebookEntries.add(newEntry);
            set(state => ({ entries: [...state.entries, newEntry] }));
            get().buildTagMap();
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    updateEntry: async (id, data) => {
        try {
            await db.lorebookEntries.update(id, data);
            set(state => ({
                entries: state.entries.map(entry =>
                    entry.id === id ? { ...entry, ...data } : entry
                ),
            }));
            get().buildTagMap();
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    deleteEntry: async (id) => {
        try {
            await db.lorebookEntries.delete(id);
            set(state => ({
                entries: state.entries.filter(entry => entry.id !== id),
            }));
            get().buildTagMap();
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    getEntriesByTag: (tag: string) => {
        const { entries } = get();
        return entries.filter(entry =>
            !entry.isDisabled && // Filter out disabled entries
            entry.tags.some(t => t.toLowerCase() === tag.toLowerCase())
        );
    },

    getEntriesByCategory: (category: LorebookEntry['category']) => {
        const { entries } = get();
        return entries.filter(entry =>
            !entry.isDisabled && // Filter out disabled entries
            entry.category === category
        );
    },

    setEditorContent: (content: string) => set({ editorContent: content }),

    setMatchedEntries: (entries) => {
        set({ matchedEntries: entries });
    },

    setChapterMatchedEntries: (entries) => {
        set({ chapterMatchedEntries: entries });
    },

    // New combined action
    updateEntryAndRebuildTags: async (id, data) => {
        try {
            await db.lorebookEntries.update(id, data);
            set(state => ({
                entries: state.entries.map(entry =>
                    entry.id === id ? { ...entry, ...data } : entry
                ),
            }));
            // Rebuild tags after updating entry
            get().buildTagMap();
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    // New Helper Methods
    getAllCharacters: () => {
        const { entries } = get();
        return entries.filter(entry =>
            !entry.isDisabled && // Filter out disabled entries
            entry.category === 'character'
        );
    },

    getAllLocations: () => {
        const { entries } = get();
        return entries.filter(entry =>
            !entry.isDisabled && // Filter out disabled entries
            entry.category === 'location'
        );
    },

    getAllItems: () => {
        const { entries } = get();
        return entries.filter(entry =>
            !entry.isDisabled && // Filter out disabled entries
            entry.category === 'item'
        );
    },

    getAllEvents: () => {
        const { entries } = get();
        return entries.filter(entry =>
            !entry.isDisabled && // Filter out disabled entries
            entry.category === 'event'
        );
    },

    getAllNotes: () => {
        const { entries } = get();
        return entries.filter(entry =>
            !entry.isDisabled && // Filter out disabled entries
            entry.category === 'note'
        );
    },

    getAllSynopsis: () => {
        const { entries } = get();
        return entries.filter(entry =>
            !entry.isDisabled && // Filter out disabled entries
            entry.category === 'synopsis'
        );
    },

    getAllStartingScenarios: () => {
        const { entries } = get();
        return entries.filter(entry =>
            !entry.isDisabled && // Filter out disabled entries
            entry.category === 'starting scenario'
        );
    },

    getAllTimelines: () => {
        const { entries } = get();
        return entries.filter(entry =>
            !entry.isDisabled && // Filter out disabled entries
            entry.category === 'timeline'
        );
    },

    getAllEntries: () => {
        const { entries } = get();
        return entries.filter(entry => !entry.isDisabled); // Filter out disabled entries
    },

    getEntriesByImportance: (importance) => {
        const { entries } = get();
        return entries.filter(entry =>
            !entry.isDisabled && // Filter out disabled entries
            entry.metadata?.importance === importance
        );
    },

    getEntriesByStatus: (status) => {
        const { entries } = get();
        return entries.filter(entry =>
            !entry.isDisabled && // Filter out disabled entries
            entry.metadata?.status === status
        );
    },

    getEntriesByType: (type) => {
        const { entries } = get();
        return entries.filter(entry =>
            !entry.isDisabled && // Filter out disabled entries
            entry.metadata?.type === type
        );
    },

    getEntriesByRelationship: (targetId) => {
        const { entries } = get();
        return entries.filter(entry =>
            !entry.isDisabled && // Filter out disabled entries
            entry.metadata?.relationships?.some(rel => rel.targetId === targetId)
        );
    },

    getEntriesByCustomField: (field, value) => {
        const { entries } = get();
        return entries.filter(entry =>
            !entry.isDisabled && // Filter out disabled entries
            entry.metadata?.customFields?.[field] === value
        );
    },

    getFilteredEntries: (includeDisabled = false) => {
        const { entries } = get();
        return includeDisabled
            ? entries
            : entries.filter(entry => !entry.isDisabled);
    },

    getFilteredEntriesByIds: (ids: string[], includeDisabled = false) => {
        const { entries } = get();
        return entries.filter(entry =>
            ids.includes(entry.id) && (includeDisabled || !entry.isDisabled)
        );
    },

    // Export lorebook entries for a given lore book
    exportEntries: (lorebookId: string) => {
        const { entries } = get();
        const bookEntries = entries.filter(entry => entry.lorebookId === lorebookId);

        const dataStr = JSON.stringify({
            version: "1.1",
            type: "lorebook",
            entries: bookEntries
        }, null, 2);

        const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
        const exportName = `lorebook-export-${new Date().toISOString().slice(0, 10)}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportName);
        linkElement.click();
    },

    // Import lorebook entries into a target lore book
    importEntries: async (jsonData: string, targetLorebookId: string) => {
        try {
            const data = JSON.parse(jsonData);

            if (!data.type || data.type !== "lorebook" || !Array.isArray(data.entries)) {
                throw new Error("Invalid lorebook data format");
            }

            for (const entry of data.entries) {
                const newId = crypto.randomUUID();
                const newEntry: LorebookEntry = {
                    ...entry,
                    id: newId,
                    lorebookId: targetLorebookId,
                    createdAt: new Date(),
                    // Remove stale storyId from v1.0 exports if present
                    storyId: undefined,
                };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                delete (newEntry as any).storyId;
                await db.lorebookEntries.add(newEntry);
            }

            // Reload entries for the lorebook
            const updatedEntries = await db.getLorebookEntriesByLoreBook(targetLorebookId);
            set(state => ({
                entries: [
                    ...state.entries.filter(e => e.lorebookId !== targetLorebookId),
                    ...updatedEntries,
                ],
            }));
            get().buildTagMap();

        } catch (error) {
            console.error("Import failed:", error);
            throw error;
        }
    },
})); 