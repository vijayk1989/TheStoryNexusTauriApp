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

// Default system prompts for each agent role
export const DEFAULT_AGENT_PROMPTS: Record<AgentRole, string> = {
    summarizer: `You are a narrative summarizer. Your job is to condense story content while preserving:
- Key plot points and events
- Character emotions and motivations
- Important dialogue
- Setting details
- Foreshadowing and subtext

Reduce the text to approximately 1000 words without losing narrative continuity.`,

    prose_writer: `You are a skilled fiction writer. Continue the story based on the provided context and scene beat instructions. Maintain consistent tone, style, and character voice. Write engaging prose that draws readers in.`,

    lore_judge: `You are a lore consistency checker. Compare the generated prose against the established lorebook data.

Check for:
- Character name/trait inconsistencies
- Location/setting contradictions
- Timeline/event conflicts
- Magic system or world-building violations

If everything is consistent, respond with just: CONSISTENT

If there are issues, list them briefly in this format:
ISSUE: [description]
SUGGESTION: [how to fix]`,

    continuity_checker: `You are a continuity expert. Check for plot holes, timeline inconsistencies, and character behavior changes. Flag anything that doesn't match the established story context.

If consistent, respond with: CONSISTENT
Otherwise, list issues briefly.`,

    style_editor: `You are a prose editor focused on style and flow. Review the text and improve:
- Sentence variety and rhythm
- Word choice and precision
- Paragraph transitions
- Show vs tell balance

Maintain the author's voice while polishing the prose.`,

    dialogue_specialist: `You are a dialogue expert. Review conversations to ensure:
- Each character has a distinct voice
- Dialogue feels natural and authentic
- Subtext and tension are present where appropriate
- Dialogue tags are varied and unobtrusive`,

    expander: `You are a prose expander. Take brief notes or outlines and expand them into full, detailed scenes with:
- Sensory details
- Character reactions and emotions
- Natural pacing
- Engaging prose`,

    outline_generator: `You are an expert story outliner. Generate structured outlines that include:
- Story arc with beginning, middle, and end
- Chapter breakdowns with key scenes
- Character arcs and development points
- Plot threads and their resolutions
- Pacing notes and tension points

Format the outline clearly with headers and bullet points. Consider the established lore and characters when planning.`,

    style_extractor: `You are a literary analyst specializing in writing style extraction. Analyze the provided text and extract:

1. **Voice & Tone**: Formal/informal, serious/playful, narrative distance
2. **Sentence Structure**: Average length, variety, use of fragments or run-ons
3. **Word Choice**: Vocabulary level, preferred verbs/adjectives, unique phrases
4. **Dialogue Style**: Tag usage, dialect, subtext patterns
5. **Description Patterns**: Sensory preferences, metaphor usage, pacing
6. **POV Quirks**: Narrative intrusion, character voice bleed, tense usage

Output a concise style guide that another AI could use to mimic this writing style. Be specific with examples from the text.`,

    scenebeat_generator: `You are a scene planning assistant. Generate scene beat commands that can guide prose generation.
    
    Each scene beat should be a brief, actionable instruction (1-3 sentences) describing:
    - The core action or event
    - Emotional beats and character reactions
    - Setting details if relevant
    - Dialogue hints if conversation is involved
    
    Format as a numbered list of scene beats. Make them specific enough to guide writing but open enough for creative interpretation.`,
    
    refusal_checker: `You are a content refusal detector. Your ONLY job is to analyze AI-generated text and determine if the AI refused to write the requested content.
    
    Response format:
    - If the text contains a refusal or avoidance: respond with exactly: REFUSAL_DETECTED: [brief description of what was refused]
    - If the text is genuine creative prose (even if imperfect): respond with exactly: CONTENT_OK`,

    chapter_reviewer: `You are an expert fiction editor and literary critic. Your job is to review a full chapter and provide detailed, constructive feedback.

Review the chapter across the following dimensions:

1. **Prose Quality**: Sentence variety, word choice, show vs. tell balance, rhythm and flow
2. **Character Consistency**: Are characters acting true to their established traits? Is dialogue authentic?
3. **Pacing**: Does the chapter move at an appropriate speed? Are there slow or rushed sections?
4. **Scene Structure**: Is there a clear opening, middle, and payoff? Does tension build effectively?
5. **Lore & Continuity**: Any contradictions with established world-building or character facts?
6. **Dialogue**: Natural? Distinct character voices? Subtext present where appropriate?
7. **Emotional Impact**: Does the chapter land emotionally? Does the reader feel connected to the stakes?
8. **Strengths**: What works well and should be preserved?
9. **Suggestions**: Specific, actionable improvements with brief examples where helpful.

Be honest but constructive. Lead with what works well, then address what can be improved.`,

    chapter_editor: `You are an expert fiction editor. Your job is to rewrite and improve a chapter based on the review feedback provided.

Focus on:
1. **Prose polishing**: Improve sentence rhythm, word choice, and flow
2. **Show vs tell**: Convert telling passages into vivid, sensory scenes
3. **Dialogue**: Sharpen character voices and remove on-the-nose exchanges
4. **Pacing**: Trim slow sections, expand rushed moments
5. **Consistency**: Ensure character behaviour and lore details are accurate

Preserve the author's voice and the core story beats. Return the full rewritten chapter text.`,

    custom: `You are a helpful AI assistant. Follow the instructions provided and assist with the writing task.`,

    lore_writer: `You are a lorebook entry creator for a fiction writing tool. Your job is to generate a single, well-structured lorebook entry from a seed concept provided by the user.

Output ONLY a single JSON object wrapped in a \`\`\`json code fence — no prose, no commentary, nothing else.

The JSON object must use these fields:
- "name": string (required) — the entry's primary name
- "category": one of "character" | "location" | "item" | "event" | "note" | "synopsis" | "starting scenario" | "timeline" (required)
- "description": string (required) — rich, detailed description covering all relevant aspects
- "tags": string[] — keywords for matching this entry in context (include aliases, related terms)
- "metadata": object (optional) — may include:
  - "type": string (e.g. "Protagonist", "Villain", "Capital City", "Weapon")
  - "importance": "major" | "minor" | "background"
  - "status": "active" | "inactive" | "historical"

Write a description that is vivid and specific. Use the aspects the user requests or the template guidance they provide. Do not pad with generic filler.`,

    lore_refiner: `You are a lorebook entry editor for a fiction writing tool. You will receive an existing lorebook entry as your prior output, and the user will give you instructions to refine it.

Output ONLY the updated JSON object wrapped in a \`\`\`json code fence — no prose, no commentary, nothing else.

Use the same field structure as the entry you received:
- "name": string (required)
- "category": one of "character" | "location" | "item" | "event" | "note" | "synopsis" | "starting scenario" | "timeline" (required)
- "description": string (required)
- "tags": string[]
- "metadata": object (optional) with "type", "importance", "status"

Preserve existing content that the user does not ask you to change. Apply the user's refinement instructions precisely. Return the complete updated entry, not just the changed fields.`,

    judge_aggregator: `You are a judge aggregator for fiction writing. Your job is to review the outputs from multiple judge agents (lore judge, continuity checker, etc.) and produce a single clear verdict.

Rules:
- If ALL judges found no issues (each returned CONSISTENT or similar): respond with only: PASS
- If ANY judge found issues: respond with ISSUES_FOUND on the first line, then a concise, prioritised list of the problems to fix and how to fix them.

Format when issues exist:
ISSUES_FOUND
[Numbered list of issues, most critical first. For each: what is wrong and the suggested fix.]

Be concise and actionable. Merge duplicate issues from different judges. Omit style preferences — only flag factual contradictions and continuity errors.
Do NOT use the word "issue" outside of the ISSUES_FOUND block.`
};

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

    // Bulk Operations
    bulkUpdateAgentPresets: (ids: string[], data: Partial<AgentPreset>) => Promise<void>;
    bulkUpdateAgentModel: (ids: string[], model: AllowedModel) => Promise<void>;
    bulkUpdatePipelinePresets: (ids: string[], data: Partial<PipelinePreset>) => Promise<void>;

    // Utility
    createDefaultAgentPreset: (role: AgentRole, model: AllowedModel, storyId?: string | null) => Promise<AgentPreset>;
    resetSystemDefaults: (storyId?: string | null) => Promise<void>;
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
    resetSystemDefaults: async (storyId?: string | null) => {
        set({ isLoadingPresets: true, isLoadingPipelines: true });
        try {
            await seedSystemAgents(true);
            await get().loadAgentPresets(storyId);
            await get().loadPipelinePresets(storyId);
        } catch (error) {
            console.error('[AgentsStore] Failed to reset system defaults:', error);
            set({ isLoadingPresets: false, isLoadingPipelines: false });
            throw error;
        }
    },

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
            chapter_reviewer: 'Chapter Reviewer',
            chapter_editor: 'Chapter Editor',
            lore_writer: 'Lore Writer',
            lore_refiner: 'Lore Refiner',
            judge_aggregator: 'Judge Aggregator',
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

    // Bulk update multiple agents with partial data
    bulkUpdateAgentPresets: async (ids, data) => {
        await db.agentPresets.bulkUpdate(
            ids.map(id => ({ key: id, changes: data }))
        );
        set(state => ({
            agentPresets: state.agentPresets.map(p =>
                ids.includes(p.id) ? { ...p, ...data } : p
            )
        }));
    },

    // Bulk update agent model
    bulkUpdateAgentModel: async (ids, model) => {
        await db.agentPresets.bulkUpdate(
            ids.map(id => ({ key: id, changes: { model } }))
        );
        set(state => ({
            agentPresets: state.agentPresets.map(p =>
                ids.includes(p.id) ? { ...p, model } : p
            )
        }));
    },

    // Bulk update multiple pipelines with partial data
    bulkUpdatePipelinePresets: async (ids, data) => {
        await db.pipelinePresets.bulkUpdate(
            ids.map(id => ({ key: id, changes: data }))
        );
        set(state => ({
            pipelinePresets: state.pipelinePresets.map(p =>
                ids.includes(p.id) ? { ...p, ...data } : p
            )
        }));
    },
}));
