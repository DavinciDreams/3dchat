/**
 * Whisper Speech-to-Text Service
 *
 * Provides cloud-based speech recognition using Groq's free Whisper API.
 * Used as a fallback when native Web Speech API is not available (e.g., Firefox).
 *
 * To use: Add VITE_GROQ_API_KEY to your .env file
 * Get a free API key at: https://console.groq.com
 */

import { useChatStore } from '../store/chatStore';

// Groq API endpoint for Whisper
const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

// Audio recording state
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let audioStream: MediaStream | null = null;

/**
 * Check if Whisper fallback is configured
 */
export function isWhisperConfigured(): boolean {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  return !!apiKey && apiKey.length > 0;
}

/**
 * Start recording audio from microphone
 */
export async function startWhisperRecording(): Promise<void> {
  const store = useChatStore.getState();

  try {
    // Request microphone access
    audioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 16000
      }
    });

    audioChunks = [];

    // Create MediaRecorder with webm format (widely supported)
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    mediaRecorder = new MediaRecorder(audioStream, { mimeType });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      // Process the recorded audio
      await processRecordedAudio();
    };

    mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event);
      store.setListening(false);
      cleanupRecording();
    };

    // Start recording
    mediaRecorder.start(100); // Collect data every 100ms
    store.setListening(true);

    console.log('🎤 [Whisper] Recording started');
  } catch (error) {
    console.error('Error starting Whisper recording:', error);
    store.setListening(false);
    throw error;
  }
}

/**
 * Stop recording and transcribe audio
 */
export function stopWhisperRecording(): void {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    console.log('🎤 [Whisper] Recording stopped, processing...');
  }

  // Clean up the audio stream
  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop());
    audioStream = null;
  }
}

/**
 * Process recorded audio and send to Whisper API
 */
async function processRecordedAudio(): Promise<void> {
  const store = useChatStore.getState();

  if (audioChunks.length === 0) {
    console.warn('[Whisper] No audio data recorded');
    store.setListening(false);
    return;
  }

  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    console.error('[Whisper] VITE_GROQ_API_KEY not configured');
    store.setListening(false);
    alert('Speech recognition fallback requires a Groq API key.\n\nAdd VITE_GROQ_API_KEY to your .env file.\nGet a free key at: https://console.groq.com');
    return;
  }

  try {
    // Create audio blob
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

    // Check if audio is too short (likely just noise)
    if (audioBlob.size < 1000) {
      console.warn('[Whisper] Audio too short, ignoring');
      store.setListening(false);
      return;
    }

    console.log(`🎤 [Whisper] Sending ${(audioBlob.size / 1024).toFixed(1)}KB audio to Groq...`);

    // Create form data for API request
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'en');
    formData.append('response_format', 'json');

    // Send to Groq Whisper API
    const response = await fetch(GROQ_WHISPER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Whisper API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const transcript = result.text?.trim();

    if (transcript) {
      console.log(`🎤 [Whisper] Transcribed: "${transcript}"`);

      // Emit the transcript through the speech service callback
      if (typeof window !== 'undefined' && (window as any).__whisperCallback) {
        (window as any).__whisperCallback(transcript);
      }
    } else {
      console.warn('[Whisper] No speech detected');
    }

  } catch (error) {
    console.error('[Whisper] Transcription error:', error);
    alert('Speech transcription failed. Please try again.');
  } finally {
    store.setListening(false);
    cleanupRecording();
  }
}

/**
 * Clean up recording resources
 */
function cleanupRecording(): void {
  audioChunks = [];
  mediaRecorder = null;

  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop());
    audioStream = null;
  }
}

/**
 * Set callback for when transcription is complete
 */
export function setWhisperCallback(callback: (transcript: string) => void): void {
  if (typeof window !== 'undefined') {
    (window as any).__whisperCallback = callback;
  }
}

/**
 * Check if currently recording
 */
export function isWhisperRecording(): boolean {
  return mediaRecorder !== null && mediaRecorder.state === 'recording';
}
