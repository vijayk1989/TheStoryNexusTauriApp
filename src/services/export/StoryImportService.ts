import { db } from '../database';
import type { Story, StoryExport } from '@/types/story';

export class StoryImportService {
    async importStory(data: StoryExport): Promise<string> {
        if (!data.type || data.type !== 'story' || !data.story) {
            throw new Error('Invalid story data format');
        }

        const newStoryId = crypto.randomUUID();
        const idMap = new Map<string, string>();
        idMap.set(data.story.id, newStoryId);

        const newStory: Story = {
            ...data.story,
            id: newStoryId,
            createdAt: new Date(),
            title: `${data.story.title} (Imported)`
        };

        await db.transaction('rw',
            [db.stories, db.chapters, db.lorebookEntries, db.sceneBeats, db.aiChats],
            async () => {
                await db.stories.add(newStory);

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

        return newStoryId;
    }
}
