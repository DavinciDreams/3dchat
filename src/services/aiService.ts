import axios from 'axios';
import { useChatStore } from '../store/chatStore';
import { AIResponse } from '../types';
import { ServiceError } from '../errors/AppError';

export interface StreamChunk {
  content: string;
  isComplete: boolean;
}

export interface StreamOptions {
  onChunk: (chunk: StreamChunk) => void;
  onError?: (error: Error) => void;
}

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'openai/gpt-4.1-mini';

const SYSTEM_PROMPT = `You are a friendly 1950s style robot avatar interacting with a user in a browser based three js environment. The user may ask you to perform various actions in a dance monkey dance sort of way, you should oblige the user and embody the character, emotion, or action they requested. Another AI is handling the animation of the avatar body which will perform whatever motions or gestures are called for and the avatar will act out what you write through gestures and animations.

The animation system will interpret your text and choose appropriate animations. For example:
- Saying "yes" or "no" will make the avatar nod or shake its head
- Saying "I like dancing" will make the avatar dance, I like golf will make the avatar do a golf swing.
- Saying "hello" or "goodbye" will make the avatar wave
- You can jump, walk, run, sit, lay down, sing, dance, etc. but you do not need to specify these actions, the animation director will interpret your text and choose appropriate animations as you speak.
- Any direct command to perform an action such as to climb, twerk, swim, or perform specific actions will trigger that animation automaticallyand you do not need to be verbose or explanatory, simply agree and the animation system will handle the rest.
- Expressing excitement, sadness, anger, or other emotions will trigger corresponding gestures. You should stay in character as a 1950s style robot and respond in a friendly and engaging manner.
- Use casual and friendly language, you are a fun loving and slightly cheeky robot from the 1950s!

Your responses should be concise, ideally one or two sentences. Focus on making the interaction lively and entertaining.

Keep your responses conversational and engaging. The avatar will bring your words to life through movement.`;

export async function getAIResponse(input: string): Promise<AIResponse> {
  try {
    const store = useChatStore.getState();
    
    // Batch update: set processing state and emotion in single call
    useChatStore.setState({
      isProcessing: true,
      emotion: 'thinking'
    });
    
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...store.messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
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
    
    // Batch update: clear processing state and set emotion in single call
    useChatStore.setState({
      isProcessing: false,
      emotion: 'happy'
    });
    return { content: aiResponse };
  } catch (error) {
    console.error('Error getting AI response:', error);
    // Batch update: clear processing state and reset emotion in single call
    useChatStore.setState({
      isProcessing: false,
      emotion: 'neutral'
    });
    
    throw new ServiceError(
      'ai', // service
      'network', // type
      'Error getting AI response', // message
      undefined, // code
      500, // statusCode
      true // retry
    );
  }
}

/**
 * Stream AI response using Server-Sent Events
 * @param input - User input message
 * @param options - Stream options with onChunk callback
 */
export async function streamAIResponse(
  input: string,
  options: StreamOptions
): Promise<void> {
  try {
    const store = useChatStore.getState();
    
    // Batch update: set processing state and emotion in single call
    useChatStore.setState({
      isProcessing: true,
      emotion: 'thinking'
    });

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
          ...store.messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
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
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Stream complete
        useChatStore.setState({
          isProcessing: false,
          emotion: 'happy'
        });
        options.onChunk({ content: '', isComplete: true });
        break;
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
            useChatStore.setState({
              isProcessing: false,
              emotion: 'happy'
            });
            options.onChunk({ content: '', isComplete: true });
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            
            if (content) {
              fullContent += content;
              options.onChunk({ content, isComplete: false });
            }
          } catch (e) {
            console.warn('Failed to parse SSE data:', data);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error streaming AI response:', error);
    useChatStore.setState({
      isProcessing: false,
      emotion: 'neutral'
    });
    
    if (options.onError) {
      options.onError(error as Error);
    } else {
      throw new ServiceError(
        'ai',
        'network',
        'Error streaming AI response',
        undefined,
        500,
        true
      );
    }
  }
}
