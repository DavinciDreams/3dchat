import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatState, Message, Emotion, ProcessedMessage, AVAILABLE_VRM_MODELS, AVAILABLE_VOICES, AnimationTrigger } from '../types';
import { animationStateService } from '../services/state/AnimationStateService';

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
      selectedModelId: AVAILABLE_VRM_MODELS[0].id,
      selectedVoiceId: 'libby',
      animationQueue: [],
      currentAnimation: null,
      animationSpeed: 2.0,

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
      setSelectedModelId: (modelId: string) => set({ selectedModelId: modelId }),
      setSelectedVoiceId: (voiceId: string) => set({ selectedVoiceId: voiceId }),
      setAnimationQueue: (queue: AnimationTrigger[]) => animationStateService.setAnimationQueue(queue),
      setCurrentAnimation: (animation: string | null) => animationStateService.setCurrentAnimation(animation),
      setAnimationSpeed: (speed: number) => animationStateService.setAnimationSpeed(speed),
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'chat-preferences',
      partialize: (state) => ({
        selectedModelId: state.selectedModelId,
        selectedVoiceId: state.selectedVoiceId,
        isMuted: state.isMuted,
        animationSpeed: animationStateService.getAnimationSpeed(),
      }),
    }
  )
);

// Migration: Clear old selectedVoiceId to use new default
const storedState = JSON.parse(localStorage.getItem('chat-preferences') || '{}');
if (storedState.state?.selectedVoiceId && storedState.state.selectedVoiceId !== 'libby') {
  delete storedState.state.selectedVoiceId;
  localStorage.setItem('chat-preferences', JSON.stringify(storedState));
}
