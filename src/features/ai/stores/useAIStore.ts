import { create } from 'zustand';
import {
    AIModel,
    AIProvider,
    AISettings,
    PromptParserConfig,
    PromptMessage,
    AllowedModel,
    PromptReasoningSettings,
    Prompt,
} from '@/types/story';
import { aiService } from '@/services/ai/AIService';
import { db } from '@/services/database';
import { createPromptParser } from '@/features/prompts/services/promptParser';
import { getPreferredDefaultModel } from '@/features/ai/utils/defaultModels';

interface AIState {
    settings: AISettings | null;
    isInitialized: boolean;
    isLoading: boolean;
    error: string | null;
    favoriteModelIds: string[];

    // Initialize AI service and load settings
    initialize: () => Promise<void>;

    // Model management
    getAvailableModels: (provider?: AIProvider, forceRefresh?: boolean) => Promise<AIModel[]>;
    updateProviderKey: (provider: AIProvider, key: string) => Promise<void>;
    updateLocalApiUrl: (url: string) => Promise<void>;
    updateTavilyKey: (key: string) => Promise<void>;

    // Favorite model management
    toggleFavoriteModel: (modelId: string) => Promise<void>;

    // Prompt defaults management
    updatePromptDefaults: (defaults: Partial<AISettings>) => Promise<void>;

    // Generation methods
    generateWithLocalModel: (
        messages: PromptMessage[],
        temperature?: number,
        maxTokens?: number,
        top_p?: number,
        top_k?: number,
        repetition_penalty?: number,
        min_p?: number,
        modelId?: string,
        reasoning?: PromptReasoningSettings
    ) => Promise<Response>;

    processStreamedResponse: (
        response: Response,
        onToken: (text: string) => void,
        onComplete: () => void,
        onError: (error: Error) => void,
        onStatus?: (status: string) => void
    ) => Promise<void>;

    generateWithPrompt: (config: PromptParserConfig, selectedModel: AllowedModel) => Promise<Response>;

    // New method for generating with pre-parsed messages
    generateWithParsedMessages: (
        messages: PromptMessage[],
        selectedModel: AllowedModel,
        promptId: string,
        onRequest?: (model: AllowedModel, prompt: Prompt) => void
    ) => Promise<Response>;

    // New method to abort generation
    abortGeneration: () => void;
}

export const useAIStore = create<AIState>((set, get) => ({
    settings: null,
    isInitialized: false,
    isLoading: false,
    error: null,
    favoriteModelIds: [],

    initialize: async () => {
        set({ isLoading: true, error: null });
        try {
            await aiService.initialize();
            const settings = aiService.getSettings();
            set({
                settings,
                favoriteModelIds: settings?.favoriteModelIds || [],
                isInitialized: true,
                isLoading: false
            });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to initialize AI',
                isLoading: false
            });
        }
    },

    getAvailableModels: async (provider?: AIProvider, forceRefresh: boolean = false) => {
        if (!get().isInitialized) {
            await get().initialize();
        }
        const models = await aiService.getAvailableModels(provider, forceRefresh);
        const settings = aiService.getSettings();
        set({
            settings,
            favoriteModelIds: settings?.favoriteModelIds || [],
        });
        return models;
    },

    updateProviderKey: async (provider: AIProvider, key: string) => {
        set({ isLoading: true, error: null });
        try {
            await aiService.updateKey(provider, key);
            set({ settings: aiService.getSettings(), isLoading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to update API key',
                isLoading: false
            });
            throw error;
        }
    },

    updateTavilyKey: async (key: string) => {
        set({ isLoading: true, error: null });
        try {
            await aiService.updateTavilyKey(key);
            set({ settings: aiService.getSettings(), isLoading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to update Tavily API key',
                isLoading: false
            });
            throw error;
        }
    },

    updateLocalApiUrl: async (url: string) => {
        set({ isLoading: true, error: null });
        try {
            await aiService.updateLocalApiUrl(url);
            set({ settings: aiService.getSettings(), isLoading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to update local API URL',
                isLoading: false
            });
            throw error;
        }
    },

    toggleFavoriteModel: async (modelId: string) => {
        try {
            await aiService.toggleFavoriteModel(modelId);
            const newFavorites = aiService.getFavoriteModelIds();
            set({ favoriteModelIds: newFavorites });
        } catch (error) {
            console.error('Failed to toggle favorite model:', error);
        }
    },

    updatePromptDefaults: async (defaults: Partial<AISettings>) => {
        set({ isLoading: true, error: null });
        try {
            const settings = await db.aiSettings.toArray();
            let currentSettings = settings[0];
            
            if (!currentSettings) {
                // Should theoretically never happen as initialize() creates default settings
                throw new Error("No settings found in database");
            }
            
            await db.aiSettings.update(currentSettings.id, defaults);
            
            const updatedSettings = await aiService.refreshSettingsFromDatabase();
            set({ settings: updatedSettings, isLoading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to update prompt defaults',
                isLoading: false
            });
            throw error;
        }
    },

    generateWithLocalModel: async (messages: PromptMessage[], temperature?: number, maxTokens?: number, top_p?: number, top_k?: number, repetition_penalty?: number, min_p?: number, modelId?: string, reasoning?: PromptReasoningSettings) => {
        if (!get().isInitialized) {
            await get().initialize();
        }
        return aiService.generateWithLocalModel(messages, temperature, maxTokens, top_p, top_k, repetition_penalty, min_p, modelId, reasoning);
    },

    processStreamedResponse: async (response, onToken, onComplete, onError, onStatus) => {
        await aiService.processStreamedResponse(response, onToken, onComplete, onError, onStatus);
    },

    generateWithPrompt: async (config: PromptParserConfig, selectedModel: AllowedModel) => {
        if (!get().isInitialized) {
            await get().initialize();
        }
        selectedModel = resolveModelForAvailableProvider(selectedModel, get().settings);

        const promptParser = createPromptParser();
        const { messages, error } = await promptParser.parse(config);

        if (error || !messages.length) {
            throw new Error(error || 'Failed to parse prompt');
        }

        // Get the prompt to access temperature and maxTokens
        const prompt = await db.prompts.get(config.promptId);
        const temperature = prompt?.temperature;
        const maxTokens = prompt?.maxTokens ?? 2048;

        // Get the new parameters with their default values if not set
        const top_p = prompt?.top_p;
        const top_k = prompt?.top_k;
        const repetition_penalty = prompt?.repetition_penalty;
        const min_p = prompt?.min_p;
        const reasoning = prompt?.reasoning;

        const tools = config.additionalContext?.enableWebSearch ? [
            {
                type: "function",
                function: {
                    name: "search_web",
                    description: "Search the web for up-to-date information, facts, or references.",
                    parameters: {
                        type: "object",
                        properties: { query: { type: "string", description: "The search query to execute" } },
                        required: ["query"]
                    }
                }
            }
        ] : undefined;

        switch (selectedModel.provider) {
            case 'local':
                return aiService.generateWithLocalModel(
                    messages,
                    temperature,
                    maxTokens,
                    top_p,
                    top_k,
                    repetition_penalty,
                    min_p,
                    selectedModel.id,
                    reasoning
                );
            case 'openai':
                return aiService.generateWithOpenAI(
                    messages,
                    selectedModel.id,
                    temperature,
                    maxTokens,
                    top_p,
                    top_k,
                    repetition_penalty,
                    min_p,
                    tools,
                    reasoning
                );
            case 'openai_compatible':
                return aiService.generateWithOpenAICompatible(
                    messages,
                    selectedModel.id,
                    temperature,
                    maxTokens,
                    top_p,
                    top_k,
                    repetition_penalty,
                    min_p,
                    tools,
                    reasoning
                );
            case 'openrouter':
                return aiService.generateWithOpenRouter(
                    messages,
                    selectedModel.id,
                    temperature,
                    maxTokens,
                    top_p,
                    top_k,
                    repetition_penalty,
                    min_p,
                    tools,
                    reasoning
                );
            case 'nanogpt':
                return aiService.generateWithNanoGPT(
                    messages,
                    selectedModel.id,
                    temperature,
                    maxTokens,
                    top_p,
                    top_k,
                    repetition_penalty,
                    min_p,
                    tools,
                    reasoning
                );
            case 'google':
                return aiService.generateWithGoogle(
                    messages,
                    selectedModel.id,
                    temperature,
                    maxTokens,
                    top_p,
                    top_k,
                    repetition_penalty,
                    min_p
                );
            default:
                throw new Error(`Unsupported provider: ${selectedModel.provider}`);
        }
    },

    // New method for generating with pre-parsed messages
    generateWithParsedMessages: async (messages: PromptMessage[], selectedModel: AllowedModel, promptId: string, onRequest) => {
        if (!get().isInitialized) {
            await get().initialize();
        }
        selectedModel = resolveModelForAvailableProvider(selectedModel, get().settings);

        if (!messages.length) {
            throw new Error('No messages provided for generation');
        }

        // Get the prompt to access temperature and maxTokens
        const prompt = await db.prompts.get(promptId);
        if (!prompt) {
            throw new Error(`Prompt with ID ${promptId} not found`);
        }

        onRequest?.(aiService.getGenerationModel(selectedModel), prompt);

        const temperature = prompt.temperature;
        const maxTokens = prompt.maxTokens ?? 2048;
        const top_p = prompt.top_p;
        const top_k = prompt.top_k;
        const repetition_penalty = prompt.repetition_penalty;
        const min_p = prompt.min_p;
        const reasoning = prompt.reasoning;

        switch (selectedModel.provider) {
            case 'local':
                return aiService.generateWithLocalModel(
                    messages,
                    temperature,
                    maxTokens,
                    top_p,
                    top_k,
                    repetition_penalty,
                    min_p,
                    selectedModel.id,
                    reasoning
                );
            case 'openai':
                return aiService.generateWithOpenAI(
                    messages,
                    selectedModel.id,
                    temperature,
                    maxTokens,
                    top_p,
                    top_k,
                    repetition_penalty,
                    min_p,
                    undefined,
                    reasoning
                );
            case 'openai_compatible':
                return aiService.generateWithOpenAICompatible(
                    messages,
                    selectedModel.id,
                    temperature,
                    maxTokens,
                    top_p,
                    top_k,
                    repetition_penalty,
                    min_p,
                    undefined,
                    reasoning
                );
            case 'openrouter':
                return aiService.generateWithOpenRouter(
                    messages,
                    selectedModel.id,
                    temperature,
                    maxTokens,
                    top_p,
                    top_k,
                    repetition_penalty,
                    min_p,
                    undefined,
                    reasoning
                );
            case 'nanogpt':
                return aiService.generateWithNanoGPT(
                    messages,
                    selectedModel.id,
                    temperature,
                    maxTokens,
                    top_p,
                    top_k,
                    repetition_penalty,
                    min_p,
                    undefined,
                    reasoning
                );
            case 'google':
                return aiService.generateWithGoogle(
                    messages,
                    selectedModel.id,
                    temperature,
                    maxTokens,
                    top_p,
                    top_k,
                    repetition_penalty,
                    min_p
                );
            default:
                throw new Error(`Unsupported provider: ${selectedModel.provider}`);
        }
    },

    abortGeneration: () => {
        console.log('[useAIStore] Aborting AI generation');
        aiService.abortStream();
    }
}));

function resolveModelForAvailableProvider(selectedModel: AllowedModel, settings: AISettings | null): AllowedModel {
    if (selectedModel.provider === 'openrouter' && !settings?.openrouterKey?.trim()) {
        return getPreferredDefaultModel(settings);
    }

    return selectedModel;
}
