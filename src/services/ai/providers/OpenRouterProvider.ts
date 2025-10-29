import OpenAI from 'openai';
import { AIModel, AIProvider, PromptMessage } from '@/types/story';
import { IAIProvider } from './IAIProvider';

export class OpenRouterProvider implements IAIProvider {
    private client: OpenAI | null = null;

    initialize(apiKey?: string): void {
        if (!apiKey) return;

        this.client = new OpenAI({
            baseURL: 'https://openrouter.ai/api/v1',
            apiKey,
            dangerouslyAllowBrowser: true,
            defaultHeaders: {
                'HTTP-Referer': 'http://localhost:5173',
                'X-Title': 'Story Forge Desktop',
            }
        });
    }

    async fetchModels(): Promise<AIModel[]> {
        if (!this.client) {
            console.warn('[OpenRouterProvider] Client not initialized');
            return [];
        }

        try {
            console.log('[OpenRouterProvider] Fetching models');

            const response = await fetch('https://openrouter.ai/api/v1/models');
            if (!response.ok) {
                throw new Error('Failed to fetch OpenRouter models');
            }

            const result = await response.json();

            const models: AIModel[] = result.data.map((model: any) => ({
                id: model.id,
                name: model.name || model.id,
                provider: 'openrouter' as AIProvider,
                contextLength: model.context_length || 4096,
                enabled: true
            }));

            console.log(`[OpenRouterProvider] Fetched ${models.length} models`);
            return models;
        } catch (error) {
            console.error('[OpenRouterProvider] Error fetching models:', error);
            return [];
        }
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
                    try {
                        for await (const chunk of stream) {
                            const content = chunk.choices[0]?.delta?.content;
                            if (content) {
                                controller.enqueue(new TextEncoder().encode(content));
                            }
                        }
                        controller.close();
                    } catch (error) {
                        controller.error(error);
                    }
                }
            })
        );
    }

    isInitialized(): boolean {
        return this.client !== null;
    }
}
