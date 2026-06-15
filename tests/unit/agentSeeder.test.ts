import { beforeEach, describe, expect, test } from "vitest";

import {
  SYSTEM_PIPELINE_PRESETS,
  getSystemPipelines,
  seedSystemAgents,
} from "@/features/agents/services/agentSeeder";
import { isProseAgentRole } from "@/features/agents/utils/agentRoles";
import { db } from "@/services/database";
import type { PipelinePreset } from "@/types/story";
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
