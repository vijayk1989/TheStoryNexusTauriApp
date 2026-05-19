import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { ChevronDown, ChevronUp, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useSBStore } from "@/features/scenebeats/stores/useSceneBeatInstanceStore";

export function SceneBeatCommandEditor() {
  const command = useSBStore((s) => s.command);
  const collapsed = useSBStore((s) => s.collapsed);
  const isLoaded = useSBStore((s) => s.isLoaded);
  const set = useSBStore((s) => s.set);

  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCommandChange = (newCommand: string) => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      set({ command: newCommand });
      return;
    }

    if (newCommand !== command) {
      const newHistory = commandHistory.slice(0, historyIndex + 1);
      if (newHistory[newHistory.length - 1] !== newCommand) {
        const updated = [...newHistory, newCommand];
        setCommandHistory(updated);
        setHistoryIndex(updated.length - 1);
      }
      set({ command: newCommand });
    }
  };

  const stt = useSpeechToText({
    onTranscript: (text, isFinal) => {
      if (!isFinal) return;
      const trimmed = text.trim();
      if (!trimmed) return;

      const separator = command && !command.endsWith(" ") ? " " : "";
      handleCommandChange(command + separator + trimmed);
    },
  });

  useEffect(() => {
    if (isLoaded && command && commandHistory.length === 0) {
      setCommandHistory([command]);
      setHistoryIndex(0);
    }
  }, [isLoaded, command, commandHistory.length]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || collapsed) return;

    try {
      textarea.style.height = "auto";
      const contentHeight = textarea.scrollHeight;
      const newHeight = Math.min(Math.max(contentHeight, 80), 400);
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = contentHeight > 400 ? "auto" : "hidden";
    } catch {
      // Best-effort resize only.
    }
  }, [command, collapsed]);

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    isUndoRedoAction.current = true;
    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    set({ command: commandHistory[nextIndex] });
  };

  const handleRedo = () => {
    if (historyIndex >= commandHistory.length - 1) return;
    isUndoRedoAction.current = true;
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    set({ command: commandHistory[nextIndex] });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.ctrlKey && event.key === "z" && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      handleUndo();
      return;
    }

    if ((event.ctrlKey && event.shiftKey && event.key === "z") || (event.ctrlKey && event.key === "y")) {
      event.preventDefault();
      event.stopPropagation();
      handleRedo();
      return;
    }

    if (event.ctrlKey && event.key === "a") {
      event.stopPropagation();
    }
  };

  return (
    <div className="p-3 md:p-4">
      <Textarea
        ref={textareaRef}
        value={command}
        onChange={(event) => handleCommandChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe the scene beat..."
        className="min-h-[80px] md:min-h-[100px] resize-none text-sm md:text-base"
        data-testid="scene-beat-command"
      />
      <div className="flex items-center justify-between mt-1">
        <div className="flex-1 min-w-0">
          {stt.isListening && stt.interimTranscript && (
            <span className="text-xs text-muted-foreground italic truncate block">
              {stt.interimTranscript}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {stt.isSupported && (
            <Button
              variant="ghost"
              size="icon"
              onClick={stt.toggle}
              className={cn("h-6 w-6", stt.isListening && "text-red-500")}
              title={stt.isListening ? "Stop dictation" : "Start dictation"}
            >
              <Mic className={cn("h-3 w-3", stt.isListening && "animate-pulse")} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="h-6 w-6"
            title="Undo (Ctrl+Z)"
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRedo}
            disabled={historyIndex >= commandHistory.length - 1}
            className="h-6 w-6"
            title="Redo (Ctrl+Shift+Z)"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
