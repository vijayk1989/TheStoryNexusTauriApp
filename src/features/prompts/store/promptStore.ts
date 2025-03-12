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
    clonePrompt: (id: string) => Promise<void>;

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

            // Check for duplicate name
            const existingPrompt = await db.prompts.where('name').equals(promptData.name).first();
            if (existingPrompt) {
                throw new Error('A prompt with this name already exists');
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
            set({ error: null }); // Don't set error in the store
            throw error; // Just throw the error to be handled by the form
        }
    },

    updatePrompt: async (id, promptData) => {
        try {
            if (promptData.messages && !get().validatePromptData(promptData.messages)) {
                throw new Error('Invalid prompt data structure');
            }

            // If name is being updated, check for duplicates
            if (promptData.name) {
                const existingPrompt = await db.prompts
                    .where('name')
                    .equals(promptData.name)
                    .and(item => item.id !== id)
                    .first();

                if (existingPrompt) {
                    throw new Error('A prompt with this name already exists');
                }
            }

            await db.prompts.update(id, promptData);
            const prompts = await db.prompts.toArray();
            set({ prompts, error: null });
        } catch (error) {
            set({ error: null }); // Don't set error in the store
            throw error; // Just throw the error to be handled by the form
        }
    },

    deletePrompt: async (id) => {
        try {
            const prompt = await db.prompts.get(id);
            if (!prompt) {
                throw new Error('Prompt not found');
            }

            if (prompt.isSystem) {
                throw new Error('System prompts cannot be deleted');
            }

            await db.prompts.delete(id);
            const prompts = await db.prompts.toArray();
            set({ prompts, error: null });
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    clonePrompt: async (id) => {
        try {
            const originalPrompt = await db.prompts.get(id);
            if (!originalPrompt) {
                throw new Error('Prompt not found');
            }

            const newId = crypto.randomUUID();
            const clonedPrompt: Prompt = {
                ...originalPrompt,
                id: newId,
                name: `${originalPrompt.name} (Copy)`,
                createdAt: new Date(),
                isSystem: false // Always set to false for cloned prompts
            };

            await db.prompts.add(clonedPrompt);
            const prompts = await db.prompts.toArray();
            set({ prompts, error: null });
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    }
}));
