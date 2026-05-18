import { useEffect } from "react";

import {
    COMMAND_PRIORITY_NORMAL,
    KEY_MODIFIER_COMMAND,
} from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

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
        return editor.registerCommand(
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
    }, [editor]);

    return null;
}
