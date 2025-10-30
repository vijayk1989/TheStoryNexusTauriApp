import { db } from '../database';
import type { StoryExport } from '@/types/story';

export class StoryExportService {
    async exportStory(storyId: string): Promise<StoryExport> {
        const story = await db.stories.get(storyId);
        if (!story) {
            throw new Error('Story not found');
        }

        const chapters = await db.chapters.where('storyId').equals(storyId).toArray();
        const lorebookEntries = await db.lorebookEntries.where('storyId').equals(storyId).toArray();
        const sceneBeats = await db.sceneBeats.where('storyId').equals(storyId).toArray();
        const aiChats = await db.aiChats.where('storyId').equals(storyId).toArray();

        return {
            version: '1.0',
            type: 'story',
            exportDate: new Date().toISOString(),
            story,
            chapters,
            lorebookEntries,
            sceneBeats,
            aiChats
        };
    }
}
