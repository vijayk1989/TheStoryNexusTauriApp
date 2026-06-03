/**
 * AIEditorialPanel — the top-level "AI Editorial" sheet panel.
 * Provides two modes via tabs:
 *   Review — editorial feedback on the chapter (uses ChapterReviewPanel)
 *   Edit   — produces a fully rewritten chapter using the chapter_editor role
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ClipboardCopy, FileEdit, FileSearch, Loader2, Maximize2, Minimize2, RotateCcw, SquareX } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ChapterReviewPanel } from '@/features/chapters/components/ChapterReviewPanel';
import { useStoryContext } from '@/features/stories/context/StoryContext';
import { useChapterStore } from '@/features/chapters/stores/useChapterStore';
import { useLorebookStore } from '@/features/lorebook/stores/useLorebookStore';
import { useAgenticGeneration } from '@/features/agents/hooks/useAgenticGeneration';
import type { PipelinePreset } from '@/types/story';
import { toast } from 'react-toastify';
import { splitThinkingContent } from '@/lib/thinking';

function wordCount(text: string): number {
    return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

function WordCountBadge({ original, edited }: { original: number; edited: number }) {
    if (original === 0) return null;
    const pct = Math.round(((edited - original) / original) * 100);
    const inRange = Math.abs(pct) <= 10;
    return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Original: <strong>{original.toLocaleString()}</strong> words</span>
            <span>·</span>
            <span>Edited: <strong>{edited.toLocaleString()}</strong> words</span>
            {edited > 0 && (
                <Badge variant={inRange ? 'secondary' : 'destructive'} className="text-xs">
                    {pct >= 0 ? '+' : ''}{pct}%
                </Badge>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Inner component: chapter edit mode
// ---------------------------------------------------------------------------
function ChapterEditContent({
    editInstructions,
    setEditInstructions,
    isExpanded,
    onExpandChange,
    chapterId,
}: {
    editInstructions: string;
    setEditInstructions: (v: string) => void;
    isExpanded: boolean;
    onExpandChange: (v: boolean) => void;
    chapterId: string | null | undefined;
}) {
    const { currentChapterId } = useStoryContext();
    const { currentChapter, getChapterPlainText } = useChapterStore();
    const { entries: lorebookEntries } = useLorebookStore();

    const {
        isGenerating,
        currentAgentName,
        generateWithPipeline,
        abortGeneration,
        getAvailablePipelines,
    } = useAgenticGeneration();

    const ssKey = chapterId ? `editorial-edit-${chapterId}` : null;

    const [pipelines, setPipelines] = useState<PipelinePreset[]>([]);
    const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
    const [streamedOutput, setStreamedOutput] = useState('');
    const [finalOutput, setFinalOutput] = useState(() =>
        ssKey ? (sessionStorage.getItem(ssKey + '-output') || '') : ''
    );
    const [originalText, setOriginalText] = useState(() =>
        ssKey ? (sessionStorage.getItem(ssKey + '-original') || '') : ''
    );
    const [hasRun, setHasRun] = useState(() => !!(ssKey && sessionStorage.getItem(ssKey + '-output')));
    const outputRef = useRef<HTMLDivElement>(null);
    const originalRef = useRef<HTMLDivElement>(null);

    // Load pipelines — prefer edit-oriented ones
    useEffect(() => {
        getAvailablePipelines().then((all) => {
            setPipelines(all);
            const editPipeline = all.find(
                (p) =>
                    p.name.toLowerCase() === 'chapter edit' ||
                    p.name.toLowerCase().includes('chapter edit')
            );
            if (editPipeline) {
                setSelectedPipelineId(editPipeline.id);
            } else if (all.length > 0) {
                setSelectedPipelineId(all[0].id);
            }
        });
    }, [getAvailablePipelines]);

    // Persist finalOutput and originalText to sessionStorage
    useEffect(() => {
        if (!ssKey) return;
        sessionStorage.setItem(ssKey + '-output', finalOutput);
    }, [ssKey, finalOutput]);

    useEffect(() => {
        if (!ssKey) return;
        sessionStorage.setItem(ssKey + '-original', originalText);
    }, [ssKey, originalText]);

    // Auto-scroll output as tokens arrive
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

        let chapterText = '';
        try {
            chapterText = await getChapterPlainText(currentChapterId);
        } catch {
            toast.error('Failed to extract chapter text');
            return;
        }

        if (!chapterText.trim()) {
            toast.error('The chapter appears to be empty — nothing to edit');
            return;
        }

        setStreamedOutput('');
        setFinalOutput('');
        setOriginalText(chapterText);
        setHasRun(true);

        let rawEditStream = '';
        await generateWithPipeline(
            selectedPipelineId,
            {
                scenebeat: editInstructions,
                previousWords: chapterText,
                matchedEntries: lorebookEntries,
                allEntries: lorebookEntries,
                povType: currentChapter?.povType,
                povCharacter: currentChapter?.povCharacter,
                currentChapter: currentChapter ?? undefined,
            },
            {
                onToken: (token) => {
                    rawEditStream += token;
                    setStreamedOutput(splitThinkingContent(rawEditStream).proseText);
                },
                onComplete: (r) => {
                    setFinalOutput(splitThinkingContent(r.finalOutput).proseText);
                    setStreamedOutput('');
                },
                onError: (err) => {
                    toast.error(`Edit failed: ${err.message}`);
                },
            }
        );
    }, [
        currentChapterId,
        selectedPipelineId,
        editInstructions,
        getChapterPlainText,
        lorebookEntries,
        currentChapter,
        generateWithPipeline,
    ]);

    const handleCopy = async () => {
        const text = finalOutput || streamedOutput;
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Edited chapter copied to clipboard');
        } catch {
            toast.error('Failed to copy');
        }
    };

    const handleReset = () => {
        setStreamedOutput('');
        setFinalOutput('');
        setOriginalText('');
        setHasRun(false);
        if (ssKey) {
            sessionStorage.removeItem(ssKey + '-output');
            sessionStorage.removeItem(ssKey + '-original');
        }
    };

    const displayOutput = finalOutput || streamedOutput;
    const origWords = wordCount(originalText);
    const editedWords = wordCount(displayOutput);

    // ── POST-RUN: expanded = split pane, narrow = edited only ──────────────
    if (hasRun) {
        const controlsBar = (
            <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[140px] space-y-1">
                    <Label htmlFor="chapter-edit-pipeline" className="text-xs">Pipeline</Label>
                    <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId} disabled={isGenerating}>
                        <SelectTrigger id="chapter-edit-pipeline" className="h-8 text-xs">
                            <SelectValue placeholder="Select a pipeline…" />
                        </SelectTrigger>
                        <SelectContent>
                            {pipelines.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex-[2] min-w-[160px] space-y-1">
                    <Label htmlFor="chapter-edit-instructions" className="text-xs">Instructions</Label>
                    <Textarea
                        id="chapter-edit-instructions"
                        placeholder="e.g. Tighten the pacing…"
                        rows={1}
                        value={editInstructions}
                        onChange={(e) => setEditInstructions(e.target.value)}
                        disabled={isGenerating}
                        className="resize-y text-xs min-h-[32px] py-1"
                    />
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!isGenerating ? (
                        <Button onClick={handleRun} disabled={!selectedPipelineId || !currentChapterId} size="sm">
                            <FileEdit className="h-3.5 w-3.5 mr-1" />
                            Edit Again
                        </Button>
                    ) : (
                        <Button variant="destructive" onClick={abortGeneration} size="sm">
                            <SquareX className="h-3.5 w-3.5 mr-1" />
                            Stop
                        </Button>
                    )}
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleReset} title="Clear">
                        <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onExpandChange(!isExpanded)}
                        title={isExpanded ? 'Collapse' : 'Expand to compare'}
                    >
                        {isExpanded
                            ? <Minimize2 className="h-3.5 w-3.5" />
                            : <Maximize2 className="h-3.5 w-3.5" />}
                    </Button>
                </div>
            </div>
        );

        const statusBar = (
            <div className="flex items-center justify-between">
                <WordCountBadge original={origWords} edited={editedWords} />
                {isGenerating && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {currentAgentName ? `Running: ${currentAgentName}` : 'Starting…'}
                    </div>
                )}
                {!isGenerating && displayOutput && (
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={handleCopy}>
                        <ClipboardCopy className="h-3 w-3" />
                        Copy
                    </Button>
                )}
            </div>
        );

        if (isExpanded) {
            // ── Wide: side-by-side panes ────────────────────────────────
            return (
                <div className="flex flex-col gap-3 pt-2">
                    {controlsBar}
                    {statusBar}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Original</span>
                            <div
                                ref={originalRef}
                                className="rounded-md border bg-muted/20 p-3 text-sm whitespace-pre-wrap overflow-y-auto leading-relaxed"
                                style={{ height: 'calc(100vh - 300px)' }}
                            >
                                {originalText || <span className="text-muted-foreground italic">No text captured</span>}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Edited</span>
                            <div
                                ref={outputRef}
                                className="rounded-md border bg-background p-3 text-sm whitespace-pre-wrap overflow-y-auto leading-relaxed"
                                style={{ height: 'calc(100vh - 300px)' }}
                            >
                                {displayOutput || <span className="text-muted-foreground italic">Generating…</span>}
                                {isGenerating && <span className="inline-block w-1 h-4 bg-primary ml-0.5 animate-pulse" />}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // ── Narrow: edited output only ──────────────────────────────────
        return (
            <div className="flex flex-col gap-3 pt-2">
                {controlsBar}
                {statusBar}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Edited</span>
                    </div>
                    <div
                        ref={outputRef}
                        className="rounded-md border bg-background p-3 text-sm whitespace-pre-wrap overflow-y-auto leading-relaxed"
                        style={{ height: 'calc(100vh - 320px)' }}
                    >
                        {displayOutput || <span className="text-muted-foreground italic">Generating edited chapter…</span>}
                        {isGenerating && <span className="inline-block w-1 h-4 bg-primary ml-0.5 animate-pulse" />}
                    </div>
                </div>
                {!isGenerating && finalOutput && (
                    <Alert className="py-2">
                        <AlertDescription className="text-xs">
                            Click <Maximize2 className="inline h-3 w-3" /> to compare side-by-side, or Copy and paste into the editor.
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        );
    }

    // ── Initial state: standard single-column controls ──────────────────────
    return (
        <div className="flex flex-col gap-4 pt-2">
            {/* Pipeline selector */}
            <div className="space-y-1">
                <Label htmlFor="chapter-edit-pipeline">Pipeline</Label>
                <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId} disabled={isGenerating}>
                    <SelectTrigger id="chapter-edit-pipeline">
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

            {/* Optional editing instructions */}
            <div className="space-y-1">
                <Label htmlFor="chapter-edit-instructions">Edit Instructions (optional)</Label>
                <Textarea
                    id="chapter-edit-instructions"
                    placeholder="e.g. Tighten the pacing in the middle section. Make the dialogue punchier. Fix the transition into the final scene…"
                    rows={3}
                    value={editInstructions}
                    onChange={(e) => setEditInstructions(e.target.value)}
                    disabled={isGenerating}
                    className="resize-y text-sm"
                />
                <p className="text-xs text-muted-foreground">
                    Leave blank for a general editorial pass.
                </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
                <Button
                    onClick={handleRun}
                    disabled={!selectedPipelineId || !currentChapterId}
                    className="flex-1"
                >
                    <FileEdit className="h-4 w-4 mr-2" />
                    Edit Chapter
                </Button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Public export: the outer tabbed panel
// ---------------------------------------------------------------------------
export function AIEditorialPanel({
    isExpanded = false,
    onExpandChange,
}: {
    isExpanded?: boolean;
    onExpandChange?: (v: boolean) => void;
}) {
    const { currentChapterId } = useStoryContext();
    const ssKey = currentChapterId ? `editorial-state-${currentChapterId}` : null;

    const [activeTab, setActiveTab] = useState(() => {
        if (!ssKey) return 'review';
        return sessionStorage.getItem(ssKey + '-tab') || 'review';
    });
    const [editInstructions, setEditInstructions] = useState(() => {
        if (!ssKey) return '';
        return sessionStorage.getItem(ssKey + '-instructions') || '';
    });

    // Reset state when chapter changes
    useEffect(() => {
        const key = currentChapterId ? `editorial-state-${currentChapterId}` : null;
        setActiveTab(key ? (sessionStorage.getItem(key + '-tab') || 'review') : 'review');
        setEditInstructions(key ? (sessionStorage.getItem(key + '-instructions') || '') : '');
    }, [currentChapterId]);

    // Persist tab + instructions to sessionStorage
    useEffect(() => {
        if (!ssKey) return;
        sessionStorage.setItem(ssKey + '-tab', activeTab);
    }, [ssKey, activeTab]);

    useEffect(() => {
        if (!ssKey) return;
        sessionStorage.setItem(ssKey + '-instructions', editInstructions);
    }, [ssKey, editInstructions]);

    const handleSendToEdit = (reviewText: string) => {
        setEditInstructions(reviewText);
        setActiveTab('edit');
    };

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full">
                <TabsTrigger value="review" className="flex-1 gap-1.5">
                    <FileSearch className="h-3.5 w-3.5" />
                    Review
                </TabsTrigger>
                <TabsTrigger value="edit" className="flex-1 gap-1.5">
                    <FileEdit className="h-3.5 w-3.5" />
                    Edit
                </TabsTrigger>
            </TabsList>

            <TabsContent value="review" className="mt-3">
                <ChapterReviewPanel onSendToEdit={handleSendToEdit} chapterId={currentChapterId} />
            </TabsContent>

            <TabsContent value="edit" className="mt-3">
                <ChapterEditContent
                    editInstructions={editInstructions}
                    setEditInstructions={setEditInstructions}
                    isExpanded={isExpanded}
                    onExpandChange={onExpandChange ?? (() => {})}
                    chapterId={currentChapterId}
                />
            </TabsContent>
        </Tabs>
    );
}
