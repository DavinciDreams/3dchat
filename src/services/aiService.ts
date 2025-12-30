import axios from 'axios';
import { useChatStore } from '../store/chatStore';
import { AIResponse } from '../types';
import { ServiceError } from '../errors/AppError';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'openai/gpt-4.1-mini';

const SYSTEM_PROMPT = `You are a helpful AI assistant. Your responses will be displayed by a 3D animated avatar in a web browser. The avatar will act out what you write through natural gestures and animations.

Write naturally and expressively. The animation system will interpret your text and choose appropriate animations. For example:
- Saying "yes" or "no" will make the avatar nod or shake its head
- Saying "I like dancing" will make the avatar dance
- Expressing excitement, sadness, anger, or other emotions will trigger corresponding gestures

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
