import { db } from "@/services/database";
import { createPromptParser } from "@/features/prompts/services/promptParser";
import { assetRepository, type SaveAssetInput } from "./assetStorage";
import type {
    ComfyWorkflowMapping,
    AISettings,
    ImageGenerationModel,
    ImageGenerationProvider,
    ImageGenerationRecord,
    ImageGenerationSettings,
    MediaAsset,
} from "@/types/story";

export interface ImageGenerationRequest {
    storyId: string;
    chapterId?: string;
    mode: "txt2img" | "img2img";
    provider: ImageGenerationProvider;
    prompt: string;
    promptId?: string;
    modelId?: string;
    sourceAssetId?: string;
    settings: ImageGenerationSettings;
}

export interface ImageGenerationResult {
    generation: ImageGenerationRecord;
    assets: MediaAsset[];
}

async function getImageGenerationSettings(): Promise<AISettings | undefined> {
    const settings = await db.aiSettings.toArray();
    return settings.find(item => item.openrouterKey?.trim()) || settings[0];
}

export async function fetchOpenRouterImageModels(): Promise<ImageGenerationModel[]> {
    const settings = await getImageGenerationSettings();
    if (!settings?.openrouterKey?.trim()) {
        throw new Error("OpenRouter API key is not set");
    }

    const response = await fetch("https://openrouter.ai/api/v1/models?output_modalities=image", {
        headers: {
            Authorization: `Bearer ${settings.openrouterKey}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch OpenRouter image models (${response.status})`);
    }

    const data = await response.json();
    return (data.data || []).map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        provider: "openrouter" as const,
        supportsImageInput: Boolean(
            model.input_modalities?.includes?.("image") ||
            model.architecture?.input_modalities?.includes?.("image")
        ),
        outputModalities: model.output_modalities || model.architecture?.output_modalities || [],
    }));
}

export async function persistOpenRouterImageModels(): Promise<ImageGenerationModel[]> {
    const models = await fetchOpenRouterImageModels();
    const settings = await getImageGenerationSettings();
    if (settings) {
        await db.aiSettings.update(settings.id, { openRouterImageModels: models });
    }
    return models;
}

export async function generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const createdAt = new Date();
    const generation: ImageGenerationRecord = {
        id: crypto.randomUUID(),
        createdAt,
        storyId: request.storyId,
        chapterId: request.chapterId,
        mode: request.mode,
        provider: request.provider,
        prompt: request.prompt,
        resolvedPrompt: "",
        promptId: request.promptId,
        modelId: request.modelId,
        sourceAssetIds: request.sourceAssetId ? [request.sourceAssetId] : [],
        outputAssetIds: [],
        settings: request.settings,
        status: "running",
    };

    await db.imageGenerations.add(generation);

    try {
        const resolvedPrompt = await resolveImagePrompt(request);
        const assetInputs = request.provider === "openrouter"
            ? await generateWithOpenRouter({ ...request, resolvedPrompt, generationId: generation.id })
            : await generateWithComfyUI({ ...request, resolvedPrompt, generationId: generation.id });

        const assets = await Promise.all(
            assetInputs.map(input => assetRepository.saveAsset({
                ...input,
                storyId: request.storyId,
                chapterId: request.chapterId,
                kind: "generated",
            }))
        );

        const completedAt = new Date();
        const update: Partial<ImageGenerationRecord> = {
            resolvedPrompt,
            outputAssetIds: assets.map(asset => asset.id),
            status: "succeeded",
            completedAt,
        };
        await db.imageGenerations.update(generation.id, update);

        return {
            generation: { ...generation, ...update },
            assets,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Image generation failed";
        await db.imageGenerations.update(generation.id, {
            status: "failed",
            error: message,
            completedAt: new Date(),
        });
        throw error;
    }
}

async function resolveImagePrompt(request: ImageGenerationRequest): Promise<string> {
    if (!request.promptId) return request.prompt;

    const parser = createPromptParser();
    const { messages, error } = await parser.parse({
        storyId: request.storyId,
        chapterId: request.chapterId,
        promptId: request.promptId,
        scenebeat: request.prompt,
    });

    if (error) throw new Error(error);
    if (messages.length !== 1 || messages[0].role !== "user") {
        throw new Error("Image generation prompts must resolve to exactly one user message");
    }

    return messages[0].content || request.prompt;
}

async function generateWithOpenRouter(
    request: ImageGenerationRequest & { resolvedPrompt: string; generationId: string }
): Promise<Array<Omit<SaveAssetInput, "storyId" | "chapterId" | "kind">>> {
    const settings = await getImageGenerationSettings();
    if (!settings?.openrouterKey?.trim()) {
        throw new Error("OpenRouter API key is not set");
    }
    const model = request.modelId || settings.defaultOpenRouterImageModelId;
    if (!model) {
        throw new Error("Select an OpenRouter image model before generating");
    }
    const selectedImageModel = settings.openRouterImageModels?.find(item => item.id === model);
    const outputModalities = selectedImageModel?.outputModalities || [];
    const modalities = outputModalities.includes("text") ? ["image", "text"] : ["image"];

    let content: string | any[] = request.resolvedPrompt;
    if (request.mode === "img2img") {
        if (!request.sourceAssetId) throw new Error("Image-to-image requires a source image");
        const source = await db.mediaAssets.get(request.sourceAssetId);
        const bytes = await assetRepository.readAssetBytes(request.sourceAssetId);
        content = [{ type: "text", text: request.resolvedPrompt }];
        content.push({
            type: "image_url",
            image_url: {
                url: bytesToDataUrl(bytes, source?.mimeType || "image/png"),
            },
        });
    }

    const sendRequest = (requestedModalities: string[]) => fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.openrouterKey}`,
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "The Story Nexus",
        },
        body: JSON.stringify({
            model,
            messages: [{ role: "user", content }],
            modalities: requestedModalities,
            image_config: {
                width: request.settings.width,
                height: request.settings.height,
                aspect_ratio: request.settings.aspectRatio,
            },
        }),
    });

    let response = await sendRequest(modalities);
    if (!response.ok && response.status === 404 && outputModalities.length === 0) {
        response = await sendRequest(["image", "text"]);
    }

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`OpenRouter image generation failed (${response.status})${text ? `: ${text}` : ""}`);
    }

    const data = await response.json();
    const images = extractOpenRouterImages(data);
    if (!images.length) {
        throw new Error("OpenRouter returned no images");
    }

    return images.map((dataUrl, index) => ({
        source: "openrouter" as const,
        dataUrl,
        mimeType: mimeFromDataUrl(dataUrl) || "image/png",
        filename: `openrouter-image-${Date.now()}-${index + 1}.${extensionFromDataUrl(dataUrl)}`,
        metadata: {
            provider: "openrouter",
            generationId: request.generationId,
            modelId: model,
            prompt: request.prompt,
            resolvedPrompt: request.resolvedPrompt,
            settings: request.settings,
        },
    }));
}

async function generateWithComfyUI(
    request: ImageGenerationRequest & { resolvedPrompt: string; generationId: string }
): Promise<Array<Omit<SaveAssetInput, "storyId" | "chapterId" | "kind">>> {
    const settings = await getImageGenerationSettings();
    const baseUrl = settings?.comfyBaseUrl?.trim() || "http://127.0.0.1:8188";
    const workflowJson = request.mode === "img2img"
        ? settings?.comfyImg2ImgWorkflowJson
        : settings?.comfyTxt2ImgWorkflowJson;
    const mapping = request.mode === "img2img"
        ? settings?.comfyImg2ImgMapping
        : settings?.comfyTxt2ImgMapping;

    if (!workflowJson?.trim()) throw new Error("Configure a ComfyUI workflow JSON in AI Settings");
    if (!mapping?.positivePrompt || !mapping.outputNodeId) {
        throw new Error("Configure ComfyUI prompt and output mappings before generating");
    }

    const workflow = JSON.parse(workflowJson);
    patchWorkflowValue(workflow, mapping.positivePrompt, request.resolvedPrompt);
    patchOptional(workflow, mapping.seed, request.settings.seedMode === "fixed" ? request.settings.seed : randomSeed());
    patchOptional(workflow, mapping.width, request.settings.width);
    patchOptional(workflow, mapping.height, request.settings.height);
    patchOptional(workflow, mapping.steps, request.settings.steps);
    patchOptional(workflow, mapping.cfg, request.settings.cfg);

    if (request.mode === "img2img") {
        if (!request.sourceAssetId) throw new Error("Image-to-image requires a source image");
        if (!mapping.sourceImage) throw new Error("Configure the ComfyUI source image mapping");
        const uploadedName = await uploadComfySourceImage(baseUrl, request.sourceAssetId);
        patchWorkflowValue(workflow, mapping.sourceImage, uploadedName);
    }

    const promptResponse = await fetch(`${baseUrl}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: workflow }),
    });

    if (!promptResponse.ok) {
        const text = await promptResponse.text().catch(() => "");
        throw new Error(`ComfyUI prompt submission failed (${promptResponse.status})${text ? `: ${text}` : ""}`);
    }

    const promptData = await promptResponse.json();
    const promptId = promptData.prompt_id;
    if (!promptId) throw new Error("ComfyUI did not return a prompt id");

    const history = await pollComfyHistory(baseUrl, promptId);
    const outputImages = extractComfyOutputs(history, mapping);
    if (!outputImages.length) throw new Error("ComfyUI returned no output images");

    const assets: Array<Omit<SaveAssetInput, "storyId" | "chapterId" | "kind">> = [];
    for (const [index, image] of outputImages.entries()) {
        const params = new URLSearchParams({
            filename: image.filename,
            subfolder: image.subfolder || "",
            type: image.type || "output",
        });
        const response = await fetch(`${baseUrl}/view?${params.toString()}`);
        if (!response.ok) throw new Error(`Failed to fetch ComfyUI output image (${response.status})`);
        const blob = await response.blob();
        assets.push({
            source: "comfyui",
            blob,
            mimeType: blob.type || "image/png",
            filename: image.filename || `comfyui-image-${Date.now()}-${index + 1}.png`,
            metadata: {
                provider: "comfyui",
                generationId: request.generationId,
                promptId,
                prompt: request.prompt,
                resolvedPrompt: request.resolvedPrompt,
                settings: request.settings,
            },
        });
    }

    return assets;
}

async function uploadComfySourceImage(baseUrl: string, assetId: string): Promise<string> {
    const asset = await db.mediaAssets.get(assetId);
    const bytes = await assetRepository.readAssetBytes(assetId);
    const file = new File([bytes], asset?.filename || `${assetId}.png`, {
        type: asset?.mimeType || "image/png",
    });
    const formData = new FormData();
    formData.append("image", file);
    formData.append("overwrite", "true");

    const response = await fetch(`${baseUrl}/upload/image`, {
        method: "POST",
        body: formData,
    });
    if (!response.ok) throw new Error(`ComfyUI source upload failed (${response.status})`);
    const data = await response.json();
    return data.name || file.name;
}

async function pollComfyHistory(baseUrl: string, promptId: string): Promise<any> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 120000) {
        const response = await fetch(`${baseUrl}/history/${promptId}`);
        if (response.ok) {
            const history = await response.json();
            const result = history[promptId];
            if (result) {
                throwIfComfyExecutionFailed(result);
                return result;
            }
        }
        await new Promise(resolve => setTimeout(resolve, 1200));
    }
    throw new Error("Timed out waiting for ComfyUI output");
}

function throwIfComfyExecutionFailed(historyResult: any): void {
    if (historyResult?.status?.status_str !== "error") return;

    const executionError = historyResult.status.messages
        ?.map((message: any[]) => message?.[1])
        ?.find((payload: any) => payload?.exception_message || payload?.exception_type);
    const node = executionError?.node_id ? ` at node ${executionError.node_id}` : "";
    const type = executionError?.exception_type ? `${executionError.exception_type}: ` : "";
    const message = String(executionError?.exception_message || "ComfyUI execution failed").trim();

    throw new Error(`ComfyUI execution failed${node}: ${type}${message}`);
}

function extractComfyOutputs(history: any, mapping: ComfyWorkflowMapping): Array<{ filename: string; subfolder?: string; type?: string }> {
    const outputNode = mapping.outputNodeId ? history?.outputs?.[mapping.outputNodeId] : undefined;
    const images = outputNode?.images;
    if (Array.isArray(images)) return images;

    return Object.values(history?.outputs || {})
        .flatMap((output: any) => Array.isArray(output?.images) ? output.images : []);
}

function extractOpenRouterImages(data: any): string[] {
    const images: string[] = [];
    const choices = data?.choices || [];
    for (const choice of choices) {
        const message = choice.message || {};
        for (const image of message.images || []) {
            const url = image?.imageUrl?.url || image?.image_url?.url || image?.url;
            if (typeof url === "string") images.push(url);
        }
        const content = Array.isArray(message.content) ? message.content : [];
        for (const part of content) {
            const url = part?.imageUrl?.url || part?.image_url?.url || part?.url;
            if (typeof url === "string") images.push(url);
        }
    }
    return images;
}

function patchOptional(workflow: any, path: string | undefined, value: unknown): void {
    if (path && value !== undefined && value !== null && value !== "") {
        patchWorkflowValue(workflow, path, value);
    }
}

function patchWorkflowValue(workflow: any, path: string, value: unknown): void {
    const parts = path.split(".").filter(Boolean);
    if (parts.length === 0) throw new Error("Invalid ComfyUI mapping path");

    let target = workflow;
    for (const part of parts.slice(0, -1)) {
        if (!(part in target)) {
            throw new Error(`ComfyUI mapping path is missing: ${path}`);
        }
        target = target[part];
    }
    target[parts[parts.length - 1]] = value;
}

function randomSeed(): number {
    return Math.floor(Math.random() * 2147483647);
}

function bytesToDataUrl(bytes: Uint8Array, mimeType: string): string {
    let binary = "";
    bytes.forEach(byte => {
        binary += String.fromCharCode(byte);
    });
    return `data:${mimeType};base64,${btoa(binary)}`;
}

function mimeFromDataUrl(dataUrl: string): string | null {
    const match = dataUrl.match(/^data:([^;,]+)[;,]/);
    return match?.[1] || null;
}

function extensionFromDataUrl(dataUrl: string): string {
    const mime = mimeFromDataUrl(dataUrl) || "image/png";
    if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
    if (mime.includes("webp")) return "webp";
    return "png";
}
