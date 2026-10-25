import type { Prompt } from '@/types/story';

export function validatePromptMessages(messages: unknown, promptType?: Prompt['promptType']): boolean {
    if (!Array.isArray(messages)) return false;

    if (promptType === 'universal_system') {
        return messages.length === 1 &&
            messages[0]?.role === 'system' &&
            typeof messages[0].content === 'string' &&
            messages[0].content.trim().length > 0;
    }

    if (promptType === 'image_gen') {
        return messages.length === 1 &&
            messages[0]?.role === 'user' &&
            typeof messages[0].content === 'string';
    }

    return messages.every(message =>
        message !== null && typeof message === 'object' &&
        ['system', 'user', 'assistant'].includes(message.role) &&
        typeof message.content === 'string'
    );
}
