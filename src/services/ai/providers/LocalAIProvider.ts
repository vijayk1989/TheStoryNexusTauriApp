import { AIModel, AIProvider, PromptMessage } from '@/types/story';
import { IAIProvider } from './IAIProvider';
import { attemptPromise } from '@jfdi/attempt';
import { API_URLS } from '@/constants/urls';

export class LocalAIProvider implements IAIProvider {
    private apiUrl: string;

    constructor(apiUrl: string = API_URLS.LOCAL_AI_DEFAULT) {
        this.apiUrl = apiUrl;
    }

    initialize(apiUrl?: string): void {
        if (apiUrl) {
            this.apiUrl = apiUrl;
        }
    }

    async fetchModels(): Promise<AIModel[]> {
        console.log(`[LocalAIProvider] Fetching models from: ${this.apiUrl}`);

        const [fetchError, response] = await attemptPromise(() =>
            fetch(`${this.apiUrl}/models`)
        );

        if (fetchError || !response) {
            console.warn('[LocalAIProvider] Failed to fetch models:', fetchError);
            return [{
                id: 'local',
                name: 'Local Model',
                provider: 'local',
                contextLength: 16384,
                enabled: true
            }];
        }

        if (!response.ok) {
            console.error(`[LocalAIProvider] Failed to fetch models: ${response.status}`);
            return [{
                id: 'local',
                name: 'Local Model',
                provider: 'local',
                contextLength: 16384,
                enabled: true
            }];
        }

        const [jsonError, result] = await attemptPromise(() => response.json());

        if (jsonError || !result) {
            console.warn('[LocalAIProvider] Failed to parse models:', jsonError);
            return [{
                id: 'local',
                name: 'Local Model',
                provider: 'local',
                contextLength: 16384,
                enabled: true
            }];
        }

        console.log(`[LocalAIProvider] Received ${result.data.length} models`);

        const models = result.data.map((model: { id: string }) => ({
            id: `local/${model.id}`,
            name: model.id,
            provider: 'local' as AIProvider,
            contextLength: 16384,
            enabled: true
        }));

        return models;
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
