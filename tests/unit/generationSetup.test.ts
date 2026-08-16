import { describe, expect, test } from "vitest";

import {
    getGenerationSetupIssue,
    getSelectableProviderModels,
    isProviderConfigured,
    resolveIntendedGenerationModel,
} from "@/features/ai/utils/generationSetup";
import type { AIModel, AISettings, AllowedModel } from "@/types/story";

const localDefault: AllowedModel = {
    id: "local",
    name: "Local default",
    provider: "local",
};
const localModel: AIModel = {
    id: "local/qwen3",
    name: "Qwen 3",
    provider: "local",
    contextLength: 32768,
    enabled: true,
};
const openRouterModel: AIModel = {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    provider: "openrouter",
    contextLength: 200000,
    enabled: true,
};

describe("generation setup detection", () => {
    test("requires an explicit model assignment", () => {
        expect(getGenerationSetupIssue(settings(), undefined)).toBe("missing_model");
        expect(resolveIntendedGenerationModel(settings(), undefined, [])).toBeUndefined();
    });

    test("does not treat the placeholder local model as a configured local server", () => {
        const initialSettings = settings([{
            ...localModel,
            id: "local",
            name: "Local Model",
        }]);

        expect(getSelectableProviderModels(initialSettings, "local")).toEqual([]);
        expect(isProviderConfigured(initialSettings, "local")).toBe(false);
        expect(getGenerationSetupIssue(initialSettings, localDefault)).toBe(
            "missing_provider_configuration",
        );
    });

    test("recognizes concrete local models and hosted provider credentials", () => {
        const configured = settings([localModel, openRouterModel], {
            openrouterKey: "secret",
            openaiCompatibleKey: "compatible-secret",
            openaiCompatibleUrl: "https://models.example/v1",
        });

        expect(isProviderConfigured(configured, "local")).toBe(true);
        expect(isProviderConfigured(configured, "openrouter")).toBe(true);
        expect(isProviderConfigured(configured, "openai_compatible")).toBe(true);
        expect(getGenerationSetupIssue(configured, localDefault)).toBeNull();
        expect(getGenerationSetupIssue(configured, openRouterModel)).toBeNull();
    });

    test("requires both URL and key for an OpenAI-compatible provider", () => {
        expect(isProviderConfigured(settings([], { openaiCompatibleKey: "secret" }), "openai_compatible"))
            .toBe(false);
        expect(isProviderConfigured(settings([], { openaiCompatibleUrl: "https://models.example/v1" }), "openai_compatible"))
            .toBe(false);
    });

    test("preserves a saved model so missing credentials can be recovered", () => {
        const unconfigured = settings([openRouterModel]);
        const resolved = resolveIntendedGenerationModel(
            unconfigured,
            openRouterModel.id,
            [localDefault],
        );

        expect(resolved).toEqual({
            id: openRouterModel.id,
            name: openRouterModel.name,
            provider: openRouterModel.provider,
        });
        expect(getGenerationSetupIssue(unconfigured, resolved)).toBe(
            "missing_provider_configuration",
        );
    });

    test("uses the prompt model when no Simple Write default has been saved", () => {
        expect(resolveIntendedGenerationModel(settings([localModel]), undefined, [localDefault]))
            .toEqual(localDefault);
    });
});

function settings(
    availableModels: AIModel[] = [],
    overrides: Partial<AISettings> = {},
): AISettings {
    return {
        id: "settings",
        createdAt: new Date(),
        availableModels,
        ...overrides,
    };
}
