/**
 * SceneBeatShortcutPlugin - Adds keyboard shortcut support for inserting Scene Beat nodes
 */

import { useEffect } from 'react';
import {
    COMMAND_PRIORITY_NORMAL,
    KEY_MODIFIER_COMMAND,
    LexicalEditor,
    $getSelection,
    $createParagraphNode,
} from 'lexical';
import { isInsertSceneBeat } from '../ShortcutsPlugin/shortcuts';
import { $createSceneBeatNode } from '../../nodes/SceneBeatNode';

export default function SceneBeatShortcutPlugin({
    editor,
}: {
    editor: LexicalEditor;
}): null {
    useEffect(() => {
        const keyboardShortcutsHandler = (payload: KeyboardEvent) => {
            const event: KeyboardEvent = payload;

            if (isInsertSceneBeat(event)) {
                event.preventDefault();

                editor.update(() => {
                    const selection = $getSelection();
                    if (selection) {
                        const beatNode = $createSceneBeatNode();
                        const paragraphNode = $createParagraphNode();
                        selection.insertNodes([beatNode, paragraphNode]);
                    }
                });

                return true;
            }

            return false;
        };

        return editor.registerCommand(
            KEY_MODIFIER_COMMAND,
            keyboardShortcutsHandler,
            COMMAND_PRIORITY_NORMAL,
        );
    }, [editor]);

    return null;
} 