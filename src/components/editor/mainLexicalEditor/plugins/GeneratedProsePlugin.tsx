import { useEffect, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext.js";
import { $unwrapNode, mergeRegister } from "@lexical/utils";
import {
    $createNodeSelection, $createParagraphNode, $getNodeByKey, $getSelection,
    $isElementNode, $isNodeSelection, $isRangeSelection, $isTextNode, $setSelection,
    COMMAND_PRIORITY_HIGH, KEY_BACKSPACE_COMMAND, KEY_DELETE_COMMAND,
    HISTORY_PUSH_TAG,
    CONTROLLED_TEXT_INSERTION_COMMAND, PASTE_COMMAND, CUT_COMMAND,
    FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND,
    KEY_ENTER_COMMAND, KEY_ESCAPE_COMMAND, type LexicalNode,
} from "lexical";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEditorPreferencesStore } from "@/features/editor/stores/useEditorPreferencesStore";
import type { ProseGenerationMetadata } from "@/types/story";
import { $isGeneratedProseNode } from "../nodes/GeneratedProseNode";
import { $isInDisabledProse } from "../utils/activeProse";
import { toast } from "react-toastify";

export function GeneratedProsePlugin() {
    const [editor] = useLexicalComposerContext();
    const showLabels = useEditorPreferencesStore((state) => state.showGenerationLabels);
    const [details, setDetails] = useState<ProseGenerationMetadata | null>(null);

    useEffect(() => editor.registerRootListener((root, previous) => {
        previous?.classList.remove("sn-hide-generation-labels");
        root?.classList.toggle("sn-hide-generation-labels", !showLabels);
    }), [editor, showLabels]);

    useEffect(() => {
        const selectBlock = (key: string) => {
            editor.focus(() => editor.update(() => {
                if (!$isGeneratedProseNode($getNodeByKey(key))) return;
                const selection = $createNodeSelection();
                selection.add(key);
                $setSelection(selection);
            }));
        };
        const onMouseDown = (event: MouseEvent) => {
            if ((event.target as HTMLElement).closest('[data-prose-action="select"], [data-prose-action="remove-label"], [data-prose-action="toggle-disabled"], [data-prose-action="copy-text"]')) event.preventDefault();
        };
        const onClick = async (event: MouseEvent) => {
            const action = (event.target as HTMLElement).closest<HTMLElement>("[data-prose-action]");
            const key = action?.closest<HTMLElement>("[data-generated-prose-key]")?.dataset.generatedProseKey;
            if (!key) return;
            if (action?.dataset.proseAction === "select") selectBlock(key);
            else if (action?.dataset.proseAction === "copy-text") {
                const text = editor.getEditorState().read(() => {
                    const node = $getNodeByKey(key);
                    return $isGeneratedProseNode(node) ? node.getTextContent() : null;
                });
                if (text === null) return;
                try {
                    await navigator.clipboard.writeText(text);
                    toast.success("Block text copied");
                } catch {
                    toast.error("Could not copy block text");
                }
            }
            else if (action?.dataset.proseAction === "toggle-disabled") {
                editor.update(() => {
                    const node = $getNodeByKey(key);
                    if ($isGeneratedProseNode(node)) node.setDisabled(!node.isDisabled());
                }, { tag: HISTORY_PUSH_TAG });
            }
            else if (action?.dataset.proseAction === "remove-label") {
                editor.focus(() => editor.update(() => {
                    const node = $getNodeByKey(key);
                    if (!$isGeneratedProseNode(node) || node.isDisabled()) return;
                    const firstChild = node.getFirstChild();
                    $unwrapNode(node);
                    firstChild?.selectStart();
                }, { tag: HISTORY_PUSH_TAG }));
            } else if (action?.dataset.proseAction === "details") editor.getEditorState().read(() => {
                const node = $getNodeByKey(key);
                if ($isGeneratedProseNode(node)) setDetails(node.getGeneration());
            });
        };
        const deleteBlock = (event: KeyboardEvent | null) => {
            const selection = $getSelection();
            if (!$isNodeSelection(selection)) return false;
            const blocks = selection.getNodes().filter($isGeneratedProseNode);
            if (!blocks.length) return false;
            event?.preventDefault();
            const last = blocks[blocks.length - 1];
            let next = last.getNextSibling();
            if (!$isElementNode(next)) {
                next = $createParagraphNode();
                last.insertAfter(next);
            }
            next.selectStart();
            blocks.forEach((node) => node.remove());
            return true;
        };
        const guardBoundary = (event: KeyboardEvent | null, backward: boolean) => {
            if (deleteBlock(event)) return true;
            if (protectDisabledContents(event)) return true;
            const selection = $getSelection();
            if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
            const anchor = selection.anchor.getNode();
            const paragraph = $isElementNode(anchor) ? anchor : anchor.getParent();
            if (!paragraph) return false;
            const atEdge = backward
                ? selection.anchor.offset === 0 && (!$isTextNode(anchor) || paragraph.getFirstDescendant()?.is(anchor))
                : ($isTextNode(anchor) && selection.anchor.offset === anchor.getTextContentSize() && paragraph.getLastDescendant()?.is(anchor));
            if (!atEdge) return false;
            const parent = paragraph.getParent();
            const neighbor = backward ? paragraph.getPreviousSibling() : paragraph.getNextSibling();
            if (($isGeneratedProseNode(parent) && !neighbor) || $isGeneratedProseNode(neighbor)) {
                event?.preventDefault();
                return true;
            }
            return false;
        };
        const protectDisabledContents = (event?: { preventDefault: () => void } | string | null) => {
            if (!$getSelection()?.getNodes().some($isInDisabledProse)) return false;
            if (event && typeof event !== "string") event.preventDefault();
            return true;
        };
        return mergeRegister(
            editor.registerRootListener((root, previous) => {
                previous?.removeEventListener("mousedown", onMouseDown);
                previous?.removeEventListener("click", onClick);
                root?.addEventListener("mousedown", onMouseDown);
                root?.addEventListener("click", onClick);
            }),
            editor.registerUpdateListener(({ editorState }) => editorState.read(() => {
                const selection = $getSelection();
                const selected = $isNodeSelection(selection) ? new Set(selection.getNodes().map((node) => node.getKey())) : new Set();
                editor.getRootElement()?.querySelectorAll<HTMLElement>("[data-generated-prose-key]").forEach((dom) => {
                    const isSelected = selected.has(dom.dataset.generatedProseKey!);
                    dom.classList.toggle("sn-generated-prose-selected", isSelected);
                    dom.querySelector('[data-prose-action="select"]')?.setAttribute("aria-pressed", String(isSelected));
                });
            })),
            editor.registerCommand(KEY_BACKSPACE_COMMAND, (event) => guardBoundary(event, true), COMMAND_PRIORITY_HIGH),
            editor.registerCommand(KEY_DELETE_COMMAND, (event) => guardBoundary(event, false), COMMAND_PRIORITY_HIGH),
            editor.registerCommand(CONTROLLED_TEXT_INSERTION_COMMAND, protectDisabledContents, COMMAND_PRIORITY_HIGH),
            editor.registerCommand(PASTE_COMMAND, protectDisabledContents, COMMAND_PRIORITY_HIGH),
            editor.registerCommand(CUT_COMMAND, protectDisabledContents, COMMAND_PRIORITY_HIGH),
            editor.registerCommand(FORMAT_TEXT_COMMAND, () => protectDisabledContents(), COMMAND_PRIORITY_HIGH),
            editor.registerCommand(FORMAT_ELEMENT_COMMAND, () => protectDisabledContents(), COMMAND_PRIORITY_HIGH),
            editor.registerCommand(KEY_ESCAPE_COMMAND, (event) => {
                const selection = $getSelection();
                const block = $isNodeSelection(selection) ? selection.getNodes().find($isGeneratedProseNode) : null;
                if (!block) return false;
                event.preventDefault();
                if (block.isDisabled()) {
                    const previous = block.getPreviousSibling();
                    if (previous) previous.selectEnd();
                    else block.getParentOrThrow().selectStart();
                } else block.selectStart();
                return true;
            }, COMMAND_PRIORITY_HIGH),
            editor.registerCommand(KEY_ENTER_COMMAND, (event) => {
                if (protectDisabledContents(event)) return true;
                if (event?.shiftKey) return false;
                const selection = $getSelection();
                if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
                let paragraph: LexicalNode | null = selection.anchor.getNode();
                if (!$isElementNode(paragraph)) paragraph = paragraph.getParent();
                const block = paragraph?.getParent();
                if (!$isGeneratedProseNode(block) || paragraph?.getTextContent() || paragraph?.getNextSibling()) return false;
                event?.preventDefault();
                const next = $createParagraphNode();
                block.insertAfter(next);
                paragraph.remove();
                next.selectStart();
                return true;
            }, COMMAND_PRIORITY_HIGH),
        );
    }, [editor]);

    return <Dialog open={!!details} onOpenChange={(open) => { if (!open) setDetails(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Generation details</DialogTitle></DialogHeader>
            {details && <div className="space-y-4 text-sm">
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                    <dt>Model</dt><dd>{details.model?.name || "Unknown model"}</dd>
                    <dt>Provider</dt><dd>{details.model?.provider || "Unknown provider"}</dd>
                    <dt>Model ID</dt><dd className="break-all">{details.model?.id || "Unknown"}</dd>
                    <dt>Prompt</dt><dd>{details.promptName}</dd>
                    <dt>Generated</dt><dd>{new Date(details.generatedAt).toLocaleString()}</dd>
                </dl>
                <div><p className="font-medium mb-1">SceneBeat instruction</p><p className="whitespace-pre-wrap">{details.sceneBeatCommand}</p></div>
                <div className="space-y-2"><p className="font-medium">Prompt sent</p>{details.promptMessages.map((message, index) => <div key={index} className="rounded border p-3">
                    <p className="font-medium mb-1 capitalize">{message.role}</p>
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                </div>)}</div>
            </div>}
        </DialogContent>
    </Dialog>;
}
