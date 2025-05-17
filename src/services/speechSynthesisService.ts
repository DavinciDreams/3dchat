import axios from 'axios';
import { ServiceError } from '../errors/AppError';

const EDGE_TTS_ENDPOINT = 'https://eastus.tts.speech.microsoft.com/cognitiveservices/v1';
const EDGE_TTS_API_KEY = import.meta.env.VITE_EDGE_TTS_API_KEY;
const VOICE_NAME = 'en-US-AriaNeural';
const FALLBACK_VOICE_NAME = 'Google US English';

let useNativeFallback = false;

export async function textToSpeech(text: string): Promise<ArrayBuffer | null> {
  if (useNativeFallback) {
    return speakWithNative(text);
  }

  try {
    const response = await axios.post(
      EDGE_TTS_ENDPOINT,
      `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
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