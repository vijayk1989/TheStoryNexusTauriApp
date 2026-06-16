import { spawn } from "node:child_process";
import { resolve } from "node:path";

const healthUrl = process.env.LOCAL_LLM_HEALTH_URL || "http://localhost:1234/api/v1/models";
const runtimeLabel = process.env.LOCAL_LLM_RUNTIME || "LM Studio";

await assertLocalLlmReady(healthUrl);

const command = process.execPath;
const args = [
  resolve("node_modules/@playwright/test/cli.js"),
  "test",
  "tests/local-llm.spec.ts",
  "--project=local-llm",
];

const child = spawn(command, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    E2E_LOCAL_LLM: "true",
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

async function assertLocalLlmReady(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      console.error(`[local-llm] Health check failed: ${response.status} ${response.statusText}`);
      process.exit(1);
    }

    const data = await response.json();
    const models = extractModels(data);

    if (models.length === 0) {
      console.error(`[local-llm] ${runtimeLabel} is reachable, but ${url} returned no loaded models.`);
      console.error(`[local-llm] Load a model in ${runtimeLabel} before running npm.cmd run test:e2e:llm.`);
      process.exit(1);
    }

    const model = models[0];
    console.log(`[local-llm] Preflight OK: ${model.id || model.name || "model loaded"}`);
  } catch (error) {
    console.error(`[local-llm] ${runtimeLabel} is not reachable at ${url}.`);
    console.error(`[local-llm] Start ${runtimeLabel}'s local server and load a model before running local LLM tests.`);
    console.error(`[local-llm] ${String(error)}`);
    process.exit(1);
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractModels(data) {
  if (Array.isArray(data?.models) && data.models.some((model) => model?.name && !model?.type)) {
    return data.models
      .map((model) => ({
        id: String(model.name || model.model || ""),
        name: String(model.name || model.model || ""),
      }))
      .filter((model) => model.id);
  }

  if (Array.isArray(data?.models)) {
    const loadedLlmModels = data.models
      .filter((model) => model?.type === "llm")
      .flatMap((model) => {
        const instances = Array.isArray(model.loaded_instances) ? model.loaded_instances : [];
        return instances.map((instance) => ({
          id: String(instance.id || model.key || model.id || model.name || ""),
          name: String(model.display_name || model.name || model.key || instance.id || ""),
        }));
      })
      .filter((model) => model.id);

    if (loadedLlmModels.length > 0) {
      return loadedLlmModels;
    }

    return data.models
      .filter((model) => model?.type === "llm")
      .map((model) => ({
        id: String(model.key || model.id || model.name || ""),
        name: String(model.display_name || model.name || model.key || ""),
      }))
      .filter((model) => model.id);
  }

  const openAiModels = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data)
      ? data
      : [];

  return openAiModels
    .map((model) => ({
      id: String(model.id || model.name || ""),
      name: String(model.name || model.id || ""),
    }))
    .filter((model) => model.id);
}
