import { create } from "zustand";
import { db } from "@/services/database";
import type { ImageGenerationModel, ImageGenerationRecord, MediaAsset } from "@/types/story";
import { assetRepository } from "@/features/images/services/assetStorage";
import {
    generateImage,
    persistOpenRouterImageModels,
    type ImageGenerationRequest,
} from "@/features/images/services/imageGenerationService";

interface ImageGenerationState {
    assets: MediaAsset[];
    generations: ImageGenerationRecord[];
    openRouterImageModels: ImageGenerationModel[];
    loading: boolean;
    error: string | null;
    loadGallery: (storyId: string) => Promise<void>;
    generate: (request: ImageGenerationRequest) => Promise<MediaAsset[]>;
    saveUploadedAsset: (input: {
        storyId: string;
        chapterId?: string;
        file: File;
        metadata?: Record<string, unknown>;
    }) => Promise<MediaAsset>;
    archiveOrDeleteAsset: (assetId: string) => Promise<void>;
    refreshOpenRouterImageModels: () => Promise<ImageGenerationModel[]>;
}

export const useImageGenerationStore = create<ImageGenerationState>((set, get) => ({
    assets: [],
    generations: [],
    openRouterImageModels: [],
    loading: false,
    error: null,

    loadGallery: async (storyId) => {
        set({ loading: true, error: null });
        try {
            const [assets, generations, settings] = await Promise.all([
                db.mediaAssets.where("storyId").equals(storyId).reverse().sortBy("createdAt"),
                db.imageGenerations.where("storyId").equals(storyId).reverse().sortBy("createdAt"),
                db.aiSettings.toArray(),
            ]);
            const imageSettings = settings.find(item => item.openRouterImageModels?.length || item.openrouterKey?.trim()) || settings[0];
            set({
                assets,
                generations,
                openRouterImageModels: imageSettings?.openRouterImageModels || [],
                loading: false,
            });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to load image gallery",
                loading: false,
            });
            throw error;
        }
    },

    generate: async (request) => {
        set({ loading: true, error: null });
        try {
            const result = await generateImage(request);
            await get().loadGallery(request.storyId);
            set({ loading: false });
            return result.assets;
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Image generation failed",
                loading: false,
            });
            throw error;
        }
    },

    saveUploadedAsset: async ({ storyId, chapterId, file, metadata }) => {
        const asset = await assetRepository.saveAsset({
            storyId,
            chapterId,
            kind: "uploaded",
            source: "upload",
            blob: file,
            mimeType: file.type || "image/png",
            filename: file.name,
            metadata,
        });
        await get().loadGallery(storyId);
        return asset;
    },

    archiveOrDeleteAsset: async (assetId) => {
        const asset = await db.mediaAssets.get(assetId);
        if (!asset) return;

        const ref = `story-nexus-asset:${assetId}`;
        const chapters = await db.chapters.where("storyId").equals(asset.storyId).toArray();
        const isReferenced = chapters.some(chapter => chapter.content.includes(ref));

        if (isReferenced) {
            await db.mediaAssets.update(assetId, { archivedAt: new Date() });
        } else {
            await assetRepository.deleteAsset(assetId);
        }
        await get().loadGallery(asset.storyId);
    },

    refreshOpenRouterImageModels: async () => {
        const models = await persistOpenRouterImageModels();
        set({ openRouterImageModels: models });
        return models;
    },
}));
