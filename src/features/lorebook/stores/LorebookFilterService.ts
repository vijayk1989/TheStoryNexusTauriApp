import type { LorebookEntry } from '@/types/story';

export class LorebookFilterService {
    static getFilteredEntries(entries: LorebookEntry[], includeDisabled: boolean = false): LorebookEntry[] {
        return includeDisabled
            ? entries
            : entries.filter(entry => !entry.isDisabled);
    }

    static getFilteredEntriesByIds(entries: LorebookEntry[], ids: string[], includeDisabled: boolean = false): LorebookEntry[] {
        const filtered = this.getFilteredEntries(entries, includeDisabled);
        return filtered.filter(entry => ids.includes(entry.id));
    }

    static getEntriesByTag(entries: LorebookEntry[], tag: string): LorebookEntry[] {
        const normalizedTag = tag.toLowerCase();
        return this.getFilteredEntries(entries).filter(entry =>
            entry.tags.some(t => t.toLowerCase() === normalizedTag) ||
            entry.name.toLowerCase() === normalizedTag
        );
    }

    static getEntriesByCategory(entries: LorebookEntry[], category: LorebookEntry['category']): LorebookEntry[] {
        return this.getFilteredEntries(entries).filter(entry => entry.category === category);
    }

    static getAllCharacters(entries: LorebookEntry[]): LorebookEntry[] {
        return this.getEntriesByCategory(entries, 'character');
    }

    static getAllLocations(entries: LorebookEntry[]): LorebookEntry[] {
        return this.getEntriesByCategory(entries, 'location');
    }

    static getAllItems(entries: LorebookEntry[]): LorebookEntry[] {
        return this.getEntriesByCategory(entries, 'item');
    }

    static getAllEvents(entries: LorebookEntry[]): LorebookEntry[] {
        return this.getEntriesByCategory(entries, 'event');
    }

    static getAllNotes(entries: LorebookEntry[]): LorebookEntry[] {
        return this.getEntriesByCategory(entries, 'note');
    }

    static getAllSynopsis(entries: LorebookEntry[]): LorebookEntry[] {
        return this.getEntriesByCategory(entries, 'synopsis');
    }

    static getAllStartingScenarios(entries: LorebookEntry[]): LorebookEntry[] {
        return this.getEntriesByCategory(entries, 'starting scenario');
    }

    static getAllTimelines(entries: LorebookEntry[]): LorebookEntry[] {
        return this.getEntriesByCategory(entries, 'timeline');
    }

    static getAllEntries(entries: LorebookEntry[]): LorebookEntry[] {
        return this.getFilteredEntries(entries);
    }

    static getEntriesByImportance(entries: LorebookEntry[], importance: 'major' | 'minor' | 'background'): LorebookEntry[] {
        return this.getFilteredEntries(entries).filter(entry =>
            entry.metadata?.importance === importance
        );
    }

    static getEntriesByStatus(entries: LorebookEntry[], status: 'active' | 'inactive' | 'historical'): LorebookEntry[] {
        return this.getFilteredEntries(entries).filter(entry =>
            entry.metadata?.status === status
        );
    }

    static getEntriesByType(entries: LorebookEntry[], type: string): LorebookEntry[] {
        return this.getFilteredEntries(entries).filter(entry =>
            entry.metadata?.type?.toLowerCase() === type.toLowerCase()
        );
    }

    static getEntriesByRelationship(entries: LorebookEntry[], targetId: string): LorebookEntry[] {
        return this.getFilteredEntries(entries).filter(entry =>
            entry.metadata?.relationships?.some(rel =>
                rel.type === targetId || rel.description?.includes(targetId)
            )
        );
    }

    static getEntriesByCustomField(entries: LorebookEntry[], field: string, value: unknown): LorebookEntry[] {
        return this.getFilteredEntries(entries).filter(entry => {
            const metadata = entry.metadata as any;
            return metadata?.[field] === value;
        });
    }

    static buildTagMap(entries: LorebookEntry[]): Record<string, LorebookEntry> {
        const tagMap: Record<string, LorebookEntry> = {};

        entries.forEach(entry => {
            if (entry.isDisabled) return;

            const normalizedName = entry.name.toLowerCase().trim();
            tagMap[normalizedName] = entry;

            entry.tags.forEach(tag => {
                const normalizedTag = tag.toLowerCase().trim();
                tagMap[normalizedTag] = entry;

                if (!normalizedTag.includes(' ')) {
                    return;
                }

                const words = normalizedTag.split(' ');
                words.forEach(word => {
                    if (entry.tags.some(t => t.toLowerCase() === word)) {
                        tagMap[word] = entry;
                    }
                });
            });
        });

        return tagMap;
    }
}
