import { db } from '@/services/database';
import type { AgentPreset, PipelinePreset, AgentRole } from '@/types/story';

// Default models for system agents (OpenRouter)
const DEFAULT_MODELS = {
    // Low-cost models for utility tasks
    utility: {
        id: 'z-ai/glm-4-flash',
        provider: 'openrouter' as const,
        name: 'Z.AI: GLM-4 Flash',
    },
    // Main creative model
    creative: {
        id: 'deepseek/deepseek-chat-v3-0324',
        provider: 'openrouter' as const,
        name: 'DeepSeek: DeepSeek V3 0324',
    },
};

// System agent presets with template variables
const SYSTEM_AGENT_PRESETS: Omit<AgentPreset, 'id' | 'createdAt'>[] = [
    {
        name: 'System Summarizer',
        description: 'Condenses story content while preserving key narrative details. Uses low-cost model.',
        role: 'summarizer',
        model: DEFAULT_MODELS.utility,
        systemPrompt: `You are a narrative summarizer for fiction writing. Your job is to condense story content while preserving:
- Key plot points and events in chronological order
- Character emotions, motivations, and relationships
- Important dialogue and its context
- Setting details and atmosphere
- Foreshadowing, subtext, and thematic elements

Output a concise but detailed summary that captures the essence of the narrative. Aim for about 20% of the original length while keeping all critical story beats.`,
        temperature: 0.3,
        maxTokens: 2000,
        isSystem: true,
        storyId: null,
    },
    {
        name: 'System Prose Writer',
        description: 'Main creative writing agent for generating story prose.',
        role: 'prose_writer',
        model: DEFAULT_MODELS.creative,
        systemPrompt: `You are a skilled fiction writer. Your task is to continue the story based on the provided context and scene beat instructions.

Guidelines:
- Maintain consistent tone, style, and narrative voice
- Show, don't tell - use sensory details and action
- Keep characters' voices distinct and authentic
- Balance dialogue, action, and internal reflection
- Create smooth transitions and natural pacing
- Honor the established world-building and lore

Write engaging prose that draws readers in and advances the story naturally.`,
        temperature: 0.85,
        maxTokens: 2048,
        isSystem: true,
        storyId: null,
    },
    {
        name: 'System Lore Judge',
        description: 'Validates generated prose against lorebook data for consistency.',
        role: 'lore_judge',
        model: DEFAULT_MODELS.utility,
        systemPrompt: `You are a lore consistency checker for fiction writing. Compare the provided prose against the established lorebook data.

Check for:
- Character names, traits, and behavior consistency
- Location and setting accuracy
- Timeline and chronological consistency
- Magic system, technology, or world-building rule violations
- Relationship dynamics matching established patterns
- Factual contradictions with established lore

Response format:
- If everything is consistent, respond with exactly: CONSISTENT
- If there are issues, list each one briefly:
  ISSUE: [Brief description of the inconsistency]
  SUGGESTION: [How to fix it]

Be thorough but concise. Focus on actual contradictions, not stylistic preferences.`,
        temperature: 0.2,
        maxTokens: 800,
        isSystem: true,
        storyId: null,
    },
    {
        name: 'System Continuity Checker',
        description: 'Checks for plot holes and character consistency.',
        role: 'continuity_checker',
        model: DEFAULT_MODELS.utility,
        systemPrompt: `You are a continuity expert for fiction writing. Check for plot holes, timeline issues, and character consistency.

Review for:
- Timeline inconsistencies (events happening out of order)
- Character behavior that contradicts established patterns
- Forgotten plot threads or unresolved setups
- Physical impossibilities (character in two places at once)
- Emotional continuity (reactions matching previous scenes)

Response format:
- If consistent, respond with exactly: CONSISTENT
- If there are issues:
  CONTINUITY ISSUE: [Description]
  CONTEXT: [What was established earlier]
  SUGGESTION: [How to resolve]

Focus on narrative logic, not style preferences.`,
        temperature: 0.2,
        maxTokens: 600,
        isSystem: true,
        storyId: null,
    },
    {
        name: 'System Style Editor',
        description: 'Polishes prose for style, flow, and readability.',
        role: 'style_editor',
        model: DEFAULT_MODELS.creative,
        systemPrompt: `You are a prose editor focused on style and flow. Polish the provided text while maintaining the author's voice.

Focus on:
- Sentence variety and rhythm
- Word choice precision and impact
- Paragraph flow and transitions
- Show vs tell balance
- Eliminating redundancy and weak phrases
- Strengthening imagery and sensory details

Preserve the original meaning, plot, and character voice. Output the improved version directly without commentary.`,
        temperature: 0.6,
        maxTokens: 2048,
        isSystem: true,
        storyId: null,
    },
    {
        name: 'System Dialogue Specialist',
        description: 'Improves dialogue authenticity and character voice.',
        role: 'dialogue_specialist',
        model: DEFAULT_MODELS.creative,
        systemPrompt: `You are a dialogue specialist for fiction. Improve conversations to feel more natural and authentic.

Focus on:
- Giving each character a distinct voice and speech pattern
- Natural interruptions, pauses, and reactions
- Subtext and what's left unsaid
- Appropriate use of contractions and informal speech
- Varying dialogue tags (said, asked, etc.) or eliminating them
- Balance between dialogue and action beats

Output the improved version directly. Preserve the original plot points and character relationships.`,
        temperature: 0.7,
        maxTokens: 2048,
        isSystem: true,
        storyId: null,
    },
];

// System pipeline presets
const SYSTEM_PIPELINE_PRESETS: {
    name: string;
    description: string;
    agentRoles: { 
        role: AgentRole; 
        condition?: string; 
        streamOutput?: boolean;
        isRevision?: boolean;
        maxIterations?: number;
    }[];
}[] = [
    {
        name: 'Quality Prose with Lore Check',
        description: 'Writes prose, validates against lorebook. Streams the prose output.',
        agentRoles: [
            { role: 'summarizer', condition: 'wordCount > 3000' },
            { role: 'prose_writer', streamOutput: true },
            { role: 'lore_judge' },
        ],
    },
    {
        name: 'Quality Prose with Revision',
        description: 'Writes prose, checks lore, revises if issues found. Best quality for lore-heavy stories.',
        agentRoles: [
            { role: 'summarizer', condition: 'wordCount > 3000' },
            { role: 'prose_writer', streamOutput: true },
            { role: 'lore_judge' },
            // Revision step: only runs if lore judge found issues
            { role: 'prose_writer', condition: 'roleOutputContains:lore_judge:ISSUE', isRevision: true, streamOutput: true },
        ],
    },
    {
        name: 'Polished Output',
        description: 'Writes prose then polishes for style. Good for final-draft quality.',
        agentRoles: [
            { role: 'prose_writer' },
            { role: 'style_editor', streamOutput: true },
        ],
    },
    {
        name: 'Full Quality Pipeline',
        description: 'Summarize → Write → Lore Check → Revise if needed. Maximum quality.',
        agentRoles: [
            { role: 'summarizer', condition: 'wordCount > 3000' },
            { role: 'prose_writer', streamOutput: true },
            { role: 'lore_judge' },
            { role: 'continuity_checker' },
            // Revision step: runs if either judge found issues
            { role: 'prose_writer', condition: 'previousOutputContains:ISSUE', isRevision: true, streamOutput: true },
        ],
    },
    {
        name: 'Quick Draft',
        description: 'Direct prose generation without validation. Fast but no quality checks.',
        agentRoles: [
            { role: 'prose_writer', streamOutput: true },
        ],
    },
    {
        name: 'Dialogue Polish',
        description: 'Writes prose then improves dialogue. Good for dialogue-heavy scenes.',
        agentRoles: [
            { role: 'prose_writer' },
            { role: 'dialogue_specialist', streamOutput: true },
        ],
    },
];

// Simple lock to prevent concurrent seeding
let seedingInProgress = false;

/**
 * Seeds system agent presets and pipelines into the database.
 * Only creates them if they don't already exist (checks by name for uniqueness).
 */
export async function seedSystemAgents(): Promise<void> {
    // Prevent concurrent seeding
    if (seedingInProgress) {
        console.log('[AgentSeeder] Seeding already in progress, skipping...');
        return;
    }
    
    seedingInProgress = true;
    
    try {
        console.log('[AgentSeeder] Checking for system agents...');

        // Get existing system agents and pipelines by name for uniqueness check
        const existingAgents = await db.agentPresets
            .filter(a => a.isSystem === true)
            .toArray();
        const existingAgentNames = new Set(existingAgents.map(a => a.name));

        const existingPipelines = await db.pipelinePresets
            .filter(p => p.isSystem === true)
            .toArray();
        const existingPipelineNames = new Set(existingPipelines.map(p => p.name));

        // Create agent lookup by role (for existing agents)
        const existingAgentsByRole = existingAgents.reduce((acc, agent) => {
            acc[agent.role] = agent;
            return acc;
        }, {} as Record<AgentRole, AgentPreset>);

        // Create system agent presets (only if not already exists by name)
        const createdAgents: AgentPreset[] = [];
        for (const preset of SYSTEM_AGENT_PRESETS) {
            if (existingAgentNames.has(preset.name)) {
                console.log(`[AgentSeeder] Agent already exists: ${preset.name}`);
                continue;
            }

            const agent: AgentPreset = {
                ...preset,
                id: crypto.randomUUID(),
                createdAt: new Date(),
            };
            await db.agentPresets.add(agent);
            createdAgents.push(agent);
            console.log(`[AgentSeeder] Created system agent: ${agent.name}`);
        }

        if (createdAgents.length === 0 && existingAgents.length > 0) {
            console.log('[AgentSeeder] All system agents already exist.');
        }

        // Merge existing and new agents for pipeline creation
        const allAgentsByRole = { ...existingAgentsByRole };
        for (const agent of createdAgents) {
            allAgentsByRole[agent.role] = agent;
        }

        // Create system pipeline presets (only if not already exists by name)
        let pipelinesCreated = 0;
        for (const pipelineConfig of SYSTEM_PIPELINE_PRESETS) {
            if (existingPipelineNames.has(pipelineConfig.name)) {
                console.log(`[AgentSeeder] Pipeline already exists: ${pipelineConfig.name}`);
                continue;
            }

            const steps = pipelineConfig.agentRoles.map((stepConfig, index) => {
                const agent = allAgentsByRole[stepConfig.role];
                if (!agent) {
                    console.warn(`[AgentSeeder] No agent found for role: ${stepConfig.role}`);
                    return null;
                }
                return {
                    agentPresetId: agent.id,
                    order: index,
                    condition: stepConfig.condition,
                    streamOutput: stepConfig.streamOutput ?? false,
                    isRevision: stepConfig.isRevision ?? false,
                    maxIterations: stepConfig.maxIterations,
                };
            }).filter(Boolean) as PipelinePreset['steps'];

            const pipeline: PipelinePreset = {
                id: crypto.randomUUID(),
                name: pipelineConfig.name,
                description: pipelineConfig.description,
                steps,
                isSystem: true,
                storyId: null,
                createdAt: new Date(),
            };

            await db.pipelinePresets.add(pipeline);
            pipelinesCreated++;
            console.log(`[AgentSeeder] Created system pipeline: ${pipeline.name}`);
        }

        if (pipelinesCreated === 0 && existingPipelines.length > 0) {
            console.log('[AgentSeeder] All system pipelines already exist.');
        }

        console.log('[AgentSeeder] Seeding complete!');
    } finally {
        seedingInProgress = false;
    }
}

/**
 * Removes duplicate system agents and pipelines, keeping only the first of each name.
 */
export async function cleanupDuplicateSystemPresets(): Promise<{ agentsRemoved: number; pipelinesRemoved: number }> {
    console.log('[AgentSeeder] Cleaning up duplicate system presets...');

    let agentsRemoved = 0;
    let pipelinesRemoved = 0;

    // Clean up duplicate agents
    const allSystemAgents = await db.agentPresets
        .filter(a => a.isSystem === true)
        .toArray();
    
    const seenAgentNames = new Set<string>();
    for (const agent of allSystemAgents) {
        if (seenAgentNames.has(agent.name)) {
            await db.agentPresets.delete(agent.id);
            agentsRemoved++;
            console.log(`[AgentSeeder] Removed duplicate agent: ${agent.name}`);
        } else {
            seenAgentNames.add(agent.name);
        }
    }

    // Clean up duplicate pipelines
    const allSystemPipelines = await db.pipelinePresets
        .filter(p => p.isSystem === true)
        .toArray();
    
    const seenPipelineNames = new Set<string>();
    for (const pipeline of allSystemPipelines) {
        if (seenPipelineNames.has(pipeline.name)) {
            await db.pipelinePresets.delete(pipeline.id);
            pipelinesRemoved++;
            console.log(`[AgentSeeder] Removed duplicate pipeline: ${pipeline.name}`);
        } else {
            seenPipelineNames.add(pipeline.name);
        }
    }

    console.log(`[AgentSeeder] Cleanup complete. Removed ${agentsRemoved} agents and ${pipelinesRemoved} pipelines.`);
    return { agentsRemoved, pipelinesRemoved };
}

/**
 * Gets the system agent preset for a given role.
 */
export async function getSystemAgent(role: AgentRole): Promise<AgentPreset | undefined> {
    return db.agentPresets
        .filter(a => a.isSystem === true && a.role === role)
        .first();
}

/**
 * Gets all system pipeline presets.
 */
export async function getSystemPipelines(): Promise<PipelinePreset[]> {
    return db.pipelinePresets
        .filter(p => p.isSystem === true)
        .toArray();
}
