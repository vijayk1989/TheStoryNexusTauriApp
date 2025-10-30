import type { LexicalEditor, NodeKey } from "lexical";
import { $createParagraphNode, $createTextNode, $getNodeByKey } from "lexical";

/**
 * Extracts all text content before the specified node in the Lexical editor.
 * Preserves formatting by adding newlines after block-level nodes.
 *
 * @param editor - The Lexical editor instance
 * @param nodeKey - The key of the node to extract text before
 * @returns The previous text content with preserved formatting
 */
export const extractPreviousText = (editor: LexicalEditor, nodeKey: NodeKey): string => {
  let previousText = "";

  editor.getEditorState().read(() => {
    const node = $getNodeByKey(nodeKey);
    if (!node) return;

    const textNodes: string[] = [];
    let currentNode = node.getPreviousSibling();

    while (currentNode) {
      if ("getTextContent" in currentNode) {
        // Check if the node is a block-level node
        const isBlockNode =
          currentNode.getType() === "paragraph" ||
          currentNode.getType() === "heading" ||
          currentNode.getType() === "list-item";

        const nodeText = currentNode.getTextContent();

        // Add the text content with proper newline handling
        if (nodeText.trim()) {
          textNodes.unshift(nodeText);

          // Add an extra newline after block nodes
          if (isBlockNode) {
            textNodes.unshift("\n");
          }
        }
      }
      currentNode = currentNode.getPreviousSibling();
    }

    previousText = textNodes.join("");
  });

  return previousText;
};

/**
 * Inserts text content as a new paragraph node after the specified node.
 *
 * @param editor - The Lexical editor instance
 * @param nodeKey - The key of the node to insert after
 * @param text - The text content to insert
 */
export const insertTextAfterNode = (
  editor: LexicalEditor,
  nodeKey: NodeKey,
  text: string
): void => {
  editor.update(() => {
    const paragraphNode = $createParagraphNode();
    paragraphNode.append($createTextNode(text));
    const currentNode = $getNodeByKey(nodeKey);
    if (currentNode) {
      currentNode.insertAfter(paragraphNode);
    }
  });
};
