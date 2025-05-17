import { create } from 'zustand';
import { ChatState, Message } from '../types';

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isProcessing: false,
  isSpeaking: false,
  isListening: false,
  emotion: 'neutral',
  
  addMessage: (message) => set((state) => ({
    messages: [
      ...state.messages,
      {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        ...message,
      }
    ].slice(-10), // Keep only last 10 messages
  })),
  
  setProcessing: (isProcessing) => set({ isProcessing }),
  setSpeaking: (isSpeaking) => set({ isSpeaking }),
  setListening: (isListening) => set({ isListening }),
  setEmotion: (emotion) => set({ emotion }),
  clearMessages: () => set({ messages: [] }),
}));