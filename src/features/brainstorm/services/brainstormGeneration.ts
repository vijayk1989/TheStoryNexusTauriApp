import { AIService } from '@/services/ai/AIService';
import { AgentOrchestrator, type PipelineInput } from '@/services/ai/AgentOrchestrator';
import { generateParsedMessages } from '@/services/ai/generateParsedMessages';
import { createStreamCheckpoint } from '@/services/ai/streamCheckpoint';
import { db } from '@/services/database';
import type { AllowedModel, ChatMessage, PromptParserConfig } from '@/types/story';
import { useBrainstormStore } from '../stores/useBrainstormStore';
import { useBrainstormTaskStore, type BrainstormTask, type BrainstormTaskMode, type BrainstormTaskStatus } from '../stores/useBrainstormTaskStore';
import { buildBrainstormMessages } from './brainstormMessages';

export interface BrainstormGenerationRequest {
    chatId: string;
    mode: BrainstormTaskMode;
    previousMessages: ChatMessage[];
    messagesBeforeReply: ChatMessage[];
    submittedInput?: string;
    submittedImageIds?: string[];
    config?: PromptParserConfig;
    model?: AllowedModel;
    promptHistory?: ChatMessage[];
    imageAssetIds?: string[];
    pipeline?: { id: string; input: PipelineInput };
}

/** Own the request independently of any mounted chat panel. */
export async function startBrainstormGeneration(request: BrainstormGenerationRequest): Promise<void> {
    const { chatId } = request;
    const taskId = crypto.randomUUID();
    const reply: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: '', timestamp: new Date() };
    let service: AIService | undefined;
    let orchestrator: AgentOrchestrator | undefined;
    let content = '';
    let liveMessages = request.messagesBeforeReply;
    const tasks = useBrainstormTaskStore.getState;
    const current = () => tasks().tasks[chatId];
    const isCurrent = () => current()?.id === taskId;
    const stopped = () => !isCurrent() || current().stopRequested;
    const update = (patch: Partial<BrainstormTask>) => tasks().update(chatId, taskId, patch);

    if (!tasks().register({
        id: taskId, chatId, mode: request.mode, status: 'running', messageId: reply.id,
        messages: liveMessages, currentStep: -1, currentAgentName: '', stepResults: [], stopRequested: false,
        cancel: () => { orchestrator?.abort(); service?.abortStream(); },
    })) return;

    const checkpoint = createStreamCheckpoint(async (messages: ChatMessage[]) => {
        if (isCurrent()) await db.aiChats.update(chatId, { messages, updatedAt: new Date() });
    }, error => console.error('Error checkpointing brainstorm:', error));

    const publish = (text: string) => {
        if (!isCurrent()) return;
        content = text;
        liveMessages = [...request.messagesBeforeReply, { ...reply, content }];
        update({ messages: liveMessages });
        if (content) checkpoint.schedule(liveMessages);
    };
    let status: BrainstormTaskStatus = 'completed';
    let errorMessage: string | undefined;

    try {
        if (!await db.aiChats.get(chatId) || stopped()) return;
        if (request.mode !== 'regeneration') {
            await useBrainstormStore.getState().updateChat(chatId, { messages: request.messagesBeforeReply, draftImageAssetIds: [] });
        }
        if (stopped()) return;
        service = await AIService.createSession();
        if (stopped()) return;

        if (request.pipeline) {
            orchestrator = AgentOrchestrator.createSession(service);
            const result = await orchestrator.executePipelinePreset(request.pipeline.id, request.pipeline.input, {
                onStepStart: (step, index) => update({ currentStep: index, currentAgentName: step.agent.name }),
                onStepComplete: (result) => {
                    if (isCurrent()) update({ stepResults: [...current().stepResults, result] });
                },
                onToken: token => publish(content + token),
            });
            if (result.status === 'completed' && !stopped()) {
                publish(result.displayOutput || result.proseOutput || result.finalOutput || content);
            } else if (!content) {
                publish(result.displayOutput || result.proseOutput || result.finalOutput || '');
            }
            if (result.status === 'failed') throw new Error(result.error || 'Pipeline generation failed');
            if (result.status === 'aborted') status = 'stopped';
        } else {
            const messages = await buildBrainstormMessages(request.config!, request.promptHistory || [], request.imageAssetIds || []);
            if (stopped()) return;
            const response = await generateParsedMessages(service, messages, request.model!, request.config!.promptId);
            if (stopped()) { service.abortStream(); return; }
            if (response.status === 204) { status = 'stopped'; return; }
            if (!response.ok) {
                const detail = await response.text();
                throw new Error(`Generation failed (${response.status}). ${detail.slice(0, 400)} Choose a vision-capable model if image input is unsupported.`);
            }
            let streamError: Error | undefined;
            await service.processStreamedResponse(response, token => publish(content + token), () => {}, error => { streamError = error; });
            if (streamError) throw streamError;
        }
    } catch (error) {
        if (!stopped()) {
            status = 'failed';
            const detail = error instanceof Error ? error.message : String(error);
            errorMessage = content ? `${detail} Partial response has been kept.` : detail;
        }
    } finally {
        if (isCurrent()) {
            if (current().stopRequested) status = 'stopped';
            try {
                if (content) {
                    checkpoint.schedule(liveMessages);
                } else {
                    liveMessages = request.previousMessages;
                    update({ messages: liveMessages });
                }
                await checkpoint.flush();
                if (isCurrent()) {
                    await useBrainstormStore.getState().updateChat(chatId, {
                        messages: liveMessages,
                        ...(!content && request.mode !== 'regeneration' ? { draftImageAssetIds: request.submittedImageIds || [] } : {}),
                    });
                    if (!content && request.mode !== 'regeneration') {
                        useBrainstormStore.getState().restoreDraft(chatId, request.submittedInput || '');
                    }
                }
            } catch (error) {
                console.error('Error saving brainstorm task:', error);
                status = 'failed';
                errorMessage = 'Could not save the response. Copy it before leaving this chat.';
                update({ unsaved: true });
            }
            update({ status, error: errorMessage, cancel: () => {} });
        } else {
            await checkpoint.flush().catch(error => console.error('Error finishing deleted brainstorm task:', error));
        }
    }
}
