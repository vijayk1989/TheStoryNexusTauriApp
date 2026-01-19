import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Check, X, ChevronDown, ChevronUp, Settings2, Star } from 'lucide-react';
import { useAgentsStore, DEFAULT_AGENT_PROMPTS } from '../stores/useAgentsStore';
import { useAIStore } from '@/features/ai/stores/useAIStore';
import { useStoryContext } from '@/features/stories/context/StoryContext';
import { useLorebookStore } from '@/features/lorebook/stores/useLorebookStore';
import type { 
    AgentPreset, 
    AgentRole, 
    AIModel, 
    AllowedModel, 
    AgentContextConfig, 
    LorebookMode, 
    PreviousWordsMode,
    LorebookEntry 
} from '@/types/story';
import { DEFAULT_CONTEXT_CONFIG } from '@/types/story';
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
    { value: 'outline_generator', label: 'Outline Generator', description: 'Generates structured story/chapter outlines' },
    { value: 'style_extractor', label: 'Style Extractor', description: 'Analyzes text to extract writing style' },
    { value: 'scenebeat_generator', label: 'Scene Beat Generator', description: 'Generates scene beat commands' },
    { value: 'custom', label: 'Custom', description: 'User-defined agent role' },
];

const LOREBOOK_MODE_OPTIONS: { value: LorebookMode; label: string; description: string }[] = [
    { value: 'matched', label: 'Matched Only', description: 'Include lorebook entries matched by tags' },
    { value: 'all', label: 'All Entries', description: 'Include all lorebook entries' },
    { value: 'custom', label: 'Custom Selection', description: 'Manually select specific entries' },
    { value: 'none', label: 'None', description: 'Do not include lorebook data' },
];

const PREVIOUS_WORDS_MODE_OPTIONS: { value: PreviousWordsMode; label: string; description: string }[] = [
    { value: 'full', label: 'Full', description: 'Include all previous text' },
    { value: 'limited', label: 'Limited', description: 'Limit to specified character count' },
    { value: 'summarized', label: 'Summarized', description: 'Use summarizer output if available' },
    { value: 'none', label: 'None', description: 'Do not include previous text' },
];

interface ModelsByProvider {
    [key: string]: AIModel[];
}

export function AgentPresetForm({ agent, onSave, onCancel }: AgentPresetFormProps) {
    const { currentStoryId } = useStoryContext();
    const { createAgentPreset, updateAgentPreset } = useAgentsStore();
    const { initialize, getAvailableModels, isInitialized, favoriteModelIds, toggleFavoriteModel } = useAIStore();
    const { entries: lorebookEntries, loadEntries } = useLorebookStore();

    const [name, setName] = useState(agent?.name || '');
    const [description, setDescription] = useState(agent?.description || '');
    const [role, setRole] = useState<AgentRole>(agent?.role || 'prose_writer');
    const [systemPrompt, setSystemPrompt] = useState(agent?.systemPrompt || DEFAULT_AGENT_PROMPTS['prose_writer']);
    const [temperature, setTemperature] = useState(agent?.temperature ?? 0.8);
    const [maxTokens, setMaxTokens] = useState(agent?.maxTokens ?? 2048);
    const [selectedModel, setSelectedModel] = useState<AllowedModel | null>(agent?.model || null);

    // Context configuration state
    const [contextOpen, setContextOpen] = useState(false);
    const [lorebookMode, setLorebookMode] = useState<LorebookMode>(
        agent?.contextConfig?.lorebookMode ?? DEFAULT_CONTEXT_CONFIG[agent?.role || 'prose_writer'].lorebookMode
    );
    const [lorebookLimit, setLorebookLimit] = useState<number>(
        agent?.contextConfig?.lorebookLimit ?? 50
    );
    const [customLorebookEntryIds, setCustomLorebookEntryIds] = useState<string[]>(
        agent?.contextConfig?.customLorebookEntryIds ?? []
    );
    const [previousWordsMode, setPreviousWordsMode] = useState<PreviousWordsMode>(
        agent?.contextConfig?.previousWordsMode ?? DEFAULT_CONTEXT_CONFIG[agent?.role || 'prose_writer'].previousWordsMode
    );
    const [previousWordsLimit, setPreviousWordsLimit] = useState<number>(
        agent?.contextConfig?.previousWordsLimit ?? 3000
    );
    const [includeChapterSummary, setIncludeChapterSummary] = useState<boolean>(
        agent?.contextConfig?.includeChapterSummary ?? DEFAULT_CONTEXT_CONFIG[agent?.role || 'prose_writer'].includeChapterSummary ?? false
    );
    const [includePovInfo, setIncludePovInfo] = useState<boolean>(
        agent?.contextConfig?.includePovInfo ?? DEFAULT_CONTEXT_CONFIG[agent?.role || 'prose_writer'].includePovInfo ?? true
    );

    const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
    const [modelSearch, setModelSearch] = useState('');
    const [lorebookSearch, setLorebookSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadModels();
        if (currentStoryId) {
            loadEntries(currentStoryId);
        }
    }, [currentStoryId]);

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

    // Update system prompt and context config when role changes (only if user hasn't customized it)
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

        // Update context config to role defaults
        const defaultConfig = DEFAULT_CONTEXT_CONFIG[newRole];
        setLorebookMode(defaultConfig.lorebookMode);
        setPreviousWordsMode(defaultConfig.previousWordsMode);
        setPreviousWordsLimit(defaultConfig.previousWordsLimit ?? 3000);
        setIncludeChapterSummary(defaultConfig.includeChapterSummary ?? false);
        setIncludePovInfo(defaultConfig.includePovInfo ?? true);
        // Clear custom entries when switching roles
        setCustomLorebookEntryIds([]);
    };

    // Filtered lorebook entries for custom selection
    const filteredLorebookEntries = useMemo(() => {
        if (!lorebookSearch.trim()) return lorebookEntries;
        const q = lorebookSearch.toLowerCase();
        return lorebookEntries.filter(
            (e) => e.name.toLowerCase().includes(q) || 
                   e.category?.toLowerCase().includes(q) ||
                   e.tags?.some(t => t.toLowerCase().includes(q))
        );
    }, [lorebookEntries, lorebookSearch]);

    // Get selected lorebook entries for display
    const selectedLorebookEntries = useMemo(() => {
        return lorebookEntries.filter(e => customLorebookEntryIds.includes(e.id));
    }, [lorebookEntries, customLorebookEntryIds]);

    const handleLorebookEntrySelect = (entryId: string) => {
        if (!customLorebookEntryIds.includes(entryId)) {
            setCustomLorebookEntryIds([...customLorebookEntryIds, entryId]);
        }
    };

    const handleLorebookEntryRemove = (entryId: string) => {
        setCustomLorebookEntryIds(customLorebookEntryIds.filter(id => id !== entryId));
    };

    // Helper to create unique model key (provider:id)
    const getModelKey = (model: { provider: string; id: string }) => `${model.provider}:${model.id}`;

    const modelGroups = useMemo(() => {
        const groups: ModelsByProvider = {
            'Favorites': [],
            'Local': [],
            'OpenAI Compatible': [],
            'OpenAI': [],
            'NanoGPT': [],
            'OpenRouter': [],
        };

        availableModels.forEach((model) => {
            const modelKey = getModelKey(model);
            // Add to Favorites if favorited
            if (favoriteModelIds.includes(modelKey)) {
                groups['Favorites'].push(model);
            }
            // Also add to provider category
            if (model.provider === 'local') {
                groups['Local'].push(model);
            } else if (model.provider === 'openai_compatible') {
                groups['OpenAI Compatible'].push(model);
            } else if (model.provider === 'openai') {
                groups['OpenAI'].push(model);
            } else if (model.provider === 'nanogpt') {
                groups['NanoGPT'].push(model);
            } else if (model.provider === 'openrouter') {
                groups['OpenRouter'].push(model);
            }
        });

        // Filter out empty groups, but keep Favorites even if empty to show hint
        const filtered = Object.fromEntries(
            Object.entries(groups).filter(([key, models]) => key === 'Favorites' || models.length > 0)
        );
        return filtered;
    }, [availableModels, favoriteModelIds]);

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
            // Build context config
            const contextConfig: AgentContextConfig = {
                lorebookMode,
                lorebookLimit: lorebookMode === 'all' ? lorebookLimit : undefined,
                customLorebookEntryIds: lorebookMode === 'custom' ? customLorebookEntryIds : undefined,
                previousWordsMode,
                previousWordsLimit: previousWordsMode === 'limited' ? previousWordsLimit : undefined,
                includeChapterSummary,
                includePovInfo,
            };

            const presetData = {
                name: name.trim(),
                description: description.trim() || undefined,
                role,
                model: selectedModel,
                systemPrompt,
                temperature,
                maxTokens,
                storyId: currentStoryId || null,
                contextConfig,
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
                                            {provider === 'Favorites' && models.length === 0 ? (
                                                <div className="px-2 py-1.5 text-sm text-muted-foreground italic">
                                                    Click ☆ to add favorites
                                                </div>
                                            ) : (
                                                models.map((model) => {
                                                    const modelKey = getModelKey(model);
                                                    const isFavorite = favoriteModelIds.includes(modelKey);
                                                    const isSelected = selectedModel && getModelKey(selectedModel) === modelKey;
                                                    return (
                                                        <div
                                                            key={modelKey}
                                                            className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent flex items-center gap-2"
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleFavoriteModel(modelKey);
                                                                }}
                                                                className="flex-shrink-0 hover:text-yellow-500"
                                                            >
                                                                <Star
                                                                    className={`h-4 w-4 ${isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`}
                                                                />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="flex-1 text-left flex items-center justify-between"
                                                                onClick={() => {
                                                                    handleModelSelect(model);
                                                                    setModelSearch('');
                                                                }}
                                                            >
                                                                <span className="truncate">{model.provider}: {model.name}</span>
                                                                {isSelected && (
                                                                    <Check className="h-4 w-4 text-primary" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    );
                                                })
                                            )}
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

            {/* Context Configuration */}
            <Collapsible open={contextOpen} onOpenChange={setContextOpen}>
                <CollapsibleTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between"
                    >
                        <div className="flex items-center gap-2">
                            <Settings2 className="h-4 w-4" />
                            <span>Context Configuration</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                                {lorebookMode === 'none' ? 'No lorebook' : `Lorebook: ${lorebookMode}`}
                                {' • '}
                                {previousWordsMode === 'none' ? 'No context' : `Context: ${previousWordsMode}`}
                            </span>
                            {contextOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                    <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                        {/* Lorebook Mode */}
                        <div className="space-y-2">
                            <Label>Lorebook Data</Label>
                            <Select value={lorebookMode} onValueChange={(v) => setLorebookMode(v as LorebookMode)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select lorebook mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    {LOREBOOK_MODE_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            <div className="flex flex-col">
                                                <span>{opt.label}</span>
                                                <span className="text-xs text-muted-foreground">{opt.description}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Lorebook Limit (for 'all' mode) */}
                        {lorebookMode === 'all' && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Max Entries: {lorebookLimit}</Label>
                                </div>
                                <Slider
                                    value={[lorebookLimit]}
                                    onValueChange={([v]) => setLorebookLimit(v)}
                                    min={5}
                                    max={200}
                                    step={5}
                                    className="w-full"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Limit the number of lorebook entries sent to this agent
                                </p>
                            </div>
                        )}

                        {/* Custom Lorebook Selection */}
                        {lorebookMode === 'custom' && (
                            <div className="space-y-2">
                                <Label>Select Lorebook Entries</Label>
                                {selectedLorebookEntries.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {selectedLorebookEntries.map((entry) => (
                                            <Badge key={entry.id} variant="secondary" className="flex items-center gap-1">
                                                <span className="text-xs opacity-70">[{entry.category}]</span>
                                                <span>{entry.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleLorebookEntryRemove(entry.id)}
                                                    className="ml-1 hover:text-destructive"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className="w-full justify-start">
                                            {customLorebookEntryIds.length > 0 
                                                ? `${customLorebookEntryIds.length} entries selected` 
                                                : 'Select entries...'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-96 p-0" align="start">
                                        <div className="p-2 border-b">
                                            <Input
                                                placeholder="Search entries..."
                                                value={lorebookSearch}
                                                onChange={(e) => setLorebookSearch(e.target.value)}
                                                className="h-8"
                                            />
                                        </div>
                                        <ScrollArea className="h-[300px]">
                                            <div className="p-2">
                                                {filteredLorebookEntries.length > 0 ? (
                                                    filteredLorebookEntries.map((entry) => (
                                                        <button
                                                            key={entry.id}
                                                            type="button"
                                                            className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent flex items-center justify-between"
                                                            onClick={() => {
                                                                if (customLorebookEntryIds.includes(entry.id)) {
                                                                    handleLorebookEntryRemove(entry.id);
                                                                } else {
                                                                    handleLorebookEntrySelect(entry.id);
                                                                }
                                                            }}
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="truncate">{entry.name}</span>
                                                                <span className="text-xs text-muted-foreground">{entry.category}</span>
                                                            </div>
                                                            {customLorebookEntryIds.includes(entry.id) && (
                                                                <Check className="h-4 w-4 text-primary" />
                                                            )}
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-4 text-sm text-muted-foreground">
                                                        {lorebookEntries.length === 0 
                                                            ? 'No lorebook entries in this story' 
                                                            : 'No matching entries'}
                                                    </div>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        )}

                        {/* Previous Words Mode */}
                        <div className="space-y-2">
                            <Label>Previous Text Context</Label>
                            <Select value={previousWordsMode} onValueChange={(v) => setPreviousWordsMode(v as PreviousWordsMode)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select context mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PREVIOUS_WORDS_MODE_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            <div className="flex flex-col">
                                                <span>{opt.label}</span>
                                                <span className="text-xs text-muted-foreground">{opt.description}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Previous Words Limit (for 'limited' mode) */}
                        {previousWordsMode === 'limited' && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Character Limit: {previousWordsLimit.toLocaleString()}</Label>
                                </div>
                                <Slider
                                    value={[previousWordsLimit]}
                                    onValueChange={([v]) => setPreviousWordsLimit(v)}
                                    min={500}
                                    max={10000}
                                    step={500}
                                    className="w-full"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Number of characters from previous text to include
                                </p>
                            </div>
                        )}

                        {/* Additional Context Toggles */}
                        <div className="space-y-3 pt-2 border-t">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Include Chapter Summary</Label>
                                    <p className="text-xs text-muted-foreground">Add current chapter summary to context</p>
                                </div>
                                <Switch
                                    checked={includeChapterSummary}
                                    onCheckedChange={setIncludeChapterSummary}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Include POV Information</Label>
                                    <p className="text-xs text-muted-foreground">Add point of view details to context</p>
                                </div>
                                <Switch
                                    checked={includePovInfo}
                                    onCheckedChange={setIncludePovInfo}
                                />
                            </div>
                        </div>

                        {/* Reset to Defaults */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                const defaultConfig = DEFAULT_CONTEXT_CONFIG[role];
                                setLorebookMode(defaultConfig.lorebookMode);
                                setPreviousWordsMode(defaultConfig.previousWordsMode);
                                setPreviousWordsLimit(defaultConfig.previousWordsLimit ?? 3000);
                                setIncludeChapterSummary(defaultConfig.includeChapterSummary ?? false);
                                setIncludePovInfo(defaultConfig.includePovInfo ?? true);
                                setCustomLorebookEntryIds([]);
                            }}
                            className="w-full"
                        >
                            Reset to Role Defaults
                        </Button>
                    </div>
                </CollapsibleContent>
            </Collapsible>

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
