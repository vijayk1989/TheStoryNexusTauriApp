import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/database", () => ({
  db: {
    aiSettings: {
      toArray: vi.fn(),
      update: vi.fn(),
      add: vi.fn(),
      get: vi.fn(),
    },
    prompts: {
      get: vi.fn(),
    },
  },
}));

import { db } from "@/services/database";
import { aiService } from "./AIService";

type MockedAiDb = {
  aiSettings: {
    toArray: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    add: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };
  prompts: {
    get: ReturnType<typeof vi.fn>;
  };
};

const mockedDb = db as unknown as MockedAiDb;

describe("AIService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedDb.aiSettings.toArray.mockResolvedValue([
      {
        id: "settings-1",
        createdAt: new Date("2026-02-16T00:00:00.000Z"),
        availableModels: [],
        localApiUrl: "http://localhost:1234/v1",
      },
    ]);
  });

  it("uses configured local endpoint and serializes generation options", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    await aiService.initialize();

    await aiService.generateWithLocalModel(
      [{ role: "user", content: "hello" }],
      0.7,
      128,
      0.9,
      40,
      1.1,
      0.1
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(init.body));

    expect(url).toBe("http://localhost:1234/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect(payload.temperature).toBe(0.7);
    expect(payload.max_tokens).toBe(128);
    expect(payload.top_p).toBe(0.9);
    expect(payload.top_k).toBe(40);
    expect(payload.repetition_penalty).toBe(1.1);
    expect(payload.min_p).toBe(0.1);
  });
});
