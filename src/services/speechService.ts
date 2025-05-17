import { useChatStore } from '../store/chatStore';
import { getAIResponse, textToSpeech } from './aiService';
import { SpeechResponse } from '../types';

// Define proper TypeScript types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionError extends Event {
  error: string;
}

// Extend the Window interface to include SpeechRecognition types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Properly type the SpeechRecognition API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition: InstanceType<typeof SpeechRecognition> | null = null;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
}

export async function initSpeechRecognition(): Promise<void> {
  if (!recognition) {
    console.error('Speech recognition not supported in this browser');
    return;
  }
  
  recognition.onresult = async (event: SpeechRecognitionEvent) => {
    const speechResult = event.results[0][0].transcript;
    const store = useChatStore.getState();
    
    store.addMessage({
      role: 'user',
      content: speechResult
    });
    
    store.setListening(false);
    
    try {
      const response = await getAIResponse(speechResult);
      
      store.addMessage({
        role: 'assistant',
        content: typeof response === 'string' ? response : response.content
      });
      
      const text = typeof response === 'string' ? response : response.content;
      const audioResult = await textToSpeech(text);
      if (audioResult && 'audioBuffer' in audioResult) {
        await playAudio(audioResult.audioBuffer as ArrayBuffer);
      }
    } catch (error) {
      console.error('Error processing speech:', error);
      store.setListening(false);
      store.setSpeaking(false);
    }
  };
  
  recognition.onerror = (event: SpeechRecognitionError) => {
    console.error('Speech recognition error:', event.error);
    useChatStore.getState().setListening(false);
  };
  
  recognition.onend = () => {
    useChatStore.getState().setListening(false);
  };
}

export function startListening(): void {
  if (!recognition) {
    console.error('Speech recognition not supported');
    return;
  }
  
  try {
    useChatStore.getState().setListening(true);
    recognition.start();
  } catch (error) {
    console.error('Error starting speech recognition:', error);
    useChatStore.getState().setListening(false);
  }
}

export function stopListening(): void {
  if (!recognition) return;
  
  try {
    recognition.stop();
    useChatStore.getState().setListening(false);
  } catch (error) {
    console.error('Error stopping speech recognition:', error);
  }
}

export async function playAudio(audioBuffer: ArrayBuffer): Promise<void> {
  if (!audioBuffer) return;
  
  const store = useChatStore.getState();
  store.setSpeaking(true);
  
  try {
    const audioContext = new AudioContext();
    const buffer = await audioContext.decodeAudioData(audioBuffer);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    
    source.onended = () => {
      store.setSpeaking(false);
      audioContext.close();
    };
    
    source.start();
  } catch (error) {
    console.error('Error playing audio:', error);
    store.setSpeaking(false);
  }
}

export async function processAudio(audioBuffer: ArrayBuffer): Promise<SpeechResponse> {
  if (!audioBuffer) {
    throw new Error('Invalid audio buffer');
  }

  const store = useChatStore.getState();
  store.setSpeaking(true);

  try {
    const audioContext = new AudioContext();
    const buffer = await audioContext.decodeAudioData(audioBuffer);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);

    return new Promise((resolve, reject) => {
      source.onended = () => {
        store.setSpeaking(false);
        audioContext.close();
        resolve({
          audioBuffer,
          visemes: [],
          duration: buffer.duration,
          error: undefined
        });
      };

      interface AudioBufferSourceNodeWithError extends AudioBufferSourceNode {
        onerror: ((this: AudioBufferSourceNode, ev: Event) => any) | null;
      }
      (source as AudioBufferSourceNodeWithError).onerror = () => {
        store.setSpeaking(false);
        audioContext.close();
        reject(new Error('Error processing audio'));
      };

      source.start();
    });
  } catch (error) {
    console.error('Error processing audio:', error);
    store.setSpeaking(false);
    throw new Error('Error processing audio');
  }
}