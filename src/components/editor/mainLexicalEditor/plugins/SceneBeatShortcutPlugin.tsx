import { useEffect } from "react";

import {
    $getSelection,
    $isRangeSelection,
    COMMAND_PRIORITY_HIGH,
    COMMAND_PRIORITY_NORMAL,
    KEY_BACKSPACE_COMMAND,
    KEY_MODIFIER_COMMAND,
} from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

import { $isSceneBeatNode } from "../nodes/SceneBeatNode";
import { $insertSceneBeatBelowSelection, focusInsertedSceneBeat } from "../nodes/scene-beat/insertSceneBeat";

function isInsertSceneBeatShortcut(event: KeyboardEvent): boolean {
    return (
        event.code === "KeyS" &&
        event.altKey &&
        !event.shiftKey &&
        !event.metaKey &&
        !event.ctrlKey
    );
}

export function SceneBeatShortcutPlugin() {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        const removeShortcut = editor.registerCommand(
            KEY_MODIFIER_COMMAND,
            (event: KeyboardEvent) => {
                if (!isInsertSceneBeatShortcut(event)) {
                    return false;
                }

                event.preventDefault();
                editor.update(() => {
                    const nodeKey = $insertSceneBeatBelowSelection();
                    focusInsertedSceneBeat(nodeKey);
                });

                return true;
            },
            COMMAND_PRIORITY_NORMAL
        );

        const removeBackspace = editor.registerCommand(
            KEY_BACKSPACE_COMMAND,
            (event: KeyboardEvent) => {
                const selection = $getSelection();
                if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
                    return false;
                }

                const anchorNode = selection.anchor.getNode();
                const blockNode = anchorNode.getKey() === "root"
                    ? null
                    : anchorNode.getTopLevelElementOrThrow();

                if (
                    !blockNode ||
                    blockNode.getType() !== "paragraph" ||
                    blockNode.getTextContentSize() !== 0 ||
                    selection.anchor.offset !== 0
                ) {
                    return false;
                }

                const previousNode = blockNode.getPreviousSibling();
                if (!$isSceneBeatNode(previousNode)) {
                    return false;
                }

                event.preventDefault();
                previousNode.remove();
                blockNode.selectStart();
                return true;
            },
            COMMAND_PRIORITY_HIGH
        );

        return () => {
            removeShortcut();
            removeBackspace();
        };
    }, [editor]);

    return null;
}
