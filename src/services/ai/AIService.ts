import { AIModel, AIProvider, AISettings, PromptMessage } from '@/types/story';
import { db } from '../database';
import OpenAI from 'openai';

export class AIService {
    private static instance: AIService;
    private settings: AISettings | null = null;
    private readonly LOCAL_API_URL = 'http://localhost:1234/v1';
    private openRouter: OpenAI | null = null;
    private openAI: OpenAI | null = null;

    private constructor() { }

    static getInstance(): AIService {
        if (!AIService.instance) {
            AIService.instance = new AIService();
        }
        return AIService.instance;
    }

    async initialize() {
        // Load or create settings
        const settings = await db.aiSettings.toArray();
        this.settings = settings[0] || await this.createInitialSettings();
    }

    private async createInitialSettings(): Promise<AISettings> {
        const localModels = await this.fetchLocalModels();
        const settings: AISettings = {
            id: crypto.randomUUID(),
            createdAt: new Date(),
            availableModels: localModels,
        };
        await db.aiSettings.add(settings);
        return settings;
    }

    private async fetchLocalModels(): Promise<AIModel[]> {
        try {
            const response = await fetch(`${this.LOCAL_API_URL}/models`);
            if (!response.ok) throw new Error('Failed to fetch local models');

            const result = await response.json();
            return result.data.map((model: { id: string, object: string, owned_by: string }) => ({
                id: `local/${model.id}`,
                name: model.id, // We could prettify this name if needed
                provider: 'local' as AIProvider,
                contextLength: 4096, // Default value since not provided by API
                enabled: true
            }));
        } catch (error) {
            console.warn('Failed to fetch local models:', error);
            // Fallback to default model if fetch fails
            return [{
                id: 'local/llama-3.2-3b-instruct',
                name: 'Llama 3.2 3B Instruct',
                provider: 'local',
                contextLength: 4096,
                enabled: true
            }];
        }
    }

    private initializeOpenRouter() {
        if (!this.settings?.openrouterKey) return;

        this.openRouter = new OpenAI({
            baseURL: 'https://openrouter.ai/api/v1',
            apiKey: this.settings.openrouterKey,
            dangerouslyAllowBrowser: true,
            defaultHeaders: {
                'HTTP-Referer': 'http://localhost:5173',
                'X-Title': 'Story Forge Desktop',
            }
        });
    }

    private initializeOpenAI() {
        if (!this.settings?.openaiKey) return;

        this.openAI = new OpenAI({
            apiKey: this.settings.openaiKey,
            dangerouslyAllowBrowser: true
        });
    }

    async updateKey(provider: AIProvider, key: string) {
        if (!this.settings) throw new Error('AIService not initialized');

        const update: Partial<AISettings> = {
            ...(provider === 'openai' && { openaiKey: key }),
            ...(provider === 'openrouter' && { openrouterKey: key })
        };

        await db.aiSettings.update(this.settings.id, update);
        Object.assign(this.settings, update);

        // Initialize clients if needed
        if (provider === 'openrouter') {
            this.initializeOpenRouter();
        } else if (provider === 'openai') {
            this.initializeOpenAI();
        }

        // Fetch available models when key is updated
        await this.fetchAvailableModels(provider);
    }

    private async fetchAvailableModels(provider: AIProvider) {
        if (!this.settings) throw new Error('AIService not initialized');

        try {
            let models: AIModel[] = [];

            switch (provider) {
                case 'local':
                    models = await this.fetchLocalModels();
                    break;
                case 'openai':
                    if (this.settings.openaiKey) {
                        models = await this.fetchOpenAIModels();
                    }
                    break;
                case 'openrouter':
                    if (this.settings.openrouterKey) {
                        models = await this.fetchOpenRouterModels();
                    }
                    break;
            }

            // Update only models from this provider, keep others
            const existingModels = this.settings.availableModels.filter(m => m.provider !== provider);
            const updatedModels = [...existingModels, ...models];

            await db.aiSettings.update(this.settings.id, {
                availableModels: updatedModels,
                lastModelsFetch: new Date()
            });

            this.settings.availableModels = updatedModels;
            this.settings.lastModelsFetch = new Date();
        } catch (error) {
            console.error('Error fetching models:', error);
            throw error;
        }
    }

    private async fetchOpenAIModels(): Promise<AIModel[]> {
        // Implementation for OpenAI models fetch
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${this.settings?.openaiKey}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch OpenAI models');
        const data = await response.json();

        return data.data
            .filter((model: any) => model.id.startsWith('gpt'))
            .map((model: any) => ({
                id: model.id,
                name: model.id,
                provider: 'openai' as AIProvider,
                contextLength: model.context_length || 4096,
                enabled: true
            }));
    }

    private async fetchOpenRouterModels(): Promise<AIModel[]> {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${this.settings?.openrouterKey}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch OpenRouter models');
        const data = await response.json();

        return data.data.map((model: any) => ({
            id: model.id,
            name: model.name,
            provider: 'openrouter' as AIProvider,
            contextLength: model.context_length,
            enabled: true
        }));
    }

    async getAvailableModels(provider?: AIProvider): Promise<AIModel[]> {
        if (!this.settings) throw new Error('AIService not initialized');

        // Ensure settings are up to date
        const dbSettings = await db.aiSettings.get(this.settings.id);
        if (dbSettings) {
            this.settings = dbSettings;
        }

        return provider
            ? this.settings.availableModels.filter(m => m.provider === provider)
            : this.settings.availableModels;
    }

    async generateWithLocalModel(messages: PromptMessage[]): Promise<Response> {
        const response = await fetch(`${this.LOCAL_API_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages,
                stream: true,
                model: 'local/llama-3.2-3b-instruct',
                temperature: 0.7,
                max_tokens: 2048,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to generate with local model');
        }

        return response;
    }

    async processStreamedResponse(response: Response,
        onToken: (text: string) => void,
        onComplete: () => void,
        onError: (error: Error) => void
    ) {
        try {
            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            onComplete();
                            return;
                        }

                        try {
                            const json = JSON.parse(data);
                            const content = json.choices[0]?.delta?.content;
                            if (content) {
                                onToken(content);
                            }
                        } catch (e) {
                            console.warn('Failed to parse JSON:', e);
                        }
                    }
                }
            }
            onComplete();
        } catch (error) {
            onError(error as Error);
        }
    }

    async generateWithOpenAI(messages: PromptMessage[], modelId: string): Promise<Response> {
        if (!this.settings?.openaiKey) {
            throw new Error('OpenAI API key not configured');
        }

        if (!this.openAI) {
            this.initializeOpenAI();
        }

        const stream = await this.openAI!.chat.completions.create({
            model: modelId,
            messages,
            stream: true,
            temperature: 0.7,
            max_tokens: 2048,
        });

        // Convert the stream to a Response object to maintain compatibility
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
            async start(controller) {
                for await (const chunk of stream) {
                    const text = chunk.choices[0]?.delta?.content || '';
                    if (text) {
                        const data = {
                            choices: [{
                                delta: { content: text }
                            }]
                        };
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                    }
                }
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
            }
        });

        return new Response(readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            }
        });
    }

    async generateWithOpenRouter(messages: PromptMessage[], modelId: string): Promise<Response> {
        if (!this.settings?.openrouterKey) {
            throw new Error('OpenRouter API key not configured');
        }

        if (!this.openRouter) {
            this.initializeOpenRouter();
        }

        const stream = await this.openRouter!.chat.completions.create({
            model: modelId,
            messages,
            stream: true,
            temperature: 0.7,
            max_tokens: 2048,
        });

        // Convert the stream to a Response object to maintain compatibility
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
            async start(controller) {
                for await (const chunk of stream) {
                    const text = chunk.choices[0]?.delta?.content || '';
                    if (text) {
                        const data = {
                            choices: [{
                                delta: { content: text }
                            }]
                        };
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                    }
                }
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
            }
        });

        return new Response(readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            }
        });
    }

    // Add getter methods for settings
    getOpenAIKey(): string | undefined {
        return this.settings?.openaiKey;
    }

    getOpenRouterKey(): string | undefined {
        return this.settings?.openrouterKey;
    }

    getSettings(): AISettings | null {
        return this.settings;
    }
}

export const aiService = AIService.getInstance();
