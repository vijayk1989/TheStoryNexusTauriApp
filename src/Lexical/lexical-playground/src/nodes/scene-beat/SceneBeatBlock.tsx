import { useSBStore, useSBStoreApi } from "@/features/scenebeats/stores/useSceneBeatInstanceStore";
import { useSceneBeatGeneration } from "@/features/scenebeats/hooks/useSceneBeatGeneration";
import { SceneBeatHeader } from "./SceneBeatHeader";
import { SceneBeatContextPanel } from "./SceneBeatContextPanel";
import { SceneBeatActionBar } from "./SceneBeatActionBar";
import { SceneBeatMatchedPanel } from "./SceneBeatMatchedPanel";
import { SceneBeatCommandEditor } from "./SceneBeatCommandEditor";
import { SceneBeatDialogs } from "./SceneBeatDialogs";
import { useSceneBeatLifecycle } from "./useSceneBeatLifecycle";
import type { SceneBeatNodeSnapshot } from "./types";

interface SceneBeatBlockProps {
  initialSnapshot: SceneBeatNodeSnapshot;
  writeNodeSnapshot: (snapshot: Partial<SceneBeatNodeSnapshot>) => void;
}

export function SceneBeatBlock({
  initialSnapshot,
  writeNodeSnapshot,
}: SceneBeatBlockProps) {
  const collapsed = useSBStore((s) => s.collapsed);
  const streaming = useSBStore((s) => s.streaming);
  const streamedText = useSBStore((s) => s.streamedText);
  const streamComplete = useSBStore((s) => s.streamComplete);

  const storeApi = useSBStoreApi();
  const generation = useSceneBeatGeneration(storeApi);

  useSceneBeatLifecycle({
    initialSnapshot,
    generation,
    storeApi,
    writeNodeSnapshot,
  });

  return (
    <div className="relative my-4 rounded-lg border border-border bg-card overflow-hidden max-w-full">
      <SceneBeatHeader
        streaming={streaming}
        onAbort={generation.abortGeneration}
        onDelete={generation.handleDelete}
      />

      {!collapsed && (
        <>
          <SceneBeatCommandEditor />

          {(streaming || streamComplete) && streamedText && (
            <div className="px-3 md:px-4 pb-3">
              <div className="rounded-md border p-3 md:p-4 bg-muted/20 text-sm md:text-base whitespace-pre-wrap max-h-[300px] md:max-h-[400px] overflow-y-auto">
                {streamedText}
                {streaming && (
                  <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
                )}
              </div>
            </div>
          )}

          <SceneBeatContextPanel />

          <SceneBeatActionBar
            prompts={generation.prompts}
            promptsLoading={generation.promptsLoading}
            promptsError={generation.promptsError}
            isAgenticGenerating={generation.isAgenticGenerating}
            currentAgentName={generation.currentAgentName}
            currentStep={generation.currentStep}
            isParallelGenerating={generation.isParallelGenerating}
            onPreview={generation.handlePreviewPrompt}
            onGenerate={generation.handleGenerateWithPrompt}
            onAgenticGenerate={generation.handleAgenticGenerate}
            onAbortAgentic={generation.handleAbortAgentic}
            onParallelGenerate={generation.handleParallelGenerate}
            onAccept={generation.handleAccept}
            onReject={generation.handleReject}
            onRegenerate={generation.handleRegenerate}
          />

          <SceneBeatMatchedPanel />
        </>
      )}

      <SceneBeatDialogs generation={generation} />
    </div>
  );
}
