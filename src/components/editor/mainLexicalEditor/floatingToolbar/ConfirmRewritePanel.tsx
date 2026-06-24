/**
 * ConfirmRewritePanel — shows original vs. rewritten text with accept/reject.
 */

import type { JSX } from "react";

import { Check, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ConfirmRewritePanelProps {
    originalText: string;
    rewrittenText: string;
    onAccept: () => void;
    onReject: () => void;
}

export function ConfirmRewritePanel({
    originalText,
    rewrittenText,
    onAccept,
    onReject,
}: ConfirmRewritePanelProps): JSX.Element {
    return (
        <div className="sn-floating-confirm">
            <span className="text-sm font-medium block mb-3">Text Rewritten</span>

            <div className="space-y-2 mb-3">
                <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Original:</span>
                    <div className="px-2 py-1.5 mt-1 bg-muted rounded border opacity-60 max-h-[100px] overflow-y-auto whitespace-pre-wrap">
                        "{originalText}"
                    </div>
                </div>
                <div className="text-xs">
                    <span className="font-medium text-green-500">New:</span>
                    <div className="px-2 py-1.5 mt-1 bg-green-500/10 rounded border border-green-500/30 max-h-[150px] overflow-y-auto whitespace-pre-wrap">
                        "{rewrittenText}"
                    </div>
                </div>
            </div>

            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onReject}
                    className="flex-1 flex items-center justify-center gap-1"
                >
                    <RotateCcw className="h-3 w-3" />
                    <span>Undo</span>
                </Button>
                <Button
                    variant="default"
                    size="sm"
                    onClick={onAccept}
                    className="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700"
                >
                    <Check className="h-3 w-3" />
                    <span>Keep</span>
                </Button>
            </div>
        </div>
    );
}
