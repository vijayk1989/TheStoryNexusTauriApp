import type {
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";

import {
  $applyNodeReplacement,
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  DecoratorNode,
} from "lexical";
import {
  Suspense,
  useState,
  useMemo,
  useEffect,
  useRef,
  KeyboardEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  ChevronRight,
  Loader2,
  User,
  Check,
  Tag,
  Plus,
  Eye,
  ChevronUp,
  ChevronDown,
  ChevronRightIcon,
  Square,
  Bot,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { usePromptStore } from "@/features/prompts/store/promptStore";
import {
  AIModel,
  Prompt,
  PromptParserConfig,
  AllowedModel,
  PromptMessage,
  SceneBeat,
  LorebookEntry,
  PipelinePreset,
  AgentResult,
} from "@/types/story";
import { useAIStore } from "@/features/ai/stores/useAIStore";
import { toast } from "react-toastify";
import { Textarea } from "@/components/ui/textarea";
import { useStoryContext } from "@/features/stories/context/StoryContext";
import { useLorebookStore } from "@/features/lorebook/stores/useLorebookStore";
import { PromptSelectMenu } from "@/components/ui/prompt-select-menu";
import { PromptPreviewDialog } from "@/components/ui/prompt-preview-dialog";
import { debounce } from "lodash";
import { SceneBeatMatchedEntries } from "./SceneBeatMatchedEntries";
import { createPromptParser } from "@/features/prompts/services/promptParser";
import { useChapterStore } from "@/features/chapters/stores/useChapterStore";
import { sceneBeatService } from "@/features/scenebeats/services/sceneBeatService";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { useAgenticGeneration } from "@/features/agents/hooks/useAgenticGeneration";
import { Progress } from "@/components/ui/progress";
import { PipelineDiagnosticsDialog } from "@/features/agents/components/PipelineDiagnosticsDialog";

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
  const [collapsed, setCollapsed] = useState(false);
  const [command, setCommand] = useState("");
  const [streamedText, setStreamedText] = useState("");
  const [streamComplete, setStreamComplete] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const { prompts, fetchPrompts, isLoading, error } = usePromptStore();
  const { generateWithPrompt, processStreamedResponse, abortGeneration } = useAIStore();
  const { tagMap, chapterMatchedEntries, entries } = useLorebookStore();
  const [localMatchedEntries, setLocalMatchedEntries] = useState<
    Map<string, LorebookEntry>
  >(new Map());
  const [showMatchedEntries, setShowMatchedEntries] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt>();
  const [selectedModel, setSelectedModel] = useState<AllowedModel>();
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewMessages, setPreviewMessages] = useState<PromptMessage[]>();
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [povType, setPovType] = useState<
    | "First Person"
    | "Third Person Limited"
    | "Third Person Omniscient"
    | undefined
  >("Third Person Omniscient");
  const [povCharacter, setPovCharacter] = useState<string | undefined>();
  const [showPovPopover, setShowPovPopover] = useState(false);
  const [tempPovType, setTempPovType] = useState<
    | "First Person"
    | "Third Person Limited"
    | "Third Person Omniscient"
    | undefined
  >("Third Person Omniscient");
  const [tempPovCharacter, setTempPovCharacter] = useState<
    string | undefined
  >();
  const [sceneBeatId, setSceneBeatId] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [showAdditionalContext, setShowAdditionalContext] = useState(false);
  const [selectedItems, setSelectedItems] = useState<LorebookEntry[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // State for context toggles
  const [useMatchedChapter, setUseMatchedChapter] = useState(true); // Default: ON
  const [useMatchedSceneBeat, setUseMatchedSceneBeat] = useState(false); // Default: OFF
  const [useCustomContext, setUseCustomContext] = useState(false); // Default: OFF
  const [includeAllLorebook, setIncludeAllLorebook] = useState(false);
  const [showContext, setShowContext] = useState(false);

  // Agentic mode state
  const [agenticMode, setAgenticMode] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState<PipelinePreset | null>(null);
  const [availablePipelines, setAvailablePipelines] = useState<PipelinePreset[]>([]);
  const [agenticStepResults, setAgenticStepResults] = useState<AgentResult[]>([]);
  const [showAgenticProgress, setShowAgenticProgress] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Agentic generation hook
  const {
    isGenerating: isAgenticGenerating,
    currentStep,
    currentAgentName,
    stepResults,
    error: agenticError,
    generateWithPipeline,
    abortGeneration: abortAgenticGeneration,
    getAvailablePipelines,
  } = useAgenticGeneration();

  // Get character entries from lorebook
  const characterEntries = useMemo(() => {
    return entries.filter((entry) => entry.category === "character");
  }, [entries]);

  useEffect(() => {
    fetchPrompts().catch((error) => {
      toast.error("Failed to load prompts");
      console.error("Error loading prompts:", error);
    });
  }, [fetchPrompts]);

  // Load available pipelines when agentic mode is enabled
  useEffect(() => {
    if (agenticMode) {
      getAvailablePipelines().then((pipelines) => {
        setAvailablePipelines(pipelines);
        // Auto-select first pipeline if none selected
        if (pipelines.length > 0 && !selectedPipeline) {
          setSelectedPipeline(pipelines[0]);
        }
      }).catch((error) => {
        console.error("Error loading pipelines:", error);
        toast.error("Failed to load AI pipelines");
      });
    }
  }, [agenticMode, getAvailablePipelines, selectedPipeline]);

  // Get the sceneBeatId from the node
  useEffect(() => {
    editor.getEditorState().read(() => {
      const node = $getNodeByKey(nodeKey);
      if (node instanceof SceneBeatNode) {
        setSceneBeatId(node.getSceneBeatId());
      }
    });
  }, [editor, nodeKey]);

  // Load or create SceneBeat data
  useEffect(() => {
    const loadOrCreateSceneBeat = async () => {
      if (isLoaded) return;

      if (sceneBeatId) {
        // Load existing SceneBeat
        try {
          const data = await sceneBeatService.getSceneBeat(sceneBeatId);
          if (data) {
            setCommand(data.command || "");
            setPovType(
              data.povType ||
                currentChapter?.povType ||
                "Third Person Omniscient"
            );
            setPovCharacter(data.povCharacter || currentChapter?.povCharacter);
            setTempPovType(
              data.povType ||
                currentChapter?.povType ||
                "Third Person Omniscient"
            );
            setTempPovCharacter(
              data.povCharacter || currentChapter?.povCharacter
            );
            setIsLoaded(true);
          }
        } catch (error) {
          console.error("Error loading SceneBeat:", error);
        }
      } else if (currentStoryId && currentChapterId) {
        // Create new SceneBeat
        try {
          const newId = await sceneBeatService.createSceneBeat({
            storyId: currentStoryId,
            chapterId: currentChapterId,
            command: "",
            povType: currentChapter?.povType || "Third Person Omniscient",
            povCharacter: currentChapter?.povCharacter,
          });

          // Update the node with the new ID
          editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if (node instanceof SceneBeatNode) {
              node.setSceneBeatId(newId);
            }
          });

          setSceneBeatId(newId);
          setPovType(currentChapter?.povType || "Third Person Omniscient");
          setPovCharacter(currentChapter?.povCharacter);
          setTempPovType(currentChapter?.povType || "Third Person Omniscient");
          setTempPovCharacter(currentChapter?.povCharacter);
          setIsLoaded(true);
        } catch (error) {
          console.error("Error creating SceneBeat:", error);
        }
      }
    };

    loadOrCreateSceneBeat();
  }, [
    editor,
    nodeKey,
    sceneBeatId,
    currentStoryId,
    currentChapterId,
    currentChapter,
    isLoaded,
  ]);

  // Save command changes to the database
  const saveCommand = useMemo(
    () =>
      debounce(async (id: string, newCommand: string) => {
        if (!id) return;

        try {
          await sceneBeatService.updateSceneBeat(id, { command: newCommand });
        } catch (error) {
          console.error("Error saving SceneBeat command:", error);
        }
      }, 500),
    []
  );

  // Handle command changes
  useEffect(() => {
    if (sceneBeatId && isLoaded) {
      saveCommand(sceneBeatId, command);
    }
  }, [command, sceneBeatId, saveCommand, isLoaded]);

  // Add debounced tag matching effect for the command textarea
  useEffect(() => {
    const matchTags = () => {
      const matchedEntries = new Map<string, LorebookEntry>();

      Object.entries(tagMap).forEach(([tag, entry]) => {
        if (command.toLowerCase().includes(tag.toLowerCase())) {
          matchedEntries.set(entry.id, entry);
        }
      });

      setLocalMatchedEntries(matchedEntries);
    };

    const debouncedMatch = debounce(matchTags, 500);
    debouncedMatch();

    return () => {
      debouncedMatch.cancel();
    };
  }, [command, tagMap]);

  // Add effect to handle toggle changes
  useEffect(() => {
    // Log the current toggle states
    console.log("Context toggle states changed:", {
      useMatchedChapter,
      useMatchedSceneBeat,
      useCustomContext,
    });

    // Save the scene beat with updated toggle states
    if (sceneBeatId && isLoaded) {
      const updatedSceneBeat: Partial<SceneBeat> = {
        metadata: {
          useMatchedChapter,
          useMatchedSceneBeat,
          useCustomContext,
        },
      };

      sceneBeatService
        .updateSceneBeat(sceneBeatId, updatedSceneBeat)
        .catch((error) => {
          console.error("Error updating scene beat toggle states:", error);
        });
    }
  }, [
    useMatchedChapter,
    useMatchedSceneBeat,
    useCustomContext,
    sceneBeatId,
    isLoaded,
    currentStoryId,
    currentChapterId,
    command,
    povType,
    povCharacter,
  ]);

  // Add effect to load toggle states from scene beat
  useEffect(() => {
    if (sceneBeatId && isLoaded) {
      sceneBeatService
        .getSceneBeat(sceneBeatId)
        .then((sceneBeat) => {
          if (sceneBeat?.metadata) {
            // Set toggle states from scene beat metadata
            if (typeof sceneBeat.metadata.useMatchedChapter === "boolean") {
              setUseMatchedChapter(sceneBeat.metadata.useMatchedChapter);
            }
            if (typeof sceneBeat.metadata.useMatchedSceneBeat === "boolean") {
              setUseMatchedSceneBeat(sceneBeat.metadata.useMatchedSceneBeat);
            }
            if (typeof sceneBeat.metadata.useCustomContext === "boolean") {
              setUseCustomContext(sceneBeat.metadata.useCustomContext);
            }
          }
        })
        .catch((error) => {
          console.error("Error loading scene beat toggle states:", error);
        });
    }
  }, [sceneBeatId, isLoaded]);

  // Clear custom context selections if custom context is turned off
  useEffect(() => {
    if (!useCustomContext) {
      setIncludeAllLorebook(false);
      setSelectedItems([]);
    }
  }, [useCustomContext]);

  // Initialize history when command is first loaded
  useEffect(() => {
    if (isLoaded && command && commandHistory.length === 0) {
      setCommandHistory([command]);
      setHistoryIndex(0);
    }
  }, [isLoaded, command, commandHistory]);

  // Handle command changes with history tracking
  const handleCommandChange = (newCommand: string) => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      setCommand(newCommand);
      return;
    }

    // Only add to history if the command actually changed
    if (newCommand !== command) {
      // Truncate future history if we're not at the end
      const newHistory = commandHistory.slice(0, historyIndex + 1);

      // Add new command to history (but avoid consecutive duplicates)
      if (newHistory[newHistory.length - 1] !== newCommand) {
        const updatedHistory = [...newHistory, newCommand];
        setCommandHistory(updatedHistory);
        setHistoryIndex(updatedHistory.length - 1);
      }

      setCommand(newCommand);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true;
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCommand(commandHistory[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < commandHistory.length - 1) {
      isUndoRedoAction.current = true;
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCommand(commandHistory[newIndex]);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Check for Ctrl+Z (Undo)
    if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
      e.preventDefault(); // Prevent default browser undo
      e.stopPropagation(); // Stop event from reaching Lexical editor
      handleUndo();
      return;
    }

    // Check for Ctrl+Shift+Z or Ctrl+Y (Redo)
    if (
      (e.ctrlKey && e.shiftKey && e.key === "z") ||
      (e.ctrlKey && e.key === "y")
    ) {
      e.preventDefault(); // Prevent default browser redo
      e.stopPropagation(); // Stop event from reaching Lexical editor
      handleRedo();
      return;
    }
  };

  const handleDelete = async () => {
    console.log("Deleting SceneBeat node with ID:", sceneBeatId);

    if (sceneBeatId) {
      try {
        await sceneBeatService.deleteSceneBeat(sceneBeatId);
        console.log("Successfully deleted SceneBeat from database");
      } catch (error) {
        console.error("Error deleting SceneBeat from database:", error);
        toast.error("Failed to delete scene beat from database");
      }
    }

    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (node) {
        console.log("Removing SceneBeat node from editor");
        node.remove();
      } else {
        console.error("Could not find SceneBeat node with key:", nodeKey);
      }
    });
  };

  const handlePromptSelect = (prompt: Prompt, model: AllowedModel) => {
    setSelectedPrompt(prompt);
    setSelectedModel(model);
    // Reset preview state when selecting a new prompt
    setPreviewMessages(undefined);
    setPreviewError(null);
  };

  const handlePovTypeChange = (
    value: "First Person" | "Third Person Limited" | "Third Person Omniscient"
  ) => {
    setTempPovType(value);
    // If switching to omniscient, clear character
    if (value === "Third Person Omniscient") {
      setTempPovCharacter(undefined);
    }
  };

  const handlePovCharacterChange = (value: string) => {
    setTempPovCharacter(value);
  };

  const handleSavePov = async () => {
    setPovType(tempPovType);
    setPovCharacter(tempPovCharacter);

    // Save to database
    if (sceneBeatId) {
      try {
        await sceneBeatService.updateSceneBeat(sceneBeatId, {
          povType: tempPovType,
          povCharacter: tempPovCharacter,
        });
      } catch (error) {
        console.error("Error saving POV settings:", error);
      }
    }

    setShowPovPopover(false);
    toast.success("POV settings saved");
  };

  // Reset temp values when opening the popover
  const handleOpenPovPopover = (open: boolean) => {
    if (open) {
      setTempPovType(povType);
      setTempPovCharacter(povCharacter);
    }
    setShowPovPopover(open);
  };

  const createPromptConfig = (prompt: Prompt): PromptParserConfig => {
    if (!currentStoryId || !currentChapterId) {
      throw new Error("No story or chapter context found");
    }

    let previousText = "";
    editor.getEditorState().read(() => {
      const node = $getNodeByKey(nodeKey);
      if (node) {
        const textNodes: string[] = [];
        let currentNode = node.getPreviousSibling();

        while (currentNode) {
          if ("getTextContent" in currentNode) {
            // Check if the node is a paragraph node (which should have a newline)
            const isBlockNode =
              currentNode.getType() === "paragraph" ||
              currentNode.getType() === "heading" ||
              currentNode.getType() === "list-item";

            const nodeText = currentNode.getTextContent();

            // Add the text content with proper newline handling
            if (nodeText.trim()) {
              textNodes.unshift(nodeText);

              // Add an extra newline after block nodes
              if (isBlockNode) {
                textNodes.unshift("\n");
              }
            }
          }
          currentNode = currentNode.getPreviousSibling();
        }

        previousText = textNodes.join("");

        // Log the collected text for debugging
        console.log("Collected previous text with preserved formatting:", {
          length: previousText.length,
          newlineCount: (previousText.match(/\n/g) || []).length,
          preview:
            previousText.substring(0, 100) +
            (previousText.length > 100 ? "..." : ""),
        });
      }
    });

    // Create a combined set of matched entries based on the toggle states
    const combinedMatchedEntries = new Set<LorebookEntry>();

    // Only include chapter matched entries if the toggle is enabled
    if (useMatchedChapter && chapterMatchedEntries) {
      console.log(
        "Including chapter matched entries:",
        chapterMatchedEntries.size
      );
      chapterMatchedEntries.forEach((entry) => {
        combinedMatchedEntries.add(entry);
      });
    }

    // Only include scene beat matched entries if the toggle is enabled
    if (useMatchedSceneBeat && localMatchedEntries) {
      console.log(
        "Including scene beat matched entries:",
        localMatchedEntries.size
      );
      localMatchedEntries.forEach((entry) => {
        combinedMatchedEntries.add(entry);
      });
    }

    // Log the matched entries for debugging
    console.log("Creating prompt config with matched entries:", {
      useMatchedChapter,
      useMatchedSceneBeat,
      useCustomContext,
      chapterMatchedEntriesSize: chapterMatchedEntries?.size || 0,
      localMatchedEntriesSize: localMatchedEntries?.size || 0,
      combinedMatchedEntriesSize: combinedMatchedEntries.size,
    });

    return {
      promptId: prompt.id,
      storyId: currentStoryId,
      chapterId: currentChapterId,
      scenebeat: command.trim(),
      previousWords: previousText,
      matchedEntries: combinedMatchedEntries,
      chapterMatchedEntries: new Set(
        chapterMatchedEntries ? Array.from(chapterMatchedEntries.values()) : []
      ),
      sceneBeatMatchedEntries: new Set(
        localMatchedEntries ? Array.from(localMatchedEntries.values()) : []
      ),
      povType,
      povCharacter:
        povType !== "Third Person Omniscient" ? povCharacter : undefined,
      sceneBeatContext: {
        useMatchedChapter,
        useMatchedSceneBeat,
        useCustomContext,
        customContextItems: useCustomContext
          ? selectedItems.map((item) => item.id)
          : [],
      },
    };
  };

  const handlePreviewPrompt = async () => {
    if (!selectedPrompt) {
      toast.error("Please select a prompt first");
      return;
    }

    try {
      setPreviewLoading(true);
      setPreviewError(null);
      setPreviewMessages(undefined);

      const config = createPromptConfig(selectedPrompt);

      // Log the config for debugging
      console.log("Preview prompt config:", {
        promptId: config.promptId,
        storyId: config.storyId,
        chapterId: config.chapterId,
        scenebeat: config.scenebeat,
        matchedEntriesCount: config.matchedEntries?.size,
        additionalContext: {
          selectedItems: config.additionalContext?.selectedItems,
          selectedItemsCount:
            config.additionalContext?.selectedItems?.length || 0,
        },
      });

      const promptParser = createPromptParser();
      const parsedPrompt = await promptParser.parse(config);

      if (parsedPrompt.error) {
        setPreviewError(parsedPrompt.error);
        toast.error(`Error parsing prompt: ${parsedPrompt.error}`);
        return;
      }

      setPreviewMessages(parsedPrompt.messages);
      setShowPreviewDialog(true);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setPreviewError(errorMessage);
      toast.error(`Error previewing prompt: ${errorMessage}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGenerateWithPrompt = async () => {
    if (!selectedPrompt) {
      toast.error("Please select a prompt first");
      return;
    }

    try {
      setStreaming(true);
      setStreamedText("");
      setStreamComplete(false);

      const config = createPromptConfig(selectedPrompt);

      // Log the config for debugging
      console.log("Generate prompt config:", {
        promptId: config.promptId,
        storyId: config.storyId,
        chapterId: config.chapterId,
        scenebeat: config.scenebeat,
        matchedEntriesCount: config.matchedEntries?.size,
        additionalContext: {
          selectedItems: config.additionalContext?.selectedItems,
          selectedItemsCount:
            config.additionalContext?.selectedItems?.length || 0,
        },
      });

      const response = await generateWithPrompt(config, selectedModel);

      // Handle aborted responses (204) similar to the chat interface
      if (!response.ok && response.status !== 204) {
        throw new Error("Failed to generate response");
      }

      if (response.status === 204) {
        // Generation was aborted
        console.log("Generation was aborted.");
        setStreaming(false);
        return;
      }

      await processStreamedResponse(
        response,
        (token) => {
          setStreamedText((prev) => prev + token);
        },
        () => {
          setStreamComplete(true);
        },
        (error) => {
          console.error("Error streaming response:", error);
          toast.error("Failed to generate text");
        }
      );

      // Save generated content to database
      if (sceneBeatId) {
        try {
          await sceneBeatService.updateSceneBeat(sceneBeatId, {
            generatedContent: streamedText,
            accepted: false,
          });
        } catch (error) {
          console.error("Error saving generated content:", error);
        }
      }
    } catch (error) {
      console.error("Error generating text:", error);
      toast.error("Failed to generate text");
    } finally {
      setStreaming(false);
    }
  };

  /**
   * Handle agentic generation using a multi-agent pipeline
   */
  const handleAgenticGenerate = async () => {
    if (!selectedPipeline) {
      toast.error("Please select a pipeline first");
      return;
    }

    if (!command.trim()) {
      toast.error("Please enter a scene beat command");
      return;
    }

    setStreamedText("");
    setStreamComplete(false);
    setAgenticStepResults([]);
    setShowAgenticProgress(true);

    // Collect previous text from editor (same as createPromptConfig)
    let previousText = "";
    editor.getEditorState().read(() => {
      const node = $getNodeByKey(nodeKey);
      if (node) {
        const textNodes: string[] = [];
        let currentNode = node.getPreviousSibling();

        while (currentNode) {
          if ("getTextContent" in currentNode) {
            const isBlockNode =
              currentNode.getType() === "paragraph" ||
              currentNode.getType() === "heading" ||
              currentNode.getType() === "list-item";

            const nodeText = currentNode.getTextContent();

            if (nodeText.trim()) {
              textNodes.unshift(nodeText);
              if (isBlockNode) {
                textNodes.unshift("\n");
              }
            }
          }
          currentNode = currentNode.getPreviousSibling();
        }

        previousText = textNodes.join("");
      }
    });

    // Combine matched entries
    const combinedMatchedEntries: LorebookEntry[] = [];

    if (useMatchedChapter && chapterMatchedEntries) {
      chapterMatchedEntries.forEach((entry) => {
        combinedMatchedEntries.push(entry);
      });
    }

    if (useMatchedSceneBeat && localMatchedEntries) {
      localMatchedEntries.forEach((entry) => {
        if (!combinedMatchedEntries.some((e) => e.id === entry.id)) {
          combinedMatchedEntries.push(entry);
        }
      });
    }

    // Add custom context items
    if (useCustomContext && selectedItems.length > 0) {
      selectedItems.forEach((entry) => {
        if (!combinedMatchedEntries.some((e) => e.id === entry.id)) {
          combinedMatchedEntries.push(entry);
        }
      });
    }

    // Get all entries for lore judge
    const allEntries = useLorebookStore.getState().getFilteredEntries();

    try {
      const result = await generateWithPipeline(
        selectedPipeline.id,
        {
          scenebeat: command.trim(),
          previousWords: previousText,
          matchedEntries: combinedMatchedEntries,
          allEntries,
          povType,
          povCharacter:
            povType !== "Third Person Omniscient" ? povCharacter : undefined,
          currentChapter: currentChapter ?? undefined,
          storyLanguage: "English", // TODO: Get from story settings
        },
        {
          onStepStart: (stepIndex, agentName) => {
            console.log(`[Agentic] Step ${stepIndex + 1}: ${agentName}`);
          },
          onStepComplete: (stepResult, stepIndex) => {
            console.log(`[Agentic] Step ${stepIndex + 1} complete:`, stepResult.role);
            setAgenticStepResults((prev) => [...prev, stepResult]);
          },
          onToken: (token) => {
            setStreamedText((prev) => prev + token);
          },
          onComplete: (pipelineResult) => {
            console.log("[Agentic] Pipeline complete:", pipelineResult.status);
            if (pipelineResult.status === "completed") {
              setStreamComplete(true);
              // Use proseOutput (actual story content) not finalOutput (might be a judge output)
              const contentToSave = pipelineResult.proseOutput || pipelineResult.finalOutput;
              // Save to database
              if (sceneBeatId) {
                sceneBeatService.updateSceneBeat(sceneBeatId, {
                  generatedContent: contentToSave,
                  accepted: false,
                  metadata: {
                    agenticPipelineId: selectedPipeline.id,
                    agenticResults: pipelineResult.steps,
                  },
                }).catch((error) => {
                  console.error("Error saving agentic result:", error);
                });
              }
            } else if (pipelineResult.status === "failed") {
              toast.error(`Pipeline failed: ${pipelineResult.error}`);
            }
          },
          onError: (error) => {
            console.error("[Agentic] Pipeline error:", error);
            toast.error(`Agentic generation failed: ${error.message}`);
          },
        }
      );
    } catch (error) {
      console.error("[Agentic] Error:", error);
      toast.error("Failed to run agentic generation");
    }
  };

  /**
   * Abort the current agentic generation
   */
  const handleAbortAgentic = () => {
    abortAgenticGeneration();
    setShowAgenticProgress(false);
  };

  const handleAccept = async () => {
    editor.update(() => {
      const paragraphNode = $createParagraphNode();
      paragraphNode.append($createTextNode(streamedText));
      const currentNode = $getNodeByKey(nodeKey);
      if (currentNode) {
        currentNode.insertAfter(paragraphNode);
      }
    });

    // Update accepted status in database
    if (sceneBeatId) {
      try {
        await sceneBeatService.updateSceneBeat(sceneBeatId, {
          accepted: true,
        });
      } catch (error) {
        console.error("Error updating accepted status:", error);
      }
    }

    setStreamedText("");
    setStreamComplete(false);
  };

  const handleReject = () => {
    setStreamedText("");
    setStreamComplete(false);
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
    <div className="relative my-4 rounded-lg border border-border bg-card overflow-hidden max-w-full">
      {/* Collapsible Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2">
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center hover:bg-accent/50 rounded-md w-6 h-6"
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                !collapsed && "rotate-90"
              )}
            />
          </button>
          <span className="font-medium text-sm md:text-base">Scene Beat</span>
        </div>
        <div className="flex flex-wrap items-center gap-1 md:gap-2">
          {streaming && (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                console.log("Stop button clicked");
                abortGeneration();
                setStreaming(false);
              }}
              className="h-7 md:h-8 text-xs md:text-sm"
            >
              Stop
            </Button>
          )}

          <Popover open={showPovPopover} onOpenChange={handleOpenPovPopover}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 md:h-8 text-xs md:text-sm px-2">
                <User className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">POV: </span>
                <span className="truncate max-w-[60px] sm:max-w-none">
                  {povType === "Third Person Omniscient"
                    ? "Omni"
                    : povCharacter || "Select"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80 max-w-sm">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Point of View</h4>
                  <p className="text-sm text-muted-foreground">
                    Set the POV for this scene beat
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="povType">POV Type</Label>
                  <Select
                    value={tempPovType}
                    onValueChange={(value) => handlePovTypeChange(value as any)}
                  >
                    <SelectTrigger id="povType">
                      <SelectValue placeholder="Select POV type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="First Person">First Person</SelectItem>
                      <SelectItem value="Third Person Limited">
                        Third Person Limited
                      </SelectItem>
                      <SelectItem value="Third Person Omniscient">
                        Third Person Omniscient
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {tempPovType !== "Third Person Omniscient" && (
                  <div className="grid gap-2">
                    <Label htmlFor="povCharacter">POV Character</Label>
                    <Select
                      value={tempPovCharacter}
                      onValueChange={handlePovCharacterChange}
                    >
                      <SelectTrigger id="povCharacter">
                        <SelectValue placeholder="Select character" />
                      </SelectTrigger>
                      <SelectContent>
                        {characterEntries.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No characters available
                          </SelectItem>
                        ) : (
                          characterEntries.map((character) => (
                            <SelectItem
                              key={character.id}
                              value={character.name}
                            >
                              {character.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button className="w-full mt-2" onClick={handleSavePov}>
                  <Check className="h-4 w-4 mr-2" />
                  Save POV Settings
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 md:h-8 text-xs md:text-sm px-2"
            onClick={() => setShowMatchedEntries(!showMatchedEntries)}
          >
            <Eye className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Matched Tags</span>
            <span className="sm:hidden">Tags</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
          </Button>
        </div>
      </div>

      {/* Collapsible Content */}
      {!collapsed && (
        <div className="space-y-4">
          {/* Command textarea */}
          <div className="p-4">
            <Textarea
              ref={textareaRef}
              placeholder="Enter your scene beat command here..."
              value={command}
              onChange={(e) => handleCommandChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={(e) => {
                // Ensure clicks don't propagate to the editor
                e.stopPropagation();
              }}
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Context section */}
          <div className="px-4 pb-2">
            <Collapsible open={showContext} onOpenChange={setShowContext}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center justify-between p-1 h-auto"
                >
                  {showContext ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="font-medium">Context</span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-4 mb-4">
                  {/* Matched Chapter Tags Toggle with All Lorebook switch */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">Matched Chapter Tags</div>
                      <div className="text-xs text-muted-foreground">
                        Include entries matched from the entire chapter
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={useMatchedChapter}
                          onCheckedChange={setUseMatchedChapter}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">All Lorebook</span>
                        <Switch
                          checked={includeAllLorebook}
                          onCheckedChange={(v) => {
                            const enabled = v as boolean;
                            setIncludeAllLorebook(enabled);
                            // enabling All Lorebook should enable custom context and select all filtered entries
                            if (enabled) {
                              setUseCustomContext(true);
                              const allEntries = useLorebookStore.getState().getFilteredEntries();
                              setSelectedItems(allEntries);
                            } else {
                              setSelectedItems([]);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Matched Scene Beat Tags Toggle */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">Matched Scene Beat Tags</div>
                      <div className="text-xs text-muted-foreground">
                        Include entries matched from this scene beat
                      </div>
                    </div>
                    <Switch
                      checked={useMatchedSceneBeat}
                      onCheckedChange={setUseMatchedSceneBeat}
                      className="flex-shrink-0"
                    />
                  </div>

                  {/* Custom Context Toggle */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">
                        Custom Context Selection
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Manually select additional lorebook entries
                      </div>
                    </div>
                    <Switch
                      checked={useCustomContext}
                      onCheckedChange={setUseCustomContext}
                      className="flex-shrink-0"
                    />
                  </div>
                </div>

                {/* Custom Context Selection */}
                {useCustomContext && (
                  <div className="mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">All Lorebook</div>
                        <div className="text-xs text-muted-foreground">
                          Select all lorebook entries as custom context
                        </div>
                      </div>
                      <Switch
                        checked={includeAllLorebook}
                        onCheckedChange={(v) => {
                          const enabled = v as boolean;
                          setIncludeAllLorebook(enabled);
                          if (enabled) {
                            // select all filtered lorebook entries
                            const allEntries = useLorebookStore.getState().getFilteredEntries();
                            setSelectedItems(allEntries);
                          } else {
                            setSelectedItems([]);
                          }
                        }}
                        className="flex-shrink-0"
                      />
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-sm">Custom Context</h4>
                    </div>

                    <div className="mb-4">
                      {/* Lorebook items multi-select */}
                      <div className="w-full">
                        <div className="text-xs font-medium mb-1">
                          Lorebook Items
                        </div>
                        <Select
                          onValueChange={(value) => {
                            handleItemSelect(value);
                            // Reset the select value after selection
                            const selectElement = document.querySelector(
                              '[data-lorebook-select="true"]'
                            );
                            if (selectElement) {
                              (selectElement as HTMLSelectElement).value = "";
                            }
                          }}
                          value=""
                        >
                          <SelectTrigger
                            className="w-full"
                            data-lorebook-select="true"
                          >
                            <SelectValue placeholder="Select lorebook item" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {/* Group by category */}
                            {[
                              "character",
                              "location",
                              "item",
                              "event",
                              "note",
                            ].map((category) => {
                              const categoryItems = entries.filter(
                                (entry) => entry.category === category
                              );
                              if (categoryItems.length === 0) return null;

                              return (
                                <div key={category}>
                                  <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted capitalize">
                                    {category}s
                                  </div>
                                  {categoryItems.map((entry) => (
                                    <SelectItem
                                      key={entry.id}
                                      value={entry.id}
                                      disabled={selectedItems.some(
                                        (item) => item.id === entry.id
                                      )}
                                    >
                                      {entry.name}
                                    </SelectItem>
                                  ))}
                                </div>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Badges section */}
                    <div className="border rounded-md p-2 md:p-3 bg-muted/10">
                      <div className="text-xs font-medium mb-2">
                        Selected Items ({selectedItems.length})
                      </div>
                      <div className="flex flex-wrap gap-1 md:gap-2 max-h-[120px] md:max-h-[150px] overflow-y-auto">
                        {/* Lorebook item badges */}
                        {selectedItems.map((item) => (
                          <Badge
                            key={item.id}
                            variant="secondary"
                            className="flex items-center gap-1 px-2 py-0.5 md:px-3 md:py-1 text-xs"
                          >
                            <span className="truncate max-w-[100px] md:max-w-none">{item.name}</span>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="ml-1 hover:text-destructive flex-shrink-0"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}

                        {selectedItems.length === 0 && (
                          <div className="text-muted-foreground text-xs">
                            No items selected
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Agentic Pipeline Progress */}
          {showAgenticProgress && isAgenticGenerating && (
            <div className="border-t border-border p-3 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-sm font-medium">
                  Running: {currentAgentName || "Initializing..."}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAbortAgentic}
                  className="ml-auto h-6 px-2 text-xs"
                >
                  <Square className="h-3 w-3 mr-1" />
                  Stop
                </Button>
              </div>
              <div className="space-y-1">
                {selectedPipeline && (
                  <Progress
                    value={((currentStep + 1) / selectedPipeline.steps.length) * 100}
                    className="h-1"
                  />
                )}
                <div className="flex flex-wrap gap-1">
                  {agenticStepResults.map((result, idx) => (
                    <Badge
                      key={idx}
                      variant={result.output.includes("CONSISTENT") ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {result.role}: {result.duration}ms
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {streamedText && (
            <div className="border-t border-border p-2">{streamedText}</div>
          )}

          <div className="flex flex-col gap-3 border-t border-border p-2">
            {/* Agentic Mode Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                checked={agenticMode}
                onCheckedChange={setAgenticMode}
                id="agentic-mode"
              />
              <Label htmlFor="agentic-mode" className="flex items-center gap-1 text-sm cursor-pointer">
                <Sparkles className="h-3 w-3" />
                Agentic Mode
              </Label>
              {agenticMode && (
                <Select
                  value={selectedPipeline?.id || ""}
                  onValueChange={(value) => {
                    const pipeline = availablePipelines.find((p) => p.id === value);
                    setSelectedPipeline(pipeline || null);
                  }}
                >
                  <SelectTrigger className="h-8 w-[200px] text-xs">
                    <SelectValue placeholder="Select pipeline" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePipelines.map((pipeline) => (
                      <SelectItem key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="flex flex-wrap gap-2 items-center">
                {!agenticMode && (
                  <>
                    <PromptSelectMenu
                      isLoading={isLoading}
                      error={error}
                      prompts={prompts}
                      promptType="scene_beat"
                      selectedPrompt={selectedPrompt}
                      selectedModel={selectedModel}
                      onSelect={handlePromptSelect}
                    />
                    {selectedPrompt && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviewPrompt}
                        className="text-xs md:text-sm"
                      >
                        <span className="hidden sm:inline">Preview Prompt</span>
                        <span className="sm:hidden">Preview</span>
                      </Button>
                    )}
                    <Button
                      onClick={handleGenerateWithPrompt}
                      disabled={streaming || !selectedPrompt || !selectedModel}
                      size="sm"
                      className="text-xs md:text-sm"
                    >
                      {streaming ? (
                        <>
                          <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin mr-1 md:mr-2" />
                          <span className="hidden sm:inline">Generating...</span>
                          <span className="sm:hidden">...</span>
                        </>
                      ) : (
                        <>
                          <span className="hidden sm:inline">Generate Prose</span>
                          <span className="sm:hidden">Generate</span>
                        </>
                      )}
                    </Button>
                  </>
                )}
                {agenticMode && (
                  <Button
                    onClick={handleAgenticGenerate}
                    disabled={isAgenticGenerating || !selectedPipeline || !command.trim()}
                    size="sm"
                    className="text-xs md:text-sm"
                  >
                    {isAgenticGenerating ? (
                      <>
                        <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin mr-1 md:mr-2" />
                        <span className="hidden sm:inline">Running Pipeline...</span>
                        <span className="sm:hidden">...</span>
                      </>
                    ) : (
                      <>
                        <Bot className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                        <span className="hidden sm:inline">Generate with Pipeline</span>
                        <span className="sm:hidden">Generate</span>
                      </>
                    )}
                  </Button>
                )}
              </div>

              {streamComplete && (
                <div className="flex gap-2 justify-end">
                  {agenticMode && agenticStepResults.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowDiagnostics(true)}
                      title="View pipeline diagnostics"
                    >
                      <Stethoscope className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Diagnose</span>
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={handleAccept}>
                    Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleReject}>
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <SceneBeatMatchedEntries
        open={showMatchedEntries}
        onOpenChange={setShowMatchedEntries}
        matchedEntries={new Set(localMatchedEntries.values())}
      />

      <PromptPreviewDialog
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        messages={previewMessages}
        isLoading={previewLoading}
        error={previewError}
      />

      <PipelineDiagnosticsDialog
        open={showDiagnostics}
        onOpenChange={setShowDiagnostics}
        results={agenticStepResults}
        pipelineName={selectedPipeline?.name}
      />

      {/* Matched Entries Panel */}
      {showMatchedEntries && (
        <div className="p-3 md:p-4 border-t">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <h3 className="font-medium text-sm md:text-base">Matched Entries</h3>
            <div className="text-xs text-muted-foreground">
              Entries that match tags in your content
            </div>
          </div>

          <div className="space-y-4">
            {/* Chapter Matched Entries */}
            <div>
              <div className="text-xs md:text-sm font-medium mb-2">
                Chapter Matched Entries{" "}
                {useMatchedChapter && (
                  <span className="text-xs text-green-500">(Included)</span>
                )}
              </div>
              <div className="mb-4 border rounded-md p-2 md:p-3 bg-muted/10">
                <div className="flex flex-wrap gap-1 md:gap-2 max-h-[120px] md:max-h-[150px] overflow-y-auto">
                  {chapterMatchedEntries.size === 0 ? (
                    <div className="text-muted-foreground text-xs">
                      No matched entries found
                    </div>
                  ) : (
                    Array.from(chapterMatchedEntries.values()).map((entry) => (
                      <Badge
                        key={entry.id}
                        variant="secondary"
                        className="flex items-center gap-1 px-2 py-0.5 md:px-3 md:py-1 text-xs"
                      >
                        <span className="truncate max-w-[80px] md:max-w-none">{entry.name}</span>
                        <span className="text-xs text-muted-foreground ml-1 capitalize hidden sm:inline">
                          ({entry.category})
                        </span>
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Scene Beat Matched Entries */}
            <div>
              <div className="text-xs md:text-sm font-medium mb-2">
                Scene Beat Matched Entries{" "}
                {useMatchedSceneBeat && (
                  <span className="text-xs text-green-500">(Included)</span>
                )}
              </div>
              <div className="mb-4 border rounded-md p-2 md:p-3 bg-muted/10">
                <div className="flex flex-wrap gap-1 md:gap-2 max-h-[120px] md:max-h-[150px] overflow-y-auto">
                  {localMatchedEntries.size === 0 ? (
                    <div className="text-muted-foreground text-xs">
                      No matched entries found
                    </div>
                  ) : (
                    Array.from(localMatchedEntries.values()).map((entry) => (
                      <Badge
                        key={entry.id}
                        variant="secondary"
                        className="flex items-center gap-1 px-2 py-0.5 md:px-3 md:py-1 text-xs"
                      >
                        <span className="truncate max-w-[80px] md:max-w-none">{entry.name}</span>
                        <span className="text-xs text-muted-foreground ml-1 capitalize hidden sm:inline">
                          ({entry.category})
                        </span>
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Custom Context Entries */}
            {useCustomContext && (
              <div>
                <div className="text-xs md:text-sm font-medium mb-2">
                  Custom Context Entries{" "}
                  <span className="text-xs text-green-500">(Included)</span>
                </div>
                <div className="mb-4 border rounded-md p-2 md:p-3 bg-muted/10">
                  <div className="flex flex-wrap gap-1 md:gap-2 max-h-[120px] md:max-h-[150px] overflow-y-auto">
                    {selectedItems.length === 0 ? (
                      <div className="text-muted-foreground text-xs">
                        No items selected
                      </div>
                    ) : (
                      selectedItems.map((item) => (
                        <Badge
                          key={item.id}
                          variant="secondary"
                          className="flex items-center gap-1 px-2 py-0.5 md:px-3 md:py-1 text-xs"
                        >
                          <span className="truncate max-w-[80px] md:max-w-none">{item.name}</span>
                          <span className="text-xs text-muted-foreground ml-1 capitalize hidden sm:inline">
                            ({item.category})
                          </span>
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Additional Context Panel */}
      {showAdditionalContext && (
        <div className="p-3 md:p-4 border-t">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
            <h3 className="font-medium text-sm md:text-base">Additional Context</h3>
            <div className="text-xs text-muted-foreground">
              Select lorebook items to include
            </div>
          </div>

          <div className="mb-4">
            {/* Lorebook items multi-select */}
            <div className="w-full">
              <div className="text-xs font-medium mb-1">Lorebook Items</div>
              <Select
                onValueChange={(value) => {
                  handleItemSelect(value);
                  // Reset the select value after selection
                  const selectElement = document.querySelector(
                    '[data-lorebook-select="true"]'
                  );
                  if (selectElement) {
                    (selectElement as HTMLSelectElement).value = "";
                  }
                }}
                value=""
              >
                <SelectTrigger className="w-full" data-lorebook-select="true">
                  <SelectValue placeholder="Select lorebook item" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {/* Group by category */}
                  {["character", "location", "item", "event", "note"].map(
                    (category) => {
                      const categoryItems = entries.filter(
                        (entry) => entry.category === category
                      );
                      if (categoryItems.length === 0) return null;

                      return (
                        <div key={category}>
                          <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted capitalize">
                            {category}s
                          </div>
                          {categoryItems.map((entry) => (
                            <SelectItem
                              key={entry.id}
                              value={entry.id}
                              disabled={selectedItems.some(
                                (item) => item.id === entry.id
                              )}
                            >
                              {entry.name}
                            </SelectItem>
                          ))}
                        </div>
                      );
                    }
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Badges section */}
          <div className="mb-4 border rounded-md p-2 md:p-3 bg-muted/10">
            <div className="text-xs font-medium mb-2">Selected Items ({selectedItems.length})</div>
            <div className="flex flex-wrap gap-1 md:gap-2 max-h-[120px] md:max-h-[150px] overflow-y-auto">
              {/* Lorebook item badges */}
              {selectedItems.map((item) => (
                <Badge
                  key={item.id}
                  variant="secondary"
                  className="flex items-center gap-1 px-2 py-0.5 md:px-3 md:py-1 text-xs"
                >
                  <span className="truncate max-w-[100px] md:max-w-none">{item.name}</span>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="ml-1 hover:text-destructive flex-shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}

              {selectedItems.length === 0 && (
                <div className="text-muted-foreground text-xs">
                  No items selected
                </div>
              )}
            </div>
          </div>
        </div>
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
