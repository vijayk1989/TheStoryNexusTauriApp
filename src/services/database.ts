import Dexie, { Table } from 'dexie';
import systemPrompts from '@/data/systemPrompts';
import {
    Story,
    Chapter,
    AIChat,
    Prompt,
    AISettings,
    LorebookEntry,
    Template,
    SceneBeat,
    Note,
    AgentPreset,
    PipelinePreset,
    PipelineExecution
} from '../types/story';

export class StoryDatabase extends Dexie {
    stories!: Table<Story>;
    chapters!: Table<Chapter>;
    aiChats!: Table<AIChat>;
    prompts!: Table<Prompt>;
    aiSettings!: Table<AISettings>;
    lorebookEntries!: Table<LorebookEntry>;
    templates!: Table<Template>;
    sceneBeats!: Table<SceneBeat>;
    notes!: Table<Note>;
    agentPresets!: Table<AgentPreset>;
    pipelinePresets!: Table<PipelinePreset>;
    pipelineExecutions!: Table<PipelineExecution>;

    constructor() {
        super('StoryDatabase');

        this.version(13).stores({
            stories: 'id, title, createdAt, language, isDemo',
            chapters: 'id, storyId, order, createdAt, isDemo',
            aiChats: 'id, storyId, createdAt, isDemo',
            prompts: 'id, name, promptType, storyId, createdAt, isSystem',
            templates: 'id, name, templateType, storyId, createdAt, isSystem',
            aiSettings: 'id, lastModelsFetch',
            lorebookEntries: 'id, storyId, name, category, *tags, isDemo',
            sceneBeats: 'id, storyId, chapterId',
            notes: 'id, storyId, title, type, createdAt, updatedAt',
            agentPresets: 'id, name, role, storyId, createdAt, isSystem',
            pipelinePresets: 'id, name, storyId, createdAt, isSystem',
            pipelineExecutions: 'id, storyId, chapterId, pipelinePresetId, createdAt, status',
        });

        // Version 14: AgentPreset now has contextConfig field (no schema index change needed)
        this.version(14).stores({
            stories: 'id, title, createdAt, language, isDemo',
            chapters: 'id, storyId, order, createdAt, isDemo',
            aiChats: 'id, storyId, createdAt, isDemo',
            prompts: 'id, name, promptType, storyId, createdAt, isSystem',
            templates: 'id, name, templateType, storyId, createdAt, isSystem',
            aiSettings: 'id, lastModelsFetch',
            lorebookEntries: 'id, storyId, name, category, *tags, isDemo',
            sceneBeats: 'id, storyId, chapterId',
            notes: 'id, storyId, title, type, createdAt, updatedAt',
            agentPresets: 'id, name, role, storyId, createdAt, isSystem',
            pipelinePresets: 'id, name, storyId, createdAt, isSystem',
            pipelineExecutions: 'id, storyId, chapterId, pipelinePresetId, createdAt, status',
        });

        this.on('populate', async () => {
            console.log('Populating database with initial data...');

            // Add system prompts
            for (const promptData of systemPrompts) {
                await this.prompts.add({
                    ...promptData,
                    createdAt: new Date(),
                    isSystem: true
                } as Prompt);
            }

            console.log('Database successfully populated with initial data');
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

    // Helper methods for SceneBeats
    async getSceneBeatsByChapter(chapterId: string): Promise<SceneBeat[]> {
        return this.sceneBeats
            .where('chapterId')
            .equals(chapterId)
            .toArray();
    }

    async getSceneBeat(id: string): Promise<SceneBeat | undefined> {
        return this.sceneBeats.get(id);
    }

    async createSceneBeat(data: Omit<SceneBeat, 'id' | 'createdAt'>): Promise<string> {
        const id = crypto.randomUUID();
        await this.sceneBeats.add({
            id,
            createdAt: new Date(),
            ...data
        } as SceneBeat);
        return id;
    }

    async updateSceneBeat(id: string, data: Partial<SceneBeat>): Promise<void> {
        await this.sceneBeats.update(id, data);
    }

    async deleteSceneBeat(id: string): Promise<void> {
        await this.sceneBeats.delete(id);
    }

    /**
     * Deletes a story and all related data (chapters, lorebook entries, etc.)
     * @param storyId The ID of the story to delete
     * @returns Promise that resolves when the deletion is complete
     */
    async deleteStoryWithRelated(storyId: string): Promise<void> {
        return await this.transaction('rw',
            [this.stories, this.chapters, this.lorebookEntries, this.aiChats, this.sceneBeats],
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

                // Delete all related SceneBeats
                await this.sceneBeats
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