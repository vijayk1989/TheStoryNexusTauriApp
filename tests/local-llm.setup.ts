import { test } from "@playwright/test";

import { fetchLocalLlmModel, getLocalLlmApiUrl, getLocalLlmHealthUrl } from "./local-llm";

test("LM Studio local server is reachable", async () => {
  const model = await fetchLocalLlmModel();

  console.log(`[local-llm] Health check: ${getLocalLlmHealthUrl()}`);
  console.log(`[local-llm] API base: ${getLocalLlmApiUrl()}`);
  console.log(`[local-llm] Selected model: ${model.id}`);
});
