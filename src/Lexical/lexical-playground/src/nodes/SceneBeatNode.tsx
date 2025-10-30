import type {
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";

import {
  $applyNodeReplacement,
  DecoratorNode,
} from "lexical";
import {
  Suspense,
  useState,
  useMemo,
  useEffect,
} from "react";
import { Button } from "@/components/ui/button";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  ChevronRight,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { usePromptStore } from "@/features/prompts/store/promptStore";
import type {
  Prompt,
  AllowedModel,
  LorebookEntry,
} from "@/types/story";
import { toast } from "react-toastify";
import { Textarea } from "@/components/ui/textarea";
import { useStoryContext } from "@/features/stories/context/StoryContext";
import { useLorebookStore } from "@/features/lorebook/stores/useLorebookStore";
import { PromptPreviewDialog } from "@/components/ui/prompt-preview-dialog";
import { SceneBeatMatchedEntries } from "./SceneBeatMatchedEntries";
import { useChapterStore } from "@/features/chapters/stores/useChapterStore";
import { sceneBeatService } from "@/features/scenebeats/services/sceneBeatService";

// Extracted components
import { POVSettingsPopover } from "./scene-beat/components/POVSettingsPopover";
import type { POVType } from "./scene-beat/components/POVSettingsPopover";
import { ContextToggles } from "./scene-beat/components/ContextToggles";
import { LorebookMultiSelect } from "./scene-beat/components/LorebookMultiSelect";
import { MatchedEntriesPanel } from "./scene-beat/components/MatchedEntriesPanel";
import { GenerationControls } from "./scene-beat/components/GenerationControls";

// Extracted hooks
import { useSceneBeatData } from "./scene-beat/hooks/useSceneBeatData";
import { useCommandHistory } from "./scene-beat/hooks/useCommandHistory";
import { useLorebookMatching } from "./scene-beat/hooks/useLorebookMatching";
import { useSceneBeatSync } from "./scene-beat/hooks/useSceneBeatSync";
import { useSceneBeatGeneration } from "./scene-beat/hooks/useSceneBeatGeneration";

// Extracted services
import { createPromptConfig } from "./scene-beat/services/sceneBeatPromptService";
import { insertTextAfterNode } from "./scene-beat/services/lexicalEditorUtils";

export type SerializedSceneBeatNode = Spread<
  {
    type: "scene-beat";
    version: 1;
    sceneBeatId: string;
  },
  SerializedLexicalNode
>;

function SceneBeatComponent({ nodeKey }: { nodeKey: NodeKey }): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const { currentStoryId, currentChapterId } = useStoryContext();
  const { currentChapter } = useChapterStore();
  const { prompts, fetchPrompts, isLoading, error } = usePromptStore();
  const { tagMap, chapterMatchedEntries, entries } = useLorebookStore();

  // UI state
  const [collapsed, setCollapsed] = useState(false);
  const [showMatchedEntries, setShowMatchedEntries] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt>();
  const [selectedModel, setSelectedModel] = useState<AllowedModel>();
  const [selectedItems, setSelectedItems] = useState<LorebookEntry[]>([]);

  // Load scene beat data and initialize
  const {
    sceneBeatId,
    isLoaded,
    initialCommand,
    initialPovType,
    initialPovCharacter,
    useMatchedChapter: initialUseMatchedChapter,
    useMatchedSceneBeat: initialUseMatchedSceneBeat,
    useCustomContext: initialUseCustomContext,
  } = useSceneBeatData({
    editor,
    nodeKey,
    currentStoryId,
    currentChapterId,
    defaultPovType: currentChapter?.povType || "Third Person Omniscient",
    defaultPovCharacter: currentChapter?.povCharacter,
  });

  // Context toggles state
  const [useMatchedChapter, setUseMatchedChapter] = useState(initialUseMatchedChapter);
  const [useMatchedSceneBeat, setUseMatchedSceneBeat] = useState(initialUseMatchedSceneBeat);
  const [useCustomContext, setUseCustomContext] = useState(initialUseCustomContext);

  // Update context toggles when data loads
  useEffect(() => {
    if (isLoaded) {
      setUseMatchedChapter(initialUseMatchedChapter);
      setUseMatchedSceneBeat(initialUseMatchedSceneBeat);
      setUseCustomContext(initialUseCustomContext);
    }
  }, [isLoaded, initialUseMatchedChapter, initialUseMatchedSceneBeat, initialUseCustomContext]);

  // POV state
  const [povType, setPovType] = useState<POVType | undefined>(initialPovType);
  const [povCharacter, setPovCharacter] = useState<string | undefined>(initialPovCharacter);

  // Update POV when data loads
  useEffect(() => {
    if (isLoaded) {
      setPovType(initialPovType);
      setPovCharacter(initialPovCharacter);
    }
  }, [isLoaded, initialPovType, initialPovCharacter]);

  // Command history hook
  const { command, handleCommandChange, handleKeyDown } = useCommandHistory(initialCommand);

  // Lorebook matching (derived state using useMemo)
  const localMatchedEntries = useLorebookMatching(command, tagMap);

  // Database sync hooks
  const { saveCommand, saveToggles, savePOVSettings, saveAccepted } = useSceneBeatSync(sceneBeatId);

  // AI generation hook
  const {
    streaming,
    streamedText,
    streamComplete,
    previewMessages,
    previewLoading,
    previewError,
    generateWithConfig,
    previewPrompt,
    stopGeneration,
    resetGeneration,
  } = useSceneBeatGeneration();

  // Character entries (memoized for performance)
  const characterEntries = useMemo(
    () => entries.filter((entry) => entry.category === "character"),
    [entries]
  );

  // Load prompts on mount
  useEffect(() => {
    fetchPrompts().catch((error) => {
      toast.error("Failed to load prompts");
      console.error("Error loading prompts:", error);
    });
  }, [fetchPrompts]);

  // Save command changes (debounced via useSceneBeatSync)
  useEffect(() => {
    if (sceneBeatId && isLoaded) {
      saveCommand(command);
    }
  }, [command, sceneBeatId, saveCommand, isLoaded]);

  // Save toggle changes (debounced via useSceneBeatSync)
  useEffect(() => {
    if (sceneBeatId && isLoaded) {
      saveToggles(useMatchedChapter, useMatchedSceneBeat, useCustomContext);
    }
  }, [
    useMatchedChapter,
    useMatchedSceneBeat,
    useCustomContext,
    sceneBeatId,
    isLoaded,
    saveToggles,
  ]);

  // Event handlers
  const handleDelete = async () => {
    if (sceneBeatId) {
      try {
        await sceneBeatService.deleteSceneBeat(sceneBeatId);
      } catch (error) {
        console.error("Error deleting SceneBeat from database:", error);
        toast.error("Failed to delete scene beat from database");
      }
    }

    editor.update(() => {
      const node = editor.getEditorState().read(() => editor._editorState._nodeMap.get(nodeKey));
      if (node) {
        node.remove();
      }
    });
  };

  const handlePromptSelect = (prompt: Prompt, model: AllowedModel) => {
    setSelectedPrompt(prompt);
    setSelectedModel(model);
  };

  const handlePovSave = async (newPovType: POVType | undefined, newPovCharacter: string | undefined) => {
    setPovType(newPovType);
    setPovCharacter(newPovCharacter);
    await savePOVSettings(newPovType, newPovCharacter);
    toast.success("POV settings saved");
  };

  const handlePreviewPrompt = async () => {
    if (!selectedPrompt || !currentStoryId || !currentChapterId) {
      toast.error("Please select a prompt first");
      return;
    }

    const config = createPromptConfig(editor, nodeKey, selectedPrompt, {
      storyId: currentStoryId,
      chapterId: currentChapterId,
      command,
      povType,
      povCharacter,
      chapterMatchedEntries,
      localMatchedEntries,
      sceneBeatContext: {
        useMatchedChapter,
        useMatchedSceneBeat,
        useCustomContext,
        customContextItems: selectedItems.map((item) => item.id),
      },
      selectedItems,
    });

    await previewPrompt(config);
    setShowPreviewDialog(true);
  };

  const handleGenerateWithPrompt = async () => {
    if (!selectedPrompt || !currentStoryId || !currentChapterId) {
      toast.error("Please select a prompt first");
      return;
    }

    const config = createPromptConfig(editor, nodeKey, selectedPrompt, {
      storyId: currentStoryId,
      chapterId: currentChapterId,
      command,
      povType,
      povCharacter,
      chapterMatchedEntries,
      localMatchedEntries,
      sceneBeatContext: {
        useMatchedChapter,
        useMatchedSceneBeat,
        useCustomContext,
        customContextItems: selectedItems.map((item) => item.id),
      },
      selectedItems,
    });

    await generateWithConfig(config, selectedModel);
  };

  const handleAccept = async () => {
    insertTextAfterNode(editor, nodeKey, streamedText);
    await saveAccepted(true);
    resetGeneration();
  };

  const handleReject = () => {
    resetGeneration();
  };

  const handleItemSelect = (itemId: string) => {
    const item = entries.find((entry) => entry.id === itemId);
    if (item && !selectedItems.some((i) => i.id === itemId)) {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter((item) => item.id !== itemId));
  };

  return (
    <div className="relative my-4 rounded-lg border border-border bg-card">
      {/* Collapsible Header */}
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center hover:bg-accent/50 rounded-md w-6 h-6"
            aria-label={collapsed ? "Expand scene beat" : "Collapse scene beat"}
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                !collapsed && "rotate-90"
              )}
            />
          </button>
          <span className="font-medium">Scene Beat</span>
        </div>
        <div className="flex items-center gap-2">
          {streaming && (
            <Button
              variant="default"
              size="sm"
              onClick={stopGeneration}
              className="h-8"
            >
              Stop
            </Button>
          )}

          <POVSettingsPopover
            povType={povType}
            povCharacter={povCharacter}
            characterEntries={characterEntries}
            onSave={handlePovSave}
          />

          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => setShowMatchedEntries(!showMatchedEntries)}
          >
            <Eye className="h-4 w-4 mr-2" />
            <span>Scenebeat Matched Tags</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            aria-label="Delete scene beat"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Collapsible Content */}
      {!collapsed && (
        <div className="space-y-4">
          {/* Command textarea */}
          <div className="p-4">
            <Textarea
              placeholder="Enter your scene beat command here..."
              value={command}
              onChange={(e) => handleCommandChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Context Toggles with Custom Context Selection */}
          <ContextToggles
            useMatchedChapter={useMatchedChapter}
            useMatchedSceneBeat={useMatchedSceneBeat}
            useCustomContext={useCustomContext}
            onMatchedChapterChange={setUseMatchedChapter}
            onMatchedSceneBeatChange={setUseMatchedSceneBeat}
            onCustomContextChange={setUseCustomContext}
          >
            {useCustomContext && (
              <LorebookMultiSelect
                entries={entries}
                selectedItems={selectedItems}
                onItemSelect={handleItemSelect}
                onItemRemove={removeItem}
              />
            )}
          </ContextToggles>

          {/* Streamed text display */}
          {streamedText && (
            <div className="border-t border-border p-2">{streamedText}</div>
          )}

          {/* Generation Controls */}
          <GenerationControls
            isLoading={isLoading}
            error={error}
            prompts={prompts}
            selectedPrompt={selectedPrompt}
            selectedModel={selectedModel}
            streaming={streaming}
            streamComplete={streamComplete}
            onPromptSelect={handlePromptSelect}
            onPreview={handlePreviewPrompt}
            onGenerate={handleGenerateWithPrompt}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        </div>
      )}

      {/* Matched Entries Dialog */}
      <SceneBeatMatchedEntries
        open={showMatchedEntries}
        onOpenChange={setShowMatchedEntries}
        matchedEntries={new Set(localMatchedEntries.values())}
      />

      {/* Prompt Preview Dialog */}
      <PromptPreviewDialog
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        messages={previewMessages}
        isLoading={previewLoading}
        error={previewError}
      />

      {/* Matched Entries Panel */}
      {showMatchedEntries && (
        <MatchedEntriesPanel
          chapterMatchedEntries={chapterMatchedEntries}
          sceneBeatMatchedEntries={localMatchedEntries}
          customContextEntries={selectedItems}
          useMatchedChapter={useMatchedChapter}
          useMatchedSceneBeat={useMatchedSceneBeat}
          useCustomContext={useCustomContext}
        />
      )}
    </div>
  );
}

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
