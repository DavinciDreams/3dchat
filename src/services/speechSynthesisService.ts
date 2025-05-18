import axios from 'axios';
import { ServiceError } from '../errors/AppError';

const EDGE_TTS_ENDPOINT = import.meta.env.VITE_EDGE_TTS_ENDPOINT;
const EDGE_TTS_API_KEY = import.meta.env.VITE_EDGE_TTS_API_KEY;
const VOICE_NAME = 'en-US-FableTurboMultilingualNeural';
const FALLBACK_VOICE_NAME = 'Google US English';

let useNativeFallback = false;

export async function textToSpeech(text: string): Promise<ArrayBuffer | null> {
  if (useNativeFallback) {
    return speakWithNative(text);
  }

  try {
    const ssml = `
      <speak version='1.0' xml:lang='en-US'>
        <voice xml:lang='en-US' name='${VOICE_NAME}'>
          <prosody rate="0.9" pitch="+0%">
            ${text}
          </prosody>
        </voice>
      </speak>
    `.trim();

    const response = await axios.post(
      `${EDGE_TTS_ENDPOINT}cognitiveservices/v1`,
      ssml,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': EDGE_TTS_API_KEY,
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
          'Content-Type': 'application/ssml+xml',
          'User-Agent': '3dchat-assistant'
        },
        responseType: 'arraybuffer'
      }
    );

    return response.data;
  } catch (error) {
    console.error('Microsoft TTS error:', error);
    useNativeFallback = true;
    return speakWithNative(text);
  }
}

async function speakWithNative(text: string): Promise<ArrayBuffer | null> {
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
      (voice.lang === 'en-US' && voice.default)
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => resolve(null);
    utterance.onerror = (error) => reject(new ServiceError(
      'speech',
      'unknown',
      'Speech synthesis failed',
      undefined,
      error
    ));
    
    window.speechSynthesis.speak(utterance);
  });
}

export async function playAudio(audioBuffer: ArrayBuffer): Promise<void> {
  if (!audioBuffer) return;

  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioSource = audioContext.createBufferSource();
    
    const decodedData = await audioContext.decodeAudioData(audioBuffer);
    audioSource.buffer = decodedData;
    audioSource.connect(audioContext.destination);
    
    return new Promise((resolve) => {
      audioSource.onended = () => {
        audioContext.close();
        resolve();
      };
      audioSource.start(0);
    });
  } catch (error) {
    console.error('Error playing audio:', error);
    throw new ServiceError(
      'speech',
      'unknown',
      'Failed to play audio',
      undefined,
      error
    );
  }
}