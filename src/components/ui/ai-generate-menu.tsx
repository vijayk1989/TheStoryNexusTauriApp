import { AIModel, Prompt, AllowedModel } from "@/types/story";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarSub, MenubarSubContent, MenubarSubTrigger, MenubarTrigger } from "./menubar";
import { Loader2, ChevronDown } from "lucide-react";
import { openPromptsPanel } from "@/features/prompts/utils/openPromptsPanel";

interface AIGenerateMenuProps {
    isGenerating: boolean;
    isLoading: boolean;
    error: string | null;
    prompts: Prompt[];
    availableModels: AIModel[];
    promptType: string;
    buttonText: string;
    onGenerate: (prompt: Prompt, model: AllowedModel) => Promise<void>;
    onConfigurePrompts?: () => void;
}

export function AIGenerateMenu({
    isGenerating,
    isLoading,
    error,
    prompts,
    promptType,
    buttonText,
    onGenerate,
    onConfigurePrompts
}: Omit<AIGenerateMenuProps, 'availableModels'>) {
    const filteredPrompts = prompts.filter(p => p.promptType === promptType);
    const handleConfigurePrompts = onConfigurePrompts || openPromptsPanel;

    return (
        <Menubar>
            <MenubarMenu>
                <MenubarTrigger
                    className="gap-2"
                    disabled={isGenerating}
                    data-testid={`ai-generate-${promptType}-trigger`}
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            {buttonText}
                            <ChevronDown className="h-4 w-4" />
                        </>
                    )}
                </MenubarTrigger>
                <MenubarContent data-prompt-menu-content>
                    {isLoading ? (
                        <MenubarItem disabled>Loading prompts...</MenubarItem>
                    ) : error ? (
                        <MenubarItem disabled>Error loading prompts</MenubarItem>
                    ) : filteredPrompts.length === 0 ? (
                        <MenubarItem disabled>No {promptType} prompts available</MenubarItem>
                    ) : filteredPrompts.length > 0 ? (
                        filteredPrompts.map((prompt) => (
                            <MenubarSub key={prompt.id}>
                                <MenubarSubTrigger data-testid={`ai-generate-prompt-${prompt.id}`}>
                                    <div className="flex flex-col">
                                        <span>{prompt.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {prompt.messages.length} messages
                                        </span>
                                    </div>
                                </MenubarSubTrigger>
                                <MenubarSubContent className="max-h-[300px] overflow-y-auto">
                                    {prompt.allowedModels.map((model) => (
                                        <MenubarItem
                                            key={model.id}
                                            onClick={() => onGenerate(prompt, model)}
                                            disabled={isGenerating}
                                            data-testid={`ai-generate-model-${prompt.id}-${model.provider}-${model.id}`}
                                        >
                                            <div className="flex flex-col">
                                                <span>{model.name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {model.provider}
                                                </span>
                                            </div>
                                        </MenubarItem>
                                    ))}
                                </MenubarSubContent>
                            </MenubarSub>
                        ))
                    ) : null}
                    <MenubarSeparator />
                    <MenubarItem
                        onPointerDown={handleConfigurePrompts}
                        onClick={handleConfigurePrompts}
                        onSelect={handleConfigurePrompts}
                        data-testid={`ai-generate-${promptType}-configure-prompts`}
                    >
                        Configure Prompts...
                    </MenubarItem>
                </MenubarContent>
            </MenubarMenu>
        </Menubar>
    );
} 
