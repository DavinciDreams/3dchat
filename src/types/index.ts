// Base types
export type Emotion = 'neutral' | 'happy' | 'thinking' | 'sad';
export type Role = 'user' | 'assistant';
export type ErrorType = 'network' | 'validation' | 'auth' | 'unknown';

// VRM Model types
export interface VRMModel {
  id: string;
  name: string;
  path: string;
  // Normalization adjustments (models have different default orientations/positions)
  rotationY?: number;      // Y-axis rotation in radians to face forward (default: 0)
  positionY?: number;      // Y-axis offset to align feet with ground (default: 0)
  scale?: number;          // Scale multiplier (default: 1)
}

// Model configurations with normalization adjustments
// rotationY: Math.PI = 180° (faces backward by default)
// positionY: negative = model origin is above feet, positive = below
export const AVAILABLE_VRM_MODELS: VRMModel[] = [
  { id: 'billy', name: 'Billy', path: '/model/Billy.vrm', rotationY: 0, positionY: 0, scale: 1 },
  { id: 'glenda', name: 'Glenda', path: '/model/Glenda.vrm', rotationY: 0, positionY: 0, scale: 1 },
  { id: 'mega', name: 'Mega', path: '/model/Mega.vrm', rotationY: 0, positionY: 0, scale: 1 },
  { id: 'peach', name: 'Peach', path: '/model/peach.vrm', rotationY: Math.PI, positionY: 0, scale: 1 },
  { id: 'robot', name: 'Auton', path: '/model/robot.vrm', rotationY: 0, positionY: 0, scale: 1 },
];

// Voice types
export interface Voice {
  id: string;
  name: string;
  displayName: string;
  gender: 'male' | 'female';
  language: string;
}

export const AVAILABLE_VOICES: Voice[] = [
  // US English - Female
  { id: 'aria', name: 'en-US-AriaNeural', displayName: 'Aria', gender: 'female', language: 'en-US' },
  { id: 'jenny', name: 'en-US-JennyNeural', displayName: 'Jenny', gender: 'female', language: 'en-US' },
  { id: 'michelle', name: 'en-US-MichelleNeural', displayName: 'Michelle', gender: 'female', language: 'en-US' },
  { id: 'sara', name: 'en-US-SaraNeural', displayName: 'Sara', gender: 'female', language: 'en-US' },
  { id: 'nancy', name: 'en-US-NancyNeural', displayName: 'Nancy', gender: 'female', language: 'en-US' },
  { id: 'jane', name: 'en-US-JaneNeural', displayName: 'Jane', gender: 'female', language: 'en-US' },
  // US English - Male
  { id: 'guy', name: 'en-US-GuyNeural', displayName: 'Guy', gender: 'male', language: 'en-US' },
  { id: 'davis', name: 'en-US-DavisNeural', displayName: 'Davis', gender: 'male', language: 'en-US' },
  { id: 'tony', name: 'en-US-TonyNeural', displayName: 'Tony', gender: 'male', language: 'en-US' },
  { id: 'jason', name: 'en-US-JasonNeural', displayName: 'Jason', gender: 'male', language: 'en-US' },
  { id: 'brandon', name: 'en-US-BrandonNeural', displayName: 'Brandon', gender: 'male', language: 'en-US' },
  // UK English - Female
  { id: 'libby', name: 'en-GB-LibbyNeural', displayName: 'Libby', gender: 'female', language: 'en-GB' },
  { id: 'sonia', name: 'en-GB-SoniaNeural', displayName: 'Sonia', gender: 'female', language: 'en-GB' },
  { id: 'maisie', name: 'en-GB-MaisieNeural', displayName: 'Maisie', gender: 'female', language: 'en-GB' },
  // UK English - Male
  { id: 'ryan', name: 'en-GB-RyanNeural', displayName: 'Ryan', gender: 'male', language: 'en-GB' },
  { id: 'thomas', name: 'en-GB-ThomasNeural', displayName: 'Thomas', gender: 'male', language: 'en-GB' },
  { id: 'alfie', name: 'en-GB-AlfieNeural', displayName: 'Alfie', gender: 'male', language: 'en-GB' },
  // Australian English
  { id: 'natasha', name: 'en-AU-NatashaNeural', displayName: 'Natasha', gender: 'female', language: 'en-AU' },
  { id: 'william', name: 'en-AU-WilliamNeural', displayName: 'William', gender: 'male', language: 'en-AU' },
  // Irish English
  { id: 'emily', name: 'en-IE-EmilyNeural', displayName: 'Emily', gender: 'female', language: 'en-IE' },
  { id: 'connor', name: 'en-IE-ConnorNeural', displayName: 'Connor', gender: 'male', language: 'en-IE' },
  // Indian English
  { id: 'neerja', name: 'en-IN-NeerjaNeural', displayName: 'Neerja', gender: 'female', language: 'en-IN' },
  { id: 'prabhat', name: 'en-IN-PrabhatNeural', displayName: 'Prabhat', gender: 'male', language: 'en-IN' },
];

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

// Animation Queue Types (forward declaration for ChatState)
export interface AnimationTrigger {
  name: string;           // Animation name: 'spin', 'squat', etc.
  delay?: number;         // Seconds to wait before playing
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
  selectedModelId: string;
  selectedVoiceId: string;
  animationQueue: AnimationTrigger[];
  currentAnimation: string | null;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setProcessedMessage: (message: ProcessedMessage) => void;
  setProcessing: (isProcessing: boolean) => void;
  setSpeaking: (isSpeaking: boolean) => void;
  setListening: (isListening: boolean) => void;
  setIsMuted: (isMuted: boolean) => void;
  setEmotion: (emotion: Emotion) => void;
  setVisemes: (visemes: VisemeData[]) => void;
  setVisemeDuration: (duration: number) => void;
  setSelectedModelId: (modelId: string) => void;
  setSelectedVoiceId: (voiceId: string) => void;
  setAnimationQueue: (queue: AnimationTrigger[]) => void;
  setCurrentAnimation: (animation: string | null) => void;
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

// Animation Judge Types
export interface AnimationJudgment {
  animations: AnimationTrigger[];
  reasoning: string;
}

// Core animations (from VRM Motion Pack)
export const CORE_ANIMATIONS = [
  'greeting',    // Wave hello
  'peace',       // Peace sign
  'shoot',       // Finger guns
  'spin',        // Playful spin
  'modelPose',   // Idle pose
  'squat',       // Squat down
] as const;

// Extended animations (converted from Mixamo FBX files)
export const EXTENDED_ANIMATIONS = [
  // Idle & Standing
  'idle', 'talkingOnPhone',
  // Greetings & Social
  'bowing', 'salute', 'singing',
  // Dance & Celebration
  'hipHopDance', 'swinging', 'catwalk',
  // Combat & Action
  'punch', 'dropKick', 'flyingKnee', 'daggerStab', 'bodyBlock', 'centerBlock', 'catch', 'snatch', 'reloading', 'magicCast',
  // Movement
  'walking', 'jogBackwards', 'jumping', 'climbing', 'takeCover', 'zombieStandUp', 'plank', 'openDoor', 'turnLeft', 'turnRight',
  // Sports & Activities
  'golfBadShot', 'golfPrePutt',
] as const;

// All available animations
export const AVAILABLE_ANIMATIONS = [...CORE_ANIMATIONS, ...EXTENDED_ANIMATIONS] as const;
export type AnimationName = typeof AVAILABLE_ANIMATIONS[number];