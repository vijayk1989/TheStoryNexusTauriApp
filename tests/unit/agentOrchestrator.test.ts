import { beforeEach, describe, expect, test, vi } from "vitest";

import { isProseAgentRole } from "@/features/agents/utils/agentRoles";
import { SYSTEM_PIPELINE_PRESETS } from "@/features/agents/services/agentSeeder";
import { aiService } from "@/services/ai/AIService";
import { agentOrchestrator, type ExecutablePipelineStep } from "@/services/ai/AgentOrchestrator";
import type { AgentPreset, AgentRole } from "@/types/story";

vi.mock("@/services/ai/AIService", () => {
  const aiServiceMock = {
    generateWithLocalModel: vi.fn(),
    generateWithOpenAI: vi.fn(),
    generateWithOpenRouter: vi.fn(),
    generateWithOpenAICompatible: vi.fn(),
    generateWithNanoGPT: vi.fn(),
    abortStream: vi.fn(),
    processStreamedResponse: vi.fn(async (
      response: Response,
      onToken: (token: string) => void,
      onComplete?: () => void,
      onError?: (error: Error) => void
    ) => {
      try {
        onToken(await response.text());
        onComplete?.();
      } catch (error) {
        onError?.(error as Error);
      }
    }),
  };

  return { aiService: aiServiceMock };
});

describe("AgentOrchestrator", () => {
  beforeEach(() => {
    vi.mocked(aiService.generateWithOpenRouter).mockReset();
    vi.mocked(aiService.processStreamedResponse).mockClear();
  });

  test("executes a revision step before considering its retry jump", async () => {
    queueModelOutputs("Draft prose", "ISSUE: Fix the dagger.", "Revised prose");

    const result = await agentOrchestrator.executePipeline(
      [
        step(agent("prose_writer")),
        step(agent("lore_judge")),
        step(agent("prose_writer"), {
          condition: "roleOutputContains:lore_judge:ISSUE",
          isRevision: true,
          retryFromStep: 1,
          maxIterations: 1,
        }),
      ],
      { scenebeat: "Write the scene." }
    );

    expect(result.steps.map((resultStep) => resultStep.role)).toEqual([
      "prose_writer",
      "lore_judge",
      "prose_writer",
    ]);
    expect(result.proseOutput).toBe("Revised prose");
    expect(result.displayOutput).toBe("Revised prose");
    expect(result.outputKind).toBe("prose");
  });

  test("uses the latest judge result when looping through revisions", async () => {
    queueModelOutputs(
      "Draft prose",
      "ISSUE: First pass.",
      "Revised prose one",
      "ISSUE: Second pass.",
      "Revised prose two"
    );

    const result = await agentOrchestrator.executePipeline(
      [
        step(agent("prose_writer")),
        step(agent("lore_judge")),
        step(agent("prose_writer"), {
          condition: "roleOutputContains:lore_judge:ISSUE",
          isRevision: true,
          retryFromStep: 1,
          maxIterations: 2,
        }),
      ],
      { scenebeat: "Write the scene." }
    );

    expect(result.steps.map((resultStep) => resultStep.output)).toEqual([
      "Draft prose",
      "ISSUE: First pass.",
      "Revised prose one",
      "ISSUE: Second pass.",
      "Revised prose two",
    ]);
    expect(result.proseOutput).toBe("Revised prose two");
  });

  test("does not treat explicit no-issue judge output as an issue", async () => {
    queueModelOutputs("Draft prose", "NO ISSUE FOUND");

    const result = await agentOrchestrator.executePipeline(
      [
        step(agent("prose_writer")),
        step(agent("lore_judge")),
        step(agent("prose_writer"), {
          condition: "roleOutputContains:lore_judge:ISSUE",
          isRevision: true,
        }),
      ],
      { scenebeat: "Write the scene." }
    );

    expect(result.steps).toHaveLength(2);
    expect(result.proseOutput).toBe("Draft prose");
    expect(result.displayOutput).toBe("NO ISSUE FOUND");
    expect(result.outputKind).toBe("non_prose");
  });

  test("passes latest prose and judge feedback to the final style editor", async () => {
    queueModelOutputs("Draft prose", "ISSUE: Restore the sword.", "Polished prose");

    const result = await agentOrchestrator.executePipeline(
      [
        step(agent("prose_writer")),
        step(agent("lore_judge")),
        step(agent("style_editor")),
      ],
      { scenebeat: "Write the scene." }
    );

    const stylePrompt = result.steps[2].promptSent?.[1]?.content || "";
    expect(stylePrompt).toContain("Draft prose");
    expect(stylePrompt).toContain("ISSUE: Restore the sword.");
    expect(result.displayOutput).toBe("Polished prose");
  });
});

describe("system agent pipelines", () => {
  test("keeps system pipelines simple and prose-ending", () => {
    expect(SYSTEM_PIPELINE_PRESETS).toHaveLength(3);

    for (const pipeline of SYSTEM_PIPELINE_PRESETS) {
      const finalStep = pipeline.agentRoles[pipeline.agentRoles.length - 1];
      expect(finalStep, pipeline.name).toBeTruthy();
      expect(isProseAgentRole(finalStep?.role), pipeline.name).toBe(true);
    }
  });
});

function queueModelOutputs(...outputs: string[]): void {
  const queued = [...outputs];
  vi.mocked(aiService.generateWithOpenRouter).mockImplementation(async () => {
    return new Response(queued.shift() ?? "");
  });
}

function agent(role: AgentRole): AgentPreset {
  return {
    id: `agent-${role}`,
    createdAt: new Date(),
    name: role,
    role,
    model: { id: "mock-model", name: "Mock Model", provider: "openrouter" },
    systemPrompt: `System prompt for ${role}`,
    temperature: 0.2,
    maxTokens: 256,
  };
}

function step(agentPreset: AgentPreset, overrides: Partial<ExecutablePipelineStep> = {}): ExecutablePipelineStep {
  return {
    agent: agentPreset,
    ...overrides,
  };
}
