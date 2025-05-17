import axios from 'axios';
import { useChatStore } from '../store/chatStore';
import { AIResponse } from '../types';
import { AppError, ServiceError } from '../errors/AppError';

export interface SpeechResponse {
  success: boolean;
  data?: ArrayBuffer;
  error?: AppError;
}

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const EDGE_TTS_ENDPOINT = 'https://eastus2.api.cognitive.microsoft.com/';
const VITE_EDGE_TTS_API_KEY = import.meta.env.VITE_EDGE_TTS_API_KEY;

export async function getAIResponse(input: string): Promise<AIResponse> {
  try {
    const store = useChatStore.getState();
    store.setProcessing(true);
    store.setEmotion('thinking');
    
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'qwen/qwen3-235b-a22b:free',
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
    
    store.setProcessing(false);
    store.setEmotion('happy');
    return { content: aiResponse };
  } catch (error) {
    console.error('Error getting AI response:', error);
    useChatStore.getState().setProcessing(false);
    useChatStore.getState().setEmotion('neutral');
    
    throw new ServiceError(
      'ai',
      'network',
      'Error getting AI response',
      500,
      error instanceof Error ? error.message : undefined
    );
  }
}

export async function textToSpeech(text: string): Promise<SpeechResponse> {
  try {
    const store = useChatStore.getState();
    store.setSpeaking(true);
    
    const response = await axios.post(
      EDGE_TTS_ENDPOINT,
      `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
        <voice name='en-US-AriaNeural'>
          ${text}
        </voice>
      </speak>`,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': VITE_EDGE_TTS_API_KEY,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
        }
      }
    );
    
    store.setSpeaking(false);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error in text to speech:', error);
    useChatStore.getState().setSpeaking(false);
    return { success: false, error: new AppError('TTS_ERROR', 'Error in text to speech') };
  }
}