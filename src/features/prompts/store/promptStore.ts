import { create } from 'zustand';
import { attemptPromise } from '@jfdi/attempt';
import { db } from '@/services/database';
import { formatError } from '@/utils/errorUtils';
import { ERROR_MESSAGES } from '@/constants/errorMessages';
import { generatePromptId } from '@/utils/idGenerator';
import { logger } from '@/utils/logger';
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

    // Export/Import
    exportPrompts: () => Promise<void>;
    importPrompts: (jsonData: string) => Promise<void>;

    // Helpers
    validatePromptData: (messages: PromptMessage[]) => boolean;
    findUniqueName: (baseName: string) => Promise<string>;
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

        const [error, prompts] = await attemptPromise(() => db.prompts.toArray());

        if (error) {
            set({ error: formatError(error, ERROR_MESSAGES.FETCH_FAILED('prompts')), isLoading: false });
            return;
        }

        set({ prompts, error: null, isLoading: false });
    },

    createPrompt: async (promptData) => {
        if (!get().validatePromptData(promptData.messages)) {
            throw new Error('Invalid prompt data structure');
        }

        // Check for duplicate name
        const [checkError, existingPrompt] = await attemptPromise(() =>
            db.prompts.where('name').equals(promptData.name).first()
        );

        if (checkError) {
            throw checkError;
        }

        if (existingPrompt) {
            throw new Error('A prompt with this name already exists');
        }

        const prompt: Prompt = {
            ...promptData,
            id: generatePromptId(),
            createdAt: new Date(),
            temperature: promptData.temperature || 1.0,
            maxTokens: promptData.maxTokens || 4096,
            top_p: promptData.top_p !== undefined ? promptData.top_p : 1.0,
            top_k: promptData.top_k !== undefined ? promptData.top_k : 50,
            repetition_penalty: promptData.repetition_penalty !== undefined ? promptData.repetition_penalty : 1.0,
            min_p: promptData.min_p !== undefined ? promptData.min_p : 0.0
        };

        const [addError] = await attemptPromise(() => db.prompts.add(prompt));

        if (addError) {
            throw addError;
        }

        const [fetchError, prompts] = await attemptPromise(() => db.prompts.toArray());

        if (fetchError) {
            logger.error(formatError(fetchError, ERROR_MESSAGES.FETCH_FAILED('prompts')), fetchError);
        } else {
            set({ prompts, error: null });
        }
    },

    updatePrompt: async (id, promptData) => {
        if (promptData.messages && !get().validatePromptData(promptData.messages)) {
            throw new Error('Invalid prompt data structure');
        }

        // If name is being updated, check for duplicates
        if (promptData.name) {
            const [checkError, existingPrompt] = await attemptPromise(() =>
                db.prompts
                    .where('name')
                    .equals(promptData.name || '')
                    .and(item => item.id !== id)
                    .first()
            );

            if (checkError) {
                throw checkError;
            }

            if (existingPrompt) {
                throw new Error('A prompt with this name already exists');
            }
        }

        const [updateError] = await attemptPromise(() => db.prompts.update(id, promptData));

        if (updateError) {
            throw updateError;
        }

        const [fetchError, prompts] = await attemptPromise(() => db.prompts.toArray());

        if (fetchError) {
            logger.error(formatError(fetchError, ERROR_MESSAGES.FETCH_FAILED('prompts')), fetchError);
        } else {
            set({ prompts, error: null });
        }
    },

    deletePrompt: async (id) => {
        const [fetchError, prompt] = await attemptPromise(() => db.prompts.get(id));

        if (fetchError || !prompt) {
            const message = formatError(fetchError || new Error('Prompt not found'), ERROR_MESSAGES.NOT_FOUND('prompt'));
            set({ error: message });
            throw fetchError || new Error('Prompt not found');
        }

        if (prompt.isSystem) {
            const message = 'System prompts cannot be deleted';
            set({ error: message });
            throw new Error(message);
        }

        const [deleteError] = await attemptPromise(() => db.prompts.delete(id));

        if (deleteError) {
            const message = formatError(deleteError, ERROR_MESSAGES.DELETE_FAILED('prompt'));
            set({ error: message });
            throw deleteError;
        }

        const [refetchError, prompts] = await attemptPromise(() => db.prompts.toArray());

        if (refetchError) {
            logger.error(formatError(refetchError, ERROR_MESSAGES.FETCH_FAILED('prompts')), refetchError);
        } else {
            set({ prompts, error: null });
        }
    },

    clonePrompt: async (id) => {
        const [fetchError, originalPrompt] = await attemptPromise(() => db.prompts.get(id));

        if (fetchError || !originalPrompt) {
            const message = formatError(fetchError || new Error('Prompt not found'), ERROR_MESSAGES.NOT_FOUND('prompt'));
            set({ error: message });
            throw fetchError || new Error('Prompt not found');
        }

        const clonedPrompt: Prompt = {
            ...originalPrompt,
            id: generatePromptId(),
            name: `${originalPrompt.name} (Copy)`,
            createdAt: new Date(),
            isSystem: false // Always set to false for cloned prompts
        };

        const [addError] = await attemptPromise(() => db.prompts.add(clonedPrompt));

        if (addError) {
            const message = formatError(addError, ERROR_MESSAGES.CREATE_FAILED('cloned prompt'));
            set({ error: message });
            throw addError;
        }

        const [refetchError, prompts] = await attemptPromise(() => db.prompts.toArray());

        if (refetchError) {
            logger.error(formatError(refetchError, ERROR_MESSAGES.FETCH_FAILED('prompts')), refetchError);
        } else {
            set({ prompts, error: null });
        }
    }

    ,

    // Export all prompts as JSON and trigger download
    exportPrompts: async () => {
        const [error, allPrompts] = await attemptPromise(() => db.prompts.toArray());

        if (error) {
            const message = formatError(error, ERROR_MESSAGES.FETCH_FAILED('prompts'));
            set({ error: message });
            throw error;
        }

        // Only export non-system prompts
        const prompts = allPrompts.filter(p => !p.isSystem);

        const dataStr = JSON.stringify({
            version: '1.0',
            type: 'prompts',
            prompts
        }, null, 2);

        const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
        const exportName = `prompts-export-${new Date().toISOString().slice(0, 10)}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportName);
        linkElement.click();
    },

    // Import prompts from JSON string. Creates new IDs and createdAt. Ensures unique names.
    importPrompts: async (jsonData) => {
        const data = JSON.parse(jsonData);

        if (!data.type || data.type !== 'prompts' || !Array.isArray(data.prompts)) {
            throw new Error('Invalid prompts data format');
        }

        const imported: Prompt[] = data.prompts;

        for (const p of imported) {
            // Minimal validation of messages
            if (!p.messages || !Array.isArray(p.messages) || !get().validatePromptData(p.messages)) {
                // Skip invalid prompt
                logger.warn('Skipping invalid prompt during import (messages invalid)', { name: p.name });
                continue;
            }

            // Ensure unique name - check DB for existing name and append suffix if needed
            const newName = await get().findUniqueName(p.name || 'Imported Prompt');

            const newPrompt: Prompt = {
                ...p,
                id: generatePromptId(),
                name: newName,
                createdAt: new Date(),
                // Ensure imported prompts are not treated as system prompts
                isSystem: false
            };

            // Add to DB
            const [addError] = await attemptPromise(() => db.prompts.add(newPrompt));

            if (addError) {
                logger.error(`Failed to import prompt "${newName}"`, addError);
                // Continue with other prompts instead of failing entire import
            }
        }

        const [fetchError, prompts] = await attemptPromise(() => db.prompts.toArray());

        if (fetchError) {
            const message = formatError(fetchError, ERROR_MESSAGES.FETCH_FAILED('prompts'));
            set({ error: message });
            throw fetchError;
        }

        set({ prompts, error: null });
    },

    // Helper to find a unique name by appending (Imported) or (Imported N) suffix
    findUniqueName: async (baseName: string): Promise<string> => {
        const MAX_IMPORT_ATTEMPTS = 100;

        const generateCandidateName = (attempt: number): string => {
            if (attempt === 0) return baseName;
            return `${baseName} (Imported${attempt > 1 ? ` ${attempt}` : ''})`;
        };

        const attempts = Array.from({ length: MAX_IMPORT_ATTEMPTS }, (_, i) => i);

        for (const attempt of attempts) {
            const candidateName = generateCandidateName(attempt);

            const [checkError, existing] = await attemptPromise(() =>
                db.prompts.where('name').equals(candidateName).first()
            );

            if (checkError) {
                logger.error('Error checking for existing prompt', checkError);
                throw checkError;
            }

            if (!existing) {
                return candidateName;
            }

            if (attempt === MAX_IMPORT_ATTEMPTS - 1) {
                throw new Error(`Failed to generate unique name after ${MAX_IMPORT_ATTEMPTS} attempts`);
            }
        }

        throw new Error('Failed to generate unique name');
    }
}));
