import type { AIModel, AIProvider, AISettings, LocalAIRuntime } from "@/types/story";

export type LocalRuntimePreset = {
    runtime: LocalAIRuntime;
    label: string;
    description: string;
    apiUrl: string;
    modelsUrl: string;
};

export const DEFAULT_LOCAL_RUNTIME: LocalAIRuntime = "lm_studio";

export const LOCAL_RUNTIME_PRESETS: Record<LocalAIRuntime, LocalRuntimePreset> = {
    lm_studio: {
        runtime: "lm_studio",
        label: "LM Studio",
        description: "OpenAI-compatible local server, usually on port 1234.",
        apiUrl: "http://localhost:1234/v1",
        modelsUrl: "http://localhost:1234/v1/models",
    },
    ollama: {
        runtime: "ollama",
        label: "Ollama",
        description: "OpenAI-compatible chat with native model discovery.",
        apiUrl: "http://localhost:11434/v1",
        modelsUrl: "http://localhost:11434/api/tags",
    },
    llama_cpp: {
        runtime: "llama_cpp",
        label: "llama.cpp / LocalAI",
        description: "OpenAI-compatible local server, often on port 8080.",
        apiUrl: "http://localhost:8080/v1",
        modelsUrl: "http://localhost:8080/v1/models",
    },
    custom_openai: {
        runtime: "custom_openai",
        label: "Custom OpenAI-Compatible",
        description: "Use your own local OpenAI-compatible base and models URL.",
        apiUrl: "http://localhost:1234/v1",
        modelsUrl: "http://localhost:1234/v1/models",
    },
};

export function getLocalRuntime(settings?: Pick<AISettings, "localRuntime"> | null): LocalAIRuntime {
    return settings?.localRuntime || DEFAULT_LOCAL_RUNTIME;
}

export function getLocalRuntimePreset(runtime: LocalAIRuntime): LocalRuntimePreset {
    return LOCAL_RUNTIME_PRESETS[runtime] || LOCAL_RUNTIME_PRESETS[DEFAULT_LOCAL_RUNTIME];
}

export function getLocalApiUrl(settings?: Pick<AISettings, "localRuntime" | "localApiUrl"> | null): string {
    const preset = getLocalRuntimePreset(getLocalRuntime(settings));
    return trimTrailingSlash(settings?.localApiUrl || preset.apiUrl);
}

export function getLocalModelsUrl(settings?: Pick<AISettings, "localRuntime" | "localApiUrl" | "localModelsUrl"> | null): string {
    if (settings?.localModelsUrl?.trim()) {
        return settings.localModelsUrl.trim();
    }

    const runtime = getLocalRuntime(settings);
    const preset = getLocalRuntimePreset(runtime);
    if (settings?.localApiUrl?.trim() && trimTrailingSlash(settings.localApiUrl) !== trimTrailingSlash(preset.apiUrl)) {
        if (runtime === "ollama") {
            return appendPath(trimTrailingSlash(settings.localApiUrl).replace(/\/v1$/, ""), "api/tags");
        }

        return appendPath(settings.localApiUrl, "models");
    }

    if (runtime === "custom_openai") {
        return appendPath(getLocalApiUrl(settings), "models");
    }

    return preset.modelsUrl;
}

export function normalizeLocalModels(data: unknown, runtime: LocalAIRuntime): AIModel[] {
    const rawModels = extractModelList(data);

    return rawModels
        .map((model) => normalizeLocalModel(model, runtime))
        .filter((model): model is AIModel => Boolean(model));
}

function extractModelList(data: unknown): unknown[] {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== "object") return [];

    const record = data as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data;
    if (Array.isArray(record.models)) return record.models;
    return [];
}

function normalizeLocalModel(raw: unknown, runtime: LocalAIRuntime): AIModel | undefined {
    if (!raw || typeof raw !== "object") return undefined;

    const record = raw as Record<string, unknown>;
    const rawId = stringValue(record.id) ||
        stringValue(record.name) ||
        stringValue(record.model) ||
        stringValue(record.digest);

    if (!rawId) return undefined;

    const name = stringValue(record.name) || stringValue(record.model) || rawId;

    return {
        id: `local/${rawId.replace(/^local\//, "")}`,
        name: prettifyLocalModelName(name, runtime),
        provider: "local" as AIProvider,
        contextLength: numberValue(record.context_length) ||
            numberValue(record.contextLength) ||
            numberValue(record.max_context) ||
            32768,
        enabled: true,
    };
}

function prettifyLocalModelName(name: string, runtime: LocalAIRuntime): string {
    if (runtime !== "ollama") return name;
    return name.replace(":latest", "");
}

function stringValue(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function appendPath(baseUrl: string, path: string): string {
    return `${trimTrailingSlash(baseUrl)}/${path.replace(/^\/+/, "")}`;
}

function trimTrailingSlash(value: string): string {
    return value.replace(/\/+$/, "");
}
