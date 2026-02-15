import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Plus, Trash2, GripVertical, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { useAgentsStore } from '../stores/useAgentsStore';
import { useStoryContext } from '@/features/stories/context/StoryContext';
import type { PipelinePreset, PipelineStep, AgentPreset, AgentRole } from '@/types/story';
import { toast } from 'react-toastify';

interface PipelinePresetFormProps {
    pipeline?: PipelinePreset;
    onSave: () => void;
    onCancel: () => void;
}

const ROLE_LABELS: Record<AgentRole, string> = {
    summarizer: 'Summarizer',
    prose_writer: 'Prose Writer',
    lore_judge: 'Lore Judge',
    continuity_checker: 'Continuity Checker',
    style_editor: 'Style Editor',
    dialogue_specialist: 'Dialogue Specialist',
    expander: 'Expander',
    outline_generator: 'Outline Generator',
    style_extractor: 'Style Extractor',
    scenebeat_generator: 'Scene Beat Generator',
    refusal_checker: 'Refusal Checker',
    custom: 'Custom',
};

// Pre-built condition options
const CONDITION_PRESETS = [
    { value: 'none', label: 'None (always run)', actualValue: '' },
    { value: 'wordCount > 3000', label: 'Word count > 3000', actualValue: 'wordCount > 3000' },
    { value: 'wordCount > 5000', label: 'Word count > 5000', actualValue: 'wordCount > 5000' },
    { value: 'wordCount > 10000', label: 'Word count > 10000', actualValue: 'wordCount > 10000' },
    { value: 'anyJudgeFoundIssues', label: '⚠️ Any Judge Found Issues', actualValue: 'anyJudgeFoundIssues' },
    { value: 'outputContainsAnyKeyword', label: '🔍 Output Contains Any Keyword (customizable)', actualValue: 'outputContainsAnyKeyword' },
    { value: 'previousOutputContains:ISSUE', label: 'Previous output contains "ISSUE"', actualValue: 'previousOutputContains:ISSUE' },
    { value: 'previousOutputNotContains:CONSISTENT', label: 'Previous output not "CONSISTENT"', actualValue: 'previousOutputNotContains:CONSISTENT' },
    { value: 'roleOutputContains:lore_judge:ISSUE', label: 'Lore Judge found issues', actualValue: 'roleOutputContains:lore_judge:ISSUE' },
    { value: 'roleOutputContains:continuity_checker:ISSUE', label: 'Continuity Checker found issues', actualValue: 'roleOutputContains:continuity_checker:ISSUE' },
    { value: 'hasLorebookEntries', label: 'Has lorebook entries', actualValue: 'hasLorebookEntries' },
    { value: 'hasPreviousOutput', label: 'Has previous step output', actualValue: 'hasPreviousOutput' },
    { value: 'custom', label: 'Custom condition...', actualValue: '' },
];

interface EditablePipelineStep extends PipelineStep {
    tempId: string; // For React keys while editing
    conditionType?: string; // Track if using preset or custom
}

export function PipelinePresetForm({ pipeline, onSave, onCancel }: PipelinePresetFormProps) {
    const { currentStoryId } = useStoryContext();
    const { createPipelinePreset, updatePipelinePreset, agentPresets } = useAgentsStore();

    const [name, setName] = useState(pipeline?.name || '');
    const [description, setDescription] = useState(pipeline?.description || '');
    const [steps, setSteps] = useState<EditablePipelineStep[]>(() => {
        if (pipeline?.steps) {
            return pipeline.steps.map((s, i) => {
                // Determine if the condition matches a preset
                const matchingPreset = CONDITION_PRESETS.find(p => p.actualValue === s.condition);
                const conditionType = matchingPreset ? matchingPreset.value : 'custom';
                return {
                    ...s,
                    tempId: crypto.randomUUID(),
                    conditionType: s.condition ? conditionType : 'none',
                };
            });
        }
        return [];
    });
    const [isLoading, setIsLoading] = useState(false);

    const addStep = () => {
        const newStep: EditablePipelineStep = {
            agentPresetId: '',
            order: steps.length,
            condition: undefined,
            streamOutput: false,
            isRevision: false,
            tempId: crypto.randomUUID(),
            conditionType: 'none',
        };
        setSteps([...steps, newStep]);
    };

    const removeStep = (tempId: string) => {
        setSteps(steps.filter((s) => s.tempId !== tempId).map((s, i) => ({ ...s, order: i })));
    };

    const updateStep = (tempId: string, updates: Partial<EditablePipelineStep>) => {
        setSteps(
            steps.map((s) => (s.tempId === tempId ? { ...s, ...updates } : s))
        );
    };

    const moveStep = (tempId: string, direction: 'up' | 'down') => {
        const index = steps.findIndex((s) => s.tempId === tempId);
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === steps.length - 1)
        ) {
            return;
        }

        const newSteps = [...steps];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
        
        // Update order values
        setSteps(newSteps.map((s, i) => ({ ...s, order: i })));
    };

    const getAgent = (agentId: string): AgentPreset | undefined => {
        return agentPresets.find((a) => a.id === agentId);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error('Please enter a pipeline name');
            return;
        }

        if (steps.length === 0) {
            toast.error('Please add at least one step');
            return;
        }

        if (steps.some((s) => !s.agentPresetId)) {
            toast.error('Please select an agent for each step');
            return;
        }

        setIsLoading(true);

        try {
            const pipelineSteps: PipelineStep[] = steps.map((s, i) => ({
                agentPresetId: s.agentPresetId,
                order: i,
                condition: s.condition || undefined,
                streamOutput: s.streamOutput,
                isRevision: s.isRevision,
                maxIterations: s.isRevision ? (s.maxIterations || 1) : undefined,
                retryFromStep: s.isRevision ? s.retryFromStep : undefined,
                pushPrompt: (s.isRevision && s.pushPrompt) ? s.pushPrompt : undefined,
                validationKeywords: (s.condition === 'outputContainsAnyKeyword' && s.validationKeywords?.length)
                    ? s.validationKeywords : undefined,
            }));

            const presetData = {
                name: name.trim(),
                description: description.trim() || undefined,
                steps: pipelineSteps,
                storyId: currentStoryId || null,
            };

            if (pipeline?.id) {
                await updatePipelinePreset(pipeline.id, presetData);
                toast.success('Pipeline updated successfully');
            } else {
                await createPipelinePreset(presetData);
                toast.success('Pipeline created successfully');
            }

            onSave();
        } catch (error) {
            toast.error((error as Error).message || 'Failed to save pipeline');
        } finally {
            setIsLoading(false);
        }
    };

    // Group agents by role for the dropdown
    const agentsByRole = agentPresets.reduce((acc, agent) => {
        if (!acc[agent.role]) {
            acc[agent.role] = [];
        }
        acc[agent.role].push(agent);
        return acc;
    }, {} as Record<AgentRole, AgentPreset[]>);

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
            <div className="flex items-center gap-4 mb-6">
                <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-xl font-semibold">
                        {pipeline ? 'Edit Pipeline' : 'New Pipeline'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Chain multiple agents together for complex generation workflows
                    </p>
                </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
                <Label htmlFor="name">Pipeline Name</Label>
                <Input
                    id="name"
                    placeholder="e.g., Scene Beat with Lore Check"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </div>

            {/* Description */}
            <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                    id="description"
                    placeholder="Brief description of what this pipeline does"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>

            {/* Steps */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label>Pipeline Steps</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addStep}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Step
                    </Button>
                </div>

                {steps.length === 0 ? (
                    <div className="border rounded-lg p-8 text-center">
                        <p className="text-sm text-muted-foreground mb-4">
                            No steps added yet. Add agents to build your pipeline.
                        </p>
                        <Button type="button" variant="outline" onClick={addStep}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add First Step
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {steps.map((step, index) => {
                            const agent = getAgent(step.agentPresetId);
                            return (
                                <Card key={step.tempId}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="flex flex-col items-center gap-1 pt-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => moveStep(step.tempId, 'up')}
                                                    disabled={index === 0}
                                                >
                                                    <ArrowUp className="h-3 w-3" />
                                                </Button>
                                                <span className="text-xs text-muted-foreground font-medium">
                                                    {index + 1}
                                                </span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => moveStep(step.tempId, 'down')}
                                                    disabled={index === steps.length - 1}
                                                >
                                                    <ArrowDown className="h-3 w-3" />
                                                </Button>
                                            </div>

                                            <div className="flex-1 space-y-3">
                                                {/* Agent Selection */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Agent</Label>
                                                    <Select
                                                        value={step.agentPresetId}
                                                        onValueChange={(v) =>
                                                            updateStep(step.tempId, { agentPresetId: v })
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select an agent" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {Object.entries(agentsByRole).map(([role, agents]) => (
                                                                <div key={role}>
                                                                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                                                                        {ROLE_LABELS[role as AgentRole]}
                                                                    </div>
                                                                    {agents.map((a) => (
                                                                        <SelectItem key={a.id} value={a.id}>
                                                                            <div className="flex items-center gap-2">
                                                                                <span>{a.name}</span>
                                                                                <span className="text-xs text-muted-foreground">
                                                                                    ({a.model.name})
                                                                                </span>
                                                                            </div>
                                                                        </SelectItem>
                                                                    ))}
                                                                </div>
                                                            ))}
                                                            {agentPresets.length === 0 && (
                                                                <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                                                                    No agents available. Create an agent first.
                                                                </div>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Condition */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Condition (optional)</Label>
                                                    <Select
                                                        value={step.conditionType || 'none'}
                                                        onValueChange={(v) => {
                                                            const preset = CONDITION_PRESETS.find(p => p.value === v);
                                                            if (v === 'custom') {
                                                                updateStep(step.tempId, { 
                                                                    conditionType: 'custom',
                                                                    condition: step.condition || '' 
                                                                });
                                                            } else if (v === 'none') {
                                                                updateStep(step.tempId, { 
                                                                    conditionType: 'none',
                                                                    condition: undefined 
                                                                });
                                                            } else {
                                                                updateStep(step.tempId, { 
                                                                    conditionType: v,
                                                                    condition: preset?.actualValue || v 
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-8 text-sm">
                                                            <SelectValue placeholder="None (always run)" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {CONDITION_PRESETS.map((preset) => (
                                                                <SelectItem key={preset.value} value={preset.value}>
                                                                    {preset.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    
                                                    {/* Custom condition input */}
                                                    {step.conditionType === 'custom' && (
                                                        <Input
                                                            placeholder="e.g., roleOutputContains:lore_judge:ERROR"
                                                            value={step.condition || ''}
                                                            onChange={(e) =>
                                                                updateStep(step.tempId, { condition: e.target.value })
                                                            }
                                                            className="h-8 text-sm mt-2"
                                                        />
                                                    )}
                                                </div>

                                                {/* Is Revision Step */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <RefreshCw className="h-3 w-3 text-muted-foreground" />
                                                        <Label className="text-xs">Revision step (uses feedback from judges)</Label>
                                                    </div>
                                                    <Switch
                                                        checked={step.isRevision || false}
                                                        onCheckedChange={(checked) =>
                                                            updateStep(step.tempId, { isRevision: checked })
                                                        }
                                                    />
                                                </div>

                                                {/* Revision Settings (shown when revision is on) */}
                                                {step.isRevision && (
                                                    <div className="space-y-3 pl-4 border-l-2 border-primary/30">
                                                        {/* Max Iterations */}
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">Max Iterations (retry attempts)</Label>
                                                            <Input
                                                                type="number"
                                                                min={1}
                                                                max={5}
                                                                value={step.maxIterations ?? 1}
                                                                onChange={(e) =>
                                                                    updateStep(step.tempId, { maxIterations: parseInt(e.target.value) || 1 })
                                                                }
                                                                className="h-8 text-sm w-24"
                                                            />
                                                            <p className="text-xs text-muted-foreground">
                                                                How many times the loop can retry. 1 = single follow-up.
                                                            </p>
                                                        </div>

                                                        {/* Retry From Step */}
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">Retry From Step (jump back to)</Label>
                                                            <Select
                                                                value={step.retryFromStep?.toString() ?? ''}
                                                                onValueChange={(v) =>
                                                                    updateStep(step.tempId, { retryFromStep: parseInt(v) })
                                                                }
                                                            >
                                                                <SelectTrigger className="h-8 text-sm">
                                                                    <SelectValue placeholder="Select step to retry from" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {steps.map((s, idx) => {
                                                                        if (idx >= index) return null;
                                                                        const stepAgent = agentPresets.find(a => a.id === s.agentPresetId);
                                                                        return (
                                                                            <SelectItem key={idx} value={idx.toString()}>
                                                                                Step {idx + 1}{stepAgent ? `: ${stepAgent.name}` : ''}
                                                                            </SelectItem>
                                                                        );
                                                                    })}
                                                                </SelectContent>
                                                            </Select>
                                                            <p className="text-xs text-muted-foreground">
                                                                Which earlier step to jump back to when retrying.
                                                            </p>
                                                        </div>

                                                        {/* Push Prompt */}
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">Push Prompt (custom follow-up message)</Label>
                                                            <textarea
                                                                value={step.pushPrompt ?? ''}
                                                                onChange={(e) =>
                                                                    updateStep(step.tempId, { pushPrompt: e.target.value })
                                                                }
                                                                placeholder={`Use internal reasoning: review your previous response...\n\nPREVIOUS OUTPUT:\n{{PREVIOUS_OUTPUT}}\n\nFEEDBACK:\n{{FEEDBACK}}\n\nRewrite addressing all issues:`}
                                                                className="w-full min-h-[100px] resize-y rounded-md border bg-background px-3 py-2 text-sm"
                                                            />
                                                            <p className="text-xs text-muted-foreground">
                                                                Use <code className="text-primary">{'{{PREVIOUS_OUTPUT}}'}</code> and <code className="text-primary">{'{{FEEDBACK}}'}</code> as placeholders. Leave empty to use default revision message.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Validation Keywords (shown when outputContainsAnyKeyword condition is selected) */}
                                                {step.condition === 'outputContainsAnyKeyword' && (
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Validation Keywords</Label>
                                                        <Input
                                                            placeholder="ISSUE, INCONSISTENT, ERROR, PROBLEM"
                                                            value={(step.validationKeywords ?? []).join(', ')}
                                                            onChange={(e) => {
                                                                const keywords = e.target.value
                                                                    .split(',')
                                                                    .map(k => k.trim())
                                                                    .filter(k => k.length > 0);
                                                                updateStep(step.tempId, { validationKeywords: keywords });
                                                            }}
                                                            className="h-8 text-sm"
                                                        />
                                                        <p className="text-xs text-muted-foreground">
                                                            Comma-separated keywords to check in the previous step's output.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Stream Output */}
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs">Stream output (for final display)</Label>
                                                    <Switch
                                                        checked={step.streamOutput}
                                                        onCheckedChange={(checked) =>
                                                            updateStep(step.tempId, { streamOutput: checked })
                                                        }
                                                    />
                                                </div>

                                                {/* Agent Info */}
                                                {agent && (
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Badge variant="outline" className="text-xs">
                                                            {agent.model.provider}
                                                        </Badge>
                                                        <span>T: {agent.temperature}</span>
                                                        <span>Max: {agent.maxTokens}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => removeStep(step.tempId)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Example Pipelines */}
            {steps.length === 0 && (
                <div className="border rounded-lg p-4 bg-muted/50">
                    <h4 className="text-sm font-medium mb-2">Example Pipeline Ideas:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• <strong>Quick Draft:</strong> Prose Writer (stream) only</li>
                        <li>• <strong>Quality Prose:</strong> Summarizer → Prose Writer (stream) → Lore Judge</li>
                        <li>• <strong>With Revision:</strong> Summarizer → Prose Writer (stream) → Lore Judge → Prose Writer (condition: Lore Judge found issues, revision: on, stream)</li>
                        <li>• <strong>Polished:</strong> Prose Writer → Style Editor (stream)</li>
                    </ul>
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 pt-4 border-t">
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : pipeline ? 'Update Pipeline' : 'Create Pipeline'}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    );
}
