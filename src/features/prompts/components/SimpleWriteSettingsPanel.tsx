import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "react-toastify";

import { PromptSelectMenu } from "@/components/ui/prompt-select-menu";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAIStore } from "@/features/ai/stores/useAIStore";
import { resolveSavedDefaultModel } from "@/features/ai/utils/defaultModels";
import { SUPPLIED_CONTINUE_WRITING_PROMPT_ID } from "@/features/prompts/constants";
import { usePromptStore } from "@/features/prompts/store/promptStore";
import type { AllowedModel, Prompt } from "@/types/story";

export function SimpleWriteSettingsPanel() {
    const { settings, initialize, updatePromptDefaults } = useAIStore();
    const { prompts, fetchPrompts, isLoading: promptsLoading, error: promptsError } = usePromptStore();
    const [useCustomPrompt, setUseCustomPrompt] = useState(false);
    const [includeAfterCursor, setIncludeAfterCursor] = useState(false);
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | undefined>(undefined);
    const [selectedModel, setSelectedModel] = useState<AllowedModel | undefined>(undefined);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        initialize();
        fetchPrompts();
    }, [fetchPrompts, initialize]);

    useEffect(() => {
        if (!settings || prompts.length === 0) return;

        const suppliedPrompt = prompts.find((prompt) => prompt.id === SUPPLIED_CONTINUE_WRITING_PROMPT_ID);
        const savedPrompt = settings.defaultContinueWritingPromptId
            ? prompts.find((prompt) => prompt.id === settings.defaultContinueWritingPromptId)
            : undefined;
        const customFallback = prompts.find(
            (prompt) => prompt.promptType === "continue_writing" && !prompt.isSystem
        );
        const nextUseCustomPrompt = !!settings.simpleWriteUseCustomPrompt;
        const nextPrompt = nextUseCustomPrompt
            ? savedPrompt || customFallback || suppliedPrompt
            : suppliedPrompt || savedPrompt || prompts.find((prompt) => prompt.promptType === "continue_writing");

        setUseCustomPrompt(nextUseCustomPrompt);
        setIncludeAfterCursor(!!settings.simpleWriteIncludeAfterCursor);
        setSelectedPrompt(nextPrompt);
        setSelectedModel(
            resolveSavedDefaultModel(settings, settings.defaultContinueWritingModelId) ||
            nextPrompt?.allowedModels[0]
        );
    }, [prompts, settings]);

    const handleSave = async () => {
        const suppliedPrompt = prompts.find((prompt) => prompt.id === SUPPLIED_CONTINUE_WRITING_PROMPT_ID);
        const promptToSave = useCustomPrompt ? selectedPrompt : suppliedPrompt || selectedPrompt;

        if (!promptToSave || !selectedModel) {
            toast.error("Select a Continue Writing prompt and model first.");
            return;
        }

        setIsSaving(true);
        try {
            await updatePromptDefaults({
                simpleWriteUseCustomPrompt: useCustomPrompt,
                simpleWriteIncludeAfterCursor: includeAfterCursor,
                defaultContinueWritingPromptId: promptToSave.id,
                defaultContinueWritingModelId: selectedModel.id,
            });
            toast.success("Simple Write settings saved.");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save Simple Write settings.");
        } finally {
            setIsSaving(false);
        }
    };

    const continuePrompts = prompts.filter((prompt) => prompt.promptType === "continue_writing");
    const suppliedPrompt = continuePrompts.find((prompt) => prompt.id === SUPPLIED_CONTINUE_WRITING_PROMPT_ID);

    return (
        <div className="space-y-6 py-4">
            <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                    <Label className="text-base font-semibold">Custom Prompt</Label>
                    <p className="text-sm text-muted-foreground">
                        Use your own Continue Writing prompt instead of the supplied Simple Write prompt.
                    </p>
                </div>
                <Switch
                    checked={useCustomPrompt}
                    onCheckedChange={(checked) => {
                        setUseCustomPrompt(checked);
                        const nextPrompt = checked
                            ? continuePrompts.find((prompt) => !prompt.isSystem) || suppliedPrompt
                            : suppliedPrompt;
                        if (nextPrompt) {
                            setSelectedPrompt(nextPrompt);
                            setSelectedModel(nextPrompt.allowedModels[0] || selectedModel);
                        }
                    }}
                />
            </div>

            {!useCustomPrompt && (
                <div className="space-y-4 rounded-md border bg-muted/30 px-3 py-3 text-sm">
                    <div>
                        <div className="font-medium">{suppliedPrompt?.name || "Continue Writing"}</div>
                        <div className="text-xs text-muted-foreground">Supplied Simple Write prompt</div>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t pt-3">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-medium">Include Words After Cursor</Label>
                            <p className="text-xs text-muted-foreground">
                                Give Simple Write nearby downstream prose so inserted text can bridge into it.
                            </p>
                        </div>
                        <Switch
                            checked={includeAfterCursor}
                            onCheckedChange={setIncludeAfterCursor}
                        />
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <Label className="text-sm font-medium">
                    {useCustomPrompt ? "Continue Writing Prompt" : "Generation Model"}
                </Label>
                <PromptSelectMenu
                    isLoading={promptsLoading}
                    error={promptsError}
                    prompts={useCustomPrompt ? continuePrompts : suppliedPrompt ? [suppliedPrompt] : continuePrompts}
                    promptType="continue_writing"
                    selectedPrompt={selectedPrompt}
                    selectedModel={selectedModel}
                    onSelect={(prompt, model) => {
                        setSelectedPrompt(prompt);
                        setSelectedModel(model);
                    }}
                />
            </div>

            <div className="pt-4 border-t">
                <Button onClick={handleSave} disabled={isSaving} className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Simple Write Settings"}
                </Button>
            </div>
        </div>
    );
}
