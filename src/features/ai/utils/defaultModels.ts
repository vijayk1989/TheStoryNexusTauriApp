import type { AIModel, AllowedModel, AISettings } from "@/types/story";
import { getLocalRuntime } from "@/services/ai/localRuntime";

export const DEFAULT_OPENROUTER_MODEL: AllowedModel = {
    id: "google/gemma-4-31b-it",
    provider: "openrouter",
    name: "Google: Gemma 4 31B IT",
};

export const LOCAL_DEFAULT_MODEL: AllowedModel = {
    id: "local",
    provider: "local",
    name: "Local default",
};

export const LOCAL_DEFAULT_AI_MODEL: AIModel = {
    ...LOCAL_DEFAULT_MODEL,
    contextLength: 32768,
    enabled: true,
};

export function getPreferredDefaultModel(settings?: AISettings | null): AllowedModel {
    if (settings?.openrouterKey?.trim()) {
        const configuredOpenRouterModel = settings.availableModels?.find(
            (model) => model.provider === "openrouter" && model.id === DEFAULT_OPENROUTER_MODEL.id
        );

        return toAllowedModel(configuredOpenRouterModel) || DEFAULT_OPENROUTER_MODEL;
    }

    return LOCAL_DEFAULT_MODEL;
}

export function resolveSavedDefaultModel(
    settings: AISettings | null | undefined,
    modelId: string | undefined
): AllowedModel {
    if (modelId && isLocalDefaultModel({ provider: "local", id: modelId })) {
        return LOCAL_DEFAULT_MODEL;
    }

    const savedModel = modelId
        ? settings?.availableModels?.find((model) => model.id === modelId)
        : undefined;

    if (savedModel?.provider === "openrouter" && !settings?.openrouterKey?.trim()) {
        return getPreferredDefaultModel(settings);
    }

    return toAllowedModel(savedModel) || getPreferredDefaultModel(settings);
}

export function expandPromptAllowedModels(
    allowedModels: AllowedModel[] | undefined,
    settings?: AISettings | null
): AllowedModel[] {
    const expanded: AllowedModel[] = [];

    for (const model of allowedModels || []) {
        if (isLocalDefaultModel(model)) {
            addUniqueModel(expanded, LOCAL_DEFAULT_MODEL);
            getConcreteLocalModels(settings).forEach((localModel) => {
                addUniqueModel(expanded, toAllowedModel(localModel));
            });
            continue;
        }

        addUniqueModel(expanded, hydrateAllowedModel(model, settings));
    }

    return expanded;
}

export function getSelectableModelsWithLocalDefault(models: AIModel[]): AIModel[] {
    return [
        LOCAL_DEFAULT_AI_MODEL,
        ...models.filter((model) => !isLocalDefaultModel(model)),
    ];
}

export function getConcreteLocalModels(settings?: Pick<AISettings, "availableModels"> | null): AIModel[] {
    return settings?.availableModels?.filter(
        (model) => model.provider === "local" && !isLocalDefaultModel(model)
    ) || [];
}

export function getConfiguredLocalDefaultModelId(settings?: AISettings | null): string | undefined {
    const runtime = getLocalRuntime(settings);
    const savedModelId = settings?.localModelIdByRuntime?.[runtime];
    if (!savedModelId) return undefined;
    return `local/${savedModelId.replace(/^local\//, "")}`;
}

export function normalizeAllowedModel(model: AllowedModel): AllowedModel {
    return isLocalDefaultModel(model) ? LOCAL_DEFAULT_MODEL : model;
}

export function isLocalDefaultModel(model: Pick<AllowedModel, "provider" | "id"> | undefined): boolean {
    return model?.provider === "local" && model.id.replace(/^local\//, "") === "local";
}

function toAllowedModel(model?: AIModel): AllowedModel | undefined {
    if (!model) return undefined;

    return {
        id: model.id,
        provider: model.provider,
        name: model.name,
    };
}

function hydrateAllowedModel(model: AllowedModel, settings?: AISettings | null): AllowedModel {
    const availableModel = settings?.availableModels?.find(
        (candidate) => candidate.provider === model.provider && candidate.id === model.id
    );
    return normalizeAllowedModel(toAllowedModel(availableModel) || model);
}

function addUniqueModel(models: AllowedModel[], model?: AllowedModel): void {
    if (!model) return;

    const key = `${model.provider}:${model.id}`;
    if (models.some((existing) => `${existing.provider}:${existing.id}` === key)) return;
    models.push(normalizeAllowedModel(model));
}
