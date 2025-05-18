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
const EDGE_TTS_ENDPOINT = import.meta.env.VITE_EDGE_TTS_ENDPOINT;
const EDGE_TTS_API_KEY = import.meta.env.VITE_EDGE_TTS_API_KEY;
const VOICE_NAME = 'en-GB-LibbyNeural';

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
      'ai', // service
      'network', // type
      'Error getting AI response', // message
      undefined, // code
      500, // statusCode
      true // retry
    );
  }
}

export async function textToSpeech(text: string): Promise<ArrayBuffer | null> {
  try {
    const response = await axios.post(
      EDGE_TTS_ENDPOINT,
      `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-GB'>
        <voice name='${VOICE_NAME}'>
          <prosody rate="0.9" pitch="+0%">
            ${text}
          </prosody>
        </voice>
      </speak>`,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': EDGE_TTS_API_KEY,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
          'Cache-Control': 'no-cache',
        },
        responseType: 'arraybuffer'
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Text to speech error:', error);
    
    throw new ServiceError(
      'speech',
      'network',
      'Text to speech failed',
      undefined,
      500,
      true
    );
  }
}

export async function speakWithNative(text: string): Promise<void> {
  if (!window.speechSynthesis) {
    throw new Error('Speech synthesis not supported');
  }

  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';
    utterance.rate = 0.9;
    
  utterance.onend = () => resolve();
  utterance.onerror = (event) => reject(new Error(`Speech synthesis failed: ${event.error}`));
  
  window.speechSynthesis.speak(utterance);
});
}
