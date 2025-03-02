import { create } from 'zustand';
import { db } from '@/services/database';
import type { Prompt, PromptMessage } from '@/types/story';

interface PromptStore {
    prompts: Prompt[];
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchPrompts: () => Promise<void>;
    createPrompt: (prompt: Omit<Prompt, 'id' | 'createdAt'>) => Promise<void>;
    updatePrompt: (id: string, prompt: Partial<Prompt>) => Promise<void>;
    deletePrompt: (id: string) => Promise<void>;

    // Helpers
    validatePromptData: (messages: PromptMessage[]) => boolean;
}

export const usePromptStore = create<PromptStore>((set, get) => ({
    prompts: [],
    isLoading: false,
    error: null,

    validatePromptData: (messages) => {
        return messages.every(msg =>
            typeof msg === 'object' &&
            ('role' in msg) &&
            ('content' in msg) &&
            ['system', 'user', 'assistant'].includes(msg.role) &&
            typeof msg.content === 'string'
        );
    },

    fetchPrompts: async () => {
        set({ isLoading: true });
        try {
            const prompts = await db.prompts.toArray();
            set({ prompts, error: null });
        } catch (error) {
            set({ error: (error as Error).message });
        } finally {
            set({ isLoading: false });
        }
    },

    createPrompt: async (promptData) => {
        try {
            if (!get().validatePromptData(promptData.messages)) {
                throw new Error('Invalid prompt data structure');
            }

            const id = crypto.randomUUID();
            const prompt: Prompt = {
                ...promptData,
                id,
                createdAt: new Date(),
                temperature: promptData.temperature || 1.0,
                maxTokens: promptData.maxTokens || 2048
            };

            await db.prompts.add(prompt);
            const prompts = await db.prompts.toArray();
            set({ prompts, error: null });
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    updatePrompt: async (id, promptData) => {
        try {
            if (promptData.messages && !get().validatePromptData(promptData.messages)) {
                throw new Error('Invalid prompt data structure');
            }

            await db.prompts.update(id, promptData);
            const prompts = await db.prompts.toArray();
            set({ prompts, error: null });
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    deletePrompt: async (id) => {
        try {
            await db.prompts.delete(id);
            const prompts = await db.prompts.toArray();
            set({ prompts, error: null });
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    }
}));
