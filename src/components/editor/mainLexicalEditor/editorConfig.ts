import type { EditorThemeClasses, Klass, LexicalNode } from "lexical";

import { ListItemNode, ListNode } from "@lexical/list";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";

import { SceneBeatNode } from "./nodes/SceneBeatNode";
import { AssetImageNode } from "./nodes/AssetImageNode";
import { ImageGenerationNode } from "./nodes/ImageGenerationNode";
import "./styles.css";

const theme: EditorThemeClasses = {
    heading: {
        h1: "sn-main-editor-h1",
        h2: "sn-main-editor-h2",
        h3: "sn-main-editor-h3",
    },
    list: {
        listitem: "sn-main-editor-list-item",
        nested: {
            listitem: "sn-main-editor-nested-list-item",
        },
        olDepth: [
            "sn-main-editor-ol",
            "sn-main-editor-ol",
            "sn-main-editor-ol",
            "sn-main-editor-ol",
            "sn-main-editor-ol",
        ],
        ul: "sn-main-editor-ul",
    },
    paragraph: "sn-main-editor-paragraph",
    quote: "sn-main-editor-quote",
    text: {
        bold: "sn-main-editor-text-bold",
        italic: "sn-main-editor-text-italic",
        strikethrough: "sn-main-editor-text-strikethrough",
        underline: "sn-main-editor-text-underline",
        underlineStrikethrough: "sn-main-editor-text-underline-strikethrough",
    },
};

export const mainLexicalEditorNodes: Array<Klass<LexicalNode>> = [
    HeadingNode,
    ListNode,
    ListItemNode,
    QuoteNode,
    SceneBeatNode,
    AssetImageNode,
    ImageGenerationNode,
];

export const mainLexicalEditorConfig = {
    namespace: "StoryNexusMainEditor",
    nodes: mainLexicalEditorNodes,
    onError(error: Error) {
        console.error("MainLexicalEditor - Lexical error:", error);
    },
    theme,
};
