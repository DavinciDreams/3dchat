import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatState, Message, Emotion, ProcessedMessage, AVAILABLE_VRM_MODELS, AVAILABLE_VOICES, AnimationTrigger } from '../types';
import type { ChatMessage } from '../di/ServiceInterfaces';
import { animationStateService } from '../services/state/AnimationStateService';
import { aiService } from '../services/aiService';

export const MAX_MESSAGES = 10;

// Polyfill for crypto.randomUUID for browser compatibility
const generateId = (): string => {
  return crypto.randomUUID?.() ||
    Date.now().toString(36) + Math.random().toString(36).substr(2);
};

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
              id: generateId(),
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
      setAnimationQueue: (queue: AnimationTrigger[]) => {
        animationStateService.setAnimationQueue(queue);
        set({ animationQueue: queue });
      },
      setCurrentAnimation: (animation: string | null) => {
        animationStateService.setCurrentAnimation(animation);
        set({ currentAnimation: animation });
      },
      setAnimationSpeed: (speed: number) => animationStateService.setAnimationSpeed(speed),
      clearMessages: () => set({ messages: [] }),

      /**
       * Phase 6: AI service integration
       * Methods that handle AI responses with state updates
       */
      getAIResponse: async (input: string) => {
        const state = useChatStore.getState();
        const messages: ChatMessage[] = state.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        // Set processing state before calling AI
        set({ isProcessing: true, emotion: 'thinking' });

        try {
          const result = await aiService.getResponse(input, messages);
          
          // Update store based on AI response state changes
          if (result.stateChanges.isProcessing !== undefined) {
            set({ isProcessing: result.stateChanges.isProcessing });
          }
          if (result.stateChanges.emotion !== undefined) {
            set({ emotion: result.stateChanges.emotion });
          }

          return result.content;
        } catch (error) {
          // Handle error - reset to neutral state
          set({ isProcessing: false, emotion: 'neutral' });
          throw error;
        }
      },

      streamAIResponse: async (
        input: string,
        options: Parameters<typeof import('../services/aiService').streamAIResponse>[1]
      ) => {
        const state = useChatStore.getState();
        const messages: ChatMessage[] = state.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        // Set processing state before calling AI
        set({ isProcessing: true, emotion: 'thinking' });

        try {
          const result = await aiService.streamResponse(input, messages, options);
          
          // Update store based on AI response state changes
          if (result.stateChanges.isProcessing !== undefined) {
            set({ isProcessing: result.stateChanges.isProcessing });
          }
          if (result.stateChanges.emotion !== undefined) {
            set({ emotion: result.stateChanges.emotion });
          }

          return result.stateChanges;
        } catch (error) {
          // Handle error - reset to neutral state
          set({ isProcessing: false, emotion: 'neutral' });
          throw error;
        }
      },
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
