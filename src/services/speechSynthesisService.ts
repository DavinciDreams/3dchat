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
// Fallback voice for streaming when selected voice is not available
const FALLBACK_VOICE_NAME = 'en-GB-LibbyNeural';

// Mapping from EdgeTTS voice names to Web Speech API voice name patterns
const WEB_SPEECH_VOICE_PATTERNS: Record<string, string[]> = {
  'aria': ['aria', 'ariaNeural', 'aria neural'],
  'jenny': ['jenny', 'jennyNeural', 'jenny neural'],
  'libby': ['libby', 'libbyNeural', 'libby neural'],
  'guy': ['guy', 'guyNeural', 'guy neural'],
  'sonia': ['sonia', 'soniaNeural', 'sonia neural'],
  'rachel': ['rachel', 'rachelNeural', 'rachel neural'],
  'jason': ['jason', 'jasonNeural', 'jason neural'],
  'sara': ['sara', 'saraNeural', 'sara neural'],
  'tony': ['tony', 'tonyNeural', 'tony neural'],
  'nancy': ['nancy', 'nancyNeural', 'nancy neural'],
  'amber': ['amber', 'amberNeural', 'amber neural'],
  'ana': ['ana', 'anaNeural', 'ana neural'],
  'brenda': ['brenda', 'brendaNeural', 'brenda neural'],
  'carter': ['carter', 'carterNeural', 'carter neural'],
  'cora': ['cora', 'coraNeural', 'cora neural'],
  'davis': ['davis', 'davisNeural', 'davis neural'],
  'elizabeth': ['elizabeth', 'elizabethNeural', 'elizabeth neural'],
  'eric': ['eric', 'ericNeural', 'eric neural'],
  'eva': ['eva', 'evaNeural', 'eva neural'],
  'josh': ['josh', 'joshNeural', 'josh neural'],
  'maria': ['maria', 'mariaNeural', 'maria neural'],
  'michelle': ['michelle', 'michelleNeural', 'michelle neural'],
  'roger': ['roger', 'rogerNeural', 'roger neural'],
  'steffan': ['steffan', 'steffanNeural', 'steffan neural'],
  'aigenerate': ['aigenerate', 'aigenerateNeural', 'aigenerate neural'],
};

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
    
    console.log('🎤 [textToSpeech] Selected voice ID from store:', store.selectedVoiceId);
    console.log('🎤 [textToSpeech] Selected voice object:', selectedVoice);
    console.log('🎤 [textToSpeech] Using voice name:', voiceName);
    console.log('🎤 [textToSpeech] DEFAULT_VOICE_NAME:', DEFAULT_VOICE_NAME);
    console.log('🎤 [textToSpeech] All available voices:', AVAILABLE_VOICES.map(v => ({id: v.id, name: v.name})));
    
    // TTS parameters for cache key
    const rate = '+0%';
    const pitch = '+0Hz';
    
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
    
    // Get selected voice from store
    const store = useChatStore.getState();
    const selectedVoice = AVAILABLE_VOICES.find(v => v.id === store.selectedVoiceId);
    const selectedVoiceName = selectedVoice?.name || DEFAULT_VOICE_NAME;
    
    // Try to find a suitable voice - prioritize selected voice from UI dropdown
    const voices = window.speechSynthesis.getVoices();
    
    // Priority order: 1) Try to match selected voice from store, 2) Fall back to Libby, 3) Any suitable voice
    let preferredVoice = voices.find(voice =>
      voice.name.toLowerCase().includes(selectedVoiceName.toLowerCase()) ||
      voice.lang === selectedVoiceName.substring(0, 5) // Match by language code (e.g., 'en-GB')
    );
    
    // If selected voice not found, try fallback to Libby
    if (!preferredVoice) {
      preferredVoice = voices.find(voice =>
        voice.name.toLowerCase().includes('libby') ||
        voice.name.toLowerCase().includes('en-gb') ||
        (voice.lang === 'en-GB' && voice.default)
      );
    }
    
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

// Chunk buffer for accumulating streaming text
let speechChunkBuffer: string = '';
let speechBufferTimeout: number | null = null;
const SPEAK_BUFFER_DELAY = 150; // ms to wait before speaking accumulated text

// Queue for accumulated text segments to speak sequentially
let speechSegmentQueue: string[] = [];
let isSpeakingQueue = false;

/**
 * Speak a text chunk using Web Speech API for real-time streaming
 * Chunks are accumulated in a buffer and spoken in larger segments
 * This function does not sanitize the text before speaking
 * @param text - Text chunk to speak
 */
export function speakChunk(text: string): void {
  console.log('🔊 [speakChunk] Called with text:', text);
  console.log('🔊 [speakChunk] Text length:', text.length);
  
  // Check mute state before processing
  const isMuted = useChatStore.getState().isMuted;
  if (isMuted) {
    return;
  }
  
  if (!window.speechSynthesis) {
    console.warn('Speech synthesis not supported');
    return;
  }

  // Clear any existing timeout
  if (speechBufferTimeout !== null) {
    clearTimeout(speechBufferTimeout);
    speechBufferTimeout = null;
  }

  // Append chunk to buffer
  speechChunkBuffer += text;
  console.log('🔊 [speakChunk] Buffer size:', speechChunkBuffer.length);

  // Set timeout to speak accumulated text
  speechBufferTimeout = window.setTimeout(() => {
    flushSpeechBuffer();
  }, SPEAK_BUFFER_DELAY);
}

/**
 * Flush the accumulated speech buffer to the queue
 * Splits text into sentence segments for smoother playback
 */
function flushSpeechBuffer(): void {
  if (speechChunkBuffer.length === 0) {
    console.log('🔊 [flushSpeechBuffer] Buffer empty, nothing to flush');
    return;
  }

  console.log('🔊 [flushSpeechBuffer] Flushing buffer, length:', speechChunkBuffer.length);

  // Split buffer into sentence segments for smoother playback
  // Try to split on sentence boundaries first, then on phrase boundaries
  const segments = splitIntoSegments(speechChunkBuffer);
  
  console.log('🔊 [flushSpeechBuffer] Created', segments.length, 'segments');
  
  // Add segments to queue
  speechSegmentQueue.push(...segments);
  
  // Clear buffer
  speechChunkBuffer = '';
  
  // Start processing queue if not already speaking
  if (!isSpeakingQueue) {
    processSpeechQueue();
  }
}

/**
 * Split text into segments for smoother speech playback
 * Prioritizes sentence boundaries, then phrase boundaries
 */
function splitIntoSegments(text: string): string[] {
  const segments: string[] = [];
  
  // Split on sentence boundaries first (., !, ?)
  // Use a regex that captures the delimiter
  let remaining = text.trim();
  
  while (remaining.length > 0) {
    // Find the next sentence boundary
    const sentenceMatch = remaining.match(/^.+?[.!?](?:\s+|$)/);
    
    if (sentenceMatch) {
      segments.push(sentenceMatch[0].trim());
      remaining = remaining.slice(sentenceMatch[0].length).trim();
    } else {
      // No more sentence boundaries, split on phrase boundaries (commas, semicolons)
      const phraseMatch = remaining.match(/^.+?[;,](?:\s+|$)/);
      
      if (phraseMatch) {
        segments.push(phraseMatch[0].trim());
        remaining = remaining.slice(phraseMatch[0].length).trim();
      } else {
        // No more phrase boundaries, take the rest as one segment
        // But limit segment length to avoid very long utterances
        const MAX_SEGMENT_LENGTH = 200;
        if (remaining.length > MAX_SEGMENT_LENGTH) {
          // Find a word boundary near the max length
          const splitIndex = remaining.lastIndexOf(' ', MAX_SEGMENT_LENGTH);
          if (splitIndex > 50) {
            segments.push(remaining.slice(0, splitIndex).trim());
            remaining = remaining.slice(splitIndex).trim();
          } else {
            segments.push(remaining);
            remaining = '';
          }
        } else {
          segments.push(remaining);
          remaining = '';
        }
      }
    }
  }
  
  // Filter out empty segments
  return segments.filter(s => s.length > 0);
}

/**
 * Process the speech segment queue sequentially
 */
function processSpeechQueue(): void {
  if (speechSegmentQueue.length === 0) {
    console.log('🔊 [processSpeechQueue] Queue empty, stopping');
    isSpeakingQueue = false;
    return;
  }

  // Check mute state before speaking each utterance
  const isMuted = useChatStore.getState().isMuted;
  if (isMuted) {
    speechSegmentQueue.length = 0; // Clear the queue
    return;
  }

  isSpeakingQueue = true;
  const text = speechSegmentQueue.shift()!;
  console.log('🔊 [processSpeechQueue] Speaking segment:', text);
  console.log('🔊 [processSpeechQueue] Remaining in queue:', speechSegmentQueue.length);

  const utterance = new SpeechSynthesisUtterance(text);
  
  const store = useChatStore.getState();
  const selectedVoice = AVAILABLE_VOICES.find(v => v.id === store.selectedVoiceId);
  const selectedVoiceName = selectedVoice?.name || DEFAULT_VOICE_NAME;

  const voices = window.speechSynthesis.getVoices();

  // Extract voice ID from EdgeTTS name (e.g., 'en-US-JennyNeural' -> 'jenny')
  const voiceId = selectedVoice?.id || 'libby';
  const patterns = WEB_SPEECH_VOICE_PATTERNS[voiceId] || [voiceId];

  // Try to match using the voice ID patterns
  let preferredVoice = voices.find(voice =>
    patterns.some(pattern =>
      voice.name.toLowerCase().includes(pattern.toLowerCase())
    )
  );

  // Fallback: try matching by language code
  if (!preferredVoice && selectedVoice) {
    const langCode = selectedVoice.language; // e.g., 'en-US', 'en-GB'
    preferredVoice = voices.find(voice =>
      voice.lang === langCode && voice.name.toLowerCase().includes('natural')
    );
  }

  // Final fallback: use the first voice with matching language
  if (!preferredVoice && selectedVoice) {
    const langCode = selectedVoice.language;
    preferredVoice = voices.find(voice => voice.lang === langCode);
  }

  // Gender-aware fallback: if selected voice is female and no match found, prefer female voices
  if (!preferredVoice && selectedVoice && selectedVoice.gender === 'female') {
    // List of known female voice name patterns
    const femaleVoicePatterns = ['zira', 'jenny', 'aria', 'sara', 'michelle', 'eva', 'ana', 'brenda', 'cora', 'elizabeth', 'nancy', 'amber'];
    
    preferredVoice = voices.find(voice =>
      femaleVoicePatterns.some(pattern =>
        voice.name.toLowerCase().includes(pattern.toLowerCase())
      )
    );
    
    if (preferredVoice) {
      console.log('🎤 [speechSynthesisService] Using female voice fallback for female selection:', {
        selectedVoice: selectedVoice.name,
        fallbackVoice: preferredVoice.name
      });
    }
  }

  if (!preferredVoice) {
    console.warn(`[speechSynthesisService] Voice not found for ${selectedVoiceName}, using default`);
    preferredVoice = voices[0];
  }

  console.log('🎤 [speechSynthesisService] Selected voice:', {
    requested: selectedVoiceName,
    voiceId,
    matched: preferredVoice?.name,
    lang: preferredVoice?.lang
  });
  
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  // Store reference to current utterance
  currentStreamingUtterance = utterance;
  
  utterance.onend = () => {
    console.log('🔊 [processSpeechQueue] Utterance ended for text:', text);
    currentStreamingUtterance = null;
    // Process next segment in queue
    processSpeechQueue();
  };
  
  utterance.onerror = (error) => {
    console.error('🔊 [processSpeechQueue] Utterance error:', error);
    currentStreamingUtterance = null;
    // Continue to next segment even on error
    processSpeechQueue();
  };
  
  window.speechSynthesis.speak(utterance);
  console.log('🔊 [processSpeechQueue] Utterance queued for speech');
}

/**
 * Stop currently streaming speech and clear all buffers
 */
export function stopStreamingSpeech(): void {
  console.log('%c🛑 [stopStreamingSpeech] FUNCTION ENTRY', 'background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
  console.log('🛑 [stopStreamingSpeech] window.speechSynthesis available:', !!window.speechSynthesis);
  console.log('🛑 [stopStreamingSpeech] currentStreamingUtterance:', currentStreamingUtterance);
  console.log('🛑 [stopStreamingSpeech] speechChunkBuffer length:', speechChunkBuffer.length);
  console.log('🛑 [stopStreamingSpeech] speechSegmentQueue length:', speechSegmentQueue.length);
  console.log('🛑 [stopStreamingSpeech] isSpeakingQueue:', isSpeakingQueue);
  
  if (window.speechSynthesis) {
    console.log('🛑 [stopStreamingSpeech] Calling window.speechSynthesis.cancel()');
    window.speechSynthesis.cancel();
    currentStreamingUtterance = null;
  }
  
  // Clear the buffer
  speechChunkBuffer = '';
  
  // Clear any pending timeout
  if (speechBufferTimeout !== null) {
    console.log('🛑 [stopStreamingSpeech] Clearing speechBufferTimeout');
    clearTimeout(speechBufferTimeout);
    speechBufferTimeout = null;
  }
  
  // Clear the segment queue
  speechSegmentQueue = [];
  
  // Reset speaking flag
  isSpeakingQueue = false;
  
  console.log('%c✅ [stopStreamingSpeech] Web Speech API stopped, buffers cleared', 'background: #27ae60; color: white; padding: 4px 8px; border-radius: 4px;');
}

/**
 * Cancel any ongoing speech
 */
export const cancelSpeech = () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

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