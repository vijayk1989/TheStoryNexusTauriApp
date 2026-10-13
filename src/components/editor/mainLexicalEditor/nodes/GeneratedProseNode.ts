import {
    $applyNodeReplacement,
    $createParagraphNode,
    $createTextNode,
    ElementNode,
    type EditorConfig,
    type ElementDOMSlot,
    type LexicalNode,
    type NodeKey,
    type SerializedElementNode,
    type Spread,
} from "lexical";
import type { ProseGenerationMetadata } from "@/types/story";

type SerializedGeneratedProseNode = Spread<{
    type: "generated-prose";
    version: 1;
    generation: ProseGenerationMetadata;
    disabled?: boolean;
}, SerializedElementNode>;

export class GeneratedProseNode extends ElementNode {
    __generation: ProseGenerationMetadata;
    __disabled: boolean;

    constructor(generation: ProseGenerationMetadata, disabled = false, key?: NodeKey) {
        super(key);
        this.__generation = generation;
        this.__disabled = disabled;
    }

    static getType(): string { return "generated-prose"; }

    static clone(node: GeneratedProseNode): GeneratedProseNode {
        return new GeneratedProseNode(node.__generation, node.__disabled, node.__key);
    }

    static importJSON(node: SerializedGeneratedProseNode): GeneratedProseNode {
        return $createGeneratedProseNode(node.generation, node.disabled).updateFromJSON(node);
    }

    exportJSON(): SerializedGeneratedProseNode {
        return { ...super.exportJSON(), type: "generated-prose", version: 1, generation: this.getGeneration(), disabled: this.isDisabled() };
    }

    getGeneration(): ProseGenerationMetadata { return this.getLatest().__generation; }
    isDisabled(): boolean { return this.getLatest().__disabled; }
    setDisabled(disabled: boolean): void { this.getWritable().__disabled = disabled; }

    createDOM(_config: EditorConfig): HTMLElement {
        const wrapper = document.createElement("div");
        wrapper.className = "sn-generated-prose";
        wrapper.dataset.generatedProseKey = this.getKey();
        const header = document.createElement("div");
        header.className = "sn-generated-prose-header";
        header.contentEditable = "false";
        const generation = this.getGeneration();
        const label = document.createElement("button");
        label.type = "button";
        label.className = "sn-generated-prose-label";
        label.dataset.proseAction = "select";
        label.textContent = `${generation.model?.name || "Unknown model"} · ${generation.promptName}`;
        label.setAttribute("aria-label", `Select generated prose: ${label.textContent}`);
        label.title = "Select this prose block";
        const details = document.createElement("button");
        details.type = "button";
        details.className = "sn-generated-prose-details";
        details.dataset.proseAction = "details";
        details.textContent = "Details";
        details.setAttribute("aria-label", "Generation details");
        const copyText = document.createElement("button");
        copyText.type = "button";
        copyText.className = "sn-generated-prose-details";
        copyText.dataset.proseAction = "copy-text";
        copyText.textContent = "Copy text";
        copyText.title = "Copy only this block's prose to the clipboard";
        const removeLabel = document.createElement("button");
        removeLabel.type = "button";
        removeLabel.className = "sn-generated-prose-details";
        removeLabel.dataset.proseAction = "remove-label";
        removeLabel.textContent = "Remove label";
        removeLabel.title = "Convert this block to ordinary prose, keeping its text and formatting";
        const actions = document.createElement("div");
        actions.className = "sn-generated-prose-actions";
        const status = document.createElement("span");
        status.className = "sn-generated-prose-status";
        status.textContent = "Disabled";
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "sn-generated-prose-details";
        toggle.dataset.proseAction = "toggle-disabled";
        actions.append(status, copyText, details, removeLabel, toggle);
        header.append(label, actions);
        const content = document.createElement("div");
        content.className = "sn-generated-prose-content";
        wrapper.append(header, content);
        updateDisabledDOM(wrapper, this.isDisabled());
        return wrapper;
    }

    getDOMSlot(element: HTMLElement): ElementDOMSlot<HTMLElement> {
        return super.getDOMSlot(element).withElement(element.lastElementChild as HTMLElement);
    }

    updateDOM(_previous: GeneratedProseNode, dom: HTMLElement): boolean {
        updateDisabledDOM(dom, this.isDisabled());
        return false;
    }

    exportDOM() { return { element: document.createElement("div") }; }

    canBeEmpty(): boolean { return false; }
    canIndent(): boolean { return false; }
    // Text selections and clipboard exports retain the editable children.
    extractWithChild(): boolean { return true; }
}

export function $createGeneratedProseNode(generation: ProseGenerationMetadata, disabled = false): GeneratedProseNode {
    return $applyNodeReplacement(new GeneratedProseNode(structuredClone(generation), disabled));
}

function updateDisabledDOM(dom: HTMLElement, disabled: boolean): void {
    dom.classList.toggle("sn-generated-prose-disabled", disabled);
    const toggle = dom.querySelector<HTMLButtonElement>('[data-prose-action="toggle-disabled"]');
    if (toggle) {
        toggle.textContent = disabled ? "Enable block" : "Disable block";
        toggle.title = disabled ? "Include this block in exports and AI context" : "Exclude this block from exports and AI context";
    }
    const status = dom.querySelector<HTMLElement>(".sn-generated-prose-status");
    if (status) status.hidden = !disabled;
    const content = dom.querySelector<HTMLElement>(".sn-generated-prose-content");
    if (content) content.contentEditable = disabled ? "false" : "inherit";
    const remove = dom.querySelector<HTMLButtonElement>('[data-prose-action="remove-label"]');
    if (remove) {
        remove.disabled = disabled;
        remove.title = disabled ? "Enable this block before removing its label" : "Convert this block to ordinary prose, keeping its text and formatting";
    }
}

export function $isGeneratedProseNode(node: LexicalNode | null | undefined): node is GeneratedProseNode {
    return node instanceof GeneratedProseNode;
}

export function $createAcceptedProse(text: string, generation?: ProseGenerationMetadata): LexicalNode {
    if (!generation) return $createParagraphNode().append($createTextNode(text));
    const block = $createGeneratedProseNode(generation);
    for (const paragraph of text.trim().split(/\n\s*\n/)) {
        block.append($createParagraphNode().append($createTextNode(paragraph.replace(/\s*\r?\n\s*/g, " "))));
    }
    return block;
}
