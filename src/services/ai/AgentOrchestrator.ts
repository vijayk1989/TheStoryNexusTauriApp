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
    Chapter,
    AgentContextConfig,
    DEFAULT_CONTEXT_CONFIG
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
    // Customizable push prompt text (supports {{PREVIOUS_OUTPUT}} and {{FEEDBACK}} placeholders)
    pushPrompt?: string;
    // Keywords to check in previous output (used with 'outputContainsAnyKeyword' condition)
    validationKeywords?: string[];
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

        // Track iteration counts per retry-point to enforce maxIterations
        const iterationCounts = new Map<number, number>();

        try {
            let i = 0;
            while (i < steps.length) {
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

                // Check condition if provided (pass step for keyword-based conditions)
                if (step.condition && !this.evaluateCondition(step.condition, input, results, step)) {
                    console.log(`[AgentOrchestrator] Skipping step ${i} (${step.agent.name}): condition not met`);

                    i++;
                    continue;
                }

                // Handle retry loop: if this step has retryFromStep and its condition passed,
                // we need to check if we should jump back
                if (step.retryFromStep !== undefined && step.retryFromStep !== null && step.condition) {
                    const maxIter = step.maxIterations ?? 1;
                    const currentIter = iterationCounts.get(i) ?? 0;

                    if (currentIter < maxIter) {
                        iterationCounts.set(i, currentIter + 1);
                        console.log(`[AgentOrchestrator] Retry loop: jumping from step ${i} back to step ${step.retryFromStep} (iteration ${currentIter + 1}/${maxIter})`);
                        i = step.retryFromStep;
                        continue; // Re-run from retryFromStep
                    } else {
                        console.log(`[AgentOrchestrator] Retry loop: max iterations (${maxIter}) reached at step ${i}, skipping`);
                        i++;
                        continue;
                    }
                }

                callbacks?.onStepStart?.(step, i);
                const stepStart = Date.now();

                try {
                    const messages = this.buildMessages(step.agent, input, results, step.isRevision, step);
                    const shouldStream = step.streamOutput ?? false; // Default to NOT streaming

                    let output: string;
                    if (shouldStream && callbacks?.onToken) {
                        output = await this.generateStreaming(step.agent, messages, callbacks.onToken);
                    } else {
                        output = await this.generateNonStreaming(step.agent, messages);
                    }

                    const metadata: Record<string, unknown> = {};
                    if (step.isRevision) metadata.isRevision = true;
                    if (iterationCounts.has(i)) metadata.iteration = iterationCounts.get(i);

                    const result: AgentResult = {
                        role: step.agent.role,
                        agentName: step.agent.name,
                        output,
                        promptSent: messages, // Capture the prompt for diagnostics
                        duration: Date.now() - stepStart,
                        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
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

                i++;
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
                pushPrompt: stepConfig.pushPrompt,
                validationKeywords: stepConfig.validationKeywords,
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
        isRevision?: boolean,
        step?: ExecutablePipelineStep
    ): PromptMessage[] {
        const systemMessage: PromptMessage = {
            role: 'system',
            content: agent.systemPrompt
        };

        // Push prompt mode: build multi-turn chat memory
        // [system, originalUser, assistantRefusal, pushPromptUser]
        if (isRevision && step?.pushPrompt && previousResults.length > 0) {
            // Find the prose writer's original output (the refusal)
            const proseResult = previousResults.find(r => r.role === 'prose_writer');
            const previousOutput = proseResult?.output || previousResults[previousResults.length - 1]?.output || '';

            // Feedback from the checker (e.g. refusal_checker or lore_judge)
            const checkerResult = previousResults[previousResults.length - 1];
            const feedback = checkerResult?.output || '';

            // Build the original user message as if step 1 had sent it
            const originalUserContent = this.buildProseWriterMessage(agent, input, [], false);
            const originalUserMessage: PromptMessage = {
                role: 'user',
                content: originalUserContent
            };

            // The AI's previous response (the refusal)
            const assistantMessage: PromptMessage = {
                role: 'assistant',
                content: previousOutput
            };

            // Build the push prompt with placeholders replaced
            let pushPromptContent = step.pushPrompt;
            pushPromptContent = pushPromptContent.replace(/\{\{PREVIOUS_OUTPUT\}\}/g, previousOutput);
            pushPromptContent = pushPromptContent.replace(/\{\{FEEDBACK\}\}/g, feedback);

            const pushPromptMessage: PromptMessage = {
                role: 'user',
                content: pushPromptContent
            };

            console.log('[AgentOrchestrator] Built push prompt chat memory:', {
                systemPromptLength: systemMessage.content.length,
                originalUserLength: originalUserContent.length,
                assistantRefusalLength: previousOutput.length,
                pushPromptLength: pushPromptContent.length,
            });

            return [systemMessage, originalUserMessage, assistantMessage, pushPromptMessage];
        }

        // Standard mode: [system, user]
        const userContent = this.buildUserMessage(agent, input, previousResults, isRevision);

        const userMessage: PromptMessage = {
            role: 'user',
            content: userContent
        };

        return [systemMessage, userMessage];
    }

    /**
     * Get the effective context config for an agent (with defaults)
     */
    private getEffectiveContextConfig(agent: AgentPreset): AgentContextConfig {
        const defaultConfig = DEFAULT_CONTEXT_CONFIG[agent.role];
        return {
            ...defaultConfig,
            ...agent.contextConfig,
        };
    }

    /**
     * Get lorebook entries based on agent's context config
     */
    private getLorebookForAgent(agent: AgentPreset, input: PipelineInput): LorebookEntry[] {
        const config = this.getEffectiveContextConfig(agent);
        
        switch (config.lorebookMode) {
            case 'none':
                return [];
            
            case 'all': {
                let entries = input.allLorebookEntries || input.lorebookEntries || [];
                // Apply limit if specified
                if (config.lorebookLimit && entries.length > config.lorebookLimit) {
                    entries = entries.slice(0, config.lorebookLimit);
                }
                return entries;
            }
            
            case 'custom': {
                if (!config.customLorebookEntryIds || config.customLorebookEntryIds.length === 0) {
                    return [];
                }
                const allEntries = input.allLorebookEntries || input.lorebookEntries || [];
                return allEntries.filter(e => config.customLorebookEntryIds!.includes(e.id));
            }
            
            case 'matched':
            default:
                return input.lorebookEntries || [];
        }
    }

    /**
     * Get previous words based on agent's context config
     */
    private getPreviousWordsForAgent(agent: AgentPreset, input: PipelineInput, previousResults: AgentResult[]): string {
        const config = this.getEffectiveContextConfig(agent);
        
        switch (config.previousWordsMode) {
            case 'none':
                return '';
            
            case 'summarized': {
                // Use summarizer output if available, otherwise fall back to limited
                const summary = previousResults.find(r => r.role === 'summarizer')?.output;
                if (summary) return summary;
                // Fall through to limited if no summary
                const limit = config.previousWordsLimit || 3000;
                return input.previousWords?.slice(-limit) || '';
            }
            
            case 'limited': {
                const limit = config.previousWordsLimit || 3000;
                return input.previousWords?.slice(-limit) || '';
            }
            
            case 'full':
            default:
                return input.previousWords || '';
        }
    }

    /**
     * Build the user message based on agent role
     */
    private buildUserMessage(
        agent: AgentPreset,
        input: PipelineInput,
        previousResults: AgentResult[],
        isRevision?: boolean
    ): string {
        switch (agent.role) {
            case 'summarizer':
                return this.buildSummarizerMessage(agent, input);

            case 'prose_writer':
                return this.buildProseWriterMessage(agent, input, previousResults, isRevision);

            case 'lore_judge':
                return this.buildLoreJudgeMessage(agent, input, previousResults);

            case 'continuity_checker':
                return this.buildContinuityCheckerMessage(agent, input, previousResults);

            case 'style_editor':
                return this.buildStyleEditorMessage(agent, previousResults);

            case 'dialogue_specialist':
                return this.buildDialogueSpecialistMessage(agent, previousResults);

            case 'expander':
                return this.buildExpanderMessage(agent, input, previousResults);

            case 'outline_generator':
                return this.buildOutlineGeneratorMessage(agent, input, previousResults);

            case 'style_extractor':
                return this.buildStyleExtractorMessage(agent, input, previousResults);

            case 'scenebeat_generator':
                return this.buildScenebeatGeneratorMessage(agent, input, previousResults);

            case 'custom':
            default:
                return this.buildCustomMessage(agent, input, previousResults);
        }
    }

    private buildSummarizerMessage(agent: AgentPreset, input: PipelineInput): string {
        // Summarizer always uses full previous words (that's what it's summarizing)
        const text = input.previousWords || '';
        return `Summarize the following text while preserving key narrative details, character emotions, and plot points. Reduce to approximately 1000 words:\n\n${text}`;
    }

    private buildProseWriterMessage(agent: AgentPreset, input: PipelineInput, previousResults: AgentResult[], isRevision?: boolean): string {
        // Check if we're in revision mode (rewriting based on feedback)
        if (isRevision) {
            return this.buildRevisionMessage(agent, input, previousResults);
        }

        const config = this.getEffectiveContextConfig(agent);
        const contextText = this.getPreviousWordsForAgent(agent, input, previousResults);
        const lorebookEntries = this.getLorebookForAgent(agent, input);

        // Build lorebook context with full descriptions
        const lorebookContext = lorebookEntries
            .map(e => `• ${e.name}: ${e.description}`)
            .join('\n') || '';

        let message = '';

        if (lorebookContext) {
            message += `RELEVANT LORE:\n${lorebookContext}\n\n`;
        }

        if (config.includePovInfo && input.povType) {
            message += `POV: ${input.povType}`;
            if (input.povCharacter) {
                message += ` (${input.povCharacter})`;
            }
            message += '\n\n';
        }

        if (config.includeChapterSummary && input.currentChapter?.summary) {
            message += `CHAPTER SUMMARY:\n${input.currentChapter.summary}\n\n`;
        }

        if (contextText) {
            message += `STORY CONTEXT:\n${contextText}\n\n`;
        }

        message += `---\nSCENE BEAT INSTRUCTION:\n${input.scenebeat || ''}\n\nContinue the story:`;

        return message;
    }

    /**
     * Build a revision message that includes the original prose and feedback
     */
    private buildRevisionMessage(agent: AgentPreset, input: PipelineInput, previousResults: AgentResult[]): string {
        const lorebookEntries = this.getLorebookForAgent(agent, input);

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

        // Build lorebook context for reference (full descriptions)
        const lorebookContext = lorebookEntries
            .map(e => `• ${e.name}: ${e.description}`)
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

    private buildLoreJudgeMessage(agent: AgentPreset, input: PipelineInput, previousResults: AgentResult[]): string {
        const proseOutput = previousResults.find(r => r.role === 'prose_writer')?.output || '';
        const lorebookEntries = this.getLorebookForAgent(agent, input);
        
        const lorebookContext = lorebookEntries
            .map(e => `[${e.category?.toUpperCase()}] ${e.name}:\n${e.description}`)
            .join('\n\n') || '';

        return `Check the following prose for consistency with the established lore.

LOREBOOK DATA:
${lorebookContext}

PROSE TO CHECK:
${proseOutput}

List any inconsistencies found. If everything is consistent, respond with just: CONSISTENT`;
    }

    private buildContinuityCheckerMessage(agent: AgentPreset, input: PipelineInput, previousResults: AgentResult[]): string {
        const proseOutput = previousResults.find(r => r.role === 'prose_writer')?.output || '';
        const contextText = this.getPreviousWordsForAgent(agent, input, previousResults);

        return `Check the following new prose for plot and character continuity with the previous context.

PREVIOUS CONTEXT:
${contextText}

NEW PROSE:
${proseOutput}

List any continuity issues (timeline inconsistencies, character behavior changes, forgotten plot points). If consistent, respond with: CONSISTENT`;
    }

    private buildStyleEditorMessage(agent: AgentPreset, previousResults: AgentResult[]): string {
        const proseOutput = previousResults.find(r => r.role === 'prose_writer')?.output || '';

        return `Review and polish the following prose for style, flow, and readability. Maintain the author's voice while improving clarity and impact.

PROSE TO EDIT:
${proseOutput}

Provide the edited version:`;
    }

    private buildDialogueSpecialistMessage(agent: AgentPreset, previousResults: AgentResult[]): string {
        const proseOutput = previousResults.find(r => r.role === 'prose_writer' || r.role === 'style_editor')?.output || '';

        return `Review and improve the dialogue in the following prose. Make conversations feel more natural, give each character a distinct voice, and ensure dialogue tags are varied and appropriate.

PROSE:
${proseOutput}

Provide the improved version:`;
    }

    private buildExpanderMessage(agent: AgentPreset, input: PipelineInput, previousResults: AgentResult[]): string {
        const config = this.getEffectiveContextConfig(agent);
        const lorebookEntries = this.getLorebookForAgent(agent, input);
        const contextText = this.getPreviousWordsForAgent(agent, input, previousResults);
        const briefNotes = input.scenebeat || '';

        let message = '';

        // Add lorebook context if available
        if (lorebookEntries.length > 0) {
            const lorebookContext = lorebookEntries
                .map(e => `• ${e.name}: ${e.description}`)
                .join('\n');
            message += `RELEVANT LORE:\n${lorebookContext}\n\n`;
        }

        // Add POV info if configured
        if (config.includePovInfo && input.povType) {
            message += `POV: ${input.povType}`;
            if (input.povCharacter) {
                message += ` (${input.povCharacter})`;
            }
            message += '\n\n';
        }

        // Add previous context if available
        if (contextText) {
            message += `PREVIOUS CONTEXT:\n${contextText}\n\n`;
        }

        message += `Expand the following brief notes/outline into detailed prose:\n\nNOTES:\n${briefNotes}\n\nWrite a fully expanded scene:`;

        return message;
    }

    private buildCustomMessage(agent: AgentPreset, input: PipelineInput, previousResults: AgentResult[]): string {
        const config = this.getEffectiveContextConfig(agent);
        const lorebookEntries = this.getLorebookForAgent(agent, input);
        const contextText = this.getPreviousWordsForAgent(agent, input, previousResults);
        
        // For custom agents, build a flexible context
        const lastOutput = previousResults[previousResults.length - 1]?.output || '';
        const scenebeat = input.scenebeat || '';

        let message = '';

        // Add lorebook if configured
        if (lorebookEntries.length > 0) {
            const lorebookContext = lorebookEntries
                .map(e => `• ${e.name}: ${e.description}`)
                .join('\n');
            message += `LORE CONTEXT:\n${lorebookContext}\n\n`;
        }

        // Add previous text context if configured
        if (contextText) {
            message += `STORY CONTEXT:\n${contextText}\n\n`;
        }

        // Add previous agent output if available
        if (lastOutput) {
            message += `PREVIOUS OUTPUT:\n${lastOutput}\n\n`;
        }

        message += `INSTRUCTION:\n${scenebeat || 'Process the input as instructed.'}`;

        return message;
    }

    private buildOutlineGeneratorMessage(agent: AgentPreset, input: PipelineInput, previousResults: AgentResult[]): string {
        const config = this.getEffectiveContextConfig(agent);
        const lorebookEntries = this.getLorebookForAgent(agent, input);
        const contextText = this.getPreviousWordsForAgent(agent, input, previousResults);
        
        let message = '';

        // Add lorebook context if available
        if (lorebookEntries.length > 0) {
            const lorebookContext = lorebookEntries
                .map(e => `[${e.category?.toUpperCase()}] ${e.name}: ${e.description}`)
                .join('\n\n');
            message += `ESTABLISHED LORE & CHARACTERS:\n${lorebookContext}\n\n`;
        }

        // Add chapter summary if configured
        if (config.includeChapterSummary && input.currentChapter?.summary) {
            message += `CURRENT CHAPTER SUMMARY:\n${input.currentChapter.summary}\n\n`;
        }

        // Add story context if available
        if (contextText) {
            message += `STORY SO FAR:\n${contextText}\n\n`;
        }

        // Add the user's request
        const request = input.scenebeat || 'Generate an outline for the next chapter.';
        message += `---\nOUTLINE REQUEST:\n${request}\n\nGenerate a detailed outline:`;

        return message;
    }

    private buildStyleExtractorMessage(agent: AgentPreset, input: PipelineInput, previousResults: AgentResult[]): string {
        // Style extractor primarily uses chapter content passed via previousWords or customData
        const sampleText = input.previousWords || (input.customData?.sampleText as string) || '';
        
        if (!sampleText) {
            return 'No text provided for style analysis. Please provide sample chapters or text to analyze.';
        }

        let message = `Analyze the following text and extract the author's writing style.\n\n`;
        message += `TEXT TO ANALYZE:\n${sampleText}\n\n`;
        message += `---\nProvide a comprehensive style guide based on this text:`;

        return message;
    }

    private buildScenebeatGeneratorMessage(agent: AgentPreset, input: PipelineInput, previousResults: AgentResult[]): string {
        const config = this.getEffectiveContextConfig(agent);
        const lorebookEntries = this.getLorebookForAgent(agent, input);
        const contextText = this.getPreviousWordsForAgent(agent, input, previousResults);
        
        let message = '';

        // Add lorebook context if available
        if (lorebookEntries.length > 0) {
            const lorebookContext = lorebookEntries
                .map(e => `• ${e.name}: ${e.description}`)
                .join('\n');
            message += `RELEVANT CHARACTERS & LORE:\n${lorebookContext}\n\n`;
        }

        // Add POV info if configured
        if (config.includePovInfo && input.povType) {
            message += `POV: ${input.povType}`;
            if (input.povCharacter) {
                message += ` (${input.povCharacter})`;
            }
            message += '\n\n';
        }

        // Add story context
        if (contextText) {
            message += `RECENT STORY CONTEXT:\n${contextText}\n\n`;
        }

        // Add the user's request
        const request = input.scenebeat || 'Generate scene beats for the next section.';
        message += `---\nREQUEST:\n${request}\n\nGenerate a list of scene beats:`;

        return message;
    }

    /**
     * Evaluate a condition string against the current pipeline state
     */
    private evaluateCondition(
        condition: string,
        input: PipelineInput,
        previousResults: AgentResult[],
        step?: ExecutablePipelineStep
    ): boolean {
        try {
            // Simple condition evaluator
            // Supports: 
            // - wordCount > N
            // - hasPreviousOutput
            // - hasLorebookEntries
            // - previousOutputContains:TEXT (checks last result for TEXT)
            // - roleOutputContains:ROLE:TEXT (checks specific role's output for TEXT)
            // - outputContainsAnyKeyword (checks step.validationKeywords against last output)
            const normalizedCondition = condition.toLowerCase().trim();

            // Check for outputContainsAnyKeyword — uses step-level validationKeywords array
            if (normalizedCondition === 'outputcontainsanykeyword') {
                const keywords = step?.validationKeywords;
                if (!keywords || keywords.length === 0) {
                    console.warn('[AgentOrchestrator] outputContainsAnyKeyword condition used but no validationKeywords defined on step');
                    return false;
                }
                const lastOutput = previousResults[previousResults.length - 1]?.output || '';
                const upperOutput = lastOutput.toUpperCase();
                const matched = keywords.some(kw => upperOutput.includes(kw.toUpperCase()));
                if (matched) {
                    console.log(`[AgentOrchestrator] outputContainsAnyKeyword: found keyword in output`);
                }
                return matched;
            }

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
     * Build a push prompt message using the step's custom pushPrompt template.
     * Supports {{PREVIOUS_OUTPUT}} and {{FEEDBACK}} placeholders.
     */
    private buildPushPromptMessage(
        pushPromptTemplate: string,
        input: PipelineInput,
        previousResults: AgentResult[]
    ): string {
        // Get the last prose output
        const proseRoles: AgentRole[] = ['prose_writer', 'style_editor', 'dialogue_specialist', 'expander'];
        let previousOutput = '';
        for (let i = previousResults.length - 1; i >= 0; i--) {
            if (proseRoles.includes(previousResults[i].role)) {
                previousOutput = previousResults[i].output;
                break;
            }
        }
        // Fallback to last result if no prose role found
        if (!previousOutput && previousResults.length > 0) {
            previousOutput = previousResults[previousResults.length - 1].output;
        }

        // Collect feedback from judge/checker roles
        const feedbackResults = previousResults.filter(r =>
            r.role === 'lore_judge' || r.role === 'continuity_checker' ||
            r.role.includes('judge') || r.role.includes('checker')
        );
        const feedback = feedbackResults.length > 0
            ? feedbackResults.map(r => `[${r.agentName}]:\n${r.output}`).join('\n\n')
            : 'No specific feedback available.';

        // Replace placeholders
        let message = pushPromptTemplate;
        message = message.replace(/\{\{PREVIOUS_OUTPUT\}\}/g, previousOutput);
        message = message.replace(/\{\{FEEDBACK\}\}/g, feedback);

        // Also include the original scene beat instruction for context
        if (input.scenebeat && !message.includes(input.scenebeat)) {
            message = `ORIGINAL INSTRUCTION:\n${input.scenebeat}\n\n${message}`;
        }

        return message;
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
            case 'nanogpt':
                return aiService.generateWithNanoGPT(messages, model.id, temperature, maxTokens);
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
