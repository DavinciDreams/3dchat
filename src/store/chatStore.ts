import { create } from 'zustand';
import { ChatState, Message, Emotion, VisemeData, ProcessedMessage } from '../types';

export const MAX_MESSAGES = 10;

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  processedMessages: [],
  isProcessing: false,
  isSpeaking: false,
  isListening: false,
  isMuted: false,
  emotion: 'neutral',
  visemes: [],
  visemeDuration: 0,
  
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => set((state) => {
    if (!message.content || !message.role) {
      console.error('Invalid message format:', message);
      return state;
    }

    return {
      messages: [
        ...state.messages,
        {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          ...message,
        }
      ].slice(-MAX_MESSAGES)
    };
  }),
  
  setProcessedMessage: (message: ProcessedMessage) => set((state) => ({
    processedMessages: [
      ...state.processedMessages,
      message
    ].slice(-MAX_MESSAGES)
  })),
  
  setProcessing: (isProcessing: boolean) => set({ isProcessing }),
  setSpeaking: (isSpeaking: boolean) => set({ isSpeaking }),
  setListening: (isListening: boolean) => set({ isListening }),
  setIsMuted: (isMuted: boolean) => set({ isMuted }),
  setEmotion: (emotion: Emotion) => set({ emotion }),
  setVisemes: (visemes: VisemeData[]) => set({ visemes }),
  setVisemeDuration: (duration: number) => set({ visemeDuration: duration }),
  clearMessages: () => set({ messages: [] }),
}));