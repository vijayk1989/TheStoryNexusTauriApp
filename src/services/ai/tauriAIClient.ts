import { invoke } from "@tauri-apps/api/core";

export type TauriProvider =
  | "openai"
  | "openrouter"
  | "nanogpt"
  | "openai_compatible";

export interface TauriPromptMessage {
  role: string;
  content: string;
}

export interface TauriGenerateRequest {
  provider: TauriProvider;
  model: string;
  messages: TauriPromptMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;
  repetition_penalty?: number;
  min_p?: number;
  base_url?: string;
}

export interface TauriModelsRequest {
  provider: TauriProvider;
  base_url?: string;
  models_route?: string;
}

export interface TauriModelInfo {
  id: string;
  name: string;
  provider: TauriProvider;
  context_length?: number;
}

export function isTauriRuntime(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as any).__TAURI_INTERNALS__);
}

function assertTauriRuntime() {
  if (!isTauriRuntime()) {
    throw new Error("Tauri runtime is unavailable");
  }
}

export async function setProviderApiKeyViaTauri(
  provider: TauriProvider,
  apiKey: string
): Promise<void> {
  assertTauriRuntime();
  await invoke("set_provider_api_key", { provider, apiKey });
}

export async function getProviderApiKeyViaTauri(
  provider: TauriProvider
): Promise<string | null> {
  assertTauriRuntime();
  const key = await invoke<string | null>("get_provider_api_key", { provider });
  return key ?? null;
}

export async function hasProviderApiKeyViaTauri(
  provider: TauriProvider
): Promise<boolean> {
  assertTauriRuntime();
  return invoke<boolean>("has_provider_api_key", { provider });
}

export async function removeProviderApiKeyViaTauri(
  provider: TauriProvider
): Promise<void> {
  assertTauriRuntime();
  await invoke("remove_provider_api_key", { provider });
}

export async function fetchProviderModelsViaTauri(
  request: TauriModelsRequest
): Promise<TauriModelInfo[]> {
  assertTauriRuntime();
  return invoke<TauriModelInfo[]>("fetch_provider_models", { request });
}

export async function generateChatCompletionViaTauri(
  request: TauriGenerateRequest
): Promise<string> {
  assertTauriRuntime();
  return invoke<string>("generate_chat_completion", { request });
}
