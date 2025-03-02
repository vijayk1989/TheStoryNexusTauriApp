import Dexie, { Table } from 'dexie';
import {
    Story,
    Chapter,
    AIChat,
    Prompt,
    AISettings,
    LorebookEntry
} from '../types/story';

export class StoryDatabase extends Dexie {
    stories!: Table<Story>;
    chapters!: Table<Chapter>;
    aiChats!: Table<AIChat>;
    prompts!: Table<Prompt>;
    aiSettings!: Table<AISettings>;
    lorebookEntries!: Table<LorebookEntry>;

    constructor() {
        super('StoryDatabase');

        this.version(6).stores({
            stories: 'id, title, createdAt, language, isDemo',
            chapters: 'id, storyId, order, createdAt, isDemo',
            aiChats: 'id, storyId, createdAt, isDemo',
            prompts: 'id, name, promptType, storyId, createdAt, isSystem',
            aiSettings: 'id, lastModelsFetch',
            lorebookEntries: 'id, storyId, name, category, *tags, isDemo',
        });
    }

    // Helper method to create a new story with initial structure
    async createNewStory(storyData: Omit<Story, 'createdAt'>): Promise<string> {
        return await this.transaction('rw',
            [this.stories],
            async () => {
                const storyId = storyData.id || crypto.randomUUID();

                // Create the story
                await this.stories.add({
                    id: storyId,
                    createdAt: new Date(),
                    ...storyData
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

        return {
            ...story,
            chapters
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

    /**
     * Deletes a story and all related data (chapters, lorebook entries, etc.)
     * @param storyId The ID of the story to delete
     * @returns Promise that resolves when the deletion is complete
     */
    async deleteStoryWithRelated(storyId: string): Promise<void> {
        return await this.transaction('rw',
            [this.stories, this.chapters, this.lorebookEntries, this.aiChats],
            async () => {
                // Delete all related chapters
                await this.chapters
                    .where('storyId')
                    .equals(storyId)
                    .delete();

                // Delete all related lorebook entries
                await this.lorebookEntries
                    .where('storyId')
                    .equals(storyId)
                    .delete();

                // Delete all related AI chats
                await this.aiChats
                    .where('storyId')
                    .equals(storyId)
                    .delete();

                // Finally delete the story itself
                await this.stories.delete(storyId);

                console.log(`Deleted story ${storyId} and all related data`);
            });
    }
}

export const db = new StoryDatabase(); 