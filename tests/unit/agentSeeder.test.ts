import { beforeEach, describe, expect, test } from "vitest";

import {
  SYSTEM_PIPELINE_PRESETS,
  cleanupDuplicateSystemPresets,
  getSystemPipelines,
  seedSystemAgents,
} from "@/features/agents/services/agentSeeder";
import { isProseAgentRole } from "@/features/agents/utils/agentRoles";
import { db } from "@/services/database";
import type { AgentPreset, PipelinePreset } from "@/types/story";
import { resetTestDb } from "./testDb";

describe("agent seeding", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  test("seeds only the active system pipelines and keeps user pipelines", async () => {
    await db.pipelinePresets.bulkAdd([
      pipeline("obsolete-system-pipeline", "Full Quality Pipeline", true),
      pipeline("user-pipeline", "Full Quality Pipeline", false),
    ]);

    await seedSystemAgents();

    const activeNames = SYSTEM_PIPELINE_PRESETS.map((preset) => preset.name).sort();
    const seededSystemNames = (await getSystemPipelines()).map((preset) => preset.name).sort();

    expect(seededSystemNames).toEqual(activeNames);
    expect(await db.pipelinePresets.get("obsolete-system-pipeline")).toBeUndefined();
    expect(await db.pipelinePresets.get("user-pipeline")).toBeTruthy();
  });

  test("seeds system pipelines with existing agents and prose final steps", async () => {
    await seedSystemAgents();

    const agents = await db.agentPresets.filter((agentPreset) => agentPreset.isSystem === true).toArray();
    const agentsById = new Map(agents.map((agentPreset) => [agentPreset.id, agentPreset]));
    const pipelines = await getSystemPipelines();

    expect(pipelines).toHaveLength(3);

    for (const pipelinePreset of pipelines) {
      expect(pipelinePreset.steps.length, pipelinePreset.name).toBeGreaterThan(0);

      for (const pipelineStep of pipelinePreset.steps) {
        expect(agentsById.has(pipelineStep.agentPresetId), pipelinePreset.name).toBe(true);
      }

      const finalStep = [...pipelinePreset.steps].sort((a, b) => a.order - b.order).at(-1);
      const finalAgent = finalStep ? agentsById.get(finalStep.agentPresetId) : undefined;

      expect(isProseAgentRole(finalAgent?.role), pipelinePreset.name).toBe(true);
    }
  });

  test("remaps pipeline steps before deleting duplicate system agents", async () => {
    await seedSystemAgents();

    const originalAgent = await db.agentPresets
      .filter((agentPreset) => agentPreset.isSystem === true && agentPreset.name === "System Prose Writer")
      .first();
    expect(originalAgent).toBeTruthy();

    const duplicateAgent = agent({
      id: "duplicate-prose-writer",
      name: originalAgent!.name,
      role: originalAgent!.role,
    });
    await db.agentPresets.add(duplicateAgent);

    await db.pipelinePresets.add({
      ...pipeline("user-pipeline-with-duplicate-agent", "User Pipeline", false),
      steps: [{ agentPresetId: duplicateAgent.id, order: 0 }],
    });

    await cleanupDuplicateSystemPresets();

    const cleanedPipeline = await db.pipelinePresets.get("user-pipeline-with-duplicate-agent");
    expect(await db.agentPresets.get(duplicateAgent.id)).toBeUndefined();
    expect(cleanedPipeline?.steps[0]?.agentPresetId).toBe(originalAgent!.id);
  });

  test("repairs existing system pipelines with orphaned agent references", async () => {
    await seedSystemAgents();

    const quickDraft = await db.pipelinePresets
      .filter((pipelinePreset) => pipelinePreset.isSystem === true && pipelinePreset.name === "Quick Draft")
      .first();
    expect(quickDraft).toBeTruthy();

    await db.pipelinePresets.update(quickDraft!.id, {
      steps: [{ agentPresetId: "missing-agent-id", order: 0, streamOutput: true }],
    });

    await seedSystemAgents();

    const repairedPipeline = await db.pipelinePresets.get(quickDraft!.id);
    const repairedAgentId = repairedPipeline?.steps[0]?.agentPresetId;
    const repairedAgent = repairedAgentId ? await db.agentPresets.get(repairedAgentId) : undefined;

    expect(repairedAgentId).not.toBe("missing-agent-id");
    expect(repairedAgent?.role).toBe("prose_writer");
  });
});

function pipeline(id: string, name: string, isSystem: boolean): PipelinePreset {
  return {
    id,
    createdAt: new Date(),
    name,
    steps: [],
    isSystem,
    storyId: isSystem ? null : "unit-story",
  };
}

function agent(overrides: Pick<AgentPreset, "id" | "name" | "role">): AgentPreset {
  return {
    ...overrides,
    createdAt: new Date(),
    model: {
      id: "test-model",
      provider: "openrouter",
      name: "Test Model",
    },
    systemPrompt: "Test agent",
    temperature: 0.5,
    maxTokens: 1000,
    isSystem: true,
    storyId: null,
  };
}
