import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useEditorPreferencesStore = create<{
    showGenerationLabels: boolean;
    toggleGenerationLabels: () => void;
}>()(persist((set) => ({
    showGenerationLabels: true,
    toggleGenerationLabels: () => set((state) => ({ showGenerationLabels: !state.showGenerationLabels })),
}), { name: "story-nexus-editor-preferences" }));
