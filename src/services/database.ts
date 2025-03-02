import Dexie, { Table } from 'dexie';
import {
    Story,
    Chapter,
    WorldData,
    WorldDataEntry,
    AIChat,
    Prompt,
    AISettings,
    LorebookEntry
} from '../types/story';

export class StoryDatabase extends Dexie {
    stories!: Table<Story>;
    chapters!: Table<Chapter>;
    worldData!: Table<WorldData>;
    worldDataEntries!: Table<WorldDataEntry>;
    aiChats!: Table<AIChat>;
    prompts!: Table<Prompt>;
    aiSettings!: Table<AISettings>;
    lorebookEntries!: Table<LorebookEntry>;

    constructor() {
        super('StoryDatabase');

        this.version(3).stores({
            stories: 'id, title, createdAt, language',
            chapters: 'id, storyId, order, createdAt',
            worldData: 'id, storyId, createdAt',
            worldDataEntries: 'id, worldDataId, type, *tags',
            aiChats: 'id, storyId, createdAt',
            prompts: 'id, name, promptType, storyId, createdAt',
            aiSettings: 'id, lastModelsFetch',
            lorebookEntries: 'id, storyId, name, category, *tags',
        });
    }

    // Helper method to create a new story with initial structure
    async createNewStory(storyData: Omit<Story, 'id' | 'createdAt'>): Promise<string> {
        return await this.transaction('rw',
            [this.stories, this.worldData],
            async () => {
                const storyId = crypto.randomUUID();

                // Create the story
                await this.stories.add({
                    id: storyId,
                    createdAt: new Date(),
                    ...storyData
                });

                // Create initial world data
                await this.worldData.add({
                    id: crypto.randomUUID(),
                    storyId,
                    name: 'Story World',
                    createdAt: new Date()
                });

                return storyId;
            });
    }

    // Helper method to get complete story structure
    async getFullStory(storyId: string) {
        const story = await this.stories.get(storyId);
        if (!story) return null;

        const chapters = await this.chapters
            .where('storyId')
            .equals(storyId)
            .sortBy('order');

        const worldData = await this.worldData
            .where('storyId')
            .equals(storyId)
            .first();

        const worldDataEntries = worldData
            ? await this.worldDataEntries
                .where('worldDataId')
                .equals(worldData.id)
                .toArray()
            : [];

        return {
            ...story,
            chapters,
            worldBuilding: worldData ? {
                ...worldData,
                entries: worldDataEntries
            } : null
        };
    }

    // Add helper method for lorebook entries
    async getLorebookEntriesByStory(storyId: string) {
        return await this.lorebookEntries
            .where('storyId')
            .equals(storyId)
            .toArray();
    }

    async getLorebookEntriesByTag(storyId: string, tag: string) {
        return await this.lorebookEntries
            .where(['storyId', 'tags'])
            .equals([storyId, tag])
            .toArray();
    }

    async getLorebookEntriesByCategory(storyId: string, category: LorebookEntry['category']) {
        return await this.lorebookEntries
            .where(['storyId', 'category'])
            .equals([storyId, category])
            .toArray();
    }
}

export const db = new StoryDatabase(); 