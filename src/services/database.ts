import Dexie, { Table } from 'dexie';
import systemPrompts from '@/data/systemPrompts';
import {
    Story,
    Chapter,
    AIChat,
    Prompt,
    AISettings,
    LorebookEntry,
    LoreBook,
    Template,
    SceneBeat,
    Draft,
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
    loreBooks!: Table<LoreBook>;
    lorebookEntries!: Table<LorebookEntry>;
    templates!: Table<Template>;
    sceneBeats!: Table<SceneBeat>;
    notes!: Table<Note>;
    agentPresets!: Table<AgentPreset>;
    pipelinePresets!: Table<PipelinePreset>;
    pipelineExecutions!: Table<PipelineExecution>;
    drafts!: Table<Draft>;

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

        // Version 15: Add drafts table for persisting AI-generated prose
        this.version(15).stores({
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
            drafts: 'id, storyId, chapterId, createdAt',
        });

        // Version 16: Add saveFilePath index to stories for optional file-based backup
        this.version(16).stores({
            stories: 'id, title, createdAt, language, isDemo, saveFilePath',
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
            drafts: 'id, storyId, chapterId, createdAt',
        });

        // Version 17: Add storyFormat and universeType to stories (no new indexes needed)
        this.version(17).stores({
            stories: 'id, title, createdAt, language, isDemo, saveFilePath',
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
            drafts: 'id, storyId, chapterId, createdAt',
        }).upgrade(async tx => {
            await tx.table('stories').toCollection().modify((story: Record<string, unknown>) => {
                if (!story.storyFormat) {
                    story.storyFormat = 'novel';
                }
            });
        });

        // Version 18: Introduce LoreBook as a first-class entity (shared lore books across stories).
        // - Add loreBooks table
        // - stories gains *lorebookIds multi-entry index for reverse lookup
        // - lorebookEntries switches from storyId to lorebookId
        // Migration: for each existing story, create a LoreBook named after it, migrate its entries.
        this.version(18).stores({
            stories: 'id, title, createdAt, language, isDemo, saveFilePath, *lorebookIds',
            chapters: 'id, storyId, order, createdAt, isDemo',
            aiChats: 'id, storyId, createdAt, isDemo',
            prompts: 'id, name, promptType, storyId, createdAt, isSystem',
            templates: 'id, name, templateType, storyId, createdAt, isSystem',
            aiSettings: 'id, lastModelsFetch',
            loreBooks: 'id, name, createdAt, isDemo',
            lorebookEntries: 'id, lorebookId, name, category, *tags, isDemo',
            sceneBeats: 'id, storyId, chapterId',
            notes: 'id, storyId, title, type, createdAt, updatedAt',
            agentPresets: 'id, name, role, storyId, createdAt, isSystem',
            pipelinePresets: 'id, name, storyId, createdAt, isSystem',
            pipelineExecutions: 'id, storyId, chapterId, pipelinePresetId, createdAt, status',
            drafts: 'id, storyId, chapterId, createdAt',
        }).upgrade(async tx => {
            const stories = await tx.table('stories').toArray();
            for (const story of stories) {
                const lorebookId = crypto.randomUUID();
                await tx.table('loreBooks').add({
                    id: lorebookId,
                    name: story.title,
                    createdAt: new Date(),
                    isDemo: story.isDemo,
                });
                await tx.table('lorebookEntries')
                    .filter((entry: Record<string, unknown>) => entry['storyId'] === story.id)
                    .modify((entry: Record<string, unknown>) => {
                        entry.lorebookId = lorebookId;
                        delete entry['storyId'];
                    });
                await tx.table('stories').update(story.id, {
                    lorebookIds: [lorebookId],
                });
            }
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

    // LoreBook helpers
    async createLoreBook(data: Omit<LoreBook, 'createdAt'>): Promise<string> {
        await this.loreBooks.add({
            ...data,
            createdAt: new Date(),
        });
        return data.id;
    }

    async getLoreBooksByStory(storyId: string): Promise<LoreBook[]> {
        const story = await this.stories.get(storyId);
        const ids = story?.lorebookIds ?? [];
        if (ids.length === 0) return [];
        return this.loreBooks.where('id').anyOf(ids).toArray();
    }

    /** All stories that list this lorebookId (uses *lorebookIds multi-entry index). */
    async getLoreBookReferences(lorebookId: string): Promise<Story[]> {
        return this.stories.where('lorebookIds').equals(lorebookId).toArray();
    }

    async getLorebookEntriesByLoreBooks(lorebookIds: string[]): Promise<LorebookEntry[]> {
        if (lorebookIds.length === 0) return [];
        return this.lorebookEntries.where('lorebookId').anyOf(lorebookIds).toArray();
    }

    async deleteLoreBookWithEntries(lorebookId: string): Promise<void> {
        await this.lorebookEntries.where('lorebookId').equals(lorebookId).delete();
        await this.loreBooks.delete(lorebookId);
    }

    // Lorebook entry helpers
    async getLorebookEntriesByLoreBook(lorebookId: string): Promise<LorebookEntry[]> {
        return this.lorebookEntries.where('lorebookId').equals(lorebookId).toArray();
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

    // Helper methods for Drafts
    async getDraftsByChapter(chapterId: string): Promise<Draft[]> {
        return this.drafts
            .where('chapterId')
            .equals(chapterId)
            .reverse()
            .sortBy('createdAt');
    }

    async createDraft(data: Omit<Draft, 'id' | 'createdAt'>): Promise<string> {
        const id = crypto.randomUUID();
        await this.drafts.add({
            id,
            createdAt: new Date(),
            ...data,
        } as Draft);
        return id;
    }

    async deleteDraft(id: string): Promise<void> {
        await this.drafts.delete(id);
    }

    /**
     * Deletes a story and all related data (chapters, scene beats, drafts, AI chats).
     * For lore books: only deletes a lore book and its entries if no other story references it.
     * Shared lore books are left intact.
     */
    async deleteStoryWithRelated(storyId: string): Promise<void> {
        return await this.transaction('rw',
            [this.stories, this.chapters, this.loreBooks, this.lorebookEntries, this.aiChats, this.sceneBeats, this.drafts],
            async () => {
                const story = await this.stories.get(storyId);
                const lorebookIds = story?.lorebookIds ?? [];

                // For each associated lore book, delete it only if this is the sole referencing story
                for (const lorebookId of lorebookIds) {
                    const refs = await this.stories.where('lorebookIds').equals(lorebookId).toArray();
                    if (refs.length <= 1) {
                        await this.lorebookEntries.where('lorebookId').equals(lorebookId).delete();
                        await this.loreBooks.delete(lorebookId);
                    }
                    // If shared (refs.length > 1), leave the book and its entries intact
                }

                await this.chapters.where('storyId').equals(storyId).delete();
                await this.aiChats.where('storyId').equals(storyId).delete();
                await this.sceneBeats.where('storyId').equals(storyId).delete();
                await this.drafts.where('storyId').equals(storyId).delete();
                await this.stories.delete(storyId);

                console.log(`Deleted story ${storyId} and all related data`);
            });
    }
}

export const db = new StoryDatabase(); 