import type { AllowedModel, Prompt } from "@/types/story";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { PromptSelectMenu } from "@/components/ui/prompt-select-menu";

interface GenerationControlsProps {
  isLoading: boolean;
  error: string | null;
  prompts: Prompt[];
  selectedPrompt: Prompt | undefined;
  selectedModel: AllowedModel | undefined;
  streaming: boolean;
  streamComplete: boolean;
  onPromptSelect: (prompt: Prompt, model: AllowedModel) => void;
  onPreview: () => void;
  onGenerate: () => void;
  onAccept: () => void;
  onReject: () => void;
}

/**
 * Control panel for prompt selection, preview, generation, and content acceptance.
 */
export const GenerationControls = ({
  isLoading,
  error,
  prompts,
  selectedPrompt,
  selectedModel,
  streaming,
  streamComplete,
  onPromptSelect,
  onPreview,
  onGenerate,
  onAccept,
  onReject,
}: GenerationControlsProps): JSX.Element => {
  return (
    <div className="flex justify-between items-center border-t border-border p-2">
      <div className="flex gap-2 items-center">
        <PromptSelectMenu
          isLoading={isLoading}
          error={error}
          prompts={prompts}
          promptType="scene_beat"
          selectedPrompt={selectedPrompt}
          selectedModel={selectedModel}
          onSelect={onPromptSelect}
        />
        {selectedPrompt && (
          <Button variant="outline" size="sm" onClick={onPreview}>
            Preview Prompt
          </Button>
        )}
        <Button
          onClick={onGenerate}
          disabled={streaming || !selectedPrompt || !selectedModel}
        >
          {streaming ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Generating...
            </>
          ) : (
            "Generate Prose"
          )}
        </Button>
      </div>

      {streamComplete && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onAccept}>
            Accept
          </Button>
          <Button size="sm" variant="outline" onClick={onReject}>
            Reject
          </Button>
        </div>
      )}
    </div>
  );
};
