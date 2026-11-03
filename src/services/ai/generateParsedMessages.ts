import { db } from '@/services/database';
import { getPreferredDefaultModel } from '@/features/ai/utils/defaultModels';
import type { AllowedModel, GenerationMessage, Prompt } from '@/types/story';
import type { AIService } from './AIService';

export async function generateParsedMessages(
    service: AIService,
    messages: GenerationMessage[],
    selectedModel: AllowedModel,
    promptId: string,
    onRequest?: (model: AllowedModel, prompt: Prompt) => void,
): Promise<Response> {
    if (selectedModel.provider === 'openrouter' && !service.getSettings()?.openrouterKey?.trim()) {
        selectedModel = getPreferredDefaultModel(service.getSettings());
    }

    if (!messages.length) {
        throw new Error('No messages provided for generation');
    }

    // Get the prompt to access temperature and maxTokens
    const prompt = await db.prompts.get(promptId);
    if (!prompt) {
        throw new Error(`Prompt with ID ${promptId} not found`);
    }

    onRequest?.(service.getGenerationModel(selectedModel), prompt);

    const temperature = prompt.temperature;
    const maxTokens = prompt.maxTokens ?? 2048;
    const top_p = prompt.top_p;
    const top_k = prompt.top_k;
    const repetition_penalty = prompt.repetition_penalty;
    const min_p = prompt.min_p;
    const reasoning = prompt.reasoning;

    switch (selectedModel.provider) {
        case 'local':
            return service.generateWithLocalModel(
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
            return service.generateWithOpenAI(
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
            return service.generateWithOpenAICompatible(
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
            return service.generateWithOpenRouter(
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
            return service.generateWithNanoGPT(
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
            return service.generateWithGoogle(
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
}
