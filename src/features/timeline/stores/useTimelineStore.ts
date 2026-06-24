import { create } from "zustand";
import { db } from "@/services/database";
import type { TimelineEvent } from "@/types/story";

type TimelineEventInput = Omit<TimelineEvent, "id" | "createdAt" | "updatedAt">;

interface TimelineState {
    events: TimelineEvent[];
    isLoading: boolean;
    error: string | null;
    loadEvents: (storyId: string) => Promise<void>;
    createEvent: (event: TimelineEventInput) => Promise<string>;
    updateEvent: (id: string, data: Partial<TimelineEvent>) => Promise<void>;
    deleteEvent: (id: string) => Promise<void>;
    reorderEvent: (id: string, direction: "up" | "down") => Promise<void>;
    getEventsForStory: (storyId: string) => TimelineEvent[];
    getEventsForChapter: (chapterId: string) => TimelineEvent[];
    getEventsUpToChapter: (storyId: string, chapterOrder?: number) => TimelineEvent[];
    getEventsByParticipant: (participantId: string) => TimelineEvent[];
}

function sortTimelineEvents(events: TimelineEvent[]): TimelineEvent[] {
    return [...events].sort((a, b) => {
        const chapterA = a.chapterOrder ?? Number.MAX_SAFE_INTEGER;
        const chapterB = b.chapterOrder ?? Number.MAX_SAFE_INTEGER;
        if (chapterA !== chapterB) return chapterA - chapterB;
        if (a.eventOrder !== b.eventOrder) return a.eventOrder - b.eventOrder;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
}

async function getNextEventOrder(storyId: string, chapterId?: string): Promise<number> {
    const storyEvents = await db.timelineEvents.where("storyId").equals(storyId).toArray();
    const siblingEvents = storyEvents.filter((event) => event.chapterId === chapterId);
    if (siblingEvents.length === 0) return 1;
    return Math.max(...siblingEvents.map((event) => event.eventOrder || 0)) + 1;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
    events: [],
    isLoading: false,
    error: null,

    loadEvents: async (storyId: string) => {
        set({ isLoading: true, error: null });
        try {
            const events = await db.timelineEvents.where("storyId").equals(storyId).toArray();
            set({ events: sortTimelineEvents(events), isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            throw error;
        }
    },

    createEvent: async (eventData) => {
        try {
            const id = crypto.randomUUID();
            const now = new Date();
            const newEvent: TimelineEvent = {
                ...eventData,
                id,
                eventOrder: eventData.eventOrder || await getNextEventOrder(eventData.storyId, eventData.chapterId),
                participantIds: eventData.participantIds || [],
                unresolvedParticipants: eventData.unresolvedParticipants || [],
                relatedLorebookEntryIds: eventData.relatedLorebookEntryIds || [],
                createdAt: now,
                updatedAt: now,
                isDisabled: eventData.isDisabled ?? false,
            };

            await db.timelineEvents.add(newEvent);
            set((state) => ({ events: sortTimelineEvents([...state.events, newEvent]) }));
            return id;
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    updateEvent: async (id, data) => {
        try {
            const existing = get().events.find((event) => event.id === id) || await db.timelineEvents.get(id);
            if (!existing) throw new Error("Timeline event not found");

            const updatedEvent: TimelineEvent = {
                ...existing,
                ...data,
                updatedAt: new Date(),
            };

            await db.timelineEvents.put(updatedEvent);
            set((state) => ({
                events: sortTimelineEvents(state.events.map((event) => event.id === id ? updatedEvent : event)),
            }));
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    deleteEvent: async (id) => {
        try {
            await db.timelineEvents.delete(id);
            set((state) => ({ events: state.events.filter((event) => event.id !== id) }));
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    reorderEvent: async (id, direction) => {
        const event = get().events.find((candidate) => candidate.id === id);
        if (!event) return;

        const siblings = get().events
            .filter((candidate) => candidate.storyId === event.storyId && candidate.chapterId === event.chapterId)
            .sort((a, b) => a.eventOrder - b.eventOrder);
        const index = siblings.findIndex((candidate) => candidate.id === id);
        const swapIndex = direction === "up" ? index - 1 : index + 1;
        const swapEvent = siblings[swapIndex];
        if (!swapEvent) return;

        await db.transaction("rw", db.timelineEvents, async () => {
            await db.timelineEvents.update(event.id, { eventOrder: swapEvent.eventOrder, updatedAt: new Date() });
            await db.timelineEvents.update(swapEvent.id, { eventOrder: event.eventOrder, updatedAt: new Date() });
        });

        await get().loadEvents(event.storyId);
    },

    getEventsForStory: (storyId) => {
        return sortTimelineEvents(get().events.filter((event) => event.storyId === storyId && !event.isDisabled));
    },

    getEventsForChapter: (chapterId) => {
        return sortTimelineEvents(get().events.filter((event) => event.chapterId === chapterId && !event.isDisabled));
    },

    getEventsUpToChapter: (storyId, chapterOrder) => {
        return sortTimelineEvents(
            get().events.filter((event) => {
                if (event.storyId !== storyId || event.isDisabled) return false;
                if (chapterOrder === undefined || event.chapterOrder === undefined) return true;
                return event.chapterOrder <= chapterOrder;
            })
        );
    },

    getEventsByParticipant: (participantId) => {
        return sortTimelineEvents(
            get().events.filter((event) => !event.isDisabled && event.participantIds.includes(participantId))
        );
    },
}));
