import { describe, expect, test } from "vitest";

import {
  getPipelineFinalAgent,
  isJudgeAgentRole,
  isProseAgentRole,
  pipelineEndsWithProse,
} from "@/features/agents/utils/agentRoles";
import type { AgentPreset, AgentRole, PipelinePreset } from "@/types/story";

describe("agent role helpers", () => {
  test("classifies prose and judge roles used by pipelines", () => {
    expect(isProseAgentRole("prose_writer")).toBe(true);
    expect(isProseAgentRole("style_editor")).toBe(true);
    expect(isProseAgentRole("dialogue_specialist")).toBe(true);
    expect(isProseAgentRole("expander")).toBe(true);
    expect(isProseAgentRole("lore_judge")).toBe(false);
    expect(isProseAgentRole(undefined)).toBe(false);

    expect(isJudgeAgentRole("lore_judge")).toBe(true);
    expect(isJudgeAgentRole("continuity_checker")).toBe(true);
    expect(isJudgeAgentRole("refusal_checker")).toBe(true);
    expect(isJudgeAgentRole("style_editor")).toBe(false);
    expect(isJudgeAgentRole(undefined)).toBe(false);
  });

  test("uses step order, not array order, to identify the final pipeline agent", () => {
    const proseWriter = agent("prose-writer", "prose_writer");
    const loreJudge = agent("lore-judge", "lore_judge");

    const pipeline = pipelineWithSteps([
      { agentPresetId: loreJudge.id, order: 2 },
      { agentPresetId: proseWriter.id, order: 1 },
    ]);

    expect(getPipelineFinalAgent(pipeline, [proseWriter, loreJudge])).toBe(loreJudge);
    expect(pipelineEndsWithProse(pipeline, [proseWriter, loreJudge])).toBe(false);
  });

  test("treats a prose final step as story output", () => {
    const proseWriter = agent("prose-writer", "prose_writer");
    const styleEditor = agent("style-editor", "style_editor");

    const pipeline = pipelineWithSteps([
      { agentPresetId: proseWriter.id, order: 0 },
      { agentPresetId: styleEditor.id, order: 1 },
    ]);

    expect(getPipelineFinalAgent(pipeline, [proseWriter, styleEditor])).toBe(styleEditor);
    expect(pipelineEndsWithProse(pipeline, [proseWriter, styleEditor])).toBe(true);
  });
});

function agent(id: string, role: AgentRole): AgentPreset {
  return {
    id,
    createdAt: new Date(),
    name: id,
    role,
    model: { id: "mock-model", name: "Mock Model", provider: "openrouter" },
    systemPrompt: `System prompt for ${role}`,
    temperature: 0.2,
    maxTokens: 256,
  };
}

function pipelineWithSteps(steps: PipelinePreset["steps"]): Pick<PipelinePreset, "steps"> {
  return { steps };
}
