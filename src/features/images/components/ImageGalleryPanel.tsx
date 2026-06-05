import { useEffect, useMemo, useState } from "react";
import { Copy, Download, ImageIcon, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStoryContext } from "@/features/stories/context/StoryContext";
import { useImageGenerationStore } from "@/features/images/stores/useImageGenerationStore";
import { assetReference, assetRepository, resolveAssetDisplayUrl } from "@/features/images/services/assetStorage";
import { dispatchInsertAssetImage } from "@/components/editor/mainLexicalEditor/plugins/AssetImageInsertPlugin";
import type { MediaAsset } from "@/types/story";
import { toast } from "react-toastify";
import { db } from "@/services/database";

export function ImageGalleryPanel() {
    const { currentStoryId } = useStoryContext();
    const { assets, generations, loading, loadGallery, archiveOrDeleteAsset } = useImageGenerationStore();
    const [referencedAssetIds, setReferencedAssetIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (currentStoryId) {
            loadGallery(currentStoryId).catch(() => undefined);
        }
    }, [currentStoryId, loadGallery]);

    useEffect(() => {
        if (!currentStoryId) return;
        db.chapters.where("storyId").equals(currentStoryId).toArray().then((chapters) => {
            const refs = new Set<string>();
            chapters.forEach((chapter) => {
                const matches = chapter.content.matchAll(/story-nexus-asset:([a-zA-Z0-9-]+)/g);
                for (const match of matches) refs.add(match[1]);
            });
            setReferencedAssetIds(refs);
        });
    }, [currentStoryId, assets]);

    const generationByAssetId = useMemo(() => {
        const map = new Map<string, typeof generations[number]>();
        generations.forEach((generation) => {
            generation.outputAssetIds.forEach((assetId) => map.set(assetId, generation));
        });
        return map;
    }, [generations]);

    if (!currentStoryId) {
        return <div className="p-4 text-sm text-muted-foreground">Choose a story to view images.</div>;
    }

    if (loading && assets.length === 0) {
        return <div className="p-4 text-sm text-muted-foreground">Loading images...</div>;
    }

    const visibleAssets = assets.filter((asset) => !asset.archivedAt);

    const handleDownloadAll = async () => {
        try {
            for (const asset of visibleAssets) {
                await downloadAsset(asset);
                await new Promise((resolve) => setTimeout(resolve, 80));
            }
            toast.success(`Started ${visibleAssets.length} image download${visibleAssets.length === 1 ? "" : "s"}`);
        } catch (error) {
            console.error("Failed to download images:", error);
            toast.error(error instanceof Error ? error.message : "Failed to download images");
        }
    };

    return (
        <div className="space-y-3 p-3">
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-6 text-foreground">
                Images are not included in Site Backup. Download them separately if you want to move them to another device.
            </div>
            {visibleAssets.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleDownloadAll}>
                    <Download className="mr-2 h-4 w-4" />
                    Download All Images
                </Button>
            )}
            {visibleAssets.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    <ImageIcon className="mx-auto mb-2 h-8 w-8 opacity-60" />
                    No story images yet.
                </div>
            ) : (
                visibleAssets.map((asset) => (
                    <GalleryAssetCard
                        key={asset.id}
                        asset={asset}
                        generation={generationByAssetId.get(asset.id)}
                        isInserted={referencedAssetIds.has(asset.id)}
                        onInsert={() => {
                            dispatchInsertAssetImage(asset.id, asset.filename);
                            toast.success("Image inserted");
                        }}
                        onDelete={() => archiveOrDeleteAsset(asset.id)}
                    />
                ))
            )}
        </div>
    );
}

async function downloadAsset(asset: MediaAsset): Promise<void> {
    const bytes = await assetRepository.readAssetBytes(asset.id);
    const blob = new Blob([bytes], { type: asset.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = safeFilename(asset.filename || `${asset.id}.png`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilename(filename: string): string {
    return filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, "-") || "story-nexus-image.png";
}

function GalleryAssetCard({
    asset,
    generation,
    isInserted,
    onInsert,
    onDelete,
}: {
    asset: MediaAsset;
    generation?: {
        prompt: string;
        resolvedPrompt: string;
        provider: string;
        modelId?: string;
        workflowId?: string;
        outputAssetIds: string[];
    };
    isInserted: boolean;
    onInsert: () => void;
    onDelete: () => void;
}) {
    const [url, setUrl] = useState("");

    useEffect(() => {
        let cancelled = false;
        resolveAssetDisplayUrl(assetReference(asset.id))
            .then((resolved) => {
                if (!cancelled) setUrl(resolved);
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [asset.id]);

    const prompt = generation?.prompt || String(asset.metadata?.prompt || "");
    const resolvedPrompt = generation?.resolvedPrompt || String(asset.metadata?.resolvedPrompt || "");
    return (
        <div className="overflow-hidden rounded-md border border-border bg-card">
            {url ? (
                <img src={url} alt={asset.filename} className="h-48 w-full object-cover" />
            ) : (
                <div className="flex h-48 items-center justify-center bg-muted text-sm text-muted-foreground">Loading...</div>
            )}
            <div className="space-y-3 p-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{asset.filename}</div>
                        <div className="text-xs text-muted-foreground">
                            {new Date(asset.createdAt).toLocaleString()}
                        </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                        <Badge variant="secondary">{asset.kind}</Badge>
                        <Badge variant="outline">{asset.source}</Badge>
                    </div>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                    {generation?.provider && <div>Provider: {generation.provider}</div>}
                    {(generation?.modelId || generation?.workflowId) && (
                        <div className="truncate">Model/workflow: {generation.modelId || generation.workflowId}</div>
                    )}
                    <div>{asset.width && asset.height ? `${asset.width} x ${asset.height}` : "Dimensions unknown"}</div>
                    <div>{isInserted ? "Inserted in chapter" : "Not detected in current content"}</div>
                </div>

                {prompt && (
                    <div className="rounded bg-muted/60 p-2 text-xs">
                        <div className="line-clamp-3 text-muted-foreground">{prompt}</div>
                    </div>
                )}

                <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={onInsert}>
                        <ImageIcon className="mr-2 h-3.5 w-3.5" />
                        Insert
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            navigator.clipboard.writeText(resolvedPrompt || prompt);
                            toast.success("Prompt copied");
                        }}
                        disabled={!prompt && !resolvedPrompt}
                    >
                        <Copy className="mr-2 h-3.5 w-3.5" />
                        Copy Prompt
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toast.info("Use this asset from an Image Generation block's source image selector.")}
                    >
                        <Wand2 className="mr-2 h-3.5 w-3.5" />
                        Reuse
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onDelete}>
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete
                    </Button>
                </div>
            </div>
        </div>
    );
}
