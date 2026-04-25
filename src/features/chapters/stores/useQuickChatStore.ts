import { create } from 'zustand';
import { AIChat } from '@/types/story';

interface QuickChatState {
  loadedChat: AIChat | null;
  loadChat: (chat: AIChat) => void;
  clearLoadedChat: () => void;
}

export const useQuickChatStore = create<QuickChatState>((set) => ({
  loadedChat: null,
  loadChat: (chat) => set({ loadedChat: chat }),
  clearLoadedChat: () => set({ loadedChat: null }),
}));
