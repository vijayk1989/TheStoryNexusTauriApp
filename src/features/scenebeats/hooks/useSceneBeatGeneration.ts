/**
 * Custom hook that encapsulates all AI generation logic for a SceneBeat.
 *
 * Reads/writes state via the per-instance store, interacts with the Lexical
 * editor for text insertion, and delegates to useAgenticGeneration /
 * useParallelGeneration for advanced generation modes.
 */
import { useCallback } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    $createParagraphNode,
    $createTextNode,
    $getNodeByKey,
} from 'lexical';
import { toast } from 'react-toastify';
import { useAIStore } from '@/features/ai/stores/useAIStore';
import { usePromptStore } from '@/features/prompts/store/promptStore';
import { useLorebookStore } from '@/features/lorebook/stores/useLorebookStore';
import { useChapterStore } from '@/features/chapters/stores/useChapterStore';
import { createPromptParser } from '@/features/prompts/services/promptParser';
import { sceneBeatService } from '@/features/scenebeats/services/sceneBeatService';
import { useAgenticGeneration, type AgenticGenerationContext, type AgenticGenerationCallbacks } from '@/features/agents/hooks/useAgenticGeneration';
import { useParallelGeneration } from '@/features/agents/hooks/useParallelGeneration';
import { povUsesCharacter } from '@/features/chapters/utils/pov';
import type {
    Prompt,
    PromptParserConfig,
    AllowedModel,
} from '@/types/story';
import type { SceneBeatInstanceStoreApi } from '../stores/useSceneBeatInstanceStore';

type SceneBeatSnapshotWriter = {
    setSceneBeatSnapshot: (snapshot: Record<string, unknown>) => void;
};

function canWriteSceneBeatSnapshot(node: unknown): node is SceneBeatSnapshotWriter {
    return Boolean(
        node &&
        typeof node === 'object' &&
        'setSceneBeatSnapshot' in node &&
        typeof (node as SceneBeatSnapshotWriter).setSceneBeatSnapshot === 'function'
    );
}

export function useSceneBeatGeneration(store: SceneBeatInstanceStoreApi) {
    const [editor] = useLexicalComposerContext();
    const { generateWithPrompt, generateWithParsedMessages, processStreamedResponse, abortGeneration } = useAIStore();
    const { prompts, fetchPrompts, isLoading: promptsLoading, error: promptsError } = usePromptStore();
    const { tagMap, chapterMatchedEntries } = useLorebookStore();

    // External generation hooks
    const agenticHook = useAgenticGeneration();
    const parallelHook = useParallelGeneration();

    const updateNodeSnapshot = useCallback((snapshot: Record<string, unknown>) => {
        editor.update(() => {
            const node = $getNodeByKey(store.getState().nodeKey);
            if (canWriteSceneBeatSnapshot(node)) {
                node.setSceneBeatSnapshot(snapshot);
            }
        });
    }, [editor, store]);

    // ── Prompt config builder ──────────────────────────────────

    const createPromptConfig = useCallback((prompt: Prompt): PromptParserConfig => {
        const s = store.getState();

        // Read previous text from the editor
        let previousText = '';
        editor.getEditorState().read(() => {
            const node = $getNodeByKey(s.nodeKey);
            if (node) {
                const textNodes: string[] = [];
                let currentNode = node.getPreviousSibling();
                while (currentNode) {
                    if ('getTextContent' in currentNode) {
                        const isBlockNode = ['paragraph', 'heading', 'list-item'].includes(currentNode.getType());
                        const nodeText = currentNode.getTextContent();
                        if (nodeText.trim()) {
                            textNodes.unshift(nodeText);
                            if (isBlockNode) textNodes.unshift('\n');
                        }
                    }
                    currentNode = currentNode.getPreviousSibling();
                }
                previousText = textNodes.join('');
            }
        });

        // Combine matched entries based on toggle states
        const combinedMatchedEntries = new Set(
            [
                ...(s.useMatchedChapter && chapterMatchedEntries
                    ? Array.from(chapterMatchedEntries.values())
                    : []),
                ...(s.useMatchedSceneBeat && s.localMatchedEntries
                    ? Array.from(s.localMatchedEntries.values())
                    : []),
            ]
        );

        // Read story/chapter context from chapter store
        const { currentChapter } = useChapterStore.getState();
        // We need storyId/chapterId — extract from scene beat service or derive
        // The store doesn't hold storyId/chapterId directly; use the scene beat's data
        // Actually we need them from the StoryContext — they'll be passed in via the orchestrator
        // For now, we read them from the loaded SceneBeat
        const storyId = currentChapter?.storyId || '';
        const chapterId = currentChapter?.id || '';

        return {
            promptId: prompt.id,
            storyId,
            chapterId,
            scenebeat: s.command.trim(),
            previousWords: previousText,
            matchedEntries: combinedMatchedEntries,
            chapterMatchedEntries: new Set(
                chapterMatchedEntries ? Array.from(chapterMatchedEntries.values()) : []
            ),
            sceneBeatMatchedEntries: new Set(
                s.localMatchedEntries ? Array.from(s.localMatchedEntries.values()) : []
            ),
            povType: s.povType,
            povCharacter: povUsesCharacter(s.povType) ? s.povCharacter : undefined,
            sceneBeatContext: {
                useMatchedChapter: s.useMatchedChapter,
                useMatchedSceneBeat: s.useMatchedSceneBeat,
                useCustomContext: s.useCustomContext,
                customContextItems: s.useCustomContext
                    ? s.selectedItems.map((item) => item.id)
                    : [],
            },
        };
    }, [store, editor, chapterMatchedEntries]);

    // ── Preview ────────────────────────────────────────────────

    const handlePreviewPrompt = useCallback(async () => {
        const { selectedPrompt } = store.getState();
        if (!selectedPrompt) {
            toast.error('Please select a prompt first');
            return;
        }
        try {
            store.setState({ previewLoading: true, previewError: null, previewMessages: undefined });
            const config = createPromptConfig(selectedPrompt);
            const promptParser = createPromptParser();
            const parsedPrompt = await promptParser.parse(config);
            if (parsedPrompt.error) {
                store.setState({ previewError: parsedPrompt.error });
                toast.error(`Error parsing prompt: ${parsedPrompt.error}`);
                return;
            }
            store.setState({ previewMessages: parsedPrompt.messages, showPreviewDialog: true });
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            store.setState({ previewError: msg });
            toast.error(`Error previewing prompt: ${msg}`);
        } finally {
            store.setState({ previewLoading: false });
        }
    }, [store, createPromptConfig]);

    // ── Standard generation ────────────────────────────────────

    const handleGenerateWithPrompt = useCallback(async () => {
        const { selectedPrompt, selectedModel, sceneBeatId } = store.getState();
        if (!selectedPrompt) {
            toast.error('Please select a prompt first');
            return;
        }
        try {
            store.setState({ streaming: true, streamedText: '', streamComplete: false });
            const config = createPromptConfig(selectedPrompt);

            // Parse the prompt so we can capture messages for regeneration
            const promptParser = createPromptParser();
            const parsedPrompt = await promptParser.parse(config);
            if (parsedPrompt.error || !parsedPrompt.messages?.length) {
                throw new Error(parsedPrompt.error || 'Failed to parse prompt');
            }

            // Save parsed messages for potential regeneration later
            store.setState({ lastGenerationMessages: parsedPrompt.messages });

            const response = await generateWithParsedMessages(
                parsedPrompt.messages,
                selectedModel!,
                selectedPrompt.id
            );

            if (!response.ok && response.status !== 204) throw new Error('Failed to generate response');
            if (response.status === 204) {
                store.setState({ streaming: false });
                return;
            }

            await processStreamedResponse(
                response,
                (token) => store.getState().appendStreamedText(token),
                () => {
                    // Save the response text for regeneration
                    const responseText = store.getState().streamedText;
                    store.setState({
                        streamComplete: true,
                        lastGenerationResponse: responseText,
                    });
                    updateNodeSnapshot({ generatedContent: responseText, accepted: false });
                },
                (error) => {
                    console.error('Error streaming response:', error);
                    toast.error('Failed to generate text');
                }
            );

            // Save generated content to database
            const finalSceneBeatId = store.getState().sceneBeatId || sceneBeatId;
            if (finalSceneBeatId) {
                try {
                    await sceneBeatService.updateSceneBeat(finalSceneBeatId, {
                        generatedContent: store.getState().streamedText,
                        accepted: false,
                    });
                } catch (error) {
                    console.error('Error saving generated content:', error);
                }
            }
        } catch (error) {
            console.error('Error generating text:', error);
            toast.error('Failed to generate text');
        } finally {
            store.setState({ streaming: false });
        }
    }, [store, createPromptConfig, generateWithParsedMessages, processStreamedResponse, updateNodeSnapshot]);

    // ── Regeneration ───────────────────────────────────────────

    const handleRegenerate = useCallback(async (customMessage: string) => {
        const { lastGenerationMessages, lastGenerationResponse, selectedModel, selectedPrompt, sceneBeatId } = store.getState();
        if (!lastGenerationMessages || !lastGenerationResponse) {
            toast.error('No previous generation to regenerate from');
            return;
        }
        if (!selectedModel || !selectedPrompt) {
            toast.error('No model/prompt selected');
            return;
        }
        try {
            store.setState({
                streaming: true,
                streamedText: '',
                streamComplete: false,
                showRegenerateDialog: false,
            });

            // Build conversation: original messages + assistant response + user refinement
            const regenMessages = [
                ...lastGenerationMessages,
                { role: 'assistant' as const, content: lastGenerationResponse },
                { role: 'user' as const, content: customMessage },
            ];

            const response = await generateWithParsedMessages(
                regenMessages,
                selectedModel,
                selectedPrompt.id
            );

            if (!response.ok && response.status !== 204) throw new Error('Failed to regenerate response');
            if (response.status === 204) {
                store.setState({ streaming: false });
                return;
            }

            await processStreamedResponse(
                response,
                (token) => store.getState().appendStreamedText(token),
                () => {
                    const responseText = store.getState().streamedText;
                    store.setState({
                        streamComplete: true,
                        lastGenerationResponse: responseText,
                    });
                    updateNodeSnapshot({ generatedContent: responseText, accepted: false });
                },
                (error) => {
                    console.error('Error streaming regenerated response:', error);
                    toast.error('Failed to regenerate text');
                }
            );

            // Save regenerated content to database
            if (sceneBeatId) {
                try {
                    await sceneBeatService.updateSceneBeat(sceneBeatId, {
                        generatedContent: store.getState().streamedText,
                        accepted: false,
                    });
                } catch (error) {
                    console.error('Error saving regenerated content:', error);
                }
            }
        } catch (error) {
            console.error('Error regenerating text:', error);
            toast.error('Failed to regenerate text');
        } finally {
            store.setState({ streaming: false });
        }
    }, [store, generateWithParsedMessages, processStreamedResponse, updateNodeSnapshot]);

    // ── Agentic generation ─────────────────────────────────────

    const handleAgenticGenerate = useCallback(async () => {
        const s = store.getState();
        if (!s.selectedPipeline) {
            toast.error('Please select a pipeline first');
            return;
        }
        if (!s.command.trim()) {
            toast.error('Please enter a scene beat command');
            return;
        }

        try {
            store.setState({
                streaming: true,
                streamedText: '',
                streamComplete: false,
                showAgenticProgress: true,
                agenticStepResults: [],
            });

            // Build context directly from store state (no prompt required for agentic mode)
            // Read previous text from the editor
            let previousText = '';
            editor.getEditorState().read(() => {
                const node = $getNodeByKey(s.nodeKey);
                if (node) {
                    const textNodes: string[] = [];
                    let currentNode = node.getPreviousSibling();
                    while (currentNode) {
                        if ('getTextContent' in currentNode) {
                            const isBlockNode = ['paragraph', 'heading', 'list-item'].includes(currentNode.getType());
                            const nodeText = currentNode.getTextContent();
                            if (nodeText.trim()) {
                                textNodes.unshift(nodeText);
                                if (isBlockNode) textNodes.unshift('\n');
                            }
                        }
                        currentNode = currentNode.getPreviousSibling();
                    }
                    previousText = textNodes.join('');
                }
            });

            // Combine lorebook entries
            const combinedEntries = [
                ...(s.useMatchedChapter && chapterMatchedEntries
                    ? Array.from(chapterMatchedEntries.values())
                    : []),
                ...(s.useMatchedSceneBeat && s.localMatchedEntries
                    ? Array.from(s.localMatchedEntries.values())
                    : []),
            ];

            const { currentChapter } = useChapterStore.getState();
            const { entries } = useLorebookStore.getState();
            const context: AgenticGenerationContext = {
                scenebeat: s.command.trim(),
                previousWords: previousText,
                matchedEntries: combinedEntries,
                allEntries: entries,
                povType: s.povType,
                povCharacter: povUsesCharacter(s.povType) ? s.povCharacter : undefined,
                currentChapter,
            };

            const callbacks: AgenticGenerationCallbacks = {
                onStepStart: (stepIndex, agentName) => {
                    console.log(`[Agentic] Step ${stepIndex}: ${agentName}`);
                },
                onStepComplete: (stepResult, stepIndex) => {
                    store.setState((prev) => ({
                        agenticStepResults: [...prev.agenticStepResults, stepResult],
                    }));
                },
                onToken: (token) => store.getState().appendStreamedText(token),
                onComplete: (pipelineResult) => {
                    console.log('[Agentic] Pipeline complete:', pipelineResult);
                    const output = pipelineResult.displayOutput ||
                        pipelineResult.proseOutput ||
                        pipelineResult.finalOutput ||
                        store.getState().streamedText;
                    store.setState({
                        streamedText: output,
                        streamComplete: true,
                        showAgenticProgress: false,
                    });
                    updateNodeSnapshot({
                        generatedContent: output,
                        accepted: false,
                    });

                    if (s.sceneBeatId) {
                        sceneBeatService.updateSceneBeat(s.sceneBeatId, {
                            generatedContent: output,
                            accepted: false,
                        }).catch((err: unknown) => console.error('Error saving agentic content:', err));
                    }
                },
                onError: (error) => {
                    console.error('[Agentic] Error:', error);
                    toast.error('Pipeline generation failed');
                },
            };

            await agenticHook.generateWithPipeline(
                s.selectedPipeline.id,
                context,
                callbacks
            );
        } catch (error) {
            console.error('[Agentic] Error:', error);
            toast.error('Failed to run agentic generation');
        }
    }, [store, editor, chapterMatchedEntries, agenticHook, updateNodeSnapshot]);

    const handleAbortAgentic = useCallback(() => {
        agenticHook.abortGeneration();
        store.setState({ showAgenticProgress: false });
    }, [agenticHook, store]);

    // ── Parallel generation ────────────────────────────────────

    const handleParallelGenerate = useCallback(async () => {
        const { selectedPrompt } = store.getState();
        if (!selectedPrompt) {
            toast.error('Please select a prompt first');
            return;
        }
        if (!selectedPrompt.parallelModels || selectedPrompt.parallelModels.length < 2) {
            toast.error('This prompt needs at least 2 parallel models configured');
            return;
        }
        try {
            parallelHook.resetResponses();
            store.setState({ showParallelDrawer: true });
            const config = createPromptConfig(selectedPrompt);
            await parallelHook.generateParallel(config, selectedPrompt.parallelModels);
        } catch (error) {
            console.error('Error in parallel generation:', error);
            toast.error('Failed to run parallel generation');
        }
    }, [store, createPromptConfig, parallelHook]);

    const handleParallelAccept = useCallback((text: string, model: AllowedModel) => {
        const { nodeKey } = store.getState();
        editor.update(() => {
            const paragraphNode = $createParagraphNode();
            paragraphNode.append($createTextNode(text));
            const currentNode = $getNodeByKey(nodeKey);
            if (currentNode) currentNode.insertAfter(paragraphNode);
        });
        store.setState({ showParallelDrawer: false });
        parallelHook.resetResponses();
        toast.success(`Accepted response from ${model.name}`);
    }, [store, editor, parallelHook]);

    // ── Accept / Reject ────────────────────────────────────────

    const handleAccept = useCallback(async () => {
        const { streamedText, sceneBeatId, nodeKey } = store.getState();
        editor.update(() => {
            const paragraphNode = $createParagraphNode();
            paragraphNode.append($createTextNode(streamedText));
            const currentNode = $getNodeByKey(nodeKey);
            if (currentNode) currentNode.insertAfter(paragraphNode);
        });

        if (sceneBeatId) {
            try {
                await sceneBeatService.updateSceneBeat(sceneBeatId, { accepted: true });
            } catch (error) {
                console.error('Error updating accepted status:', error);
            }
        }
        updateNodeSnapshot({ generatedContent: streamedText, accepted: true });
        store.getState().resetGeneration();
    }, [store, editor, updateNodeSnapshot]);

    const handleReject = useCallback(() => {
        updateNodeSnapshot({ generatedContent: '', accepted: false });
        store.getState().resetGeneration();
    }, [store, updateNodeSnapshot]);

    // ── Delete ─────────────────────────────────────────────────

    const handleDelete = useCallback(async () => {
        const { sceneBeatId, nodeKey } = store.getState();
        if (sceneBeatId) {
            try {
                await sceneBeatService.deleteSceneBeat(sceneBeatId);
            } catch (error) {
                console.error('Error deleting SceneBeat from database:', error);
                toast.error('Failed to delete scene beat from database');
            }
        }
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if (node) node.remove();
        });
    }, [store, editor]);

    return {
        // Prompt store data (for PromptSelectMenu)
        prompts,
        fetchPrompts,
        promptsLoading,
        promptsError,

        // Tag map for effects
        tagMap,
        chapterMatchedEntries,

        // External hooks' reactive state
        isAgenticGenerating: agenticHook.isGenerating,
        currentStep: agenticHook.currentStep,
        currentAgentName: agenticHook.currentAgentName,
        agenticError: agenticHook.error,
        getAvailablePipelines: agenticHook.getAvailablePipelines,
        parallelResponses: parallelHook.responses,
        isParallelGenerating: parallelHook.isGenerating,
        parallelAllComplete: parallelHook.allComplete,
        abortParallel: parallelHook.abortAll,
        resetParallelResponses: parallelHook.resetResponses,

        // Our handlers
        createPromptConfig,
        handlePreviewPrompt,
        handleGenerateWithPrompt,
        handleAgenticGenerate,
        handleAbortAgentic,
        handleParallelGenerate,
        handleParallelAccept,
        handleAccept,
        handleReject,
        handleRegenerate,
        handleDelete,
        abortGeneration,
    };
}
