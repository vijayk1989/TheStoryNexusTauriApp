import { useCallback, useEffect, useState, type ReactNode } from "react";

import {
    $isListNode,
    REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
    $createHeadingNode,
    $isHeadingNode,
    type HeadingTagType,
} from "@lexical/rich-text";
import { $getSelectionStyleValueForProperty, $patchStyleText, $setBlocksType } from "@lexical/selection";
import {
    $createParagraphNode,
    $getSelection,
    $insertNodes,
    $isRangeSelection,
    CAN_REDO_COMMAND,
    CAN_UNDO_COMMAND,
    COMMAND_PRIORITY_LOW,
    FORMAT_ELEMENT_COMMAND,
    FORMAT_TEXT_COMMAND,
    REDO_COMMAND,
    SELECTION_CHANGE_COMMAND,
    UNDO_COMMAND,
    type ElementFormatType,
} from "lexical";
import {
    Bold,
    Bot,
    ChevronDown,
    Italic,
    Minus,
    MoreHorizontal,
    Plus,
    Redo2,
    Strikethrough,
    Underline,
    Undo2,
    ImageIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { $insertSceneBeatBelowSelection, focusInsertedSceneBeat } from "../nodes/scene-beat/insertSceneBeat";
import { $createImageGenerationNode } from "../nodes/ImageGenerationNode";

type BlockType = "paragraph" | "h1" | "h2" | "h3" | "bullet" | "number";
type FontFamily = "Arial" | "Georgia" | "Times New Roman";
type AlignmentOption = {
    label: string;
    value: ElementFormatType;
};

const FONT_FAMILIES: FontFamily[] = ["Arial", "Georgia", "Times New Roman"];
const FONT_SIZES = [12, 13, 14, 15, 16, 18, 20, 24];
const ALIGNMENT_OPTIONS: AlignmentOption[] = [
    { label: "Left Align", value: "left" },
    { label: "Center Align", value: "center" },
    { label: "Right Align", value: "right" },
    { label: "Justify", value: "justify" },
];

export function StoryToolbarPlugin() {
    const [editor] = useLexicalComposerContext();
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [blockType, setBlockType] = useState<BlockType>("paragraph");
    const [fontFamily, setFontFamily] = useState<FontFamily>("Arial");
    const [fontSize, setFontSize] = useState(15);
    const [alignment, setAlignment] = useState<ElementFormatType>("left");
    const [formats, setFormats] = useState({
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false,
    });

    const updateToolbar = useCallback(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
            return;
        }

        const anchorNode = selection.anchor.getNode();
        const element = anchorNode.getKey() === "root"
            ? anchorNode
            : anchorNode.getTopLevelElementOrThrow();

        if ($isListNode(element)) {
            setBlockType(element.getListType() === "number" ? "number" : "bullet");
        } else if ($isHeadingNode(element)) {
            const tag = element.getTag();
            setBlockType(tag === "h1" || tag === "h2" || tag === "h3" ? tag : "paragraph");
        } else {
            setBlockType("paragraph");
        }

        const elementFormat = "getFormatType" in element ? element.getFormatType() : "left";
        setAlignment(elementFormat || "left");
        const nextFontFamily = $getSelectionStyleValueForProperty(selection, "font-family", "Arial");
        const nextFontSize = $getSelectionStyleValueForProperty(selection, "font-size", "15px");
        if (FONT_FAMILIES.includes(nextFontFamily as FontFamily)) {
            setFontFamily(nextFontFamily as FontFamily);
        }
        const parsedFontSize = Number.parseInt(nextFontSize, 10);
        if (Number.isFinite(parsedFontSize)) {
            setFontSize(parsedFontSize);
        }

        setFormats({
            bold: selection.hasFormat("bold"),
            italic: selection.hasFormat("italic"),
            underline: selection.hasFormat("underline"),
            strikethrough: selection.hasFormat("strikethrough"),
        });
    }, []);

    useEffect(() => {
        const removeUpdateListener = editor.registerUpdateListener(({ editorState }) => {
            editorState.read(updateToolbar);
        });
        const removeSelectionListener = editor.registerCommand(
            SELECTION_CHANGE_COMMAND,
            () => {
                updateToolbar();
                return false;
            },
            COMMAND_PRIORITY_LOW
        );
        const removeUndoListener = editor.registerCommand(
            CAN_UNDO_COMMAND,
            (payload) => {
                setCanUndo(payload);
                return false;
            },
            COMMAND_PRIORITY_LOW
        );
        const removeRedoListener = editor.registerCommand(
            CAN_REDO_COMMAND,
            (payload) => {
                setCanRedo(payload);
                return false;
            },
            COMMAND_PRIORITY_LOW
        );

        return () => {
            removeUpdateListener();
            removeSelectionListener();
            removeUndoListener();
            removeRedoListener();
        };
    }, [editor, updateToolbar]);

    const formatBlock = (nextBlockType: BlockType) => {
        if (blockType === "bullet" || blockType === "number") {
            editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
        }

        editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;

            if (nextBlockType === "paragraph") {
                $setBlocksType(selection, () => $createParagraphNode());
            } else {
                $setBlocksType(selection, () => $createHeadingNode(nextBlockType as HeadingTagType));
            }
        });
    };

    const applyFontFamily = (nextFontFamily: FontFamily) => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                $patchStyleText(selection, { "font-family": nextFontFamily });
                setFontFamily(nextFontFamily);
            }
        });
    };

    const applyFontSize = (nextFontSize: number) => {
        const boundedFontSize = Math.max(8, Math.min(72, nextFontSize));
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                $patchStyleText(selection, { "font-size": `${boundedFontSize}px` });
                setFontSize(boundedFontSize);
            }
        });
    };

    const applyAlignment = (nextAlignment: ElementFormatType) => {
        setAlignment(nextAlignment);
        editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, nextAlignment);
    };

    const insertSceneBeat = () => {
        editor.update(() => {
            const nodeKey = $insertSceneBeatBelowSelection();
            focusInsertedSceneBeat(nodeKey);
        });
    };

    const insertImageGeneration = () => {
        editor.update(() => {
            const selection = $getSelection();
            const imageGenNode = $createImageGenerationNode();
            const paragraphNode = $createParagraphNode();
            if (selection) {
                selection.insertNodes([imageGenNode, paragraphNode]);
            } else {
                $insertNodes([imageGenNode, paragraphNode]);
            }
        });
    };

    return (
        <div className="sn-main-editor-toolbar" aria-label="Editor toolbar">
            <div className="sn-main-editor-toolbar-group">
                <ToolbarButton
                    label="Undo"
                    disabled={!canUndo}
                    onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
                >
                    <Undo2 className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    label="Redo"
                    disabled={!canRedo}
                    onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
                >
                    <Redo2 className="h-4 w-4" />
                </ToolbarButton>
            </div>

            <div className="sn-main-editor-toolbar-separator" />

            <label className="sr-only" htmlFor="main-editor-block-type">Block type</label>
            <select
                id="main-editor-block-type"
                className="sn-main-editor-block-select"
                value={blockType}
                onChange={(event) => formatBlock(event.target.value as BlockType)}
            >
                <option value="paragraph">Normal</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
            </select>

            <div className="sn-main-editor-toolbar-separator" />

            <label className="sr-only" htmlFor="main-editor-font-family">Font family</label>
            <select
                id="main-editor-font-family"
                className="sn-main-editor-font-select"
                value={fontFamily}
                onChange={(event) => applyFontFamily(event.target.value as FontFamily)}
            >
                {FONT_FAMILIES.map((family) => (
                    <option key={family} value={family}>{family}</option>
                ))}
            </select>

            <div className="sn-main-editor-toolbar-separator" />

            <div className="sn-main-editor-font-size">
                <ToolbarButton
                    label="Decrease font size"
                    onClick={() => applyFontSize(fontSize - 1)}
                >
                    <Minus className="h-4 w-4" />
                </ToolbarButton>
                <input
                    className="sn-main-editor-font-size-input"
                    aria-label="Font size"
                    value={fontSize}
                    onChange={(event) => {
                        const nextFontSize = Number.parseInt(event.target.value, 10);
                        if (Number.isFinite(nextFontSize)) {
                            applyFontSize(nextFontSize);
                        }
                    }}
                />
                <ToolbarButton
                    label="Increase font size"
                    onClick={() => applyFontSize(fontSize + 1)}
                >
                    <Plus className="h-4 w-4" />
                </ToolbarButton>
            </div>

            <div className="sn-main-editor-toolbar-separator" />

            <div className="sn-main-editor-toolbar-group sn-main-editor-toolbar-desktop-extra">
                <ToolbarButton
                    label="Bold"
                    active={formats.bold}
                    onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
                >
                    <Bold className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    label="Italic"
                    active={formats.italic}
                    onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
                >
                    <Italic className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    label="Underline"
                    active={formats.underline}
                    onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
                >
                    <Underline className="h-4 w-4" />
                </ToolbarButton>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn("sn-main-editor-toolbar-button", formats.strikethrough && "sn-main-editor-toolbar-button-active")}
                            title="More formatting"
                            aria-label="More formatting"
                            onMouseDown={(event) => event.preventDefault()}
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}
                        >
                            <Strikethrough className="mr-2 h-4 w-4" />
                            Strikethrough
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="sn-main-editor-toolbar-separator" />

            <div className="sn-main-editor-toolbar-desktop-extra">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="sn-main-editor-text-button"
                        >
                            Insert
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={insertSceneBeat}
                        >
                            <Bot className="mr-2 h-4 w-4" />
                            Scene Beat
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={insertImageGeneration}
                        >
                            <ImageIcon className="mr-2 h-4 w-4" />
                            Image
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="sn-main-editor-toolbar-separator" />

            <label className="sr-only" htmlFor="main-editor-alignment">Text alignment</label>
            <select
                id="main-editor-alignment"
                className="sn-main-editor-align-select sn-main-editor-toolbar-desktop-extra"
                value={alignment}
                onChange={(event) => applyAlignment(event.target.value as ElementFormatType)}
            >
                {ALIGNMENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </select>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="sn-main-editor-toolbar-button sn-main-editor-mobile-more"
                        title="More editor tools"
                        aria-label="More editor tools"
                        onMouseDown={(event) => event.preventDefault()}
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="sn-main-editor-mobile-menu">
                    <DropdownMenuItem
                        className={cn("sn-main-editor-mobile-menu-item", formats.bold && "sn-main-editor-mobile-menu-item-active")}
                        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
                    >
                        <Bold className="mr-2 h-4 w-4" />
                        Bold
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className={cn("sn-main-editor-mobile-menu-item", formats.italic && "sn-main-editor-mobile-menu-item-active")}
                        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
                    >
                        <Italic className="mr-2 h-4 w-4" />
                        Italic
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className={cn("sn-main-editor-mobile-menu-item", formats.underline && "sn-main-editor-mobile-menu-item-active")}
                        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
                    >
                        <Underline className="mr-2 h-4 w-4" />
                        Underline
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className={cn("sn-main-editor-mobile-menu-item", formats.strikethrough && "sn-main-editor-mobile-menu-item-active")}
                        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}
                    >
                        <Strikethrough className="mr-2 h-4 w-4" />
                        Strikethrough
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="sn-main-editor-mobile-menu-item"
                        onClick={() => applyFontSize(fontSize - 1)}
                    >
                        <Minus className="mr-2 h-4 w-4" />
                        Decrease font size
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="sn-main-editor-mobile-menu-item"
                        onClick={() => applyFontSize(fontSize + 1)}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Increase font size
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="sn-main-editor-mobile-menu-item"
                        onClick={insertSceneBeat}
                    >
                        <Bot className="mr-2 h-4 w-4" />
                        Scene Beat
                        <span className="ml-auto text-xs text-muted-foreground">Alt+S</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="sn-main-editor-mobile-menu-item"
                        onClick={insertImageGeneration}
                    >
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Image
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {ALIGNMENT_OPTIONS.map((option) => (
                        <DropdownMenuItem
                            key={option.value}
                            className={cn("sn-main-editor-mobile-menu-item", alignment === option.value && "sn-main-editor-mobile-menu-item-active")}
                            onClick={() => applyAlignment(option.value)}
                        >
                            {option.label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

function ToolbarButton({
    active,
    children,
    disabled,
    label,
    onClick,
}: {
    active?: boolean;
    children: ReactNode;
    disabled?: boolean;
    label: string;
    onClick: () => void;
}) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("sn-main-editor-toolbar-button", active && "sn-main-editor-toolbar-button-active")}
            disabled={disabled}
            title={label}
            aria-label={label}
            aria-pressed={active}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClick}
        >
            {children}
        </Button>
    );
}
