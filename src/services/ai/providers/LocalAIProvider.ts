import { AIModel, AIProvider, PromptMessage } from '@/types/story';
import { IAIProvider } from './IAIProvider';

export class LocalAIProvider implements IAIProvider {
    private apiUrl: string;

    constructor(apiUrl: string = 'http://localhost:1234/v1') {
        this.apiUrl = apiUrl;
    }

    initialize(apiUrl?: string): void {
        if (apiUrl) {
            this.apiUrl = apiUrl;
        }
    }

    async fetchModels(): Promise<AIModel[]> {
        try {
            console.log(`[LocalAIProvider] Fetching models from: ${this.apiUrl}`);

            const response = await fetch(`${this.apiUrl}/models`);
            if (!response.ok) {
                console.error(`[LocalAIProvider] Failed to fetch models: ${response.status}`);
                throw new Error('Failed to fetch local models');
            }

            const result = await response.json();
            console.log(`[LocalAIProvider] Received ${result.data.length} models`);

            const models = result.data.map((model: { id: string }) => ({
                id: `local/${model.id}`,
                name: model.id,
                provider: 'local' as AIProvider,
                contextLength: 16384,
                enabled: true
            }));

            return models;
        } catch (error) {
            console.warn('[LocalAIProvider] Failed to fetch models:', error);
            return [{
                id: 'local',
                name: 'Local Model',
                provider: 'local',
                contextLength: 16384,
                enabled: true
            }];
        }
    }

    async generate(
        messages: PromptMessage[],
        model: string,
        temperature: number,
        maxTokens: number,
        signal?: AbortSignal
    ): Promise<Response> {
        const modelId = model.replace('local/', '');

        return await fetch(`${this.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: modelId,
                messages,
                temperature,
                max_tokens: maxTokens,
                stream: true
            }),
            signal
        });
    }

    isInitialized(): boolean {
        return !!this.apiUrl;
    }
}
