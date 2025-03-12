import { useEffect } from 'react';
import { usePromptStore } from '../store/promptStore';
import { Button } from "@/components/ui/button";
import { Trash2, Copy } from 'lucide-react';
import { toast } from 'react-toastify';
import type { Prompt } from '@/types/story';
import { cn } from '@/lib/utils';

interface PromptsListProps {
    onPromptSelect: (prompt: Prompt) => void;
    selectedPromptId?: string;
    onPromptDelete: (promptId: string) => void;
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

export function PromptsList({ onPromptSelect, selectedPromptId, onPromptDelete }: PromptsListProps) {
    const { prompts, fetchPrompts, deletePrompt, clonePrompt, isLoading, error } = usePromptStore();

    useEffect(() => {
        fetchPrompts().catch(error => {
            toast.error('Failed to load prompts');
            console.error('Error loading prompts:', error);
        });
    }, [fetchPrompts]);

    // Debug: Log the prompts to see if there are duplicates
    useEffect(() => {
        if (prompts.length > 0) {
            console.log('Loaded prompts:', prompts);

            // Check for prompts with the same name
            const promptNames = prompts.map(p => p.name);
            const duplicateNames = promptNames.filter((name, index) => promptNames.indexOf(name) !== index);

            if (duplicateNames.length > 0) {
                console.warn('Found prompts with duplicate names:', duplicateNames);

                // Log the details of prompts with duplicate names
                duplicateNames.forEach(name => {
                    const duplicates = prompts.filter(p => p.name === name);
                    console.warn(`Details for prompts named "${name}":`, duplicates);
                });
            }
        }
    }, [prompts]);

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

    return (
        <div className="divide-y divide-border h-full overflow-auto">
            {prompts.map((prompt) => (
                <div
                    key={prompt.id}
                    className={cn(
                        "group relative",
                        selectedPromptId === prompt.id && "bg-muted"
                    )}
                >
                    <button
                        onClick={() => onPromptSelect(prompt)}
                        className={cn(
                            "w-full text-left p-4 hover:bg-muted transition-colors",
                            "focus:outline-none focus:bg-muted",
                        )}
                    >
                        <div className="flex items-center">
                            <h3 className="font-medium text-foreground">{prompt.name}</h3>
                            {prompt.isSystem && (
                                <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                                    System
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                                {getPromptTypeLabel(prompt.promptType)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                •
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {prompt.messages.length} messages
                            </span>
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
    );
} 