import type { GenerationMessage, AISettings, AllowedModel } from '@/types/story';
import { getLocalApiUrl, getLocalRuntime } from './localRuntime';

export function messageText(content: GenerationMessage['content']): string {
    return Array.isArray(content) ? content.filter(part => part.type === 'text').map(part => part.text).join('\n') : content || '';
}

export function hasImageInput(messages: GenerationMessage[]): boolean {
    return messages.some(message => Array.isArray(message.content) && message.content.some(part => part.type === 'image_url'));
}

export function googleMessageContents(messages: GenerationMessage[]) {
    return messages.filter(message => message.role !== 'system').map(message => ({
        role: message.role === 'assistant' ? 'model' as const : 'user' as const,
        parts: Array.isArray(message.content) ? message.content.map(part => {
            if (part.type === 'text') return { text: part.text };
            const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(part.image_url.url);
            if (!match) throw new Error('Google image input requires an attached PNG, JPEG, or WebP image.');
            return { inlineData: { mimeType: match[1], data: match[2] } };
        }) : [{ text: message.content || '' }],
    }));
}

export async function validateImageModel(messages: GenerationMessage[], model: AllowedModel, settings: AISettings | null): Promise<void> {
    if (!hasImageInput(messages)) return;
    const selected = settings?.availableModels?.find(candidate => candidate.provider === model.provider &&
        candidate.id.replace(/^local\//, '') === model.id.replace(/^local\//, ''));
    let supported = selected?.supportsImages;
    if (model.provider === 'local' && getLocalRuntime(settings) === 'lm_studio') {
        try {
            const base = getLocalApiUrl(settings).replace(/\/v1$/, '');
            const response = await fetch(`${base}/api/v1/models`, { signal: AbortSignal.timeout(5000) });
            if (response.ok) {
                const data = await response.json();
                const entry = data.models?.find((candidate: any) =>
                    [candidate.key, candidate.id, ...(candidate.loaded_instances || []).map((instance: any) => instance.id)]
                        .includes(model.id.replace(/^local\//, '')));
                if (typeof entry?.capabilities?.vision === 'boolean') supported = entry.capabilities.vision;
            }
        } catch { /* Older compatible servers may not expose capability metadata. */ }
    }
    if (supported === false) throw new Error(`${model.name} does not support image input. Choose a vision-capable model or remove images from the conversation.`);
}
