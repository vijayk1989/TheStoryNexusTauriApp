import { db } from './database';
import type { Story, Chapter, LorebookEntry, SceneBeat, AIChat } from '@/types/story';
import { toast } from 'react-toastify';
import { saveTextAsFile } from '@/utils/fileDownload';

interface StoryExport {
    version: string;
    type: 'story';
    exportDate: string;
    story: Story;
    chapters: Chapter[];
    lorebookEntries: LorebookEntry[];
    sceneBeats: SceneBeat[];
    aiChats: AIChat[];
}

export const storyExportService = {
    /**
     * Export a complete story with all related data
     */
    exportStory: async (storyId: string): Promise<boolean> => {
        try {
            // Fetch the story and all related data
            const story = await db.stories.get(storyId);
            if (!story) {
                throw new Error('Story not found');
            }

            const chapters = await db.chapters.where('storyId').equals(storyId).toArray();
            const lorebookEntries = await db.lorebookEntries.where('storyId').equals(storyId).toArray();
            const sceneBeats = await db.sceneBeats.where('storyId').equals(storyId).toArray();
            const aiChats = await db.aiChats.where('storyId').equals(storyId).toArray();

            // Create the export object
            const exportData: StoryExport = {
                version: '1.0',
                type: 'story',
                exportDate: new Date().toISOString(),
                story,
                chapters,
                lorebookEntries,
                sceneBeats,
                aiChats
            };

            // Convert to JSON and trigger download
            const dataStr = JSON.stringify(exportData, null, 2);
            const exportName = `story-${story.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
            const isSaved = await saveTextAsFile(dataStr, exportName, 'application/json');
            if (!isSaved) {
                return false;
            }

            toast.success(`Story "${story.title}" exported successfully`);
            return true;
        } catch (error) {
            console.error('Story export failed:', error);
            toast.error(`Export failed: ${(error as Error).message}`);
            throw error;
        }
    },

    /**
     * Import a complete story with all related data
     * Returns the ID of the newly imported story
     */
    importStory: async (jsonData: string): Promise<string> => {
        try {
            const data = JSON.parse(jsonData) as StoryExport;

            // Validate the data format
            if (!data.type || data.type !== 'story' || !data.story) {
                throw new Error('Invalid story data format');
            }

            // Generate a new ID for the story
            const newStoryId = crypto.randomUUID();

            // Create ID mapping to update references
            const idMap = new Map<string, string>();
            idMap.set(data.story.id, newStoryId);

            // Create a new story with the new ID
            const newStory: Story = {
                ...data.story,
                id: newStoryId,
                createdAt: new Date(),
                title: `${data.story.title} (Imported)`
            };

            // Start a transaction to ensure all-or-nothing import
            await db.transaction('rw',
                [db.stories, db.chapters, db.lorebookEntries, db.sceneBeats, db.aiChats],
                async () => {
                    // Add the story
                    await db.stories.add(newStory);

                    // Add chapters with updated IDs and references
                    for (const chapter of data.chapters) {
                        const newChapterId = crypto.randomUUID();
                        idMap.set(chapter.id, newChapterId);

                        await db.chapters.add({
                            ...chapter,
                            id: newChapterId,
                            storyId: newStoryId,
                            createdAt: new Date()
                        });
                    }

                    // Add lorebook entries with updated IDs and references
                    for (const entry of data.lorebookEntries) {
                        const newEntryId = crypto.randomUUID();
                        idMap.set(entry.id, newEntryId);

                        await db.lorebookEntries.add({
                            ...entry,
                            id: newEntryId,
                            storyId: newStoryId,
                            createdAt: new Date()
                        });
                    }

                    // Add scene beats with updated IDs and references
                    for (const sceneBeat of data.sceneBeats) {
                        const newSceneBeatId = crypto.randomUUID();

                        await db.sceneBeats.add({
                            ...sceneBeat,
                            id: newSceneBeatId,
                            storyId: newStoryId,
                            chapterId: idMap.get(sceneBeat.chapterId) || sceneBeat.chapterId,
                            createdAt: new Date()
                        });
                    }

                    // Add AI chats with updated IDs and references
                    for (const chat of data.aiChats) {
                        const newChatId = crypto.randomUUID();

                        await db.aiChats.add({
                            ...chat,
                            id: newChatId,
                            storyId: newStoryId,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });
                    }
                }
            );

            toast.success(`Story "${newStory.title}" imported successfully`);
            return newStoryId;
        } catch (error) {
            console.error('Story import failed:', error);
            toast.error(`Import failed: ${(error as Error).message}`);
            throw error;
        }
    }
}; 
