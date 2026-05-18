import type { JSX } from "react";
import type { LexicalNode, NodeKey } from "lexical";
import { Suspense, useCallback, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
    $applyNodeReplacement,
    $getNodeByKey,
    DecoratorNode,
} from "lexical";

import {
    createSceneBeatInstanceStore,
    SceneBeatStoreContext,
    type SceneBeatInstanceStoreApi,
} from "@/features/scenebeats/stores/useSceneBeatInstanceStore";
import type { SceneBeat } from "@/types/story";

import { SceneBeatBlock } from "./scene-beat/SceneBeatBlock";
import type {
    SceneBeatNodeSnapshot,
    SerializedSceneBeatNode,
} from "./scene-beat/types";

export type { SceneBeatNodeSnapshot, SerializedSceneBeatNode };

export const SCENE_BEAT_SNAPSHOT_TAG = "scene-beat-snapshot";

function SceneBeatComponent({
    nodeKey,
    initialSnapshot,
}: {
    nodeKey: NodeKey;
    initialSnapshot: SceneBeatNodeSnapshot;
}): JSX.Element {
    const [editor] = useLexicalComposerContext();
    const storeRef = useRef<SceneBeatInstanceStoreApi>();

    if (!storeRef.current) {
        storeRef.current = createSceneBeatInstanceStore(nodeKey);
    }

    const writeNodeSnapshot = useCallback(
        (snapshot: Partial<SceneBeatNodeSnapshot>) => {
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                if ($isSceneBeatNode(node)) {
                    node.setSceneBeatSnapshot(snapshot);
                }
            }, { tag: SCENE_BEAT_SNAPSHOT_TAG });
        },
        [editor, nodeKey]
    );

    return (
        <SceneBeatStoreContext.Provider value={storeRef.current}>
            <SceneBeatBlock
                initialSnapshot={initialSnapshot}
                writeNodeSnapshot={writeNodeSnapshot}
            />
        </SceneBeatStoreContext.Provider>
    );
}

export class SceneBeatNode extends DecoratorNode<JSX.Element> {
    __sceneBeatId: string;
    __command: string;
    __povType: SceneBeat["povType"] | undefined;
    __povCharacter: string | undefined;
    __generatedContent: string;
    __accepted: boolean;
    __metadata: SceneBeat["metadata"] | undefined;
    __collapsed: boolean;

    constructor(
        sceneBeatId = "",
        snapshot: Partial<SceneBeatNodeSnapshot> = {},
        key?: NodeKey
    ) {
        super(key);
        this.__sceneBeatId = sceneBeatId;
        this.__command = snapshot.command || "";
        this.__povType = snapshot.povType;
        this.__povCharacter = snapshot.povCharacter;
        this.__generatedContent = snapshot.generatedContent || "";
        this.__accepted = snapshot.accepted || false;
        this.__metadata = snapshot.metadata;
        this.__collapsed = snapshot.collapsed || false;
    }

    static getType(): string {
        return "scene-beat";
    }

    static clone(node: SceneBeatNode): SceneBeatNode {
        return new SceneBeatNode(
            node.__sceneBeatId,
            node.getSnapshot(),
            node.__key
        );
    }

    static importJSON(serializedNode: SerializedSceneBeatNode): SceneBeatNode {
        return $createSceneBeatNode(serializedNode.sceneBeatId || "", {
            command: serializedNode.command || "",
            povType: serializedNode.povType,
            povCharacter: serializedNode.povCharacter,
            generatedContent: serializedNode.generatedContent || "",
            accepted: serializedNode.accepted || false,
            metadata: serializedNode.metadata,
            collapsed: serializedNode.collapsed || false,
        });
    }

    exportJSON(): SerializedSceneBeatNode {
        return {
            type: "scene-beat",
            version: 2,
            ...this.getSnapshot(),
        };
    }

    getSceneBeatId(): string {
        return this.__sceneBeatId;
    }

    getSnapshot(): SceneBeatNodeSnapshot {
        return {
            sceneBeatId: this.__sceneBeatId,
            command: this.__command,
            povType: this.__povType,
            povCharacter: this.__povCharacter,
            generatedContent: this.__generatedContent,
            accepted: this.__accepted,
            metadata: this.__metadata,
            collapsed: this.__collapsed,
        };
    }

    setSceneBeatId(id: string): void {
        if (this.__sceneBeatId === id) return;
        const writable = this.getWritable();
        writable.__sceneBeatId = id;
    }

    setSceneBeatSnapshot(snapshot: Partial<SceneBeatNodeSnapshot>): void {
        let writable: SceneBeatNode | null = null;
        const getWritableNode = () => {
            writable = writable || this.getWritable();
            return writable;
        };

        if ("sceneBeatId" in snapshot && this.__sceneBeatId !== (snapshot.sceneBeatId || "")) {
            getWritableNode().__sceneBeatId = snapshot.sceneBeatId || "";
        }
        if ("command" in snapshot && this.__command !== (snapshot.command || "")) {
            getWritableNode().__command = snapshot.command || "";
        }
        if ("povType" in snapshot && this.__povType !== snapshot.povType) {
            getWritableNode().__povType = snapshot.povType;
        }
        if ("povCharacter" in snapshot && this.__povCharacter !== snapshot.povCharacter) {
            getWritableNode().__povCharacter = snapshot.povCharacter;
        }
        if ("generatedContent" in snapshot && this.__generatedContent !== (snapshot.generatedContent || "")) {
            getWritableNode().__generatedContent = snapshot.generatedContent || "";
        }
        if ("accepted" in snapshot && this.__accepted !== (snapshot.accepted || false)) {
            getWritableNode().__accepted = snapshot.accepted || false;
        }
        if ("metadata" in snapshot && JSON.stringify(this.__metadata) !== JSON.stringify(snapshot.metadata)) {
            getWritableNode().__metadata = snapshot.metadata;
        }
        if ("collapsed" in snapshot && this.__collapsed !== (snapshot.collapsed || false)) {
            getWritableNode().__collapsed = snapshot.collapsed || false;
        }
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
                <SceneBeatComponent
                    nodeKey={this.__key}
                    initialSnapshot={this.getSnapshot()}
                />
            </Suspense>
        );
    }
}

export function $createSceneBeatNode(
    sceneBeatId = "",
    snapshot: Partial<SceneBeatNodeSnapshot> = {}
): SceneBeatNode {
    return $applyNodeReplacement(new SceneBeatNode(sceneBeatId, snapshot));
}

export function $isSceneBeatNode(
    node: LexicalNode | null | undefined
): node is SceneBeatNode {
    return node instanceof SceneBeatNode;
}
