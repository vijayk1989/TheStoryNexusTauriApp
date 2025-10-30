import type { AIProvider, PromptMessage } from '@/types/story';
import type { GenerationParams } from '../types/generationParams';
import { aiService } from '@/services/ai/AIService';

export const generateWithProvider = (
	provider: AIProvider,
	messages: PromptMessage[],
	modelId: string,
	params: GenerationParams,
): Promise<Response> => {
	const { temperature, maxTokens, top_p, top_k, repetition_penalty, min_p } =
		params;

	switch (provider) {
		case 'local':
			return aiService.generateWithLocalModel(
				messages,
				modelId,
				temperature,
				maxTokens,
				top_p,
				top_k,
				repetition_penalty,
				min_p,
			);
		case 'openai':
			return aiService.generateWithOpenAI(
				messages,
				modelId,
				temperature,
				maxTokens,
			);
		case 'openrouter':
			return aiService.generateWithOpenRouter(
				messages,
				modelId,
				temperature,
				maxTokens,
				top_p,
				top_k,
				repetition_penalty,
				min_p,
			);
		default:
			throw new Error(`Unknown provider: ${provider}`);
	}
};
