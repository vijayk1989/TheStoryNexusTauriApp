import { db } from './database';
import {
    Chapter,
    LorebookEntry,
    Prompt,
} from '../types/story';
import demoStory from '../data/demoStory';
import systemPrompts from '../data/systemPrompts';

export class DatabaseSeeder {
    private static instance: DatabaseSeeder;
    private static isInitialized = false;

    private constructor() { }

    public static getInstance(): DatabaseSeeder {
        if (!DatabaseSeeder.instance) {
            DatabaseSeeder.instance = new DatabaseSeeder();
        }
        return DatabaseSeeder.instance;
    }

    /**
     * Initialize the database with seed data
     */
    public async initialize(): Promise<void> {
        // Only run once per app lifecycle
        if (DatabaseSeeder.isInitialized) {
            console.log('Database already initialized in this session.');
            return;
        }

        try {
            console.log('Initializing database with seed data...');

            // Check if we need to seed
            const needsSeeding = await this.checkIfSeedingNeeded();

            if (needsSeeding) {
                // Seed system prompts with fixed IDs
                await this.seedSystemPrompts();

                // Seed demo story with fixed IDs
                await this.seedDemoStory();

                console.log('Database seeding complete.');
            } else {
                console.log('Database already contains seed data. Skipping seeding.');
            }

            DatabaseSeeder.isInitialized = true;
        } catch (error) {
            console.error('Error initializing database:', error);
            throw error;
        }
    }

    /**
     * Check if seeding is needed by looking for demo story and system prompts
     */
    private async checkIfSeedingNeeded(): Promise<boolean> {
        // Check for demo story
        const demoStoryExists = await db.stories
            .where('isDemo')
            .equals(1)
            .count() > 0;

        // Check for system prompts
        const systemPromptsExist = await db.prompts
            .where('isSystem')
            .equals(1)
            .count() > 0;

        // Need to seed if either demo story or system prompts are missing
        return !demoStoryExists || !systemPromptsExist;
    }

    /**
     * Seed system prompts
     */
    private async seedSystemPrompts(): Promise<void> {
        console.log('Seeding system prompts...');

        for (const promptData of systemPrompts) {
            // Skip if this prompt already exists
            const exists = await db.prompts.get(promptData.id!);
            if (exists) continue;

            console.log(`Adding system prompt: ${promptData.name}`);

            // Add the prompt
            await db.prompts.add({
                ...promptData,
                createdAt: new Date()
            } as Prompt);
        }
    }

    /**
     * Seed demo story
     */
    private async seedDemoStory(): Promise<void> {
        console.log('Seeding demo story...');

        // Skip if demo story already exists
        const exists = await db.stories.get(demoStory.id);
        if (exists) return;

        console.log(`Creating demo story: ${demoStory.title}`);

        // Create the story
        await db.createNewStory({
            id: demoStory.id,
            title: demoStory.title,
            author: demoStory.author,
            language: demoStory.language,
            synopsis: demoStory.synopsis,
            isDemo: true
        });

        // Seed chapters
        if (demoStory.chapters && demoStory.chapters.length > 0) {
            for (const chapterData of demoStory.chapters) {
                console.log(`Adding chapter: ${chapterData.title}`);

                // Content is already formatted for Lexical editor in demoStory.ts
                const content = chapterData.content || '{"root":{"children":[{"children":[],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';

                // Add the chapter
                await db.chapters.add({
                    id: chapterData.id,
                    storyId: demoStory.id,
                    title: chapterData.title,
                    summary: chapterData.summary || '',
                    order: demoStory.chapters.indexOf(chapterData) + 1,
                    content: content,
                    wordCount: chapterData.content ? JSON.parse(content).root.children.reduce((count, paragraph) => {
                        return count + (paragraph.children.reduce((textCount, child) => {
                            return textCount + (child.text ? child.text.split(/\s+/).length : 0);
                        }, 0));
                    }, 0) : 0,
                    createdAt: new Date(),
                    povCharacter: chapterData.povCharacter,
                    povType: chapterData.povType || 'Third Person Omniscient',
                    isDemo: true
                } as Chapter);
            }
        }

        // Seed lorebook entries
        if (demoStory.lorebookEntries && demoStory.lorebookEntries.length > 0) {
            for (const entryData of demoStory.lorebookEntries) {
                console.log(`Adding lorebook entry: ${entryData.name}`);

                // Add the entry
                await db.lorebookEntries.add({
                    id: entryData.id,
                    storyId: demoStory.id,
                    name: entryData.name,
                    description: entryData.description,
                    category: entryData.category,
                    tags: entryData.tags || [],
                    metadata: entryData.metadata,
                    createdAt: new Date(),
                    isDemo: true
                } as LorebookEntry);
            }
        }
    }
}

// Export singleton instance
export const dbSeeder = DatabaseSeeder.getInstance();