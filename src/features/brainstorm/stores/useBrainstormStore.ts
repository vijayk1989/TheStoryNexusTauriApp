import { create } from 'zustand';
import { attemptPromise } from '@jfdi/attempt';
import { db } from '@/services/database';
import { formatError } from '@/utils/errorUtils';
import { ERROR_MESSAGES } from '@/constants/errorMessages';
import { generateChatId } from '@/utils/idGenerator';
import type { AIChat, ChatMessage } from '@/types/story';

interface BrainstormState {
    chats: AIChat[];
    selectedChat: AIChat | null;
    isLoading: boolean;
    error: string | null;
    draftMessage: string;

    // Actions
    fetchChats: (storyId: string) => Promise<void>;
    addChat: (storyId: string, title: string, messages: ChatMessage[]) => Promise<string>;
    selectChat: (chat: AIChat) => void;
    createNewChat: (storyId: string) => Promise<string>;
    deleteChat: (chatId: string) => Promise<void>;
    updateChat: (chatId: string, data: Partial<AIChat>) => Promise<void>;
    setDraftMessage: (message: string) => void;
    clearDraftMessage: () => void;
    // Message-level helpers
    updateMessage: (chatId: string, messageId: string, updates: Partial<ChatMessage>) => Promise<void>;
    setMessageEdited: (chatId: string, messageId: string, editedContent: string) => Promise<void>;
}

export const useBrainstormStore = create<BrainstormState>((set, get) => ({
    chats: [],
    selectedChat: null,
    isLoading: false,
    error: null,
    draftMessage: '',

    fetchChats: async (storyId) => {
        set({ isLoading: true, error: null });

        const [error, chats] = await attemptPromise(() =>
            db.aiChats
                .where('storyId')
                .equals(storyId)
                .toArray()
        );

        if (error) {
            set({
                error: formatError(error, ERROR_MESSAGES.FETCH_FAILED('chats')),
                isLoading: false
            });
            return;
        }

        // Sort chats by createdAt in descending order (newest first)
        chats.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        set({ chats, isLoading: false });
    },

    addChat: async (storyId: string, title: string, messages: ChatMessage[]) => {
        const newChat: AIChat = {
            id: generateChatId(),
            storyId,
            title,
            messages,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const [error] = await attemptPromise(() => db.aiChats.add(newChat));

        if (error) {
            const message = formatError(error, ERROR_MESSAGES.CREATE_FAILED('chat'));
            set({ error: message });
            throw error;
        }

        set(state => ({
            chats: [newChat, ...state.chats],
            selectedChat: newChat
        }));

        return newChat.id;
    },

    selectChat: (chat) => {
        set({ selectedChat: chat });
    },

    createNewChat: async (storyId: string) => {
        const newChat: AIChat = {
            id: generateChatId(),
            storyId,
            title: `New Chat ${new Date().toLocaleString()}`,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const [error] = await attemptPromise(() => db.aiChats.add(newChat));

        if (error) {
            const message = formatError(error, ERROR_MESSAGES.CREATE_FAILED('chat'));
            set({ error: message });
            throw error;
        }

        set(state => ({
            chats: [newChat, ...state.chats],
            selectedChat: newChat
        }));

        return newChat.id;
    },

    deleteChat: async (chatId: string) => {
        const [error] = await attemptPromise(() => db.aiChats.delete(chatId));

        if (error) {
            const message = formatError(error, ERROR_MESSAGES.DELETE_FAILED('chat'));
            set({ error: message });
            throw error;
        }

        set(state => ({
            chats: state.chats.filter(chat => chat.id !== chatId),
            selectedChat: state.selectedChat?.id === chatId ? null : state.selectedChat
        }));
    },

    updateChat: async (chatId: string, data: Partial<AIChat>) => {
        // Update the timestamp to move the chat to the top of the list
        const updatedData = {
            ...data,
            updatedAt: new Date()
        };

        const [updateError] = await attemptPromise(() => db.aiChats.update(chatId, updatedData));

        if (updateError) {
            const message = formatError(updateError, ERROR_MESSAGES.UPDATE_FAILED('chat'));
            set({ error: message });
            throw updateError;
        }

        // Fetch the updated chat to ensure we have all the data
        const [fetchError, updatedChat] = await attemptPromise(() => db.aiChats.get(chatId));

        if (fetchError) {
            const message = formatError(fetchError, ERROR_MESSAGES.FETCH_FAILED('chat'));
            set({ error: message });
            throw fetchError;
        }

        if (updatedChat) {
            set(state => {
                // Remove the chat from the current list
                const filteredChats = state.chats.filter(chat => chat.id !== chatId);

                // Add the updated chat to the beginning of the list
                return {
                    chats: [updatedChat, ...filteredChats],
                    selectedChat: state.selectedChat?.id === chatId
                        ? updatedChat
                        : state.selectedChat
                };
            });
        }
    },

    // Update a single message within a chat (optimistic update)
    updateMessage: async (chatId: string, messageId: string, updates: Partial<ChatMessage>) => {
        // Store previous state for precise rollback
        const previousChat = get().chats.find(c => c.id === chatId);

        // Optimistically update in-memory state
        set(state => {
            const chats = state.chats.map(chat => {
                if (chat.id !== chatId) return chat;
                const messages = (chat.messages || []).map((msg: ChatMessage) =>
                    msg.id === messageId ? { ...msg, ...updates } : msg
                );
                return { ...chat, messages, updatedAt: new Date() };
            });

            const selectedChat = state.selectedChat?.id === chatId
                ? chats.find(c => c.id === chatId) || state.selectedChat
                : state.selectedChat;

            return { chats, selectedChat };
        });

        // Persist to DB using existing updateChat path
        const [fetchError, chat] = await attemptPromise(() => db.aiChats.get(chatId));

        if (fetchError || !chat) {
            // Rollback optimistic update
            if (previousChat) {
                set(state => ({
                    chats: state.chats.map(c => c.id === chatId ? previousChat : c),
                    selectedChat: state.selectedChat?.id === chatId ? previousChat : state.selectedChat
                }));
            }
            const message = formatError(fetchError || new Error('Chat not found'), ERROR_MESSAGES.NOT_FOUND('chat'));
            set({ error: message });
            throw fetchError || new Error('Chat not found');
        }

        const updatedMessages = (chat.messages || []).map((msg: ChatMessage) =>
            msg.id === messageId ? { ...msg, ...updates } : msg
        );

        const [updateError] = await attemptPromise(() =>
            db.aiChats.update(chatId, { messages: updatedMessages, updatedAt: new Date() })
        );

        if (updateError) {
            // Rollback optimistic update
            if (previousChat) {
                set(state => ({
                    chats: state.chats.map(c => c.id === chatId ? previousChat : c),
                    selectedChat: state.selectedChat?.id === chatId ? previousChat : state.selectedChat
                }));
            }
            const message = formatError(updateError, ERROR_MESSAGES.UPDATE_FAILED('message'));
            set({ error: message });
            throw updateError;
        }
    },

    // Convenience helper to mark a message as edited and persist originalContent
    setMessageEdited: async (chatId: string, messageId: string, editedContent: string) => {
        const [fetchError, chat] = await attemptPromise(() => db.aiChats.get(chatId));

        if (fetchError || !chat) {
            const message = formatError(fetchError || new Error('Chat not found'), ERROR_MESSAGES.NOT_FOUND('chat'));
            set({ error: message });
            throw fetchError || new Error('Chat not found');
        }

        const existingMsg = (chat.messages || []).find((m: ChatMessage) => m.id === messageId);
        if (!existingMsg) {
            const message = ERROR_MESSAGES.NOT_FOUND('message');
            set({ error: message });
            throw new Error(message);
        }

        const originalContent = existingMsg.originalContent ?? existingMsg.content;
        const editedAt = new Date().toISOString();

        // Use updateMessage to apply optimistic update + persist
        await get().updateMessage(chatId, messageId, {
            content: editedContent,
            originalContent,
            editedAt,
            editedBy: 'user'
        });
    },

    setDraftMessage: (message: string) => {
        set({ draftMessage: message });
    },

    clearDraftMessage: () => {
        set({ draftMessage: '' });
    },
})); 