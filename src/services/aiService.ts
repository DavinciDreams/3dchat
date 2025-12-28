import axios from 'axios';
import { useChatStore } from '../store/chatStore';
import { AIResponse } from '../types';
import { ServiceError } from '../errors/AppError';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'qwen/qwen3-235b-a22b:free';

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
