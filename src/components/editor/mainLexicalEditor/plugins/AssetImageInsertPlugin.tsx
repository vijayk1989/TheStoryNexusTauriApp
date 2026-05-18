import { useEffect } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
    $createParagraphNode,
    $getSelection,
    $insertNodes,
} from "lexical";

import { assetReference } from "@/features/images/services/assetStorage";

import { $createAssetImageNode } from "../nodes/AssetImageNode";

export const INSERT_ASSET_IMAGE_EVENT = "story-nexus-insert-asset-image";

export function dispatchInsertAssetImage(assetId: string, altText?: string): void {
    window.dispatchEvent(new CustomEvent(INSERT_ASSET_IMAGE_EVENT, {
        detail: { assetId, altText },
    }));
}

export function AssetImageInsertPlugin(): null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        const handler = (event: Event) => {
            const detail = (event as CustomEvent<{ assetId?: string; altText?: string }>).detail;
            if (!detail?.assetId) return;

            editor.update(() => {
                const imageNode = $createAssetImageNode({
                    src: assetReference(detail.assetId),
                    altText: detail.altText || "Story image",
                    maxWidth: 720,
                });
                const paragraphNode = $createParagraphNode();
                const selection = $getSelection();

                if (selection) {
                    selection.insertNodes([imageNode, paragraphNode]);
                } else {
                    $insertNodes([imageNode, paragraphNode]);
                }
            });
        };

        window.addEventListener(INSERT_ASSET_IMAGE_EVENT, handler);
        return () => window.removeEventListener(INSERT_ASSET_IMAGE_EVENT, handler);
    }, [editor]);

    return null;
}
