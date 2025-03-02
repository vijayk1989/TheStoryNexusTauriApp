import type {
    DOMConversionMap,
    DOMConversionOutput,
    DOMExportOutput,
    EditorConfig,
    ElementFormatType,
    LexicalEditor,
    LexicalNode,
    NodeKey,
    SerializedLexicalNode,
    Spread,
} from 'lexical';

import { $createParagraphNode, $createTextNode, $getNodeByKey, $getRoot, DecoratorNode } from 'lexical';
import { Suspense, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

export type SerializedHelloWorldNode = Spread<
    {
        type: 'helloworld';
        version: 1;
    },
    SerializedLexicalNode
>;

function HelloWorldComponent({ nodeKey }: { nodeKey: NodeKey }): JSX.Element {
    const [editor] = useLexicalComposerContext();
    const [collapsed, setCollapsed] = useState(false);
    const [command, setCommand] = useState('');
    const [streamedText, setStreamedText] = useState('');
    const [streamComplete, setStreamComplete] = useState(false);
    const [streaming, setStreaming] = useState(false);

    const handleGenerateProse = () => {
        setStreamedText('');
        setStreamComplete(false);
        setStreaming(true);

        // Dummy story for demonstration
        const dummyStory = "Once upon a time, in a magical land filled with wonder and mystery.";

        let index = 0;
        const intervalId = setInterval(() => {
            index++;
            setStreamedText(dummyStory.slice(0, index));
            if (index >= dummyStory.length) {
                clearInterval(intervalId);
                setStreaming(false);
                setStreamComplete(true);
            }
        }, 50);
    };

    const handleAccept = () => {
        editor.update(() => {
            const paragraphNode = $createParagraphNode();
            paragraphNode.append($createTextNode(streamedText));
            const currentNode = $getNodeByKey(nodeKey);
            if (currentNode) {
                currentNode.insertAfter(paragraphNode);
            }
        });
        setStreamedText('');
        setStreamComplete(false);
    };

    const handleReject = () => {
        setStreamedText('');
        setStreamComplete(false);
    };

    return (
        <div className="helloworld-node">
            <div className="flex items-center justify-between mb-4">
                <span className="text-foreground font-medium">AI Assistant</span>
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-1 hover:bg-accent rounded"
                >
                    {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
            </div>

            {!collapsed && (
                <>
                    <div className="input-container">
                        <input
                            type="text"
                            value={command}
                            onChange={(e) => setCommand(e.target.value)}
                            className="w-full bg-transparent outline-none"
                            placeholder="Enter your prompt..."
                        />
                    </div>
                    <button
                        onClick={handleGenerateProse}
                        disabled={streaming}
                        className="mt-4"
                    >
                        Generate
                    </button>

                    {streamedText && (
                        <div className="generated-text">
                            {streamedText}
                        </div>
                    )}

                    {streamComplete && (
                        <div className="action-buttons">
                            <button
                                onClick={handleAccept}
                                className="accept"
                            >
                                Accept
                            </button>
                            <button
                                onClick={handleReject}
                                className="reject"
                            >
                                Reject
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export class HelloWorldNode extends DecoratorNode<JSX.Element> {
    static getType(): string {
        return 'helloworld';
    }

    static clone(node: HelloWorldNode): HelloWorldNode {
        return new HelloWorldNode(node.__key);
    }

    static importJSON(serializedNode: SerializedHelloWorldNode): HelloWorldNode {
        return $createHelloWorldNode();
    }

    exportJSON(): SerializedHelloWorldNode {
        return {
            type: 'helloworld',
            version: 1,
        };
    }

    constructor(key?: NodeKey) {
        super(key);
    }

    createDOM(): HTMLElement {
        const div = document.createElement('div');
        div.className = 'helloworld-node';
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
                <HelloWorldComponent nodeKey={this.__key} />
            </Suspense>
        );
    }
}

export function $createHelloWorldNode(): HelloWorldNode {
    return new HelloWorldNode();
}

export function $isHelloWorldNode(
    node: LexicalNode | null | undefined,
): node is HelloWorldNode {
    return node instanceof HelloWorldNode;
} 