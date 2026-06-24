import { create } from 'zustand';
import { db } from '@/services/database';
import type {
    AgentPreset,
    PipelinePreset,
    PipelineExecution,
    AgentRole,
    AllowedModel,
    PipelineStep
} from '@/types/story';
import { seedSystemAgents, cleanupDuplicateSystemPresets } from '../services/agentSeeder';
import { DEFAULT_AGENT_PROMPTS } from '../constants/defaultAgentPrompts';

export { DEFAULT_AGENT_PROMPTS } from '../constants/defaultAgentPrompts';

interface AgentsState {
    // Agent Presets
    agentPresets: AgentPreset[];
    isLoadingPresets: boolean;
    presetsError: string | null;

    // Pipeline Presets
    pipelinePresets: PipelinePreset[];
    isLoadingPipelines: boolean;
    pipelinesError: string | null;

    // Pipeline Executions (history)
    pipelineExecutions: PipelineExecution[];

    // Actions - Agent Presets
    loadAgentPresets: (storyId?: string | null) => Promise<void>;
    createAgentPreset: (preset: Omit<AgentPreset, 'id' | 'createdAt'>) => Promise<AgentPreset>;
    updateAgentPreset: (id: string, data: Partial<AgentPreset>) => Promise<void>;
    deleteAgentPreset: (id: string) => Promise<void>;
    getAgentPreset: (id: string) => AgentPreset | undefined;
    getAgentPresetsByRole: (role: AgentRole) => AgentPreset[];

    // Actions - Pipeline Presets
    loadPipelinePresets: (storyId?: string | null) => Promise<void>;
    createPipelinePreset: (preset: Omit<PipelinePreset, 'id' | 'createdAt'>) => Promise<PipelinePreset>;
    updatePipelinePreset: (id: string, data: Partial<PipelinePreset>) => Promise<void>;
    deletePipelinePreset: (id: string) => Promise<void>;
    getPipelinePreset: (id: string) => PipelinePreset | undefined;

    // Actions - Pipeline Executions
    loadPipelineExecutions: (storyId: string) => Promise<void>;
    savePipelineExecution: (execution: Omit<PipelineExecution, 'id' | 'createdAt'>) => Promise<string>;
    deletePipelineExecution: (id: string) => Promise<void>;

    // Utility
    createDefaultAgentPreset: (role: AgentRole, model: AllowedModel, storyId?: string | null) => Promise<AgentPreset>;
}

export const useAgentsStore = create<AgentsState>((set, get) => ({
    agentPresets: [],
    isLoadingPresets: false,
    presetsError: null,

    pipelinePresets: [],
    isLoadingPipelines: false,
    pipelinesError: null,

    pipelineExecutions: [],

    // Agent Presets
    loadAgentPresets: async (storyId?: string | null) => {
        set({ isLoadingPresets: true, presetsError: null });
        try {
            // Clean up any duplicate system presets first
            await cleanupDuplicateSystemPresets();
            
            // Ensure system agents are seeded
            await seedSystemAgents();

            let presets: AgentPreset[];
            if (storyId) {
                // Load global presets + story-specific presets
                presets = await db.agentPresets
                    .filter(p => p.storyId === null || p.storyId === undefined || p.storyId === storyId)
                    .toArray();
            } else {
                // Load only global presets
                presets = await db.agentPresets
                    .filter(p => p.storyId === null || p.storyId === undefined)
                    .toArray();
            }
            set({ agentPresets: presets, isLoadingPresets: false });
        } catch (error) {
            set({
                presetsError: error instanceof Error ? error.message : 'Failed to load agent presets',
                isLoadingPresets: false
            });
        }
    },

    createAgentPreset: async (preset) => {
        const newPreset: AgentPreset = {
            ...preset,
            id: crypto.randomUUID(),
            createdAt: new Date(),
        };
        await db.agentPresets.add(newPreset);
        set(state => ({ agentPresets: [...state.agentPresets, newPreset] }));
        return newPreset;
    },

    updateAgentPreset: async (id, data) => {
        await db.agentPresets.update(id, data);
        set(state => ({
            agentPresets: state.agentPresets.map(p =>
                p.id === id ? { ...p, ...data } : p
            )
        }));
    },

    deleteAgentPreset: async (id) => {
        // Check if any pipeline uses this agent
        const { pipelinePresets } = get();
        const usedInPipelines = pipelinePresets.filter(p =>
            p.steps.some(s => s.agentPresetId === id)
        );

        if (usedInPipelines.length > 0) {
            throw new Error(`Cannot delete agent: used in ${usedInPipelines.length} pipeline(s)`);
        }

        await db.agentPresets.delete(id);
        set(state => ({
            agentPresets: state.agentPresets.filter(p => p.id !== id)
        }));
    },

    getAgentPreset: (id) => {
        return get().agentPresets.find(p => p.id === id);
    },

    getAgentPresetsByRole: (role) => {
        return get().agentPresets.filter(p => p.role === role);
    },

    // Pipeline Presets
    loadPipelinePresets: async (storyId?: string | null) => {
        set({ isLoadingPipelines: true, pipelinesError: null });
        try {
            let presets: PipelinePreset[];
            if (storyId) {
                presets = await db.pipelinePresets
                    .filter(p => p.storyId === null || p.storyId === undefined || p.storyId === storyId)
                    .toArray();
            } else {
                presets = await db.pipelinePresets
                    .filter(p => p.storyId === null || p.storyId === undefined)
                    .toArray();
            }
            set({ pipelinePresets: presets, isLoadingPipelines: false });
        } catch (error) {
            set({
                pipelinesError: error instanceof Error ? error.message : 'Failed to load pipeline presets',
                isLoadingPipelines: false
            });
        }
    },

    createPipelinePreset: async (preset) => {
        const newPreset: PipelinePreset = {
            ...preset,
            id: crypto.randomUUID(),
            createdAt: new Date(),
        };
        await db.pipelinePresets.add(newPreset);
        set(state => ({ pipelinePresets: [...state.pipelinePresets, newPreset] }));
        return newPreset;
    },

    updatePipelinePreset: async (id, data) => {
        await db.pipelinePresets.update(id, data);
        set(state => ({
            pipelinePresets: state.pipelinePresets.map(p =>
                p.id === id ? { ...p, ...data } : p
            )
        }));
    },

    deletePipelinePreset: async (id) => {
        await db.pipelinePresets.delete(id);
        set(state => ({
            pipelinePresets: state.pipelinePresets.filter(p => p.id !== id)
        }));
    },

    getPipelinePreset: (id) => {
        return get().pipelinePresets.find(p => p.id === id);
    },

    // Pipeline Executions
    loadPipelineExecutions: async (storyId: string) => {
        try {
            const executions = await db.pipelineExecutions
                .where('storyId')
                .equals(storyId)
                .reverse()
                .sortBy('createdAt');
            set({ pipelineExecutions: executions });
        } catch (error) {
            console.error('Failed to load pipeline executions:', error);
        }
    },

    savePipelineExecution: async (execution) => {
        const id = crypto.randomUUID();
        const newExecution: PipelineExecution = {
            ...execution,
            id,
            createdAt: new Date(),
        };
        await db.pipelineExecutions.add(newExecution);
        set(state => ({
            pipelineExecutions: [newExecution, ...state.pipelineExecutions]
        }));
        return id;
    },

    deletePipelineExecution: async (id) => {
        await db.pipelineExecutions.delete(id);
        set(state => ({
            pipelineExecutions: state.pipelineExecutions.filter(e => e.id !== id)
        }));
    },

    // Utility
    createDefaultAgentPreset: async (role, model, storyId = null) => {
        const roleNames: Record<AgentRole, string> = {
            summarizer: 'Summarizer',
            prose_writer: 'Prose Writer',
            lore_judge: 'Lore Judge',
            continuity_checker: 'Continuity Checker',
            style_editor: 'Style Editor',
            dialogue_specialist: 'Dialogue Specialist',
            expander: 'Expander',
            outline_generator: 'Outline Generator',
            style_extractor: 'Style Extractor',
            scenebeat_generator: 'Scene Beat Generator',
            refusal_checker: 'Refusal Checker',
            custom: 'Custom Agent'
        };

        const preset: Omit<AgentPreset, 'id' | 'createdAt'> = {
            name: roleNames[role],
            description: `Default ${roleNames[role].toLowerCase()} agent`,
            role,
            model,
            systemPrompt: DEFAULT_AGENT_PROMPTS[role],
            temperature: role === 'summarizer' || role === 'lore_judge' ? 0.3 : 0.8,
            maxTokens: role === 'summarizer' ? 1500 : 2048,
            storyId,
        };

        return get().createAgentPreset(preset);
    },
}));
