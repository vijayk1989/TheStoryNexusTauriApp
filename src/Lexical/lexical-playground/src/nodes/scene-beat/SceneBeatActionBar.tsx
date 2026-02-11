/**
 * SceneBeat action bar — agentic/multi-model toggles, prompt select,
 * preview/edit buttons, generate button, accept/reject buttons.
 */
import { useState, useMemo } from 'react';
import { Bot, Sparkles, Stethoscope, Loader2, Pencil, Square, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { PromptSelectMenu } from '@/components/ui/prompt-select-menu';
import { Progress } from '@/components/ui/progress';
import { useSBStore } from '@/features/scenebeats/stores/useSceneBeatInstanceStore';
import { SaveDraftDialog } from '@/features/drafts/components/SaveDraftDialog';
import type { Prompt, AllowedModel } from '@/types/story';

interface SceneBeatActionBarProps {
    // Prompt store data
    prompts: Prompt[];
    promptsLoading: boolean;
    promptsError: string | null;

    // External hooks' reactive state
    isAgenticGenerating: boolean;
    currentAgentName: string;
    currentStep: number;
    isParallelGenerating: boolean;

    // Handlers from generation hook
    onPreview: () => Promise<void>;
    onGenerate: () => Promise<void>;
    onAgenticGenerate: () => Promise<void>;
    onAbortAgentic: () => void;
    onParallelGenerate: () => Promise<void>;
    onAccept: () => Promise<void>;
    onReject: () => void;
}

export function SceneBeatActionBar({
    prompts,
    promptsLoading,
    promptsError,
    isAgenticGenerating,
    currentAgentName,
    currentStep,
    isParallelGenerating,
    onPreview,
    onGenerate,
    onAgenticGenerate,
    onAbortAgentic,
    onParallelGenerate,
    onAccept,
    onReject,
}: SceneBeatActionBarProps) {
    const streaming = useSBStore((s) => s.streaming);
    const streamComplete = useSBStore((s) => s.streamComplete);
    const selectedPrompt = useSBStore((s) => s.selectedPrompt);
    const selectedModel = useSBStore((s) => s.selectedModel);
    const agenticMode = useSBStore((s) => s.agenticMode);
    const selectedPipeline = useSBStore((s) => s.selectedPipeline);
    const availablePipelines = useSBStore((s) => s.availablePipelines);
    const useMultiModel = useSBStore((s) => s.useMultiModel);
    const showAgenticProgress = useSBStore((s) => s.showAgenticProgress);
    const set = useSBStore((s) => s.set);
    const handlePromptSelect = useSBStore((s) => s.handlePromptSelect);
    const command = useSBStore((s) => s.command);
    const streamedText = useSBStore((s) => s.streamedText);
    const localMatchedEntries = useSBStore((s) => s.localMatchedEntries);
    const selectedItems = useSBStore((s) => s.selectedItems);

    const matchedEntryNames = useMemo(() => {
        const names: string[] = [];
        if (localMatchedEntries) {
            localMatchedEntries.forEach((e) => names.push(e.name));
        }
        if (selectedItems) {
            selectedItems.forEach((e) => names.push(e.name));
        }
        return [...new Set(names)];
    }, [localMatchedEntries, selectedItems]);

    const [saveDraftOpen, setSaveDraftOpen] = useState(false);

    return (
        <div className="p-2 md:p-3 border-t flex flex-col gap-2">
            {/* Mode toggles row */}
            <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm">
                <div className="flex items-center gap-2">
                    <Bot className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                    <span className="hidden sm:inline text-muted-foreground">Agentic Mode</span>
                    <span className="sm:hidden text-muted-foreground">Agent</span>
                    <Switch
                        checked={agenticMode}
                        onCheckedChange={(v) => set({ agenticMode: v as boolean })}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                    <span className="hidden sm:inline text-muted-foreground">Multi-Model</span>
                    <span className="sm:hidden text-muted-foreground">Multi</span>
                    <Switch
                        checked={useMultiModel}
                        onCheckedChange={(v) => set({ useMultiModel: v as boolean })}
                    />
                </div>
            </div>

            {/* Main actions row */}
            <div className="flex flex-wrap items-center gap-2">
                {agenticMode ? (
                    <>
                        {/* Pipeline selector */}
                        <select
                            className="border rounded px-2 py-1 text-xs md:text-sm bg-background"
                            value={selectedPipeline?.name || ''}
                            onChange={(e) => {
                                const pipeline = availablePipelines.find((p) => p.name === e.target.value);
                                set({ selectedPipeline: pipeline || null });
                            }}
                        >
                            <option value="">Select Pipeline</option>
                            {availablePipelines.map((p) => (
                                <option key={p.name} value={p.name}>{p.name}</option>
                            ))}
                        </select>

                        {/* Generate with Pipeline */}
                        <Button
                            onClick={onAgenticGenerate}
                            disabled={isAgenticGenerating || !selectedPipeline || !selectedPrompt}
                            size="sm"
                            className="text-xs md:text-sm"
                        >
                            {isAgenticGenerating ? (
                                <>
                                    <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-1 animate-spin" />
                                    <span className="hidden sm:inline truncate max-w-[100px]">
                                        {currentAgentName || 'Running...'}
                                    </span>
                                    <span className="sm:hidden">Running</span>
                                </>
                            ) : (
                                <>
                                    <Bot className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                                    <span className="hidden sm:inline">Generate with Pipeline</span>
                                    <span className="sm:hidden">Pipeline</span>
                                </>
                            )}
                        </Button>

                        {isAgenticGenerating && (
                            <Button variant="destructive" size="sm" onClick={onAbortAgentic} className="text-xs md:text-sm">
                                <Square className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                                <span className="hidden sm:inline">Abort</span>
                            </Button>
                        )}

                        {/* Show Diagnostics button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => set({ showDiagnostics: true })}
                            className="text-xs md:text-sm"
                        >
                            <Stethoscope className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                            <span className="hidden sm:inline">Diagnostics</span>
                        </Button>
                    </>
                ) : (
                    <>
                        <PromptSelectMenu
                            isLoading={promptsLoading}
                            error={promptsError}
                            prompts={prompts}
                            promptType="scene_beat"
                            selectedPrompt={selectedPrompt}
                            selectedModel={selectedModel}
                            onSelect={handlePromptSelect}
                        />
                        {selectedPrompt && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onPreview}
                                    className="text-xs md:text-sm"
                                >
                                    <span className="hidden sm:inline">Preview Prompt</span>
                                    <span className="sm:hidden">Preview</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => set({ showEditPromptDialog: true })}
                                    className="text-xs md:text-sm"
                                    title="Edit this prompt"
                                >
                                    <Pencil className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                                    <span className="hidden sm:inline">Edit Prompt</span>
                                    <span className="sm:hidden">Edit</span>
                                </Button>
                            </>
                        )}
                        <Button
                            onClick={
                                useMultiModel && selectedPrompt?.multiModelEnabled
                                    ? onParallelGenerate
                                    : onGenerate
                            }
                            disabled={
                                streaming ||
                                isParallelGenerating ||
                                !selectedPrompt ||
                                (!useMultiModel && !selectedModel)
                            }
                            size="sm"
                            className="text-xs md:text-sm"
                        >
                            {streaming ? (
                                <>
                                    <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-1 animate-spin" />
                                    <span className="hidden sm:inline">Generating…</span>
                                    <span className="sm:hidden">Gen…</span>
                                </>
                            ) : isParallelGenerating ? (
                                <>
                                    <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-1 animate-spin" />
                                    <span className="hidden sm:inline">Comparing…</span>
                                    <span className="sm:hidden">Comp…</span>
                                </>
                            ) : useMultiModel && selectedPrompt?.multiModelEnabled ? (
                                <>
                                    <Sparkles className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                                    <span className="hidden sm:inline">Compare Models</span>
                                    <span className="sm:hidden">Compare</span>
                                </>
                            ) : (
                                <>
                                    <span className="hidden sm:inline">Generate Prose</span>
                                    <span className="sm:hidden">Generate</span>
                                </>
                            )}
                        </Button>
                    </>
                )}
            </div>

            {/* Agentic progress */}
            {showAgenticProgress && isAgenticGenerating && (
                <div className="mt-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Step {currentStep + 1}: {currentAgentName || 'Initializing...'}</span>
                    </div>
                    <Progress value={((currentStep + 1) / (selectedPipeline?.steps?.length || 1)) * 100} className="h-1" />
                </div>
            )}

            {/* Accept / Reject / Save Draft buttons */}
            {streamComplete && (
                <div className="flex items-center gap-2 mt-2">
                    <Button size="sm" onClick={onAccept} className="text-xs md:text-sm">
                        Accept
                    </Button>
                    <Button variant="outline" size="sm" onClick={onReject} className="text-xs md:text-sm">
                        Reject
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-xs md:text-sm ml-auto"
                        onClick={() => setSaveDraftOpen(true)}
                    >
                        <Save className="h-3 w-3 mr-1" />
                        Save Draft
                    </Button>
                </div>
            )}

            {/* Save Draft dialog */}
            <SaveDraftDialog
                open={saveDraftOpen}
                onOpenChange={setSaveDraftOpen}
                content={streamedText}
                sceneBeatCommand={command}
                modelName={selectedModel?.name}
                modelProvider={selectedModel?.provider}
                promptId={selectedPrompt?.id}
                promptName={selectedPrompt?.name}
                lorebookContext={matchedEntryNames}
            />
        </div>
    );
}
