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
  useCallback,
} from "react";
import { Button } from "@/components/ui/button";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ChevronUp, ChevronDown, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { usePromptStore } from "@/features/prompts/store/promptStore";
import type { SceneBeat, LorebookEntry, AllowedModel } from "@/types/story";
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
import { useSceneBeatStore } from "@/features/scenebeats/stores/useSceneBeatStore";
import { PipelineDiagnosticsDialog } from "@/features/agents/components/PipelineDiagnosticsDialog";
import { ParallelResponsesDrawer } from "@/components/ui/parallel-responses-drawer";
import { resolveSavedDefaultModel } from "@/features/ai/utils/defaultModels";
import { useAIStore } from "@/features/ai/stores/useAIStore";

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
import { RegenerateDialog } from "./scene-beat/RegenerateDialog";

// ── Serialization type ─────────────────────────────────────────

export type SerializedSceneBeatNode = Spread<
  {
    type: "scene-beat";
    version: 2;
    sceneBeatId: string;
    command?: string;
    povType?: SceneBeat["povType"];
    povCharacter?: string;
    generatedContent?: string;
    accepted?: boolean;
    metadata?: SceneBeat["metadata"];
    collapsed?: boolean;
  },
  SerializedLexicalNode
>;

type SceneBeatNodeSnapshot = Pick<
  SerializedSceneBeatNode,
  | "sceneBeatId"
  | "command"
  | "povType"
  | "povCharacter"
  | "generatedContent"
  | "accepted"
  | "metadata"
  | "collapsed"
>;

// ── Inner component (needs store context) ──────────────────────

function SceneBeatInner({
  nodeKey,
  initialSnapshot,
}: {
  nodeKey: NodeKey;
  initialSnapshot: SceneBeatNodeSnapshot;
}) {
  const [editor] = useLexicalComposerContext();
  const { currentStoryId, currentChapterId } = useStoryContext();
  const { currentChapter } = useChapterStore();
  const { tagMap, entries } = useLorebookStore();

  // Read from per-instance store
  const sceneBeatId = useSBStore((s) => s.sceneBeatId);
  const command = useSBStore((s) => s.command);
  const collapsed = useSBStore((s) => s.collapsed);
  const povType = useSBStore((s) => s.povType);
  const povCharacter = useSBStore((s) => s.povCharacter);
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
  const upsertCachedSceneBeat = useSceneBeatStore((s) => s.upsertSceneBeat);

  // Generation hook — pass the store API for imperative access
  const storeApi = useSBStoreApi();
  const gen = useSceneBeatGeneration(storeApi);

  // Local-only state: command undo/redo history
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const didHydrateSnapshot = useRef(false);
  const lastPersistedCommand = useRef<string | null>(null);
  const lastPersistedMetadata = useRef<string | null>(null);

  const writeNodeSnapshot = useCallback((snapshot: Partial<SceneBeatNodeSnapshot>) => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (node instanceof SceneBeatNode) {
        node.setSceneBeatSnapshot(snapshot);
      }
    });
  }, [editor, nodeKey]);

  // Speech-to-text for dictating into the command textarea
  const stt = useSpeechToText({
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        const trimmed = text.trim();
        if (trimmed) {
          const separator = command && !command.endsWith(" ") ? " " : "";
          handleCommandChange(command + separator + trimmed);
        }
      }
    },
  });

  // ── Effects ──────────────────────────────────────────────────

  // Hydrate immediately from Lexical JSON when the chapter has an embedded
  // scene beat snapshot. Old chapters only have an ID and will fall through to
  // the cache/IndexedDB path below.
  useEffect(() => {
    if (didHydrateSnapshot.current) return;
    didHydrateSnapshot.current = true;

    const metadata = initialSnapshot.metadata;
    const hasSnapshotData =
      initialSnapshot.command !== undefined ||
      initialSnapshot.povType !== undefined ||
      initialSnapshot.povCharacter !== undefined ||
      initialSnapshot.generatedContent !== undefined ||
      initialSnapshot.accepted !== undefined ||
      initialSnapshot.metadata !== undefined ||
      initialSnapshot.collapsed !== undefined;

    if (!hasSnapshotData) return;

    const pov = initialSnapshot.povType || currentChapter?.povType || "Third Person Omniscient";
    const char = initialSnapshot.povCharacter ?? (initialSnapshot.povType ? undefined : currentChapter?.povCharacter);
    const generatedContent = initialSnapshot.generatedContent || "";
    const accepted = initialSnapshot.accepted || false;
    const hydratedCommand = initialSnapshot.command || "";
    const hydratedMetadata = {
      useMatchedChapter: metadata?.useMatchedChapter ?? true,
      useMatchedSceneBeat: metadata?.useMatchedSceneBeat ?? false,
      useCustomContext: metadata?.useCustomContext ?? false,
    };
    lastPersistedCommand.current = hydratedCommand;
    lastPersistedMetadata.current = JSON.stringify(hydratedMetadata);

    set({
      sceneBeatId: initialSnapshot.sceneBeatId || "",
      command: hydratedCommand,
      collapsed: initialSnapshot.collapsed || false,
      povType: pov,
      povCharacter: char,
      tempPovType: pov,
      tempPovCharacter: char,
      streamedText: accepted ? "" : generatedContent,
      streamComplete: Boolean(generatedContent && !accepted),
      ...hydratedMetadata,
      isLoaded: true,
    });

    if (initialSnapshot.sceneBeatId && currentStoryId && currentChapterId) {
      upsertCachedSceneBeat({
        id: initialSnapshot.sceneBeatId,
        storyId: currentStoryId,
        chapterId: currentChapterId,
        command: hydratedCommand,
        povType: pov,
        povCharacter: char,
        generatedContent,
        accepted,
        metadata,
        createdAt: new Date(),
      });
    }
  }, [initialSnapshot, currentChapter, currentStoryId, currentChapterId, set, upsertCachedSceneBeat]);

  // Fetch prompts on mount
  useEffect(() => {
    gen.fetchPrompts().catch((error: unknown) => {
      toast.error("Failed to load prompts");
      console.error("Error loading prompts:", error);
    });
  }, [gen.fetchPrompts]);

  const settings = useAIStore((s) => s.settings);

  // Apply default prompt and model if enabled and not already selected
  useEffect(() => {
    if (gen.prompts.length > 0 && !selectedPrompt && settings?.enablePromptDefaults) {
      const defaultPrompt = settings.defaultSceneBeatPromptId
        ? gen.prompts.find((p) => p.id === settings.defaultSceneBeatPromptId)
        : gen.prompts.find((p) => p.promptType === "scene_beat");
      if (defaultPrompt) {
        const defaultModel = resolveSavedDefaultModel(settings, settings.defaultSceneBeatModelId);
        set({ selectedPrompt: defaultPrompt, selectedModel: defaultModel });
      }
    }
  }, [gen.prompts, selectedPrompt, settings, set]);

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
      const currentState = storeApi.getState();
      if (currentState.isLoaded) return;
      const effectiveSceneBeatId = currentState.sceneBeatId || initialSnapshot.sceneBeatId || sceneBeatId;

      if (effectiveSceneBeatId) {
        try {
          const store = useSceneBeatStore.getState();
          const data = store.getCachedSceneBeat(effectiveSceneBeatId) || await store.getSceneBeat(effectiveSceneBeatId);
          if (data) {
            const pov = data.povType || currentChapter?.povType || "Third Person Omniscient";
            const char = data.povCharacter ?? (data.povType ? undefined : currentChapter?.povCharacter);
            const generatedContent = data.generatedContent || "";
            const accepted = data.accepted || false;
            const metadata = data.metadata;
            const hydratedMetadata = {
              useMatchedChapter: metadata?.useMatchedChapter ?? true,
              useMatchedSceneBeat: metadata?.useMatchedSceneBeat ?? false,
              useCustomContext: metadata?.useCustomContext ?? false,
            };
            const hydratedCommand = data.command || "";
            lastPersistedCommand.current = hydratedCommand;
            lastPersistedMetadata.current = JSON.stringify(hydratedMetadata);
            set({
              command: hydratedCommand,
              povType: pov,
              povCharacter: char,
              tempPovType: pov,
              tempPovCharacter: char,
              streamedText: accepted ? "" : generatedContent,
              streamComplete: Boolean(generatedContent && !accepted),
              ...hydratedMetadata,
              isLoaded: true,
            });
            writeNodeSnapshot({
              sceneBeatId: data.id,
              command: hydratedCommand,
              povType: pov,
              povCharacter: char,
              generatedContent,
              accepted,
              metadata,
            });
          }
        } catch (error) {
          console.error("Error loading SceneBeat:", error);
        }
      } else if (currentStoryId && currentChapterId) {
        try {
          const pov = currentChapter?.povType || "Third Person Omniscient";
          const char = currentChapter?.povCharacter;
          const newId = await useSceneBeatStore.getState().createSceneBeat({
            storyId: currentStoryId,
            chapterId: currentChapterId,
            command: "",
            povType: pov,
            povCharacter: char,
          });

          editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if (node instanceof SceneBeatNode) {
              node.setSceneBeatSnapshot({
                sceneBeatId: newId,
                command: "",
                povType: pov,
                povCharacter: char,
                metadata: {
                  useMatchedChapter: true,
                  useMatchedSceneBeat: false,
                  useCustomContext: false,
                },
                collapsed: false,
              });
            }
          });

          set({
            sceneBeatId: newId,
            povType: pov,
            povCharacter: char,
            tempPovType: pov,
            tempPovCharacter: char,
            useMatchedChapter: true,
            useMatchedSceneBeat: false,
            useCustomContext: false,
            isLoaded: true,
          });
          lastPersistedCommand.current = "";
          lastPersistedMetadata.current = JSON.stringify({
            useMatchedChapter: true,
            useMatchedSceneBeat: false,
            useCustomContext: false,
          });
        } catch (error) {
          console.error("Error creating SceneBeat:", error);
        }
      }
    };
    loadOrCreate();
  }, [editor, nodeKey, sceneBeatId, currentStoryId, currentChapterId, currentChapter, isLoaded, set, writeNodeSnapshot, storeApi, initialSnapshot]);

  // Save command (debounced)
  const saveCommand = useMemo(
    () =>
      debounce(async (id: string, cmd: string) => {
        if (!id) return;
        try {
          await sceneBeatService.updateSceneBeat(id, { command: cmd });
          const cached = useSceneBeatStore.getState().getCachedSceneBeat(id);
          if (cached) {
            useSceneBeatStore.getState().upsertSceneBeat({ ...cached, command: cmd });
          }
        } catch (error) {
          console.error("Error saving SceneBeat command:", error);
        }
      }, 500),
    []
  );

  useEffect(() => {
    if (sceneBeatId && isLoaded) {
      writeNodeSnapshot({ command });
      if (lastPersistedCommand.current !== command) {
        lastPersistedCommand.current = command;
        saveCommand(sceneBeatId, command);
      }
    }
  }, [command, sceneBeatId, saveCommand, isLoaded, writeNodeSnapshot]);

  useEffect(() => {
    if (sceneBeatId && isLoaded && streamComplete) {
      writeNodeSnapshot({
        generatedContent: streamedText,
        accepted: false,
      });
      const cached = useSceneBeatStore.getState().getCachedSceneBeat(sceneBeatId);
      if (cached) {
        useSceneBeatStore.getState().upsertSceneBeat({
          ...cached,
          generatedContent: streamedText,
          accepted: false,
        });
      }
    }
  }, [streamComplete, streamedText, sceneBeatId, isLoaded, writeNodeSnapshot]);

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
      const metadata = { useMatchedChapter, useMatchedSceneBeat, useCustomContext };
      writeNodeSnapshot({ metadata });
      const metadataKey = JSON.stringify(metadata);
      if (lastPersistedMetadata.current === metadataKey) {
        return;
      }
      lastPersistedMetadata.current = metadataKey;
      const updated: Partial<SceneBeat> = {
        metadata,
      };
      sceneBeatService.updateSceneBeat(sceneBeatId, updated).catch((error: unknown) => {
        console.error("Error updating toggle states:", error);
      });
      const cached = useSceneBeatStore.getState().getCachedSceneBeat(sceneBeatId);
      if (cached) {
        useSceneBeatStore.getState().upsertSceneBeat({ ...cached, metadata });
      }
    }
  }, [useMatchedChapter, useMatchedSceneBeat, useCustomContext, sceneBeatId, isLoaded, writeNodeSnapshot]);

  // Clear custom context when toggled off
  useEffect(() => {
    if (!useCustomContext) {
      set({ includeAllLorebook: false, selectedItems: [] });
    }
  }, [useCustomContext, set]);

  useEffect(() => {
    if (sceneBeatId && isLoaded) {
      writeNodeSnapshot({
        collapsed,
        povType,
        povCharacter,
      });
      const cached = useSceneBeatStore.getState().getCachedSceneBeat(sceneBeatId);
      if (cached) {
        useSceneBeatStore.getState().upsertSceneBeat({ ...cached, povType, povCharacter });
      }
    }
  }, [collapsed, povType, povCharacter, sceneBeatId, isLoaded, writeNodeSnapshot]);

  // Initialize command history
  useEffect(() => {
    if (isLoaded && command && commandHistory.length === 0) {
      setCommandHistory([command]);
      setHistoryIndex(0);
    }
  }, [isLoaded, command, commandHistory.length]);

  // Auto-resize textarea based on content
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta && !collapsed) {
      try {
        ta.style.height = "auto";
        const contentHeight = ta.scrollHeight;
        const newHeight = Math.min(Math.max(contentHeight, 80), 400); // min 80px, max 400px
        ta.style.height = `${newHeight}px`;
        ta.style.overflowY = contentHeight > 400 ? "auto" : "hidden";
      } catch (err) {
        // ignore
      }
    }
  }, [command, collapsed]);

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
    if (e.ctrlKey && e.key === "a") {
      // Allow default behavior (select all in textarea) but stop propagation to Lexical
      // Lexical would otherwise capture this as "Select All Editor Content"
      e.stopPropagation();
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
              className="min-h-[80px] md:min-h-[100px] resize-none text-sm md:text-base"
            />
            <div className="flex items-center justify-between mt-1">
              {/* Interim transcript indicator */}
              <div className="flex-1 min-w-0">
                {stt.isListening && stt.interimTranscript && (
                  <span className="text-xs text-muted-foreground italic truncate block">
                    {stt.interimTranscript}
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                {stt.isSupported && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={stt.toggle}
                    className={cn("h-6 w-6", stt.isListening && "text-red-500")}
                    title={stt.isListening ? "Stop dictation" : "Start dictation"}
                  >
                    <Mic className={cn("h-3 w-3", stt.isListening && "animate-pulse")} />
                  </Button>
                )}
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
            onRegenerate={gen.handleRegenerate}
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

      <RegenerateDialog
        open={showRegenerateDialog}
        onOpenChange={(v) => set({ showRegenerateDialog: v })}
        messages={lastGenerationMessages}
        previousResponse={lastGenerationResponse}
        onRegenerate={gen.handleRegenerate}
        isStreaming={streaming}
      />
    </div>
  );
}

// ── Orchestrator wrapper (creates store + provides context) ────

function SceneBeatComponent({
  nodeKey,
  initialSnapshot,
}: {
  nodeKey: NodeKey;
  initialSnapshot: SceneBeatNodeSnapshot;
}): JSX.Element {
  const storeRef = useRef<SceneBeatInstanceStoreApi>();
  if (!storeRef.current) {
    storeRef.current = createSceneBeatInstanceStore(nodeKey);
  }

  return (
    <SceneBeatStoreContext.Provider value={storeRef.current}>
      <SceneBeatInner nodeKey={nodeKey} initialSnapshot={initialSnapshot} />
    </SceneBeatStoreContext.Provider>
  );
}

// ── Lexical Node class ─────────────────────────────────────────

export class SceneBeatNode extends DecoratorNode<JSX.Element> {
  __sceneBeatId: string;
  __command: string;
  __povType: SceneBeat["povType"] | undefined;
  __povCharacter: string | undefined;
  __generatedContent: string;
  __accepted: boolean;
  __metadata: SceneBeat["metadata"] | undefined;
  __collapsed: boolean;

  constructor(
    sceneBeatId: string = "",
    snapshot: Partial<SceneBeatNodeSnapshot> = {},
    key?: NodeKey
  ) {
    super(key);
    this.__sceneBeatId = sceneBeatId;
    this.__command = snapshot.command || "";
    this.__povType = snapshot.povType;
    this.__povCharacter = snapshot.povCharacter;
    this.__generatedContent = snapshot.generatedContent || "";
    this.__accepted = snapshot.accepted || false;
    this.__metadata = snapshot.metadata;
    this.__collapsed = snapshot.collapsed || false;
  }

  static getType(): string {
    return "scene-beat";
  }

  static clone(node: SceneBeatNode): SceneBeatNode {
    return new SceneBeatNode(
      node.__sceneBeatId,
      {
        command: node.__command,
        povType: node.__povType,
        povCharacter: node.__povCharacter,
        generatedContent: node.__generatedContent,
        accepted: node.__accepted,
        metadata: node.__metadata,
        collapsed: node.__collapsed,
      },
      node.__key
    );
  }

  static importJSON(serializedNode: SerializedSceneBeatNode): SceneBeatNode {
    return $createSceneBeatNode(serializedNode.sceneBeatId || "", {
      command: serializedNode.command || "",
      povType: serializedNode.povType,
      povCharacter: serializedNode.povCharacter,
      generatedContent: serializedNode.generatedContent || "",
      accepted: serializedNode.accepted || false,
      metadata: serializedNode.metadata,
      collapsed: serializedNode.collapsed || false,
    });
  }

  exportJSON(): SerializedSceneBeatNode {
    return {
      type: "scene-beat",
      version: 2,
      sceneBeatId: this.__sceneBeatId,
      command: this.__command,
      povType: this.__povType,
      povCharacter: this.__povCharacter,
      generatedContent: this.__generatedContent,
      accepted: this.__accepted,
      metadata: this.__metadata,
      collapsed: this.__collapsed,
    };
  }

  getSceneBeatId(): string {
    return this.__sceneBeatId;
  }

  setSceneBeatId(id: string): void {
    if (this.__sceneBeatId === id) return;
    const writable = this.getWritable();
    writable.__sceneBeatId = id;
  }

  setSceneBeatSnapshot(snapshot: Partial<SceneBeatNodeSnapshot>): void {
    let writable: SceneBeatNode | null = null;
    const getWritableNode = () => {
      writable = writable || this.getWritable();
      return writable;
    };

    if ("sceneBeatId" in snapshot && this.__sceneBeatId !== (snapshot.sceneBeatId || "")) {
      getWritableNode().__sceneBeatId = snapshot.sceneBeatId || "";
    }
    if ("command" in snapshot && this.__command !== (snapshot.command || "")) {
      getWritableNode().__command = snapshot.command || "";
    }
    if ("povType" in snapshot && this.__povType !== snapshot.povType) {
      getWritableNode().__povType = snapshot.povType;
    }
    if ("povCharacter" in snapshot && this.__povCharacter !== snapshot.povCharacter) {
      getWritableNode().__povCharacter = snapshot.povCharacter;
    }
    if ("generatedContent" in snapshot && this.__generatedContent !== (snapshot.generatedContent || "")) {
      getWritableNode().__generatedContent = snapshot.generatedContent || "";
    }
    if ("accepted" in snapshot && this.__accepted !== (snapshot.accepted || false)) {
      getWritableNode().__accepted = snapshot.accepted || false;
    }
    if ("metadata" in snapshot && JSON.stringify(this.__metadata) !== JSON.stringify(snapshot.metadata)) {
      getWritableNode().__metadata = snapshot.metadata;
    }
    if ("collapsed" in snapshot && this.__collapsed !== (snapshot.collapsed || false)) {
      getWritableNode().__collapsed = snapshot.collapsed || false;
    }
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
        <SceneBeatComponent
          nodeKey={this.__key}
          initialSnapshot={{
            sceneBeatId: this.__sceneBeatId,
            command: this.__command,
            povType: this.__povType,
            povCharacter: this.__povCharacter,
            generatedContent: this.__generatedContent,
            accepted: this.__accepted,
            metadata: this.__metadata,
            collapsed: this.__collapsed,
          }}
        />
      </Suspense>
    );
  }
}

export function $createSceneBeatNode(
  sceneBeatId: string = "",
  snapshot: Partial<SceneBeatNodeSnapshot> = {}
): SceneBeatNode {
  return $applyNodeReplacement(new SceneBeatNode(sceneBeatId, snapshot));
}

export function $isSceneBeatNode(
  node: LexicalNode | null | undefined
): node is SceneBeatNode {
  return node instanceof SceneBeatNode;
}
