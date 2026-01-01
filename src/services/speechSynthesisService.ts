import {
  EdgeTTS
} from 'edge-tts-universal';
import { ServiceError } from '../errors/AppError';
import { useChatStore } from '../store/chatStore';
import { VisemeData, AVAILABLE_VOICES, AudioPlaybackOptions, TTSWithPrefetchResult } from '../types';
import { textToVisemes } from './visemePreprocessor';
import { TTSCache } from './speechSynthesisService/TTSCache';
import { animationPrefetchService } from './animationPrefetchService';
import { AnimationTrigger } from '../types';

// Default voice (will be overridden by selected voice from store)
const DEFAULT_VOICE_NAME = 'en-GB-LibbyNeural';
const FALLBACK_VOICE_NAME = 'Google US English';

let audioContext: AudioContext | null = null;
let currentAudioSource: AudioBufferSourceNode | null = null; // Track active audio source for cancellation
let audioPlaybackStartTime: number = 0; // Track when audio started for timeline sync
let audioPlaybackDuration: number = 0; // Track total duration for timeline sync
let currentAudioSourceForLipSync: AudioBufferSourceNode | null = null; // Track audio source for wLipSync connection

// TTS Cache instance
const ttsCache = new TTSCache(50, 5 * 60 * 1000); // 50 entries, 5 minute TTL

export interface TTSResult {
  audioBuffer: ArrayBuffer;
  visemes: VisemeData[];
  duration: number;
}

export async function textToSpeech(text: string): Promise<TTSResult | null> {
  try {
    // Get selected voice from store
    const store = useChatStore.getState();
    const selectedVoice = AVAILABLE_VOICES.find(v => v.id === store.selectedVoiceId);
    const voiceName = selectedVoice?.name || DEFAULT_VOICE_NAME;
    
    // TTS parameters for cache key
    const rate = '+0%';
    const pitch = '+0Hz';

    console.log('🎤 [textToSpeech] Using voice:', voiceName);
    
    // Check cache first
    const cached = ttsCache.get(text, voiceName, 0, 0);
    if (cached) {
      console.log('✅ [textToSpeech] Using cached audio');
      const duration = text.length * 0.15; // Rough estimate
      return {
        audioBuffer: cached.audioBuffer,
        visemes: cached.visemes,
        duration
      };
    }
    
    if (import.meta.env.DEV) {
      console.log('⚡ [textToSpeech] Cache miss, synthesizing...');
    }
    
    const tts = new EdgeTTS(text, voiceName, {
      rate,
      volume: '+0%',
      pitch,
    });

    // Parallel: synthesize audio and generate visemes simultaneously
    const [result, visemes] = await Promise.all([
      tts.synthesize(),
      Promise.resolve(textToVisemes(text))
    ]);

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
    
    // Cache the result
    try {
      ttsCache.set(text, voiceName, 0, 0, arrayBuffer, visemes);
    } catch (cacheError) {
      // Cache failures should not break functionality
      console.warn('⚠️ [textToSpeech] Failed to cache audio:', cacheError);
    }
    
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

/**
 * Clear the TTS cache
 */
export function clearTTSCache(): void {
  ttsCache.clear();
}

/**
 * Get TTS cache statistics
 */
export function getTTSCacheStats(): { size: number; maxSize: number } {
  return ttsCache.getStats();
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

// Track current streaming speech utterance
let currentStreamingUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Speak a text chunk immediately using Web Speech API for real-time streaming
 * This function does not sanitize the text before speaking
 * @param text - Text chunk to speak
 */
export function speakChunk(text: string): void {
  if (!window.speechSynthesis) {
    console.warn('Speech synthesis not supported');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

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

  // Store reference to current utterance
  currentStreamingUtterance = utterance;
  
  utterance.onend = () => {
    currentStreamingUtterance = null;
  };
  
  utterance.onerror = () => {
    currentStreamingUtterance = null;
  };
  
  window.speechSynthesis.speak(utterance);
}

/**
 * Stop currently streaming speech
 */
export function stopStreamingSpeech(): void {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    currentStreamingUtterance = null;
  }
}

export async function playAudio(audioBuffer: ArrayBuffer): Promise<void> {
  console.log('🔊 [playAudio] Starting audio playback');
  console.log('🔊 [playAudio] Current audio source:', currentAudioSource ? 'active' : 'none');
  
  // Stop any existing audio before playing new audio
  if (currentAudioSource) {
    console.log('🔊 [playAudio] Stopping existing audio source');
    try {
      currentAudioSource.stop();
      currentAudioSource.disconnect();
    } catch (e) {
      console.warn('🔊 [playAudio] Error stopping existing audio:', e);
    }
    currentAudioSource = null;
  }
  
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
    
    // Store reference to current audio source for cancellation
    currentAudioSource = source;
    console.log('🔊 [playAudio] New audio source created and stored');
    
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
        console.log('🔊 [playAudio] Audio playback ended naturally');
        currentAudioSource = null;
        resolve();
      };
      source.addEventListener('error', (error) => {
        console.error('🔊 [playAudio] AudioSource error:', error);
        currentAudioSource = null;
        reject(new Error('Error playing audio: ' + error));
      });
      try {
        source.start(0);
        console.log('🔊 [playAudio] Audio started successfully');
      } catch (startError) {
        console.error('🔊 [playAudio] Error starting audio source:', startError);
        currentAudioSource = null;
        reject(startError);
      }
    });
  } catch (error) {
    console.error('🔊 [playAudio] Error playing audio:', error);
    currentAudioSource = null;
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

/**
 * Stop currently playing audio
 */
export function stopAudio(): void {
  console.log('🔊 [stopAudio] Called');
  console.log('🔊 [stopAudio] Current audio source:', currentAudioSource ? 'active' : 'none');
  
  if (currentAudioSource) {
    try {
      currentAudioSource.stop();
      currentAudioSource.disconnect();
      currentAudioSource = null;
      console.log('🔊 [stopAudio] Audio stopped successfully');
    } catch (e) {
      console.error('🔊 [stopAudio] Error stopping audio:', e);
    }
  } else {
    console.warn('🔊 [stopAudio] No audio source to stop');
  }
  
  useChatStore.getState().setSpeaking(false);
}

/**
 * Get current playback time in milliseconds
 * @returns Current playback time or 0 if not playing
 */
export function getCurrentPlaybackTime(): number {
  if (!audioPlaybackStartTime || !audioPlaybackDuration) {
    return 0;
  }
  return Math.min(performance.now() - audioPlaybackStartTime, audioPlaybackDuration);
}

/**
 * Get total audio duration in milliseconds
 * @returns Total duration or 0 if not playing
 */
export function getPlaybackDuration(): number {
  return audioPlaybackDuration;
}

/**
 * Check if audio is currently playing
 * @returns True if audio is playing
 */
export function isAudioPlaying(): boolean {
  return currentAudioSource !== null && audioPlaybackStartTime > 0;
}

/**
 * Play audio with event callbacks for timeline coordination
 * @param audioBuffer - Audio buffer to play
 * @param options - Playback options with callbacks
 */
export async function playAudioWithEvents(
  audioBuffer: ArrayBuffer,
  options: AudioPlaybackOptions = {}
): Promise<void> {
  console.log('🔊 [playAudioWithEvents] Starting audio playback with events');
  
  // Stop any existing audio before playing new audio
  if (currentAudioSource) {
    console.log('🔊 [playAudioWithEvents] Stopping existing audio source');
    try {
      currentAudioSource.stop();
      currentAudioSource.disconnect();
    } catch (e) {
      console.warn('🔊 [playAudioWithEvents] Error stopping existing audio:', e);
    }
    currentAudioSource = null;
  }
  
  try {
    if (!audioBuffer || audioBuffer.byteLength === 0) {
      console.warn('playAudioWithEvents received empty or null audioBuffer');
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
    
    // Store reference to current audio source for cancellation
    currentAudioSource = source;
    audioPlaybackStartTime = performance.now();
    audioPlaybackDuration = decodedData.duration * 1000; // Convert to milliseconds
    
    console.log('🔊 [playAudioWithEvents] Audio duration:', audioPlaybackDuration, 'ms');
    
    // Get the mute state from store
    const isMuted = useChatStore.getState().isMuted;
    
    // Use a GainNode to control volume based on mute state
    const gainNode = audioContext.createGain();
    gainNode.gain.value = isMuted ? 0 : 1;
    
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Track progress with interval
    let progressInterval: number | null = null;
    
    const cleanup = () => {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      currentAudioSource = null;
      audioPlaybackStartTime = 0;
    };
    
    // Setup progress tracking
    if (options.onProgress) {
      progressInterval = window.setInterval(() => {
        const currentTime = getCurrentPlaybackTime();
        options.onProgress!(currentTime, audioPlaybackDuration);
      }, 50); // Update every 50ms
    }
    
    // Play and handle completion
    await new Promise<void>((resolve, reject) => {
      source.onended = () => {
        console.log('🔊 [playAudioWithEvents] Audio playback ended naturally');
        cleanup();
        options.onEnded?.();
        resolve();
      };
      
      source.addEventListener('error', (error) => {
        console.error('🔊 [playAudioWithEvents] AudioSource error:', error);
        cleanup();
        options.onError?.(new Error('Error playing audio: ' + error));
        reject(new Error('Error playing audio: ' + error));
      });
      
      try {
        source.start(0);
        console.log('🔊 [playAudioWithEvents] Audio started successfully');
      } catch (startError) {
        console.error('🔊 [playAudioWithEvents] Error starting audio source:', startError);
        cleanup();
        options.onError?.(startError as Error);
        reject(startError);
      }
    });
  } catch (error) {
    console.error('🔊 [playAudioWithEvents] Error playing audio:', error);
    currentAudioSource = null;
    audioPlaybackStartTime = 0;
    options.onError?.(error as Error);
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

/**
 * Generate TTS audio and prefetch animations in parallel
 * @param text - Text to convert to speech
 * @param animations - Animations to prefetch
 * @returns TTS result with prefetch information
 */
export async function textToSpeechWithPrefetch(
  text: string,
  animations: AnimationTrigger[]
): Promise<TTSWithPrefetchResult> {
  console.log('%c⚡ [textToSpeechWithPrefetch] Starting parallel TTS + prefetch',
    'background: #e91e63; color: white; padding: 4px 8px; border-radius: 4px;');
  
  const startTime = performance.now();
  
  // Run TTS and prefetch in parallel
  const [ttsResult, prefetchResult] = await Promise.allSettled([
    textToSpeech(text),
    animationPrefetchService.prefetchAnimations(animations)
  ]);
  
  const elapsed = performance.now() - startTime;
  
  // Handle TTS result
  if (ttsResult.status === 'fulfilled' && ttsResult.value) {
    console.log('%c✅ [textToSpeechWithPrefetch] TTS complete', 'background: #27ae60; color: white; padding: 4px 8px;');
  } else {
    const error = ttsResult.status === 'rejected' ? ttsResult.reason : new Error('TTS returned null');
    console.error('%c❌ [textToSpeechWithPrefetch] TTS failed', 'background: #e74c3c; color: white; padding: 4px 8px;', error);
    throw error;
  }
  
  // Handle prefetch result
  if (prefetchResult.status === 'fulfilled') {
    console.log('%c✅ [textToSpeechWithPrefetch] Prefetch complete', 'background: #27ae60; color: white; padding: 4px 8px;', prefetchResult.value);
  } else {
    console.warn('%c⚠️ [textToSpeechWithPrefetch] Prefetch failed (non-critical)',
      'background: #f39c12; color: white; padding: 4px 8px;', prefetchResult.reason);
  }
  
  return {
    ...ttsResult.value!,
    prefetchedAnimations: prefetchResult.status === 'fulfilled'
      ? prefetchResult.value.successful
      : [],
    prefetchDuration: prefetchResult.status === 'fulfilled'
      ? prefetchResult.value.duration
      : elapsed
  };
}