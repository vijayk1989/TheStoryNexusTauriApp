import { createPromptParser } from '@/features/prompts/services/promptParser';
import type { ChatMessage, GenerationMessage, MessageContentPart, PromptParserConfig } from '@/types/story';
import { chatImageDataUrl } from './chatImages';

export async function buildBrainstormMessages(config: PromptParserConfig, history: ChatMessage[], imageAssetIds: string[]): Promise<GenerationMessage[]> {
    const hasImages = imageAssetIds.length > 0 || history.some(message => message.imageAssetIds?.length);
    const marker = `__CHAT_HISTORY_${crypto.randomUUID()}__`;
    const parsed = await createPromptParser().parse(hasImages ? {
        ...config, additionalContext: { ...config.additionalContext, chatHistoryMarker: marker },
    } : config);
    if (parsed.error) throw new Error(parsed.error);
    if (!hasImages) return parsed.messages;

    const imageCount = imageAssetIds.length + history.reduce((count, message) => count + (message.imageAssetIds?.length || 0), 0);
    if (imageCount > 12) throw new Error('This conversation contains more than 12 images. Start a new chat or remove earlier image messages.');
    let encodedBytes = 0;
    const content = async (text: string, ids: string[]): Promise<GenerationMessage['content']> => {
        if (!ids.length) return text;
        const parts: MessageContentPart[] = text ? [{ type: 'text', text }] : [];
        for (const id of ids) {
            const url = await chatImageDataUrl(id, config.storyId);
            encodedBytes += url.length;
            if (encodedBytes > 16 * 1024 * 1024) throw new Error('The images in this conversation are too large to send together. Start a new chat or remove earlier image messages.');
            parts.push({ type: 'image_url', image_url: { url } });
        }
        return parts;
    };
    const structuredHistory: GenerationMessage[] = [];
    for (const message of history) {
        structuredHistory.push({ role: message.role, content: await content(message.content, message.imageAssetIds || []) });
    }
    const messages: GenerationMessage[] = [];
    let insertedHistory = false;
    let currentUser: GenerationMessage | undefined;
    for (const message of parsed.messages) {
        const segments = (message.content || '').split(marker);
        for (let index = 0; index < segments.length; index++) {
            if (index > 0 && !insertedHistory) {
                messages.push(...structuredHistory);
                insertedHistory = true;
            }
            if (segments[index].trim()) {
                const resolved = { ...message, content: segments[index] };
                messages.push(resolved);
                if (resolved.role === 'user') currentUser = resolved;
            }
        }
    }
    if (!currentUser) {
        currentUser = { role: 'user', content: config.scenebeat || '' };
        messages.push(currentUser);
    }
    if (!insertedHistory) messages.splice(messages.indexOf(currentUser), 0, ...structuredHistory);
    currentUser.content = await content(currentUser.content as string, imageAssetIds);
    return messages;
}
