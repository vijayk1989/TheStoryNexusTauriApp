/**
 * Per-instance Zustand store for SceneBeat components.
 *
 * Each SceneBeatComponent creates its own store via `createSceneBeatInstanceStore`.
 * Sub-components read state through `useSBStore(selector)` which resolves
 * the nearest SceneBeatStoreContext.Provider.
 */
import { createStore, type StoreApi } from 'zustand';
import { useStore } from 'zustand';
import { createContext, useContext } from 'react';
import { splitThinkingContent } from '@/lib/thinking';
import type {
    Prompt,
    AllowedModel,
    PromptMessage,
    LorebookEntry,
    PipelinePreset,
    AgentResult,
} from '@/types/story';
import { useLorebookStore } from '@/features/lorebook/stores/useLorebookStore';

// ── Defaults persistence ────────────────────────────────────────
// Last-used prompt/model/pipeline are saved globally so all SceneBeat
// instances inherit the same defaults across sessions.

const SCENEBEAT_DEFAULTS_KEY = 'scenebeat-defaults';

interface SBDefaults {
    promptId?: string;
    modelId?: string;
    modelName?: string;
    modelProvider?: string;
    pipelineId?: string;
    agenticMode?: boolean;
}

function saveSBDefaults(data: Partial<SBDefaults>) {
    try {
        const existing = loadSBDefaults();
        localStorage.setItem(SCENEBEAT_DEFAULTS_KEY, JSON.stringify({ ...existing, ...data }));
    } catch {
        // localStorage unavailable — silently ignore
    }
}

export function loadSBDefaults(): SBDefaults {
    try {
        const raw = localStorage.getItem(SCENEBEAT_DEFAULTS_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

// ── Types ──────────────────────────────────────────────────────
export type PovType = 'First Person' | 'Third Person Limited' | 'Third Person Omniscient';

export interface SceneBeatInstanceState {
    // Identity
    nodeKey: string;
    sceneBeatId: string;
    isLoaded: boolean;

    // Command
    command: string;

    // UI
    collapsed: boolean;

    // POV
    povType: PovType;
    povCharacter: string | undefined;
    tempPovType: PovType;
    tempPovCharacter: string | undefined;

    // Context toggles
    useMatchedChapter: boolean;
    useMatchedSceneBeat: boolean;
    useCustomContext: boolean;
    includeAllLorebook: boolean;
    showContext: boolean;
    selectedItems: LorebookEntry[];

    // Prompt selection
    selectedPrompt: Prompt | undefined;
    selectedModel: AllowedModel | undefined;

    // Generation
    streaming: boolean;
    /** Raw token stream including any <think>...</think> blocks. */
    rawStreamedText: string;
    /** Prose-only output — <think> blocks stripped out. */
    streamedText: string;
    /** Content extracted from <think>...</think> blocks. */
    thinkingText: string;
    streamComplete: boolean;

    // Mode
    agenticMode: boolean;
    selectedPipeline: PipelinePreset | null;
    availablePipelines: PipelinePreset[];
    useMultiModel: boolean;

    // Agentic results (kept for diagnostics dialog)
    agenticStepResults: AgentResult[];

    // Inline judge feedback (Area 4)
    agenticJudgeResults: AgentResult[];
    latestJudgeFeedback: string | null;
    showJudgeFeedback: boolean;

    // Reject-with-feedback state (Area 6)
    rejectedOutput: string | null;
    rejectionFeedback: string | null;
    showRejectionInput: boolean;

    // Tag matching
    localMatchedEntries: Map<string, LorebookEntry>;

    // Preview (transient — used by preview dialog)
    previewMessages: PromptMessage[] | undefined;
    previewLoading: boolean;
    previewError: string | null;

    // Dialog / panel visibility
    showPreviewDialog: boolean;
    showEditPromptDialog: boolean;
    showMatchedEntries: boolean;
    showAdditionalContext: boolean;
    showDiagnostics: boolean;
    showParallelDrawer: boolean;
    showPovPopover: boolean;
    showAgenticProgress: boolean;

    // ── Actions ────────────────────────────────────────────────

    /** Generic partial setter — use for simple toggles & one-off updates */
    set: (partial: Partial<SceneBeatInstanceState>) => void;

    // POV
    handlePovTypeChange: (value: PovType) => void;
    handleOpenPovPopover: (open: boolean) => void;

    // Prompt
    handlePromptSelect: (prompt: Prompt, model: AllowedModel) => void;
    /** Restore last-used prompt/model/pipeline/agenticMode from localStorage */
    hydrateFromDefaults: (prompts: Prompt[], pipelines: PipelinePreset[]) => void;

    // Context
    handleItemSelect: (itemId: string) => void;
    removeItem: (itemId: string) => void;
    handleIncludeAllLorebook: (enabled: boolean) => void;

    // Stream helpers
    appendStreamedText: (token: string) => void;
    resetGeneration: () => void;
}

// ── Store factory ──────────────────────────────────────────────

export function createSceneBeatInstanceStore(nodeKey: string) {
    return createStore<SceneBeatInstanceState>()((set, get) => ({
        // Identity
        nodeKey,
        sceneBeatId: '',
        isLoaded: false,

        // Command
        command: '',

        // UI
        collapsed: false,

        // POV defaults
        povType: 'Third Person Omniscient' as PovType,
        povCharacter: undefined,
        tempPovType: 'Third Person Omniscient' as PovType,
        tempPovCharacter: undefined,

        // Context toggles
        useMatchedChapter: true,
        useMatchedSceneBeat: false,
        useCustomContext: false,
        includeAllLorebook: false,
        showContext: false,
        selectedItems: [],

        // Prompt
        selectedPrompt: undefined,
        selectedModel: undefined,

        // Generation
        streaming: false,
        rawStreamedText: '',
        streamedText: '',
        thinkingText: '',
        streamComplete: false,

        // Mode
        agenticMode: false,
        selectedPipeline: null,
        availablePipelines: [],
        useMultiModel: false,

        // Agentic results
        agenticStepResults: [],

        // Inline judge feedback
        agenticJudgeResults: [],
        latestJudgeFeedback: null,
        showJudgeFeedback: false,

        // Reject-with-feedback
        rejectedOutput: null,
        rejectionFeedback: null,
        showRejectionInput: false,

        // Tag matching
        localMatchedEntries: new Map(),

        // Preview
        previewMessages: undefined,
        previewLoading: false,
        previewError: null,

        // Dialogs
        showPreviewDialog: false,
        showEditPromptDialog: false,
        showMatchedEntries: false,
        showAdditionalContext: false,
        showDiagnostics: false,
        showParallelDrawer: false,
        showPovPopover: false,
        showAgenticProgress: false,

        // ── Actions ────────────────────────────────────────────

        set: (partial) => {
            set(partial);
            // Persist agenticMode and selectedPipeline whenever they change
            if ('agenticMode' in partial || 'selectedPipeline' in partial) {
                const state = get();
                const agenticMode = 'agenticMode' in partial
                    ? (partial.agenticMode as boolean)
                    : state.agenticMode;
                const pipeline = 'selectedPipeline' in partial
                    ? (partial.selectedPipeline as PipelinePreset | null)
                    : state.selectedPipeline;
                saveSBDefaults({ agenticMode, pipelineId: pipeline?.id });
            }
        },

        handlePovTypeChange: (value) => {
            set({ tempPovType: value });
            if (value === 'Third Person Omniscient') {
                set({ tempPovCharacter: undefined });
            }
        },

        handleOpenPovPopover: (open) => {
            if (open) {
                const { povType, povCharacter } = get();
                set({ tempPovType: povType, tempPovCharacter: povCharacter });
            }
            set({ showPovPopover: open });
        },

        handlePromptSelect: (prompt, model) => {
            set({
                selectedPrompt: prompt,
                selectedModel: model,
                previewMessages: undefined,
                previewError: null,
            });
            // Persist selection so next session starts with the same defaults
            saveSBDefaults({
                promptId: prompt.id,
                modelId: model.id,
                modelName: model.name,
                modelProvider: model.provider,
            });
        },

        hydrateFromDefaults: (prompts, pipelines) => {
            // Only hydrate if nothing is already selected (don't overwrite manual choices)
            const state = get();
            const defaults = loadSBDefaults();

            if (!state.selectedPrompt && defaults.promptId) {
                const prompt = prompts.find(p => p.id === defaults.promptId);
                if (prompt && defaults.modelId && defaults.modelProvider && defaults.modelName) {
                    const model: AllowedModel = {
                        id: defaults.modelId,
                        name: defaults.modelName,
                        provider: defaults.modelProvider as AllowedModel['provider'],
                    };
                    set({ selectedPrompt: prompt, selectedModel: model });
                }
            }

            if (defaults.agenticMode !== undefined && !state.agenticMode) {
                set({ agenticMode: defaults.agenticMode });
            }

            if (!state.selectedPipeline && defaults.pipelineId && pipelines.length > 0) {
                const pipeline = pipelines.find(p => p.id === defaults.pipelineId);
                if (pipeline) {
                    set({ selectedPipeline: pipeline });
                }
            }
        },

        handleItemSelect: (itemId) => {
            const { selectedItems } = get();
            const entries = useLorebookStore.getState().entries;
            const item = entries.find((e) => e.id === itemId);
            if (item && !selectedItems.some((i) => i.id === itemId)) {
                set({ selectedItems: [...selectedItems, item] });
            }
        },

        removeItem: (itemId) => {
            set({ selectedItems: get().selectedItems.filter((i) => i.id !== itemId) });
        },

        handleIncludeAllLorebook: (enabled) => {
            set({ includeAllLorebook: enabled });
            if (enabled) {
                set({ useCustomContext: true });
                const allEntries = useLorebookStore.getState().getFilteredEntries();
                set({ selectedItems: allEntries });
            } else {
                set({ selectedItems: [] });
            }
        },

        appendStreamedText: (token) => {
            set((state) => {
                const raw = state.rawStreamedText + token;
                const { proseText, thinkingText } = splitThinkingContent(raw);
                return { rawStreamedText: raw, streamedText: proseText, thinkingText };
            });
        },

        resetGeneration: () => {
            set({
                rawStreamedText: '',
                streamedText: '',
                thinkingText: '',
                streamComplete: false,
                streaming: false,
                // Clear inline judge feedback
                agenticJudgeResults: [],
                latestJudgeFeedback: null,
                showJudgeFeedback: false,
                showRejectionInput: false,
                // Note: rejectedOutput and rejectionFeedback are intentionally NOT cleared here.
                // They are preserved for the next generation run and cleared there after use.
            });
        },
    }));
}

// ── React Context + consumer hook ──────────────────────────────

export type SceneBeatInstanceStoreApi = StoreApi<SceneBeatInstanceState>;

export const SceneBeatStoreContext = createContext<SceneBeatInstanceStoreApi | null>(null);

/**
 * Subscribe to a slice of the nearest SceneBeat instance store.
 * Must be used within a `SceneBeatStoreContext.Provider`.
 */
export function useSBStore<T>(selector: (state: SceneBeatInstanceState) => T): T {
    const store = useContext(SceneBeatStoreContext);
    if (!store) {
        throw new Error('useSBStore must be used within a SceneBeatStoreContext.Provider');
    }
    return useStore(store, selector);
}

/**
 * Get the raw store API (for imperative access in callbacks/effects).
 */
export function useSBStoreApi(): SceneBeatInstanceStoreApi {
    const store = useContext(SceneBeatStoreContext);
    if (!store) {
        throw new Error('useSBStoreApi must be used within a SceneBeatStoreContext.Provider');
    }
    return store;
}
