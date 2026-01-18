import { create } from "zustand";
import { Chat, Message, AgentMode, AppConfig } from "../types";

interface AppState {
  chats: Chat[];
  currentChatId: string | null;
  messages: Message[];
  isLoading: boolean;
  config: AppConfig | null;

  // Actions
  fetchChats: () => Promise<void>;
  createChat: (title?: string) => Promise<void>;
  selectChat: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  sendMessage: (content: string, mode?: AgentMode) => Promise<void>;
  clearChatContext: (chatId: string) => Promise<void>;
  clearAllContexts: () => Promise<void>;
  fetchConfig: () => Promise<void>;
}

const API_BASE = "/api";

export const useAppStore = create<AppState>((set, get) => ({
  chats: [],
  currentChatId: null,
  messages: [],
  isLoading: false,
  config: null,

  fetchChats: async () => {
    try {
      const response = await fetch(`${API_BASE}/chats`);
      const chats = await response.json();
      set({ chats });
    } catch (error) {
      console.error("Failed to fetch chats:", error);
    }
  },

  createChat: async (title?: string) => {
    try {
      const response = await fetch(`${API_BASE}/chats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || "Новый чат" }),
      });
      const chat = await response.json();
      set((state) => ({
        chats: [chat, ...state.chats],
        currentChatId: chat.id,
        messages: [],
      }));
    } catch (error) {
      console.error("Failed to create chat:", error);
    }
  },

  selectChat: async (chatId: string) => {
    set({ isLoading: true });
    try {
      const response = await fetch(`${API_BASE}/chats/${chatId}/messages`);
      const messages = await response.json();
      set({ currentChatId: chatId, messages, isLoading: false });
    } catch (error) {
      console.error("Failed to load messages:", error);
      set({ isLoading: false });
    }
  },

  deleteChat: async (chatId: string) => {
    try {
      await fetch(`${API_BASE}/chats/${chatId}`, { method: "DELETE" });
      set((state) => ({
        chats: state.chats.filter((c) => c.id !== chatId),
        currentChatId:
          state.currentChatId === chatId ? null : state.currentChatId,
        messages: state.currentChatId === chatId ? [] : state.messages,
      }));
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  },

  sendMessage: async (content: string, mode?: AgentMode) => {
    const { currentChatId, config } = get();
    if (!currentChatId) return;

    set({ isLoading: true });

    // Add user message optimistically
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
      timestamp: Date.now(),
      chatId: currentChatId,
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
    }));

    try {
      const response = await fetch(
        `${API_BASE}/chats/${currentChatId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            mode: mode || config?.mode || "hybrid",
          }),
        },
      );

      const data = await response.json();

      set((state) => ({
        messages: [
          ...state.messages.filter((m) => m.id !== userMessage.id),
          data.userMessage,
          data.assistantMessage,
        ],
        isLoading: false,
      }));

      // Update chat list
      await get().fetchChats();
    } catch (error) {
      console.error("Failed to send message:", error);
      set({ isLoading: false });
    }
  },

  clearChatContext: async (chatId: string) => {
    try {
      await fetch(`${API_BASE}/chats/${chatId}/context`, { method: "DELETE" });
    } catch (error) {
      console.error("Failed to clear chat context:", error);
    }
  },

  clearAllContexts: async () => {
    try {
      await fetch(`${API_BASE}/context/all`, { method: "DELETE" });
    } catch (error) {
      console.error("Failed to clear all contexts:", error);
    }
  },

  fetchConfig: async () => {
    try {
      const response = await fetch(`${API_BASE}/config`);
      const config = await response.json();
      set({ config });
    } catch (error) {
      console.error("Failed to fetch config:", error);
    }
  },
}));
