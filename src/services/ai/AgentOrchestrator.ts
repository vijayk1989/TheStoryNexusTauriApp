import { aiService } from './AIService';
import {
    PromptMessage,
    AllowedModel,
    LorebookEntry,
    AgentPreset,
    AgentResult,
    AgentRole,
    PipelinePreset,
    PipelineExecution,
    Chapter
} from '@/types/story';
import { db } from '../database';

export interface PipelineInput {
    // Scene beat instruction
    scenebeat?: string;
    // Previous text from the editor (can be full or summarized)
    previousWords?: string;
    // Matched lorebook entries
    lorebookEntries?: LorebookEntry[];
    // All lorebook entries (for lore judge)
    allLorebookEntries?: LorebookEntry[];
    // Chapter summaries
    chapterSummaries?: string;
    // POV settings
    povType?: string;
    povCharacter?: string;
    // Story metadata
    storyLanguage?: string;
    // Current chapter data
    currentChapter?: Chapter;
    // Custom data for extensibility
    customData?: Record<string, unknown>;
}

export interface ExecutablePipelineStep {
    agent: AgentPreset;
    condition?: string;
    streamOutput?: boolean;
    isRevision?: boolean;
    maxIterations?: number;
    retryFromStep?: number;
}

export interface PipelineResult {
    finalOutput: string;
    // The prose output (from the last prose_writer, style_editor, or dialogue_specialist)
    proseOutput?: string;
    steps: AgentResult[];
    totalDuration: number;
    status: 'completed' | 'failed' | 'aborted';
    error?: string;
}

export class AgentOrchestrator {
    private static instance: AgentOrchestrator;
    private abortController: AbortController | null = null;

    private constructor() { }

    static getInstance(): AgentOrchestrator {
        if (!AgentOrchestrator.instance) {
            AgentOrchestrator.instance = new AgentOrchestrator();
        }
        return AgentOrchestrator.instance;
    }

    /**
     * Execute a pipeline with the given steps and input
     */
    async executePipeline(
        steps: ExecutablePipelineStep[],
        input: PipelineInput,
        callbacks?: {
            onStepStart?: (step: ExecutablePipelineStep, index: number) => void;
            onStepComplete?: (result: AgentResult, index: number) => void;
            onToken?: (token: string) => void;
            onError?: (error: Error, stepIndex: number) => void;
        }
    ): Promise<PipelineResult> {
        const results: AgentResult[] = [];
        const startTime = Date.now();
        this.abortController = new AbortController();

        try {
            for (let i = 0; i < steps.length; i++) {
                // Check if aborted
                if (this.abortController.signal.aborted) {
                    return {
                        finalOutput: results[results.length - 1]?.output ?? '',
                        proseOutput: this.getLastProseOutput(results),
                        steps: results,
                        totalDuration: Date.now() - startTime,
                        status: 'aborted'
                    };
                }

                const step = steps[i];

                // Check condition if provided
                if (step.condition && !this.evaluateCondition(step.condition, input, results)) {
                    console.log(`[AgentOrchestrator] Skipping step ${i} (${step.agent.name}): condition not met`);
                    continue;
                }

                callbacks?.onStepStart?.(step, i);
                const stepStart = Date.now();

                try {
                    const messages = this.buildMessages(step.agent, input, results, step.isRevision);
                    const isLastStep = i === steps.length - 1;
                    const shouldStream = step.streamOutput ?? false; // Default to NOT streaming

                    let output: string;
                    if (shouldStream && callbacks?.onToken) {
                        output = await this.generateStreaming(step.agent, messages, callbacks.onToken);
                    } else {
                        output = await this.generateNonStreaming(step.agent, messages);
                    }

                    const result: AgentResult = {
                        role: step.agent.role,
                        agentName: step.agent.name,
                        output,
                        promptSent: messages, // Capture the prompt for diagnostics
                        duration: Date.now() - stepStart,
                        metadata: step.isRevision ? { isRevision: true } : undefined,
                    };

                    results.push(result);
                    callbacks?.onStepComplete?.(result, i);

                } catch (error) {
                    console.error(`[AgentOrchestrator] Error in step ${i}:`, error);
                    callbacks?.onError?.(error as Error, i);

                    // Add failed result
                    results.push({
                        role: step.agent.role,
                        agentName: step.agent.name,
                        output: '',
                        duration: Date.now() - stepStart,
                        metadata: { error: (error as Error).message }
                    });

                    return {
                        finalOutput: '',
                        proseOutput: this.getLastProseOutput(results),
                        steps: results,
                        totalDuration: Date.now() - startTime,
                        status: 'failed',
                        error: (error as Error).message
                    };
                }
            }

            // Find the prose output (last prose_writer, style_editor, or dialogue_specialist)
            const proseOutput = this.getLastProseOutput(results);

            return {
                finalOutput: results[results.length - 1]?.output ?? '',
                proseOutput,
                steps: results,
                totalDuration: Date.now() - startTime,
                status: 'completed'
            };

        } catch (error) {
            return {
                finalOutput: '',
                proseOutput: this.getLastProseOutput(results),
                steps: results,
                totalDuration: Date.now() - startTime,
                status: 'failed',
                error: (error as Error).message
            };
        }
    }

    /**
     * Execute a saved pipeline preset
     */
    async executePipelinePreset(
        presetId: string,
        input: PipelineInput,
        callbacks?: {
            onStepStart?: (step: ExecutablePipelineStep, index: number) => void;
            onStepComplete?: (result: AgentResult, index: number) => void;
            onToken?: (token: string) => void;
            onError?: (error: Error, stepIndex: number) => void;
        }
    ): Promise<PipelineResult> {
        const preset = await db.pipelinePresets.get(presetId);
        if (!preset) {
            throw new Error(`Pipeline preset not found: ${presetId}`);
        }

        // Load agent presets for each step
        const steps: ExecutablePipelineStep[] = [];
        for (const stepConfig of preset.steps.sort((a, b) => a.order - b.order)) {
            const agent = await db.agentPresets.get(stepConfig.agentPresetId);
            if (!agent) {
                throw new Error(`Agent preset not found: ${stepConfig.agentPresetId}`);
            }
            steps.push({
                agent,
                condition: stepConfig.condition,
                streamOutput: stepConfig.streamOutput,
                isRevision: stepConfig.isRevision,
                maxIterations: stepConfig.maxIterations,
                retryFromStep: stepConfig.retryFromStep,
            });
        }

        return this.executePipeline(steps, input, callbacks);
    }

    /**
     * Abort the current pipeline execution
     */
    abort(): void {
        if (this.abortController) {
            this.abortController.abort();
            aiService.abortStream();
        }
    }

    /**
     * Get the last prose output from results (prose_writer, style_editor, or dialogue_specialist)
     * This is the actual content the user wants, not judge/checker outputs
     */
    private getLastProseOutput(results: AgentResult[]): string {
        const proseRoles: AgentRole[] = ['prose_writer', 'style_editor', 'dialogue_specialist', 'expander'];
        
        // Find the last result from a prose-generating role
        for (let i = results.length - 1; i >= 0; i--) {
            if (proseRoles.includes(results[i].role)) {
                return results[i].output;
            }
        }
        
        return '';
    }

    /**
     * Build messages for an agent based on its role and the pipeline state
     */
    private buildMessages(
        agent: AgentPreset,
        input: PipelineInput,
        previousResults: AgentResult[],
        isRevision?: boolean
    ): PromptMessage[] {
        const systemMessage: PromptMessage = {
            role: 'system',
            content: agent.systemPrompt
        };

        const userMessage: PromptMessage = {
            role: 'user',
            content: this.buildUserMessage(agent.role, input, previousResults, isRevision)
        };

        return [systemMessage, userMessage];
    }

    /**
     * Build the user message based on agent role
     */
    private buildUserMessage(
        role: AgentRole,
        input: PipelineInput,
        previousResults: AgentResult[],
        isRevision?: boolean
    ): string {
        switch (role) {
            case 'summarizer':
                return this.buildSummarizerMessage(input);

            case 'prose_writer':
                return this.buildProseWriterMessage(input, previousResults, isRevision);

            case 'lore_judge':
                return this.buildLoreJudgeMessage(input, previousResults);

            case 'continuity_checker':
                return this.buildContinuityCheckerMessage(input, previousResults);

            case 'style_editor':
                return this.buildStyleEditorMessage(previousResults);

            case 'dialogue_specialist':
                return this.buildDialogueSpecialistMessage(previousResults);

            case 'expander':
                return this.buildExpanderMessage(input, previousResults);

            case 'custom':
            default:
                return this.buildCustomMessage(input, previousResults);
        }
    }

    private buildSummarizerMessage(input: PipelineInput): string {
        const text = input.previousWords || '';
        return `Summarize the following text while preserving key narrative details, character emotions, and plot points. Reduce to approximately 1000 words:\n\n${text}`;
    }

    private buildProseWriterMessage(input: PipelineInput, previousResults: AgentResult[], isRevision?: boolean): string {
        // Check if we're in revision mode (rewriting based on feedback)
        if (isRevision) {
            return this.buildRevisionMessage(input, previousResults);
        }

        const summary = previousResults.find(r => r.role === 'summarizer')?.output;
        const contextText = summary ?? (input.previousWords?.slice(-3000) || '');

        // Build compact lorebook context
        const lorebookContext = input.lorebookEntries
            ?.slice(0, 5)
            .map(e => `• ${e.name}: ${e.description?.slice(0, 200)}...`)
            .join('\n') || '';

        let message = '';

        if (lorebookContext) {
            message += `RELEVANT LORE:\n${lorebookContext}\n\n`;
        }

        if (input.povType) {
            message += `POV: ${input.povType}`;
            if (input.povCharacter) {
                message += ` (${input.povCharacter})`;
            }
            message += '\n\n';
        }

        message += `STORY CONTEXT:\n${contextText}\n\n`;
        message += `---\nSCENE BEAT INSTRUCTION:\n${input.scenebeat || ''}\n\nContinue the story:`;

        return message;
    }

    /**
     * Build a revision message that includes the original prose and feedback
     */
    private buildRevisionMessage(input: PipelineInput, previousResults: AgentResult[]): string {
        // Find the original prose output
        const proseResults = previousResults.filter(r => r.role === 'prose_writer');
        const originalProse = proseResults[proseResults.length - 1]?.output || '';

        // Find feedback from judges (lore_judge or continuity_checker)
        const feedbackResults = previousResults.filter(r => 
            r.role === 'lore_judge' || r.role === 'continuity_checker'
        );
        const feedback = feedbackResults
            .map(r => `[${r.role.toUpperCase()} FEEDBACK]:\n${r.output}`)
            .join('\n\n');

        // Build lorebook context for reference
        const lorebookContext = input.lorebookEntries
            ?.slice(0, 5)
            .map(e => `• ${e.name}: ${e.description?.slice(0, 200)}...`)
            .join('\n') || '';

        let message = 'You need to REVISE the following prose based on the feedback provided.\n\n';

        if (lorebookContext) {
            message += `RELEVANT LORE (for reference):\n${lorebookContext}\n\n`;
        }

        message += `ORIGINAL SCENE BEAT INSTRUCTION:\n${input.scenebeat || ''}\n\n`;
        message += `---\nORIGINAL PROSE:\n${originalProse}\n\n`;
        message += `---\n${feedback}\n\n`;
        message += `---\nPlease rewrite the prose, addressing ALL the issues mentioned in the feedback while maintaining the original intent and style. Output ONLY the revised prose:`;

        return message;
    }

    private buildLoreJudgeMessage(input: PipelineInput, previousResults: AgentResult[]): string {
        const proseOutput = previousResults.find(r => r.role === 'prose_writer')?.output || '';
        const lorebookContext = input.lorebookEntries
            ?.map(e => `[${e.category?.toUpperCase()}] ${e.name}:\n${e.description}`)
            .join('\n\n') || '';

        return `Check the following prose for consistency with the established lore.

LOREBOOK DATA:
${lorebookContext}

PROSE TO CHECK:
${proseOutput}

List any inconsistencies found. If everything is consistent, respond with just: CONSISTENT`;
    }

    private buildContinuityCheckerMessage(input: PipelineInput, previousResults: AgentResult[]): string {
        const proseOutput = previousResults.find(r => r.role === 'prose_writer')?.output || '';
        const contextText = input.previousWords?.slice(-2000) || '';

        return `Check the following new prose for plot and character continuity with the previous context.

PREVIOUS CONTEXT:
${contextText}

NEW PROSE:
${proseOutput}

List any continuity issues (timeline inconsistencies, character behavior changes, forgotten plot points). If consistent, respond with: CONSISTENT`;
    }

    private buildStyleEditorMessage(previousResults: AgentResult[]): string {
        const proseOutput = previousResults.find(r => r.role === 'prose_writer')?.output || '';

        return `Review and polish the following prose for style, flow, and readability. Maintain the author's voice while improving clarity and impact.

PROSE TO EDIT:
${proseOutput}

Provide the edited version:`;
    }

    private buildDialogueSpecialistMessage(previousResults: AgentResult[]): string {
        const proseOutput = previousResults.find(r => r.role === 'prose_writer' || r.role === 'style_editor')?.output || '';

        return `Review and improve the dialogue in the following prose. Make conversations feel more natural, give each character a distinct voice, and ensure dialogue tags are varied and appropriate.

PROSE:
${proseOutput}

Provide the improved version:`;
    }

    private buildExpanderMessage(input: PipelineInput, previousResults: AgentResult[]): string {
        const briefNotes = input.scenebeat || '';

        return `Expand the following brief notes/outline into detailed prose:

NOTES:
${briefNotes}

Write a fully expanded scene:`;
    }

    private buildCustomMessage(input: PipelineInput, previousResults: AgentResult[]): string {
        // For custom agents, just pass through available context
        const lastOutput = previousResults[previousResults.length - 1]?.output || '';
        const scenebeat = input.scenebeat || '';

        if (lastOutput) {
            return `Previous output:\n${lastOutput}\n\nInstruction: ${scenebeat}`;
        }
        return scenebeat || 'Process the input as instructed.';
    }

    /**
     * Evaluate a condition string against the current pipeline state
     */
    private evaluateCondition(
        condition: string,
        input: PipelineInput,
        previousResults: AgentResult[]
    ): boolean {
        try {
            // Simple condition evaluator
            // Supports: 
            // - wordCount > N
            // - hasPreviousOutput
            // - hasLorebookEntries
            // - previousOutputContains:TEXT (checks last result for TEXT)
            // - roleOutputContains:ROLE:TEXT (checks specific role's output for TEXT)
            const normalizedCondition = condition.toLowerCase().trim();

            // Check for previousOutputContains:TEXT
            if (normalizedCondition.startsWith('previousoutputcontains:')) {
                const searchText = condition.substring('previousOutputContains:'.length).trim();
                const lastOutput = previousResults[previousResults.length - 1]?.output || '';
                return lastOutput.toUpperCase().includes(searchText.toUpperCase());
            }

            // Check for roleOutputContains:ROLE:TEXT (e.g., roleOutputContains:lore_judge:ISSUE)
            if (normalizedCondition.startsWith('roleoutputcontains:')) {
                const parts = condition.substring('roleOutputContains:'.length).split(':');
                if (parts.length >= 2) {
                    const role = parts[0].trim().toLowerCase();
                    const searchText = parts.slice(1).join(':').trim();
                    const roleResult = previousResults.find(r => r.role.toLowerCase() === role);
                    if (roleResult) {
                        return roleResult.output.toUpperCase().includes(searchText.toUpperCase());
                    }
                    return false;
                }
            }

            // Check for previousOutputNotContains:TEXT (inverse check)
            if (normalizedCondition.startsWith('previousoutputnotcontains:')) {
                const searchText = condition.substring('previousOutputNotContains:'.length).trim();
                const lastOutput = previousResults[previousResults.length - 1]?.output || '';
                return !lastOutput.toUpperCase().includes(searchText.toUpperCase());
            }

            // Check if ANY judge role found issues (lore_judge, continuity_checker, or any role with 'judge' or 'checker')
            if (normalizedCondition === 'anyjudgefoundissues') {
                const judgeRoles = ['lore_judge', 'continuity_checker'];
                return previousResults.some(r => {
                    const isJudgeRole = judgeRoles.includes(r.role) || 
                                       r.role.includes('judge') || 
                                       r.role.includes('checker');
                    if (isJudgeRole) {
                        // Check for common issue markers
                        const output = r.output.toUpperCase();
                        return output.includes('ISSUE') || 
                               output.includes('INCONSISTEN') || 
                               output.includes('ERROR') ||
                               output.includes('PROBLEM') ||
                               output.includes('CONFLICT');
                    }
                    return false;
                });
            }

            if (normalizedCondition.includes('wordcount')) {
                const match = normalizedCondition.match(/wordcount\s*([<>=]+)\s*(\d+)/);
                if (match) {
                    const operator = match[1];
                    const threshold = parseInt(match[2], 10);
                    const wordCount = (input.previousWords || '').split(/\s+/).length;

                    switch (operator) {
                        case '>': return wordCount > threshold;
                        case '>=': return wordCount >= threshold;
                        case '<': return wordCount < threshold;
                        case '<=': return wordCount <= threshold;
                        case '==': return wordCount === threshold;
                        default: return false;
                    }
                }
            }

            if (normalizedCondition === 'haspreviousoutput') {
                return previousResults.length > 0 && previousResults.some(r => r.output.length > 0);
            }

            if (normalizedCondition === 'haslorebookentries') {
                return (input.lorebookEntries?.length ?? 0) > 0;
            }

            // Default: condition is true
            return true;

        } catch (error) {
            console.warn('[AgentOrchestrator] Failed to evaluate condition:', condition, error);
            return true; // Default to running the step
        }
    }

    /**
     * Generate output without streaming (for intermediate steps)
     */
    private async generateNonStreaming(agent: AgentPreset, messages: PromptMessage[]): Promise<string> {
        const response = await this.callModel(agent, messages);
        return this.collectResponse(response);
    }

    /**
     * Generate output with streaming (for final output)
     */
    private async generateStreaming(
        agent: AgentPreset,
        messages: PromptMessage[],
        onToken: (token: string) => void
    ): Promise<string> {
        const response = await this.callModel(agent, messages);
        let fullText = '';

        await aiService.processStreamedResponse(
            response,
            (token) => {
                fullText += token;
                onToken(token);
            },
            () => { },
            (error) => console.error('[AgentOrchestrator] Streaming error:', error)
        );

        return fullText;
    }

    /**
     * Call the appropriate model based on agent configuration
     */
    private async callModel(agent: AgentPreset, messages: PromptMessage[]): Promise<Response> {
        const { model, temperature, maxTokens } = agent;

        switch (model.provider) {
            case 'local':
                return aiService.generateWithLocalModel(messages, temperature, maxTokens);
            case 'openai':
                return aiService.generateWithOpenAI(messages, model.id, temperature, maxTokens);
            case 'openrouter':
                return aiService.generateWithOpenRouter(messages, model.id, temperature, maxTokens);
            case 'openai_compatible':
                return aiService.generateWithOpenAICompatible(messages, model.id, temperature, maxTokens);
            default:
                throw new Error(`Unknown provider: ${model.provider}`);
        }
    }

    /**
     * Collect full response from a streaming response
     */
    private async collectResponse(response: Response): Promise<string> {
        let fullText = '';
        await aiService.processStreamedResponse(
            response,
            (token) => { fullText += token; },
            () => { },
            (error) => { throw error; }
        );
        return fullText;
    }
}

export const agentOrchestrator = AgentOrchestrator.getInstance();
