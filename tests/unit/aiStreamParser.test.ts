import { describe, expect, test } from "vitest";

import { aiService } from "@/services/ai/AIService";

describe("AIService.processStreamedResponse", () => {
  test("buffers SSE data lines split across chunks", async () => {
    const encoder = new TextEncoder();
    const chunks = [
      'data: {"choices":[{"delta":{"content":"Hel',
      'lo"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      "data: [DONE]\n\n",
    ];
    const response = new Response(new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
        controller.close();
      },
    }));

    let text = "";
    let completeCount = 0;
    await aiService.processStreamedResponse(
      response,
      (token) => {
        text += token;
      },
      () => {
        completeCount += 1;
      },
      (error) => {
        throw error;
      }
    );

    expect(text).toBe("Hello world");
    expect(completeCount).toBe(1);
  });

  test("accepts non-delta text fields from OpenAI-compatible streams", async () => {
    const encoder = new TextEncoder();
    const response = new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"text":"fallback"}]}\n\n'));
        controller.close();
      },
    }));

    let text = "";
    await aiService.processStreamedResponse(
      response,
      (token) => {
        text += token;
      },
      () => undefined,
      (error) => {
        throw error;
      }
    );

    expect(text).toBe("fallback");
  });

  test("accepts reasoning content from local reasoning model streams", async () => {
    const encoder = new TextEncoder();
    const response = new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"reasoning_content":"visible local output"}}]}\n\n'));
        controller.close();
      },
    }));

    let text = "";
    await aiService.processStreamedResponse(
      response,
      (token) => {
        text += token;
      },
      () => undefined,
      (error) => {
        throw error;
      }
    );

    expect(text).toBe("visible local output");
  });
});
