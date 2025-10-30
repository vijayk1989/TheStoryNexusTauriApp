import { AIModel, AIProvider, AISettings, PromptMessage } from '@/types/story';
import { db } from '../database';
import { AIProviderFactory } from './AIProviderFactory';
import { attemptPromise } from '@jfdi/attempt';
import { formatSSEChunk, formatSSEDone } from '@/constants/aiConstants';

export class AIService {
    private static instance: AIService;
    private settings: AISettings | null = null;
    private readonly DEFAULT_LOCAL_API_URL = 'http://localhost:1234/v1';
    private providerFactory: AIProviderFactory;
    private abortController: AbortController | null = null;

    private constructor() {
        this.providerFactory = new AIProviderFactory(this.DEFAULT_LOCAL_API_URL);
    }

    static getInstance(): AIService {
        if (!AIService.instance) {
            AIService.instance = new AIService();
        }
        return AIService.instance;
    }

    async initialize() {
        const settings = await db.aiSettings.toArray();
        this.settings = settings[0] || await this.createInitialSettings();

        // Initialize providers with stored keys
        if (this.settings.openaiKey) {
            this.providerFactory.initializeProvider('openai', this.settings.openaiKey);
        }
        if (this.settings.openrouterKey) {
            this.providerFactory.initializeProvider('openrouter', this.settings.openrouterKey);
        }
        if (this.settings.localApiUrl) {
            this.providerFactory.updateLocalApiUrl(this.settings.localApiUrl);
        }
    }

    private async createInitialSettings(): Promise<AISettings> {
        const localProvider = this.providerFactory.getProvider('local');
        const localModels = await localProvider.fetchModels();

        const settings: AISettings = {
            id: crypto.randomUUID(),
            createdAt: new Date(),
            localApiUrl: this.DEFAULT_LOCAL_API_URL,
            availableModels: localModels,
        };

        await db.aiSettings.add(settings);
        return settings;
    }

    async updateKey(provider: AIProvider, key: string) {
        if (!this.settings) throw new Error('AIService not initialized');

        console.log(`[AIService] Updating key for provider: ${provider}`);

        const update: Partial<AISettings> = {
            ...(provider === 'openai' && { openaiKey: key }),
            ...(provider === 'openrouter' && { openrouterKey: key })
        };

        await db.aiSettings.update(this.settings.id, update);
        Object.assign(this.settings, update);

        // Initialize provider with new key
        this.providerFactory.initializeProvider(provider, key);

        // Fetch available models when key is updated
        await this.fetchAvailableModels(provider);
    }

    private async fetchAvailableModels(provider: AIProvider) {
        if (!this.settings) throw new Error('AIService not initialized');

        console.log(`[AIService] Fetching available models for provider: ${provider}`);

        const aiProvider = this.providerFactory.getProvider(provider);
        const [error, models] = await attemptPromise(() => aiProvider.fetchModels());

        if (error) {
            console.error('Error fetching models:', error);
            throw error;
        }

        console.log(`[AIService] Fetched ${models.length} models for ${provider}`);

        // Update only models from this provider, keep others
        const existingModels = this.settings.availableModels.filter(m => m.provider !== provider);
        const updatedModels = [...existingModels, ...models];

        await db.aiSettings.update(this.settings.id, {
            availableModels: updatedModels,
            lastModelsFetch: new Date()
        });

        this.settings.availableModels = updatedModels;
        this.settings.lastModelsFetch = new Date();
    }

    async getAvailableModels(provider?: AIProvider, forceRefresh: boolean = true): Promise<AIModel[]> {
        if (!this.settings) throw new Error('AIService not initialized');

        // Ensure settings are up to date
        const dbSettings = await db.aiSettings.get(this.settings.id);
        if (dbSettings) {
            this.settings = dbSettings;
        }

        // Check if we should fetch fresh models
        if (provider && forceRefresh) {
            await this.fetchAvailableModels(provider);
        }

        const result = provider
            ? this.settings.availableModels.filter(m => m.provider === provider)
            : this.settings.availableModels;

        return result;
    }

    private formatStreamAsSSE(response: Response): Response {
        const responseStream = new ReadableStream({
            async start(controller) {
                if (!response.body) {
                    controller.close();
                    return;
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                const [error] = await attemptPromise(async () => {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const content = decoder.decode(value, { stream: true });
                        const formattedChunk = formatSSEChunk(content);

                        controller.enqueue(new TextEncoder().encode(formattedChunk));
                    }
                    controller.enqueue(new TextEncoder().encode(formatSSEDone()));
                });

                if (error) {
                    if ((error as Error).name === 'AbortError') {
                        controller.close();
                    } else {
                        controller.error(error);
                    }
                } else {
                    controller.close();
                }
            }
        });

        return new Response(responseStream, {
            headers: { 'Content-Type': 'text/event-stream' }
        });
    }

    async generateWithLocalModel(
        messages: PromptMessage[],
        modelId: string,
        temperature: number = 1.0,
        maxTokens: number = 2048,
        _top_p?: number,
        _top_k?: number,
        _repetition_penalty?: number,
        _min_p?: number
    ): Promise<Response> {
        this.abortController = new AbortController();

        const provider = this.providerFactory.getProvider('local');
        return await provider.generate(
            messages,
            modelId,
            temperature,
            maxTokens,
            this.abortController.signal
        );
    }

    async generateWithOpenAI(
        messages: PromptMessage[],
        modelId: string,
        temperature: number = 1.0,
        maxTokens: number = 2048,
        _top_p?: number,
        _top_k?: number,
        _repetition_penalty?: number,
        _min_p?: number
    ): Promise<Response> {
        if (!this.settings?.openaiKey) {
            throw new Error('OpenAI API key not set');
        }

        const provider = this.providerFactory.getProvider('openai');
        if (!provider.isInitialized()) {
            this.providerFactory.initializeProvider('openai', this.settings.openaiKey);
        }

        this.abortController = new AbortController();

        const [error, response] = await attemptPromise(() =>
            provider.generate(
                messages,
                modelId,
                temperature,
                maxTokens,
                this.abortController!.signal
            )
        );

        if (error) {
            if ((error as Error).name === 'AbortError') {
                return new Response(null, { status: 204 });
            }
            throw error;
        }

        if (!response) {
            throw new Error('No response from provider');
        }

        return this.formatStreamAsSSE(response);
    }

    async generateWithOpenRouter(
        messages: PromptMessage[],
        modelId: string,
        temperature: number = 1.0,
        maxTokens: number = 2048,
        _top_p?: number,
        _top_k?: number,
        _repetition_penalty?: number,
        _min_p?: number
    ): Promise<Response> {
        if (!this.settings?.openrouterKey) {
            throw new Error('OpenRouter API key not set');
        }

        const provider = this.providerFactory.getProvider('openrouter');
        if (!provider.isInitialized()) {
            this.providerFactory.initializeProvider('openrouter', this.settings.openrouterKey);
        }

        this.abortController = new AbortController();

        const [error, response] = await attemptPromise(() =>
            provider.generate(
                messages,
                modelId,
                temperature,
                maxTokens,
                this.abortController!.signal
            )
        );

        if (error) {
            if ((error as Error).name === 'AbortError') {
                return new Response(null, { status: 204 });
            }
            throw error;
        }

        if (!response) {
            throw new Error('No response from provider');
        }

        return this.formatStreamAsSSE(response);
    }

    async processStreamedResponse(
        response: Response,
        onToken: (text: string) => void,
        onComplete: () => void,
        onError: (error: Error) => void
    ) {
        if (!response.body) {
            return onError(new Error('Response body is null'));
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        const [error] = await attemptPromise(async () => {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    onComplete();
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        if (data === '[DONE]') {
                            onComplete();
                            return;
                        }
                        const [parseError, json] = await attemptPromise(() => Promise.resolve(JSON.parse(data)));
                        if (!parseError && json) {
                            const text = json.choices[0]?.delta?.content || '';
                            if (text) {
                                onToken(text);
                            }
                        }
                    }
                }
            }
        });

        if (error) {
            if ((error as Error).name === 'AbortError') {
                console.log('Stream reading aborted.');
                onComplete();
            } else {
                onError(error as Error);
            }
        }

        this.abortController = null;
    }

    // Getter methods
    getOpenAIKey(): string | undefined {
        return this.settings?.openaiKey;
    }

    getOpenRouterKey(): string | undefined {
        return this.settings?.openrouterKey;
    }

    getLocalApiUrl(): string {
        return this.settings?.localApiUrl || this.DEFAULT_LOCAL_API_URL;
    }

    getDefaultLocalModel(): string | undefined {
        return this.settings?.defaultLocalModel;
    }

    getDefaultOpenAIModel(): string | undefined {
        return this.settings?.defaultOpenAIModel;
    }

    getDefaultOpenRouterModel(): string | undefined {
        return this.settings?.defaultOpenRouterModel;
    }

    async updateDefaultModel(provider: AIProvider, modelId: string | undefined): Promise<void> {
        if (!this.settings) {
            throw new Error('AI settings not initialized');
        }

        if (provider === 'local') {
            await db.aiSettings.update(this.settings.id, { defaultLocalModel: modelId });
            this.settings.defaultLocalModel = modelId;
        } else if (provider === 'openai') {
            await db.aiSettings.update(this.settings.id, { defaultOpenAIModel: modelId });
            this.settings.defaultOpenAIModel = modelId;
        } else if (provider === 'openrouter') {
            await db.aiSettings.update(this.settings.id, { defaultOpenRouterModel: modelId });
            this.settings.defaultOpenRouterModel = modelId;
        }
    }

    async updateLocalApiUrl(url: string): Promise<void> {
        if (!this.settings) {
            throw new Error('Settings not initialized');
        }
        await db.aiSettings.update(this.settings.id, { localApiUrl: url });
        this.settings.localApiUrl = url;

        // Update provider and re-fetch models
        this.providerFactory.updateLocalApiUrl(url);
        await this.fetchAvailableModels('local');
    }

    getSettings(): AISettings | null {
        return this.settings;
    }

    abortStream(): void {
        if (this.abortController) {
            console.log('[AIService] Aborting stream');
            this.abortController.abort();
            this.abortController = null;
        }
    }
}

export const aiService = AIService.getInstance();
