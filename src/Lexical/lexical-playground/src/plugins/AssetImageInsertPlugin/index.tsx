import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { INSERT_IMAGE_COMMAND } from "../ImagesPlugin";
import { assetReference } from "@/features/images/services/assetStorage";

export const INSERT_ASSET_IMAGE_EVENT = "story-nexus-insert-asset-image";

export function dispatchInsertAssetImage(assetId: string, altText?: string): void {
  window.dispatchEvent(new CustomEvent(INSERT_ASSET_IMAGE_EVENT, {
    detail: { assetId, altText },
  }));
}

export default function AssetImageInsertPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ assetId?: string; altText?: string }>).detail;
      if (!detail?.assetId) return;
      editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
        src: assetReference(detail.assetId),
        altText: detail.altText || "Story image",
        maxWidth: 720,
      });
    };

    window.addEventListener(INSERT_ASSET_IMAGE_EVENT, handler);
    return () => window.removeEventListener(INSERT_ASSET_IMAGE_EVENT, handler);
  }, [editor]);

  return null;
}
