import {
    $createParagraphNode,
    $getRoot,
    $getSelection,
    $isRangeSelection,
} from "lexical";

import { $createSceneBeatNode } from "../SceneBeatNode";

const SCENE_BEAT_NODE_KEY_ATTR = "data-scene-beat-node-key";

function focusSceneBeatCommandInput(nodeKey: string): void {
    if (typeof window === "undefined") return;

    const MAX_ATTEMPTS = 10;
    let attempts = 0;

    const tryFocus = () => {
        const selector = `[${SCENE_BEAT_NODE_KEY_ATTR}="${nodeKey}"] textarea`;
        const textarea = document.querySelector<HTMLTextAreaElement>(selector);

        if (textarea) {
            textarea.focus({ preventScroll: true });
            textarea.scrollIntoView({ block: "nearest" });
            return;
        }

        attempts++;
        if (attempts < MAX_ATTEMPTS) {
            requestAnimationFrame(tryFocus);
        }
    };

    // Wait one frame for Lexical to flush the DOM update, then start polling.
    requestAnimationFrame(tryFocus);
}

export function $insertSceneBeatBelowSelection(): string {
    const beatNode = $createSceneBeatNode();
    const paragraphNode = $createParagraphNode();
    const selection = $getSelection();

    if ($isRangeSelection(selection)) {
        const cursorNode = selection.focus.getNode();
        const insertionBlock = cursorNode.getKey() === "root"
            ? null
            : cursorNode.getTopLevelElementOrThrow();

        if (insertionBlock) {
            insertionBlock.insertAfter(beatNode);
            beatNode.insertAfter(paragraphNode);
        } else {
            $getRoot().append(beatNode, paragraphNode);
        }
    } else {
        $getRoot().append(beatNode, paragraphNode);
    }

    return beatNode.getKey();
}

export function focusInsertedSceneBeat(nodeKey: string): void {
    focusSceneBeatCommandInput(nodeKey);
}

export { SCENE_BEAT_NODE_KEY_ATTR };
