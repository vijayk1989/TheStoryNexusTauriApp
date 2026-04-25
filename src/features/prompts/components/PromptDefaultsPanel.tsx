import { useEffect, useState } from 'react';
import { useAIStore } from '@/features/ai/stores/useAIStore';
import { usePromptStore } from '@/features/prompts/store/promptStore';
import { PromptSelectMenu } from '@/components/ui/prompt-select-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'react-toastify';
import { Save } from 'lucide-react';
import type { Prompt, AllowedModel } from '@/types/story';

export function PromptDefaultsPanel() {
    const { settings, updatePromptDefaults } = useAIStore();
    const { prompts, fetchPrompts, isLoading: promptsLoading, error: promptsError } = usePromptStore();

    const [enableDefaults, setEnableDefaults] = useState(false);
    const [sceneBeatPrompt, setSceneBeatPrompt] = useState<Prompt | undefined>(undefined);
    const [sceneBeatModel, setSceneBeatModel] = useState<AllowedModel | undefined>(undefined);
    const [quickChatPrompt, setQuickChatPrompt] = useState<Prompt | undefined>(undefined);
    const [quickChatModel, setQuickChatModel] = useState<AllowedModel | undefined>(undefined);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchPrompts();
    }, [fetchPrompts]);

    useEffect(() => {
        if (settings) {
            setEnableDefaults(!!settings.enablePromptDefaults);
            
            if (prompts.length > 0) {
                if (settings.defaultSceneBeatPromptId) {
                    setSceneBeatPrompt(prompts.find(p => p.id === settings.defaultSceneBeatPromptId));
                }
                if (settings.defaultSceneBeatModelId && settings.availableModels) {
                    setSceneBeatModel(settings.availableModels.find(m => m.id === settings.defaultSceneBeatModelId));
                }

                if (settings.defaultQuickChatPromptId) {
                    setQuickChatPrompt(prompts.find(p => p.id === settings.defaultQuickChatPromptId));
                }
                if (settings.defaultQuickChatModelId && settings.availableModels) {
                    setQuickChatModel(settings.availableModels.find(m => m.id === settings.defaultQuickChatModelId));
                }
            }
        }
    }, [settings, prompts]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updatePromptDefaults({
                enablePromptDefaults: enableDefaults,
                defaultSceneBeatPromptId: sceneBeatPrompt?.id,
                defaultSceneBeatModelId: sceneBeatModel?.id,
                defaultQuickChatPromptId: quickChatPrompt?.id,
                defaultQuickChatModelId: quickChatModel?.id,
            });
            toast.success("Prompt defaults saved!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save defaults.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 py-4">
            <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                    <Label className="text-base font-semibold">Enable Defaults</Label>
                    <p className="text-sm text-muted-foreground">
                        Automatically apply these prompts and models to new Scene Beats and Quick Chats.
                    </p>
                </div>
                <Switch
                    checked={enableDefaults}
                    onCheckedChange={setEnableDefaults}
                />
            </div>

            <div className={`space-y-6 transition-opacity ${!enableDefaults ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="space-y-2">
                    <Label className="text-sm font-medium">Scene Beat Default</Label>
                    <p className="text-xs text-muted-foreground mb-2">Used when you create a new Scene Beat in the editor.</p>
                    <PromptSelectMenu
                        isLoading={promptsLoading}
                        error={promptsError}
                        prompts={prompts}
                        promptType="scene_beat"
                        selectedPrompt={sceneBeatPrompt}
                        selectedModel={sceneBeatModel}
                        onSelect={(prompt, model) => {
                            setSceneBeatPrompt(prompt);
                            setSceneBeatModel(model);
                        }}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-sm font-medium">Quick Chat Default</Label>
                    <p className="text-xs text-muted-foreground mb-2">Used when opening the Quick Chat panel.</p>
                    <PromptSelectMenu
                        isLoading={promptsLoading}
                        error={promptsError}
                        prompts={prompts}
                        promptType="brainstorm"
                        selectedPrompt={quickChatPrompt}
                        selectedModel={quickChatModel}
                        onSelect={(prompt, model) => {
                            setQuickChatPrompt(prompt);
                            setQuickChatModel(model);
                        }}
                    />
                </div>
            </div>

            <div className="pt-4 border-t">
                <Button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="w-full"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Defaults"}
                </Button>
            </div>
        </div>
    );
}
