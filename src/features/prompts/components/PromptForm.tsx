import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePromptStore } from '../store/promptStore';
import { useAIStore } from '@/features/ai/stores/useAIStore';
import type { Prompt, PromptMessage, AIModel, AllowedModel } from '@/types/story';
import { Plus, ArrowUp, ArrowDown, Trash2, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

type PromptType = 'scene_beat' | 'gen_summary' | 'selection_specific' | 'continue_writing' | 'other';

const PROMPT_TYPES: Array<{ value: PromptType; label: string }> = [
    { value: 'scene_beat', label: 'Scene Beat' },
    { value: 'gen_summary', label: 'Generate Summary' },
    { value: 'selection_specific', label: 'Selection-Specific' },
    { value: 'continue_writing', label: 'Continue Writing' },
    { value: 'other', label: 'Other' }
] as const;

const MOST_USED_MODELS = [
    'gpt-4',
    'claude-3-sonnet',
    'claude-3-opus',
    'mistral-large',
    'gemini-pro'
];

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

    const {
        initialize,
        getAvailableModels,
        isInitialized,
        isLoading: isAILoading
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

    const modelGroups = useMemo(() => {
        const groups: ModelsByProvider = {
            'Most Used': [],
            'Local': [],
            'Free': [],
            'OpenAI': [],
            'Anthropic': [],
            'Other': []
        };

        // Add local model
        groups['Local'].push({
            id: 'local/llama-3.2-3b-instruct',
            name: 'Llama 3.2 3B Instruct',
            provider: 'local',
            contextLength: 4096,
            enabled: true
        });

        availableModels.forEach(model => {
            if (MOST_USED_MODELS.some(id => model.id.includes(id))) {
                groups['Most Used'].push(model);
            } else if (model.name.toLowerCase().includes('(free)')) {
                groups['Free'].push(model);
            } else if (model.provider === 'openai') {
                groups['OpenAI'].push(model);
            } else if (model.provider === 'openrouter') {
                if (model.name.includes('Anthropic')) {
                    groups['Anthropic'].push(model);
                } else {
                    groups['Other'].push(model);
                }
            }
        });

        return Object.fromEntries(
            Object.entries(groups).filter(([_, models]) => models.length > 0)
        );
    }, [availableModels]);

    const handleModelSelect = (modelId: string) => {
        const selectedModel = availableModels.find(m => m.id === modelId);
        if (selectedModel && !selectedModels.some(m => m.id === modelId)) {
            const allowedModel: AllowedModel = {
                id: selectedModel.id,
                provider: selectedModel.provider,
                name: selectedModel.name
            };
            setSelectedModels([...selectedModels, allowedModel]);
        }
    };

    const removeModel = (modelId: string) => {
        setSelectedModels(selectedModels.filter(m => m.id !== modelId));
    };

    const getModelDisplayName = (modelId: string): string => {
        const model = availableModels.find(m => m.id === modelId);
        return model?.name || modelId;
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
                maxTokens
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
            toast.error('Failed to save prompt');
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
                <h3 className="font-medium mb-4">Available Models</h3>

                <div className="flex flex-wrap gap-2 mb-4">
                    {selectedModels.map((model) => (
                        <Badge
                            key={model.id}
                            variant="secondary"
                            className="flex items-center gap-1 px-3 py-1"
                        >
                            {model.name}
                            <button
                                type="button"
                                onClick={() => removeModel(model.id)}
                                className="ml-1 hover:text-destructive"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>

                <Select onValueChange={handleModelSelect}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(modelGroups).map(([provider, models]) => (
                            <div key={provider}>
                                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted">
                                    {provider}
                                </div>
                                {models.map((model) => (
                                    <SelectItem
                                        key={model.id}
                                        value={model.id}
                                        disabled={selectedModels.some(m => m.id === model.id)}
                                    >
                                        {model.name}
                                    </SelectItem>
                                ))}
                            </div>
                        ))}
                    </SelectContent>
                </Select>
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
                                max={4096}
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
                                    if (!isNaN(value) && value >= 1 && value <= 4096) {
                                        setMaxTokens(value);
                                    }
                                }}
                                className="w-20 text-center"
                            />
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