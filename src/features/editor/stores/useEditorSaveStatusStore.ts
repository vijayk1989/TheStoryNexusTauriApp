import { create } from "zustand";

export type EditorSaveStatus = "saved" | "pending" | "saving" | "error";

interface EditorSaveStatusState {
    status: EditorSaveStatus;
    lastSavedAt: Date | null;
    setStatus: (status: EditorSaveStatus) => void;
    markSaved: () => void;
}

export const useEditorSaveStatusStore = create<EditorSaveStatusState>((set) => ({
    status: "saved",
    lastSavedAt: null,
    setStatus: (status) => set({ status }),
    markSaved: () => set({ status: "saved", lastSavedAt: new Date() }),
}));
