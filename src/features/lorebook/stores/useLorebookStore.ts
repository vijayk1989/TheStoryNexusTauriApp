import { create } from 'zustand';
import { db } from '@/services/database';
import type { LorebookEntry } from '@/types/story';
import { normalizeLorebookEntry, normalizeLorebookEntries } from '../utils/lorebookEntryNormalization';

interface LorebookState {
    entries: LorebookEntry[];
    isLoading: boolean;
    error: string | null;
    aliasMap: Record<string, LorebookEntry>;
    buildAliasMap: () => void;
    editorContent: string;
    setEditorContent: (content: string) => void;
    matchedEntries: Map<string, LorebookEntry>;
    setMatchedEntries: (entries: Map<string, LorebookEntry>) => void;
    chapterMatchedEntries: Map<string, LorebookEntry>;
    setChapterMatchedEntries: (entries: Map<string, LorebookEntry>) => void;

    // Actions
    loadEntries: (storyId: string) => Promise<void>;
    createEntry: (entry: Omit<LorebookEntry, 'id' | 'createdAt'>) => Promise<void>;
    updateEntry: (id: string, data: Partial<LorebookEntry>) => Promise<void>;
    deleteEntry: (id: string) => Promise<void>;
    updateEntryAndRebuildAliases: (id: string, data: Partial<LorebookEntry>) => Promise<void>;

    // Queries
    getEntriesByAlias: (alias: string) => LorebookEntry[];
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
    getAllEntries: () => LorebookEntry[];
    getEntriesByImportance: (importance: 'major' | 'minor' | 'background') => LorebookEntry[];
    getEntriesByStatus: (status: 'active' | 'inactive' | 'historical') => LorebookEntry[];
    getEntriesByType: (type: string) => LorebookEntry[];
    getEntriesByRelationship: (targetId: string) => LorebookEntry[];
    getEntriesByCustomField: (field: string, value: unknown) => LorebookEntry[];

    // Export/Import functions
    exportEntries: (storyId: string) => void;
    importEntries: (jsonData: string, targetStoryId: string) => Promise<void>;
}

export const useLorebookStore = create<LorebookState>((set, get) => ({
    entries: [],
    isLoading: false,
    error: null,
    aliasMap: {},
    editorContent: '',
    matchedEntries: new Map(),
    chapterMatchedEntries: new Map(),

    buildAliasMap: () => {
        const { entries } = get();
        const newAliasMap: Record<string, LorebookEntry> = {};

        entries.forEach(entry => {
            if (entry.isDisabled) return;

            const normalizedName = entry.name.toLowerCase().trim();
            newAliasMap[normalizedName] = entry;

            entry.aliases.forEach(alias => {
                const normalizedAlias = alias.toLowerCase().trim();
                newAliasMap[normalizedAlias] = entry;

                if (!normalizedAlias.includes(' ')) {
                    return;
                }

                const words = normalizedAlias.split(' ');
                words.forEach(word => {
                    if (entry.aliases.some(aliasValue => aliasValue.toLowerCase() === word)) {
                        newAliasMap[word] = entry;
                    }
                });
            });
        });

        set({ aliasMap: newAliasMap });
    },

    loadEntries: async (storyId: string) => {
        set({ isLoading: true, error: null });
        try {
            const entries = normalizeLorebookEntries(await db.getLorebookEntriesByStory(storyId));
            set({ entries, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    createEntry: async (entryData) => {
        try {
            const id = crypto.randomUUID();
            const newEntry: LorebookEntry = {
                ...normalizeLorebookEntry(entryData),
                id,
                createdAt: new Date(),
                isDisabled: false, // Set isDisabled to false by default
            };

            await db.lorebookEntries.add(newEntry);
            set(state => ({ entries: [...state.entries, newEntry] }));
            get().buildAliasMap();
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    updateEntry: async (id, data) => {
        try {
            const existingEntry = get().entries.find(entry => entry.id === id) || await db.lorebookEntries.get(id);
            if (existingEntry) {
                const normalizedEntry = normalizeLorebookEntry({ ...existingEntry, ...data }) as LorebookEntry;
                await db.lorebookEntries.put(normalizedEntry);
                set(state => ({
                    entries: state.entries.map(entry =>
                        entry.id === id ? normalizeLorebookEntry({ ...entry, ...normalizedEntry }) : entry
                    ),
                }));
            } else {
                const normalizedEntry = normalizeLorebookEntry(data);
                await db.lorebookEntries.update(id, normalizedEntry);
                set(state => ({
                    entries: state.entries.map(entry =>
                        entry.id === id ? normalizeLorebookEntry({ ...entry, ...normalizedEntry }) : entry
                    ),
                }));
            }
            get().buildAliasMap();
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
            get().buildAliasMap();
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    getEntriesByAlias: (alias: string) => {
        const { entries } = get();
        return entries.filter(entry =>
            !entry.isDisabled &&
            entry.aliases.some(entryAlias => entryAlias.toLowerCase() === alias.toLowerCase())
        );
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
    updateEntryAndRebuildAliases: async (id, data) => {
        try {
            const existingEntry = get().entries.find(entry => entry.id === id) || await db.lorebookEntries.get(id);
            if (existingEntry) {
                const normalizedEntry = normalizeLorebookEntry({ ...existingEntry, ...data }) as LorebookEntry;
                await db.lorebookEntries.put(normalizedEntry);
                set(state => ({
                    entries: state.entries.map(entry =>
                        entry.id === id ? normalizeLorebookEntry({ ...entry, ...normalizedEntry }) : entry
                    ),
                }));
            } else {
                const normalizedEntry = normalizeLorebookEntry(data);
                await db.lorebookEntries.update(id, normalizedEntry);
                set(state => ({
                    entries: state.entries.map(entry =>
                        entry.id === id ? normalizeLorebookEntry({ ...entry, ...normalizedEntry }) : entry
                    ),
                }));
            }
            get().buildAliasMap();
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

    // Export lorebook entries
    exportEntries: (storyId: string) => {
        const { entries } = get();
        const storyEntries = entries.filter(entry => entry.storyId === storyId).map(normalizeLorebookEntry);

        // Create a JSON file
        const dataStr = JSON.stringify({
            version: "1.0",
            type: "lorebook",
            entries: storyEntries
        }, null, 2);

        // Create and trigger download
        const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
        const exportName = `lorebook-export-${new Date().toISOString().slice(0, 10)}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportName);
        linkElement.click();
    },

    // Import lorebook entries
    importEntries: async (jsonData: string, targetStoryId: string) => {
        try {
            const data = JSON.parse(jsonData);

            // Validate the data format
            if (!data.type || data.type !== "lorebook" || !Array.isArray(data.entries)) {
                throw new Error("Invalid lorebook data format");
            }

            // Process each entry
            for (const entry of data.entries) {
                // Create a new ID for the entry
                const newId = crypto.randomUUID();

                // Create a new entry with the target storyId
                const newEntry: LorebookEntry = {
                    ...normalizeLorebookEntry(entry),
                    id: newId,
                    storyId: targetStoryId,
                    createdAt: new Date()
                };

                // Add to database
                await db.lorebookEntries.add(newEntry);
            }

            // Reload entries after import
            await get().loadEntries(targetStoryId);

            get().buildAliasMap();

        } catch (error) {
            console.error("Import failed:", error);
            throw error;
        }
    },
})); 
