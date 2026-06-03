/**
 * SlashCommandPlugin — Notion-style slash command menu for the clean editor.
 *
 * Type "/" at the start of a line (or after whitespace) to open a filterable
 * command palette.  Arrow keys navigate, Enter selects, Escape closes.
 */

import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
    $createParagraphNode,
    $getSelection,
    $isRangeSelection,
    $isTextNode,
    COMMAND_PRIORITY_NORMAL,
    KEY_ARROW_DOWN_COMMAND,
    KEY_ARROW_UP_COMMAND,
    KEY_ENTER_COMMAND,
    KEY_ESCAPE_COMMAND,
    type LexicalEditor,
} from "lexical";
import { Bot, ImageIcon } from "lucide-react";

import { $insertSceneBeatBelowSelection, focusInsertedSceneBeat } from "../nodes/scene-beat/insertSceneBeat";
import { $createImageGenerationNode } from "../nodes/ImageGenerationNode";

/* ─── command definitions ─────────────────────────────────── */

interface SlashCommandItem {
    key: string;
    name: string;
    icon: JSX.Element;
    description: string;
    onSelect: (editor: LexicalEditor) => void;
}

function getSlashCommandText(): string | null {
    const selection = $getSelection();
    if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
        return null;
    }

    const anchor = selection.anchor;
    const node = anchor.getNode();
    if (!$isTextNode(node)) {
        return null;
    }

    const textBeforeCursor = node.getTextContent().slice(0, anchor.offset);
    const match = textBeforeCursor.match(/(?:^|\s)\/([\w-]*)$/);
    return match ? match[1] || "" : null;
}

function removeSlashCommandText(): void {
    const selection = $getSelection();
    if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
        return;
    }

    const anchor = selection.anchor;
    const node = anchor.getNode();
    if (!$isTextNode(node)) {
        return;
    }

    const textBeforeCursor = node.getTextContent().slice(0, anchor.offset);
    const match = textBeforeCursor.match(/(?:^|\s)\/([\w-]*)$/);
    if (!match) {
        return;
    }

    const tokenLength = match[1].length + 1;
    const startOffset = anchor.offset - tokenLength;
    node.spliceText(startOffset, tokenLength, "");
}

const SLASH_COMMANDS: SlashCommandItem[] = [
    {
        key: "scene-beat",
        name: "Scene Beat",
        icon: <Bot className="h-4 w-4" />,
        description: "Insert a scene beat for AI generation",
        onSelect: (editor: LexicalEditor) => {
            editor.update(() => {
                removeSlashCommandText();
                const nodeKey = $insertSceneBeatBelowSelection();
                focusInsertedSceneBeat(nodeKey);
            });
        },
    },
    {
        key: "image-generation",
        name: "Image",
        icon: <ImageIcon className="h-4 w-4" />,
        description: "Insert an image generation block",
        onSelect: (editor: LexicalEditor) => {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    removeSlashCommandText();
                    const imageGenNode = $createImageGenerationNode();
                    const paragraphNode = $createParagraphNode();
                    selection.insertNodes([imageGenNode, paragraphNode]);
                }
            });
        },
    },
];

/* ─── component ───────────────────────────────────────────── */

export function SlashCommandPlugin(): JSX.Element | null {
    const [editor] = useLexicalComposerContext();
    const [slashCommandText, setSlashCommandText] = useState<string | null>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const menuRef = useRef<HTMLDivElement>(null);

    const filteredCommands = slashCommandText
        ? SLASH_COMMANDS.filter(
              (cmd) =>
                  cmd.name.toLowerCase().includes(slashCommandText.toLowerCase()) ||
                  cmd.description.toLowerCase().includes(slashCommandText.toLowerCase()),
          )
        : SLASH_COMMANDS;

    const resetMenu = useCallback(() => {
        setShowMenu(false);
        setSlashCommandText(null);
        setSelectedCommandIndex(0);
    }, []);

    const updateMenuPosition = useCallback(() => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
            });
        }
    }, []);

    const onKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!showMenu) return false;

            if (event.key === "Escape") {
                event.preventDefault();
                resetMenu();
                return true;
            }

            if (event.key === "ArrowDown") {
                event.preventDefault();
                setSelectedCommandIndex((prev) =>
                    prev < filteredCommands.length - 1 ? prev + 1 : prev,
                );
                return true;
            }

            if (event.key === "ArrowUp") {
                event.preventDefault();
                setSelectedCommandIndex((prev) => (prev > 0 ? prev - 1 : 0));
                return true;
            }

            if (event.key === "Enter" && filteredCommands.length > 0) {
                event.preventDefault();
                const selectedCommand = filteredCommands[selectedCommandIndex];
                selectedCommand.onSelect(editor);
                resetMenu();
                return true;
            }

            return false;
        },
        [editor, filteredCommands, resetMenu, selectedCommandIndex, showMenu],
    );

    // Detect slash-command token near cursor
    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            const commandText = editorState.read(() => getSlashCommandText());
            if (commandText !== null) {
                setSlashCommandText(commandText);
                setShowMenu(true);
                setSelectedCommandIndex(0);
                updateMenuPosition();
            } else if (showMenu) {
                resetMenu();
            }
        });
    }, [editor, resetMenu, showMenu, updateMenuPosition]);

    // Clamp selected index when filtered list shrinks
    useEffect(() => {
        if (selectedCommandIndex >= filteredCommands.length) {
            setSelectedCommandIndex(Math.max(filteredCommands.length - 1, 0));
        }
    }, [filteredCommands.length, selectedCommandIndex]);

    // Click-outside handler
    useEffect(() => {
        if (!showMenu) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                resetMenu();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showMenu, resetMenu]);

    // Register keyboard commands
    useEffect(() => {
        return mergeRegister(
            editor.registerCommand(
                KEY_ESCAPE_COMMAND,
                () => {
                    if (showMenu) {
                        resetMenu();
                        return true;
                    }
                    return false;
                },
                COMMAND_PRIORITY_NORMAL,
            ),
            editor.registerCommand(
                KEY_ENTER_COMMAND,
                (event) => onKeyDown(event as KeyboardEvent),
                COMMAND_PRIORITY_NORMAL,
            ),
            editor.registerCommand(
                KEY_ARROW_DOWN_COMMAND,
                (event) => onKeyDown(event as KeyboardEvent),
                COMMAND_PRIORITY_NORMAL,
            ),
            editor.registerCommand(
                KEY_ARROW_UP_COMMAND,
                (event) => onKeyDown(event as KeyboardEvent),
                COMMAND_PRIORITY_NORMAL,
            ),
        );
    }, [editor, onKeyDown, resetMenu, showMenu]);

    if (!showMenu) {
        return null;
    }

    return createPortal(
        <div
            ref={menuRef}
            className="sn-slash-menu"
            style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
            }}
        >
            <div className="sn-slash-menu-header">
                {filteredCommands.length === 0 ? (
                    <span>No commands found</span>
                ) : (
                    <span>
                        {slashCommandText
                            ? `Results for "${slashCommandText}"`
                            : "Commands"}
                    </span>
                )}
            </div>
            <div className="sn-slash-menu-list">
                {filteredCommands.map((command, index) => (
                    <div
                        key={command.key}
                        className={`sn-slash-menu-item${index === selectedCommandIndex ? " sn-slash-menu-item-active" : ""}`}
                        onClick={() => {
                            command.onSelect(editor);
                            resetMenu();
                        }}
                    >
                        <div className="sn-slash-menu-item-icon">{command.icon}</div>
                        <div className="sn-slash-menu-item-content">
                            <div className="sn-slash-menu-item-name">{command.name}</div>
                            <div className="sn-slash-menu-item-desc">
                                {command.description}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>,
        document.body,
    );
}
