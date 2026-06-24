import { useLorebookStore } from '@/features/lorebook/stores/useLorebookStore';
import { useTimelineStore } from '@/features/timeline/stores/useTimelineStore';
import { db } from '@/services/database';
import type { LorebookEntry } from '@/types/story';

export interface TimelineEventResponse {
    title?: string;
    name?: string;
    summary?: string;
    description?: string;
    participants?: string[];
    location?: string;
    timeLabel?: string;
    eventOrder?: number;
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

        // 4. Map participants to Lorebook IDs and create timeline events
        const lorebookStore = useLorebookStore.getState();
        await lorebookStore.loadEntries(storyId);
        
        const allEntries = useLorebookStore.getState().entries.filter(entry => entry.storyId === storyId);
        const allCharacters = allEntries.filter(entry => entry.category === "character" && !entry.isDisabled);
        const allLocations = allEntries.filter(entry => entry.category === "location" && !entry.isDisabled);
        const timelineStore = useTimelineStore.getState();
        const existingChapterEvents = await db.timelineEvents
            .where("storyId")
            .equals(storyId)
            .toArray();
        const chapterEventCount = existingChapterEvents.filter((event) => event.chapterId === chapterId).length;
        let createdCount = 0;

        for (const [index, event] of events.entries()) {
            const title = (event.title || event.name || "").trim();
            const summary = (event.summary || event.description || "").trim();
            if (!title || !summary) continue;

            const { matchedIds: participantIds, unresolvedNames } = resolveLorebookNames(event.participants || [], allCharacters);
            const location = event.location?.trim();
            const locationEntry = location ? resolveSingleLorebookName(location, allLocations) : undefined;

            await timelineStore.createEvent({
                storyId,
                chapterId,
                chapterOrder: chapter.order,
                eventOrder: typeof event.eventOrder === "number" && Number.isFinite(event.eventOrder)
                    ? event.eventOrder
                    : chapterEventCount + index + 1,
                title,
                summary,
                participantIds,
                unresolvedParticipants: unresolvedNames,
                relatedLorebookEntryIds: participantIds,
                locationId: locationEntry?.id,
                timeLabel: event.timeLabel?.trim(),
                source: "extracted",
            });
            
            createdCount++;
        }

        return createdCount;

    } catch (error) {
        console.error("Error processing timeline events:", error);
        throw error;
    }
};

function resolveLorebookNames(names: string[], entries: LorebookEntry[]): { matchedIds: string[]; unresolvedNames: string[] } {
    const matchedIds: string[] = [];
    const unresolvedNames: string[] = [];
    const seen = new Set<string>();

    for (const rawName of names) {
        const name = String(rawName).trim();
        if (!name) continue;

        const entry = resolveSingleLorebookName(name, entries);
        if (entry) {
            if (!seen.has(entry.id)) {
                matchedIds.push(entry.id);
                seen.add(entry.id);
            }
        } else if (!unresolvedNames.some((value) => value.toLowerCase() === name.toLowerCase())) {
            unresolvedNames.push(name);
        }
    }

    return { matchedIds, unresolvedNames };
}

function resolveSingleLorebookName(name: string, entries: LorebookEntry[]): LorebookEntry | undefined {
    const normalizedName = name.toLowerCase().trim();
    return entries.find(entry =>
        entry.name.toLowerCase() === normalizedName ||
        entry.aliases.some(alias => alias.toLowerCase() === normalizedName)
    );
}
