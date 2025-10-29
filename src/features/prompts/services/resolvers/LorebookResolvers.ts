import { PromptContext, LorebookEntry } from '@/types/story';
import { useLorebookStore } from '@/features/lorebook/stores/useLorebookStore';
import { IVariableResolver, ILorebookFormatter } from './types';

export class MatchedEntriesChapterResolver implements IVariableResolver {
    constructor(private formatter: ILorebookFormatter) {}

    async resolve(context: PromptContext): Promise<string> {
        if (!context.chapterMatchedEntries || context.chapterMatchedEntries.size === 0) {
            return '';
        }

        const entries = Array.from(context.chapterMatchedEntries)
            .filter(entry => !entry.isDisabled);

        if (entries.length === 0) {
            return '';
        }

        entries.sort((a, b) => {
            const importanceOrder = { 'major': 0, 'minor': 1, 'background': 2 };
            const aImportance = a.metadata?.importance || 'background';
            const bImportance = b.metadata?.importance || 'background';
            return importanceOrder[aImportance] - importanceOrder[bImportance];
        });

        return this.formatter.formatEntries(entries);
    }
}

export class SceneBeatMatchedEntriesResolver implements IVariableResolver {
    constructor(private formatter: ILorebookFormatter) {}

    async resolve(context: PromptContext): Promise<string> {
        if (!context.sceneBeatMatchedEntries || context.sceneBeatMatchedEntries.size === 0) {
            return '';
        }

        const entries = Array.from(context.sceneBeatMatchedEntries)
            .filter(entry => !entry.isDisabled);

        if (entries.length === 0) {
            return '';
        }

        entries.sort((a, b) => {
            const importanceOrder = { 'major': 0, 'minor': 1, 'background': 2 };
            const aImportance = a.metadata?.importance || 'background';
            const bImportance = b.metadata?.importance || 'background';
            return importanceOrder[aImportance] - importanceOrder[bImportance];
        });

        return this.formatter.formatEntries(entries);
    }
}

export class AllEntriesResolver implements IVariableResolver {
    constructor(private formatter: ILorebookFormatter) {}

    async resolve(context: PromptContext, category?: string): Promise<string> {
        const { getFilteredEntries } = useLorebookStore.getState();

        let entries = getFilteredEntries();
        entries = entries.filter(entry => entry.storyId === context.storyId);

        if (category) {
            entries = entries.filter(entry => entry.category === category);
        }

        return this.formatter.formatEntries(entries);
    }
}

export class CharacterResolver implements IVariableResolver {
    constructor(private formatter: ILorebookFormatter) {}

    async resolve(context: PromptContext, name: string): Promise<string> {
        const { getFilteredEntries } = useLorebookStore.getState();

        const entries = getFilteredEntries()
            .filter(entry =>
                entry.storyId === context.storyId &&
                entry.category === 'character' &&
                entry.name.toLowerCase() === name.toLowerCase()
            );

        const matchedEntry = entries[0];

        return matchedEntry ? this.formatter.formatEntries([matchedEntry]) : '';
    }
}

export class AllCharactersResolver implements IVariableResolver {
    constructor(private formatter: ILorebookFormatter) {}

    async resolve(context: PromptContext): Promise<string> {
        const { getAllCharacters } = useLorebookStore.getState();
        return this.formatter.formatEntries(getAllCharacters());
    }
}

export class AllLocationsResolver implements IVariableResolver {
    constructor(private formatter: ILorebookFormatter) {}

    async resolve(context: PromptContext): Promise<string> {
        const { getAllLocations } = useLorebookStore.getState();
        return this.formatter.formatEntries(getAllLocations());
    }
}

export class AllItemsResolver implements IVariableResolver {
    constructor(private formatter: ILorebookFormatter) {}

    async resolve(context: PromptContext): Promise<string> {
        const { getAllItems } = useLorebookStore.getState();
        return this.formatter.formatEntries(getAllItems());
    }
}

export class AllEventsResolver implements IVariableResolver {
    constructor(private formatter: ILorebookFormatter) {}

    async resolve(context: PromptContext): Promise<string> {
        const { getAllEvents } = useLorebookStore.getState();
        return this.formatter.formatEntries(getAllEvents());
    }
}

export class AllNotesResolver implements IVariableResolver {
    constructor(private formatter: ILorebookFormatter) {}

    async resolve(context: PromptContext): Promise<string> {
        const { getAllNotes } = useLorebookStore.getState();
        return this.formatter.formatEntries(getAllNotes());
    }
}

export class AllSynopsisResolver implements IVariableResolver {
    constructor(private formatter: ILorebookFormatter) {}

    async resolve(context: PromptContext): Promise<string> {
        const { getAllSynopsis } = useLorebookStore.getState();
        return this.formatter.formatEntries(getAllSynopsis());
    }
}

export class AllStartingScenariosResolver implements IVariableResolver {
    constructor(private formatter: ILorebookFormatter) {}

    async resolve(context: PromptContext): Promise<string> {
        const { getAllStartingScenarios } = useLorebookStore.getState();
        return this.formatter.formatEntries(getAllStartingScenarios());
    }
}

export class AllTimelinesResolver implements IVariableResolver {
    constructor(private formatter: ILorebookFormatter) {}

    async resolve(context: PromptContext): Promise<string> {
        const { getAllTimelines } = useLorebookStore.getState();
        return this.formatter.formatEntries(getAllTimelines());
    }
}

export class SceneBeatContextResolver implements IVariableResolver {
    constructor(private formatter: ILorebookFormatter) {}

    async resolve(context: PromptContext): Promise<string> {
        const uniqueEntries = new Map<string, LorebookEntry>();

        if (context.sceneBeatContext) {
            const { useMatchedChapter, useMatchedSceneBeat, useCustomContext, customContextItems } = context.sceneBeatContext;

            if (useMatchedChapter && context.chapterMatchedEntries && context.chapterMatchedEntries.size > 0) {
                context.chapterMatchedEntries.forEach(entry => {
                    uniqueEntries.set(entry.id, entry);
                });
            }

            if (useMatchedSceneBeat && context.sceneBeatMatchedEntries && context.sceneBeatMatchedEntries.size > 0) {
                context.sceneBeatMatchedEntries.forEach(entry => {
                    uniqueEntries.set(entry.id, entry);
                });
            }

            if (useCustomContext && customContextItems && customContextItems.length > 0) {
                const lorebookStore = useLorebookStore.getState();
                if (lorebookStore.entries.length === 0 && context.storyId) {
                    await lorebookStore.loadEntries(context.storyId);
                }

                const customEntries = lorebookStore.entries.filter(entry =>
                    customContextItems.includes(entry.id)
                );

                customEntries.forEach(entry => {
                    uniqueEntries.set(entry.id, entry);
                });
            }
        }
        else if (context.matchedEntries && context.matchedEntries.size > 0) {
            context.matchedEntries.forEach(entry => {
                uniqueEntries.set(entry.id, entry);
            });
        }

        const sortedEntries = Array.from(uniqueEntries.values()).sort(
            (a, b) => {
                const importanceOrder = { 'major': 3, 'minor': 2, 'background': 1 };
                const aImportance = a.metadata?.importance || 'background';
                const bImportance = b.metadata?.importance || 'background';
                return importanceOrder[bImportance] - importanceOrder[aImportance];
            }
        );

        if (sortedEntries.length === 0) {
            return 'No lorebook entries are available for this prompt.';
        }

        return this.formatter.formatEntries(sortedEntries);
    }
}
