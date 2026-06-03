import type {
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import {
  $applyNodeReplacement,
  $createParagraphNode,
  $getNodeByKey,
  DecoratorNode,
} from "lexical";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ImageIcon, Loader2, Trash2, ChevronDown, ChevronUp, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStoryContext } from "@/features/stories/context/StoryContext";
import { usePromptStore } from "@/features/prompts/store/promptStore";
import { useImageGenerationStore } from "@/features/images/stores/useImageGenerationStore";
import { assetReference, resolveAssetDisplayUrl } from "@/features/images/services/assetStorage";
import type { AISettings, ImageGenerationProvider, MediaAsset } from "@/types/story";
import { db } from "@/services/database";
import { toast } from "react-toastify";
import { $createAssetImageNode } from "./AssetImageNode";

export type SerializedImageGenerationNode = Spread<
  {
    type: "image-generation";
    version: 1;
    prompt: string;
    collapsed: boolean;
    lastGenerationId?: string;
  },
  SerializedLexicalNode
>;

function AssetPreview({ asset, selected, onSelect }: { asset: MediaAsset; selected?: boolean; onSelect?: () => void }) {
  const [url, setUrl] = useState<string>("");

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

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`overflow-hidden rounded-md border bg-background text-left ${selected ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
    >
      {url ? (
        <img src={url} alt={asset.filename} className="h-36 w-full object-cover" />
      ) : (
        <div className="flex h-36 items-center justify-center text-xs text-muted-foreground">Loading...</div>
      )}
      <div className="truncate px-2 py-1 text-xs text-muted-foreground">{asset.filename}</div>
    </button>
  );
}

function selectImageSettings(settings: AISettings[]): AISettings | undefined {
  return settings.find((item) => item.openrouterKey?.trim()) || settings[0];
}

function ImageGenerationComponent({
  nodeKey,
  prompt: initialPrompt,
  collapsed: initialCollapsed,
}: {
  nodeKey: NodeKey;
  prompt: string;
  collapsed: boolean;
}) {
  const [editor] = useLexicalComposerContext();
  const { currentStoryId, currentChapterId } = useStoryContext();
  const { prompts, fetchPrompts } = usePromptStore();
  const {
    assets,
    openRouterImageModels,
    generate,
    saveUploadedAsset,
    loadGallery,
    refreshOpenRouterImageModels,
  } = useImageGenerationStore();

  const [prompt, setPrompt] = useState(initialPrompt);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mode, setMode] = useState<"txt2img" | "img2img">("txt2img");
  const [provider, setProvider] = useState<ImageGenerationProvider>("openrouter");
  const [promptId, setPromptId] = useState<string>("none");
  const [modelId, setModelId] = useState<string>("");
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [steps, setSteps] = useState(20);
  const [cfg, setCfg] = useState(4);
  const [seedMode, setSeedMode] = useState<"random" | "fixed">("random");
  const [seed, setSeed] = useState<number>(1);
  const [imageStrength, setImageStrength] = useState<number>(0.65);
  const [sourceAssetId, setSourceAssetId] = useState<string>("");
  const [resultAssets, setResultAssets] = useState<MediaAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const imagePrompts = useMemo(
    () => prompts.filter((item) => item.promptType === "image_gen"),
    [prompts],
  );
  const galleryAssets = useMemo(
    () => assets.filter((asset) => !asset.archivedAt),
    [assets],
  );
  const sourceAssets = useMemo(
    () => galleryAssets.filter((asset) => asset.kind === "uploaded" || asset.kind === "generated"),
    [galleryAssets],
  );

  useEffect(() => {
    fetchPrompts().catch(() => undefined);
  }, [fetchPrompts]);

  useEffect(() => {
    if (currentStoryId) {
      loadGallery(currentStoryId).catch(() => undefined);
    }
  }, [currentStoryId, loadGallery]);

  useEffect(() => {
    db.aiSettings.toArray().then((settings) => {
      const current = selectImageSettings(settings);
      if (!current) return;
      setProvider(current.defaultImageProvider || "openrouter");
      setPromptId(current.defaultImagePromptId || "none");
      setModelId(current.defaultOpenRouterImageModelId || "");
      setWidth(current.defaultImageWidth || 1024);
      setHeight(current.defaultImageHeight || 1024);
      setSteps(current.defaultImageSteps || 20);
      setCfg(current.defaultImageCfg || 4);
      setSeedMode(current.defaultImageSeedMode || "random");
    });
  }, []);

  useEffect(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (node instanceof ImageGenerationNode) {
        node.setPrompt(prompt);
      }
    });
  }, [editor, nodeKey, prompt]);

  useEffect(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (node instanceof ImageGenerationNode) {
        node.setCollapsed(collapsed);
      }
    });
  }, [editor, nodeKey, collapsed]);

  const handleGenerate = async () => {
    if (!currentStoryId) return;
    if (!prompt.trim()) {
      toast.error("Enter an image prompt first");
      return;
    }
    if (mode === "img2img" && !sourceAssetId) {
      toast.error("Choose or upload a source image first");
      return;
    }

    setIsGenerating(true);
    try {
      const generated = await generate({
        storyId: currentStoryId,
        chapterId: currentChapterId || undefined,
        mode,
        provider,
        prompt,
        promptId: promptId === "none" ? undefined : promptId,
        modelId: provider === "openrouter" ? modelId : undefined,
        sourceAssetId: mode === "img2img" ? sourceAssetId : undefined,
        settings: {
          width,
          height,
          steps,
          cfg,
          seedMode,
          seed: seedMode === "fixed" ? seed : undefined,
          imageStrength,
        },
      });
      setResultAssets(generated);
      setSelectedAssetId(generated[0]?.id || "");
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if (node instanceof ImageGenerationNode) {
          node.setLastGenerationId(generated[0]?.metadata?.generationId as string || "");
        }
      });
      toast.success("Image generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUploadSource = async (file: File | undefined) => {
    if (!file || !currentStoryId) return;
    try {
      const asset = await saveUploadedAsset({
        storyId: currentStoryId,
        chapterId: currentChapterId || undefined,
        file,
        metadata: { usage: "image-to-image source" },
      });
      setSourceAssetId(asset.id);
      toast.success("Source image saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    }
  };

  const insertSelected = () => {
    const assetId = selectedAssetId || resultAssets[0]?.id;
    if (!assetId) return;
    const asset = [...resultAssets, ...assets].find((item) => item.id === assetId);
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      const imageNode = $createAssetImageNode({
        src: assetReference(assetId),
        altText: asset?.filename || "Generated image",
        maxWidth: 720,
      });
      if (node) {
        node.insertAfter($createParagraphNode());
        node.insertAfter(imageNode);
      }
    });
    toast.success("Image inserted into chapter");
  };

  const deleteBlock = () => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      node?.remove();
    });
  };

  return (
    <div className="my-4 overflow-hidden rounded-md border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 font-medium">
          <ImageIcon className="h-4 w-4 text-primary" />
          Image Generation
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={deleteBlock}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-4 p-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={mode} onValueChange={(value: "txt2img" | "img2img") => setMode(value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="txt2img">Text to Image</SelectItem>
                  <SelectItem value="img2img">Image to Image</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={(value: ImageGenerationProvider) => setProvider(value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                  <SelectItem value="comfyui">ComfyUI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Prompt</Label>
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe the image to generate..."
              className="min-h-[120px]"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Prompt Preset</Label>
              <Select value={promptId} onValueChange={setPromptId}>
                <SelectTrigger><SelectValue placeholder="Optional preset" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Raw prompt</SelectItem>
                  {imagePrompts.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {provider === "openrouter" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Image Model</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => refreshOpenRouterImageModels()}>
                    Refresh
                  </Button>
                </div>
                <Select value={modelId} onValueChange={setModelId}>
                  <SelectTrigger><SelectValue placeholder="Select image model" /></SelectTrigger>
                  <SelectContent>
                    {openRouterImageModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            <div className="space-y-2">
              <Label>Width</Label>
              <Input type="number" min={64} value={width} onChange={(event) => setWidth(Number(event.target.value) || 1024)} />
            </div>
            <div className="space-y-2">
              <Label>Height</Label>
              <Input type="number" min={64} value={height} onChange={(event) => setHeight(Number(event.target.value) || 1024)} />
            </div>
            <div className="space-y-2">
              <Label>Steps</Label>
              <Input type="number" min={1} value={steps} onChange={(event) => setSteps(Number(event.target.value) || 20)} />
            </div>
            <div className="space-y-2">
              <Label>CFG</Label>
              <Input type="number" min={0} step={0.1} value={cfg} onChange={(event) => setCfg(Number(event.target.value) || 4)} />
            </div>
            <div className="space-y-2">
              <Label>Seed</Label>
              <Select value={seedMode} onValueChange={(value: "random" | "fixed") => setSeedMode(value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="random">Random</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {seedMode === "fixed" && (
            <div className="space-y-2">
              <Label>Fixed Seed</Label>
              <Input type="number" value={seed} onChange={(event) => setSeed(Number(event.target.value) || 1)} />
            </div>
          )}

          {mode === "img2img" && (
            <div className="space-y-3 rounded-md border border-border p-3">
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <Label>Source Image</Label>
                  <Select value={sourceAssetId} onValueChange={setSourceAssetId}>
                    <SelectTrigger><SelectValue placeholder="Select a saved image" /></SelectTrigger>
                    <SelectContent>
                      {sourceAssets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>{asset.filename}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Upload</Label>
                  <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm">
                    <Upload className="h-4 w-4" />
                    File
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => handleUploadSource(event.target.files?.[0])} />
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Image Strength</Label>
                <Input type="number" min={0} max={1} step={0.05} value={imageStrength} onChange={(event) => setImageStrength(Number(event.target.value) || 0.65)} />
              </div>
              {sourceAssetId && (
                <div className="max-w-xs">
                  {sourceAssets.filter((asset) => asset.id === sourceAssetId).map((asset) => (
                    <AssetPreview key={asset.id} asset={asset} selected />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
              Generate
            </Button>
            <Button type="button" variant="outline" onClick={insertSelected} disabled={!selectedAssetId && resultAssets.length === 0}>
              Insert
            </Button>
          </div>

          {resultAssets.length > 0 && (
            <div className="grid gap-3 md:grid-cols-3">
              {resultAssets.map((asset) => (
                <AssetPreview
                  key={asset.id}
                  asset={asset}
                  selected={selectedAssetId === asset.id}
                  onSelect={() => setSelectedAssetId(asset.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export class ImageGenerationNode extends DecoratorNode<JSX.Element> {
  __prompt: string;
  __collapsed: boolean;
  __lastGenerationId: string;

  constructor(prompt = "", collapsed = false, lastGenerationId = "", key?: NodeKey) {
    super(key);
    this.__prompt = prompt;
    this.__collapsed = collapsed;
    this.__lastGenerationId = lastGenerationId;
  }

  static getType(): string {
    return "image-generation";
  }

  static clone(node: ImageGenerationNode): ImageGenerationNode {
    return new ImageGenerationNode(node.__prompt, node.__collapsed, node.__lastGenerationId, node.__key);
  }

  static importJSON(serializedNode: SerializedImageGenerationNode): ImageGenerationNode {
    return $createImageGenerationNode(
      serializedNode.prompt || "",
      serializedNode.collapsed || false,
      serializedNode.lastGenerationId || "",
    );
  }

  exportJSON(): SerializedImageGenerationNode {
    return {
      type: "image-generation",
      version: 1,
      prompt: this.__prompt,
      collapsed: this.__collapsed,
      lastGenerationId: this.__lastGenerationId,
    };
  }

  setPrompt(prompt: string): void {
    if (this.__prompt === prompt) return;
    const writable = this.getWritable();
    writable.__prompt = prompt;
  }

  setCollapsed(collapsed: boolean): void {
    if (this.__collapsed === collapsed) return;
    const writable = this.getWritable();
    writable.__collapsed = collapsed;
  }

  setLastGenerationId(id: string): void {
    if (this.__lastGenerationId === id) return;
    const writable = this.getWritable();
    writable.__lastGenerationId = id;
  }

  createDOM(): HTMLElement {
    const div = document.createElement("div");
    div.className = "image-generation-node";
    return div;
  }

  updateDOM(): boolean {
    return false;
  }

  isInline(): boolean {
    return false;
  }

  decorate(): JSX.Element {
    return (
      <Suspense fallback={null}>
        <ImageGenerationComponent
          nodeKey={this.__key}
          prompt={this.__prompt}
          collapsed={this.__collapsed}
        />
      </Suspense>
    );
  }
}

export function $createImageGenerationNode(prompt = "", collapsed = false, lastGenerationId = ""): ImageGenerationNode {
  return $applyNodeReplacement(new ImageGenerationNode(prompt, collapsed, lastGenerationId));
}

export function $isImageGenerationNode(
  node: LexicalNode | null | undefined,
): node is ImageGenerationNode {
  return node instanceof ImageGenerationNode;
}
