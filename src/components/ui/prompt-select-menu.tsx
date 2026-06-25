import { Prompt, AllowedModel } from "@/types/story";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarSub, MenubarSubContent, MenubarSubTrigger, MenubarTrigger } from "./menubar";
import { ChevronDown } from "lucide-react";
import { openPromptsPanel } from "@/features/prompts/utils/openPromptsPanel";
import { useAIStore } from "@/features/ai/stores/useAIStore";
import { expandPromptAllowedModels, normalizeAllowedModel } from "@/features/ai/utils/defaultModels";

interface PromptSelectMenuProps {
    isLoading: boolean;
    error: string | null;
    prompts: Prompt[];
    promptType: string;
    selectedPrompt?: Prompt;
    selectedModel?: AllowedModel;
    onSelect: (prompt: Prompt, model: AllowedModel) => void;
    onConfigurePrompts?: () => void;
    className?: string;
}

export function PromptSelectMenu({
    isLoading,
    error,
    prompts,
    promptType,
    selectedPrompt,
    selectedModel,
    onSelect,
    onConfigurePrompts,
    className
}: PromptSelectMenuProps) {
    const settings = useAIStore((state) => state.settings);
    const filteredPrompts = prompts.filter(p => p.promptType === promptType);
    const handleConfigurePrompts = onConfigurePrompts || openPromptsPanel;
    const selectedDisplayModel = selectedModel ? normalizeAllowedModel(selectedModel) : undefined;

    return (
        <Menubar className={className}>
            <MenubarMenu>
                <MenubarTrigger className="group w-full justify-between gap-2 overflow-hidden" data-testid={`prompt-select-${promptType}-trigger`}>
                    {selectedPrompt && selectedDisplayModel ? (
                        <>
                            <div className="flex min-w-0 flex-col items-start">
                                <span className="w-full truncate text-sm text-inherit">{selectedPrompt.name}</span>
                                <span className="w-full truncate text-xs text-muted-foreground group-data-[state=open]:text-accent-foreground/80">
                                    {selectedDisplayModel.name}
                                </span>
                            </div>
                            <ChevronDown className="h-4 w-4 shrink-0" />
                        </>
                    ) : (
                        <>
                            <span className="truncate">Select Prompt</span>
                            <ChevronDown className="h-4 w-4 shrink-0" />
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
                                <MenubarSubTrigger className="[&[data-state=open]_.prompt-select-prompt-meta]:text-accent-foreground/80">
                                    <div className="flex flex-col">
                                        <span>{prompt.name}</span>
                                        <span className="prompt-select-prompt-meta text-xs text-muted-foreground">
                                            {prompt.messages.length} messages
                                        </span>
                                    </div>
                                </MenubarSubTrigger>
                                <MenubarSubContent className="max-h-[300px] overflow-y-auto">
                                    {expandPromptAllowedModels(prompt.allowedModels, settings).map((model) => {
                                        const isSelectedModel = selectedPrompt?.id === prompt.id &&
                                            selectedModel?.provider === model.provider &&
                                            selectedModel?.id === model.id;

                                        return (
                                            <MenubarItem
                                                key={`${model.provider}:${model.id}`}
                                                onClick={() => onSelect(prompt, model)}
                                                className={isSelectedModel
                                                    ? "group bg-accent text-accent-foreground"
                                                    : "group"
                                                }
                                            >
                                                <div className="flex flex-col">
                                                    <span>{model.name}</span>
                                                    <span
                                                        className={isSelectedModel
                                                            ? "text-xs text-accent-foreground/80"
                                                            : "text-xs text-muted-foreground group-focus:text-accent-foreground/80"
                                                        }
                                                    >
                                                        {model.provider}
                                                    </span>
                                                </div>
                                            </MenubarItem>
                                        );
                                    })}
                                </MenubarSubContent>
                            </MenubarSub>
                        ))
                    ) : null}
                    <MenubarSeparator />
                    <MenubarItem
                        onPointerDown={handleConfigurePrompts}
                        onClick={handleConfigurePrompts}
                        onSelect={handleConfigurePrompts}
                        data-testid="prompt-select-configure-prompts"
                    >
                        Configure Prompts...
                    </MenubarItem>
                </MenubarContent>
            </MenubarMenu>
        </Menubar>
    );
} 
