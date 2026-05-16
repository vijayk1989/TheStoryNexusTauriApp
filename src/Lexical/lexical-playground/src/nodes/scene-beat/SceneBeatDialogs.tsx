import { toast } from "react-toastify";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PromptPreviewDialog } from "@/components/ui/prompt-preview-dialog";
import { ParallelResponsesDrawer } from "@/components/ui/parallel-responses-drawer";
import { PromptForm } from "@/features/prompts/components/PromptForm";
import { usePromptStore } from "@/features/prompts/store/promptStore";
import { PipelineDiagnosticsDialog } from "@/features/agents/components/PipelineDiagnosticsDialog";
import { useSBStore } from "@/features/scenebeats/stores/useSceneBeatInstanceStore";
import type { useSceneBeatGeneration } from "@/features/scenebeats/hooks/useSceneBeatGeneration";
import { SceneBeatMatchedEntries } from "../SceneBeatMatchedEntries";
import { RegenerateDialog } from "./RegenerateDialog";

type SceneBeatGenerationApi = ReturnType<typeof useSceneBeatGeneration>;

interface SceneBeatDialogsProps {
  generation: SceneBeatGenerationApi;
}

export function SceneBeatDialogs({ generation }: SceneBeatDialogsProps) {
  const command = useSBStore((s) => s.command);
  const streaming = useSBStore((s) => s.streaming);
  const selectedPrompt = useSBStore((s) => s.selectedPrompt);
  const showPreviewDialog = useSBStore((s) => s.showPreviewDialog);
  const showEditPromptDialog = useSBStore((s) => s.showEditPromptDialog);
  const showMatchedEntries = useSBStore((s) => s.showMatchedEntries);
  const showDiagnostics = useSBStore((s) => s.showDiagnostics);
  const showParallelDrawer = useSBStore((s) => s.showParallelDrawer);
  const showRegenerateDialog = useSBStore((s) => s.showRegenerateDialog);
  const previewMessages = useSBStore((s) => s.previewMessages);
  const previewLoading = useSBStore((s) => s.previewLoading);
  const previewError = useSBStore((s) => s.previewError);
  const localMatchedEntries = useSBStore((s) => s.localMatchedEntries);
  const selectedItems = useSBStore((s) => s.selectedItems);
  const agenticStepResults = useSBStore((s) => s.agenticStepResults);
  const selectedPipeline = useSBStore((s) => s.selectedPipeline);
  const lastGenerationMessages = useSBStore((s) => s.lastGenerationMessages);
  const lastGenerationResponse = useSBStore((s) => s.lastGenerationResponse);
  const set = useSBStore((s) => s.set);

  const lorebookContext = (() => {
    const names: string[] = [];
    localMatchedEntries.forEach((entry) => names.push(entry.name));
    selectedItems.forEach((entry) => names.push(entry.name));
    return [...new Set(names)];
  })();

  return (
    <>
      <SceneBeatMatchedEntries
        open={showMatchedEntries}
        onOpenChange={(open) => set({ showMatchedEntries: open })}
        matchedEntries={new Set(localMatchedEntries.values())}
      />

      <PromptPreviewDialog
        open={showPreviewDialog}
        onOpenChange={(open) => set({ showPreviewDialog: open })}
        messages={previewMessages}
        isLoading={previewLoading}
        error={previewError}
      />

      <Dialog open={showEditPromptDialog} onOpenChange={(open) => set({ showEditPromptDialog: open })}>
        <DialogContent
          className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto"
          onPointerDownCapture={(event) => event.stopPropagation()}
          onPointerUpCapture={(event) => event.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Edit Prompt: {selectedPrompt?.name}</DialogTitle>
          </DialogHeader>
          {selectedPrompt && (
            <PromptForm
              prompt={selectedPrompt}
              onSave={async () => {
                set({ showEditPromptDialog: false });
                await generation.fetchPrompts();
                const updatedPrompt = usePromptStore.getState().prompts.find(
                  (prompt) => prompt.id === selectedPrompt.id
                );
                if (updatedPrompt) {
                  set({ selectedPrompt: updatedPrompt });
                }
                toast.success("Prompt updated");
              }}
              onCancel={() => set({ showEditPromptDialog: false })}
            />
          )}
        </DialogContent>
      </Dialog>

      <PipelineDiagnosticsDialog
        open={showDiagnostics}
        onOpenChange={(open) => set({ showDiagnostics: open })}
        results={agenticStepResults}
        pipelineName={selectedPipeline?.name}
      />

      <ParallelResponsesDrawer
        open={showParallelDrawer}
        onOpenChange={(open) => set({ showParallelDrawer: open })}
        responses={generation.parallelResponses}
        isGenerating={generation.isParallelGenerating}
        onAccept={generation.handleParallelAccept}
        onAbortAll={generation.abortParallel}
        sceneBeatCommand={command}
        promptId={selectedPrompt?.id}
        promptName={selectedPrompt?.name}
        lorebookContext={lorebookContext}
      />

      <RegenerateDialog
        open={showRegenerateDialog}
        onOpenChange={(open) => set({ showRegenerateDialog: open })}
        messages={lastGenerationMessages}
        previousResponse={lastGenerationResponse}
        onRegenerate={generation.handleRegenerate}
        isStreaming={streaming}
      />
    </>
  );
}

