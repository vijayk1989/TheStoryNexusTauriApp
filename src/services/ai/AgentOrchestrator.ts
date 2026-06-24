import { aiService } from './AIService';
import { isJudgeAgentRole, isProseAgentRole } from '@/features/agents/utils/agentRoles';
import { splitThinkingContent } from '@/lib/thinking';
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
    TimelineEvent,
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
    // Timeline events up to the current chapter
    timelineEvents?: TimelineEvent[];
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
    displayOutput: string;
    // The prose output (from the last prose_writer, style_editor, or dialogue_specialist)
    proseOutput?: string;
    outputKind: 'prose' | 'non_prose';
    steps: AgentResult[];
    totalDuration: number;
    status: 'completed' | 'failed' | 'aborted';
    error?: string;
    loopLimitReached?: boolean;
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

        // Track completed executions per retry step to enforce maxIterations.
        const iterationCounts = new Map<number, number>();
        let loopLimitReached = false;

        try {
            let i = 0;
            while (i < steps.length) {
                // Check if aborted
                if (this.abortController.signal.aborted) {
                    return {
                        finalOutput: results[results.length - 1]?.output ?? '',
                        displayOutput: this.getDisplayOutput(results).output,
                        proseOutput: this.getLastProseOutput(results),
                        outputKind: this.getDisplayOutput(results).kind,
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

                callbacks?.onStepStart?.(step, i);
                const stepStart = Date.now();

                try {
                    const messages = this.buildMessages(step.agent, input, results, step.isRevision, step);
                    const shouldStream = step.streamOutput ?? false; // Default to NOT streaming

                    let rawOutput: string;
                    if (shouldStream && callbacks?.onToken) {
                        rawOutput = await this.generateStreaming(step.agent, messages, callbacks.onToken);
                    } else {
                        rawOutput = await this.generateNonStreaming(step.agent, messages);
                    }

                    const { proseText: output, thinkingText } = splitThinkingContent(rawOutput);
                    const completedIteration = (iterationCounts.get(i) ?? 0) + 1;
                    iterationCounts.set(i, completedIteration);

                    const metadata: Record<string, unknown> = {};
                    if (step.isRevision) metadata.isRevision = true;
                    if (step.isRevision || step.retryFromStep !== undefined) metadata.iteration = completedIteration;
                    if (thinkingText) metadata.thinkingText = thinkingText;

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

                    if (step.retryFromStep !== undefined && step.retryFromStep !== null && step.condition) {
                        const maxIter = step.maxIterations ?? 1;
                        if (completedIteration < maxIter) {
                            console.log(`[AgentOrchestrator] Retry loop: jumping from step ${i} back to step ${step.retryFromStep} (iteration ${completedIteration}/${maxIter})`);
                            i = step.retryFromStep;
                            continue;
                        }

                        console.log(`[AgentOrchestrator] Retry loop: max iterations (${maxIter}) reached at step ${i}`);
                        loopLimitReached = true;
                    }

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
                        displayOutput: this.getDisplayOutput(results).output,
                        proseOutput: this.getLastProseOutput(results),
                        outputKind: this.getDisplayOutput(results).kind,
                        steps: results,
                        totalDuration: Date.now() - startTime,
                        status: 'failed',
                        error: (error as Error).message
                    };
                }

                i++;
            }

            const proseOutput = this.getLastProseOutput(results);
            const displayOutput = this.getDisplayOutput(results);

            return {
                finalOutput: results[results.length - 1]?.output ?? '',
                displayOutput: displayOutput.output,
                proseOutput,
                outputKind: displayOutput.kind,
                steps: results,
                totalDuration: Date.now() - startTime,
                status: 'completed',
                loopLimitReached: loopLimitReached || undefined,
            };

        } catch (error) {
            const displayOutput = this.getDisplayOutput(results);
            return {
                finalOutput: '',
                displayOutput: displayOutput.output,
                proseOutput: this.getLastProseOutput(results),
                outputKind: displayOutput.kind,
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

    private getLastProseOutput(results: AgentResult[]): string {
        return this.getLastProseResult(results)?.output || '';
    }

    private getLastProseResult(results: AgentResult[]): AgentResult | undefined {
        for (let i = results.length - 1; i >= 0; i--) {
            if (isProseAgentRole(results[i].role)) {
                return results[i];
            }
        }
        return undefined;
    }

    private getLastRoleResult(results: AgentResult[], role: AgentRole): AgentResult | undefined {
        for (let i = results.length - 1; i >= 0; i--) {
            if (results[i].role === role) return results[i];
        }
        return undefined;
    }

    private getLastProseIndex(results: AgentResult[]): number {
        for (let i = results.length - 1; i >= 0; i--) {
            if (isProseAgentRole(results[i].role)) return i;
        }
        return -1;
    }

    private getDisplayOutput(results: AgentResult[]): { output: string; kind: PipelineResult['outputKind'] } {
        const lastResult = results[results.length - 1];
        if (lastResult && !isProseAgentRole(lastResult.role)) {
            return { output: lastResult.output, kind: 'non_prose' };
        }

        return { output: this.getLastProseOutput(results), kind: 'prose' };
    }

    private hasJudgeIssues(output: string): boolean {
        const upper = output.toUpperCase().trim();
        if (upper.includes('##LORE_ISSUE##') || upper.includes('##CONTINUITY_ISSUE##')) return true;
        if (upper.startsWith('CONSISTENT') || upper.startsWith('PASS') || upper.startsWith('CONTENT_OK')) return false;
        return upper.includes('ISSUE') &&
            !upper.includes('NO ISSUE') &&
            !upper.includes('WITHOUT ISSUE') &&
            !upper.includes('NO CONTINUITY ISSUE');
    }

    private getFeedbackSinceLastProse(previousResults: AgentResult[]): string {
        const lastProseIndex = this.getLastProseIndex(previousResults);
        const feedbackResults = previousResults.filter((result, index) =>
            index > lastProseIndex && isJudgeAgentRole(result.role)
        );

        return feedbackResults
            .map(result => `[${result.role.toUpperCase()} FEEDBACK]:\n${result.output}`)
            .join('\n\n');
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
            const previousOutput = this.getLastProseOutput(previousResults) || previousResults[previousResults.length - 1]?.output || '';
            const feedback = this.getFeedbackSinceLastProse(previousResults) || previousResults[previousResults.length - 1]?.output || '';

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

    private formatTimelineContext(input: PipelineInput): string {
        const events = (input.timelineEvents || [])
            .filter(event => !event.isDisabled)
            .sort((a, b) => {
                const chapterA = a.chapterOrder ?? Number.MAX_SAFE_INTEGER;
                const chapterB = b.chapterOrder ?? Number.MAX_SAFE_INTEGER;
                if (chapterA !== chapterB) return chapterA - chapterB;
                return a.eventOrder - b.eventOrder;
            });

        if (events.length === 0) return '';

        const lorebookById = new Map((input.allLorebookEntries || input.lorebookEntries || []).map(entry => [entry.id, entry]));

        return events.map(event => {
            const participants = [
                ...event.participantIds.map(id => lorebookById.get(id)?.name).filter(Boolean),
                ...(event.unresolvedParticipants || []),
            ];
            const participantLine = participants.length ? ` Participants: ${participants.join(', ')}.` : '';
            const chapterLabel = event.chapterOrder ? `Chapter ${event.chapterOrder}, event ${event.eventOrder}` : `Event ${event.eventOrder}`;
            return `- ${chapterLabel}: ${event.title}. ${event.summary}${participantLine}`;
        }).join('\n');
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
        const timelineContext = this.formatTimelineContext(input);

        // Build lorebook context with full descriptions
        const lorebookContext = lorebookEntries
            .map(e => `• ${e.name}: ${e.description}`)
            .join('\n') || '';

        let message = '';

        if (lorebookContext) {
            message += `RELEVANT LORE:\n${lorebookContext}\n\n`;
        }

        if (timelineContext) {
            message += `TIMELINE SO FAR:\n${timelineContext}\n\n`;
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
        const originalProse = this.getLastProseOutput(previousResults);
        const feedback = this.getFeedbackSinceLastProse(previousResults);
        const timelineContext = this.formatTimelineContext(input);

        // Build lorebook context for reference (full descriptions)
        const lorebookContext = lorebookEntries
            .map(e => `• ${e.name}: ${e.description}`)
            .join('\n') || '';

        let message = 'You need to REVISE the following prose based on the feedback provided.\n\n';

        if (lorebookContext) {
            message += `RELEVANT LORE (for reference):\n${lorebookContext}\n\n`;
        }

        if (timelineContext) {
            message += `TIMELINE SO FAR (for reference):\n${timelineContext}\n\n`;
        }

        message += `ORIGINAL SCENE BEAT INSTRUCTION:\n${input.scenebeat || ''}\n\n`;
        message += `---\nORIGINAL PROSE:\n${originalProse}\n\n`;
        message += `---\n${feedback}\n\n`;
        message += `---\nPlease rewrite the prose, addressing ALL the issues mentioned in the feedback while maintaining the original intent and style. Output ONLY the revised prose:`;

        return message;
    }

    private buildLoreJudgeMessage(agent: AgentPreset, input: PipelineInput, previousResults: AgentResult[]): string {
        const proseOutput = this.getLastProseOutput(previousResults);
        const lorebookEntries = this.getLorebookForAgent(agent, input);
        const timelineContext = this.formatTimelineContext(input);
        
        const lorebookContext = lorebookEntries
            .map(e => `[${e.category?.toUpperCase()}] ${e.name}:\n${e.description}`)
            .join('\n\n') || '';

        return `Check the following prose for consistency with the established lore.

LOREBOOK DATA:
${lorebookContext}

TIMELINE DATA:
${timelineContext}

PROSE TO CHECK:
${proseOutput}

List any inconsistencies found. If everything is consistent, respond with just: CONSISTENT`;
    }

    private buildContinuityCheckerMessage(agent: AgentPreset, input: PipelineInput, previousResults: AgentResult[]): string {
        const proseOutput = this.getLastProseOutput(previousResults);
        const contextText = this.getPreviousWordsForAgent(agent, input, previousResults);
        const timelineContext = this.formatTimelineContext(input);

        return `Check the following new prose for plot and character continuity with the previous context.

PREVIOUS CONTEXT:
${contextText}

TIMELINE SO FAR:
${timelineContext}

NEW PROSE:
${proseOutput}

List any continuity issues (timeline inconsistencies, character behavior changes, forgotten plot points). If consistent, respond with: CONSISTENT`;
    }

    private buildStyleEditorMessage(agent: AgentPreset, previousResults: AgentResult[]): string {
        const proseOutput = this.getLastProseOutput(previousResults);
        const feedback = this.getFeedbackSinceLastProse(previousResults);

        return `Review and polish the following prose for style, flow, and readability. Maintain the author's voice while improving clarity and impact.
${feedback ? `\nJudge feedback to address while polishing:\n${feedback}\n` : ''}

PROSE TO EDIT:
${proseOutput}

Provide the edited prose only:`;
    }

    private buildDialogueSpecialistMessage(agent: AgentPreset, previousResults: AgentResult[]): string {
        const proseOutput = this.getLastProseOutput(previousResults);

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
                    const roleResult = this.getLastRoleResult(previousResults, role as AgentRole);
                    if (roleResult) {
                        if (isJudgeAgentRole(roleResult.role) && searchText.toUpperCase() === 'ISSUE') {
                            return this.hasJudgeIssues(roleResult.output);
                        }
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
                return previousResults.some(r => isJudgeAgentRole(r.role) && this.hasJudgeIssues(r.output));
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
        const previousOutput = this.getLastProseOutput(previousResults) ||
            previousResults[previousResults.length - 1]?.output ||
            '';
        const feedback = this.getFeedbackSinceLastProse(previousResults) || 'No specific feedback available.';

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
