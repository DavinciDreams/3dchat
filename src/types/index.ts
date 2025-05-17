export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatState {
  messages: Message[];
  isProcessing: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  emotion: 'neutral' | 'happy' | 'thinking';
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setProcessing: (isProcessing: boolean) => void;
  setSpeaking: (isSpeaking: boolean) => void;
  setListening: (isListening: boolean) => void;
  setEmotion: (emotion: 'neutral' | 'happy' | 'thinking') => void;
  clearMessages: () => void;
}

export interface VisemeData {
  name: string; 
  weight: number;
}

export interface AnimationState {
  visemes: VisemeData[];
  blinkEnabled: boolean;
  idleEnabled: boolean;
}