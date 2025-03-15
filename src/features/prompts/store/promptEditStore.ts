import { create } from 'zustand';
import { PromptMessage } from '@/types/story';

// THIS IS CURRENTLY NOT USED

interface PromptEditState {
    isOpen: boolean;
    originalMessages: PromptMessage[] | null;
    editedMessages: PromptMessage[] | null;
    isLoading: boolean;
    error: string | null;
    promptId: string | null;

    // Actions
    openDrawer: (messages: PromptMessage[], promptId: string) => void;
    closeDrawer: () => void;
    updateEditedMessages: (messages: PromptMessage[]) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    reset: () => void;
    getEditedMessages: () => PromptMessage[] | null;
    getPromptId: () => string | null;
}

export const usePromptEditStore = create<PromptEditState>((set, get) => ({
    isOpen: false,
    originalMessages: null,
    editedMessages: null,
    isLoading: false,
    error: null,
    promptId: null,

    openDrawer: (messages, promptId) => set({
        isOpen: true,
        originalMessages: messages,
        editedMessages: JSON.parse(JSON.stringify(messages)), // Deep copy
        promptId
    }),

    closeDrawer: () => set({ isOpen: false }),

    updateEditedMessages: (messages) => set({ editedMessages: messages }),

    setLoading: (isLoading) => set({ isLoading }),

    setError: (error) => set({ error }),

    reset: () => set({
        isOpen: false,
        originalMessages: null,
        editedMessages: null,
        isLoading: false,
        error: null,
        promptId: null
    }),

    getEditedMessages: () => get().editedMessages,

    getPromptId: () => get().promptId
})); 