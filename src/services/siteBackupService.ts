import { db } from "@/services/database";
import { clearLastEditorTarget } from "@/features/editor/utils/lastEditorTarget";
import { normalizeLorebookEntry } from "@/features/lorebook/utils/lorebookEntryNormalization";
import type {
    AgentPreset,
    AIChat,
    Chapter,
    Draft,
    LorebookEntry,
    Note,
    PipelineExecution,
    PipelinePreset,
    Prompt,
    SceneBeat,
    Story,
    Template,
    TimelineEvent,
} from "@/types/story";

const SITE_BACKUP_TYPE = "story-nexus-site-backup";
const SITE_BACKUP_VERSION = "1.0";

interface SiteBackupData {
    stories: Story[];
    chapters: Chapter[];
    lorebookEntries: LorebookEntry[];
    timelineEvents: TimelineEvent[];
    sceneBeats: SceneBeat[];
    drafts: Draft[];
    aiChats: AIChat[];
    notes: Note[];
    prompts: Prompt[];
    templates?: Template[];
    agentPresets: AgentPreset[];
    pipelinePresets: PipelinePreset[];
    pipelineExecutions: PipelineExecution[];
}

export interface SiteBackupFile {
    version: string;
    type: typeof SITE_BACKUP_TYPE;
    exportDate: string;
    data: SiteBackupData;
}

export interface SiteBackupSummary {
    stories: number;
    chapters: number;
    lorebookEntries: number;
    timelineEvents: number;
    sceneBeats: number;
    drafts: number;
    aiChats: number;
    notes: number;
    prompts: number;
    agentPresets: number;
    pipelinePresets: number;
    pipelineExecutions: number;
    skippedImages: number;
}

export interface SiteBackupImportResult extends SiteBackupSummary {
    importedStoryIds: string[];
    warnings: string[];
}

export async function createSiteBackupPayload(): Promise<{ backup: SiteBackupFile; summary: SiteBackupSummary }> {
    const data: SiteBackupData = {
        stories: await db.stories.toArray(),
        chapters: await db.chapters.toArray(),
        lorebookEntries: (await db.lorebookEntries.toArray()).map(normalizeLorebookEntry),
        timelineEvents: await db.timelineEvents.toArray(),
        sceneBeats: await db.sceneBeats.toArray(),
        drafts: await db.drafts.toArray(),
        aiChats: await db.aiChats.toArray(),
        notes: await db.notes.toArray(),
        prompts: (await db.prompts.toArray()).filter((prompt) => !prompt.isSystem),
        templates: (await db.templates.toArray()).filter((template) => !template.isSystem),
        agentPresets: await db.agentPresets.toArray(),
        pipelinePresets: (await db.pipelinePresets.toArray()).filter((pipeline) => !pipeline.isSystem),
        pipelineExecutions: await db.pipelineExecutions.toArray(),
    };
    const skippedImages = await db.mediaAssets.count();

    return {
        backup: {
            version: SITE_BACKUP_VERSION,
            type: SITE_BACKUP_TYPE,
            exportDate: new Date().toISOString(),
            data,
        },
        summary: summarize(data, skippedImages),
    };
}

export const siteBackupService = {
    exportSiteBackup: async (): Promise<SiteBackupSummary> => {
        const { backup, summary } = await createSiteBackupPayload();

        downloadJson(
            backup,
            `story-nexus-site-backup-${new Date().toISOString().slice(0, 10)}.json`
        );

        return summary;
    },

    importSiteBackup: async (jsonData: string): Promise<SiteBackupImportResult> => {
        const backup = parseBackup(jsonData);
        const warnings: string[] = [];
        const importedStoryIds: string[] = [];
        const sourceData = backup.data;

        const storyIdMap = new Map<string, string>();
        const chapterIdMap = new Map<string, string>();
        const lorebookIdMap = new Map<string, string>();
        const timelineEventIdMap = new Map<string, string>();
        const promptIdMap = new Map<string, string>();
        const templateIdMap = new Map<string, string>();
        const agentIdMap = new Map<string, string>();
        const pipelineIdMap = new Map<string, string>();

        const storyNames = new Set((await db.stories.toArray()).map((story) => story.title));
        const promptNames = new Set((await db.prompts.toArray()).map((prompt) => prompt.name));
        const templateNames = new Set((await db.templates.toArray()).map((template) => template.name));
        const agentNames = new Set((await db.agentPresets.toArray()).map((agent) => agent.name));
        const pipelineNames = new Set((await db.pipelinePresets.toArray()).map((pipeline) => pipeline.name));
        const existingSystemAgents = await db.agentPresets.filter((agent) => agent.isSystem === true).toArray();

        for (const story of sourceData.stories || []) {
            storyIdMap.set(story.id, crypto.randomUUID());
        }
        for (const chapter of sourceData.chapters || []) {
            chapterIdMap.set(chapter.id, crypto.randomUUID());
        }
        for (const entry of sourceData.lorebookEntries || []) {
            lorebookIdMap.set(entry.id, crypto.randomUUID());
        }
        for (const event of sourceData.timelineEvents || []) {
            timelineEventIdMap.set(event.id, crypto.randomUUID());
        }
        for (const prompt of sourceData.prompts || []) {
            if (!prompt.isSystem) promptIdMap.set(prompt.id, crypto.randomUUID());
        }
        for (const template of sourceData.templates || []) {
            if (!template.isSystem) templateIdMap.set(template.id, crypto.randomUUID());
        }
        for (const agent of sourceData.agentPresets || []) {
            if (agent.isSystem) {
                const localSystemAgent = existingSystemAgents.find(
                    (candidate) => candidate.name === agent.name && candidate.role === agent.role
                );
                if (localSystemAgent) {
                    agentIdMap.set(agent.id, localSystemAgent.id);
                }
            } else {
                agentIdMap.set(agent.id, crypto.randomUUID());
            }
        }
        for (const pipeline of sourceData.pipelinePresets || []) {
            if (!pipeline.isSystem) pipelineIdMap.set(pipeline.id, crypto.randomUUID());
        }

        const stories = (sourceData.stories || []).map((story): Story => ({
            ...story,
            id: storyIdMap.get(story.id)!,
            title: importedName(story.title, storyNames),
            createdAt: reviveDate(story.createdAt),
        }));
        importedStoryIds.push(...stories.map((story) => story.id));

        const chapters = (sourceData.chapters || [])
            .map((chapter): Chapter | null => {
                const storyId = storyIdMap.get(chapter.storyId);
                if (!storyId) return null;
                return reviveChapter({
                    ...chapter,
                    id: chapterIdMap.get(chapter.id)!,
                    storyId,
                });
            })
            .filter((chapter): chapter is Chapter => chapter !== null);

        const lorebookEntries = (sourceData.lorebookEntries || [])
            .map((entry): LorebookEntry | null => {
                const storyId = storyIdMap.get(entry.storyId);
                if (!storyId) return null;
                return reviveLorebookEntry({
                    ...entry,
                    id: lorebookIdMap.get(entry.id)!,
                    storyId,
                }, lorebookIdMap);
            })
            .filter((entry): entry is LorebookEntry => entry !== null);

        const timelineEvents = (sourceData.timelineEvents || [])
            .map((event): TimelineEvent | null => {
                const storyId = storyIdMap.get(event.storyId);
                if (!storyId) return null;
                return reviveTimelineEvent({
                    ...event,
                    id: timelineEventIdMap.get(event.id)!,
                    storyId,
                    chapterId: event.chapterId ? chapterIdMap.get(event.chapterId) : undefined,
                    participantIds: (event.participantIds || []).map((id) => lorebookIdMap.get(id) || id),
                    relatedLorebookEntryIds: (event.relatedLorebookEntryIds || []).map((id) => lorebookIdMap.get(id) || id),
                    locationId: event.locationId ? lorebookIdMap.get(event.locationId) || event.locationId : undefined,
                });
            })
            .filter((event): event is TimelineEvent => event !== null);

        const sceneBeats = (sourceData.sceneBeats || [])
            .map((sceneBeat): SceneBeat | null => {
                const storyId = storyIdMap.get(sceneBeat.storyId);
                const chapterId = chapterIdMap.get(sceneBeat.chapterId);
                if (!storyId || !chapterId) return null;
                return {
                    ...sceneBeat,
                    id: crypto.randomUUID(),
                    storyId,
                    chapterId,
                    createdAt: reviveDate(sceneBeat.createdAt),
                };
            })
            .filter((sceneBeat): sceneBeat is SceneBeat => sceneBeat !== null);

        const drafts = (sourceData.drafts || [])
            .map((draft): Draft | null => {
                const storyId = storyIdMap.get(draft.storyId);
                const chapterId = chapterIdMap.get(draft.chapterId);
                if (!storyId || !chapterId) return null;
                return {
                    ...draft,
                    id: crypto.randomUUID(),
                    storyId,
                    chapterId,
                    promptId: draft.promptId ? promptIdMap.get(draft.promptId) || draft.promptId : undefined,
                    createdAt: reviveDate(draft.createdAt),
                };
            })
            .filter((draft): draft is Draft => draft !== null);

        const aiChats = (sourceData.aiChats || [])
            .map((chat): AIChat | null => {
                const storyId = storyIdMap.get(chat.storyId);
                if (!storyId) return null;
                return {
                    ...chat,
                    id: crypto.randomUUID(),
                    storyId,
                    chapterId: chat.chapterId ? chapterIdMap.get(chat.chapterId) : undefined,
                    createdAt: reviveDate(chat.createdAt),
                    updatedAt: chat.updatedAt ? reviveDate(chat.updatedAt) : undefined,
                };
            })
            .filter((chat): chat is AIChat => chat !== null);

        const notes = (sourceData.notes || [])
            .map((note): Note | null => {
                const storyId = storyIdMap.get(note.storyId);
                if (!storyId) return null;
                return {
                    ...note,
                    id: crypto.randomUUID(),
                    storyId,
                    createdAt: reviveDate(note.createdAt),
                    updatedAt: reviveDate(note.updatedAt),
                };
            })
            .filter((note): note is Note => note !== null);

        const prompts = (sourceData.prompts || [])
            .filter((prompt) => !prompt.isSystem)
            .map((prompt): Prompt => ({
                ...prompt,
                id: promptIdMap.get(prompt.id)!,
                name: importedName(prompt.name, promptNames),
                isSystem: false,
                createdAt: reviveDate(prompt.createdAt),
            }));

        const templates = (sourceData.templates || [])
            .filter((template) => !template.isSystem)
            .map((template): Template => ({
                ...template,
                id: templateIdMap.get(template.id)!,
                name: importedName(template.name, templateNames),
                isSystem: false,
                storyId: template.storyId ? storyIdMap.get(template.storyId) || null : template.storyId,
                createdAt: reviveDate(template.createdAt),
            }));

        const agentPresets = (sourceData.agentPresets || [])
            .filter((agent) => !agent.isSystem)
            .map((agent): AgentPreset => ({
                ...agent,
                id: agentIdMap.get(agent.id)!,
                name: importedName(agent.name, agentNames),
                isSystem: false,
                storyId: agent.storyId ? storyIdMap.get(agent.storyId) || null : agent.storyId,
                createdAt: reviveDate(agent.createdAt),
            }));

        const pipelinePresets = (sourceData.pipelinePresets || [])
            .filter((pipeline) => !pipeline.isSystem)
            .map((pipeline): PipelinePreset => ({
                ...pipeline,
                id: pipelineIdMap.get(pipeline.id)!,
                name: importedName(pipeline.name, pipelineNames),
                isSystem: false,
                storyId: pipeline.storyId ? storyIdMap.get(pipeline.storyId) || null : pipeline.storyId,
                createdAt: reviveDate(pipeline.createdAt),
                steps: pipeline.steps.map((step) => {
                    const mappedAgentId = agentIdMap.get(step.agentPresetId);
                    if (!mappedAgentId) {
                        warnings.push(`Pipeline "${pipeline.name}" references an agent that was not found in this backup.`);
                    }
                    return {
                        ...step,
                        agentPresetId: mappedAgentId || step.agentPresetId,
                    };
                }),
            }));

        const pipelineExecutions = (sourceData.pipelineExecutions || [])
            .map((execution): PipelineExecution | null => {
                const storyId = storyIdMap.get(execution.storyId);
                if (!storyId) return null;
                return {
                    ...execution,
                    id: crypto.randomUUID(),
                    storyId,
                    chapterId: execution.chapterId ? chapterIdMap.get(execution.chapterId) : undefined,
                    pipelinePresetId: execution.pipelinePresetId
                        ? pipelineIdMap.get(execution.pipelinePresetId) || undefined
                        : undefined,
                    createdAt: reviveDate(execution.createdAt),
                };
            })
            .filter((execution): execution is PipelineExecution => execution !== null);

        await db.transaction(
            "rw",
            [
                db.stories,
                db.chapters,
                db.lorebookEntries,
                db.timelineEvents,
                db.sceneBeats,
                db.drafts,
                db.aiChats,
                db.notes,
                db.prompts,
                db.templates,
                db.agentPresets,
                db.pipelinePresets,
                db.pipelineExecutions,
            ],
            async () => {
                await db.stories.bulkAdd(stories);
                await db.chapters.bulkAdd(chapters);
                await db.lorebookEntries.bulkAdd(lorebookEntries);
                await db.timelineEvents.bulkAdd(timelineEvents);
                await db.sceneBeats.bulkAdd(sceneBeats);
                await db.drafts.bulkAdd(drafts);
                await db.aiChats.bulkAdd(aiChats);
                await db.notes.bulkAdd(notes);
                await db.prompts.bulkAdd(prompts);
                if (templates.length > 0) await db.templates.bulkAdd(templates);
                await db.agentPresets.bulkAdd(agentPresets);
                await db.pipelinePresets.bulkAdd(pipelinePresets);
                await db.pipelineExecutions.bulkAdd(pipelineExecutions);
            }
        );

        return {
            stories: stories.length,
            chapters: chapters.length,
            lorebookEntries: lorebookEntries.length,
            timelineEvents: timelineEvents.length,
            sceneBeats: sceneBeats.length,
            drafts: drafts.length,
            aiChats: aiChats.length,
            notes: notes.length,
            prompts: prompts.length,
            agentPresets: agentPresets.length,
            pipelinePresets: pipelinePresets.length,
            pipelineExecutions: pipelineExecutions.length,
            skippedImages: 0,
            importedStoryIds,
            warnings,
        };
    },

    deleteAllUserContent: async (): Promise<void> => {
        await db.transaction(
            "rw",
            [
                db.stories,
                db.chapters,
                db.lorebookEntries,
                db.timelineEvents,
                db.sceneBeats,
                db.drafts,
                db.aiChats,
                db.notes,
                db.prompts,
                db.templates,
                db.agentPresets,
                db.pipelinePresets,
                db.pipelineExecutions,
                db.mediaAssets,
                db.mediaBlobs,
                db.imageGenerations,
            ],
            async () => {
                await db.stories.clear();
                await db.chapters.clear();
                await db.lorebookEntries.clear();
                await db.timelineEvents.clear();
                await db.sceneBeats.clear();
                await db.drafts.clear();
                await db.aiChats.clear();
                await db.notes.clear();
                await db.pipelineExecutions.clear();
                await db.mediaAssets.clear();
                await db.mediaBlobs.clear();
                await db.imageGenerations.clear();
                await db.prompts.filter((prompt) => prompt.isSystem !== true).delete();
                await db.templates.filter((template) => template.isSystem !== true).delete();
                await db.pipelinePresets.filter((pipeline) => pipeline.isSystem !== true).delete();
                await db.agentPresets.filter((agent) => agent.isSystem !== true).delete();
            }
        );

        clearLastEditorTarget();
        localStorage.removeItem("lastEditedChapterIds");
    },
};

function parseBackup(jsonData: string): SiteBackupFile {
    const parsed = JSON.parse(jsonData) as Partial<SiteBackupFile>;
    if (parsed.type !== SITE_BACKUP_TYPE || !parsed.data) {
        throw new Error("Invalid Site Backup file");
    }
    return {
        version: parsed.version || SITE_BACKUP_VERSION,
        type: SITE_BACKUP_TYPE,
        exportDate: parsed.exportDate || new Date().toISOString(),
        data: {
            stories: parsed.data.stories || [],
            chapters: parsed.data.chapters || [],
            lorebookEntries: parsed.data.lorebookEntries || [],
            timelineEvents: parsed.data.timelineEvents || [],
            sceneBeats: parsed.data.sceneBeats || [],
            drafts: parsed.data.drafts || [],
            aiChats: parsed.data.aiChats || [],
            notes: parsed.data.notes || [],
            prompts: parsed.data.prompts || [],
            templates: parsed.data.templates || [],
            agentPresets: parsed.data.agentPresets || [],
            pipelinePresets: parsed.data.pipelinePresets || [],
            pipelineExecutions: parsed.data.pipelineExecutions || [],
        },
    };
}

function summarize(data: SiteBackupData, skippedImages: number): SiteBackupSummary {
    return {
        stories: data.stories.length,
        chapters: data.chapters.length,
        lorebookEntries: data.lorebookEntries.length,
        timelineEvents: data.timelineEvents.length,
        sceneBeats: data.sceneBeats.length,
        drafts: data.drafts.length,
        aiChats: data.aiChats.length,
        notes: data.notes.length,
        prompts: data.prompts.filter((prompt) => !prompt.isSystem).length,
        agentPresets: data.agentPresets.filter((agent) => !agent.isSystem).length,
        pipelinePresets: data.pipelinePresets.filter((pipeline) => !pipeline.isSystem).length,
        pipelineExecutions: data.pipelineExecutions.length,
        skippedImages,
    };
}

function downloadJson(data: unknown, filename: string): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function importedName(name: string, usedNames: Set<string>): string {
    const baseName = `${name || "Untitled"} (Imported)`;
    if (!usedNames.has(baseName)) {
        usedNames.add(baseName);
        return baseName;
    }

    let index = 2;
    let candidate = `${name || "Untitled"} (Imported ${index})`;
    while (usedNames.has(candidate)) {
        index += 1;
        candidate = `${name || "Untitled"} (Imported ${index})`;
    }
    usedNames.add(candidate);
    return candidate;
}

function reviveDate(value: unknown): Date {
    const date = value ? new Date(value as string | number | Date) : new Date();
    return Number.isNaN(date.getTime()) ? new Date() : date;
}

function reviveChapter(chapter: Chapter): Chapter {
    return {
        ...chapter,
        createdAt: reviveDate(chapter.createdAt),
        outline: chapter.outline
            ? { ...chapter.outline, lastUpdated: reviveDate(chapter.outline.lastUpdated) }
            : chapter.outline,
        notes: chapter.notes
            ? { ...chapter.notes, lastUpdated: reviveDate(chapter.notes.lastUpdated) }
            : chapter.notes,
    };
}

function reviveLorebookEntry(entry: LorebookEntry, lorebookIdMap: Map<string, string>): LorebookEntry {
    const normalizedEntry = normalizeLorebookEntry(entry);
    const relationships = entry.metadata?.relationships?.map((relationship) => ({
        ...relationship,
        targetId: lorebookIdMap.get(relationship.targetId) || relationship.targetId,
    }));

    return {
        ...normalizedEntry,
        createdAt: reviveDate(normalizedEntry.createdAt),
        metadata: normalizedEntry.metadata
            ? {
                ...normalizedEntry.metadata,
                relationships,
            }
            : normalizedEntry.metadata,
    };
}

function reviveTimelineEvent(event: TimelineEvent): TimelineEvent {
    return {
        ...event,
        participantIds: event.participantIds || [],
        unresolvedParticipants: event.unresolvedParticipants || [],
        relatedLorebookEntryIds: event.relatedLorebookEntryIds || [],
        createdAt: reviveDate(event.createdAt),
        updatedAt: event.updatedAt ? reviveDate(event.updatedAt) : undefined,
    };
}
