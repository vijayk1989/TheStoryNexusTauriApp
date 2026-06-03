import { useState, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import type { AgentPreset, LorebookEntry, PromptMessage } from '@/types/story';
import { aiService } from '@/services/ai/AIService';
import { parseLorebookJson } from '@/features/brainstorm/utils/parseLorebookJson';
import { useLorebookStore } from '@/features/lorebook/stores/useLorebookStore';
import { LOREBOOK_TEMPLATES } from '@/features/lorebook/utils/lorebookTemplates';
import { splitThinkingContent } from '@/lib/thinking';

const JSON_OUTPUT_INSTRUCTION = `

Output ONLY a single JSON object wrapped in a \`\`\`json code fence. No prose, no commentary.`;

interface WorkshopState {
    conversationHistory: PromptMessage[];
    streamingContent: string;
    isGenerating: boolean;
    error: string | null;
    parsedPreview: Partial<LorebookEntry> | null;
    /** Raw model output before think-block stripping — used for diagnostics */
    rawResponse: string;
}

interface UseLorebookWorkshopReturn extends WorkshopState {
    startConception: (seedText: string, category: LorebookEntry['category'], agentPreset: AgentPreset) => Promise<void>;
    startRefinement: (existingEntry: LorebookEntry, agentPreset: AgentPreset) => Promise<void>;
    sendFollowUp: (userText: string) => Promise<void>;
    applyToEntry: (lorebookId: string, targetEntryId?: string) => Promise<void>;
    abort: () => void;
    reset: () => void;
}

const INITIAL_STATE: WorkshopState = {
    conversationHistory: [],
    streamingContent: '',
    isGenerating: false,
    error: null,
    parsedPreview: null,
    rawResponse: '',
};

export function useLorebookWorkshop(): UseLorebookWorkshopReturn {
    const [state, setState] = useState<WorkshopState>(INITIAL_STATE);
    const currentPresetRef = useRef<AgentPreset | null>(null);
    const { createEntry, updateEntry } = useLorebookStore();

    const setPartialState = (partial: Partial<WorkshopState>) => {
        setState(prev => ({ ...prev, ...partial }));
    };

    const generate = useCallback(async (agentPreset: AgentPreset, history: PromptMessage[]) => {
        currentPresetRef.current = agentPreset;

        const messages: PromptMessage[] = [
            { role: 'system', content: agentPreset.systemPrompt },
            ...history,
        ];

        setPartialState({ isGenerating: true, error: null, streamingContent: '' });

        let fullText = '';

        try {
            const { model, temperature, maxTokens } = agentPreset;
            let response: Response;

            switch (model.provider) {
                case 'local':
                    response = await aiService.generateWithLocalModel(
                        messages, temperature, maxTokens,
                        undefined, undefined, undefined, undefined, model.id
                    );
                    break;
                case 'openai':
                    response = await aiService.generateWithOpenAI(messages, model.id, temperature, maxTokens);
                    break;
                case 'openrouter':
                    response = await aiService.generateWithOpenRouter(messages, model.id, temperature, maxTokens);
                    break;
                case 'openai_compatible':
                    response = await aiService.generateWithOpenAICompatible(messages, model.id, temperature, maxTokens);
                    break;
                case 'nanogpt':
                    response = await aiService.generateWithNanoGPT(messages, model.id, temperature, maxTokens);
                    break;
                default:
                    throw new Error(`Unknown provider: ${model.provider}`);
            }

            await aiService.processStreamedResponse(
                response,
                (token) => {
                    fullText += token;
                    const { proseText } = splitThinkingContent(fullText);
                    setState(prev => ({ ...prev, streamingContent: proseText }));
                },
                () => {
                    const { proseText } = splitThinkingContent(fullText);
                    const { entries } = parseLorebookJson(proseText);
                    const parsed = entries[0] ?? null;
                    const updatedHistory: PromptMessage[] = [
                        ...history,
                        { role: 'assistant', content: proseText },
                    ];
                    setState(prev => ({
                        ...prev,
                        isGenerating: false,
                        streamingContent: '',
                        conversationHistory: updatedHistory,
                        parsedPreview: parsed,
                        rawResponse: fullText,
                        error: parsed ? null : (fullText ? 'Could not parse a lorebook entry from the response. Try sending a follow-up asking for valid JSON.' : null),
                    }));
                    if (parsed) {
                        toast.success('Lorebook entry generated', { autoClose: 3000 });
                    }
                },
                (error) => {
                    setPartialState({ isGenerating: false, error: error.message });
                }
            );
        } catch (error) {
            setPartialState({ isGenerating: false, error: (error as Error).message });
        }
    }, []);

    const startConception = useCallback(async (
        seedText: string,
        category: LorebookEntry['category'],
        agentPreset: AgentPreset
    ) => {
        const template = LOREBOOK_TEMPLATES[category];
        const userMessage = `Create a ${category} lorebook entry for: ${seedText}\n\n${template}${JSON_OUTPUT_INSTRUCTION}`;
        const history: PromptMessage[] = [{ role: 'user', content: userMessage }];
        setState({ ...INITIAL_STATE, conversationHistory: history, isGenerating: true });
        await generate(agentPreset, history);
    }, [generate]);

    const startRefinement = useCallback(async (
        existingEntry: LorebookEntry,
        agentPreset: AgentPreset
    ) => {
        const entryJson = JSON.stringify({
            name: existingEntry.name,
            category: existingEntry.category,
            description: existingEntry.description,
            tags: existingEntry.tags,
            metadata: existingEntry.metadata,
        }, null, 2);

        // Seed the conversation as if the AI already produced this entry
        const history: PromptMessage[] = [
            {
                role: 'user',
                content: `I have an existing lorebook entry. Please help me refine it.${JSON_OUTPUT_INSTRUCTION}`,
            },
            {
                role: 'assistant',
                content: `\`\`\`json\n${entryJson}\n\`\`\``,
            },
            {
                role: 'user',
                content: 'Please review this entry and suggest any improvements to make it richer and more consistent. Output the updated entry.',
            },
        ];

        setState({ ...INITIAL_STATE, conversationHistory: history, isGenerating: true });
        await generate(agentPreset, history);
    }, [generate]);

    const sendFollowUp = useCallback(async (userText: string) => {
        if (!currentPresetRef.current) return;
        const newHistory: PromptMessage[] = [
            ...state.conversationHistory,
            { role: 'user', content: userText + JSON_OUTPUT_INSTRUCTION },
        ];
        setPartialState({ conversationHistory: newHistory });
        await generate(currentPresetRef.current, newHistory);
    }, [state.conversationHistory, generate]);

    const applyToEntry = useCallback(async (lorebookId: string, targetEntryId?: string) => {
        if (!state.parsedPreview) return;
        const data = state.parsedPreview;

        if (targetEntryId) {
            await updateEntry(targetEntryId, {
                ...(data.name && { name: data.name }),
                ...(data.description && { description: data.description }),
                ...(data.category && { category: data.category }),
                ...(data.tags && { tags: data.tags }),
                ...(data.metadata && { metadata: data.metadata }),
            });
        } else {
            await createEntry({
                lorebookId,
                name: data.name ?? 'Untitled Entry',
                description: data.description ?? '',
                category: data.category ?? 'note',
                tags: data.tags ?? [],
                metadata: data.metadata,
            });
        }
    }, [state.parsedPreview, createEntry, updateEntry]);

    const abort = useCallback(() => {
        aiService.abortStream();
        setPartialState({ isGenerating: false });
    }, []);

    const reset = useCallback(() => {
        setState(INITIAL_STATE);
        currentPresetRef.current = null;
    }, []);

    return {
        ...state,
        startConception,
        startRefinement,
        sendFollowUp,
        applyToEntry,
        abort,
        reset,
    };
}
