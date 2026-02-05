import { useState, useCallback, useRef } from 'react';
import { AllowedModel, PromptMessage, PromptParserConfig } from '@/types/story';
import { aiService } from '@/services/ai/AIService';
import { createPromptParser } from '@/features/prompts/services/promptParser';
import { db } from '@/services/database';

export interface ParallelResponse {
    model: AllowedModel;
    text: string;
    status: 'pending' | 'streaming' | 'complete' | 'error';
    error?: string;
}

export interface UseParallelGenerationReturn {
    responses: ParallelResponse[];
    isGenerating: boolean;
    allComplete: boolean;
    generateParallel: (config: PromptParserConfig, models: AllowedModel[]) => Promise<void>;
    abortAll: () => void;
    resetResponses: () => void;
}

/**
 * Hook for generating responses from multiple LLMs in parallel with independent streaming.
 * Each model streams independently, updating its own slot in the responses array.
 */
export function useParallelGeneration(): UseParallelGenerationReturn {
    const [responses, setResponses] = useState<ParallelResponse[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const abortControllersRef = useRef<AbortController[]>([]);

    /**
     * Check if all responses are complete (or errored)
     */
    const allComplete = responses.length > 0 && responses.every(
        r => r.status === 'complete' || r.status === 'error'
    );

    /**
     * Generate from a model with its own abort controller
     */
    const generateFromModel = useCallback(async (
        model: AllowedModel,
        messages: PromptMessage[],
        temperature: number,
        maxTokens: number,
        index: number,
        abortController: AbortController,
        top_p?: number,
        top_k?: number,
        repetition_penalty?: number,
        min_p?: number
    ): Promise<void> => {
        // Update status to streaming
        setResponses(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], status: 'streaming' };
            return copy;
        });

        try {
            let response: Response;

            switch (model.provider) {
                case 'local':
                    response = await aiService.generateWithLocalModel(
                        messages, temperature, maxTokens, top_p, top_k, repetition_penalty, min_p
                    );
                    break;
                case 'openai':
                    response = await aiService.generateWithOpenAI(
                        messages, model.id, temperature, maxTokens, top_p, top_k, repetition_penalty, min_p
                    );
                    break;
                case 'openai_compatible':
                    response = await aiService.generateWithOpenAICompatible(
                        messages, model.id, temperature, maxTokens, top_p, top_k, repetition_penalty, min_p
                    );
                    break;
                case 'openrouter':
                    response = await aiService.generateWithOpenRouter(
                        messages, model.id, temperature, maxTokens, top_p, top_k, repetition_penalty, min_p
                    );
                    break;
                case 'nanogpt':
                    response = await aiService.generateWithNanoGPT(
                        messages, model.id, temperature, maxTokens, top_p, top_k, repetition_penalty, min_p
                    );
                    break;
                default:
                    throw new Error(`Unsupported provider: ${model.provider}`);
            }

            // Handle aborted response
            if (response.status === 204) {
                setResponses(prev => {
                    const copy = [...prev];
                    copy[index] = { ...copy[index], status: 'complete' };
                    return copy;
                });
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Process streaming response
            await aiService.processStreamedResponse(
                response,
                (token) => {
                    // Check if aborted
                    if (abortController.signal.aborted) return;
                    
                    setResponses(prev => {
                        const copy = [...prev];
                        copy[index] = { 
                            ...copy[index], 
                            text: copy[index].text + token 
                        };
                        return copy;
                    });
                },
                () => {
                    setResponses(prev => {
                        const copy = [...prev];
                        copy[index] = { ...copy[index], status: 'complete' };
                        return copy;
                    });
                },
                (error) => {
                    setResponses(prev => {
                        const copy = [...prev];
                        copy[index] = { 
                            ...copy[index], 
                            status: 'error', 
                            error: error.message 
                        };
                        return copy;
                    });
                }
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            // Ignore abort errors
            if (errorMessage.includes('abort') || errorMessage.includes('Abort')) {
                setResponses(prev => {
                    const copy = [...prev];
                    copy[index] = { ...copy[index], status: 'complete' };
                    return copy;
                });
                return;
            }

            setResponses(prev => {
                const copy = [...prev];
                copy[index] = { 
                    ...copy[index], 
                    status: 'error', 
                    error: errorMessage 
                };
                return copy;
            });
        }
    }, []);

    /**
     * Generate responses from multiple models in parallel
     */
    const generateParallel = useCallback(async (
        config: PromptParserConfig,
        models: AllowedModel[]
    ): Promise<void> => {
        if (models.length === 0) {
            throw new Error('No models provided for parallel generation');
        }

        setIsGenerating(true);
        
        // Initialize responses with pending status
        const initialResponses: ParallelResponse[] = models.map(model => ({
            model,
            text: '',
            status: 'pending'
        }));
        setResponses(initialResponses);

        // Create abort controllers for each model
        abortControllersRef.current = models.map(() => new AbortController());

        try {
            // Parse prompt once
            const promptParser = createPromptParser();
            const { messages, error } = await promptParser.parse(config);

            if (error || !messages.length) {
                throw new Error(error || 'Failed to parse prompt');
            }

            // Get prompt settings
            const prompt = await db.prompts.get(config.promptId);
            const temperature = prompt?.temperature ?? 0.7;
            const maxTokens = prompt?.maxTokens ?? 2048;
            const top_p = prompt?.top_p;
            const top_k = prompt?.top_k;
            const repetition_penalty = prompt?.repetition_penalty;
            const min_p = prompt?.min_p;

            // Start all generations in parallel
            const promises = models.map((model, index) => 
                generateFromModel(
                    model,
                    messages,
                    temperature,
                    maxTokens,
                    index,
                    abortControllersRef.current[index],
                    top_p,
                    top_k,
                    repetition_penalty,
                    min_p
                )
            );

            // Wait for all to complete (including errors)
            await Promise.allSettled(promises);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            // Set error on all responses
            setResponses(prev => prev.map(r => ({
                ...r,
                status: 'error' as const,
                error: errorMessage
            })));
        } finally {
            setIsGenerating(false);
            abortControllersRef.current = [];
        }
    }, [generateFromModel]);

    /**
     * Abort all ongoing generations
     */
    const abortAll = useCallback(() => {
        console.log('[useParallelGeneration] Aborting all generations');
        
        // Abort all controllers
        abortControllersRef.current.forEach(controller => {
            try {
                controller.abort();
            } catch (e) {
                // Ignore errors
            }
        });

        // Also call AIService abort to clean up
        aiService.abortStream();

        // Update all streaming responses to complete
        setResponses(prev => prev.map(r => 
            r.status === 'streaming' || r.status === 'pending'
                ? { ...r, status: 'complete' as const }
                : r
        ));

        setIsGenerating(false);
    }, []);

    /**
     * Reset all responses
     */
    const resetResponses = useCallback(() => {
        setResponses([]);
        setIsGenerating(false);
        abortControllersRef.current = [];
    }, []);

    return {
        responses,
        isGenerating,
        allComplete,
        generateParallel,
        abortAll,
        resetResponses
    };
}
