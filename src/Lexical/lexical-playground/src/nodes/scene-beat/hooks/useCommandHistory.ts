import { useState, useRef, useEffect } from "react";

interface UseCommandHistoryResult {
  command: string;
  setCommand: (command: string) => void;
  handleCommandChange: (newCommand: string) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Custom hook to manage command text with undo/redo history.
 * Handles keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z) for undo/redo.
 *
 * @param initialCommand - Initial command text
 * @returns Command state and history management functions
 */
export const useCommandHistory = (
  initialCommand: string
): UseCommandHistoryResult => {
  const [command, setCommand] = useState(initialCommand);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);

  // Initialize history when command is first loaded
  useEffect(() => {
    if (initialCommand && commandHistory.length === 0) {
      setCommandHistory([initialCommand]);
      setHistoryIndex(0);
    }
  }, [initialCommand, commandHistory.length]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true;
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCommand(commandHistory[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < commandHistory.length - 1) {
      isUndoRedoAction.current = true;
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCommand(commandHistory[newIndex]);
    }
  };

  const handleCommandChange = (newCommand: string) => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      setCommand(newCommand);
      return;
    }

    // Only add to history if the command actually changed
    if (newCommand !== command) {
      // Truncate future history if we're not at the end
      const newHistory = commandHistory.slice(0, historyIndex + 1);

      // Add new command to history (but avoid consecutive duplicates)
      if (newHistory[newHistory.length - 1] !== newCommand) {
        const updatedHistory = [...newHistory, newCommand];
        setCommandHistory(updatedHistory);
        setHistoryIndex(updatedHistory.length - 1);
      }

      setCommand(newCommand);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Check for Ctrl+Z (Undo)
    if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
      e.preventDefault(); // Prevent default browser undo
      e.stopPropagation(); // Stop event from reaching Lexical editor
      handleUndo();
      return;
    }

    // Check for Ctrl+Shift+Z or Ctrl+Y (Redo)
    if (
      (e.ctrlKey && e.shiftKey && e.key === "z") ||
      (e.ctrlKey && e.key === "y")
    ) {
      e.preventDefault(); // Prevent default browser redo
      e.stopPropagation(); // Stop event from reaching Lexical editor
      handleRedo();
      return;
    }
  };

  return {
    command,
    setCommand,
    handleCommandChange,
    handleKeyDown,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < commandHistory.length - 1,
  };
};
