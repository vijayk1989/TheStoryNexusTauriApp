import { describe, expect, test } from "vitest";

import {
  getLocalApiUrl,
  getLocalModelsUrl,
  normalizeLocalModels,
} from "@/services/ai/localRuntime";

describe("local runtime helpers", () => {
  test("uses LM Studio defaults when no runtime is configured", () => {
    expect(getLocalApiUrl()).toBe("http://localhost:1234/v1");
    expect(getLocalModelsUrl()).toBe("http://localhost:1234/v1/models");
  });

  test("uses Ollama native tags endpoint by default", () => {
    expect(getLocalApiUrl({ localRuntime: "ollama" })).toBe("http://localhost:11434/v1");
    expect(getLocalModelsUrl({ localRuntime: "ollama" })).toBe("http://localhost:11434/api/tags");
  });

  test("derives Ollama models URL when the base URL is customized", () => {
    expect(getLocalModelsUrl({
      localRuntime: "ollama",
      localApiUrl: "http://127.0.0.1:11435/v1",
    })).toBe("http://127.0.0.1:11435/api/tags");
  });

  test("normalizes OpenAI-compatible local model responses", () => {
    expect(normalizeLocalModels({
      data: [{ id: "gemma-3", context_length: 8192 }],
    }, "lm_studio")).toEqual([
      {
        id: "local/gemma-3",
        name: "gemma-3",
        provider: "local",
        contextLength: 8192,
        enabled: true,
      },
    ]);
  });

  test("normalizes Ollama tags responses", () => {
    expect(normalizeLocalModels({
      models: [{ name: "llama3.2:latest" }],
    }, "ollama")).toEqual([
      {
        id: "local/llama3.2:latest",
        name: "llama3.2",
        provider: "local",
        contextLength: 32768,
        enabled: true,
      },
    ]);
  });
});
