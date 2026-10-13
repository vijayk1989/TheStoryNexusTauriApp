import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { aiService } from "@/services/ai/AIService";
import { db } from "@/services/database";

function streamResponse(text: string): Response {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });

  return new Response(body, { status: 200 });
}

describe("AIService.testLocalDefaultModel", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let service: any;

  beforeEach(() => {
    service = aiService as any;
    service.settings = {
      id: "settings",
      createdAt: new Date(),
      localRuntime: "lm_studio",
      localApiUrl: "http://localhost:1234/v1",
      localModelsUrl: "http://localhost:1234/v1/models",
      localModelIdByRuntime: { lm_studio: "gemma-3" },
      availableModels: [
        {
          id: "local/gemma-3",
          name: "Gemma 3",
          provider: "local",
          contextLength: 32768,
          enabled: true,
        },
      ],
    };
    service.abortController = null;

    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    service.settings = null;
    service.abortController = null;
    await db.aiSettings.clear();
  });

  test("sends a simple prompt to the configured local default model", async () => {
    fetchMock.mockResolvedValue(streamResponse([
      'data: {"choices":[{"delta":{"content":"local test ok"}}]}',
      "",
      "data: [DONE]",
      "",
    ].join("\n")));

    await expect(aiService.testLocalDefaultModel()).resolves.toBe("local test ok");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:1234/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string)).toMatchObject({
      model: "gemma-3",
      stream: true,
      temperature: 0,
      max_tokens: 4096,
      reasoning: { effort: "none" },
      reasoning_effort: "none",
      messages: [
        { role: "user", content: "Reply with exactly this text: local test ok" },
      ],
    });
  });

  test("surfaces local API error responses", async () => {
    fetchMock.mockResolvedValue(new Response("no model loaded", {
      status: 503,
      statusText: "Service Unavailable",
    }));

    await expect(aiService.testLocalDefaultModel()).rejects.toThrow(
      "Local AI test failed (503 Service Unavailable): no model loaded"
    );
  });

  test("resolves the local default sentinel to the configured runtime model", async () => {
    fetchMock.mockResolvedValue(streamResponse("data: [DONE]\n\n"));

    await aiService.generateWithLocalModel(
      [{ role: "user", content: "Write a line." }],
      0.7,
      128,
      undefined,
      undefined,
      undefined,
      undefined,
      "local"
    );

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string)).toMatchObject({
      model: "gemma-3",
    });
    expect(aiService.getGenerationModel({ id: "local", name: "Local default", provider: "local" })).toEqual({
      id: "local/gemma-3", name: "Gemma 3", provider: "local",
    });
  });

  test("omits temperature when prompt temperature is disabled", async () => {
    fetchMock.mockResolvedValue(streamResponse("data: [DONE]\n\n"));

    await aiService.generateWithLocalModel(
      [{ role: "user", content: "Write a line." }],
      undefined,
      128,
      undefined,
      undefined,
      undefined,
      undefined,
      "local"
    );

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string)).not.toHaveProperty("temperature");
  });

  test("sends experimental reasoning controls only when requested", async () => {
    fetchMock.mockResolvedValue(streamResponse("data: [DONE]\n\n"));

    await aiService.generateWithLocalModel(
      [{ role: "user", content: "Write a line." }],
      0.7,
      128,
      undefined,
      undefined,
      undefined,
      undefined,
      "local",
      { enabled: true, useReasoning: false }
    );

    let request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string)).toMatchObject({
      reasoning: { effort: "none" },
      reasoning_effort: "none",
    });

    await aiService.generateWithLocalModel(
      [{ role: "user", content: "Write a line." }],
      0.7,
      128,
      undefined,
      undefined,
      undefined,
      undefined,
      "local",
      { enabled: false, useReasoning: false }
    );

    request = fetchMock.mock.calls[1][1] as RequestInit;
    const body = JSON.parse(request.body as string);
    expect(body).not.toHaveProperty("reasoning");
    expect(body).not.toHaveProperty("reasoning_effort");
  });

  test("can refresh service settings after defaults are updated in IndexedDB", async () => {
    await db.aiSettings.clear();
    await db.aiSettings.add({
      ...service.settings,
      localModelIdByRuntime: { lm_studio: "old-model" },
    });

    await db.aiSettings.update("settings", {
      localModelIdByRuntime: { lm_studio: "gemma-3" },
    });

    service.settings = {
      ...service.settings,
      localModelIdByRuntime: { lm_studio: "old-model" },
    };

    await aiService.refreshSettingsFromDatabase();
    fetchMock.mockResolvedValue(streamResponse("data: [DONE]\n\n"));

    await aiService.generateWithLocalModel(
      [{ role: "user", content: "Write a line." }],
      0.7,
      128,
      undefined,
      undefined,
      undefined,
      undefined,
      "local"
    );

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string)).toMatchObject({
      model: "gemma-3",
    });
  });
});
