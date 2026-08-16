import type { AIModel, AIProvider, AISettings, AllowedModel } from "@/types/story";

import {
    DEFAULT_OPENROUTER_MODEL,
    LOCAL_DEFAULT_MODEL,
    isLocalDefaultModel,
} from "./defaultModels";

export type GenerationSetupIssue = "missing_provider_configuration" | "missing_model";

export const GENERATION_PROVIDER_LABELS: Record<AIProvider, string> = {
    local: "Local AI",
    openai: "OpenAI",
    openrouter: "OpenRouter",
    nanogpt: "NanoGPT",
    google: "Google AI",
    openai_compatible: "OpenAI-compatible API",
};

export function getGenerationSetupIssue(
    settings: AISettings | null | undefined,
    model: AllowedModel | undefined,
): GenerationSetupIssue | null {
    if (!model) return "missing_model";
    return isProviderConfigured(settings, model.provider)
        ? null
        : "missing_provider_configuration";
}

export function isProviderConfigured(
    settings: AISettings | null | undefined,
    provider: AIProvider,
): boolean {
    switch (provider) {
        case "local":
            return getSelectableProviderModels(settings, provider).length > 0;
        case "openai":
            return Boolean(settings?.openaiKey?.trim());
        case "openrouter":
            return Boolean(settings?.openrouterKey?.trim());
        case "nanogpt":
            return Boolean(settings?.nanogptKey?.trim());
        case "google":
            return Boolean(settings?.googleKey?.trim());
        case "openai_compatible":
            return Boolean(
                settings?.openaiCompatibleKey?.trim() && settings.openaiCompatibleUrl?.trim(),
            );
    }
}

export function getSelectableProviderModels(
    settings: AISettings | null | undefined,
    provider: AIProvider,
): AIModel[] {
    return (settings?.availableModels || []).filter((model) =>
        model.enabled &&
        model.provider === provider &&
        !(provider === "local" && isLocalDefaultModel(model)),
    );
}

export function resolveIntendedGenerationModel(
    settings: AISettings | null | undefined,
    savedModelId: string | undefined,
    promptModels: AllowedModel[] | undefined,
): AllowedModel | undefined {
    if (savedModelId && savedModelId.replace(/^local\//, "") === "local") {
        return LOCAL_DEFAULT_MODEL;
    }

    const savedModel = savedModelId
        ? settings?.availableModels?.find((model) => model.id === savedModelId)
        : undefined;

    if (savedModel) {
        return {
            id: savedModel.id,
            name: savedModel.name,
            provider: savedModel.provider,
        };
    }

    if (savedModelId) return undefined;

    const promptModel = promptModels?.[0];
    if (promptModel) return promptModel;

    if (settings?.openrouterKey?.trim() && promptModels === undefined) {
        return DEFAULT_OPENROUTER_MODEL;
    }

    return promptModels === undefined ? LOCAL_DEFAULT_MODEL : undefined;
}

export function getConfiguredProvider(settings: AISettings | null | undefined): AIProvider {
    const providers: AIProvider[] = [
        "openrouter",
        "openai",
        "google",
        "nanogpt",
        "openai_compatible",
        "local",
    ];
    return providers.find((provider) => isProviderConfigured(settings, provider)) || "local";
}
