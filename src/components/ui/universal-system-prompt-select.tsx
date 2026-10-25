import type { Prompt } from '@/types/story';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

interface UniversalSystemPromptSelectProps {
    prompts: Prompt[];
    value?: string;
    onValueChange: (id: string | undefined) => void;
    disabled?: boolean;
}

export function UniversalSystemPromptSelect({ prompts, value, onValueChange, disabled }: UniversalSystemPromptSelectProps) {
    const universalPrompts = prompts.filter(prompt => prompt.promptType === 'universal_system');

    return (
        <Select value={value || 'none'} onValueChange={id => onValueChange(id === 'none' ? undefined : id)} disabled={disabled}>
            <SelectTrigger
                className="h-10 py-1 [&>span]:line-clamp-none"
                aria-label="Universal system prompt"
                title="Replaces the first system message, or inserts one at the beginning if absent. None uses the prompt's own messages."
            >
                <span className="min-w-0 text-left">
                    <span className="block text-xs leading-3 text-muted-foreground">Universal system prompt</span>
                    <span className="block truncate text-sm leading-4"><SelectValue /></span>
                </span>
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {value && !universalPrompts.some(prompt => prompt.id === value) && (
                    <SelectItem value={value} disabled>Unavailable prompt</SelectItem>
                )}
                {universalPrompts.map(prompt => (
                    <SelectItem key={prompt.id} value={prompt.id}>{prompt.name}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
