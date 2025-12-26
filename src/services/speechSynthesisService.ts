import {
  EdgeTTS
} from 'edge-tts-universal';
import { ServiceError } from '../errors/AppError';
import { useChatStore } from '../store/chatStore';
import { VisemeData } from '../types';
import { textToVisemes } from './visemePreprocessor';

const VOICE_NAME = 'en-GB-LibbyNeural';
const FALLBACK_VOICE_NAME = 'Google US English';

let audioContext: AudioContext | null = null;

export interface TTSResult {
  audioBuffer: ArrayBuffer;
  visemes: VisemeData[];
  duration: number;
}

export async function textToSpeech(text: string): Promise<TTSResult | null> {
  try {
    const tts = new EdgeTTS(text, VOICE_NAME, {
      rate: '+0%',
      volume: '+0%',
      pitch: '+0Hz',
    });
    const result = await tts.synthesize();
    console.log('EdgeTTS result object:', JSON.stringify({
      keys: Object.keys(result),
      hasAudio: !!result.audio,
      audioType: result.audio?.type,
      audioSize: result.audio?.size
    }, null, 2));
    if (!result.audio) {
      throw new ServiceError('speech', 'unknown', 'No audio returned from TTS');
    }
    // result.audio is a Blob in browser, convert to ArrayBuffer
    const arrayBuffer = await result.audio.arrayBuffer();
    console.log('ArrayBuffer from result.audio:', {
      byteLength: arrayBuffer?.byteLength,
      type: typeof arrayBuffer
    });
    
    // Generate visemes from the text
    const visemes = textToVisemes(text);
    
    // Estimate duration from audio (will be refined when played)
    const duration = text.length * 0.15; // Rough estimate
    
    const ttsResult = {
      audioBuffer: arrayBuffer,
      visemes,
      duration
    };
    console.log('TTS result returning:', JSON.stringify({
      audioBufferLength: ttsResult.audioBuffer?.byteLength,
      audioBufferType: typeof ttsResult.audioBuffer,
      visemesCount: ttsResult.visemes?.length,
      duration: ttsResult.duration
    }, null, 2));
    return ttsResult;
  } catch (error) {
    console.error('Text to speech error:', error);
    let statusCode = 500;
    if (error && typeof error === 'object' && 'response' in error) {
      const errObj = error as { response?: { status?: number } };
      if (errObj.response && typeof errObj.response.status === 'number') {
        statusCode = errObj.response.status;
      }
    }
    throw new ServiceError(
      'speech',
      'network',
      'Text to speech failed',
      undefined,
      statusCode
    );
  }
}

export async function speakWithNative(text: string): Promise<ArrayBuffer | null> {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      reject(new ServiceError('speech', 'auth', 'Speech synthesis not supported'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find a suitable voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name === FALLBACK_VOICE_NAME || 
      (voice.lang === 'en-GB' && voice.default)
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => resolve(null);
    utterance.onerror = (error) => reject(new ServiceError(
      'speech',
      'unknown',
      'Speech synthesis failed: ' + error.error,
      undefined
    ));
    
    window.speechSynthesis.speak(utterance);
  });
}

export async function playAudio(audioBuffer: ArrayBuffer): Promise<void> {
  try {
    if (!audioBuffer || audioBuffer.byteLength === 0) {
      console.warn('playAudio received empty or null audioBuffer');
      throw new ServiceError('speech', 'unknown', 'Audio buffer is empty', 0);
    }
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    const decodedData = await audioContext.decodeAudioData(audioBuffer);
    const source = audioContext.createBufferSource();
    source.buffer = decodedData;
    
    // Get the mute state from the store
    const isMuted = useChatStore.getState().isMuted;
    
    // Use a GainNode to control volume based on mute state
    const gainNode = audioContext.createGain();
    gainNode.gain.value = isMuted ? 0 : 1;
    
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    // Play and handle completion
    await new Promise<void>((resolve, reject) => {
      source.onended = () => {
        console.log('Audio playback ended');
        resolve();
      };
      source.addEventListener('error', (error) => {
        console.error('AudioSource error:', error);
        reject(new Error('Error playing audio: ' + error));
      });
      try {
        source.start(0);
      } catch (startError) {
        console.error('Error starting audio source:', startError);
        reject(startError);
      }
    });
  } catch (error) {
    console.error('Error playing audio:', error);
    throw new ServiceError(
      'speech',
      'unknown',
      'Failed to play audio',
      0
    );
  } finally {
    useChatStore.getState().setSpeaking(false);
  }
}