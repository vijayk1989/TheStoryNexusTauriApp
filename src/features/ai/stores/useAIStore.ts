import { create } from 'zustand';
import { attemptPromise } from '@jfdi/attempt';
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
import { formatError } from '@/utils/errorUtils';
import { ERROR_MESSAGES } from '@/constants/errorMessages';
import { createPromptParser } from '@/features/prompts/services/promptParser';
import { generateWithProvider } from '@/features/ai/services/aiGenerationHelper';

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

        const [initError] = await attemptPromise(() => aiService.initialize());

        if (initError) {
            set({
                error: formatError(initError, ERROR_MESSAGES.FETCH_FAILED('AI service')),
                isLoading: false
            });
            return;
        }

        const [fetchError, settings] = await attemptPromise(() => db.aiSettings.toArray());

        if (fetchError) {
            set({
                error: formatError(fetchError, ERROR_MESSAGES.FETCH_FAILED('AI settings')),
                isLoading: false
            });
            return;
        }

        set({
            settings: settings[0] || null,
            isInitialized: true,
            isLoading: false
        });
    },

    getAvailableModels: async (provider?: AIProvider, forceRefresh: boolean = false) => {
        if (!get().isInitialized) {
            await get().initialize();
        }
        return aiService.getAvailableModels(provider, forceRefresh);
    },

    updateProviderKey: async (provider: AIProvider, key: string) => {
        set({ isLoading: true, error: null });

        const [updateError] = await attemptPromise(() => aiService.updateKey(provider, key));

        if (updateError) {
            set({
                error: formatError(updateError, ERROR_MESSAGES.UPDATE_FAILED('API key')),
                isLoading: false
            });
            throw updateError;
        }

        const [fetchError, settings] = await attemptPromise(() => db.aiSettings.toArray());

        if (fetchError) {
            set({
                error: formatError(fetchError, ERROR_MESSAGES.FETCH_FAILED('AI settings')),
                isLoading: false
            });
            throw fetchError;
        }

        set({ settings: settings[0], isLoading: false });
    },

    updateLocalApiUrl: async (url: string) => {
        set({ isLoading: true, error: null });

        const [updateError] = await attemptPromise(() => aiService.updateLocalApiUrl(url));

        if (updateError) {
            set({
                error: formatError(updateError, ERROR_MESSAGES.UPDATE_FAILED('local API URL')),
                isLoading: false
            });
            throw updateError;
        }

        const [fetchError, settings] = await attemptPromise(() => db.aiSettings.toArray());

        if (fetchError) {
            set({
                error: formatError(fetchError, ERROR_MESSAGES.FETCH_FAILED('AI settings')),
                isLoading: false
            });
            throw fetchError;
        }

        set({ settings: settings[0], isLoading: false });
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

        // Get the prompt to access generation parameters
        const [fetchError, prompt] = await attemptPromise(() => db.prompts.get(config.promptId));

        if (fetchError) {
            throw fetchError;
        }

        return generateWithProvider(selectedModel.provider, messages, selectedModel.id, {
            temperature: prompt?.temperature ?? 0.7,
            maxTokens: prompt?.maxTokens ?? 2048,
            top_p: prompt?.top_p,
            top_k: prompt?.top_k,
            repetition_penalty: prompt?.repetition_penalty,
            min_p: prompt?.min_p
        });
    },

    // New method for generating with pre-parsed messages
    generateWithParsedMessages: async (messages: PromptMessage[], selectedModel: AllowedModel, promptId: string) => {
        if (!get().isInitialized) {
            await get().initialize();
        }

        if (!messages.length) {
            throw new Error('No messages provided for generation');
        }

        // Get the prompt to access generation parameters
        const [fetchError, prompt] = await attemptPromise(() => db.prompts.get(promptId));

        if (fetchError || !prompt) {
            throw fetchError || new Error(ERROR_MESSAGES.NOT_FOUND(`prompt with ID ${promptId}`));
        }

        return generateWithProvider(selectedModel.provider, messages, selectedModel.id, {
            temperature: prompt.temperature ?? 0.7,
            maxTokens: prompt.maxTokens ?? 2048,
            top_p: prompt.top_p,
            top_k: prompt.top_k,
            repetition_penalty: prompt.repetition_penalty,
            min_p: prompt.min_p
        });
    },

    abortGeneration: () => {
        console.log('[useAIStore] Aborting AI generation');
        aiService.abortStream();
    }
}));
