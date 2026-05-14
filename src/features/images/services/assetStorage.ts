import { db } from "@/services/database";
import type { MediaAsset, MediaAssetKind, MediaAssetSource } from "@/types/story";

export interface SaveAssetInput {
    storyId: string;
    chapterId?: string;
    kind: MediaAssetKind;
    source: MediaAssetSource;
    bytes?: Uint8Array;
    blob?: Blob;
    dataUrl?: string;
    mimeType?: string;
    filename?: string;
    metadata?: Record<string, unknown>;
}

export interface AssetStorage {
    saveAsset(input: SaveAssetInput): Promise<MediaAsset>;
    getDisplayUrl(assetId: string): Promise<string>;
    readAssetBytes(assetId: string): Promise<Uint8Array>;
    deleteAsset(assetId: string): Promise<void>;
}

const objectUrlCache = new Map<string, string>();

export function isAssetReference(src: string): boolean {
    return src.startsWith("story-nexus-asset:");
}

export function assetReference(assetId: string): string {
    return `story-nexus-asset:${assetId}`;
}

export function getAssetIdFromReference(src: string): string {
    return src.replace(/^story-nexus-asset:/, "");
}

export async function resolveAssetDisplayUrl(src: string): Promise<string> {
    if (!isAssetReference(src)) return src;
    return assetRepository.getDisplayUrl(getAssetIdFromReference(src));
}

export class IndexedDbAssetStorage implements AssetStorage {
    async saveAsset(input: SaveAssetInput): Promise<MediaAsset> {
        const { blob, mimeType } = await normalizeAssetBytes(input);
        const id = crypto.randomUUID();
        const filename = input.filename || `${id}.${extensionForMime(mimeType)}`;
        const dimensions = await getImageDimensions(blob).catch(() => ({}));

        const asset: MediaAsset = {
            id,
            createdAt: new Date(),
            storyId: input.storyId,
            chapterId: input.chapterId,
            kind: input.kind,
            mimeType,
            filename,
            storageBackend: "indexeddb_blob",
            storageKey: id,
            sizeBytes: blob.size,
            source: input.source,
            metadata: input.metadata,
            ...dimensions,
        };

        await db.transaction("rw", [db.mediaAssets, db.mediaBlobs], async () => {
            await db.mediaAssets.add(asset);
            await db.mediaBlobs.add({
                assetId: id,
                blob,
                createdAt: new Date(),
            });
        });

        return asset;
    }

    async getDisplayUrl(assetId: string): Promise<string> {
        const cached = objectUrlCache.get(assetId);
        if (cached) return cached;

        const row = await db.mediaBlobs.get(assetId);
        if (!row) throw new Error("Image asset bytes not found");

        const url = URL.createObjectURL(row.blob);
        objectUrlCache.set(assetId, url);
        return url;
    }

    async readAssetBytes(assetId: string): Promise<Uint8Array> {
        const row = await db.mediaBlobs.get(assetId);
        if (!row) throw new Error("Image asset bytes not found");
        return new Uint8Array(await row.blob.arrayBuffer());
    }

    async deleteAsset(assetId: string): Promise<void> {
        const cached = objectUrlCache.get(assetId);
        if (cached) {
            URL.revokeObjectURL(cached);
            objectUrlCache.delete(assetId);
        }
        await db.transaction("rw", [db.mediaAssets, db.mediaBlobs], async () => {
            await db.mediaBlobs.delete(assetId);
            await db.mediaAssets.delete(assetId);
        });
    }
}

export class TauriFileAssetStorage extends IndexedDbAssetStorage {
    // Placeholder implementation for the shared app-facing interface. The browser-safe
    // IndexedDB backend remains active until the Tauri filesystem/plugin permissions
    // and asset protocol are configured in the desktop shell.
}

export const assetRepository: AssetStorage = new IndexedDbAssetStorage();

async function normalizeAssetBytes(input: SaveAssetInput): Promise<{ blob: Blob; mimeType: string }> {
    if (input.blob) {
        return {
            blob: input.blob,
            mimeType: input.mimeType || input.blob.type || "image/png",
        };
    }

    if (input.dataUrl) {
        const response = await fetch(input.dataUrl);
        const blob = await response.blob();
        return {
            blob,
            mimeType: input.mimeType || blob.type || mimeFromDataUrl(input.dataUrl) || "image/png",
        };
    }

    if (input.bytes) {
        const mimeType = input.mimeType || "image/png";
        return {
            blob: new Blob([input.bytes], { type: mimeType }),
            mimeType,
        };
    }

    throw new Error("No image bytes provided");
}

function mimeFromDataUrl(dataUrl: string): string | null {
    const match = dataUrl.match(/^data:([^;,]+)[;,]/);
    return match?.[1] || null;
}

function extensionForMime(mimeType: string): string {
    if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
    if (mimeType.includes("webp")) return "webp";
    if (mimeType.includes("gif")) return "gif";
    return "png";
}

async function getImageDimensions(blob: Blob): Promise<{ width?: number; height?: number }> {
    const url = URL.createObjectURL(blob);
    try {
        const image = new Image();
        const loaded = new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error("Could not read image dimensions"));
        });
        image.src = url;
        await loaded;
        return { width: image.naturalWidth, height: image.naturalHeight };
    } finally {
        URL.revokeObjectURL(url);
    }
}
