import { useState, useEffect, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Square, Wand2 } from 'lucide-react';
import { toast } from 'react-toastify';
import type { AgentPreset, LorebookEntry } from '@/types/story';
import { useAgentsStore } from '@/features/agents/stores/useAgentsStore';
import { useLorebookWorkshop } from '@/features/lorebook/hooks/useLorebookWorkshop';

type LorebookCategory = LorebookEntry['category'];

const CATEGORIES: LorebookCategory[] = [
    'character',
    'location',
    'item',
    'event',
    'note',
    'synopsis',
    'starting scenario',
    'timeline',
];

interface LorebookWorkshopDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The lore book to save new entries into. */
    lorebookId: string;
    /** When set, opens in refinement mode for this entry */
    targetEntry?: LorebookEntry;
    /** Pre-selects a category in conception mode */
    initialCategory?: LorebookCategory;
}

export function LorebookWorkshopDialog({
    open,
    onOpenChange,
    lorebookId,
    targetEntry,
    initialCategory,
}: LorebookWorkshopDialogProps) {
    const mode = targetEntry ? 'refine' : 'create';
    const { agentPresets, getAgentPresetsByRole, loadAgentPresets } = useAgentsStore();

    // Agent selection
    const writerPresets = getAgentPresetsByRole('lore_writer');
    const refinerPresets = getAgentPresetsByRole('lore_refiner');
    const rolePresets = mode === 'refine' ? refinerPresets : writerPresets;
    const [selectedPresetId, setSelectedPresetId] = useState<string>('');

    // Conception inputs
    const [seedText, setSeedText] = useState('');
    const [category, setCategory] = useState<LorebookCategory>(initialCategory ?? 'character');

    // Follow-up
    const [followUpText, setFollowUpText] = useState('');

    const workshop = useLorebookWorkshop();
    const outputRef = useRef<HTMLDivElement>(null);

    // Derive the active preset
    const activePreset: AgentPreset | undefined =
        agentPresets.find(p => p.id === selectedPresetId) ?? rolePresets[0];

    // Auto-scroll output
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [workshop.streamingContent, workshop.parsedPreview]);

    // Reset on open and ensure agent presets are seeded
    useEffect(() => {
        if (open) {
            loadAgentPresets();
            workshop.reset();
            setSeedText('');
            setFollowUpText('');
            setCategory(initialCategory ?? 'character');
            setSelectedPresetId(rolePresets[0]?.id ?? '');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Keep category in sync with initialCategory prop changes
    useEffect(() => {
        if (initialCategory) setCategory(initialCategory);
    }, [initialCategory]);

    // Keep preset selector in sync when presets load
    useEffect(() => {
        if (!selectedPresetId && rolePresets.length > 0) {
            setSelectedPresetId(rolePresets[0].id);
        }
    }, [rolePresets, selectedPresetId]);

    const handleGenerate = async () => {
        if (!activePreset) {
            toast.error('No agent preset available. Please check your Agents Manager settings.');
            return;
        }
        if (mode === 'create') {
            if (!seedText.trim()) {
                toast.error('Please enter a seed concept.');
                return;
            }
            await workshop.startConception(seedText.trim(), category, activePreset);
        } else if (targetEntry) {
            await workshop.startRefinement(targetEntry, activePreset);
        }
    };

    const handleFollowUp = async () => {
        if (!followUpText.trim() || !activePreset) return;
        await workshop.sendFollowUp(followUpText.trim());
        setFollowUpText('');
    };

    const handleSave = async (asNew: boolean) => {
        if (!workshop.parsedPreview) return;
        try {
            await workshop.applyToEntry(lorebookId, asNew ? undefined : targetEntry?.id);
            toast.success(asNew ? 'Entry saved to lorebook.' : 'Entry updated in lorebook.');
            onOpenChange(false);
        } catch {
            toast.error('Failed to save entry.');
        }
    };

    const hasGenerated = workshop.conversationHistory.some(m => m.role === 'assistant');
    const turnCount = workshop.conversationHistory.filter(m => m.role === 'assistant').length;
    const [showRaw, setShowRaw] = useState(false);

    // Display text: streaming in-flight, or last assistant message when done
    const displayText = workshop.isGenerating
        ? workshop.streamingContent
        : (workshop.conversationHistory.filter(m => m.role === 'assistant').at(-1)?.content ?? '');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wand2 className="h-5 w-5" />
                        {mode === 'create' ? 'Lorebook Workshop — Create Entry' : `Lorebook Workshop — Refine: ${targetEntry?.name}`}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex gap-4 flex-1 min-h-0">
                    {/* Left column — controls */}
                    <div className="w-72 shrink-0 flex flex-col gap-3 overflow-y-auto">
                        {mode === 'create' && (
                            <>
                                <div className="space-y-1">
                                    <Label htmlFor="workshop-category">Category</Label>
                                    <Select
                                        value={category}
                                        onValueChange={(v) => setCategory(v as LorebookCategory)}
                                        disabled={workshop.isGenerating}
                                    >
                                        <SelectTrigger id="workshop-category">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map(cat => (
                                                <SelectItem key={cat} value={cat}>
                                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="workshop-seed">Seed Concept</Label>
                                    <Textarea
                                        id="workshop-seed"
                                        placeholder="Describe the concept in a few words or sentences…"
                                        value={seedText}
                                        onChange={e => setSeedText(e.target.value)}
                                        disabled={workshop.isGenerating}
                                        rows={4}
                                    />
                                </div>
                            </>
                        )}

                        {mode === 'refine' && targetEntry && (
                            <div className="space-y-1">
                                <Label>Entry</Label>
                                <div className="rounded-md border p-2 text-sm">
                                    <div className="font-medium">{targetEntry.name}</div>
                                    <Badge variant="outline" className="mt-1 text-xs capitalize">
                                        {targetEntry.category}
                                    </Badge>
                                </div>
                            </div>
                        )}

                        {/* Agent selector */}
                        {rolePresets.length > 0 && (
                            <div className="space-y-1">
                                <Label htmlFor="workshop-preset">Agent</Label>
                                <Select
                                    value={selectedPresetId}
                                    onValueChange={setSelectedPresetId}
                                    disabled={workshop.isGenerating}
                                >
                                    <SelectTrigger id="workshop-preset">
                                        <SelectValue placeholder="Select agent…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {rolePresets.map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Generate / Stop */}
                        {!hasGenerated && (
                            <Button
                                onClick={handleGenerate}
                                disabled={workshop.isGenerating || !activePreset}
                                className="w-full"
                            >
                                {workshop.isGenerating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Generating…
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="h-4 w-4 mr-2" />
                                        Generate
                                    </>
                                )}
                            </Button>
                        )}

                        {workshop.isGenerating && (
                            <Button variant="outline" onClick={workshop.abort} className="w-full">
                                <Square className="h-4 w-4 mr-2" />
                                Stop
                            </Button>
                        )}

                        {/* Follow-up section */}
                        {hasGenerated && !workshop.isGenerating && (
                            <div className="space-y-2 border-t pt-3">
                                <Label htmlFor="workshop-followup" className="flex items-center gap-2">
                                    Follow-up
                                    {turnCount > 0 && (
                                        <span className="text-xs text-muted-foreground">({turnCount} {turnCount === 1 ? 'turn' : 'turns'})</span>
                                    )}
                                </Label>
                                <Textarea
                                    id="workshop-followup"
                                    placeholder="Give refinement instructions…"
                                    value={followUpText}
                                    onChange={e => setFollowUpText(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                            e.preventDefault();
                                            handleFollowUp();
                                        }
                                    }}
                                    rows={3}
                                />
                                <Button
                                    onClick={handleFollowUp}
                                    disabled={!followUpText.trim()}
                                    size="sm"
                                    className="w-full"
                                >
                                    Refine (Ctrl+Enter)
                                </Button>
                            </div>
                        )}

                        {/* Error */}
                        {workshop.error && (
                            <p className="text-sm text-destructive border border-destructive/30 rounded-md p-2">
                                {workshop.error}
                            </p>
                        )}
                    </div>

                    {/* Right column — output */}
                    <div className="flex-1 flex flex-col gap-3 min-h-0">
                        {/* Structured preview */}
                        {workshop.parsedPreview && !workshop.isGenerating && (
                            <div className="border rounded-md p-3 space-y-2 shrink-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-base">{workshop.parsedPreview.name}</span>
                                    {workshop.parsedPreview.category && (
                                        <Badge variant="secondary" className="capitalize">
                                            {workshop.parsedPreview.category}
                                        </Badge>
                                    )}
                                    {workshop.parsedPreview.metadata?.importance && (
                                        <Badge variant="outline" className="capitalize text-xs">
                                            {workshop.parsedPreview.metadata.importance}
                                        </Badge>
                                    )}
                                    {workshop.parsedPreview.metadata?.type && (
                                        <Badge variant="outline" className="text-xs">
                                            {workshop.parsedPreview.metadata.type}
                                        </Badge>
                                    )}
                                </div>
                                {workshop.parsedPreview.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-4">
                                        {workshop.parsedPreview.description}
                                    </p>
                                )}
                                {workshop.parsedPreview.tags && workshop.parsedPreview.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {workshop.parsedPreview.tags.slice(0, 8).map(tag => (
                                            <Badge key={tag} variant="outline" className="text-xs">
                                                {tag}
                                            </Badge>
                                        ))}
                                        {workshop.parsedPreview.tags.length > 8 && (
                                            <span className="text-xs text-muted-foreground self-center">
                                                +{workshop.parsedPreview.tags.length - 8} more
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Raw streaming / output area */}
                        <div className="flex items-center justify-between shrink-0">
                            <span className="text-xs text-muted-foreground">Output</span>
                            {workshop.rawResponse && !workshop.isGenerating && (
                                <button
                                    onClick={() => setShowRaw(r => !r)}
                                    className="text-xs text-muted-foreground underline"
                                >
                                    {showRaw ? 'Show stripped' : 'Show raw'}
                                </button>
                            )}
                        </div>
                        <div
                            ref={outputRef}
                            className="flex-1 overflow-y-auto rounded-md border bg-muted/30 p-3 font-mono text-xs whitespace-pre-wrap min-h-32"
                        >
                            {workshop.isGenerating && !displayText && (
                                <span className="text-muted-foreground animate-pulse">Generating…</span>
                            )}
                            {showRaw ? workshop.rawResponse : displayText}
                            {workshop.isGenerating && (
                                <span className="inline-block w-2 h-4 bg-foreground ml-0.5 animate-pulse" />
                            )}
                            {!workshop.isGenerating && !displayText && !workshop.rawResponse && !workshop.error && (
                                <span className="text-muted-foreground">
                                    {mode === 'create'
                                        ? 'Enter a concept and click Generate to create a lorebook entry.'
                                        : 'Click Generate to start refining this entry.'}
                                </span>
                            )}
                        </div>

                        {/* Save buttons */}
                        {workshop.parsedPreview && !workshop.isGenerating && (
                            <div className="flex gap-2 justify-end shrink-0">
                                <Button variant="outline" onClick={() => onOpenChange(false)}>
                                    Discard
                                </Button>
                                {targetEntry && (
                                    <Button variant="secondary" onClick={() => handleSave(false)}>
                                        Apply to Existing Entry
                                    </Button>
                                )}
                                <Button onClick={() => handleSave(true)}>
                                    Save as New Entry
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
