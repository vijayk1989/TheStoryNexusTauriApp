import { aiService } from '@/services/ai/AIService';
import { useLorebookStore } from '@/features/lorebook/stores/useLorebookStore';
import { useChapterStore } from '@/features/chapters/stores/useChapterStore';
import { useAIStore } from '@/features/ai/stores/useAIStore';
import { db } from '@/services/database';
import { PromptMessage, AllowedModel } from '@/types/story';

export interface TimelineEventResponse {
    name: string;
    description: string;
    participants: string[];
}

export const processTimelineJSON = async (
    storyId: string, 
    chapterId: string, 
    fullJsonResponse: string
): Promise<number> => {
    try {
        // 1. Get the chapter context
        const chapter = await db.chapters.get(chapterId);
        if (!chapter) throw new Error("Chapter not found");

        // 2. Clean the response (sometimes LLMs wrap in markdown anyway)
        const cleanedJson = fullJsonResponse.replace(/```json/gi, '').replace(/```/g, '').trim();

        // 3. Parse JSON
        let events: TimelineEventResponse[];
        try {
            events = JSON.parse(cleanedJson);
        } catch (e) {
            console.error("Failed to parse timeline JSON:", cleanedJson);
            throw new Error("AI returned invalid JSON formatting. Please edit the JSON to fix any syntax errors.");
        }

        if (!Array.isArray(events) || events.length === 0) {
            return 0; // No events found
        }

        // 4. Map participants to Lorebook IDs and create entries
        const lorebookStore = useLorebookStore.getState();
        if (lorebookStore.entries.length === 0) {
            await lorebookStore.loadEntries(storyId);
        }
        
        const allCharacters = lorebookStore.getAllCharacters();
        let createdCount = 0;

        for (const event of events) {
            const participantIds: string[] = [];
            
            // Map character names to IDs
            if (Array.isArray(event.participants)) {
                for (const name of event.participants) {
                    const normalizedName = name.toLowerCase().trim();
                    const character = allCharacters.find(c => 
                        c.name.toLowerCase() === normalizedName || 
                        c.tags.some(t => t.toLowerCase() === normalizedName)
                    );
                    
                    if (character) {
                        participantIds.push(character.id);
                    }
                }
            }

            // Create the new timeline entry
            await lorebookStore.createEntry({
                storyId,
                name: event.name,
                description: event.description,
                category: "timeline",
                tags: [], // Keep tags empty to avoid editor autocomplete pollution
                metadata: {
                    chapterOrder: chapter.order,
                    participantIds: participantIds
                }
            });
            
            createdCount++;
        }

        return createdCount;

    } catch (error) {
        console.error("Error processing timeline events:", error);
        throw error;
    }
};
