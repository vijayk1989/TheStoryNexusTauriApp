/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { JSX } from "react";

import "./index.css";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  UNDO_COMMAND,
  getDOMSelection,
  LexicalEditor,
  RangeSelection,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline,
  Wand2,
  Loader2,
  Check,
  X,
  MessageSquare,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Book,
} from "lucide-react";

import { getDOMRangeRect } from "../../utils/getDOMRangeRect";
import { getSelectedNode } from "../../utils/getSelectedNode";
import { setFloatingElemPosition } from "../../utils/setFloatingElemPosition";
import { usePromptStore } from "@/features/prompts/store/promptStore";
import { useAIStore } from "@/features/ai/stores/useAIStore";
import { useStoryContext } from "@/features/stories/context/StoryContext";
import { createPromptParser } from "@/features/prompts/services/promptParser";
import { toast } from "react-toastify";
import {
  Prompt,
  AllowedModel,
  PromptParserConfig,
  PromptMessage,
  LorebookEntry,
} from "@/types/story";
import { PromptSelectMenu } from "@/components/ui/prompt-select-menu";
import { Separator } from "@/components/ui/separator";
import { useStoryStore } from "@/features/stories/stores/useStoryStore";
import { PromptPreviewDialog } from "@/components/ui/prompt-preview-dialog";
import { useChapterStore } from "@/features/chapters/stores/useChapterStore";
import { $isSceneBeatNode } from "../../nodes/SceneBeatNode";
import { useLorebookStore } from "@/features/lorebook/stores/useLorebookStore";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

function TextFormatFloatingToolbar({
  editor,
  anchorElem,
  isBold,
  isItalic,
  isUnderline,
  isCustomModeActive,
  onCustomModeChange,
}: {
  editor: LexicalEditor;
  anchorElem: HTMLElement;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isCustomModeActive: boolean;
  onCustomModeChange: (active: boolean) => void;
}): JSX.Element {
  const popupCharStylesEditorRef = useRef<HTMLDivElement | null>(null);
  const { currentStoryId, currentChapterId } = useStoryContext();
  const { prompts, fetchPrompts, isLoading, error } = usePromptStore();
  const { generateWithPrompt, processStreamedResponse } = useAIStore();
  const { currentStory } = useStoryStore();
  const { currentChapter } = useChapterStore();
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt>();
  const [selectedModel, setSelectedModel] = useState<AllowedModel>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");

  // Add these states for prompt preview
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewMessages, setPreviewMessages] = useState<PromptMessage[]>();
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Custom rewrite dialog state
  const [showCustomRewrite, setShowCustomRewrite] = useState(false);
  const [customInstruction, setCustomInstruction] = useState("");
  const [savedSelectionText, setSavedSelectionText] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [rewrittenText, setRewrittenText] = useState("");
  const [customSelectedPrompt, setCustomSelectedPrompt] = useState<Prompt>();
  const [customSelectedModel, setCustomSelectedModel] = useState<AllowedModel>();
  const customInputRef = useRef<HTMLTextAreaElement>(null);
  const savedSelectionRef = useRef<RangeSelection | null>(null);

  // Inline prompt preview state
  const [showInlinePreview, setShowInlinePreview] = useState(false);
  const [inlinePreviewMessages, setInlinePreviewMessages] = useState<PromptMessage[]>();
  const [inlinePreviewLoading, setInlinePreviewLoading] = useState(false);
  const [inlinePreviewError, setInlinePreviewError] = useState<string | null>(null);

  // Custom context state
  const { entries } = useLorebookStore();
  const [useCustomContext, setUseCustomContext] = useState(false);
  const [includeAllLorebook, setIncludeAllLorebook] = useState(false);
  const [selectedContextItems, setSelectedContextItems] = useState<LorebookEntry[]>([]);
  const [showContextSection, setShowContextSection] = useState(false);

  // Fetch prompts when the component mounts
  useEffect(() => {
    fetchPrompts().catch((error) => {
      console.error("Error loading prompts:", error);
    });
  }, [fetchPrompts]);

  function mouseMoveListener(e: MouseEvent) {
    if (
      popupCharStylesEditorRef?.current &&
      (e.buttons === 1 || e.buttons === 3)
    ) {
      if (popupCharStylesEditorRef.current.style.pointerEvents !== "none") {
        const x = e.clientX;
        const y = e.clientY;
        const elementUnderMouse = document.elementFromPoint(x, y);

        if (!popupCharStylesEditorRef.current.contains(elementUnderMouse)) {
          // Mouse is not over the target element => not a normal click, but probably a drag
          popupCharStylesEditorRef.current.style.pointerEvents = "none";
        }
      }
    }
  }
  function mouseUpListener(e: MouseEvent) {
    if (popupCharStylesEditorRef?.current) {
      if (popupCharStylesEditorRef.current.style.pointerEvents !== "auto") {
        popupCharStylesEditorRef.current.style.pointerEvents = "auto";
      }
    }
  }

  useEffect(() => {
    if (popupCharStylesEditorRef?.current) {
      document.addEventListener("mousemove", mouseMoveListener);
      document.addEventListener("mouseup", mouseUpListener);

      return () => {
        document.removeEventListener("mousemove", mouseMoveListener);
        document.removeEventListener("mouseup", mouseUpListener);
      };
    }
  }, [popupCharStylesEditorRef]);

  const $updateTextFormatFloatingToolbar = useCallback(() => {
    const selection = $getSelection();

    const popupCharStylesEditorElem = popupCharStylesEditorRef.current;
    const nativeSelection = getDOMSelection(editor._window);

    if (popupCharStylesEditorElem === null) {
      return;
    }

    const rootElement = editor.getRootElement();
    if (
      selection !== null &&
      nativeSelection !== null &&
      !nativeSelection.isCollapsed &&
      rootElement !== null &&
      rootElement.contains(nativeSelection.anchorNode)
    ) {
      const rangeRect = getDOMRangeRect(nativeSelection, rootElement);

      setFloatingElemPosition(rangeRect, popupCharStylesEditorElem, anchorElem);
    }
  }, [editor, anchorElem]);

  useEffect(() => {
    const scrollerElem = anchorElem.parentElement;

    const update = () => {
      editor.getEditorState().read(() => {
        $updateTextFormatFloatingToolbar();
      });
    };

    window.addEventListener("resize", update);
    if (scrollerElem) {
      scrollerElem.addEventListener("scroll", update);
    }

    return () => {
      window.removeEventListener("resize", update);
      if (scrollerElem) {
        scrollerElem.removeEventListener("scroll", update);
      }
    };
  }, [editor, $updateTextFormatFloatingToolbar, anchorElem]);

  useEffect(() => {
    editor.getEditorState().read(() => {
      $updateTextFormatFloatingToolbar();
    });
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateTextFormatFloatingToolbar();
        });
      }),

      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          $updateTextFormatFloatingToolbar();
          return false;
        },
        COMMAND_PRIORITY_LOW
      )
    );
  }, [editor, $updateTextFormatFloatingToolbar]);

  const handlePromptSelect = (prompt: Prompt, model: AllowedModel) => {
    setSelectedPrompt(prompt);
    setSelectedModel(model);
  };

  const createPromptConfig = (prompt: Prompt): PromptParserConfig => {
    if (!currentStoryId || !currentChapterId) {
      throw new Error("No story or chapter context found");
    }

    let selectedText = "";
    let previousWords = "";

    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selectedText = selection.getTextContent();

        // Get the current selection anchor and focus nodes
        const anchorNode = selection.anchor.getNode();
        const anchorOffset = selection.anchor.offset;
        const focusNode = selection.focus.getNode();
        const focusOffset = selection.focus.offset;

        // Determine if selection is backward (focus comes before anchor)
        const isBackward = selection.isBackward();

        // Get the actual start and end points of the selection
        const startNode = isBackward ? focusNode : anchorNode;
        const startOffset = isBackward ? focusOffset : anchorOffset;

        // Collect text before the selection using Lexical's node traversal
        const textParts: string[] = [];
        let reachedStartNode = false;

        // Function to traverse the editor content in document order
        const traverseNodes = (node: any): boolean => {
          // If we've already reached the selection start node, stop traversal
          if (reachedStartNode) {
            return true;
          }

          // Skip SceneBeatNodes entirely
          if ($isSceneBeatNode(node)) {
            return false;
          }

          // Check if this is the selection start node
          if (node.is(startNode)) {
            // If this is a text node, add text up to the selection start point
            if ($isTextNode(node)) {
              textParts.push(node.getTextContent().substring(0, startOffset));
            }
            reachedStartNode = true;
            return true;
          }

          // Add text content if this is a text node
          if ($isTextNode(node)) {
            textParts.push(node.getTextContent());
            return false;
          }

          // Traverse children
          if (!$isTextNode(node) && typeof node.getChildren === "function") {
            const children = node.getChildren();
            for (const child of children) {
              if (traverseNodes(child)) {
                return true;
              }
            }
          }

          return false;
        };

        // Start traversal from the root node
        const rootNode = editor.getEditorState()._nodeMap.get("root");
        if (rootNode) {
          traverseNodes(rootNode);
        }

        // Join all collected text
        previousWords = textParts.join("");
      }
    });

    return {
      promptId: prompt.id,
      storyId: currentStoryId,
      chapterId: currentChapterId,
      previousWords: previousWords,
      additionalContext: {
        selectedText,
      },
      storyLanguage: currentStory?.language || "English",
      povType: currentChapter?.povType || "Third Person Omniscient",
      povCharacter: currentChapter?.povCharacter || "",
    };
  };

  const handleGenerateWithPrompt = async () => {
    if (!selectedPrompt || !selectedModel) {
      toast.error("Please select a prompt and model first");
      return;
    }

    let selectedText = "";
    let selection: any = null;

    editor.getEditorState().read(() => {
      selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selectedText = selection.getTextContent();
      }
    });

    if (!selectedText) {
      toast.error("No text selected");
      return;
    }

    setIsGenerating(true);
    setGeneratedText("");

    try {
      const config = createPromptConfig(selectedPrompt);
      const response = await generateWithPrompt(config, selectedModel);

      let fullText = "";

      await processStreamedResponse(
        response,
        (token) => {
          // Accumulate tokens but don't show them in UI
          fullText += token;
        },
        () => {
          // When streaming is complete, replace the selected text
          editor.update(() => {
            const currentSelection = $getSelection();
            if ($isRangeSelection(currentSelection)) {
              currentSelection.formatText("italic");
              currentSelection.insertText(fullText);
            }
          });

          // Reset state
          setIsGenerating(false);
          toast.success("Text generated and inserted");
        },
        (error) => {
          console.error("Error streaming response:", error);
          toast.error("Failed to generate text");
          setIsGenerating(false);
        }
      );
    } catch (error) {
      console.error("Error generating text:", error);
      toast.error("Failed to generate text");
      setIsGenerating(false);
    }
  };

  const resetGenerationState = () => {
    setGeneratedText("");
    setIsGenerating(false);
  };

  const handlePreviewPrompt = async () => {
    if (!selectedPrompt) {
      toast.error("Please select a prompt first");
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewMessages(undefined);

    try {
      const promptParser = createPromptParser();
      const config = createPromptConfig(selectedPrompt);
      const result = await promptParser.parse(config);

      if (result.error) {
        setPreviewError(result.error);
      } else {
        setPreviewMessages(result.messages);
      }
    } catch (error) {
      console.error("Error previewing prompt:", error);
      setPreviewError(
        error instanceof Error ? error.message : "Failed to preview prompt"
      );
    } finally {
      setPreviewLoading(false);
      setShowPreviewDialog(true);
    }
  };

  // ========== Custom Rewrite Dialog Handlers ==========

  // Open custom rewrite dialog and save selection
  const handleOpenCustomRewrite = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const text = selection.getTextContent();
        setSavedSelectionText(text);
        // Save the selection for later restoration
        savedSelectionRef.current = selection.clone();
        
        setShowCustomRewrite(true);
        onCustomModeChange(true); // Notify parent to keep toolbar visible
        setCustomInstruction("");
        setCustomSelectedPrompt(undefined);
        setCustomSelectedModel(undefined);

        // Focus the input after a short delay
        setTimeout(() => {
          customInputRef.current?.focus();
        }, 50);
      }
    });
  }, [editor, onCustomModeChange]);

  // Handle prompt selection in custom rewrite
  const handleCustomPromptSelect = (prompt: Prompt, model: AllowedModel) => {
    setCustomSelectedPrompt(prompt);
    setCustomSelectedModel(model);
  };

  // Create prompt config for custom rewrite (includes custom instruction as scenebeat)
  const createCustomPromptConfig = (prompt: Prompt): PromptParserConfig => {
    if (!currentStoryId || !currentChapterId) {
      throw new Error("No story or chapter context found");
    }

    let previousWords = "";

    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode();
        const anchorOffset = selection.anchor.offset;
        const focusNode = selection.focus.getNode();
        const focusOffset = selection.focus.offset;
        const isBackward = selection.isBackward();
        const startNode = isBackward ? focusNode : anchorNode;
        const startOffset = isBackward ? focusOffset : anchorOffset;

        const textParts: string[] = [];
        let reachedStartNode = false;

        const traverseNodes = (node: any): boolean => {
          if (reachedStartNode) return true;
          if ($isSceneBeatNode(node)) return false;

          if (node.is(startNode)) {
            if ($isTextNode(node)) {
              textParts.push(node.getTextContent().substring(0, startOffset));
            }
            reachedStartNode = true;
            return true;
          }

          if ($isTextNode(node)) {
            textParts.push(node.getTextContent());
            return false;
          }

          if (!$isTextNode(node) && typeof node.getChildren === "function") {
            const children = node.getChildren();
            for (const child of children) {
              if (traverseNodes(child)) return true;
            }
          }

          return false;
        };

        const rootNode = editor.getEditorState()._nodeMap.get("root");
        if (rootNode) traverseNodes(rootNode);
        previousWords = textParts.join("");
      }
    });

    return {
      promptId: prompt.id,
      storyId: currentStoryId,
      chapterId: currentChapterId,
      previousWords: previousWords,
      scenebeat: customInstruction.trim() || undefined, // Maps to {{user_input}}
      additionalContext: {
        selectedText: savedSelectionText,
      },
      sceneBeatContext: {
        useMatchedChapter: true, // Always default to true like existing scene beat
        useMatchedSceneBeat: false, 
        useCustomContext,
        customContextItems: useCustomContext
          ? selectedContextItems.map((item) => item.id)
          : [],
      },
      storyLanguage: currentStory?.language || "English",
      povType: currentChapter?.povType || "Third Person Omniscient",
      povCharacter: currentChapter?.povCharacter || "",
    };
  };

  // Generate with custom instruction
  const handleCustomGenerate = useCallback(async () => {
    if (!customSelectedPrompt || !customSelectedModel) {
      toast.error("Please select a prompt and model first");
      return;
    }

    if (!savedSelectionText) {
      toast.error("No text selected");
      return;
    }

    setIsGenerating(true);
    setRewrittenText("");
    setShowInlinePreview(false); // Hide inline preview during generation

    try {
      const config = createCustomPromptConfig(customSelectedPrompt);
      const response = await generateWithPrompt(config, customSelectedModel);

      // Handle aborted responses (204)
      if (!response.ok && response.status !== 204) {
        throw new Error("Failed to generate response");
      }

      if (response.status === 204) {
        console.log("Generation was aborted.");
        setIsGenerating(false);
        return;
      }

      // Use a ref-like approach with closure to accumulate text
      let accumulatedText = "";

      await processStreamedResponse(
        response,
        (token) => {
          accumulatedText += token;
          console.log("[CustomRewrite] Token received:", token.substring(0, 50), "Total length:", accumulatedText.length);
          // Use functional update to ensure we always get the latest accumulated value
          setRewrittenText(accumulatedText);
        },
        () => {
          // When streaming is complete, replace the selected text
          const finalText = accumulatedText;
          
          editor.update(() => {
            // Restore the saved selection before inserting
            if (savedSelectionRef.current) {
              $setSelection(savedSelectionRef.current);
            }
            
            const currentSelection = $getSelection();
            if ($isRangeSelection(currentSelection)) {
              currentSelection.insertText(finalText);
            }
          });

          // Show confirmation
          setShowCustomRewrite(false);
          setShowConfirmation(true);
          setIsGenerating(false);
        },
        (error) => {
          console.error("Error streaming response:", error);
          toast.error("Failed to generate text");
          setIsGenerating(false);
        }
      );
    } catch (error) {
      console.error("Error generating text:", error);
      toast.error("Failed to generate text");
      setIsGenerating(false);
    }
  }, [
    editor,
    customSelectedPrompt,
    customSelectedModel,
    savedSelectionText,
    customInstruction,
    generateWithPrompt,
    processStreamedResponse,
    currentStoryId,
    currentChapterId,
    currentStory,
    currentChapter,
  ]);

  // Accept the rewrite
  const handleAcceptRewrite = useCallback(() => {
    setShowConfirmation(false);
    setSavedSelectionText("");
    setRewrittenText("");
    setCustomInstruction("");
    savedSelectionRef.current = null;
    
    // Reset custom context
    setUseCustomContext(false);
    setIncludeAllLorebook(false);
    setSelectedContextItems([]);
    setShowContextSection(false);
    
    onCustomModeChange(false); // Notify parent to allow hiding
  }, [onCustomModeChange]);

  // Reject and restore original text using Lexical's undo
  const handleRejectRewrite = useCallback(() => {
    editor.dispatchCommand(UNDO_COMMAND, undefined);
    setShowConfirmation(false);
    setSavedSelectionText("");
    setRewrittenText("");
    setCustomInstruction("");
    savedSelectionRef.current = null;
    
    // Reset custom context
    setUseCustomContext(false);
    setIncludeAllLorebook(false);
    setSelectedContextItems([]);
    setShowContextSection(false);
    
    onCustomModeChange(false); // Notify parent to allow hiding
  }, [editor, onCustomModeChange]);

  // Cancel custom rewrite without doing anything
  const handleCancelCustomRewrite = useCallback(() => {
    setShowCustomRewrite(false);
    setCustomInstruction("");
    setCustomSelectedPrompt(undefined);
    setCustomSelectedModel(undefined);
    setShowInlinePreview(false);
    setInlinePreviewMessages(undefined);
    savedSelectionRef.current = null;
    
    // Reset custom context
    setUseCustomContext(false);
    setIncludeAllLorebook(false);
    setSelectedContextItems([]);
    setShowContextSection(false);

    onCustomModeChange(false); // Notify parent to allow hiding
  }, [onCustomModeChange]);

  // Context selection handlers
  const handleItemSelect = (itemId: string) => {
    const item = entries.find((entry) => entry.id === itemId);
    if (item && !selectedContextItems.some((i) => i.id === itemId)) {
      setSelectedContextItems([...selectedContextItems, item]);
    }
  };

  const removeItem = (itemId: string) => {
    setSelectedContextItems(selectedContextItems.filter((item) => item.id !== itemId));
  };
   // Clean up context state when accepting/rejecting too
   const handleAcceptCleanup = useCallback(() => {
      setUseCustomContext(false);
      setIncludeAllLorebook(false);
      setSelectedContextItems([]);
      setShowContextSection(false);
   }, []);

  // Preview custom rewrite prompt
  const handleCustomPreviewPrompt = async () => {
    if (!customSelectedPrompt) {
      toast.error("Please select a prompt first");
      return;
    }

    // Toggle inline preview
    if (showInlinePreview) {
      setShowInlinePreview(false);
      return;
    }

    setInlinePreviewLoading(true);
    setInlinePreviewError(null);
    setInlinePreviewMessages(undefined);
    setShowInlinePreview(true);

    try {
      const promptParser = createPromptParser();
      const config = createCustomPromptConfig(customSelectedPrompt);
      const result = await promptParser.parse(config);

      if (result.error) {
        setInlinePreviewError(result.error);
      } else {
        setInlinePreviewMessages(result.messages);
      }
    } catch (error) {
      console.error("Error previewing prompt:", error);
      setInlinePreviewError(
        error instanceof Error ? error.message : "Failed to preview prompt"
      );
    } finally {
      setInlinePreviewLoading(false);
    }
  };

  return (
    <div
      ref={popupCharStylesEditorRef}
      className={`floating-text-format-popup ${showPreviewDialog || showCustomRewrite || showConfirmation ? "active" : ""}`}
    >
      {showPreviewDialog && previewMessages && (
        <PromptPreviewDialog
          messages={previewMessages}
          open={showPreviewDialog}
          onOpenChange={setShowPreviewDialog}
          isLoading={previewLoading}
          error={previewError}
        />
      )}

      {/* Main Toolbar */}
      {!showCustomRewrite && !showConfirmation && (
        <div className="toolbar-container">
          {editor.isEditable() && (
            <div className="toolbar-buttons">
              <Button
                variant={isBold ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
                }}
                title="Bold"
                aria-label="Format text as bold"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                variant={isItalic ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
                }}
                title="Italic"
                aria-label="Format text as italics"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                variant={isUnderline ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline");
                }}
                title="Underline"
                aria-label="Format text to underlined"
              >
                <Underline className="h-4 w-4" />
              </Button>

              <Separator orientation="vertical" className="mx-1 h-6" />

              {!isGenerating ? (
                <>
                  <PromptSelectMenu
                    isLoading={isLoading}
                    error={error}
                    prompts={prompts}
                    promptType="selection_specific"
                    selectedPrompt={selectedPrompt}
                    selectedModel={selectedModel}
                    onSelect={handlePromptSelect}
                  />

                  {/* Add Preview Prompt button */}
                  {selectedPrompt && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviewPrompt}
                      className="flex items-center gap-1"
                    >
                      Preview
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateWithPrompt}
                    disabled={isGenerating || !selectedPrompt || !selectedModel}
                    className="flex items-center gap-1"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-3 w-3" />
                        <span>Generate</span>
                      </>
                    )}
                  </Button>

                  <Separator orientation="vertical" className="mx-1 h-6" />

                  {/* Custom Rewrite Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenCustomRewrite}
                    onMouseDown={(e) => e.preventDefault()}
                    title="Custom Rewrite with AI"
                    className="flex items-center gap-1"
                  >
                    <MessageSquare className="h-3 w-3" />
                    <span>Custom</span>
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Generating...</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Custom Rewrite Dialog */}
      {showCustomRewrite && (
        <div className="custom-rewrite-dialog p-3 min-w-[350px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Custom Rewrite</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelCustomRewrite}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Selected text preview */}
          <div className="text-xs text-muted-foreground px-2 py-1.5 bg-muted rounded border mb-3 max-h-[60px] overflow-y-auto">
            "{savedSelectionText.length > 100
              ? savedSelectionText.substring(0, 100) + "..."
              : savedSelectionText}"
          </div>

          {/* Prompt selection */}
          <div className="mb-3">
            <PromptSelectMenu
              isLoading={isLoading}
              error={error}
              prompts={prompts}
              promptType="selection_specific"
              selectedPrompt={customSelectedPrompt}
              selectedModel={customSelectedModel}
              onSelect={handleCustomPromptSelect}
            />
          </div>

          {/* Custom Context Selection */}
          <div className="mb-3 border rounded-md bg-muted/30">
            <button
              type="button"
              onClick={() => setShowContextSection(!showContextSection)}
              className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 rounded-t-md"
            >
              <div className="flex items-center gap-1">
                <Book className="h-3 w-3" />
                <span>Lorebook Context</span>
                {selectedContextItems.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-4 px-1 text-[10px] ml-1"
                  >
                    {selectedContextItems.length}
                  </Badge>
                )}
              </div>
              {showContextSection ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>

            {showContextSection && (
              <div className="p-2 border-t space-y-3 bg-background/50 rounded-b-md">
                {/* Enable Switch */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Use Custom Context</span>
                  <Switch
                    checked={useCustomContext}
                    onCheckedChange={setUseCustomContext}
                    className="h-4 w-7"
                  />
                </div>

                {useCustomContext && (
                  <>
                    {/* Include All Switch */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Include All Lorebook</span>
                      <Switch
                        checked={includeAllLorebook}
                        onCheckedChange={(v: boolean) => {
                          setIncludeAllLorebook(v);
                          if (v) {
                            const allEntries = useLorebookStore
                              .getState()
                              .getFilteredEntries();
                            setSelectedContextItems(allEntries);
                          } else {
                            setSelectedContextItems([]);
                          }
                        }}
                        className="h-4 w-7"
                      />
                    </div>

                    {/* Item Select */}
                    <div>
                      <Select
                        onValueChange={(value) => {
                          handleItemSelect(value);
                        }}
                        value=""
                      >
                        <SelectTrigger className="h-7 text-xs w-full">
                          <SelectValue placeholder="Select lorebook item..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
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
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted capitalize">
                                  {category}s
                                </div>
                                {categoryItems.map((entry) => (
                                  <SelectItem
                                    key={entry.id}
                                    value={entry.id}
                                    disabled={selectedContextItems.some(
                                      (item) => item.id === entry.id
                                    )}
                                    className="text-xs"
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

                    {/* Selected Items Badges */}
                    {selectedContextItems.length > 0 && (
                      <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto p-1 border rounded bg-muted/10">
                        {selectedContextItems.map((item) => (
                          <Badge
                            key={item.id}
                            variant="secondary"
                            className="flex items-center gap-1 px-1.5 py-0 text-[10px]"
                          >
                            <span className="truncate max-w-[80px]">
                              {item.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="hover:text-destructive flex-shrink-0"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Custom instruction textarea */}
          <textarea
            ref={customInputRef}
            value={customInstruction}
            onChange={(e) => setCustomInstruction(e.target.value)}
            placeholder="How should it be rewritten? (e.g., 'Make it more dramatic')"
            className="w-full min-h-[60px] p-2 rounded text-sm resize-none bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary mb-3"
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (customSelectedPrompt && customSelectedModel) {
                  handleCustomGenerate();
                }
              }
              if (e.key === "Escape") {
                handleCancelCustomRewrite();
              }
            }}
          />

          {/* Action buttons - only show after prompt is selected */}
          {customSelectedPrompt && customSelectedModel && (
            <div className="flex gap-2 mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCustomPreviewPrompt}
                className="flex-1"
              >
                Preview
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleCustomGenerate}
                disabled={isGenerating}
                className="flex-1 flex items-center justify-center gap-1"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Rewriting...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="h-3 w-3" />
                    <span>Change</span>
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Inline Prompt Preview Section */}
          {showInlinePreview && (
            <div className="mb-3 border rounded-md bg-muted/30">
              <button
                type="button"
                onClick={() => setShowInlinePreview(false)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 rounded-t-md"
              >
                <span>Prompt Preview</span>
                <ChevronUp className="h-3 w-3" />
              </button>
              <div className="px-2 py-1.5 border-t h-[200px] overflow-y-auto">
                {inlinePreviewLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : inlinePreviewError ? (
                  <div className="text-xs text-destructive">
                    Error: {inlinePreviewError}
                  </div>
                ) : inlinePreviewMessages ? (
                  <div className="space-y-2">
                    {inlinePreviewMessages.map((message, index) => (
                      <div key={index} className="space-y-1">
                        <div className="text-xs font-semibold capitalize text-muted-foreground">
                          {message.role}:
                        </div>
                        <div className="text-xs whitespace-pre-wrap bg-background rounded p-1.5 border max-h-[150px] overflow-y-auto">
                          {message.content}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    No preview available
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Streaming preview */}
          {isGenerating && rewrittenText && (
            <div className="text-xs text-muted-foreground px-2 py-1.5 bg-primary/10 rounded border border-primary/30 max-h-[80px] overflow-y-auto mb-3">
              <span className="text-primary font-medium">Preview: </span>
              {rewrittenText}
              <span className="inline-block w-1.5 h-3 ml-0.5 bg-primary animate-pulse" />
            </div>
          )}

          <span className="text-xs text-muted-foreground text-center block">
            Ctrl+Enter to submit • Esc to cancel
          </span>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="confirmation-dialog p-3 min-w-[280px]">
          <span className="text-sm font-medium block mb-3">Text Rewritten</span>

          <div className="space-y-2 mb-3">
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Original:</span>
              <div className="px-2 py-1.5 mt-1 bg-muted rounded border line-through opacity-60 max-h-[100px] overflow-y-auto whitespace-pre-wrap">
                "{savedSelectionText}"
              </div>
            </div>
            <div className="text-xs">
              <span className="font-medium text-green-500">New:</span>
              <div className="px-2 py-1.5 mt-1 bg-green-500/10 rounded border border-green-500/30 max-h-[150px] overflow-y-auto whitespace-pre-wrap">
                "{rewrittenText}"
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRejectRewrite}
              className="flex-1 flex items-center justify-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Undo</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleAcceptRewrite}
              className="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700"
            >
              <Check className="h-3 w-3" />
              <span>Keep</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function useFloatingTextFormatToolbar(
  editor: LexicalEditor,
  anchorElem: HTMLElement
): JSX.Element | null {
  const [isText, setIsText] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isCustomModeActive, setIsCustomModeActive] = useState(false);

  const updatePopup = useCallback(() => {
    editor.getEditorState().read(() => {
      // Should not to pop up the floating toolbar when using IME input
      if (editor.isComposing()) {
        return;
      }
      const selection = $getSelection();
      const nativeSelection = getDOMSelection(editor._window);
      const rootElement = editor.getRootElement();

      if (
        nativeSelection !== null &&
        (!$isRangeSelection(selection) ||
          rootElement === null ||
          !rootElement.contains(nativeSelection.anchorNode))
      ) {
        setIsText(false);
        return;
      }

      if (!$isRangeSelection(selection)) {
        return;
      }

      const node = getSelectedNode(selection);

      // Update text format
      setIsBold(selection.hasFormat("bold"));
      setIsItalic(selection.hasFormat("italic"));
      setIsUnderline(selection.hasFormat("underline"));

      // Simplified condition - show text formatting toolbar if there's selected text
      if (selection.getTextContent() !== "") {
        setIsText($isTextNode(node) || $isParagraphNode(node));
      } else {
        setIsText(false);
      }

      const rawTextContent = selection.getTextContent().replace(/\n/g, "");
      if (!selection.isCollapsed() && rawTextContent === "") {
        setIsText(false);
        return;
      }
    });
  }, [editor]);

  useEffect(() => {
    document.addEventListener("selectionchange", updatePopup);
    return () => {
      document.removeEventListener("selectionchange", updatePopup);
    };
  }, [updatePopup]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(() => {
        updatePopup();
      }),
      editor.registerRootListener(() => {
        if (editor.getRootElement() === null) {
          setIsText(false);
        }
      })
    );
  }, [editor, updatePopup]);

  if (!isText && !isCustomModeActive) {
    return null;
  }

  return createPortal(
    <TextFormatFloatingToolbar
      editor={editor}
      anchorElem={anchorElem}
      isBold={isBold}
      isItalic={isItalic}
      isUnderline={isUnderline}
      isCustomModeActive={isCustomModeActive}
      onCustomModeChange={setIsCustomModeActive}
    />,
    anchorElem
  );
}

export default function FloatingTextFormatToolbarPlugin({
  anchorElem = document.body,
}: {
  anchorElem?: HTMLElement;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  return useFloatingTextFormatToolbar(editor, anchorElem);
}
