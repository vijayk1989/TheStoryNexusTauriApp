import { Button } from '@/components/ui/button';
import { PromptSelectMenu } from '@/components/ui/prompt-select-menu';
import { PromptPreviewDialog } from '@/components/ui/prompt-preview-dialog';
import { Eye } from 'lucide-react';
import { Prompt, AllowedModel, PromptMessage } from '@/types/story';

interface PromptControlsProps {
    prompts: Prompt[];
    promptsLoading: boolean;
    promptsError: string | null;
    selectedPrompt: Prompt | null;
    selectedModel: AllowedModel | null;
    availableModels: AllowedModel[];
    showPreview: boolean;
    previewMessages: PromptMessage[] | undefined;
    previewLoading: boolean;
    previewError: string | null;
    onPromptSelect: (prompt: Prompt, model: AllowedModel) => void;
    onPreviewPrompt: () => void;
    onClosePreview: () => void;
}

export function PromptControls({
    prompts,
    promptsLoading,
    promptsError,
    selectedPrompt,
    selectedModel,
    availableModels: _availableModels,
    showPreview,
    previewMessages,
    previewLoading,
    previewError,
    onPromptSelect,
    onPreviewPrompt,
    onClosePreview
}: PromptControlsProps) {

    return (
        <div className="space-y-4 mb-4">
            <div className="flex items-center gap-2">
                <PromptSelectMenu
                    prompts={prompts}
                    promptType="brainstorm"
                    selectedPrompt={selectedPrompt || undefined}
                    selectedModel={selectedModel || undefined}
                    onSelect={onPromptSelect}
                    isLoading={promptsLoading}
                    error={promptsError}
                />

                {selectedPrompt && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onPreviewPrompt}
                    >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                    </Button>
                )}
            </div>

            <PromptPreviewDialog
                open={showPreview}
                onOpenChange={onClosePreview}
                messages={previewMessages}
                isLoading={previewLoading}
                error={previewError}
            />
        </div>
    );
}
