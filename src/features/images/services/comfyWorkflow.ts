type JsonObject = Record<string, any>;

export interface NormalizedComfyWorkflow {
    workflow: JsonObject;
    format: "api" | "ui";
    nodeCount: number;
}

export interface InferredComfyMapping {
    positivePrompt?: string;
    sourceImage?: string;
    seed?: string;
    width?: string;
    height?: string;
    outputNodeId?: string;
}

export function normalizeComfyWorkflowJson(input: unknown): NormalizedComfyWorkflow {
    const candidate = isObject(input) && isObject(input.prompt) ? input.prompt : input;

    if (isComfyApiPrompt(candidate)) {
        return {
            workflow: candidate,
            format: "api",
            nodeCount: Object.keys(candidate).length,
        };
    }

    if (isComfyUiWorkflow(candidate)) {
        const workflow = convertUiWorkflowToApiPrompt(candidate);
        return {
            workflow,
            format: "ui",
            nodeCount: Object.keys(workflow).length,
        };
    }

    throw new Error("Choose a ComfyUI API prompt JSON or a saved ComfyUI workflow JSON");
}

export function inferComfyTextToImageMapping(workflow: JsonObject): InferredComfyMapping | undefined {
    const candidates = Object.entries(workflow)
        .filter(([, node]) => isComfyNode(node) && node.class_type === "SaveImage")
        .map(([saveNodeId]) => inferMappingFromOutput(workflow, saveNodeId))
        .filter((mapping): mapping is InferredComfyMapping => Boolean(mapping?.positivePrompt && mapping.outputNodeId));

    if (candidates.length > 0) {
        return candidates.sort((a, b) => numericId(b.outputNodeId) - numericId(a.outputNodeId))[0];
    }

    const samplerEntry = Object.entries(workflow)
        .filter(([, node]) => isSamplerNode(node))
        .sort(([a], [b]) => numericId(b) - numericId(a))[0];
    if (!samplerEntry) return undefined;

    const [samplerId, sampler] = samplerEntry;
    const positiveNodeId = linkedNodeId(sampler.inputs.positive);
    const positivePrompt = positiveNodeId ? textInputPath(workflow, positiveNodeId) : firstPromptTextPath(workflow);
    if (!positivePrompt) return undefined;

    const sizeNodeId = findSizeSourceNodeId(workflow, linkedNodeId(sampler.inputs.latent_image));
    return cleanMapping({
        positivePrompt,
        seed: hasOwnInput(sampler, "seed") ? `${samplerId}.inputs.seed` : undefined,
        width: sizeNodeId ? `${sizeNodeId}.inputs.width` : undefined,
        height: sizeNodeId ? `${sizeNodeId}.inputs.height` : undefined,
    });
}

function inferMappingFromOutput(workflow: JsonObject, outputNodeId: string): InferredComfyMapping | undefined {
    const outputNode = workflow[outputNodeId];
    if (!isComfyNode(outputNode)) return undefined;

    const samplerId = findUpstreamNodeId(workflow, linkedNodeId(outputNode.inputs.images), isSamplerNode);
    const sampler = samplerId ? workflow[samplerId] : undefined;
    if (!isComfyNode(sampler)) return undefined;

    const positiveNodeId = linkedNodeId(sampler.inputs.positive);
    const positivePrompt = positiveNodeId ? textInputPath(workflow, positiveNodeId) : firstPromptTextPath(workflow);
    if (!positivePrompt) return undefined;

    const sizeNodeId = findSizeSourceNodeId(workflow, linkedNodeId(sampler.inputs.latent_image));
    return cleanMapping({
        positivePrompt,
        seed: hasOwnInput(sampler, "seed") ? `${samplerId}.inputs.seed` : undefined,
        width: sizeNodeId ? `${sizeNodeId}.inputs.width` : undefined,
        height: sizeNodeId ? `${sizeNodeId}.inputs.height` : undefined,
        outputNodeId,
    });
}

function isObject(value: unknown): value is JsonObject {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isComfyNode(value: unknown): value is { class_type: string; inputs: JsonObject } {
    return isObject(value) && typeof value.class_type === "string" && isObject(value.inputs);
}

function isComfyApiPrompt(value: unknown): value is JsonObject {
    if (!isObject(value) || Array.isArray((value as JsonObject).nodes)) return false;
    const entries = Object.values(value);
    return entries.length > 0 && entries.every(isComfyNode);
}

function isComfyUiWorkflow(value: unknown): value is { nodes: JsonObject[]; links?: any[] } {
    return isObject(value) && Array.isArray(value.nodes);
}

function convertUiWorkflowToApiPrompt(workflow: { nodes: JsonObject[]; links?: any[] }): JsonObject {
    const linksById = new Map<number, any[]>();
    for (const link of workflow.links || []) {
        if (Array.isArray(link) && typeof link[0] === "number") {
            linksById.set(link[0], link);
        }
    }

    const apiPrompt: JsonObject = {};
    for (const node of workflow.nodes) {
        if (!node || typeof node.id === "undefined" || typeof node.type !== "string") continue;
        if (node.type === "Note" || node.type === "Reroute") continue;

        const inputs: JsonObject = {};
        const widgetValues = Array.isArray(node.widgets_values) ? node.widgets_values : [];
        let widgetIndex = 0;

        for (const input of node.inputs || []) {
            if (!isObject(input) || typeof input.name !== "string") continue;

            if (typeof input.link === "number") {
                const link = linksById.get(input.link);
                if (link) {
                    inputs[input.name] = [String(link[1]), link[2]];
                }
            }

            if (isObject(input.widget) && typeof input.widget.name === "string") {
                const value = widgetValues[widgetIndex];
                widgetIndex += 1;

                if (typeof input.link !== "number" && typeof value !== "undefined") {
                    inputs[input.name] = value;
                }

                if (input.name === "seed" && isSeedControlValue(widgetValues[widgetIndex])) {
                    widgetIndex += 1;
                }
            }
        }

        apiPrompt[String(node.id)] = {
            inputs,
            class_type: node.type,
            _meta: {
                title: node.title || node.type,
            },
        };
    }

    if (Object.keys(apiPrompt).length === 0) {
        throw new Error("The workflow did not contain executable ComfyUI nodes");
    }

    return apiPrompt;
}

function isSeedControlValue(value: unknown): boolean {
    return value === "fixed" ||
        value === "randomize" ||
        value === "increment" ||
        value === "decrement";
}

function isSamplerNode(value: unknown): value is { class_type: string; inputs: JsonObject } {
    return isComfyNode(value) && (
        value.class_type === "KSampler" ||
        value.class_type === "KSamplerAdvanced" ||
        value.class_type.toLowerCase().includes("sampler")
    );
}

function linkedNodeId(value: unknown): string | undefined {
    return Array.isArray(value) && typeof value[0] !== "undefined" ? String(value[0]) : undefined;
}

function textInputPath(workflow: JsonObject, nodeId: string): string | undefined {
    const node = workflow[nodeId];
    if (!isComfyNode(node)) return undefined;
    return hasOwnInput(node, "text") ? `${nodeId}.inputs.text` : undefined;
}

function firstPromptTextPath(workflow: JsonObject): string | undefined {
    const entry = Object.entries(workflow)
        .filter(([, node]) => isComfyNode(node) && node.class_type.includes("TextEncode") && hasOwnInput(node, "text"))
        .sort(([a], [b]) => numericId(a) - numericId(b))[0];
    return entry ? `${entry[0]}.inputs.text` : undefined;
}

function findUpstreamNodeId(
    workflow: JsonObject,
    startNodeId: string | undefined,
    predicate: (node: unknown) => boolean,
    visited = new Set<string>()
): string | undefined {
    if (!startNodeId || visited.has(startNodeId)) return undefined;
    visited.add(startNodeId);

    const node = workflow[startNodeId];
    if (!isComfyNode(node)) return undefined;
    if (predicate(node)) return startNodeId;

    for (const input of Object.values(node.inputs)) {
        const nextNodeId = linkedNodeId(input);
        const found = findUpstreamNodeId(workflow, nextNodeId, predicate, visited);
        if (found) return found;
    }
    return undefined;
}

function findSizeSourceNodeId(
    workflow: JsonObject,
    startNodeId: string | undefined,
    visited = new Set<string>()
): string | undefined {
    if (!startNodeId || visited.has(startNodeId)) return undefined;
    visited.add(startNodeId);

    const node = workflow[startNodeId];
    if (!isComfyNode(node)) return undefined;
    if (hasOwnInput(node, "width") && hasOwnInput(node, "height") && !Array.isArray(node.inputs.width) && !Array.isArray(node.inputs.height)) {
        return startNodeId;
    }

    const linkedWidthSource = linkedNodeId(node.inputs.width);
    const linkedHeightSource = linkedNodeId(node.inputs.height);
    if (linkedWidthSource && linkedWidthSource === linkedHeightSource) {
        const found = findSizeSourceNodeId(workflow, linkedWidthSource, visited);
        if (found) return found;
    }

    for (const input of Object.values(node.inputs)) {
        const nextNodeId = linkedNodeId(input);
        const found = findSizeSourceNodeId(workflow, nextNodeId, visited);
        if (found) return found;
    }
    return undefined;
}

function hasOwnInput(node: { inputs: JsonObject }, inputName: string): boolean {
    return Object.prototype.hasOwnProperty.call(node.inputs, inputName);
}

function cleanMapping(mapping: InferredComfyMapping): InferredComfyMapping {
    return Object.fromEntries(Object.entries(mapping).filter(([, value]) => Boolean(value)));
}

function numericId(value: string | undefined): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : -1;
}
