import { db } from './database';
import {
    Prompt,
} from '../types/story';
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
     * @param forceReseed If true, will reseed system prompts even if they already exist
     */
    public async initialize(forceReseed = false): Promise<void> {
        // Only run once per app lifecycle unless forceReseed is true
        if (DatabaseSeeder.isInitialized && !forceReseed) {
            console.log('Database already initialized in this session.');
            return;
        }

        try {
            console.log('Initializing database with seed data...');

            // Check if we need to seed
            const needsSeeding = await this.checkIfSeedingNeeded();

            if (needsSeeding || forceReseed) {
                // Seed system prompts with fixed IDs
                await this.seedSystemPrompts(forceReseed);

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
     * Force a reseed of system prompts
     */
    public async forceReseedSystemPrompts(): Promise<void> {
        console.log('Force reseeding system prompts...');
        await this.seedSystemPrompts(true);
        console.log('System prompts reseeded successfully.');
    }

    /**
     * Check if seeding is needed by looking for system prompts
     */
    private async checkIfSeedingNeeded(): Promise<boolean> {
        // Get all system prompt IDs from the systemPrompts data
        const systemPromptIds = systemPrompts.map(prompt => prompt.id);

        // Check if all system prompts exist in the database
        for (const promptId of systemPromptIds) {
            const exists = await db.prompts.get(promptId);
            if (!exists) {
                console.log(`System prompt with ID ${promptId} not found. Seeding needed.`);
                return true;
            }
        }

        return false;
    }

    /**
     * Seed system prompts
     * @param forceReseed If true, will replace existing prompts with the same ID
     */
    private async seedSystemPrompts(forceReseed = false): Promise<void> {
        console.log('Seeding system prompts...');

        if (forceReseed) {
            // Clear all existing system prompts when force reseeding
            console.log('Force reseeding - clearing all existing system prompts...');
            const systemPromptCount = await db.prompts.where('isSystem').equals(1).count();
            if (systemPromptCount > 0) {
                await db.prompts.where('isSystem').equals(1).delete();
                console.log(`Deleted ${systemPromptCount} existing system prompts.`);
            }
        }

        for (const promptData of systemPrompts) {
            // Check if this prompt already exists
            const exists = await db.prompts.get(promptData.id!);

            if (exists && !forceReseed) {
                console.log(`System prompt ${promptData.name} already exists. Skipping.`);
                continue;
            }

            if (exists && forceReseed) {
                console.log(`Replacing system prompt: ${promptData.name}`);
                await db.prompts.update(promptData.id!, {
                    ...promptData,
                    createdAt: exists.createdAt // Keep the original creation date
                });
            } else {
                console.log(`Adding system prompt: ${promptData.name}`);
                await db.prompts.add({
                    ...promptData,
                    createdAt: new Date()
                } as Prompt);
            }
        }
    }
}

// Export singleton instance
export const dbSeeder = DatabaseSeeder.getInstance();