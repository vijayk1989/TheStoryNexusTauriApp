import { useState, useCallback } from 'react';
import { agentOrchestrator, PipelineInput, PipelineResult, ExecutablePipelineStep } from '@/services/ai/AgentOrchestrator';
import { useAgentsStore } from '../stores/useAgentsStore';
import { AgentResult, LorebookEntry, Chapter, PipelinePreset } from '@/types/story';
import { db } from '@/services/database';

export interface AgenticGenerationCallbacks {
    onStepStart?: (stepIndex: number, agentName: string, step?: ExecutablePipelineStep) => void;
    onStepComplete?: (result: AgentResult, stepIndex: number) => void;
    onToken?: (token: string) => void;
    onComplete?: (result: PipelineResult) => void;
    onError?: (error: Error) => void;
}

export interface AgenticGenerationContext {
    scenebeat: string;
    previousWords: string;
    matchedEntries: LorebookEntry[];
    allEntries?: LorebookEntry[];
    povType?: string;
    povCharacter?: string;
    currentChapter?: Chapter;
    storyLanguage?: string;
}

export function useAgenticGeneration() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentStep, setCurrentStep] = useState<number>(-1);
    const [currentAgentName, setCurrentAgentName] = useState<string>('');
    const [stepResults, setStepResults] = useState<AgentResult[]>([]);
    const [error, setError] = useState<string | null>(null);

    const { pipelinePresets, loadPipelinePresets } = useAgentsStore();

    /**
     * Generate using a pipeline preset
     */
    const generateWithPipeline = useCallback(async (
        pipelineId: string,
        context: AgenticGenerationContext,
        callbacks?: AgenticGenerationCallbacks
    ): Promise<PipelineResult | null> => {
        setIsGenerating(true);
        setCurrentStep(-1);
        setCurrentAgentName('');
        setStepResults([]);
        setError(null);

        try {
            // Build the pipeline input
            const input: PipelineInput = {
                scenebeat: context.scenebeat,
                previousWords: context.previousWords,
                lorebookEntries: context.matchedEntries,
                allLorebookEntries: context.allEntries,
                povType: context.povType,
                povCharacter: context.povCharacter,
                currentChapter: context.currentChapter,
                storyLanguage: context.storyLanguage,
            };

            // Execute the pipeline
            const result = await agentOrchestrator.executePipelinePreset(
                pipelineId,
                input,
                {
                    onStepStart: (step, stepIndex) => {
                        setCurrentStep(stepIndex);
                        setCurrentAgentName(step.agent.name);
                        callbacks?.onStepStart?.(stepIndex, step.agent.name, step);
                    },
                    onStepComplete: (stepResult, stepIndex) => {
                        setStepResults(prev => [...prev, stepResult]);
                        callbacks?.onStepComplete?.(stepResult, stepIndex);
                    },
                    onToken: callbacks?.onToken,
                }
            );

            callbacks?.onComplete?.(result);
            return result;

        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error.message);
            callbacks?.onError?.(error);
            return null;

        } finally {
            setIsGenerating(false);
            setCurrentStep(-1);
            setCurrentAgentName('');
        }
    }, []);

    /**
     * Abort the current generation
     */
    const abortGeneration = useCallback(() => {
        agentOrchestrator.abort();
    }, []);

    /**
     * Get available pipelines (loads if needed)
     */
    const getAvailablePipelines = useCallback(async (): Promise<PipelinePreset[]> => {
        await loadPipelinePresets();
        // Get fresh data from the database
        return db.pipelinePresets.toArray();
    }, [loadPipelinePresets]);

    /**
     * Get a specific pipeline by ID
     */
    const getPipelineById = useCallback(async (pipelineId: string): Promise<PipelinePreset | undefined> => {
        return db.pipelinePresets.get(pipelineId);
    }, []);

    return {
        // State
        isGenerating,
        currentStep,
        currentAgentName,
        stepResults,
        error,
        
        // Actions
        generateWithPipeline,
        abortGeneration,
        getAvailablePipelines,
        getPipelineById,
    };
}
