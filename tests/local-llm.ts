import { expect, type Page } from "@playwright/test";

export type LocalLlmModel = {
  id: string;
  name: string;
};

const DEFAULT_HEALTH_URL = "http://localhost:1234/api/v1/models";
const PAID_PROVIDER_HOSTS = [
  "api.openai.com",
  "openrouter.ai",
  "nano-gpt.com",
  "generativelanguage.googleapis.com",
  "aiplatform.googleapis.com",
];

export function getLocalLlmHealthUrl(): string {
  return process.env.LOCAL_LLM_HEALTH_URL || DEFAULT_HEALTH_URL;
}

export function getLocalLlmApiUrl(): string {
  return process.env.LOCAL_LLM_API_URL || "http://localhost:1234/v1";
}

export async function fetchLocalLlmModel(): Promise<LocalLlmModel> {
  const healthUrl = getLocalLlmHealthUrl();
  const response = await fetchWithTimeout(healthUrl, 5_000);

  expect(response.ok, `LM Studio health check failed: ${response.status} ${response.statusText}`).toBe(true);

  const data = await response.json();
  const models = extractModels(data);

  expect(models.length, `LM Studio returned no models from ${healthUrl}`).toBeGreaterThan(0);

  const model = models[0];
  const id = String(model.id || "");
  expect(id, "LM Studio model entry did not include an id or name").not.toBe("");

  return {
    id,
    name: String(model.name || id),
  };
}

export async function installPaidProviderGuard(page: Page) {
  const blockedUrls: string[] = [];

  await page.route("**/*", async (route) => {
    const url = route.request().url();
    const hostname = safeHostname(url);

    if (hostname && PAID_PROVIDER_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
      blockedUrls.push(url);
      await route.abort("blockedbyclient");
      return;
    }

    await route.continue();
  });

  return {
    getBlockedUrls: () => [...blockedUrls],
  };
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } catch (error) {
    throw new Error(
      `LM Studio is not reachable at ${url}. Start LM Studio's local server and load a model before running local LLM E2E tests. ${String(error)}`
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

function safeHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function extractModels(data: any): LocalLlmModel[] {
  if (Array.isArray(data?.models)) {
    const loadedLlmModels = data.models
      .filter((model: any) => model?.type === "llm")
      .flatMap((model: any) => {
        const instances = Array.isArray(model.loaded_instances) ? model.loaded_instances : [];
        return instances.map((instance: any) => ({
          id: String(instance.id || model.key || model.id || model.name || ""),
          name: String(model.display_name || model.name || model.key || instance.id || ""),
        }));
      })
      .filter((model: LocalLlmModel) => model.id);

    if (loadedLlmModels.length > 0) {
      return loadedLlmModels;
    }

    return data.models
      .filter((model: any) => model?.type === "llm")
      .map((model: any) => ({
        id: String(model.key || model.id || model.name || ""),
        name: String(model.display_name || model.name || model.key || ""),
      }))
      .filter((model: LocalLlmModel) => model.id);
  }

  const openAiModels = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data)
      ? data
      : [];

  return openAiModels
    .map((model: any) => ({
      id: String(model.id || model.name || ""),
      name: String(model.name || model.id || ""),
    }))
    .filter((model: LocalLlmModel) => model.id);
}
