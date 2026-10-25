import { assetRepository } from '@/features/images/services/assetStorage';
import { db } from '@/services/database';

export const MAX_CHAT_IMAGES = 4;
export const MAX_CHAT_IMAGE_BYTES = 4 * 1024 * 1024;
export const CHAT_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function bytesToImageDataUrl(bytes: Uint8Array, mimeType: string): string {
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 8192) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    }
    return `data:${mimeType};base64,${btoa(binary)}`;
}

export function decodeChatImage(dataUrl: string): { bytes: Uint8Array; mimeType: string } {
    const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]*={0,2})$/.exec(dataUrl);
    if (!match || match[2].length > MAX_CHAT_IMAGE_BYTES * 4 / 3 + 4) throw new Error('Invalid or oversized chat image.');
    let bytes: Uint8Array;
    try { bytes = Uint8Array.from(atob(match[2]), char => char.charCodeAt(0)); }
    catch { throw new Error('Invalid chat image encoding.'); }
    if (!bytes.length || bytes.length > MAX_CHAT_IMAGE_BYTES) throw new Error('Invalid or oversized chat image.');
    return { bytes, mimeType: match[1] };
}

export async function chatImageDataUrl(id: string, storyId: string): Promise<string> {
    const asset = await db.mediaAssets.get(id);
    if (!asset || asset.storyId !== storyId) throw new Error('A chat image is missing. Restore its backup or remove the message containing it.');
    if (!CHAT_IMAGE_TYPES.includes(asset.mimeType) || asset.sizeBytes > MAX_CHAT_IMAGE_BYTES) throw new Error('Unsupported or oversized chat image.');
    const bytes = await assetRepository.readAssetBytes(id);
    if (bytes.length > MAX_CHAT_IMAGE_BYTES) throw new Error('Chat images must be 4 MB or smaller.');
    return bytesToImageDataUrl(bytes, asset.mimeType);
}

export async function prepareChatImage(file: File, resize: boolean): Promise<Blob> {
    if (!CHAT_IMAGE_TYPES.includes(file.type)) throw new Error('Attach a PNG, JPEG, or WebP image.');
    if (!file.size || file.size > 20 * 1024 * 1024) throw new Error('Choose an image smaller than 20 MB.');
    const url = URL.createObjectURL(file);
    try {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('This image could not be opened.'));
            img.src = url;
        });
        if (!resize) {
            if (file.size > MAX_CHAT_IMAGE_BYTES) throw new Error('Enable resizing or choose an image smaller than 4 MB.');
            return file;
        }
        let scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
        if (scale === 1 && file.size <= MAX_CHAT_IMAGE_BYTES) return file;
        const canvas = document.createElement('canvas');
        for (let attempt = 0; attempt < 6; attempt++) {
            canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Image resizing is unavailable.');
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, file.type, 0.85));
            if (blob && blob.size <= MAX_CHAT_IMAGE_BYTES) return blob;
            scale *= 0.7;
        }
        throw new Error('This image is too large. Choose a smaller image.');
    } finally { URL.revokeObjectURL(url); }
}
