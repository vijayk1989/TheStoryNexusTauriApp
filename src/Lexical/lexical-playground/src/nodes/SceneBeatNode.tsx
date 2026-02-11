import type {
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";

import {
  $applyNodeReplacement,
  $getNodeByKey,
  DecoratorNode,
} from "lexical";
import {
  Suspense,
  useState,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { Button } from "@/components/ui/button";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePromptStore } from "@/features/prompts/store/promptStore";
import type { SceneBeat, LorebookEntry } from "@/types/story";
import { toast } from "react-toastify";
import { Textarea } from "@/components/ui/textarea";
import { useStoryContext } from "@/features/stories/context/StoryContext";
import { useLorebookStore } from "@/features/lorebook/stores/useLorebookStore";
import { PromptPreviewDialog } from "@/components/ui/prompt-preview-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PromptForm } from "@/features/prompts/components/PromptForm";
import { debounce } from "lodash";
import { SceneBeatMatchedEntries } from "./SceneBeatMatchedEntries";
import { useChapterStore } from "@/features/chapters/stores/useChapterStore";
import { sceneBeatService } from "@/features/scenebeats/services/sceneBeatService";
import { PipelineDiagnosticsDialog } from "@/features/agents/components/PipelineDiagnosticsDialog";
import { ParallelResponsesDrawer } from "@/components/ui/parallel-responses-drawer";

// Per-instance store
import {
  createSceneBeatInstanceStore,
  SceneBeatStoreContext,
  useSBStore,
  useSBStoreApi,
  type SceneBeatInstanceStoreApi,
} from "@/features/scenebeats/stores/useSceneBeatInstanceStore";
import { useSceneBeatGeneration } from "@/features/scenebeats/hooks/useSceneBeatGeneration";

// Sub-components
import { SceneBeatHeader } from "./scene-beat/SceneBeatHeader";
import { SceneBeatContextPanel } from "./scene-beat/SceneBeatContextPanel";
import { SceneBeatActionBar } from "./scene-beat/SceneBeatActionBar";
import { SceneBeatMatchedPanel } from "./scene-beat/SceneBeatMatchedPanel";

// ── Serialization type ─────────────────────────────────────────

export type SerializedSceneBeatNode = Spread<
  {
    type: "scene-beat";
    version: 1;
    sceneBeatId: string;
  },
  SerializedLexicalNode
>;

// ── Inner component (needs store context) ──────────────────────

function SceneBeatInner({ nodeKey }: { nodeKey: NodeKey }) {
  const [editor] = useLexicalComposerContext();
  const { currentStoryId, currentChapterId } = useStoryContext();
  const { currentChapter } = useChapterStore();
  const { tagMap, entries } = useLorebookStore();

  // Read from per-instance store
  const sceneBeatId = useSBStore((s) => s.sceneBeatId);
  const command = useSBStore((s) => s.command);
  const collapsed = useSBStore((s) => s.collapsed);
  const isLoaded = useSBStore((s) => s.isLoaded);
  const streaming = useSBStore((s) => s.streaming);
  const streamedText = useSBStore((s) => s.streamedText);
  const streamComplete = useSBStore((s) => s.streamComplete);
  const selectedPrompt = useSBStore((s) => s.selectedPrompt);
  const showPreviewDialog = useSBStore((s) => s.showPreviewDialog);
  const showEditPromptDialog = useSBStore((s) => s.showEditPromptDialog);
  const showMatchedEntries = useSBStore((s) => s.showMatchedEntries);
  const showDiagnostics = useSBStore((s) => s.showDiagnostics);
  const showParallelDrawer = useSBStore((s) => s.showParallelDrawer);
  const previewMessages = useSBStore((s) => s.previewMessages);
  const previewLoading = useSBStore((s) => s.previewLoading);
  const previewError = useSBStore((s) => s.previewError);
  const localMatchedEntries = useSBStore((s) => s.localMatchedEntries);
  const selectedItems = useSBStore((s) => s.selectedItems);
  const agenticStepResults = useSBStore((s) => s.agenticStepResults);
  const selectedPipeline = useSBStore((s) => s.selectedPipeline);
  const set = useSBStore((s) => s.set);

  // Generation hook — pass the store API for imperative access
  const storeApi = useSBStoreApi();
  const gen = useSceneBeatGeneration(storeApi);

  // Local-only state: command undo/redo history
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Effects ──────────────────────────────────────────────────

  // Fetch prompts on mount
  useEffect(() => {
    gen.fetchPrompts().catch((error: unknown) => {
      toast.error("Failed to load prompts");
      console.error("Error loading prompts:", error);
    });
  }, [gen.fetchPrompts]);

  // Load available pipelines when agentic mode is enabled
  const agenticMode = useSBStore((s) => s.agenticMode);
  useEffect(() => {
    if (agenticMode) {
      gen.getAvailablePipelines().then((pipelines: any) => {
        set({ availablePipelines: pipelines });
        if (pipelines.length > 0 && !selectedPipeline) {
          set({ selectedPipeline: pipelines[0] });
        }
      }).catch((error: unknown) => {
        console.error("Error loading pipelines:", error);
        toast.error("Failed to load AI pipelines");
      });
    }
  }, [agenticMode, gen.getAvailablePipelines]);

  // Get sceneBeatId from node
  useEffect(() => {
    editor.getEditorState().read(() => {
      const node = $getNodeByKey(nodeKey);
      if (node instanceof SceneBeatNode) {
        set({ sceneBeatId: node.getSceneBeatId() });
      }
    });
  }, [editor, nodeKey, set]);

  // Load or create SceneBeat
  useEffect(() => {
    const loadOrCreate = async () => {
      if (isLoaded) return;

      if (sceneBeatId) {
        try {
          const data = await sceneBeatService.getSceneBeat(sceneBeatId);
          if (data) {
            const pov = data.povType || currentChapter?.povType || "Third Person Omniscient";
            const char = data.povCharacter || currentChapter?.povCharacter;
            set({
              command: data.command || "",
              povType: pov,
              povCharacter: char,
              tempPovType: pov,
              tempPovCharacter: char,
              isLoaded: true,
            });
          }
        } catch (error) {
          console.error("Error loading SceneBeat:", error);
        }
      } else if (currentStoryId && currentChapterId) {
        try {
          const pov = currentChapter?.povType || "Third Person Omniscient";
          const char = currentChapter?.povCharacter;
          const newId = await sceneBeatService.createSceneBeat({
            storyId: currentStoryId,
            chapterId: currentChapterId,
            command: "",
            povType: pov,
            povCharacter: char,
          });

          editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if (node instanceof SceneBeatNode) {
              node.setSceneBeatId(newId);
            }
          });

          set({
            sceneBeatId: newId,
            povType: pov,
            povCharacter: char,
            tempPovType: pov,
            tempPovCharacter: char,
            isLoaded: true,
          });
        } catch (error) {
          console.error("Error creating SceneBeat:", error);
        }
      }
    };
    loadOrCreate();
  }, [editor, nodeKey, sceneBeatId, currentStoryId, currentChapterId, currentChapter, isLoaded, set]);

  // Save command (debounced)
  const saveCommand = useMemo(
    () =>
      debounce(async (id: string, cmd: string) => {
        if (!id) return;
        try {
          await sceneBeatService.updateSceneBeat(id, { command: cmd });
        } catch (error) {
          console.error("Error saving SceneBeat command:", error);
        }
      }, 500),
    []
  );

  useEffect(() => {
    if (sceneBeatId && isLoaded) saveCommand(sceneBeatId, command);
  }, [command, sceneBeatId, saveCommand, isLoaded]);

  // Tag matching
  useEffect(() => {
    const matchTags = () => {
      const matched = new Map<string, LorebookEntry>();
      Object.entries(tagMap).forEach(([tag, entry]) => {
        if (command.toLowerCase().includes(tag.toLowerCase())) {
          matched.set(entry.id, entry);
        }
      });
      set({ localMatchedEntries: matched });
    };
    const debounced = debounce(matchTags, 500);
    debounced();
    return () => debounced.cancel();
  }, [command, tagMap, set]);

  // Persist toggle states
  const useMatchedChapter = useSBStore((s) => s.useMatchedChapter);
  const useMatchedSceneBeat = useSBStore((s) => s.useMatchedSceneBeat);
  const useCustomContext = useSBStore((s) => s.useCustomContext);

  useEffect(() => {
    if (sceneBeatId && isLoaded) {
      const updated: Partial<SceneBeat> = {
        metadata: { useMatchedChapter, useMatchedSceneBeat, useCustomContext },
      };
      sceneBeatService.updateSceneBeat(sceneBeatId, updated).catch((error: unknown) => {
        console.error("Error updating toggle states:", error);
      });
    }
  }, [useMatchedChapter, useMatchedSceneBeat, useCustomContext, sceneBeatId, isLoaded]);

  // Load toggle states from scene beat
  useEffect(() => {
    if (sceneBeatId && isLoaded) {
      sceneBeatService.getSceneBeat(sceneBeatId).then((sb) => {
        if (sb?.metadata) {
          const m = sb.metadata;
          const partial: Record<string, boolean> = {};
          if (typeof m.useMatchedChapter === "boolean") partial.useMatchedChapter = m.useMatchedChapter;
          if (typeof m.useMatchedSceneBeat === "boolean") partial.useMatchedSceneBeat = m.useMatchedSceneBeat;
          if (typeof m.useCustomContext === "boolean") partial.useCustomContext = m.useCustomContext;
          set(partial as any);
        }
      }).catch((error: unknown) => console.error("Error loading toggle states:", error));
    }
  }, [sceneBeatId, isLoaded, set]);

  // Clear custom context when toggled off
  useEffect(() => {
    if (!useCustomContext) {
      set({ includeAllLorebook: false, selectedItems: [] });
    }
  }, [useCustomContext, set]);

  // Initialize command history
  useEffect(() => {
    if (isLoaded && command && commandHistory.length === 0) {
      setCommandHistory([command]);
      setHistoryIndex(0);
    }
  }, [isLoaded, command, commandHistory.length]);

  // ── Command history handlers ─────────────────────────────────

  const handleCommandChange = (newCommand: string) => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      set({ command: newCommand });
      return;
    }
    if (newCommand !== command) {
      const newHistory = commandHistory.slice(0, historyIndex + 1);
      if (newHistory[newHistory.length - 1] !== newCommand) {
        const updated = [...newHistory, newCommand];
        setCommandHistory(updated);
        setHistoryIndex(updated.length - 1);
      }
      set({ command: newCommand });
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true;
      const idx = historyIndex - 1;
      setHistoryIndex(idx);
      set({ command: commandHistory[idx] });
    }
  };

  const handleRedo = () => {
    if (historyIndex < commandHistory.length - 1) {
      isUndoRedoAction.current = true;
      const idx = historyIndex + 1;
      setHistoryIndex(idx);
      set({ command: commandHistory[idx] });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleUndo();
      return;
    }
    if ((e.ctrlKey && e.shiftKey && e.key === "z") || (e.ctrlKey && e.key === "y")) {
      e.preventDefault();
      e.stopPropagation();
      handleRedo();
      return;
    }
  };

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="relative my-4 rounded-lg border border-border bg-card overflow-hidden max-w-full">
      {/* Header */}
      <SceneBeatHeader
        streaming={streaming}
        onAbort={gen.abortGeneration}
        onDelete={gen.handleDelete}
      />

      {/* Collapsible body */}
      {!collapsed && (
        <>
          {/* Command textarea */}
          <div className="p-3 md:p-4">
            <Textarea
              ref={textareaRef}
              value={command}
              onChange={(e) => handleCommandChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the scene beat…"
              className="min-h-[80px] md:min-h-[100px] resize-y text-sm md:text-base"
            />
            <div className="flex justify-end mt-1 gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="h-6 w-6"
                title="Undo (Ctrl+Z)"
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRedo}
                disabled={historyIndex >= commandHistory.length - 1}
                className="h-6 w-6"
                title="Redo (Ctrl+Shift+Z)"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Streamed text preview */}
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

          {/* Context panel */}
          <SceneBeatContextPanel />

          {/* Action bar */}
          <SceneBeatActionBar
            prompts={gen.prompts}
            promptsLoading={gen.promptsLoading}
            promptsError={gen.promptsError}
            isAgenticGenerating={gen.isAgenticGenerating}
            currentAgentName={gen.currentAgentName}
            currentStep={gen.currentStep}
            isParallelGenerating={gen.isParallelGenerating}
            onPreview={gen.handlePreviewPrompt}
            onGenerate={gen.handleGenerateWithPrompt}
            onAgenticGenerate={gen.handleAgenticGenerate}
            onAbortAgentic={gen.handleAbortAgentic}
            onParallelGenerate={gen.handleParallelGenerate}
            onAccept={gen.handleAccept}
            onReject={gen.handleReject}
          />

          {/* Matched entries panel */}
          <SceneBeatMatchedPanel />
        </>
      )}

      {/* ── Dialogs ─────────────────────────────────────────── */}

      <SceneBeatMatchedEntries
        open={showMatchedEntries}
        onOpenChange={(v) => set({ showMatchedEntries: v })}
        matchedEntries={new Set(localMatchedEntries.values())}
      />

      <PromptPreviewDialog
        open={showPreviewDialog}
        onOpenChange={(v) => set({ showPreviewDialog: v })}
        messages={previewMessages}
        isLoading={previewLoading}
        error={previewError}
      />

      <Dialog open={showEditPromptDialog} onOpenChange={(v) => set({ showEditPromptDialog: v })}>
        <DialogContent
          className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto"
          onPointerDownCapture={(e) => e.stopPropagation()}
          onPointerUpCapture={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Edit Prompt: {selectedPrompt?.name}</DialogTitle>
          </DialogHeader>
          {selectedPrompt && (
            <PromptForm
              prompt={selectedPrompt}
              onSave={async () => {
                set({ showEditPromptDialog: false });
                await gen.fetchPrompts();
                const updatedPrompt = usePromptStore.getState().prompts.find(
                  (p) => p.id === selectedPrompt.id
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
        onOpenChange={(v) => set({ showDiagnostics: v })}
        results={agenticStepResults}
        pipelineName={selectedPipeline?.name}
      />

      <ParallelResponsesDrawer
        open={showParallelDrawer}
        onOpenChange={(v) => set({ showParallelDrawer: v })}
        responses={gen.parallelResponses}
        isGenerating={gen.isParallelGenerating}
        onAccept={gen.handleParallelAccept}
        onAbortAll={gen.abortParallel}
        sceneBeatCommand={command}
        promptId={selectedPrompt?.id}
        promptName={selectedPrompt?.name}
        lorebookContext={
          (() => {
            const names: string[] = [];
            localMatchedEntries.forEach((e) => names.push(e.name));
            selectedItems.forEach((e) => names.push(e.name));
            return [...new Set(names)];
          })()
        }
      />
    </div>
  );
}

// ── Orchestrator wrapper (creates store + provides context) ────

function SceneBeatComponent({ nodeKey }: { nodeKey: NodeKey }): JSX.Element {
  const storeRef = useRef<SceneBeatInstanceStoreApi>();
  if (!storeRef.current) {
    storeRef.current = createSceneBeatInstanceStore(nodeKey);
  }

  return (
    <SceneBeatStoreContext.Provider value={storeRef.current}>
      <SceneBeatInner nodeKey={nodeKey} />
    </SceneBeatStoreContext.Provider>
  );
}

// ── Lexical Node class ─────────────────────────────────────────

export class SceneBeatNode extends DecoratorNode<JSX.Element> {
  __sceneBeatId: string;

  constructor(sceneBeatId: string = "", key?: NodeKey) {
    super(key);
    this.__sceneBeatId = sceneBeatId;
  }

  static getType(): string {
    return "scene-beat";
  }

  static clone(node: SceneBeatNode): SceneBeatNode {
    return new SceneBeatNode(node.__sceneBeatId, node.__key);
  }

  static importJSON(serializedNode: SerializedSceneBeatNode): SceneBeatNode {
    return $createSceneBeatNode(serializedNode.sceneBeatId || "");
  }

  exportJSON(): SerializedSceneBeatNode {
    return {
      type: "scene-beat",
      version: 1,
      sceneBeatId: this.__sceneBeatId,
    };
  }

  getSceneBeatId(): string {
    return this.__sceneBeatId;
  }

  setSceneBeatId(id: string): void {
    const writable = this.getWritable();
    writable.__sceneBeatId = id;
  }

  createDOM(): HTMLElement {
    const div = document.createElement("div");
    div.className = "scene-beat-node";
    return div;
  }

  updateDOM(): boolean {
    return false;
  }

  isInline(): boolean {
    return false;
  }

  decorate(): JSX.Element {
    return (
      <Suspense fallback={null}>
        <SceneBeatComponent nodeKey={this.__key} />
      </Suspense>
    );
  }
}

export function $createSceneBeatNode(sceneBeatId: string = ""): SceneBeatNode {
  return $applyNodeReplacement(new SceneBeatNode(sceneBeatId));
}

export function $isSceneBeatNode(
  node: LexicalNode | null | undefined
): node is SceneBeatNode {
  return node instanceof SceneBeatNode;
}
