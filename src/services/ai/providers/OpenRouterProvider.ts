import OpenAI from 'openai';
import { AIModel, AIProvider, PromptMessage } from '@/types/story';
import { IAIProvider } from './IAIProvider';
import { attemptPromise } from '@jfdi/attempt';
import { API_URLS } from '@/constants/urls';

interface OpenRouterModelResponse {
    id: string;
    name?: string;
    context_length?: number;
    pricing?: {
        prompt: string;
        completion: string;
    };
}

interface OpenRouterModelsResponse {
    data: OpenRouterModelResponse[];
}

export class OpenRouterProvider implements IAIProvider {
    private client: OpenAI | null = null;

    initialize(apiKey?: string): void {
        if (!apiKey) return;

        this.client = new OpenAI({
            baseURL: API_URLS.OPENROUTER_BASE,
            apiKey,
            dangerouslyAllowBrowser: true,
            defaultHeaders: {
                'HTTP-Referer': API_URLS.DEV_REFERER,
                'X-Title': 'Story Forge Desktop',
            }
        });
    }

    async fetchModels(): Promise<AIModel[]> {
        if (!this.client) {
            console.warn('[OpenRouterProvider] Client not initialized');
            return [];
        }

        console.log('[OpenRouterProvider] Fetching models');

        const [fetchError, response] = await attemptPromise(() =>
            fetch(`${API_URLS.OPENROUTER_BASE}/models`)
        );

        if (fetchError || !response) {
            console.error('[OpenRouterProvider] Error fetching models:', fetchError);
            return [];
        }

        if (!response.ok) {
            console.error('[OpenRouterProvider] Failed to fetch OpenRouter models');
            return [];
        }

        const [jsonError, result] = await attemptPromise<OpenRouterModelsResponse>(() =>
            response.json()
        );

        if (jsonError || !result) {
            console.error('[OpenRouterProvider] Error parsing models:', jsonError);
            return [];
        }

        const models: AIModel[] = result.data.map((model: OpenRouterModelResponse) => ({
            id: model.id,
            name: model.name || model.id,
            provider: 'openrouter' as AIProvider,
            contextLength: model.context_length || 4096,
            enabled: true
        }));

        console.log(`[OpenRouterProvider] Fetched ${models.length} models`);
        return models;
    }

    async generate(
        messages: PromptMessage[],
        model: string,
        temperature: number,
        maxTokens: number,
        signal?: AbortSignal
    ): Promise<Response> {
        if (!this.client) {
            throw new Error('OpenRouter client not initialized');
        }

        const stream = await this.client.chat.completions.create({
            model,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            temperature,
            max_tokens: maxTokens,
            stream: true
        }, { signal });

        return new Response(
            new ReadableStream({
                async start(controller) {
                    const [error] = await attemptPromise(async () => {
                        for await (const chunk of stream) {
                            const content = chunk.choices[0]?.delta?.content;
                            if (content) {
                                controller.enqueue(new TextEncoder().encode(content));
                            }
                        }
                    });

                    if (error) {
                        controller.error(error);
                    } else {
                        controller.close();
                    }
                }
            })
        );
    }

    isInitialized(): boolean {
        return this.client !== null;
    }
}
