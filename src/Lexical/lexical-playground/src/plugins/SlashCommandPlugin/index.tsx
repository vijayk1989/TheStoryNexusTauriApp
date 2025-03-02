/**
 * SlashCommandPlugin - Adds support for slash commands like in Notion
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import {
    COMMAND_PRIORITY_NORMAL,
    KEY_ESCAPE_COMMAND,
    KEY_ENTER_COMMAND,
    KEY_ARROW_DOWN_COMMAND,
    KEY_ARROW_UP_COMMAND,
    TextNode,
    $getSelection,
    $isRangeSelection,
    $createParagraphNode,
    LexicalEditor,
    $createTextNode,
} from 'lexical';
import { mergeRegister } from '@lexical/utils';
import { $createSceneBeatNode } from '../../nodes/SceneBeatNode';
import { Bot } from 'lucide-react';
import { createPortal } from 'react-dom';

interface SlashCommandItem {
    key: string;
    name: string;
    icon: JSX.Element;
    description: string;
    onSelect: (editor: LexicalEditor) => void;
}

const SLASH_COMMANDS: SlashCommandItem[] = [
    {
        key: 'scene-beat',
        name: 'Scene Beat',
        icon: <Bot className="h-4 w-4" />,
        description: 'Insert a scene beat for AI generation',
        onSelect: (editor: LexicalEditor) => {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    // Delete the slash command text
                    selection.deleteCharacter(false);

                    // Insert the scene beat node
                    const beatNode = $createSceneBeatNode();
                    const paragraphNode = $createParagraphNode();
                    selection.insertNodes([beatNode, paragraphNode]);
                }
            });
        },
    },
    // Add more slash commands here as needed
];

export default function SlashCommandPlugin({
    editor,
}: {
    editor: LexicalEditor;
}): JSX.Element | null {
    const [slashCommandText, setSlashCommandText] = useState<string | null>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const menuRef = useRef<HTMLDivElement>(null);

    const filteredCommands = slashCommandText
        ? SLASH_COMMANDS.filter(cmd =>
            cmd.name.toLowerCase().includes(slashCommandText.toLowerCase()) ||
            cmd.description.toLowerCase().includes(slashCommandText.toLowerCase())
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

            // Position the menu below the cursor
            setMenuPosition({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
            });
        }
    }, []);

    const onKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!showMenu) return false;

            // Handle escape to close the menu
            if (event.key === 'Escape') {
                event.preventDefault();
                resetMenu();
                return true;
            }

            // Handle arrow keys for navigation
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setSelectedCommandIndex((prev) =>
                    prev < filteredCommands.length - 1 ? prev + 1 : prev
                );
                return true;
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                setSelectedCommandIndex((prev) => (prev > 0 ? prev - 1 : 0));
                return true;
            }

            // Handle enter to select command
            if (event.key === 'Enter' && filteredCommands.length > 0) {
                event.preventDefault();
                const selectedCommand = filteredCommands[selectedCommandIndex];
                selectedCommand.onSelect(editor);
                resetMenu();
                return true;
            }

            return false;
        },
        [editor, filteredCommands, resetMenu, selectedCommandIndex, showMenu]
    );

    // Listen for text changes to detect slash commands
    useEffect(() => {
        const removeTextListener = editor.registerTextContentListener(
            (textContent) => {
                // Check if the text contains a slash command
                // This regex matches a slash followed by any word characters at the end of the text
                // or a slash at the very end of the text (to show the menu as soon as / is typed)
                const match = textContent.match(/\/(\w*)$|\/$/);
                if (match) {
                    // If we matched just a slash at the end, set empty text
                    const commandText = match[1] || '';
                    setSlashCommandText(commandText);
                    setShowMenu(true);
                    updateMenuPosition();
                } else if (showMenu) {
                    resetMenu();
                }
            }
        );

        return removeTextListener;
    }, [editor, resetMenu, showMenu, updateMenuPosition]);

    // Add click outside handler
    useEffect(() => {
        if (showMenu) {
            const handleClickOutside = (event: MouseEvent) => {
                if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                    resetMenu();
                }
            };

            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [showMenu, resetMenu]);

    // Register command listeners
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
                COMMAND_PRIORITY_NORMAL
            ),
            editor.registerCommand(
                KEY_ENTER_COMMAND,
                (event) => onKeyDown(event as KeyboardEvent),
                COMMAND_PRIORITY_NORMAL
            ),
            editor.registerCommand(
                KEY_ARROW_DOWN_COMMAND,
                (event) => onKeyDown(event as KeyboardEvent),
                COMMAND_PRIORITY_NORMAL
            ),
            editor.registerCommand(
                KEY_ARROW_UP_COMMAND,
                (event) => onKeyDown(event as KeyboardEvent),
                COMMAND_PRIORITY_NORMAL
            )
        );
    }, [editor, onKeyDown, resetMenu, showMenu]);

    // If menu is not shown, don't render anything
    if (!showMenu) {
        return null;
    }

    return createPortal(
        <div
            ref={menuRef}
            className="absolute z-50 mt-1 bg-popover border border-border rounded-md shadow-md overflow-hidden w-64"
            style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`
            }}
        >
            <div className="p-1 text-xs text-muted-foreground">
                {filteredCommands.length === 0 ? (
                    <div className="p-2">No commands found</div>
                ) : (
                    <div className="text-xs px-2 py-1 text-muted-foreground">
                        {slashCommandText ? `Results for "${slashCommandText}"` : 'Commands'}
                    </div>
                )}
            </div>
            <div className="max-h-60 overflow-y-auto">
                {filteredCommands.map((command, index) => (
                    <div
                        key={command.key}
                        className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-accent/50 ${index === selectedCommandIndex ? 'bg-accent/50' : ''
                            }`}
                        onClick={() => {
                            command.onSelect(editor);
                            resetMenu();
                        }}
                    >
                        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-muted-foreground">
                            {command.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-medium">{command.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                                {command.description}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>,
        document.body
    );
} 