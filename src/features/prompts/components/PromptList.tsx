import { useEffect } from 'react';
import { usePromptStore } from '../store/promptStore';
import { Button } from "@/components/ui/button";
import { Trash2 } from 'lucide-react';
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
        'other': 'Other'
    };
    return labels[type];
};

export function PromptsList({ onPromptSelect, selectedPromptId, onPromptDelete }: PromptsListProps) {
    const { prompts, fetchPrompts, deletePrompt, isLoading, error } = usePromptStore();

    useEffect(() => {
        fetchPrompts().catch(error => {
            toast.error('Failed to load prompts');
            console.error('Error loading prompts:', error);
        });
    }, [fetchPrompts]);

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
                        <h3 className="font-medium text-foreground">{prompt.name}</h3>
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

                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "absolute right-2 top-1/2 -translate-y-1/2",
                            "opacity-0 group-hover:opacity-100 transition-opacity",
                            "text-destructive hover:text-destructive"
                        )}
                        onClick={(e) => handleDelete(e, prompt.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ))}
        </div>
    );
} 