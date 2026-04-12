/**
 * ChapterReviewPanel — runs an AI agent pipeline against the full text of the current chapter
 * to produce editorial feedback. Uses the existing agentic generation infrastructure.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Bot, ChevronDown, ChevronRight, Copy, FileSearch, Loader2, RotateCcw, SquareX } from 'lucide-react';
import { splitThinkingContent } from '@/lib/thinking';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useStoryContext } from '@/features/stories/context/StoryContext';
import { useChapterStore } from '@/features/chapters/stores/useChapterStore';
import { useLorebookStore } from '@/features/lorebook/stores/useLorebookStore';
import { useAgenticGeneration } from '@/features/agents/hooks/useAgenticGeneration';
import type { PipelinePreset } from '@/types/story';
import { toast } from 'react-toastify';

export function ChapterReviewPanel({
    onSendToEdit,
    chapterId,
}: {
    onSendToEdit?: (reviewText: string) => void;
    chapterId?: string | null;
} = {}) {
    const { currentChapterId, currentStoryId } = useStoryContext();
    const { currentChapter, getChapterPlainText } = useChapterStore();
    const { entries: lorebookEntries } = useLorebookStore();

    const {
        isGenerating,
        currentAgentName,
        stepResults,
        generateWithPipeline,
        abortGeneration,
        getAvailablePipelines,
    } = useAgenticGeneration();

    const ssKey = chapterId ? `editorial-review-${chapterId}` : null;

    const [pipelines, setPipelines] = useState<PipelinePreset[]>([]);
    const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
    const [reviewFocus, setReviewFocus] = useState('');
    const [streamedOutput, setStreamedOutput] = useState('');
    const [thinkingOutput, setThinkingOutput] = useState('');
    const [thinkingExpanded, setThinkingExpanded] = useState(false);
    const [finalOutput, setFinalOutput] = useState(() =>
        ssKey ? (sessionStorage.getItem(ssKey + '-output') || '') : ''
    );
    const [hasRun, setHasRun] = useState(() => !!(ssKey && sessionStorage.getItem(ssKey + '-output')));
    const [additionalResults, setAdditionalResults] = useState<{ agentName: string; output: string }[]>(() => {
        if (!ssKey) return [];
        try { return JSON.parse(sessionStorage.getItem(ssKey + '-additional') || '[]'); } catch { return []; }
    });
    const outputRef = useRef<HTMLDivElement>(null);

    // Load pipelines on mount
    useEffect(() => {
        getAvailablePipelines().then((all) => {
            setPipelines(all);
            // Default to "Chapter Review" pipeline if available, otherwise first pipeline
            const reviewPipeline = all.find(
                (p) => p.name.toLowerCase().includes('chapter review') || p.name.toLowerCase().includes('chapter deep review')
            );
            if (reviewPipeline) {
                setSelectedPipelineId(reviewPipeline.id);
            } else if (all.length > 0) {
                setSelectedPipelineId(all[0].id);
            }
        });
    }, [getAvailablePipelines]);

    // Persist review output and additional results to sessionStorage
    useEffect(() => {
        if (!ssKey) return;
        sessionStorage.setItem(ssKey + '-output', finalOutput);
    }, [ssKey, finalOutput]);

    useEffect(() => {
        if (!ssKey) return;
        sessionStorage.setItem(ssKey + '-additional', JSON.stringify(additionalResults));
    }, [ssKey, additionalResults]);

    // Scroll output to bottom when streaming
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [streamedOutput]);

    const handleRun = useCallback(async () => {
        if (!currentChapterId || !selectedPipelineId) {
            toast.error('No chapter or pipeline selected');
            return;
        }

        // Grab full plain text of the chapter
        let chapterText = '';
        try {
            chapterText = await getChapterPlainText(currentChapterId);
        } catch {
            toast.error('Failed to extract chapter text');
            return;
        }

        if (!chapterText.trim()) {
            toast.error('The chapter appears to be empty — nothing to review');
            return;
        }

        setStreamedOutput('');
        setThinkingOutput('');
        setFinalOutput('');
        setAdditionalResults([]);
        setHasRun(true);

        // Raw token accumulator for streaming think-block parsing
        let rawStream = '';

        const result = await generateWithPipeline(
            selectedPipelineId,
            {
                scenebeat: reviewFocus,
                // Full chapter text is the primary input for the reviewer
                previousWords: chapterText,
                matchedEntries: lorebookEntries,
                allEntries: lorebookEntries,
                povType: currentChapter?.povType,
                povCharacter: currentChapter?.povCharacter,
                currentChapter: currentChapter ?? undefined,
            },
            {
                onToken: (token) => {
                    rawStream += token;
                    const { proseText, thinkingText } = splitThinkingContent(rawStream);
                    setStreamedOutput(proseText);
                    setThinkingOutput(thinkingText);
                },
                onStepComplete: (stepResult) => {
                    // Reset raw stream for the next streaming step
                    rawStream = '';
                    // Capture non-streaming step outputs (e.g. lore_judge, continuity_checker)
                    if (stepResult.role !== 'chapter_reviewer') {
                        setAdditionalResults((prev) => [
                            ...prev,
                            { agentName: stepResult.agentName, output: stepResult.output },
                        ]);
                    }
                },
                onComplete: (r) => {
                    // Use the reviewer step's own output as the primary review text.
                    // r.finalOutput is the last pipeline step (e.g. continuity_checker),
                    // not necessarily the chapter_reviewer stream.
                    const reviewStep = r.steps.find(s => s.role === 'chapter_reviewer');
                    const rawFinal = reviewStep?.output || r.finalOutput;
                    // Strip any think blocks from the final stored output
                    const { proseText } = splitThinkingContent(rawFinal);
                    setFinalOutput(proseText);
                    setStreamedOutput('');
                    setThinkingOutput('');
                },
                onError: (err) => {
                    toast.error(`Review failed: ${err.message}`);
                },
            }
        );

        if (!result) return;
    }, [
        currentChapterId,
        selectedPipelineId,
        reviewFocus,
        getChapterPlainText,
        lorebookEntries,
        currentChapter,
        generateWithPipeline,
    ]);

    const handleCopy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Copied to clipboard');
        } catch {
            toast.error('Failed to copy');
        }
    };

    const handleReset = () => {
        setStreamedOutput('');
        setThinkingOutput('');
        setFinalOutput('');
        setAdditionalResults([]);
        setHasRun(false);
        if (ssKey) {
            sessionStorage.removeItem(ssKey + '-output');
            sessionStorage.removeItem(ssKey + '-additional');
        }
    };

    const displayOutput = finalOutput || streamedOutput;

    return (
        <div className="flex flex-col gap-4 pt-2">
            {/* Pipeline selector */}
            <div className="space-y-1">
                <Label htmlFor="chapter-review-pipeline">Pipeline</Label>
                <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId} disabled={isGenerating}>
                    <SelectTrigger id="chapter-review-pipeline">
                        <SelectValue placeholder="Select a pipeline…" />
                    </SelectTrigger>
                    <SelectContent>
                        {pipelines.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                                {p.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {pipelines.find((p) => p.id === selectedPipelineId)?.description && (
                    <p className="text-xs text-muted-foreground">
                        {pipelines.find((p) => p.id === selectedPipelineId)!.description}
                    </p>
                )}
            </div>

            {/* Optional focus instructions */}
            <div className="space-y-1">
                <Label htmlFor="chapter-review-focus">Review Focus (optional)</Label>
                <Textarea
                    id="chapter-review-focus"
                    placeholder="e.g. Focus on dialogue consistency and pacing in the second half…"
                    rows={3}
                    value={reviewFocus}
                    onChange={(e) => setReviewFocus(e.target.value)}
                    disabled={isGenerating}
                    className="resize-y text-sm"
                />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
                {!isGenerating ? (
                    <Button
                        onClick={handleRun}
                        disabled={!selectedPipelineId || !currentChapterId}
                        className="flex-1"
                    >
                        <FileSearch className="h-4 w-4 mr-2" />
                        {hasRun ? 'Run Again' : 'Review Chapter'}
                    </Button>
                ) : (
                    <Button variant="destructive" onClick={abortGeneration} className="flex-1">
                        <SquareX className="h-4 w-4 mr-2" />
                        Stop
                    </Button>
                )}

                {hasRun && !isGenerating && (
                    <Button variant="outline" size="icon" onClick={handleReset} title="Clear results">
                        <RotateCcw className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Progress indicator */}
            {isGenerating && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>
                        {currentAgentName ? `Running: ${currentAgentName}` : 'Starting…'}
                    </span>
                </div>
            )}

            {/* Thinking box — shown when the model emits <think>...</think> blocks */}
            {thinkingOutput && (
                <div className="space-y-1">
                    <button
                        type="button"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setThinkingExpanded((v) => !v)}
                    >
                        {thinkingExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                        ) : (
                            <ChevronRight className="h-3 w-3" />
                        )}
                        Thinking…
                    </button>
                    {thinkingExpanded && (
                        <div className="rounded-md border border-dashed bg-muted/10 p-3 text-xs text-muted-foreground whitespace-pre-wrap max-h-[200px] overflow-y-auto leading-relaxed">
                            {thinkingOutput}
                        </div>
                    )}
                </div>
            )}

            {/* Streaming / final review output */}
            {(displayOutput || isGenerating) && (
                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-sm font-medium">
                            <Bot className="h-4 w-4" />
                            Review
                        </div>
                        <div className="flex items-center gap-1">
                            {displayOutput && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleCopy(displayOutput)}
                                    title="Copy review"
                                >
                                    <Copy className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    </div>
                    <div
                        ref={outputRef}
                        className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap max-h-[50vh] overflow-y-auto leading-relaxed"
                    >
                        {displayOutput || (
                            <span className="text-muted-foreground italic">Generating review…</span>
                        )}
                        {isGenerating && (
                            <span className="inline-block w-1 h-4 bg-primary ml-0.5 animate-pulse" />
                        )}
                    </div>
                </div>
            )}

            {/* Additional agent outputs (lore judge, continuity checker, etc.) */}
            {additionalResults.length > 0 && (
                <div className="space-y-3">
                    {additionalResults.map((r, idx) => (
                        <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between">
                                <Badge variant="outline" className="text-xs">
                                    {r.agentName}
                                </Badge>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleCopy(r.output)}
                                    title={`Copy ${r.agentName} output`}
                                >
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                            <div className="rounded-md border bg-muted/20 p-3 text-sm whitespace-pre-wrap max-h-[30vh] overflow-y-auto leading-relaxed">
                                {r.output}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Completed step summary */}
            {!isGenerating && stepResults.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                    {stepResults.length} agent step{stepResults.length !== 1 ? 's' : ''} completed
                </p>
            )}

            {/* Send to Edit button — only shown when review is complete and parent supports it */}
            {!isGenerating && finalOutput && onSendToEdit && (
                <Button
                    variant="default"
                    className="w-full"
                    onClick={() => {
                        // Combine the primary review with any additional analysis steps
                        const parts: string[] = [];
                        if (finalOutput) parts.push(finalOutput);
                        additionalResults.forEach((r) => {
                            if (r.output) parts.push(`[${r.agentName}]\n${r.output}`);
                        });
                        onSendToEdit(parts.join('\n\n---\n\n') || finalOutput);
                    }}
                >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Send Review to Edit Tab
                </Button>
            )}
        </div>
    );
}
