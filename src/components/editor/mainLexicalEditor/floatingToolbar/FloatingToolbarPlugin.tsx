/**
 * FloatingToolbarPlugin — selection-aware floating toolbar with format buttons
 * and AI rewrite/expand actions.
 *
 * Architecture:
 *  - useFloatingTextFormatToolbar: detects selection, tracks format state,
 *    decides when to show the popup.
 *  - TextFormatFloatingToolbar: renders the actual popup (format buttons,
 *    prompt selection, custom rewrite, confirmation).
 *  - useSelectionAiRewrite: encapsulates all AI state (extracted to its own hook).
 */

import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
    $getSelection,
    $isParagraphNode,
    $isRangeSelection,
    $isTextNode,
    COMMAND_PRIORITY_LOW,
    FORMAT_TEXT_COMMAND,
    SELECTION_CHANGE_COMMAND,
    getDOMSelection,
    type LexicalEditor,
} from "lexical";

import {
    Bold,
    Italic,
    Loader2,
    MessageSquare,
    Underline,
    Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { PromptPreviewDialog } from "@/components/ui/prompt-preview-dialog";
import { PromptSelectMenu } from "@/components/ui/prompt-select-menu";
import { Separator } from "@/components/ui/separator";

import { getDOMRangeRect } from "../utils/getDOMRangeRect";
import { getSelectedNode } from "../utils/getSelectedNode";
import { setFloatingElemPosition } from "../utils/setFloatingElemPosition";

import { ConfirmRewritePanel } from "./ConfirmRewritePanel";
import { CustomRewritePanel } from "./CustomRewritePanel";
import { useSelectionAiRewrite } from "./useSelectionAiRewrite";

/* ─── inner toolbar ────────────────────────────────────────── */

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
    const popupRef = useRef<HTMLDivElement | null>(null);
    const ai = useSelectionAiRewrite();

    // Fetch prompts on mount
    useEffect(() => {
        ai.fetchPrompts().catch((error: unknown) => {
            console.error("Error loading prompts:", error);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ── pointer events guard during drag ────────────────────── */
    useEffect(() => {
        const popup = popupRef.current;
        if (!popup) return;

        function mouseMoveListener(e: MouseEvent) {
            if (popup && (e.buttons === 1 || e.buttons === 3)) {
                if (popup.style.pointerEvents !== "none") {
                    const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
                    if (!popup.contains(elementUnderMouse)) {
                        popup.style.pointerEvents = "none";
                    }
                }
            }
        }

        function mouseUpListener() {
            if (popup && popup.style.pointerEvents !== "auto") {
                popup.style.pointerEvents = "auto";
            }
        }

        document.addEventListener("mousemove", mouseMoveListener);
        document.addEventListener("mouseup", mouseUpListener);
        return () => {
            document.removeEventListener("mousemove", mouseMoveListener);
            document.removeEventListener("mouseup", mouseUpListener);
        };
    }, []);

    /* ── positioning ─────────────────────────────────────────── */
    const $updatePosition = useCallback(() => {
        const selection = $getSelection();
        const popupElem = popupRef.current;
        const nativeSelection = getDOMSelection(editor._window);

        if (popupElem === null) return;

        const rootElement = editor.getRootElement();
        if (
            selection !== null &&
            nativeSelection !== null &&
            !nativeSelection.isCollapsed &&
            rootElement !== null &&
            rootElement.contains(nativeSelection.anchorNode)
        ) {
            const rangeRect = getDOMRangeRect(nativeSelection, rootElement);
            setFloatingElemPosition(rangeRect, popupElem, anchorElem);
        }
    }, [editor, anchorElem]);

    useEffect(() => {
        const scrollerElem = anchorElem.parentElement;
        const update = () => {
            editor.getEditorState().read(() => $updatePosition());
        };

        window.addEventListener("resize", update);
        if (scrollerElem) scrollerElem.addEventListener("scroll", update);

        return () => {
            window.removeEventListener("resize", update);
            if (scrollerElem) scrollerElem.removeEventListener("scroll", update);
        };
    }, [editor, $updatePosition, anchorElem]);

    useEffect(() => {
        editor.getEditorState().read(() => $updatePosition());
        return mergeRegister(
            editor.registerUpdateListener(({ editorState }) => {
                editorState.read(() => $updatePosition());
            }),
            editor.registerCommand(
                SELECTION_CHANGE_COMMAND,
                () => {
                    $updatePosition();
                    return false;
                },
                COMMAND_PRIORITY_LOW,
            ),
        );
    }, [editor, $updatePosition]);

    /* ── handlers that coordinate custom mode ────────────────── */
    const handleOpenCustomRewrite = useCallback(() => {
        ai.handleOpenCustomRewrite();
        onCustomModeChange(true);
    }, [ai, onCustomModeChange]);

    const handleGenerateQuickFire = useCallback(async () => {
        onCustomModeChange(true);
        const result = await ai.handleGenerateWithPrompt();
        if (result?.aborted) {
            onCustomModeChange(false);
        }
    }, [ai, onCustomModeChange]);

    const handleAccept = useCallback(() => {
        ai.handleAcceptRewrite();
        onCustomModeChange(false);
    }, [ai, onCustomModeChange]);

    const handleReject = useCallback(() => {
        ai.handleRejectRewrite();
        onCustomModeChange(false);
    }, [ai, onCustomModeChange]);

    const handleCancelCustom = useCallback(() => {
        ai.handleCancelCustomRewrite();
        onCustomModeChange(false);
    }, [ai, onCustomModeChange]);

    /* ── active state CSS class ──────────────────────────────── */
    const isActive =
        ai.showPreviewDialog ||
        ai.showCustomRewrite ||
        ai.showConfirmation;

    return (
        <div
            ref={popupRef}
            className={`sn-floating-toolbar${isActive ? " sn-floating-toolbar-active" : ""}`}
        >
            {/* Prompt preview dialog */}
            {ai.showPreviewDialog && ai.previewMessages && (
                <PromptPreviewDialog
                    messages={ai.previewMessages}
                    open={ai.showPreviewDialog}
                    onOpenChange={ai.setShowPreviewDialog}
                    isLoading={ai.previewLoading}
                    error={ai.previewError}
                />
            )}

            {/* ── Main toolbar row ───────────────────────────── */}
            {!ai.showCustomRewrite && !ai.showConfirmation && (
                <div className="sn-floating-toolbar-container">
                    {editor.isEditable() && (
                        <div className="sn-floating-toolbar-buttons">
                            {/* Format buttons */}
                            <Button
                                variant={isBold ? "default" : "outline"}
                                size="sm"
                                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
                                title="Bold"
                                aria-label="Format text as bold"
                            >
                                <Bold className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={isItalic ? "default" : "outline"}
                                size="sm"
                                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
                                title="Italic"
                                aria-label="Format text as italics"
                            >
                                <Italic className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={isUnderline ? "default" : "outline"}
                                size="sm"
                                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
                                title="Underline"
                                aria-label="Format text to underlined"
                            >
                                <Underline className="h-4 w-4" />
                            </Button>

                            <Separator orientation="vertical" className="mx-1 h-6" />

                            {/* AI section */}
                            {!ai.isGenerating ? (
                                <>
                                    <PromptSelectMenu
                                        isLoading={ai.isLoading}
                                        error={ai.error}
                                        prompts={ai.prompts}
                                        promptType="selection_specific"
                                        selectedPrompt={ai.selectedPrompt}
                                        selectedModel={ai.selectedModel}
                                        onSelect={ai.handlePromptSelect}
                                    />

                                    {ai.selectedPrompt && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={ai.handlePreviewPrompt}
                                            className="flex items-center gap-1"
                                        >
                                            Preview
                                        </Button>
                                    )}

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleGenerateQuickFire}
                                        disabled={ai.isGenerating || !ai.selectedPrompt || !ai.selectedModel}
                                        className="flex items-center gap-1"
                                    >
                                        <Wand2 className="h-3 w-3" />
                                        <span>Generate</span>
                                    </Button>

                                    <Separator orientation="vertical" className="mx-1 h-6" />

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

            {/* ── Custom rewrite panel ────────────────────────── */}
            {ai.showCustomRewrite && (
                <CustomRewritePanel ai={ai} onClose={handleCancelCustom} />
            )}

            {/* ── Confirmation panel ──────────────────────────── */}
            {ai.showConfirmation && (
                <ConfirmRewritePanel
                    originalText={ai.savedSelectionText}
                    rewrittenText={ai.rewrittenText}
                    onAccept={handleAccept}
                    onReject={handleReject}
                />
            )}
        </div>
    );
}

/* ─── outer hook: selection detection ──────────────────────── */

function useFloatingTextFormatToolbar(
    editor: LexicalEditor,
    anchorElem: HTMLElement | null,
): JSX.Element | null {
    const [isText, setIsText] = useState(false);
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [isCustomModeActive, setIsCustomModeActive] = useState(false);

    const updatePopup = useCallback(() => {
        editor.getEditorState().read(() => {
            if (editor.isComposing()) return;

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

            if (!$isRangeSelection(selection)) return;

            const node = getSelectedNode(selection);

            setIsBold(selection.hasFormat("bold"));
            setIsItalic(selection.hasFormat("italic"));
            setIsUnderline(selection.hasFormat("underline"));

            if (selection.getTextContent() !== "") {
                setIsText($isTextNode(node) || $isParagraphNode(node));
            } else {
                setIsText(false);
            }

            const rawTextContent = selection.getTextContent().replace(/\n/g, "");
            if (!selection.isCollapsed() && rawTextContent === "") {
                setIsText(false);
            }
        });
    }, [editor]);

    useEffect(() => {
        document.addEventListener("selectionchange", updatePopup);
        return () => document.removeEventListener("selectionchange", updatePopup);
    }, [updatePopup]);

    useEffect(() => {
        return mergeRegister(
            editor.registerUpdateListener(() => updatePopup()),
            editor.registerRootListener(() => {
                if (editor.getRootElement() === null) {
                    setIsText(false);
                }
            }),
        );
    }, [editor, updatePopup]);

    if (!anchorElem || (!isText && !isCustomModeActive)) {
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
        anchorElem,
    );
}

/* ─── public plugin component ─────────────────────────────── */

export function FloatingToolbarPlugin({
    anchorElem,
}: {
    anchorElem: HTMLElement | null;
}): JSX.Element | null {
    const [editor] = useLexicalComposerContext();

    return useFloatingTextFormatToolbar(editor, anchorElem);
}
