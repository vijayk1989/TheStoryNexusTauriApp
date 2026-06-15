import type { AgentPreset, AgentRole, PipelinePreset } from "@/types/story";

export const PROSE_AGENT_ROLES: readonly AgentRole[] = [
    "prose_writer",
    "style_editor",
    "dialogue_specialist",
    "expander",
];

export const JUDGE_AGENT_ROLES: readonly AgentRole[] = [
    "lore_judge",
    "continuity_checker",
    "refusal_checker",
];

export function isProseAgentRole(role?: AgentRole): boolean {
    return Boolean(role && PROSE_AGENT_ROLES.includes(role));
}

export function isJudgeAgentRole(role?: AgentRole): boolean {
    return Boolean(role && JUDGE_AGENT_ROLES.includes(role));
}

export function getPipelineFinalAgent(
    pipeline: Pick<PipelinePreset, "steps">,
    agents: AgentPreset[]
): AgentPreset | undefined {
    const orderedSteps = [...pipeline.steps].sort((a, b) => a.order - b.order);
    const finalStep = orderedSteps[orderedSteps.length - 1];
    if (!finalStep) return undefined;
    return agents.find((agent) => agent.id === finalStep.agentPresetId);
}

export function pipelineEndsWithProse(
    pipeline: Pick<PipelinePreset, "steps">,
    agents: AgentPreset[]
): boolean {
    return isProseAgentRole(getPipelineFinalAgent(pipeline, agents)?.role);
}
