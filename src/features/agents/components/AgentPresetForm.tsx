import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Check, X } from 'lucide-react';
import { useAgentsStore, DEFAULT_AGENT_PROMPTS } from '../stores/useAgentsStore';
import { useAIStore } from '@/features/ai/stores/useAIStore';
import { useStoryContext } from '@/features/stories/context/StoryContext';
import type { AgentPreset, AgentRole, AIModel, AllowedModel } from '@/types/story';
import { toast } from 'react-toastify';

interface AgentPresetFormProps {
    agent?: AgentPreset;
    onSave: () => void;
    onCancel: () => void;
}

const AGENT_ROLES: { value: AgentRole; label: string; description: string }[] = [
    { value: 'summarizer', label: 'Summarizer', description: 'Condenses content to reduce tokens' },
    { value: 'prose_writer', label: 'Prose Writer', description: 'Main creative writing agent' },
    { value: 'lore_judge', label: 'Lore Judge', description: 'Validates lore consistency' },
    { value: 'continuity_checker', label: 'Continuity Checker', description: 'Checks plot/character continuity' },
    { value: 'style_editor', label: 'Style Editor', description: 'Refines prose style and tone' },
    { value: 'dialogue_specialist', label: 'Dialogue Specialist', description: 'Improves dialogue authenticity' },
    { value: 'expander', label: 'Expander', description: 'Expands brief notes into prose' },
    { value: 'custom', label: 'Custom', description: 'User-defined agent role' },
];

interface ModelsByProvider {
    [key: string]: AIModel[];
}

export function AgentPresetForm({ agent, onSave, onCancel }: AgentPresetFormProps) {
    const { currentStoryId } = useStoryContext();
    const { createAgentPreset, updateAgentPreset } = useAgentsStore();
    const { initialize, getAvailableModels, isInitialized } = useAIStore();

    const [name, setName] = useState(agent?.name || '');
    const [description, setDescription] = useState(agent?.description || '');
    const [role, setRole] = useState<AgentRole>(agent?.role || 'prose_writer');
    const [systemPrompt, setSystemPrompt] = useState(agent?.systemPrompt || DEFAULT_AGENT_PROMPTS['prose_writer']);
    const [temperature, setTemperature] = useState(agent?.temperature ?? 0.8);
    const [maxTokens, setMaxTokens] = useState(agent?.maxTokens ?? 2048);
    const [selectedModel, setSelectedModel] = useState<AllowedModel | null>(agent?.model || null);

    const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
    const [modelSearch, setModelSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadModels();
    }, []);

    const loadModels = async () => {
        try {
            if (!isInitialized) {
                await initialize();
            }
            const models = await getAvailableModels();
            setAvailableModels(models);
        } catch (error) {
            console.error('Error loading models:', error);
            toast.error('Failed to load AI models');
        }
    };

    // Update system prompt when role changes (only if user hasn't customized it)
    const handleRoleChange = (newRole: AgentRole) => {
        setRole(newRole);
        // If the current prompt matches the default for the previous role, update it
        if (systemPrompt === DEFAULT_AGENT_PROMPTS[role] || !systemPrompt) {
            setSystemPrompt(DEFAULT_AGENT_PROMPTS[newRole]);
        }

        // Adjust temperature based on role
        if (newRole === 'summarizer' || newRole === 'lore_judge' || newRole === 'continuity_checker') {
            setTemperature(0.3);
        } else {
            setTemperature(0.8);
        }
    };

    const modelGroups = useMemo(() => {
        const groups: ModelsByProvider = {
            'Local': [],
            'OpenAI Compatible': [],
            'OpenAI': [],
            'OpenRouter': [],
        };

        availableModels.forEach((model) => {
            if (model.provider === 'local') {
                groups['Local'].push(model);
            } else if (model.provider === 'openai_compatible') {
                groups['OpenAI Compatible'].push(model);
            } else if (model.provider === 'openai') {
                groups['OpenAI'].push(model);
            } else if (model.provider === 'openrouter') {
                groups['OpenRouter'].push(model);
            }
        });

        return Object.fromEntries(
            Object.entries(groups).filter(([_, models]) => models.length > 0)
        );
    }, [availableModels]);

    const filteredModelGroups = useMemo(() => {
        if (!modelSearch.trim()) return modelGroups;
        const q = modelSearch.toLowerCase();
        const filtered: ModelsByProvider = {};
        Object.entries(modelGroups).forEach(([provider, models]) => {
            const matched = models.filter(
                (m) => m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q)
            );
            if (matched.length > 0) filtered[provider] = matched;
        });
        return filtered;
    }, [modelGroups, modelSearch]);

    const handleModelSelect = (model: AIModel) => {
        setSelectedModel({
            id: model.id,
            provider: model.provider,
            name: model.name,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error('Please enter an agent name');
            return;
        }

        if (!selectedModel) {
            toast.error('Please select a model');
            return;
        }

        if (!systemPrompt.trim()) {
            toast.error('Please enter a system prompt');
            return;
        }

        setIsLoading(true);

        try {
            const presetData = {
                name: name.trim(),
                description: description.trim() || undefined,
                role,
                model: selectedModel,
                systemPrompt,
                temperature,
                maxTokens,
                storyId: currentStoryId || null,
            };

            if (agent?.id) {
                await updateAgentPreset(agent.id, presetData);
                toast.success('Agent updated successfully');
            } else {
                await createAgentPreset(presetData);
                toast.success('Agent created successfully');
            }

            onSave();
        } catch (error) {
            toast.error((error as Error).message || 'Failed to save agent');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
            <div className="flex items-center gap-4 mb-6">
                <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-xl font-semibold">
                        {agent ? 'Edit Agent' : 'New Agent'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Configure an AI agent with a specific role and model
                    </p>
                </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
                <Label htmlFor="name">Agent Name</Label>
                <Input
                    id="name"
                    placeholder="e.g., My Summarizer"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </div>

            {/* Description */}
            <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                    id="description"
                    placeholder="Brief description of what this agent does"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>

            {/* Role */}
            <div className="space-y-2">
                <Label>Agent Role</Label>
                <Select value={role} onValueChange={(v) => handleRoleChange(v as AgentRole)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                        {AGENT_ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                                <div className="flex flex-col">
                                    <span>{r.label}</span>
                                    <span className="text-xs text-muted-foreground">{r.description}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
                <Label>Model</Label>
                {selectedModel ? (
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="flex items-center gap-1 px-3 py-2">
                            <span className="text-xs opacity-70">{selectedModel.provider}:</span>
                            <span>{selectedModel.name}</span>
                            <button
                                type="button"
                                onClick={() => setSelectedModel(null)}
                                className="ml-1 hover:text-destructive"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    </div>
                ) : (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                                Select a model
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-96 p-0" align="start">
                            <div className="p-2 border-b">
                                <Input
                                    placeholder="Search models..."
                                    value={modelSearch}
                                    onChange={(e) => setModelSearch(e.target.value)}
                                    className="h-8"
                                />
                            </div>
                            <ScrollArea className="h-[300px]">
                                <div className="p-2">
                                    {Object.entries(filteredModelGroups).map(([provider, models]) => (
                                        <div key={provider} className="mb-4">
                                            <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                                                {provider}
                                            </div>
                                            {models.map((model) => (
                                                <button
                                                    key={model.id}
                                                    type="button"
                                                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent flex items-center justify-between"
                                                    onClick={() => {
                                                        handleModelSelect(model);
                                                        setModelSearch('');
                                                    }}
                                                >
                                                    <span className="truncate">{model.name}</span>
                                                    {selectedModel?.id === model.id && (
                                                        <Check className="h-4 w-4 text-primary" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    ))}
                                    {Object.keys(filteredModelGroups).length === 0 && (
                                        <div className="text-center py-4 text-sm text-muted-foreground">
                                            No models found
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </PopoverContent>
                    </Popover>
                )}
                <p className="text-xs text-muted-foreground">
                    Tip: Use low-cost models (GPT-4o-mini, Gemini Flash) for utility roles like summarizer or lore judge
                </p>
            </div>

            {/* System Prompt */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="systemPrompt">System Prompt</Label>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSystemPrompt(DEFAULT_AGENT_PROMPTS[role])}
                    >
                        Reset to Default
                    </Button>
                </div>
                <Textarea
                    id="systemPrompt"
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Enter the system prompt for this agent..."
                    className="min-h-[200px] font-mono text-sm"
                />
            </div>

            {/* Temperature */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label>Temperature: {temperature.toFixed(2)}</Label>
                </div>
                <Slider
                    value={[temperature]}
                    onValueChange={([v]) => setTemperature(v)}
                    min={0}
                    max={2}
                    step={0.05}
                    className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                    Lower = more focused/deterministic, Higher = more creative/random
                </p>
            </div>

            {/* Max Tokens */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label>Max Tokens: {maxTokens}</Label>
                </div>
                <Slider
                    value={[maxTokens]}
                    onValueChange={([v]) => setMaxTokens(v)}
                    min={256}
                    max={8192}
                    step={256}
                    className="w-full"
                />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 pt-4 border-t">
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : agent ? 'Update Agent' : 'Create Agent'}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    );
}
