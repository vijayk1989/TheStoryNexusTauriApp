import { useCallback, useEffect, useState } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { debounce } from "lodash";
import { CLEAR_HISTORY_COMMAND } from "lexical";

import { useChapterStore } from "@/features/chapters/stores/useChapterStore";
import { useEditorSaveStatusStore } from "@/features/editor/stores/useEditorSaveStatusStore";
import { saveLastEditorTarget } from "@/features/editor/utils/lastEditorTarget";
import { useSceneBeatStore } from "@/features/scenebeats/stores/useSceneBeatStore";
import { useStoryContext } from "@/features/stories/context/StoryContext";

import { SCENE_BEAT_SNAPSHOT_TAG } from "../nodes/SceneBeatNode";
import { normalizeMainLexicalEditorState } from "../serialization/emptyEditorState";

export const MAIN_EDITOR_CHAPTER_LOAD_TAG = "main-editor-chapter-load";
const HISTORY_MERGE_TAG = "history-merge";

export function ChapterContentPlugin() {
    const [editor] = useLexicalComposerContext();
    const { currentStoryId, currentChapterId } = useStoryContext();
    const { currentChapter, getChapter, updateChapter } = useChapterStore();
    const fetchSceneBeatsByChapter = useSceneBeatStore((state) => state.fetchSceneBeatsByChapter);
    const clearSceneBeats = useSceneBeatStore((state) => state.clearSceneBeats);
    const { setStatus, markSaved } = useEditorSaveStatusStore();
    const [hasLoaded, setHasLoaded] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        if (!currentChapterId) {
            setHasLoaded(false);
            setLoadError(null);
            return;
        }

        getChapter(currentChapterId);
        fetchSceneBeatsByChapter(currentChapterId).catch((error) => {
            console.error("MainLexicalEditor - Failed to preload scene beats:", error);
        });
        setHasLoaded(false);
        setLoadError(null);
    }, [currentChapterId, fetchSceneBeatsByChapter, getChapter]);

    useEffect(() => {
        if (!currentChapterId) {
            clearSceneBeats();
        }
    }, [clearSceneBeats, currentChapterId]);

    useEffect(() => {
        if (!currentChapterId || hasLoaded || currentChapter?.id !== currentChapterId) {
            return;
        }

        let cancelled = false;
        const schedule = typeof queueMicrotask === "function"
            ? queueMicrotask
            : (callback: () => void) => window.setTimeout(callback, 0);

        schedule(() => {
            if (cancelled) return;

            try {
                const parsedState = editor.parseEditorState(
                    normalizeMainLexicalEditorState(currentChapter.content)
                );
                editor.setEditorState(parsedState, { tag: HISTORY_MERGE_TAG });
                editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
                setLoadError(null);
            } catch (error) {
                console.error("MainLexicalEditor - Failed to load chapter content:", error);
                const emptyState = editor.parseEditorState(normalizeMainLexicalEditorState());
                editor.setEditorState(emptyState, { tag: HISTORY_MERGE_TAG });
                editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
                setLoadError("This chapter used editor data the clean editor cannot read yet, so it opened as an empty draft.");
            } finally {
                setHasLoaded(true);
                setStatus("saved");
            }
        });

        return () => {
            cancelled = true;
        };
    }, [currentChapter, currentChapterId, editor, hasLoaded, setStatus]);

    const saveContent = useCallback(
        debounce((chapterId: string, storyId: string | null, content: string) => {
            setStatus("saving");
            updateChapter(chapterId, { content })
                .then(() => {
                    if (storyId) {
                        saveLastEditorTarget({ storyId, chapterId });
                    }
                    markSaved();
                })
                .catch((error) => {
                    console.error("MainLexicalEditor - Failed to save chapter content:", error);
                    setStatus("error");
                });
        }, 1000),
        [markSaved, setStatus, updateChapter]
    );

    useEffect(() => {
        if (!currentChapterId) return;

        setStatus("saved");

        const removeUpdateListener = editor.registerUpdateListener(({
            editorState,
            dirtyElements,
            dirtyLeaves,
            tags,
        }) => {
            if (tags.has(MAIN_EDITOR_CHAPTER_LOAD_TAG) || tags.has(HISTORY_MERGE_TAG)) {
                setStatus("saved");
                return;
            }

            const isSceneBeatSnapshotUpdate = tags.has(SCENE_BEAT_SNAPSHOT_TAG);

            if (!isSceneBeatSnapshotUpdate && dirtyElements.size === 0 && dirtyLeaves.size === 0) {
                return;
            }

            setStatus("pending");
            saveContent(currentChapterId, currentStoryId, JSON.stringify(editorState.toJSON()));
        });

        return () => {
            removeUpdateListener();
            saveContent.flush();
        };
    }, [currentChapterId, currentStoryId, editor, saveContent, setStatus]);

    if (!loadError) return null;

    return (
        <div className="sn-main-editor-recovery" role="status">
            {loadError}
        </div>
    );
}
