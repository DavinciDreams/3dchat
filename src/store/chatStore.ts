import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatState, Message, Emotion, VisemeData, ProcessedMessage, AVAILABLE_VRM_MODELS, AVAILABLE_VOICES, AnimationTrigger } from '../types';

export const MAX_MESSAGES = 10;

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      processedMessages: [],
      isProcessing: false,
      isSpeaking: false,
      isListening: false,
      isMuted: false,
      emotion: 'neutral',
      visemes: [],
      visemeDuration: 0,
      selectedModelId: AVAILABLE_VRM_MODELS[0].id,
      selectedVoiceId: AVAILABLE_VOICES[0].id,
      animationQueue: [],
      currentAnimation: null,

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
      setSelectedModelId: (modelId: string) => set({ selectedModelId: modelId }),
      setSelectedVoiceId: (voiceId: string) => set({ selectedVoiceId: voiceId }),
      setAnimationQueue: (queue: AnimationTrigger[]) => set({ animationQueue: queue }),
      setCurrentAnimation: (animation: string | null) => set({ currentAnimation: animation }),
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'chat-preferences',
      partialize: (state) => ({
        selectedModelId: state.selectedModelId,
        selectedVoiceId: state.selectedVoiceId,
        isMuted: state.isMuted,
      }),
    }
  )
);
