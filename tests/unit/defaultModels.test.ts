import { describe, expect, test } from "vitest";

import {
  LOCAL_DEFAULT_MODEL,
  expandPromptAllowedModels,
  getConfiguredLocalDefaultModelId,
  getSelectableModelsWithLocalDefault,
  resolveSavedDefaultModel,
} from "@/features/ai/utils/defaultModels";
import type { AISettings } from "@/types/story";

const settings: AISettings = {
  id: "settings",
  createdAt: new Date("2026-01-01"),
  availableModels: [
    {
      id: "local/qwen3-14b",
      name: "Qwen3 14B",
      provider: "local",
      contextLength: 32768,
      enabled: true,
    },
    {
      id: "local/mistral-small",
      name: "Mistral Small",
      provider: "local",
      contextLength: 32768,
      enabled: true,
    },
    {
      id: "openrouter/test-model",
      name: "Hosted Test",
      provider: "openrouter",
      contextLength: 32768,
      enabled: true,
    },
  ],
};

describe("default model helpers", () => {
  test("expands legacy local prompt allowance into local default plus concrete local models", () => {
    expect(expandPromptAllowedModels([{ id: "local", name: "local", provider: "local" }], settings)).toEqual([
      LOCAL_DEFAULT_MODEL,
      { id: "local/qwen3-14b", name: "Qwen3 14B", provider: "local" },
      { id: "local/mistral-small", name: "Mistral Small", provider: "local" },
    ]);
  });

  test("keeps explicit local model choices specific", () => {
    expect(expandPromptAllowedModels([
      { id: "local/qwen3-14b", name: "Old Name", provider: "local" },
    ], settings)).toEqual([
      { id: "local/qwen3-14b", name: "Qwen3 14B", provider: "local" },
    ]);
  });

  test("adds local default once to model picker options", () => {
    expect(getSelectableModelsWithLocalDefault([
      {
        id: "local",
        name: "Local Model",
        provider: "local",
        contextLength: 32768,
        enabled: true,
      },
      ...settings.availableModels,
    ]).map((model) => model.id)).toEqual([
      "local",
      "local/qwen3-14b",
      "local/mistral-small",
      "openrouter/test-model",
    ]);
  });

  test("resolves saved local sentinel as the local default alias", () => {
    expect(resolveSavedDefaultModel(settings, "local")).toEqual(LOCAL_DEFAULT_MODEL);
  });

  test("returns the runtime-scoped local default as a concrete local id", () => {
    expect(getConfiguredLocalDefaultModelId({
      ...settings,
      localRuntime: "lm_studio",
      localModelIdByRuntime: { lm_studio: "qwen3-14b" },
    })).toBe("local/qwen3-14b");
  });
});
