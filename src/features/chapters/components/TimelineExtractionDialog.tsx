import { useEffect, useMemo, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "react-toastify";
import { Loader2, Play, Save, Sparkles, X } from "lucide-react";

import { PromptSelectMenu } from "@/components/ui/prompt-select-menu";
import type { AllowedModel, LorebookEntry, Prompt } from "@/types/story";
import { usePromptStore } from "@/features/prompts/store/promptStore";
import { useAIStore } from "@/features/ai/stores/useAIStore";
import { useChapterStore } from "@/features/chapters/stores/useChapterStore";
import { useLorebookStore } from "@/features/lorebook/stores/useLorebookStore";
import { parseLorebookJson } from "@/features/brainstorm/utils/parseLorebookJson";
import { PromptParser } from "@/features/prompts/services/promptParser";
import { db } from "@/services/database";
import { aiService } from "@/services/ai/AIService";
import { processTimelineJSON } from "../services/timelineExtractor";
import { resolveSavedDefaultModel } from "@/features/ai/utils/defaultModels";

type ExtractMode = "timeline" | "lorebook" | "lorebookUpdates" | "style";

type ExtractModeConfig = {
    label: string;
    promptId: string;
    description: string;
    outputLabel: string;
    placeholder: string;
    successMessage: string;
    saveLabel: string;
};

const EXTRACT_MODES: Record<ExtractMode, ExtractModeConfig> = {
    timeline: {
        label: "Timeline",
        promptId: "timeline-extractor-system",
        description: "Generate ordered timeline events from this chapter.",
        outputLabel: "Extracted Timeline JSON",
        placeholder: "Timeline JSON output will appear here...",
        successMessage: "Timeline extraction complete. You can edit the JSON before saving.",
        saveLabel: "Accept & Save Timeline",
    },
    lorebook: {
        label: "Lorebook Data",
        promptId: "lorebook-data-extractor-system",
        description: "Extract characters, places, items, events, and notes as Lorebook entries.",
        outputLabel: "Extracted Lorebook JSON",
        placeholder: "Lorebook entry JSON output will appear here...",
        successMessage: "Lorebook extraction complete. You can edit the JSON before saving.",
        saveLabel: "Accept & Save Lorebook",
    },
    lorebookUpdates: {
        label: "Lorebook Updates",
        promptId: "lorebook-update-extractor-system",
        description: "Propose append-only updates for lorebook entries already matched in this chapter.",
        outputLabel: "Proposed Lorebook Update JSON",
        placeholder: "Lorebook update proposal JSON will appear here...",
        successMessage: "Lorebook update extraction complete. Review or edit the JSON before applying.",
        saveLabel: "Apply Lorebook Updates",
    },
    style: {
        label: "Style",
        promptId: "style-extractor-system",
        description: "Extract this chapter's voice, prose habits, pacing, and formatting as a reusable style note.",
        outputLabel: "Extracted Style Output",
        placeholder: "Style analysis output will appear here...",
        successMessage: "Style extraction complete. You can edit the output before saving.",
        saveLabel: "Accept & Save Style",
    },
};

interface TimelineExtractionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    storyId: string;
    chapterId: string;
}

export function TimelineExtractionDialog({
    isOpen,
    onClose,
    storyId,
    chapterId,
}: TimelineExtractionDialogProps) {
    const { prompts, fetchPrompts } = usePromptStore();
    const { settings } = useAIStore();
    const chapterMatchedEntries = useLorebookStore((state) => state.chapterMatchedEntries);

    const [activeMode, setActiveMode] = useState<ExtractMode>("timeline");
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | undefined>();
    const [selectedModel, setSelectedModel] = useState<AllowedModel | undefined>();
    const [generatedOutput, setGeneratedOutput] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const abortControllerRef = useRef<AbortController | null>(null);
    const availablePrompts = useMemo(
        () => prompts.filter((prompt) => prompt.promptType === "other"),
        [prompts]
    );
    const modeConfig = EXTRACT_MODES[activeMode];

    useEffect(() => {
        if (isOpen) {
            fetchPrompts();
            setActiveMode("timeline");
            setGeneratedOutput("");
            setIsGenerating(false);
            setIsSaving(false);
        }
    }, [isOpen, fetchPrompts]);

    useEffect(() => {
        if (!isOpen || !settings?.availableModels?.length) return;

        const defaultPrompt =
            availablePrompts.find((prompt) => prompt.id === modeConfig.promptId) ||
            availablePrompts.find((prompt) => prompt.id === "timeline-extractor-system") ||
            availablePrompts[0];
        const defaultModel =
            resolveSavedDefaultModel(settings, settings.defaultSceneBeatModelId);

        setSelectedPrompt(defaultPrompt);
        setSelectedModel(defaultModel);
        setGeneratedOutput("");
    }, [activeMode, availablePrompts, isOpen, modeConfig.promptId, settings]);

    const handleGenerate = async () => {
        if (!selectedPrompt || !selectedModel || !storyId || !chapterId) {
            toast.error("Please select a prompt and an AI model.");
            return;
        }

        setIsGenerating(true);
        setGeneratedOutput("");
        abortControllerRef.current = new AbortController();

        try {
            const { getChapterPlainText } = useChapterStore.getState();
            const plainTextContent = await getChapterPlainText(chapterId);
            const matchedEntries = new Set(Array.from(chapterMatchedEntries.values()));

            if (activeMode === "lorebookUpdates" && matchedEntries.size === 0) {
                throw new Error("No matched lorebook entries are available to update.");
            }

            const parser = new PromptParser(db);
            const result = await parser.parse({
                promptId: selectedPrompt.id,
                storyId,
                chapterId,
                chapterMatchedEntries: matchedEntries,
                additionalContext: {
                    plainTextContent,
                    lorebookUpdateTargetIds: Array.from(matchedEntries).map((entry) => entry.id),
                },
            });

            if (result.error || !result.messages.length) {
                throw new Error(result.error || "Failed to build extraction prompt.");
            }

            const temperature = selectedPrompt.temperature ?? 0.3;
            const maxTokens = selectedPrompt.maxTokens ?? 2048;
            const response = await generateWithModel(selectedModel, result.messages, temperature, maxTokens);

            if (!response.ok && response.status !== 204) {
                const errorText = await response.text().catch(() => "");
                throw new Error(
                    `AI request failed with ${response.status} ${response.statusText}${errorText ? `: ${errorText}` : ""}`
                );
            }

            let fullText = "";
            await new Promise<void>((resolve, reject) => {
                aiService.processStreamedResponse(
                    response,
                    (token) => {
                        fullText += token;
                        setGeneratedOutput(fullText);
                    },
                    resolve,
                    reject
                );
            });

            toast.success(modeConfig.successMessage);
        } catch (error) {
            if ((error as Error).name !== "AbortError") {
                console.error("Extraction error:", error);
                toast.error(error instanceof Error ? error.message : "Failed to generate extraction.");
            }
        } finally {
            setIsGenerating(false);
            abortControllerRef.current = null;
        }
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            aiService.abortStream();
            toast.info("Generation stopped.");
        }
    };

    const handleSave = async () => {
        if (!generatedOutput.trim()) {
            toast.error("No extracted data to save.");
            return;
        }

        setIsSaving(true);
        try {
            let count = 0;
            if (activeMode === "timeline") {
                count = await processTimelineJSON(storyId, chapterId, generatedOutput);
                toast.success(`Added ${count} event(s) to the Timeline.`);
            } else if (activeMode === "lorebook") {
                count = await saveLorebookEntries(storyId, generatedOutput);
                toast.success(`Added ${count} lorebook entr${count === 1 ? "y" : "ies"}.`);
            } else if (activeMode === "lorebookUpdates") {
                count = await saveLorebookUpdates(storyId, generatedOutput);
                toast.success(`Updated ${count} lorebook entr${count === 1 ? "y" : "ies"}.`);
            } else {
                count = await saveStyleEntry(storyId, chapterId, generatedOutput);
                toast.success(`Added ${count} style note${count === 1 ? "" : "s"}.`);
            }
            onClose();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to save extracted data.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isGenerating && onClose()}>
            <DialogContent className="flex h-[85vh] max-w-4xl flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Sparkles className="h-6 w-6 text-primary" />
                        Extract
                    </DialogTitle>
                    <DialogDescription>
                        Pull structured story data from the current chapter with an AI extraction prompt.
                    </DialogDescription>
                </DialogHeader>

                <Tabs
                    value={activeMode}
                    onValueChange={(value) => setActiveMode(value as ExtractMode)}
                    className="mt-2 flex min-h-0 flex-1 flex-col"
                >
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="timeline">Timeline</TabsTrigger>
                        <TabsTrigger value="lorebook">Lorebook Data</TabsTrigger>
                        <TabsTrigger value="lorebookUpdates">Lorebook Updates</TabsTrigger>
                        <TabsTrigger value="style">Style</TabsTrigger>
                    </TabsList>

                    {(Object.keys(EXTRACT_MODES) as ExtractMode[]).map((mode) => (
                        <TabsContent key={mode} value={mode} className="min-h-0 flex-1">
                            <ExtractModePanel
                                config={EXTRACT_MODES[mode]}
                                prompts={prompts}
                                selectedPrompt={selectedPrompt}
                                selectedModel={selectedModel}
                                generatedOutput={generatedOutput}
                                isGenerating={isGenerating}
                                onSelect={(prompt, model) => {
                                    setSelectedPrompt(prompt);
                                    setSelectedModel(model);
                                }}
                                onOutputChange={setGeneratedOutput}
                                onGenerate={handleGenerate}
                                onStop={handleStop}
                            />
                        </TabsContent>
                    ))}
                </Tabs>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={onClose} disabled={isGenerating || isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isGenerating || isSaving || !generatedOutput.trim()}>
                        {isSaving ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                        ) : (
                            <><Save className="mr-2 h-4 w-4" /> {modeConfig.saveLabel}</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ExtractModePanel({
    config,
    prompts,
    selectedPrompt,
    selectedModel,
    generatedOutput,
    isGenerating,
    onSelect,
    onOutputChange,
    onGenerate,
    onStop,
}: {
    config: ExtractModeConfig;
    prompts: Prompt[];
    selectedPrompt?: Prompt;
    selectedModel?: AllowedModel;
    generatedOutput: string;
    isGenerating: boolean;
    onSelect: (prompt: Prompt, model: AllowedModel) => void;
    onOutputChange: (value: string) => void;
    onGenerate: () => void;
    onStop: () => void;
}) {
    return (
        <div className="flex h-full min-h-0 flex-col gap-4 pt-4">
            <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                {config.description}
            </div>

            <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                    <Label>Prompt</Label>
                    <PromptSelectMenu
                        isLoading={false}
                        error={null}
                        prompts={prompts}
                        promptType="other"
                        selectedPrompt={selectedPrompt}
                        selectedModel={selectedModel}
                        onSelect={onSelect}
                    />
                </div>
                <div className="flex items-end">
                    {isGenerating ? (
                        <Button variant="destructive" onClick={onStop} className="w-32">
                            <X className="mr-2 h-4 w-4" />
                            Stop
                        </Button>
                    ) : (
                        <Button onClick={onGenerate} className="w-32">
                            <Play className="mr-2 h-4 w-4" />
                            Generate
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2">
                <Label>{config.outputLabel}</Label>
                <Textarea
                    className="flex-1 resize-none font-mono text-sm"
                    placeholder={config.placeholder}
                    value={generatedOutput}
                    onChange={(event) => onOutputChange(event.target.value)}
                    disabled={isGenerating}
                />
            </div>
        </div>
    );
}

async function generateWithModel(
    model: AllowedModel,
    messages: Prompt["messages"],
    temperature: number,
    maxTokens: number
): Promise<Response> {
    switch (model.provider) {
        case "local":
            return aiService.generateWithLocalModel(messages, temperature, maxTokens, undefined, undefined, undefined, undefined, model.id);
        case "openai":
            return aiService.generateWithOpenAI(messages, model.id, temperature, maxTokens);
        case "openai_compatible":
            return aiService.generateWithOpenAICompatible(messages, model.id, temperature, maxTokens);
        case "openrouter":
            return aiService.generateWithOpenRouter(messages, model.id, temperature, maxTokens);
        case "nanogpt":
            return aiService.generateWithNanoGPT(messages, model.id, temperature, maxTokens);
        case "google":
            return aiService.generateWithGoogle(messages, model.id, temperature, maxTokens);
        default:
            throw new Error(`Unsupported provider: ${model.provider}`);
    }
}

async function saveLorebookEntries(storyId: string, output: string): Promise<number> {
    const { entries, error } = parseLorebookJson(output);
    if (error || entries.length === 0) {
        throw new Error(error || "No valid lorebook entries found.");
    }

    const lorebookStore = useLorebookStore.getState();
    await lorebookStore.loadEntries(storyId);

    for (const entry of entries) {
        await lorebookStore.createEntry({
            storyId,
            name: entry.name!,
            description: entry.description || "",
            category: normalizeLorebookCategory(entry.category),
            aliases: entry.aliases || [],
            tags: entry.tags || [],
            metadata: entry.metadata,
            isDisabled: entry.isDisabled,
        });
    }

    return entries.length;
}

async function saveStyleEntry(storyId: string, chapterId: string, output: string): Promise<number> {
    const parsed = parseLorebookJson(output);
    if (parsed.entries.length > 0) {
        return saveLorebookEntries(storyId, output);
    }

    const chapter = await db.chapters.get(chapterId);
    const lorebookStore = useLorebookStore.getState();
    await lorebookStore.loadEntries(storyId);
    await lorebookStore.createEntry({
        storyId,
        name: chapter ? `Style - Chapter ${chapter.order}: ${chapter.title}` : "Extracted Style",
        description: output.trim(),
        category: "note",
        aliases: [],
        tags: ["style", "voice"],
        metadata: {
            type: "style_guide",
            customFields: chapter ? { chapterOrder: chapter.order } : {},
        },
    });

    return 1;
}

function normalizeLorebookCategory(category: Partial<LorebookEntry>["category"]): LorebookEntry["category"] {
    const allowedCategories: LorebookEntry["category"][] = [
        "character",
        "location",
        "item",
        "event",
        "note",
        "synopsis",
        "starting scenario",
    ];

    return category && allowedCategories.includes(category) ? category : "note";
}

type LorebookUpdateProposal = {
    entryId: string;
    entryName?: string;
    descriptionAppend?: string;
    aliasesToAdd?: string[];
    tagsToAdd?: string[];
    metadataPatch?: Partial<NonNullable<LorebookEntry["metadata"]>>;
    evidence?: string;
    confidence?: "high" | "medium" | "low";
};

type LorebookUpdateParseResult = {
    updates: LorebookUpdateProposal[];
    error?: string;
};

function parseLorebookUpdateJson(message: string): LorebookUpdateParseResult {
    if (!message.trim()) return { updates: [] };

    const values = extractJsonValues(message);
    const updates = values.flatMap((value) => {
        if (Array.isArray(value)) return value;
        if (value && typeof value === "object") {
            const record = value as Record<string, unknown>;
            if (Array.isArray(record.entryUpdates)) return record.entryUpdates;
            if (Array.isArray(record.updates)) return record.updates;
        }
        return [];
    });

    if (updates.length === 0) {
        return { updates: [], error: "No valid lorebook update proposals found." };
    }

    return { updates: sanitizeLorebookUpdates(updates) };
}

function extractJsonValues(message: string): unknown[] {
    const values: unknown[] = [];

    const parse = (text: string) => {
        try {
            values.push(JSON.parse(text));
        } catch {
            // Ignore non-JSON fragments.
        }
    };

    const fencedJsonRegex = /```json\s*([\s\S]*?)```/gi;
    let match: RegExpExecArray | null;
    while ((match = fencedJsonRegex.exec(message)) !== null) {
        parse(match[1].trim());
    }
    if (values.length > 0) return values;

    const fencedAnyRegex = /```\s*([\s\S]*?)```/gi;
    while ((match = fencedAnyRegex.exec(message)) !== null) {
        parse(match[1].trim());
    }
    if (values.length > 0) return values;

    parse(message.trim());
    return values;
}

function sanitizeLorebookUpdates(rawUpdates: unknown[]): LorebookUpdateProposal[] {
    return rawUpdates
        .filter((value): value is Record<string, unknown> => Boolean(value && typeof value === "object"))
        .map((value) => {
            const entryId = typeof value.entryId === "string" ? value.entryId.trim() : "";
            const entryName = typeof value.entryName === "string" ? value.entryName.trim() : undefined;
            const descriptionAppend = typeof value.descriptionAppend === "string" ? value.descriptionAppend.trim() : undefined;
            const aliasesToAdd = sanitizeStringArray(value.aliasesToAdd);
            const tagsToAdd = sanitizeStringArray(value.tagsToAdd);
            const metadataPatch = sanitizeMetadataPatch(value.metadataPatch);
            const evidence = typeof value.evidence === "string" ? value.evidence.trim() : undefined;
            const confidence: LorebookUpdateProposal["confidence"] =
                value.confidence === "high" || value.confidence === "medium" || value.confidence === "low"
                ? value.confidence
                : undefined;

            return {
                entryId,
                entryName,
                descriptionAppend,
                aliasesToAdd,
                tagsToAdd,
                metadataPatch,
                evidence,
                confidence,
            };
        })
        .filter((update) =>
            update.entryId &&
            Boolean(
                update.descriptionAppend ||
                update.aliasesToAdd?.length ||
                update.tagsToAdd?.length ||
                update.metadataPatch
            )
        );
}

function sanitizeStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) return undefined;

    const uniqueValues = mergeStringArrays([], value.map(String));
    return uniqueValues.length > 0 ? uniqueValues : undefined;
}

function sanitizeMetadataPatch(value: unknown): LorebookUpdateProposal["metadataPatch"] | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

    const patch = value as Record<string, unknown>;
    const sanitized: NonNullable<LorebookUpdateProposal["metadataPatch"]> = {};

    if (typeof patch.type === "string") sanitized.type = patch.type.trim();
    if (patch.importance === "major" || patch.importance === "minor" || patch.importance === "background") {
        sanitized.importance = patch.importance;
    }
    if (patch.status === "active" || patch.status === "inactive" || patch.status === "historical") {
        sanitized.status = patch.status;
    }
    if (patch.customFields && typeof patch.customFields === "object" && !Array.isArray(patch.customFields)) {
        sanitized.customFields = patch.customFields as Record<string, unknown>;
    }

    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

async function saveLorebookUpdates(storyId: string, output: string): Promise<number> {
    const { updates, error } = parseLorebookUpdateJson(output);
    if (error || updates.length === 0) {
        throw new Error(error || "No valid lorebook update proposals found.");
    }

    const lorebookStore = useLorebookStore.getState();
    await lorebookStore.loadEntries(storyId);

    let appliedCount = 0;
    const entriesById = new Map(
        useLorebookStore.getState().entries
            .filter((entry) => entry.storyId === storyId)
            .map((entry) => [entry.id, entry])
    );

    for (const update of updates) {
        const existing = entriesById.get(update.entryId);
        if (!existing) continue;

        const nextDescription = appendDescription(existing.description, update.descriptionAppend);
        const nextAliases = mergeStringArrays(existing.aliases, update.aliasesToAdd || []);
        const nextTags = mergeStringArrays(existing.tags, update.tagsToAdd || []);
        const nextMetadata = mergeLorebookMetadata(existing.metadata, update.metadataPatch);

        const data: Partial<LorebookEntry> = {};
        if (nextDescription !== existing.description) data.description = nextDescription;
        if (!sameStringArray(nextAliases, existing.aliases)) data.aliases = nextAliases;
        if (!sameStringArray(nextTags, existing.tags)) data.tags = nextTags;
        if (!sameJsonValue(nextMetadata, existing.metadata)) data.metadata = nextMetadata;

        if (Object.keys(data).length === 0) continue;

        await lorebookStore.updateEntryAndRebuildAliases(existing.id, data);
        entriesById.set(existing.id, { ...existing, ...data });
        appliedCount += 1;
    }

    if (appliedCount === 0) {
        throw new Error("No applicable lorebook updates found for this story.");
    }

    return appliedCount;
}

function appendDescription(description: string, appendValue?: string): string {
    const current = description.trim();
    const addition = appendValue?.trim();

    if (!addition) return description;
    if (current.toLowerCase().includes(addition.toLowerCase())) return description;

    return current ? `${current}\n\n${addition}` : addition;
}

function mergeStringArrays(existing: string[], additions: string[]): string[] {
    const merged: string[] = [];
    const seen = new Set<string>();

    for (const value of [...existing, ...additions]) {
        const normalized = value.trim();
        const key = normalized.toLowerCase();
        if (!normalized || seen.has(key)) continue;
        seen.add(key);
        merged.push(normalized);
    }

    return merged;
}

function mergeLorebookMetadata(
    existing: LorebookEntry["metadata"],
    patch: LorebookUpdateProposal["metadataPatch"]
): LorebookEntry["metadata"] {
    if (!patch) return existing;

    const merged: LorebookEntry["metadata"] = {
        ...(existing || {}),
        ...patch,
    };

    if (patch.customFields) {
        merged.customFields = {
            ...(existing?.customFields || {}),
            ...patch.customFields,
        };
    }

    return {
        ...merged,
    };
}

function sameStringArray(left: string[], right: string[]): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameJsonValue(left: unknown, right: unknown): boolean {
    return JSON.stringify(left || null) === JSON.stringify(right || null);
}
