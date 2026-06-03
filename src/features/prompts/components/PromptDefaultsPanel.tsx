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
import { getPreferredDefaultModel, resolveSavedDefaultModel } from '@/features/ai/utils/defaultModels';

export function PromptDefaultsPanel() {
    const { settings, updatePromptDefaults } = useAIStore();
    const { prompts, fetchPrompts, isLoading: promptsLoading, error: promptsError } = usePromptStore();

    const [enableDefaults, setEnableDefaults] = useState(false);
    const [sceneBeatPrompt, setSceneBeatPrompt] = useState<Prompt | undefined>(undefined);
    const [sceneBeatModel, setSceneBeatModel] = useState<AllowedModel | undefined>(undefined);
    const [brainstormPrompt, setBrainstormPrompt] = useState<Prompt | undefined>(undefined);
    const [brainstormModel, setBrainstormModel] = useState<AllowedModel | undefined>(undefined);
    const [agentModel, setAgentModel] = useState<AllowedModel | undefined>(undefined);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchPrompts();
    }, [fetchPrompts]);

    useEffect(() => {
        if (settings) {
            setEnableDefaults(!!settings.enablePromptDefaults);
            const preferredDefaultModel = getPreferredDefaultModel(settings);
            
            if (prompts.length > 0) {
                setSceneBeatPrompt(
                    prompts.find(p => p.id === settings.defaultSceneBeatPromptId) ||
                    prompts.find(p => p.promptType === 'scene_beat')
                );
                setBrainstormPrompt(
                    prompts.find(p => p.id === settings.defaultBrainstormPromptId) ||
                    prompts.find(p => p.promptType === 'brainstorm')
                );
            }

            setSceneBeatModel(resolveSavedDefaultModel(settings, settings.defaultSceneBeatModelId));
            setBrainstormModel(resolveSavedDefaultModel(settings, settings.defaultBrainstormModelId));
            setAgentModel(resolveSavedDefaultModel(settings, settings.defaultAgentModelId) || preferredDefaultModel);
        }
    }, [settings, prompts]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updatePromptDefaults({
                enablePromptDefaults: enableDefaults,
                defaultSceneBeatPromptId: sceneBeatPrompt?.id,
                defaultSceneBeatModelId: sceneBeatModel?.id,
                defaultBrainstormPromptId: brainstormPrompt?.id,
                defaultBrainstormModelId: brainstormModel?.id,
                defaultAgentModelId: agentModel?.id,
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
                        Automatically apply these prompts and models to new Scene Beats, Brainstorm chats, and Agents.
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
                    <Label className="text-sm font-medium">Brainstorm Default</Label>
                    <p className="text-xs text-muted-foreground mb-2">Used when you start normal, non-agentic brainstorm generation.</p>
                    <PromptSelectMenu
                        isLoading={promptsLoading}
                        error={promptsError}
                        prompts={prompts}
                        promptType="brainstorm"
                        selectedPrompt={brainstormPrompt}
                        selectedModel={brainstormModel}
                        onSelect={(prompt, model) => {
                            setBrainstormPrompt(prompt);
                            setBrainstormModel(model);
                        }}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-sm font-medium">Agent Default Model</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                        Used for new agents. Defaults to Google Gemma on OpenRouter, or your first local model when OpenRouter is not configured.
                    </p>
                    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                        <div className="font-medium">{agentModel?.name || 'No model selected'}</div>
                        {agentModel && (
                            <div className="text-xs text-muted-foreground">{agentModel.provider}</div>
                        )}
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAgentModel(getPreferredDefaultModel(settings))}
                    >
                        Use Recommended Default
                    </Button>
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
