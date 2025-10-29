import { create } from 'zustand';
import {
    AIModel,
    AIProvider,
    AISettings,
    PromptParserConfig,
    PromptMessage,
    AllowedModel
} from '@/types/story';
import { aiService } from '@/services/ai/AIService';
import { db } from '@/services/database';
import { createPromptParser } from '@/features/prompts/services/promptParser';

interface AIState {
    settings: AISettings | null;
    isInitialized: boolean;
    isLoading: boolean;
    error: string | null;

    // Initialize AI service and load settings
    initialize: () => Promise<void>;

    // Model management
    getAvailableModels: (provider?: AIProvider, forceRefresh?: boolean) => Promise<AIModel[]>;
    updateProviderKey: (provider: AIProvider, key: string) => Promise<void>;
    updateLocalApiUrl: (url: string) => Promise<void>;

    // Generation methods
    generateWithLocalModel: (
        messages: PromptMessage[],
        modelId: string,
        temperature?: number,
        maxTokens?: number,
        top_p?: number,
        top_k?: number,
        repetition_penalty?: number,
        min_p?: number
    ) => Promise<Response>;

    processStreamedResponse: (
        response: Response,
        onToken: (text: string) => void,
        onComplete: () => void,
        onError: (error: Error) => void
    ) => Promise<void>;

    generateWithPrompt: (config: PromptParserConfig, selectedModel: AllowedModel) => Promise<Response>;

    // New method for generating with pre-parsed messages
    generateWithParsedMessages: (
        messages: PromptMessage[],
        selectedModel: AllowedModel,
        promptId: string
    ) => Promise<Response>;

    // New method to abort generation
    abortGeneration: () => void;
}

export const useAIStore = create<AIState>((set, get) => ({
    settings: null,
    isInitialized: false,
    isLoading: false,
    error: null,

    initialize: async () => {
        set({ isLoading: true, error: null });
        try {
            await aiService.initialize();
            const settings = await db.aiSettings.toArray();
            set({
                settings: settings[0] || null,
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
        return aiService.getAvailableModels(provider, forceRefresh);
    },

    updateProviderKey: async (provider: AIProvider, key: string) => {
        set({ isLoading: true, error: null });
        try {
            await aiService.updateKey(provider, key);
            const settings = await db.aiSettings.toArray();
            set({ settings: settings[0], isLoading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to update API key',
                isLoading: false
            });
            throw error;
        }
    },

    updateLocalApiUrl: async (url: string) => {
        set({ isLoading: true, error: null });
        try {
            await aiService.updateLocalApiUrl(url);
            const settings = await db.aiSettings.toArray();
            set({ settings: settings[0], isLoading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to update local API URL',
                isLoading: false
            });
            throw error;
        }
    },

    generateWithLocalModel: async (messages: PromptMessage[], modelId: string, temperature?: number, maxTokens?: number, top_p?: number, top_k?: number, repetition_penalty?: number, min_p?: number) => {
        if (!get().isInitialized) {
            await get().initialize();
        }
        return aiService.generateWithLocalModel(messages, modelId, temperature, maxTokens, top_p, top_k, repetition_penalty, min_p);
    },

    processStreamedResponse: async (response, onToken, onComplete, onError) => {
        await aiService.processStreamedResponse(response, onToken, onComplete, onError);
    },

    generateWithPrompt: async (config: PromptParserConfig, selectedModel: AllowedModel) => {
        if (!get().isInitialized) {
            await get().initialize();
        }

        const promptParser = createPromptParser();
        const { messages, error } = await promptParser.parse(config);

        if (error || !messages.length) {
            throw new Error(error || 'Failed to parse prompt');
        }

        // Get the prompt to access temperature and maxTokens
        const prompt = await db.prompts.get(config.promptId);
        const temperature = prompt?.temperature ?? 0.7;
        const maxTokens = prompt?.maxTokens ?? 2048;

        // Get the new parameters with their default values if not set
        const top_p = prompt?.top_p;
        const top_k = prompt?.top_k;
        const repetition_penalty = prompt?.repetition_penalty;
        const min_p = prompt?.min_p;

        switch (selectedModel.provider) {
            case 'local':
                return aiService.generateWithLocalModel(
                    messages,
                    selectedModel.id,
                    temperature,
                    maxTokens,
                    top_p,
                    top_k,
                    repetition_penalty,
                    min_p
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
                    min_p
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
                    min_p
                );
            default:
                throw new Error(`Unsupported provider: ${selectedModel.provider}`);
        }
    },

    // New method for generating with pre-parsed messages
    generateWithParsedMessages: async (messages: PromptMessage[], selectedModel: AllowedModel, promptId: string) => {
        if (!get().isInitialized) {
            await get().initialize();
        }

        if (!messages.length) {
            throw new Error('No messages provided for generation');
        }

        // Get the prompt to access temperature and maxTokens
        const prompt = await db.prompts.get(promptId);
        if (!prompt) {
            throw new Error(`Prompt with ID ${promptId} not found`);
        }

        const temperature = prompt.temperature ?? 0.7;
        const maxTokens = prompt.maxTokens ?? 2048;
        const top_p = prompt.top_p;
        const top_k = prompt.top_k;
        const repetition_penalty = prompt.repetition_penalty;
        const min_p = prompt.min_p;

        switch (selectedModel.provider) {
            case 'local':
                return aiService.generateWithLocalModel(
                    messages,
                    selectedModel.id,
                    temperature,
                    maxTokens,
                    top_p,
                    top_k,
                    repetition_penalty,
                    min_p
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
                    min_p
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
