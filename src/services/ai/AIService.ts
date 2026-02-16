import { AIModel, AIProvider, AISettings, PromptMessage } from "@/types/story";
import { db } from "../database";
import {
  TauriModelInfo,
  TauriProvider,
  fetchProviderModelsViaTauri,
  generateChatCompletionViaTauri,
  hasProviderApiKeyViaTauri,
  isTauriRuntime,
  removeProviderApiKeyViaTauri,
  setProviderApiKeyViaTauri,
} from "./tauriAIClient";

const REMOTE_PROVIDERS: TauriProvider[] = [
  "openai",
  "openrouter",
  "nanogpt",
  "openai_compatible",
];

type SessionKeys = Partial<Record<TauriProvider, string>>;

function isRemoteProvider(provider: AIProvider): provider is TauriProvider {
  return REMOTE_PROVIDERS.includes(provider as TauriProvider);
}

export class AIService {
  private static instance: AIService;
  private settings: AISettings | null = null;
  private readonly LOCAL_API_URL = "http://localhost:1234/v1";
  private abortController: AbortController | null = null;
  private tauriAvailable = false;
  private sessionKeys: SessionKeys = {};

  private constructor() {}

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  async initialize() {
    const settings = await db.aiSettings.toArray();
    this.settings = settings[0] || (await this.createInitialSettings());
    this.tauriAvailable = isTauriRuntime();
    await this.migrateLegacyStoredKeys();
  }

  private async createInitialSettings(): Promise<AISettings> {
    const localModels = await this.fetchLocalModels();
    const settings: AISettings = {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      localApiUrl: this.LOCAL_API_URL,
      availableModels: localModels,
    };
    await db.aiSettings.add(settings);
    return settings;
  }

  private async migrateLegacyStoredKeys(): Promise<void> {
    if (!this.settings) return;

    const legacyKeys: SessionKeys = {
      openai: this.settings.openaiKey,
      openrouter: this.settings.openrouterKey,
      nanogpt: this.settings.nanogptKey,
      openai_compatible: this.settings.openaiCompatibleKey,
    };

    const hasLegacyKey = Object.values(legacyKeys).some(
      (value) => typeof value === "string" && value.trim().length > 0,
    );
    if (!hasLegacyKey) return;

    for (const provider of REMOTE_PROVIDERS) {
      const key = legacyKeys[provider]?.trim();
      if (!key) continue;
      await this.persistProviderKey(provider, key);
    }

    const sanitized = { ...this.settings } as Partial<AISettings>;
    delete (sanitized as any).openaiKey;
    delete (sanitized as any).openrouterKey;
    delete (sanitized as any).nanogptKey;
    delete (sanitized as any).openaiCompatibleKey;
    await db.aiSettings.put(sanitized as AISettings);
    this.settings = sanitized as AISettings;
  }

  private async persistProviderKey(
    provider: TauriProvider,
    key: string,
  ): Promise<void> {
    if (this.tauriAvailable) {
      try {
        await setProviderApiKeyViaTauri(provider, key);
        delete this.sessionKeys[provider];
        return;
      } catch (error) {
        console.warn(
          `[AIService] Failed to store ${provider} key in Tauri secure store, using session memory fallback`,
        );
      }
    }
    this.sessionKeys[provider] = key;
  }

  private async removeProviderKey(provider: TauriProvider): Promise<void> {
    delete this.sessionKeys[provider];
    if (!this.tauriAvailable) return;
    try {
      await removeProviderApiKeyViaTauri(provider);
    } catch (error) {
      console.warn(`[AIService] Failed to remove ${provider} key:`, error);
    }
  }

  private async hasProviderKey(provider: TauriProvider): Promise<boolean> {
    if (this.sessionKeys[provider]?.trim()) {
      return true;
    }
    if (!this.tauriAvailable) {
      return false;
    }
    try {
      return await hasProviderApiKeyViaTauri(provider);
    } catch {
      return false;
    }
  }

  private async getProviderKey(
    provider: TauriProvider,
  ): Promise<string | null> {
    return this.sessionKeys[provider]?.trim() || null;
  }

  private async fetchLocalModels(): Promise<AIModel[]> {
    try {
      const apiUrl = this.settings?.localApiUrl || this.LOCAL_API_URL;
      const response = await fetch(`${apiUrl}/models`);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch local models: ${response.status} ${response.statusText}`,
        );
      }

      const result = await response.json();
      return result.data.map(
        (model: { id: string; object: string; owned_by: string }) => ({
          id: `local/${model.id}`,
          name: model.id,
          provider: "local" as AIProvider,
          contextLength: 16384,
          enabled: true,
        }),
      );
    } catch (error) {
      console.warn("[AIService] Failed to fetch local models:", error);
      return [
        {
          id: "local",
          name: "Local Model",
          provider: "local",
          contextLength: 16384,
          enabled: true,
        },
      ];
    }
  }

  async updateKey(provider: AIProvider, key: string) {
    if (!this.settings) throw new Error("AIService not initialized");
    if (!isRemoteProvider(provider)) return;

    const normalizedKey = key.trim();
    if (!normalizedKey) {
      await this.removeProviderKey(provider);
      await this.fetchAvailableModels(provider);
      return;
    }

    await this.persistProviderKey(provider, normalizedKey);
    await this.fetchAvailableModels(provider);
  }

  private mapTauriModels(
    provider: TauriProvider,
    models: TauriModelInfo[],
  ): AIModel[] {
    return models.map((model) => ({
      id: model.id,
      name: model.name || model.id,
      provider,
      contextLength: model.context_length || 16384,
      enabled: true,
    }));
  }

  private async fetchOpenAIModels(): Promise<AIModel[]> {
    if (this.tauriAvailable) {
      const models = await fetchProviderModelsViaTauri({ provider: "openai" });
      return this.mapTauriModels("openai", models);
    }

    const key = await this.getProviderKey("openai");
    if (!key) throw new Error("OpenAI API key not set");

    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch OpenAI models");
    const data = await response.json();

    return data.data
      .filter((model: any) => model.id.startsWith("gpt"))
      .map((model: any) => ({
        id: model.id,
        name: model.id,
        provider: "openai" as AIProvider,
        contextLength: model.context_length || 16384,
        enabled: true,
      }));
  }

  private async fetchOpenRouterModels(): Promise<AIModel[]> {
    if (this.tauriAvailable) {
      const models = await fetchProviderModelsViaTauri({
        provider: "openrouter",
      });
      return this.mapTauriModels("openrouter", models);
    }

    const key = await this.getProviderKey("openrouter");
    if (!key) throw new Error("OpenRouter API key not set");

    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch OpenRouter models");
    const data = await response.json();

    return data.data.map((model: any) => ({
      id: model.id,
      name: model.name,
      provider: "openrouter" as AIProvider,
      contextLength: model.context_length || 16384,
      enabled: true,
    }));
  }

  private async fetchNanoGPTModels(): Promise<AIModel[]> {
    if (this.tauriAvailable) {
      const models = await fetchProviderModelsViaTauri({ provider: "nanogpt" });
      return this.mapTauriModels("nanogpt", models);
    }

    const key = await this.getProviderKey("nanogpt");
    if (!key) throw new Error("NanoGPT API key not set");

    const response = await fetch("https://nano-gpt.com/api/v1/models", {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch NanoGPT models");
    const data = await response.json();

    return data.data.map((model: any) => ({
      id: model.id,
      name: model.name || model.id,
      provider: "nanogpt" as AIProvider,
      contextLength: model.context_length || 16384,
      enabled: true,
    }));
  }

  private async fetchOpenAICompatibleModels(): Promise<AIModel[]> {
    const url = this.settings?.openaiCompatibleUrl;
    const modelsRoute = this.settings?.openaiCompatibleModelsRoute;
    if (!url) throw new Error("OpenAI-compatible provider URL not configured");

    if (this.tauriAvailable) {
      const models = await fetchProviderModelsViaTauri({
        provider: "openai_compatible",
        base_url: url,
        models_route: modelsRoute,
      });
      return this.mapTauriModels("openai_compatible", models);
    }

    const key = await this.getProviderKey("openai_compatible");
    if (!key) throw new Error("OpenAI-compatible provider key not configured");

    let endpoint: string;
    if (modelsRoute) {
      endpoint = modelsRoute.startsWith("/")
        ? url.endsWith("/")
          ? `${url.slice(0, -1)}${modelsRoute}`
          : `${url}${modelsRoute}`
        : modelsRoute;
    } else {
      endpoint = url.endsWith("/") ? `${url}models` : `${url}/models`;
    }

    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });
    if (!response.ok)
      throw new Error("Failed to fetch OpenAI-compatible models");

    const data = await response.json();
    const list = Array.isArray(data.data)
      ? data.data
      : Array.isArray(data)
        ? data
        : [];

    return list.map((model: any) => ({
      id: model.id || model.name,
      name: model.name || model.id || String(model.id),
      provider: "openai_compatible" as AIProvider,
      contextLength: model.context_length || model.max_context || 16384,
      enabled: true,
    }));
  }

  private async fetchAvailableModels(provider: AIProvider) {
    if (!this.settings) throw new Error("AIService not initialized");

    try {
      let models: AIModel[] = [];

      switch (provider) {
        case "local":
          models = await this.fetchLocalModels();
          break;
        case "openai":
          if (await this.hasProviderKey("openai")) {
            models = await this.fetchOpenAIModels();
          }
          break;
        case "openrouter":
          if (await this.hasProviderKey("openrouter")) {
            models = await this.fetchOpenRouterModels();
          }
          break;
        case "nanogpt":
          if (await this.hasProviderKey("nanogpt")) {
            models = await this.fetchNanoGPTModels();
          }
          break;
        case "openai_compatible":
          if (
            this.settings.openaiCompatibleUrl &&
            (await this.hasProviderKey("openai_compatible"))
          ) {
            models = await this.fetchOpenAICompatibleModels();
          }
          break;
      }

      const existingModels = this.settings.availableModels.filter(
        (model) => model.provider !== provider,
      );
      const updatedModels = [...existingModels, ...models];

      await db.aiSettings.update(this.settings.id, {
        availableModels: updatedModels,
        lastModelsFetch: new Date(),
      });

      this.settings.availableModels = updatedModels;
      this.settings.lastModelsFetch = new Date();
    } catch (error) {
      console.error("Error fetching models:", error);
      throw error;
    }
  }

  async getAvailableModels(
    provider?: AIProvider,
    forceRefresh = true,
  ): Promise<AIModel[]> {
    if (!this.settings) throw new Error("AIService not initialized");

    const dbSettings = await db.aiSettings.get(this.settings.id);
    if (dbSettings) {
      this.settings = dbSettings;
    }

    if (provider && forceRefresh) {
      await this.fetchAvailableModels(provider);
    }

    return provider
      ? this.settings.availableModels.filter(
          (model) => model.provider === provider,
        )
      : this.settings.availableModels;
  }

  async generateWithLocalModel(
    messages: PromptMessage[],
    temperature = 1.0,
    maxTokens = 2048,
    top_p?: number,
    top_k?: number,
    repetition_penalty?: number,
    min_p?: number,
  ): Promise<Response> {
    const requestBody: any = {
      messages,
      stream: true,
      model: "local/llama-3.2-3b-instruct",
      temperature,
      max_tokens: maxTokens,
    };

    if (top_p !== undefined && top_p !== 0) requestBody.top_p = top_p;
    if (top_k !== undefined && top_k !== 0) requestBody.top_k = top_k;
    if (repetition_penalty !== undefined && repetition_penalty !== 0) {
      requestBody.repetition_penalty = repetition_penalty;
    }
    if (min_p !== undefined && min_p !== 0) requestBody.min_p = min_p;

    this.abortController = new AbortController();
    return fetch(`${this.getLocalApiUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: this.abortController.signal,
    });
  }

  private createSSELikeResponse(content: string): Response {
    const payload = `data: ${JSON.stringify({
      choices: [{ delta: { content } }],
    })}\n\ndata: [DONE]\n\n`;

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(payload));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  async processStreamedResponse(
    response: Response,
    onToken: (text: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
  ) {
    if (!response.body) {
      onError(new Error("Response body is null"));
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let plainTextFallback = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (plainTextFallback.trim()) {
            onToken(plainTextFallback);
          }
          onComplete();
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              onComplete();
              return;
            }

            try {
              const json = JSON.parse(data);
              const text = json.choices?.[0]?.delta?.content || "";
              if (text) onToken(text);
            } catch {
              plainTextFallback += data;
            }
          } else {
            plainTextFallback += line;
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        onComplete();
      } else {
        onError(error as Error);
      }
    } finally {
      this.abortController = null;
    }
  }

  private buildCompletionPayload(
    messages: PromptMessage[],
    modelId: string,
    temperature: number,
    maxTokens: number,
    top_p?: number,
    top_k?: number,
    repetition_penalty?: number,
    min_p?: number,
  ) {
    const payload: any = {
      model: modelId,
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    if (top_p !== undefined && top_p !== 0) payload.top_p = top_p;
    if (top_k !== undefined && top_k !== 0) payload.top_k = top_k;
    if (repetition_penalty !== undefined && repetition_penalty !== 0) {
      payload.repetition_penalty = repetition_penalty;
      payload.frequency_penalty = repetition_penalty;
    }
    if (min_p !== undefined && min_p !== 0) payload.min_p = min_p;

    return payload;
  }

  async generateWithOpenAI(
    messages: PromptMessage[],
    modelId: string,
    temperature = 1.0,
    maxTokens = 2048,
    top_p?: number,
    top_k?: number,
    repetition_penalty?: number,
    min_p?: number,
  ): Promise<Response> {
    if (this.tauriAvailable) {
      const content = await generateChatCompletionViaTauri({
        provider: "openai",
        model: modelId,
        messages,
        temperature,
        max_tokens: maxTokens,
        top_p,
        top_k,
        repetition_penalty,
        min_p,
      });
      return this.createSSELikeResponse(content);
    }

    const key = await this.getProviderKey("openai");
    if (!key) throw new Error("OpenAI API key not set");

    this.abortController = new AbortController();
    const body = {
      ...this.buildCompletionPayload(
        messages,
        modelId,
        temperature,
        maxTokens,
        top_p,
        top_k,
        repetition_penalty,
        min_p,
      ),
      stream: true,
    };

    return fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      signal: this.abortController.signal,
    });
  }

  async generateWithOpenRouter(
    messages: PromptMessage[],
    modelId: string,
    temperature = 1.0,
    maxTokens = 2048,
    top_p?: number,
    top_k?: number,
    repetition_penalty?: number,
    min_p?: number,
  ): Promise<Response> {
    if (this.tauriAvailable) {
      const content = await generateChatCompletionViaTauri({
        provider: "openrouter",
        model: modelId,
        messages,
        temperature,
        max_tokens: maxTokens,
        top_p,
        top_k,
        repetition_penalty,
        min_p,
      });
      return this.createSSELikeResponse(content);
    }

    const key = await this.getProviderKey("openrouter");
    if (!key) throw new Error("OpenRouter API key not set");

    this.abortController = new AbortController();
    const body = {
      ...this.buildCompletionPayload(
        messages,
        modelId,
        temperature,
        maxTokens,
        top_p,
        top_k,
        repetition_penalty,
        min_p,
      ),
      stream: true,
    };

    return fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "The Story Nexus",
      },
      body: JSON.stringify(body),
      signal: this.abortController.signal,
    });
  }

  async generateWithNanoGPT(
    messages: PromptMessage[],
    modelId: string,
    temperature = 1.0,
    maxTokens = 2048,
    top_p?: number,
    top_k?: number,
    repetition_penalty?: number,
    min_p?: number,
  ): Promise<Response> {
    if (this.tauriAvailable) {
      const content = await generateChatCompletionViaTauri({
        provider: "nanogpt",
        model: modelId,
        messages,
        temperature,
        max_tokens: maxTokens,
        top_p,
        top_k,
        repetition_penalty,
        min_p,
      });
      return this.createSSELikeResponse(content);
    }

    const key = await this.getProviderKey("nanogpt");
    if (!key) throw new Error("NanoGPT API key not set");

    this.abortController = new AbortController();
    const body = {
      ...this.buildCompletionPayload(
        messages,
        modelId,
        temperature,
        maxTokens,
        top_p,
        top_k,
        repetition_penalty,
        min_p,
      ),
      stream: true,
    };

    return fetch("https://nano-gpt.com/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      signal: this.abortController.signal,
    });
  }

  async generateWithOpenAICompatible(
    messages: PromptMessage[],
    modelId: string,
    temperature = 1.0,
    maxTokens = 2048,
    top_p?: number,
    top_k?: number,
    repetition_penalty?: number,
    min_p?: number,
  ): Promise<Response> {
    const urlBase = this.settings?.openaiCompatibleUrl;
    if (!urlBase) {
      throw new Error("OpenAI-compatible provider URL not configured");
    }

    if (this.tauriAvailable) {
      const content = await generateChatCompletionViaTauri({
        provider: "openai_compatible",
        model: modelId,
        messages,
        temperature,
        max_tokens: maxTokens,
        top_p,
        top_k,
        repetition_penalty,
        min_p,
        base_url: urlBase,
      });
      return this.createSSELikeResponse(content);
    }

    const key = await this.getProviderKey("openai_compatible");
    if (!key) throw new Error("OpenAI-compatible provider key not configured");

    const endpoint = urlBase.endsWith("/")
      ? `${urlBase}chat/completions`
      : `${urlBase}/chat/completions`;
    this.abortController = new AbortController();
    const body = {
      ...this.buildCompletionPayload(
        messages,
        modelId,
        temperature,
        maxTokens,
        top_p,
        top_k,
        repetition_penalty,
        min_p,
      ),
      stream: true,
    };

    return fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      signal: this.abortController.signal,
    });
  }

  getOpenAICompatibleUrl(): string | undefined {
    return this.settings?.openaiCompatibleUrl;
  }

  getOpenAICompatibleModelsRoute(): string | undefined {
    return this.settings?.openaiCompatibleModelsRoute;
  }

  getLocalApiUrl(): string {
    return this.settings?.localApiUrl || this.LOCAL_API_URL;
  }

  async updateLocalApiUrl(url: string): Promise<void> {
    if (!this.settings) throw new Error("Settings not initialized");
    await db.aiSettings.update(this.settings.id, { localApiUrl: url });
    this.settings.localApiUrl = url;
    await this.fetchAvailableModels("local");
  }

  async updateOpenAICompatibleUrl(url: string): Promise<void> {
    if (!this.settings) throw new Error("Settings not initialized");
    await db.aiSettings.update(this.settings.id, { openaiCompatibleUrl: url });
    this.settings.openaiCompatibleUrl = url;
    await this.fetchAvailableModels("openai_compatible");
  }

  async updateOpenAICompatibleModelsRoute(route: string): Promise<void> {
    if (!this.settings) throw new Error("Settings not initialized");
    await db.aiSettings.update(this.settings.id, {
      openaiCompatibleModelsRoute: route,
    });
    this.settings.openaiCompatibleModelsRoute = route;
  }

  getSettings(): AISettings | null {
    return this.settings;
  }

  getFavoriteModelIds(): string[] {
    return this.settings?.favoriteModelIds || [];
  }

  async toggleFavoriteModel(modelId: string): Promise<void> {
    if (!this.settings) throw new Error("Settings not initialized");

    const current = this.settings.favoriteModelIds || [];
    const newFavorites = current.includes(modelId)
      ? current.filter((id) => id !== modelId)
      : [...current, modelId];

    await db.aiSettings.update(this.settings.id, {
      favoriteModelIds: newFavorites,
    });
    this.settings.favoriteModelIds = newFavorites;
  }

  abortStream(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

export const aiService = AIService.getInstance();
