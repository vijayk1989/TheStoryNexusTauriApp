import type { AIModel, AllowedModel, AISettings } from "@/types/story";

export const DEFAULT_OPENROUTER_MODEL: AllowedModel = {
    id: "google/gemma-4-31b-it",
    provider: "openrouter",
    name: "Google: Gemma 4 31B IT",
};

export function getPreferredDefaultModel(settings?: AISettings | null): AllowedModel {
    if (settings?.openrouterKey?.trim()) {
        const configuredOpenRouterModel = settings.availableModels?.find(
            (model) => model.provider === "openrouter" && model.id === DEFAULT_OPENROUTER_MODEL.id
        );

        return toAllowedModel(configuredOpenRouterModel) || DEFAULT_OPENROUTER_MODEL;
    }

    const localModel = settings?.availableModels?.find((model) => model.provider === "local");
    return toAllowedModel(localModel) || {
        id: "local",
        provider: "local",
        name: "Local Model",
    };
}

export function resolveSavedDefaultModel(
    settings: AISettings | null | undefined,
    modelId: string | undefined
): AllowedModel {
    const savedModel = modelId
        ? settings?.availableModels?.find((model) => model.id === modelId)
        : undefined;

    if (savedModel?.provider === "openrouter" && !settings?.openrouterKey?.trim()) {
        return getPreferredDefaultModel(settings);
    }

    return toAllowedModel(savedModel) || getPreferredDefaultModel(settings);
}

function toAllowedModel(model?: AIModel): AllowedModel | undefined {
    if (!model) return undefined;

    return {
        id: model.id,
        provider: model.provider,
        name: model.name,
    };
}
