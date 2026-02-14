import { create } from 'zustand';
import { db } from '@/services/database';
import type { Prompt, PromptMessage } from '@/types/story';
import { saveTextAsFile } from '@/utils/fileDownload';

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

    // Export/Import
    exportPrompts: () => Promise<boolean>;
    importPrompts: (jsonData: string) => Promise<void>;

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
                maxTokens: promptData.maxTokens || 4096,
                top_p: promptData.top_p !== undefined ? promptData.top_p : 1.0,
                top_k: promptData.top_k !== undefined ? promptData.top_k : 50,
                repetition_penalty: promptData.repetition_penalty !== undefined ? promptData.repetition_penalty : 1.0,
                min_p: promptData.min_p !== undefined ? promptData.min_p : 0.0
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

    ,

    // Export all prompts as JSON and trigger download
    exportPrompts: async () => {
        try {
            // Only export non-system prompts
            const allPrompts = await db.prompts.toArray();
            const prompts = allPrompts.filter(p => !p.isSystem);

            const dataStr = JSON.stringify({
                version: '1.0',
                type: 'prompts',
                prompts
            }, null, 2);

            const exportName = `prompts-export-${new Date().toISOString().slice(0, 10)}.json`;
            return await saveTextAsFile(dataStr, exportName, 'application/json');
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    // Import prompts from JSON string. Creates new IDs and createdAt. Ensures unique names.
    importPrompts: async (jsonData) => {
        try {
            const data = JSON.parse(jsonData);

            if (!data.type || data.type !== 'prompts' || !Array.isArray(data.prompts)) {
                throw new Error('Invalid prompts data format');
            }

            const imported: Prompt[] = data.prompts;

            for (const p of imported) {
                // Minimal validation of messages
                if (!p.messages || !Array.isArray(p.messages) || !get().validatePromptData(p.messages)) {
                    // Skip invalid prompt
                    console.warn('Skipping invalid prompt during import (messages invalid):', p.name);
                    continue;
                }

                // Ensure unique name - check DB for existing name and append suffix if needed
                let newName = p.name || 'Imported Prompt';
                let attempt = 0;
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    const existing = await db.prompts.where('name').equals(newName).first();
                    if (!existing) break;
                    attempt += 1;
                    newName = `${p.name} (Imported${attempt > 1 ? ` ${attempt}` : ''})`;
                }

                const newPrompt: Prompt = {
                    ...p,
                    id: crypto.randomUUID(),
                    name: newName,
                    createdAt: new Date(),
                    // Ensure imported prompts are not treated as system prompts
                    isSystem: false
                };

                // Add to DB
                await db.prompts.add(newPrompt);
            }

            const prompts = await db.prompts.toArray();
            set({ prompts, error: null });
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    }
}));
