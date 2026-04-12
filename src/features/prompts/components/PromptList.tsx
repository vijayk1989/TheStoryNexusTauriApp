import { useEffect, useState } from 'react';
import { usePromptStore } from '../store/promptStore';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'react-toastify';
import type { Prompt } from '@/types/story';
import { cn } from '@/lib/utils';

interface PromptsListProps {
    onPromptSelect: (prompt: Prompt) => void;
    selectedPromptId?: string;
    onPromptDelete: (promptId: string) => void;
    selectedPromptIds?: string[];
    onSelectionChange?: (ids: string[]) => void;
}

const getPromptTypeLabel = (type: Prompt['promptType']) => {
    const labels: Record<Prompt['promptType'], string> = {
        'scene_beat': 'Scene Beat',
        'gen_summary': 'Generate Summary',
        'selection_specific': 'Selection-Specific',
        'continue_writing': 'Continue Writing',
        'brainstorm': 'Brainstorm',
        'other': 'Other',
    };
    return labels[type];
};

export function PromptsList({ onPromptSelect, selectedPromptId, onPromptDelete, selectedPromptIds = [], onSelectionChange }: PromptsListProps) {
    const { prompts, fetchPrompts, deletePrompt, clonePrompt, isLoading, error } = usePromptStore();
    // Track which groups are expanded (default all expanded)
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const handleToggleSelect = (promptId: string) => {
        const newSelection = selectedPromptIds.includes(promptId)
            ? selectedPromptIds.filter(id => id !== promptId)
            : [...selectedPromptIds, promptId];
        onSelectionChange?.(newSelection);
    };

    const handleSelectAllInGroup = (groupPrompts: Prompt[]) => {
        const promptIdsInGroup = groupPrompts.map(p => p.id);
        const allSelected = promptIdsInGroup.every(id => selectedPromptIds.includes(id));
        const newSelection = allSelected
            ? selectedPromptIds.filter(id => !promptIdsInGroup.includes(id))
            : [...new Set([...selectedPromptIds, ...promptIdsInGroup])];
        onSelectionChange?.(newSelection);
    };

    useEffect(() => {
        fetchPrompts().catch(error => {
            toast.error('Failed to load prompts');
            console.error('Error loading prompts:', error);
        });
    }, [fetchPrompts]);

    // Initialize all groups as expanded when prompts are loaded
    useEffect(() => {
        if (prompts.length > 0) {
            const initialExpandState: Record<string, boolean> = {};
            promptTypeOrder.forEach(type => {
                initialExpandState[type] = true;
            });
            setExpandedGroups(initialExpandState);
        }
    }, [prompts.length]);

    const toggleGroup = (promptType: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [promptType]: !prev[promptType]
        }));
    };

    const handleDelete = async (e: React.MouseEvent, promptId: string) => {
        e.stopPropagation();
        try {
            await deletePrompt(promptId);
            onPromptDelete(promptId);
            toast.success('Prompt deleted successfully');
        } catch (error) {
            toast.error('Failed to delete prompt');
            console.error('Error deleting prompt:', error);
        }
    };

    const handleClone = async (e: React.MouseEvent, promptId: string) => {
        e.stopPropagation();
        try {
            await clonePrompt(promptId);
            toast.success('Prompt cloned successfully');
        } catch (error) {
            toast.error('Failed to clone prompt');
            console.error('Error cloning prompt:', error);
        }
    };

    if (error) {
        return (
            <div className="p-4 text-destructive h-full">
                Error loading prompts: {error}
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="p-4 text-muted-foreground h-full">
                Loading prompts...
            </div>
        );
    }

    if (!prompts.length) {
        return (
            <div className="p-4 text-muted-foreground h-full">
                No prompts available
            </div>
        );
    }

    // Group prompts by promptType
    const groupedPrompts = prompts.reduce((acc, prompt) => {
        if (!acc[prompt.promptType]) {
            acc[prompt.promptType] = [];
        }
        acc[prompt.promptType].push(prompt);
        return acc;
    }, {} as Record<Prompt['promptType'], Prompt[]>);

    // Define order for prompt types to display
    const promptTypeOrder: Prompt['promptType'][] = [
        'scene_beat',
        'continue_writing',
        'selection_specific',
        'gen_summary',
        'brainstorm',
        'other'
    ];

    return (
        <div className="h-full overflow-auto">
            {promptTypeOrder.map(promptType => {
                const promptsInGroup = groupedPrompts[promptType] || [];
                if (promptsInGroup.length === 0) return null;

                const isExpanded = expandedGroups[promptType] ?? true;
                const allSelected = promptsInGroup.every(p => selectedPromptIds.includes(p.id));
                const someSelected = promptsInGroup.some(p => selectedPromptIds.includes(p.id));

                return (
                    <div key={promptType} className="mb-2">
                        <button
                            onClick={() => toggleGroup(promptType)}
                            className="w-full px-4 py-2.5 bg-slate-300 dark:bg-slate-700 font-medium text-sm sticky top-0 shadow-sm border-b border-slate-500 dark:border-slate-600 flex items-center justify-between z-10 text-slate-800 dark:text-white hover:bg-slate-500 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                        >
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={allSelected}
                                    onCheckedChange={() => handleSelectAllInGroup(promptsInGroup)}
                                    onClick={(e) => e.stopPropagation()}
                                    aria-label={`Select all ${promptType} prompts`}
                                />
                                {isExpanded ?
                                    <ChevronDown className="h-4 w-4" /> :
                                    <ChevronRight className="h-4 w-4" />
                                }
                                {getPromptTypeLabel(promptType)}
                                <span className="ml-2 px-2 py-0.5 text-xs bg-slate-200 dark:bg-slate-500 text-slate-800 dark:text-white rounded-full font-semibold">
                                    {promptsInGroup.length}
                                </span>
                            </div>
                        </button>
                        {isExpanded && (
                            <div className="divide-y divide-border">
                                {promptsInGroup.map((prompt) => (
                                    <div
                                        key={prompt.id}
                                        className={cn(
                                            "group relative",
                                            selectedPromptId === prompt.id && "bg-muted border-l-2 border-emerald-600 dark:border-emerald-400",
                                            selectedPromptIds.includes(prompt.id) && "bg-primary/5"
                                        )}
                                    >
                                        <button
                                            onClick={() => {
                                                handleToggleSelect(prompt.id);
                                                onPromptSelect(prompt);
                                            }}
                                            className={cn(
                                                "w-full text-left p-4 hover:bg-muted transition-colors flex items-center gap-3",
                                                "focus:outline-none focus:bg-muted",
                                            )}
                                        >
                                            <Checkbox
                                                checked={selectedPromptIds.includes(prompt.id)}
                                                onCheckedChange={() => handleToggleSelect(prompt.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                aria-label={`Select ${prompt.name}`}
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center">
                                                    <h3 className={cn(
                                                        "font-medium",
                                                        selectedPromptId === prompt.id
                                                            ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                                                            : "text-foreground"
                                                    )}>
                                                        {prompt.name}
                                                    </h3>
                                                    {prompt.isSystem && (
                                                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                                                            System
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-muted-foreground">
                                                        {prompt.messages.length} messages
                                                    </span>
                                                </div>
                                            </div>
                                        </button>

                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-primary hover:text-primary"
                                                onClick={(e) => handleClone(e, prompt.id)}
                                                title="Clone prompt"
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>

                                            {!prompt.isSystem && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={(e) => handleDelete(e, prompt.id)}
                                                    title="Delete prompt"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}