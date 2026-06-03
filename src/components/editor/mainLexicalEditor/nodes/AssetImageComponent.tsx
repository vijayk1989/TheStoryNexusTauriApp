import type { NodeKey } from "lexical";
import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
} from "lexical";
import { isAssetReference, resolveAssetDisplayUrl } from "@/features/images/services/assetStorage";
import { $isAssetImageNode } from "./AssetImageNode";
import { ImageOff } from "lucide-react";

export default function AssetImageComponent({
  src,
  altText,
  nodeKey,
  width,
  height,
  maxWidth,
}: {
  altText: string;
  height: "inherit" | number;
  maxWidth: number;
  nodeKey: NodeKey;
  src: string;
  width: "inherit" | number;
}): JSX.Element {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const [editor] = useLexicalComposerContext();
  const [isLoadError, setIsLoadError] = useState<boolean>(false);
  const [displaySrc, setDisplaySrc] = useState<string | null>(() =>
    isAssetReference(src) ? null : src,
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoadError(false);

    if (!isAssetReference(src)) {
      setDisplaySrc(src);
      return () => {
        cancelled = true;
      };
    }

    setDisplaySrc(null);
    resolveAssetDisplayUrl(src)
      .then((url) => {
        if (!cancelled) setDisplaySrc(url);
      })
      .catch((error) => {
        console.error("Failed to resolve image asset:", error);
        if (!cancelled) setIsLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  const onDelete = (payload: KeyboardEvent) => {
    const deleteSelection = $getSelection();
    if (isSelected && $isNodeSelection(deleteSelection)) {
      payload.preventDefault();
      deleteSelection.getNodes().forEach((node) => {
        if ($isAssetImageNode(node)) {
          node.remove();
        }
      });
    }
    return false;
  };

  const onClick = (payload: MouseEvent) => {
    if (payload.target === imageRef.current) {
      if (payload.shiftKey) {
        setSelected(!isSelected);
      } else {
        clearSelection();
        setSelected(true);
      }
      return true;
    }
    return false;
  };

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand<MouseEvent>(CLICK_COMMAND, onClick, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_DELETE_COMMAND, onDelete, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_BACKSPACE_COMMAND, onDelete, COMMAND_PRIORITY_LOW),
    );
  }, [clearSelection, editor, isSelected, onDelete, onClick, setSelected]);

  return (
    <div
      className={`relative inline-block max-w-full ${isSelected ? "ring-2 ring-primary ring-offset-2" : ""}`}
    >
      {isLoadError ? (
        <div className="flex h-48 w-48 flex-col items-center justify-center rounded-md border border-dashed bg-muted text-muted-foreground">
          <ImageOff className="mb-2 h-8 w-8 opacity-50" />
          <span className="text-xs">Image not found</span>
        </div>
      ) : displaySrc === null ? (
        <div className="flex h-48 w-48 animate-pulse items-center justify-center rounded-md bg-muted" />
      ) : (
        <img
          ref={imageRef}
          src={displaySrc}
          alt={altText}
          className="max-w-full rounded-md object-contain"
          style={{
            height,
            width,
            maxWidth,
          }}
          draggable="false"
          onError={() => setIsLoadError(true)}
        />
      )}
    </div>
  );
}
