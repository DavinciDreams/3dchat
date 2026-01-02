import axios from 'axios';
import type { ChatMessage, AIStreamChunk, AIStreamOptions, AIStateChanges, IAIService } from '../di/ServiceInterfaces';
import type { Emotion } from '../types';
import { ServiceError } from '../errors/AppError';

// Re-export types for backward compatibility
export type StreamChunk = AIStreamChunk;
export type StreamOptions = AIStreamOptions;

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'openai/gpt-4.1-mini';

const SYSTEM_PROMPT = `You are a friendly 1950s style robot avatar interacting with a user in a browser based three js environment. The user may ask you to perform various actions in a dance monkey dance sort of way, you should oblige user and embody character, emotion, or action they requested. Another AI is handling the animation of avatar body which will perform whatever motions or gestures are called for and avatar will act out what you write through gestures and animations.

The animation system will interpret your text and choose appropriate animations. For example:
- Saying "yes" or "no" will make the avatar nod or shake its head
- Saying "I like dancing" will make the avatar dance, I like golf will make the avatar do a golf swing.
- Saying "hello" or "goodbye" will make the avatar wave
- You can jump, walk, run, sit, lay down, sing, dance, etc. but you do not need to specify these actions, the animation director will interpret your text and choose appropriate animations as you speak.
- Any direct command to perform an action such as to climb, twerk, swim, or perform specific actions will trigger that animation automatically and you do not need to be verbose or explanatory, simply agree and the animation system will handle the rest.
- Expressing excitement, sadness, anger, or other emotions will trigger corresponding gestures. You should stay in character as a 1950s style robot and respond in a friendly and engaging manner.
- Use casual and friendly language, you are a fun loving and slightly cheeky robot from the 1950s!

Your responses should be concise, ideally one or two sentences. Focus on making the interaction lively and entertaining.

Keep your responses conversational and engaging. The avatar will bring your words to life through movement.`;

/**
 * AI Service implementation
 * 
 * Phase 6: Refactored to return data instead of manipulating store directly.
 * This service is now testable without store.
 */
export class AIService implements IAIService {
  /**
   * Get a complete AI response
   */
  async getResponse(
    input: string,
    messages: ChatMessage[]
  ): Promise<{ content: string; stateChanges: AIStateChanges }> {
    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: OPENROUTER_MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages,
            { role: 'user', content: input }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const aiResponse = response.data.choices[0].message.content;
      
      // Return response with state changes (not manipulating store)
      return {
        content: aiResponse,
        stateChanges: {
          isProcessing: false,
          emotion: 'happy' as Emotion
        }
      };
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Return error state changes
      return {
        content: '',
        stateChanges: {
          isProcessing: false,
          emotion: 'neutral' as Emotion
        }
      };
    }
  }

  /**
   * Stream an AI response with chunk callbacks
   */
  async streamResponse(
    input: string,
    messages: ChatMessage[],
    options: AIStreamOptions
  ): Promise<{ stateChanges: AIStateChanges }> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages,
            { role: 'user', content: input }
          ],
          stream: true
        })
      });

      if (!response.ok) {
        throw new ServiceError(
          'ai',
          'network',
          `HTTP error! status: ${response.status}`,
          undefined,
          response.status
        );
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new ServiceError('ai', 'unknown', 'Response body is not readable');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Stream complete - notify caller with completion
          options.onChunk({ content: '', isComplete: true });
          return {
            stateChanges: {
              isProcessing: false,
              emotion: 'happy' as Emotion
            }
          };
        }

        // Decode chunk
        buffer += decoder.decode(value, { stream: true });

        // Process SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') {
              // Stream complete - notify caller with completion
              options.onChunk({ content: '', isComplete: true });
              return {
                stateChanges: {
                  isProcessing: false,
                  emotion: 'happy' as Emotion
                }
              };
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              
              if (content) {
                options.onChunk({ content, isComplete: false });
              }
            } catch {
              console.warn('Failed to parse SSE data:', data);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error streaming AI response:', error);
      
      if (options.onError) {
        options.onError(error as Error);
      }
      
      return {
        stateChanges: {
          isProcessing: false,
          emotion: 'neutral' as Emotion
        }
      };
    }
  }
}

// Create singleton instance
export const aiService = new AIService();

/**
 * Legacy function for backward compatibility
 * @deprecated Use aiService.getResponse() instead
 */
export async function getAIResponse(input: string, messages?: ChatMessage[]): Promise<{ content: string; stateChanges: AIStateChanges }> {
  return aiService.getResponse(input, messages || []);
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use aiService.streamResponse() instead
 */
export async function streamAIResponse(
  input: string,
  options: AIStreamOptions,
  messages?: ChatMessage[]
): Promise<{ stateChanges: AIStateChanges }> {
  return aiService.streamResponse(input, messages || [], options);
}
