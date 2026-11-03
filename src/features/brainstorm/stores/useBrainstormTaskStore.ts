import { create } from 'zustand';
import type { AgentResult, ChatMessage } from '@/types/story';

export type BrainstormTaskStatus = 'running' | 'completed' | 'stopped' | 'failed';
export type BrainstormTaskMode = 'submission' | 'regeneration' | 'pipeline';

export interface BrainstormTask {
    id: string;
    chatId: string;
    status: BrainstormTaskStatus;
    mode: BrainstormTaskMode;
    messageId: string;
    messages: ChatMessage[];
    error?: string;
    unsaved?: boolean;
    currentStep: number;
    currentAgentName: string;
    stepResults: AgentResult[];
    stopRequested: boolean;
    cancel: () => void;
}

interface BrainstormTasks {
    tasks: Record<string, BrainstormTask>;
    register: (task: BrainstormTask) => boolean;
    update: (chatId: string, taskId: string, patch: Partial<BrainstormTask>) => void;
    stop: (chatId: string) => void;
    remove: (chatId: string) => void;
}

export const useBrainstormTaskStore = create<BrainstormTasks>((set, get) => ({
    tasks: {},
    register: (task) => {
        if (get().tasks[task.chatId]?.status === 'running') return false;
        set(state => ({ tasks: { ...state.tasks, [task.chatId]: task } }));
        return true;
    },
    update: (chatId, taskId, patch) => {
        set(state => {
            const task = state.tasks[chatId];
            if (task?.id !== taskId) return state;
            return { tasks: { ...state.tasks, [chatId]: { ...task, ...patch } } };
        });
    },
    stop: (chatId) => {
        const task = get().tasks[chatId];
        if (task?.status !== 'running') return;
        get().update(chatId, task.id, { stopRequested: true });
        task.cancel();
    },
    remove: (chatId) => {
        get().stop(chatId);
        set(state => {
            const tasks = { ...state.tasks };
            delete tasks[chatId];
            return { tasks };
        });
    },
}));
