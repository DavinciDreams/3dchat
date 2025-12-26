// Base types
export type Emotion = 'neutral' | 'happy' | 'thinking' | 'sad';
export type Role = 'user' | 'assistant';
export type ErrorType = 'network' | 'validation' | 'auth' | 'unknown';

// Avatar Model types
export interface CharacterProps {
  position?: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
}

export interface SceneProps {
  cameraPosition?: [number, number, number];
  shadows?: boolean;
}

export interface AnimationAction {
  name: string;
  clip: THREE.AnimationClip;
  action: THREE.AnimationAction;
}

// Message related types
export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
}

// Chat Interface types
export interface ChatMessageProps {
  message: Message;
}

// Chat state management
export interface ChatState {
  messages: Message[];
  processedMessages: ProcessedMessage[];
  isProcessing: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  isMuted: boolean;
  emotion: Emotion;
  visemes: VisemeData[];
  visemeDuration: number;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setProcessedMessage: (message: ProcessedMessage) => void;
  setProcessing: (isProcessing: boolean) => void;
  setSpeaking: (isSpeaking: boolean) => void;
  setListening: (isListening: boolean) => void;
  setIsMuted: (isMuted: boolean) => void;
  setEmotion: (emotion: Emotion) => void;
  setVisemes: (visemes: VisemeData[]) => void;
  setVisemeDuration: (duration: number) => void;
  clearMessages: () => void;
}

// Speech and animation types
export type VisemeName = 
  | 'sil' | 'PP' | 'FF' | 'TH' | 'DD' 
  | 'kk' | 'CH' | 'SS' | 'nn' | 'RR' 
  | 'aa' | 'E'  | 'ih' | 'oh' | 'ou';

export interface VisemeData {
  name: VisemeName;
  weight: number;
  duration?: number;
}

export interface AnimationState {
  visemes: VisemeData[];
  blinkEnabled: boolean;
  idleEnabled: boolean;
  currentAnimation?: string;
  lastUpdate?: number;
  actions?: Record<string, THREE.AnimationAction>;
  mixer?: THREE.AnimationMixer;
}

export interface AnimationConfig {
  duration: number;
  loop?: boolean;
  blendDuration?: number;
  easing?: 'linear' | 'ease-in' | 'ease-out';
}

// Error handling
export interface AppError {
  type: ErrorType;
  message: string;
  code?: number;
  original?: unknown;
  timestamp?: number;
}

export interface ServiceError extends AppError {
  service: 'ai' | 'speech' | 'animation';
  statusCode?: number;
  retry?: boolean;
}

// Configuration
export interface AnimationSettings {
  blinkInterval: number;
  idleAnimationDuration: number;
  transitionDuration?: number;
  enableAutoBlinking?: boolean;
}

export interface AppConfig {
  maxMessages: number;
  apiEndpoint: string;
  defaultEmotion: Emotion;
  animationSettings: AnimationSettings;
  audioSettings?: {
    sampleRate: number;
    channels: number;
    format: string;
  };
}

// Service response types
export interface AIResponse {
  content: string;
  error?: AppError;
}

export interface SpeechResponse {
  audioBuffer: ArrayBuffer;
  visemes: VisemeData[];
  duration: number;
  error?: AppError;
}

export interface TTSResult {
  audioBuffer: ArrayBuffer;
  visemes: VisemeData[];
  duration: number;
}

// Text Preprocessing Types
export interface PreprocessedText {
  original: string;
  cleanText: string;      // For TTS (no emojis, links, asterisks)
  displayText: string;    // For UI (preserves formatting)
  metadata: TextMetadata;
}

export interface TextMetadata {
  emphasis: EmphasisData[];
  emojis: EmojiData[];
  links: LinkData[];
}

export interface EmphasisData {
  text: string;
  startIndex: number;
  endIndex: number;
  type: 'asterisk' | 'caps';
}

export interface EmojiData {
  emoji: string;
  position: number;
  gesture?: string;
}

export interface LinkData {
  url: string;
  displayText: string;
  startIndex: number;
  endIndex: number;
}

export interface ProcessedMessage extends Message {
  metadata?: TextMetadata;
}

// Processor Interface
export interface ITextProcessor {
  name: string;
  priority: number;
  process(text: string, metadata: TextMetadata): {
    cleanText: string;
    displayText: string;
    metadata: TextMetadata;
  };
}