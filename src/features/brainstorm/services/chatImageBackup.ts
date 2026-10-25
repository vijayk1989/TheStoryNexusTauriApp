import type { AIChat, MediaAsset, MediaBlob } from '@/types/story';
import { db } from '@/services/database';
import { chatImageDataUrl, decodeChatImage } from './chatImages';

export interface ChatImageBackup { asset: MediaAsset; dataUrl: string }

export function chatImageIds(chat: AIChat): string[] {
    return [...(chat.draftImageAssetIds || []), ...chat.messages.flatMap(message => message.imageAssetIds || [])];
}

export async function exportChatImages(chats: AIChat[]): Promise<ChatImageBackup[]> {
    const images = new Map<string, ChatImageBackup>();
    for (const chat of chats) {
        for (const id of chatImageIds(chat)) {
            if (images.has(id)) continue;
            const dataUrl = await chatImageDataUrl(id, chat.storyId);
            const asset = await db.mediaAssets.get(id);
            images.set(id, { asset: asset!, dataUrl });
        }
    }
    return [...images.values()];
}

export function importChatImages(images: ChatImageBackup[], storyIdMap: Map<string, string>) {
    const idMap = new Map<string, string>();
    const assets: MediaAsset[] = [];
    const blobs: MediaBlob[] = [];
    for (const image of images) {
        if (!image.asset || idMap.has(image.asset.id)) throw new Error('Invalid or duplicate chat image in backup.');
        const { bytes, mimeType } = decodeChatImage(image.dataUrl);
        const storyId = storyIdMap.get(image.asset.storyId);
        if (!storyId) throw new Error('Chat image references a missing story.');
        const id = crypto.randomUUID();
        idMap.set(image.asset.id, id);
        const createdAt = new Date();
        assets.push({ ...image.asset, id, storyId, chapterId: undefined, createdAt,
            mimeType, sizeBytes: bytes.length, storageBackend: 'indexeddb_blob', storageKey: id });
        blobs.push({ assetId: id, blob: new Blob([bytes], { type: mimeType }), createdAt });
    }
    return { idMap, assets, blobs };
}

export function remapChatImages(chat: AIChat, idMap: Map<string, string>): AIChat {
    const remap = (id: string) => {
        if (!idMap.has(id)) idMap.set(id, crypto.randomUUID());
        return idMap.get(id)!;
    };
    return { ...chat, draftImageAssetIds: chat.draftImageAssetIds?.map(remap),
        messages: chat.messages.map(message => ({ ...message, imageAssetIds: message.imageAssetIds?.map(remap) })) };
}
