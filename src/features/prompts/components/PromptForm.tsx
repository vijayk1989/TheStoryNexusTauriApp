import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { usePromptStore } from '../store/promptStore';
import { useAIStore } from '@/features/ai/stores/useAIStore';
import type { Prompt, PromptMessage, AIModel, AllowedModel } from '@/types/story';
import { Plus, ArrowUp, ArrowDown, Trash2, X, Star } from 'lucide-react';
import { toast } from 'react-toastify';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

type PromptType = Prompt['promptType'];

const PROMPT_TYPES: Array<{ value: PromptType; label: string }> = [
    { value: 'scene_beat', label: 'Scene Beat' },
    { value: 'gen_summary', label: 'Generate Summary' },
    { value: 'selection_specific', label: 'Selection-Specific' },
    { value: 'continue_writing', label: 'Continue Writing' },
    { value: 'brainstorm', label: 'Brainstorm' },
    { value: 'other', label: 'Other' },
] as const;

interface ModelsByProvider {
    [key: string]: AIModel[]
}

interface PromptFormProps {
    prompt?: Prompt;
    onSave?: () => void;
    onCancel?: () => void;
}

export function PromptForm({ prompt, onSave, onCancel }: PromptFormProps) {
    const [name, setName] = useState(prompt?.name || '');
    const [messages, setMessages] = useState<PromptMessage[]>(
        prompt?.messages || [{ role: 'system', content: '' }]
    );
    const [promptType, setPromptType] = useState<PromptType>(prompt?.promptType || 'scene_beat');
    const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
    const [selectedModels, setSelectedModels] = useState<AllowedModel[]>(prompt?.allowedModels || []);
    const { createPrompt, updatePrompt } = usePromptStore();
    const [temperature, setTemperature] = useState(prompt?.temperature || 1.0);
    const [maxTokens, setMaxTokens] = useState(prompt?.maxTokens || 2048);
    const [topP, setTopP] = useState(prompt?.top_p !== undefined ? prompt.top_p : 1.0);
    const [topK, setTopK] = useState(prompt?.top_k !== undefined ? prompt.top_k : 50);
    const [repetitionPenalty, setRepetitionPenalty] = useState(
        prompt?.repetition_penalty !== undefined ? prompt.repetition_penalty : 1.0
    );
    const [minP, setMinP] = useState(
        prompt?.min_p !== undefined ? prompt.min_p : 0.0
    );
    const [showProviderLabels, setShowProviderLabels] = useState(true);

    const {
        initialize,
        getAvailableModels,
        isInitialized,
        isLoading: isAILoading,
        favoriteModelIds,
        toggleFavoriteModel
    } = useAIStore();

    useEffect(() => {
        loadAvailableModels();
    }, []);

    const loadAvailableModels = async () => {
        try {
            if (!isInitialized) {
                await initialize();
            }
            const models = await getAvailableModels();
            setAvailableModels(models);
        } catch (error) {
            console.error('Error loading AI models:', error);
            toast.error('Failed to load AI models');
        }
    };

    // Helper to create unique model key (provider:id)
    const getModelKey = (model: { provider: string; id: string }) => `${model.provider}:${model.id}`;

    const modelGroups = useMemo(() => {
        const groups: ModelsByProvider = {
            'Favorites': [],
            'Local': [],
            'OpenAI Compatible': [],
            'NanoGPT': [],
            'xAI': [],
            'Anthropic': [],
            'OpenAI': [],
            'DeepSeek': [],
            'Mistral': [],
            'NVIDIA': [],
            'Free': [],
            'Other': []
        };
        availableModels.forEach(model => {
            const modelKey = `${model.provider}:${model.id}`;
            // Add to Favorites if favorited
            if (favoriteModelIds.includes(modelKey)) {
                groups['Favorites'].push(model);
            }
            // Also add to provider category
            if (model.provider === 'local') {
                groups['Local'].push(model);
            } else if (model.provider === 'openai_compatible') {
                groups['OpenAI Compatible'].push(model);
            } else if (model.provider === 'nanogpt') {
                groups['NanoGPT'].push(model);
            } else if (model.name.toLowerCase().includes('(free)')) {
                groups['Free'].push(model);
            } else if (model.provider === 'openai') {
                groups['OpenAI'].push(model);
            } else if (model.provider === 'openrouter') {
                if (model.name.includes('Anthropic')) {
                    groups['Anthropic'].push(model);
                } else if (model.name.includes('DeepSeek')) {
                    groups['DeepSeek'].push(model)
                } else if (model.name.includes('Mistral')) {
                    groups['Mistral'].push(model)
                } else if (model.name.includes('NVIDIA')) {
                    groups['NVIDIA'].push(model)
                } else if (model.name.includes('xAI')) {
                    groups['xAI'].push(model)
                } else {
                    groups['Other'].push(model);
                }
            }
        });

        // Filter out empty groups, but keep Favorites even if empty to show hint
        return Object.fromEntries(
            Object.entries(groups).filter(([key, models]) => key === 'Favorites' || models.length > 0)
        );
    }, [availableModels, favoriteModelIds]);

    // Simple search state for the popover-based selector (placed after modelGroups memo)
    const [modelSearch, setModelSearch] = useState('');

    const filteredModelGroups = useMemo(() => {
        if (!modelSearch.trim()) return modelGroups;
        const q = modelSearch.toLowerCase();
        const filtered: ModelsByProvider = {};
        Object.entries(modelGroups).forEach(([provider, models]) => {
            const matched = models.filter(m =>
                m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q)
            );
            if (matched.length > 0) filtered[provider] = matched;
        });
        return filtered;
    }, [modelGroups, modelSearch]);

    const handleModelSelect = (model: AIModel) => {
        const modelKey = getModelKey(model);
        if (!selectedModels.some(m => getModelKey(m) === modelKey)) {
            const allowedModel: AllowedModel = {
                id: model.id,
                provider: model.provider,
                name: model.name
            };
            setSelectedModels([...selectedModels, allowedModel]);
        }
    };

    const removeModel = (model: AllowedModel) => {
        const modelKey = getModelKey(model);
        setSelectedModels(selectedModels.filter(m => getModelKey(m) !== modelKey));
    };

    const handleAddMessage = (role: 'system' | 'user' | 'assistant') => {
        setMessages([...messages, { role, content: '' }]);
    };

    const handleRemoveMessage = (index: number) => {
        if (messages.length === 1) {
            toast.error('Prompt must have at least one message');
            return;
        }
        setMessages(messages.filter((_, i) => i !== index));
    };

    const handleMoveMessage = (index: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === messages.length - 1)
        ) return;

        const newMessages = [...messages];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        [newMessages[index], newMessages[newIndex]] = [newMessages[newIndex], newMessages[index]];
        setMessages(newMessages);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error('Please enter a prompt name');
            return;
        }

        if (messages.some(msg => !msg.content.trim())) {
            toast.error('All messages must have content');
            return;
        }

        if (selectedModels.length === 0) {
            toast.error('Please select at least one AI model');
            return;
        }

        try {
            const promptData = {
                name,
                messages,
                promptType,
                allowedModels: selectedModels,
                temperature,
                maxTokens,
                top_p: topP,
                top_k: topK,
                repetition_penalty: repetitionPenalty,
                min_p: minP
            };

            if (prompt?.id) {
                await updatePrompt(prompt.id, promptData);
                toast.success('Prompt updated successfully');
            } else {
                await createPrompt(promptData);
                toast.success('Prompt created successfully');
            }
            onSave?.();
        } catch (error) {
            toast.error((error as Error).message || 'Failed to save prompt');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Input
                placeholder="Prompt name"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />

            <div className="space-y-4">
                {messages.map((message, index) => (
                    <div key={index} className="space-y-2 p-4 border rounded-lg">
                        <div className="flex items-center justify-between gap-2">
                            <Select
                                value={message.role}
                                onValueChange={(value: 'system' | 'user' | 'assistant') => {
                                    const newMessages = messages.map((msg, i) =>
                                        i === index ? { ...msg, role: value } : msg
                                    );
                                    setMessages(newMessages);
                                }}
                            >
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="system">System</SelectItem>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="assistant">Assistant</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="flex items-center gap-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleMoveMessage(index, 'up')}
                                    disabled={index === 0}
                                >
                                    <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleMoveMessage(index, 'down')}
                                    disabled={index === messages.length - 1}
                                >
                                    <ArrowDown className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveMessage(index)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <Textarea
                            value={message.content}
                            onChange={(e) => {
                                const newMessages = messages.map((msg, i) =>
                                    i === index ? { ...msg, content: e.target.value } : msg
                                );
                                setMessages(newMessages);
                            }}
                            placeholder={`Enter ${message.role} message...`}
                            className="min-h-[200px] font-mono"
                        />
                    </div>
                ))}
            </div>

            <div className="flex gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAddMessage('system')}
                    className="flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    System
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAddMessage('user')}
                    className="flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    User
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAddMessage('assistant')}
                    className="flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Assistant
                </Button>
            </div>

            <div className="border-t border-input pt-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Available Models</h3>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="show-provider" className="text-sm font-normal cursor-pointer">
                            Show provider labels
                        </Label>
                        <Switch
                            id="show-provider"
                            checked={showProviderLabels}
                            onCheckedChange={setShowProviderLabels}
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                    {selectedModels.map((model) => (
                        <Badge
                            key={getModelKey(model)}
                            variant="secondary"
                            className="flex items-center gap-1 px-3 py-1" 
                        >
                            {showProviderLabels ? (
                                <>
                                    <span className="text-xs opacity-70">{model.provider}:</span>
                                    <span>{model.name}</span>
                                </>
                            ) : (
                                model.name
                            )}
                            <button
                                type="button"
                                onClick={() => removeModel(model)}
                                className="ml-1 hover:text-destructive"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full text-left">{selectedModels.length ? `${selectedModels.length} selected` : 'Select a model'}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96">
                        <div className="flex flex-col">
                            <Input
                                placeholder="Search models..."
                                value={modelSearch}
                                onChange={(e) => setModelSearch(e.target.value)}
                                className="mb-2"
                                autoFocus
                            />

                            <div className="max-h-64 overflow-auto">
                                {Object.keys(filteredModelGroups).length === 0 && (
                                    <div className="p-2 text-sm text-muted-foreground">No models found</div>
                                )}
                                {Object.entries(filteredModelGroups).map(([provider, models]) => (
                                    <div key={provider} className="pb-2">
                                        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted">
                                            {provider}
                                        </div>
                                        {provider === 'Favorites' && models.length === 0 ? (
                                            <div className="px-2 py-1.5 text-sm text-muted-foreground italic">
                                                Click ☆ to add favorites
                                            </div>
                                        ) : (
                                            models.map((model) => {
                                                const modelKey = getModelKey(model);
                                                const isSelected = selectedModels.some(m => getModelKey(m) === modelKey);
                                                const isFavorite = favoriteModelIds.includes(modelKey);
                                                return (
                                                    <div
                                                        key={modelKey}
                                                        className={`px-2 py-1 hover:bg-accent hover:text-accent-foreground flex items-center gap-2 ${isSelected ? 'opacity-50' : ''}`}
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
                                                        <div
                                                            className={`flex-1 cursor-pointer ${isSelected ? 'pointer-events-none' : ''}`}
                                                            onClick={() => { handleModelSelect(model); }}
                                                        >
                                                            {showProviderLabels ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-xs opacity-60">{model.provider}</span>
                                                                    <span className="opacity-40">•</span>
                                                                    <span>{model.name}</span>
                                                                </div>
                                                            ) : (
                                                                model.name
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            <div className="border-t border-input pt-6">
                <h3 className="font-medium mb-4">Prompt Type</h3>
                <Select value={promptType} onValueChange={(value: PromptType) => setPromptType(value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select prompt type" />
                    </SelectTrigger>
                    <SelectContent>
                        {PROMPT_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                                {type.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="border-t border-input pt-6">
                <h3 className="font-medium mb-4">Prompt Settings</h3>
                <div className="space-y-4 mb-4">
                    <div className="flex items-center gap-4">
                        <Label htmlFor='temperature' className="w-28">Temperature</Label>
                        <div className="flex-1 flex items-center gap-2">
                            <Slider
                                id='temperature'
                                value={[temperature]}
                                onValueChange={(value) => setTemperature(value[0])}
                                min={0}
                                max={2}
                                step={0.1}
                                className="flex-1"
                            />
                            <Input
                                type="text"
                                value={temperature.toFixed(1)}
                                onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value) && value >= 0 && value <= 2) {
                                        setTemperature(value);
                                    }
                                }}
                                className="w-20 text-center"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Label htmlFor="maxTokens" className="w-28">Max Tokens</Label>
                        <div className="flex-1 flex items-center gap-2">
                            <Slider
                                id="maxTokens"
                                value={[maxTokens]}
                                onValueChange={(value) => setMaxTokens(value[0])}
                                min={1}
                                max={16384}
                                className="flex-1"
                            />
                            <Input
                                type="text"
                                value={maxTokens.toString()}
                                onChange={(e) => {
                                    if (e.target.value === '') {
                                        return;
                                    }

                                    const value = parseInt(e.target.value);
                                    if (!isNaN(value) && value >= 1 && value <= 16384) {
                                        setMaxTokens(value);
                                    }
                                }}
                                className="w-20 text-center"
                            />
                        </div>
                    </div>
                </div>

                {/* Top-p (nucleus sampling) */}
                <div className="space-y-4 mt-4">
                    <div className="flex items-center gap-4">
                        <Label htmlFor="topP" className="w-28">Top-p</Label>
                        <div className="flex-1 flex items-center gap-2">
                            <Slider
                                id="topP"
                                value={[topP]}
                                onValueChange={(value) => setTopP(value[0])}
                                min={0}
                                max={1}
                                step={0.05}
                                className="flex-1"
                                disabled={topP === 0}
                            />
                            <Input
                                type="text"
                                value={topP === 0 ? "Disabled" : topP.toFixed(2)}
                                onChange={(e) => {
                                    if (e.target.value === '') {
                                        return;
                                    }

                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value) && value >= 0 && value <= 1) {
                                        setTopP(value);
                                    }
                                }}
                                className="w-20 text-center"
                            />
                            <Button
                                type="button"
                                variant={topP === 0 ? "default" : "outline"}
                                onClick={() => setTopP(topP === 0 ? 1.0 : 0)}
                                className="whitespace-nowrap"
                            >
                                {topP === 0 ? "Enable" : "Disable"}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Top-k */}
                <div className="space-y-4 mt-4">
                    <div className="flex items-center gap-4">
                        <Label htmlFor="topK" className="w-28">Top-k</Label>
                        <div className="flex-1 flex items-center gap-2">
                            <Slider
                                id="topK"
                                value={[topK]}
                                onValueChange={(value) => setTopK(value[0])}
                                min={0}
                                max={100}
                                step={1}
                                className="flex-1"
                                disabled={topK === 0}
                            />
                            <Input
                                type="text"
                                value={topK === 0 ? "Disabled" : topK.toString()}
                                onChange={(e) => {
                                    if (e.target.value === '') {
                                        return;
                                    }

                                    const value = parseInt(e.target.value);
                                    if (!isNaN(value) && value >= 0 && value <= 100) {
                                        setTopK(value);
                                    }
                                }}
                                className="w-20 text-center"
                            />
                            <Button
                                type="button"
                                variant={topK === 0 ? "default" : "outline"}
                                onClick={() => setTopK(topK === 0 ? 50 : 0)}
                                className="whitespace-nowrap"
                            >
                                {topK === 0 ? "Enable" : "Disable"}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Repetition Penalty */}
                <div className="space-y-4 mt-4">
                    <div className="flex items-center gap-4">
                        <Label htmlFor="repetitionPenalty" className="w-28">Repetition Penalty</Label>
                        <div className="flex-1 flex items-center gap-2">
                            <Slider
                                id="repetitionPenalty"
                                value={[repetitionPenalty]}
                                onValueChange={(value) => setRepetitionPenalty(value[0])}
                                min={0}
                                max={2}
                                step={0.05}
                                className="flex-1"
                                disabled={repetitionPenalty === 0}
                            />
                            <Input
                                type="text"
                                value={repetitionPenalty === 0 ? "Disabled" : repetitionPenalty.toFixed(2)}
                                onChange={(e) => {
                                    if (e.target.value === '') {
                                        return;
                                    }

                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value) && value >= 0 && value <= 2) {
                                        setRepetitionPenalty(value);
                                    }
                                }}
                                className="w-20 text-center"
                            />
                            <Button
                                type="button"
                                variant={repetitionPenalty === 0 ? "default" : "outline"}
                                onClick={() => setRepetitionPenalty(repetitionPenalty === 0 ? 1.0 : 0)}
                                className="whitespace-nowrap"
                            >
                                {repetitionPenalty === 0 ? "Enable" : "Disable"}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Min-P */}
                <div className="space-y-4 mt-4">
                    <div className="flex items-center gap-4">
                        <Label htmlFor="minP" className="w-28">Min-P</Label>
                        <div className="flex-1 flex items-center gap-2">
                            <Slider
                                id="minP"
                                value={[minP]}
                                onValueChange={(value) => setMinP(value[0])}
                                min={0}
                                max={1}
                                step={0.05}
                                className="flex-1"
                                disabled={minP === 0}
                            />
                            <Input
                                type="text"
                                value={minP === 0 ? "Disabled" : minP.toFixed(2)}
                                onChange={(e) => {
                                    if (e.target.value === '') {
                                        return;
                                    }

                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value) && value >= 0 && value <= 1) {
                                        setMinP(value);
                                    }
                                }}
                                className="w-20 text-center"
                            />
                            <Button
                                type="button"
                                variant={minP === 0 ? "default" : "outline"}
                                onClick={() => setMinP(minP === 0 ? 0.1 : 0)}
                                className="whitespace-nowrap"
                            >
                                {minP === 0 ? "Enable" : "Disable"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-2">
                {onCancel && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                )}
                <Button type="submit" className="flex-1">
                    {prompt ? 'Update Prompt' : 'Create Prompt'}
                </Button>
            </div>
        </form>
    );
} 