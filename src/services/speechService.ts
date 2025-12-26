import { useChatStore } from '../store/chatStore';
import { getAIResponse } from './aiService';
import { textToSpeech, playAudio } from './speechSynthesisService';
import { preprocessingPipeline } from './textPreprocessing';
import { SpeechResponse, PreprocessedText, Emotion } from '../types';
import { ServiceError } from '../errors/AppError';

// Add browser native speech synthesis
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
    webkitAudioContext: typeof AudioContext;
    readonly speechSynthesis: SpeechSynthesis;
    SpeechSynthesisUtterance: new () => SpeechSynthesisUtterance;
  }
}

// Update SpeechRecognition types
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionError) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionError extends Event {
  error: 'network' | 'no-speech' | 'audio-capture' | 'not-allowed' | 'service-not-allowed' | 'bad-grammar' | 'language-not-supported' | 'aborted';
  message?: string;
}

let recognition: SpeechRecognition | null = null;
let isInitialized = false;
let retryCount = 0;
const MAX_RETRIES = 3;

export async function initSpeechRecognition(): Promise<void> {
  try {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported');
    }

    // Check for microphone permission before initializing
    await checkMicrophonePermission();

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setupRecognitionHandlers();

    isInitialized = true;
  } catch (error) {
    console.error('Error initializing speech recognition:', error);
  }
}

async function checkMicrophonePermission(): Promise<void> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Clean up the stream after permission check
    stream.getTracks().forEach(track => track.stop());
  } catch (error) {
    throw new ServiceError(
      'speech',
      'auth',
      'Microphone permission denied or not available'
    );
  }
}

function setupRecognitionHandlers(): void {
  if (!recognition) return;

  recognition.onresult = async (event: SpeechRecognitionEvent) => {
    try {
      const speechResult = event.results[0][0].transcript;
      const store = useChatStore.getState();
      
      store.addMessage({
        role: 'user',
        content: speechResult
      });
      
      store.setListening(false);
      
      const response = await getAIResponse(speechResult);
      if (response) {
        const text = typeof response === 'string' ? response : response.content;
        
        // Preprocess the text
        const processed: PreprocessedText = preprocessingPipeline.process(text);
        
        // Log preprocessing results for debugging
        console.group('📝 Text Preprocessing (Speech Recognition)');
        console.log('🤖 Model Output (original):', text);
        console.log('🎤 Speech Output (cleanText):', processed.cleanText);
        console.log('🖥️  Display Output (displayText):', processed.displayText);
        console.log('📊 Metadata:', processed.metadata);
        if (processed.metadata.emphasis.length > 0) {
          console.log('✨ Emphasis detected:', processed.metadata.emphasis);
        }
        if (processed.metadata.emojis.length > 0) {
          console.log('😀 Emojis detected:', processed.metadata.emojis);
        }
        if (processed.metadata.links.length > 0) {
          console.log('🔗 Links detected:', processed.metadata.links);
        }
        console.groupEnd();
        
        // Store the processed message
        store.setProcessedMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: processed.displayText,
          timestamp: Date.now(),
          metadata: processed.metadata
        });
        
        // Add to regular messages
        store.addMessage({
          role: 'assistant',
          content: processed.displayText
        });
        
        // Use cleanText for speech synthesis
        const audioResult = await textToSpeech(processed.cleanText);
        if (audioResult) {
          await playAudio(audioResult.audioBuffer);
          
          // Trigger gestures from emoji metadata
          if (processed.metadata.emojis.length > 0) {
            processed.metadata.emojis.forEach((emojiData) => {
              if (emojiData.gesture) {
                // Cast to Emotion type if it's a valid emotion
                if (['neutral', 'happy', 'thinking', 'sad'].includes(emojiData.gesture)) {
                  store.setEmotion(emojiData.gesture as Emotion);
                }
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error processing speech result:', error);
      handleSpeechError(error);
    }
  };

  recognition.onerror = (event: SpeechRecognitionError) => {
    console.error('Speech recognition error:', event.error);
    
    switch (event.error) {
      case 'network':
        handleNetworkError();
        break;
      case 'audio-capture':
        handleSpeechError(new ServiceError('speech', 'auth', 'No microphone detected'));
        break;
      case 'not-allowed':
      case 'service-not-allowed':
        handleSpeechError(new ServiceError('speech', 'auth', 'Microphone access denied'));
        break;
      case 'aborted':
        // Ignore aborted errors as they're usually intentional
        break;
      default:
        handleSpeechError(new ServiceError('speech', 'unknown', `Recognition error: ${event.error}`));
    }
  };

  recognition.onend = () => {
    const store = useChatStore.getState();
    if (store.isListening) {
      // Only retry if we're still supposed to be listening
      tryRestartRecognition();
    } else {
      store.setListening(false);
    }
  };
}

function handleNetworkError(): void {
  if (retryCount < MAX_RETRIES) {
    retryCount++;
    console.log(`Retrying speech recognition (attempt ${retryCount}/${MAX_RETRIES})...`);
    setTimeout(() => {
      tryRestartRecognition();
    }, 1000 * retryCount); // Exponential backoff
  } else {
    handleSpeechError(new ServiceError(
      'speech',
      'network',
      'Network connection failed after multiple retries'
    ));
  }
}

function tryRestartRecognition(): void {
  try {
    recognition?.start();
  } catch (error) {
    console.error('Error restarting speech recognition:', error);
    handleSpeechError(error);
  }
}

function handleSpeechError(error: any): void {
  const store = useChatStore.getState();
  store.setListening(false);
  store.setSpeaking(false);
  
  if (error instanceof ServiceError) {
    throw error;
  }
  
  throw new ServiceError(
    'speech',
    'network',
    error?.message || 'Speech recognition error',
    error?.code || 500
  );
}

export function startListening(): void {
  if (!recognition || !isInitialized) {
    initSpeechRecognition().then(() => {
      tryStartListening();
    }).catch((error) => {
      console.error('Error initializing speech recognition:', error);
      useChatStore.getState().setListening(false);
    });
    return;
  }

  tryStartListening();
}

function tryStartListening(): void {
  try {
    useChatStore.getState().setListening(true);
    recognition?.start();
  } catch (error) {
    console.error('Error starting speech recognition:', error);
    handleSpeechError(error);
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
