import { useChatStore } from '../store/chatStore';
import { getAIResponse, textToSpeech } from './aiService';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition: any = null;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
}

export function initSpeechRecognition() {
  if (!recognition) {
    console.error('Speech recognition not supported in this browser');
    return;
  }
  
  recognition.onresult = async (event: any) => {
    const speechResult = event.results[0][0].transcript;
    const store = useChatStore.getState();
    
    // Add the user message
    store.addMessage({
      role: 'user',
      content: speechResult
    });
    
    store.setListening(false);
    
    // Get AI response
    const response = await getAIResponse(speechResult);
    
    // Add AI response to chat
    store.addMessage({
      role: 'assistant',
      content: response
    });
    
    // Convert to speech
    await textToSpeech(response);
  };
  
  recognition.onerror = (event: any) => {
    console.error('Speech recognition error:', event.error);
    useChatStore.getState().setListening(false);
  };
  
  recognition.onend = () => {
    useChatStore.getState().setListening(false);
  };
}

export function startListening() {
  if (!recognition) {
    console.error('Speech recognition not supported');
    return;
  }
  
  useChatStore.getState().setListening(true);
  recognition.start();
}

export function stopListening() {
  if (!recognition) return;
  
  recognition.stop();
  useChatStore.getState().setListening(false);
}

export function playAudio(audioBuffer: ArrayBuffer) {
  if (!audioBuffer) return;
  
  const store = useChatStore.getState();
  store.setSpeaking(true);
  
  const audioContext = new AudioContext();
  audioContext.decodeAudioData(audioBuffer, (buffer) => {
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    
    source.onended = () => {
      store.setSpeaking(false);
    };
    
    source.start();
  });
}