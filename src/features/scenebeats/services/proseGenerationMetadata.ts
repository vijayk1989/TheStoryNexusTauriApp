import type { AllowedModel, PromptMessage, ProseGenerationMetadata } from "@/types/story";

export function captureProseGeneration(
    sceneBeat: { sceneBeatId: string; command: string },
    prompt: { id: string; name: string },
    messages: PromptMessage[],
    model: AllowedModel | undefined,
    mode: ProseGenerationMetadata["mode"],
): ProseGenerationMetadata {
    return structuredClone({
        id: crypto.randomUUID(),
        sceneBeatId: sceneBeat.sceneBeatId,
        sceneBeatCommand: sceneBeat.command,
        generatedAt: new Date().toISOString(),
        model,
        promptId: prompt.id,
        promptName: prompt.name,
        promptMessages: messages,
        mode,
    });
}
