import { AIModel, PromptMessage } from '@/types/story';

export interface IAIProvider {
    initialize(apiKey?: string): void;
    fetchModels(): Promise<AIModel[]>;
    generate(
        messages: PromptMessage[],
        model: string,
        temperature: number,
        maxTokens: number,
        signal?: AbortSignal
    ): Promise<Response>;
    isInitialized(): boolean;
}
