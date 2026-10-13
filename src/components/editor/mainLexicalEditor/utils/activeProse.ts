import type { LexicalNode } from "lexical";
import { $isGeneratedProseNode } from "../nodes/GeneratedProseNode";

export function $isInDisabledProse(node: LexicalNode): boolean {
    for (let current: LexicalNode | null = node; current; current = current.getParent()) {
        if ($isGeneratedProseNode(current) && current.isDisabled()) return true;
    }
    return false;
}
