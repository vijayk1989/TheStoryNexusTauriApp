import { useCallback, useEffect, useState, type ReactNode } from "react";

import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { useChapterStore } from "@/features/chapters/stores/useChapterStore";
import { useEditorSaveStatusStore, type EditorSaveStatus } from "@/features/editor/stores/useEditorSaveStatusStore";
import { useStoryContext } from "@/features/stories/context/StoryContext";
import { cn } from "@/lib/utils";

import { mainLexicalEditorConfig } from "./editorConfig";
import { FloatingToolbarPlugin } from "./floatingToolbar/FloatingToolbarPlugin";
import { AssetImageInsertPlugin } from "./plugins/AssetImageInsertPlugin";
import { ChapterContentPlugin } from "./plugins/ChapterContentPlugin";
import { LorebookHighlightPlugin } from "./plugins/LorebookHighlightPlugin";
import { SceneBeatShortcutPlugin } from "./plugins/SceneBeatShortcutPlugin";
import { SlashCommandPlugin } from "./plugins/SlashCommandPlugin";
import { EditorE2EBridge } from "./testing/EditorE2EBridge";
import { WordCountPlugin } from "./plugins/WordCountPlugin";
import { StoryToolbarPlugin } from "./toolbar/StoryToolbarPlugin";
import { SimpleWriteButton } from "./SimpleWriteButton";

type MainLexicalEditorProps = {
    maximizeButton?: ReactNode;
};

export function MainLexicalEditor({ maximizeButton }: MainLexicalEditorProps) {
    const { currentChapterId } = useStoryContext();
    const { currentChapter, getChapter } = useChapterStore();
    const { status } = useEditorSaveStatusStore();
    const [wordCount, setWordCount] = useState(0);
    const [isSimpleWriting, setIsSimpleWriting] = useState(false);
    const [floatingAnchorElem, setFloatingAnchorElem] = useState<HTMLElement | null>(null);

    const onScrollerRef = useCallback((elem: HTMLDivElement | null) => {
        if (elem !== null) {
            setFloatingAnchorElem(elem);
        }
    }, []);

    useEffect(() => {
        if (currentChapterId) {
            getChapter(currentChapterId);
        }
    }, [currentChapterId, getChapter]);

    if (!currentChapterId || !currentChapter) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">Select a chapter to start editing</p>
            </div>
        );
    }

    return (
        <LexicalComposer initialConfig={mainLexicalEditorConfig}>
            <div className="sn-main-editor-shell">
                <div className="sn-main-editor-header">
                    <div className="min-w-0 flex-1">
                        <div className="truncate font-heading text-lg font-semibold text-primary">
                            {currentChapter.title}
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <div className="sn-main-editor-header-word-count">
                            {wordCount} {wordCount === 1 ? "word" : "words"}
                        </div>
                        <SimpleWriteButton onStreamingChange={setIsSimpleWriting} />
                        <SaveStatusIndicator status={status} />
                        {maximizeButton}
                    </div>
                </div>

                <div className={cn("sn-main-editor", isSimpleWriting && "sn-main-editor-streaming")}>
                    <EditorInteractivityGuard disabled={isSimpleWriting} />
                    <StoryToolbarPlugin />
                    <ChapterContentPlugin />
                    <RichTextPlugin
                        contentEditable={
                            <div className="sn-main-editor-scroller" ref={onScrollerRef}>
                                <ContentEditable
                                    className="sn-main-editor-content-editable"
                                    aria-label="Chapter editor"
                                />
                            </div>
                        }
                        placeholder={
                            <div className="sn-main-editor-placeholder">
                                Begin writing this chapter...
                            </div>
                        }
                        ErrorBoundary={LexicalErrorBoundary}
                    />
                    <HistoryPlugin />
                    <ListPlugin />
                    <SceneBeatShortcutPlugin />
                    <AssetImageInsertPlugin />
                    <LorebookHighlightPlugin />
                    <SlashCommandPlugin />
                    <FloatingToolbarPlugin anchorElem={floatingAnchorElem} />
                    {import.meta.env.VITE_E2E === "true" ? <EditorE2EBridge /> : null}
                    <AutoFocusPlugin />
                    <WordCountPlugin onChange={setWordCount} />
                </div>
            </div>
        </LexicalComposer>
    );
}

function EditorInteractivityGuard({ disabled }: { disabled: boolean }) {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (!disabled) return;

        const wasEditable = editor.isEditable();
        editor.setEditable(false);

        return () => {
            editor.setEditable(wasEditable);
        };
    }, [disabled, editor]);

    return null;
}

function SaveStatusIndicator({ status }: { status: EditorSaveStatus }) {
    const isSaved = status === "saved";
    const isSaving = status === "saving";
    const isError = status === "error";
    const label = isSaved ? "Saved" : isSaving ? "Saving..." : isError ? "Save failed" : "Unsaved changes";

    return (
        <div className="flex items-center gap-1.5 text-xs">
            <div
                className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap",
                    isSaved && "text-emerald-400",
                    isSaving && "text-muted-foreground",
                    status === "pending" && "text-amber-400",
                    isError && "text-destructive"
                )}
            >
                {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isError ? (
                    <AlertCircle className="h-3.5 w-3.5" />
                ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>{label}</span>
            </div>
        </div>
    );
}
