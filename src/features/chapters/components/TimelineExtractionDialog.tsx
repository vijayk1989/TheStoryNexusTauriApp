import { useState, useEffect, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "react-toastify";
import { Clock, Play, Save, X, Loader2 } from "lucide-react";

import { PromptSelectMenu } from "@/components/ui/prompt-select-menu";
import type { Prompt, AllowedModel } from "@/types/story";
import { usePromptStore } from "@/features/prompts/store/promptStore";
import { useAIStore } from "@/features/ai/stores/useAIStore";
import { useChapterStore } from "@/features/chapters/stores/useChapterStore";
import { PromptParser } from "@/features/prompts/services/promptParser";
import { db } from "@/services/database";
import { aiService } from "@/services/ai/AIService";
import { processTimelineJSON } from "../services/timelineExtractor";

interface TimelineExtractionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    storyId: string;
    chapterId: string;
}

export function TimelineExtractionDialog({
    isOpen,
    onClose,
    storyId,
    chapterId,
}: TimelineExtractionDialogProps) {
    const { prompts, fetchPrompts } = usePromptStore();
    const { settings } = useAIStore();

    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | undefined>();
    const [selectedModel, setSelectedModel] = useState<AllowedModel | undefined>();
    const [generatedJson, setGeneratedJson] = useState<string>("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const abortControllerRef = useRef<AbortController | null>(null);

    // Filter for "other" prompts
    const availablePrompts = prompts.filter((p) => p.promptType === "other");

    useEffect(() => {
        if (isOpen) {
            fetchPrompts();
            setGeneratedJson("");
            setIsGenerating(false);
            setIsSaving(false);
        }
    }, [isOpen, fetchPrompts]);

    useEffect(() => {
        if (isOpen && availablePrompts.length > 0 && settings?.availableModels && !selectedPrompt && !selectedModel) {
            const defaultPrompt = availablePrompts.find(p => p.id === "timeline-extractor-system") || availablePrompts[0];
            const defaultModel = settings.availableModels.find(m => m.id === settings.defaultSceneBeatModelId) || settings.availableModels[0];
            setSelectedPrompt(defaultPrompt);
            setSelectedModel(defaultModel);
        }
    }, [isOpen, availablePrompts, settings, selectedPrompt, selectedModel]);

    const handleGenerate = async () => {
        if (!selectedPrompt || !selectedModel || !storyId || !chapterId) {
            toast.error("Please select a prompt and an AI model.");
            return;
        }

        const model = selectedModel;
        const prompt = selectedPrompt;

        setIsGenerating(true);
        setGeneratedJson("");
        abortControllerRef.current = new AbortController();

        try {
            const { getChapterPlainText } = useChapterStore.getState();
            const plainTextContent = await getChapterPlainText(chapterId);

            const parser = new PromptParser(db);
            const result = await parser.parse({ 
                promptId: prompt.id, 
                storyId, 
                chapterId,
                additionalContext: {
                    plainTextContent
                }
            });
            const messages = result.messages;
            
            const temperature = prompt.temperature ?? 0.3;
            const maxTokens = prompt.maxTokens ?? 2048;

            let response: Response;
            switch (model.provider) {
                case 'local':
                    response = await aiService.generateWithLocalModel(messages, temperature, maxTokens);
                    break;
                case 'openai':
                    response = await aiService.generateWithOpenAI(messages, model.id, temperature, maxTokens);
                    break;
                case 'openai_compatible':
                    response = await aiService.generateWithOpenAICompatible(messages, model.id, temperature, maxTokens);
                    break;
                case 'openrouter':
                    response = await aiService.generateWithOpenRouter(messages, model.id, temperature, maxTokens);
                    break;
                case 'nanogpt':
                    response = await aiService.generateWithNanoGPT(messages, model.id, temperature, maxTokens);
                    break;
                case 'google':
                    response = await aiService.generateWithGoogle(messages, model.id, temperature, maxTokens);
                    break;
                default:
                    throw new Error(`Unsupported provider: ${model.provider}`);
            }

            let fullText = "";
            await new Promise<void>((resolve, reject) => {
                aiService.processStreamedResponse(
                    response,
                    (token) => {
                        fullText += token;
                        setGeneratedJson(fullText);
                    },
                    () => resolve(),
                    (error) => reject(error)
                );
            });

            toast.success("Timeline extraction complete! You can edit the JSON before saving.");
        } catch (error: any) {
            if (error.name !== "AbortError") {
                console.error("Timeline extraction error:", error);
                toast.error(error.message || "Failed to generate timeline events.");
            }
        } finally {
            setIsGenerating(false);
            abortControllerRef.current = null;
        }
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            aiService.abortStream();
            toast.info("Generation stopped.");
        }
    };

    const handleSave = async () => {
        if (!generatedJson.trim()) {
            toast.error("No timeline data to save.");
            return;
        }

        setIsSaving(true);
        try {
            const count = await processTimelineJSON(storyId, chapterId, generatedJson);
            toast.success(`Successfully added ${count} event(s) to the Timeline!`);
            onClose();
        } catch (error: any) {
            toast.error(error.message || "Failed to save timeline events.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isGenerating && onClose()}>
            <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Clock className="w-6 h-6 text-primary" />
                        Extract Timeline Events
                    </DialogTitle>
                    <DialogDescription>
                        Generate a timeline from this chapter's text. You can review and edit the raw JSON before saving it to your Lorebook.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 flex-1 overflow-hidden mt-2">
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                            <Label>Prompt</Label>
                            <PromptSelectMenu
                                isLoading={false}
                                error={null}
                                prompts={prompts}
                                promptType="other"
                                selectedPrompt={selectedPrompt}
                                selectedModel={selectedModel}
                                onSelect={(p, m) => {
                                    setSelectedPrompt(p);
                                    setSelectedModel(m);
                                }}
                            />
                        </div>
                        <div className="flex items-end">
                            {isGenerating ? (
                                <Button variant="destructive" onClick={handleStop} className="w-32">
                                    <X className="w-4 h-4 mr-2" />
                                    Stop
                                </Button>
                            ) : (
                                <Button onClick={handleGenerate} className="w-32">
                                    <Play className="w-4 h-4 mr-2" />
                                    Generate
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-2 min-h-0">
                        <Label>Extracted JSON Output</Label>
                        <Textarea
                            className="flex-1 font-mono text-sm resize-none"
                            placeholder="JSON output will appear here..."
                            value={generatedJson}
                            onChange={(e) => setGeneratedJson(e.target.value)}
                            disabled={isGenerating}
                        />
                    </div>
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={onClose} disabled={isGenerating || isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isGenerating || isSaving || !generatedJson.trim()}>
                        {isSaving ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                        ) : (
                            <><Save className="w-4 h-4 mr-2" /> Accept & Save Timeline</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
