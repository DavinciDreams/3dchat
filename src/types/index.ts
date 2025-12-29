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
// rotationY: Y-axis rotation in radians to face forward (default: 0)
// Note: Rotation is handled based on VRM version in AvatarModel.tsx:
// - VRM0.x: VRMUtils.rotateVRM0() provides 180° rotation
// - VRM1.0: Additional Math.PI rotation may be applied if needed
// positionY: negative = model origin is above feet, positive = below
export const AVAILABLE_VRM_MODELS: VRMModel[] = [
  { id: 'robot', name: 'Auton', path: '/model/robot.vrm', rotationY: Math.PI, positionY: 0, scale: 1 },
  { id: 'auton2', name: 'Auton 2', path: '/model/auton2.vrm', rotationY: undefined, positionY: 0, scale: 1 },
  { id: 'auton3', name: 'Auton 3', path: '/model/auton3.vrm', rotationY: undefined, positionY: 0, scale: 1 },
  { id: 'auton4', name: 'Auton 4', path: '/model/auton4.vrm', rotationY: undefined, positionY: 0, scale: 1 },
  { id: 'auton5', name: 'Auton 5', path: '/model/auton5.vrm', rotationY: undefined, positionY: 0, scale: 1 },
  { id: 'auton6', name: 'Auton 6', path: '/model/auton6.vrm', rotationY: undefined, positionY: 0, scale: 1 },
  { id: 'auton7', name: 'Auton 7', path: '/model/auton7.vrm', rotationY: undefined, positionY: 0, scale: 1 },
  { id: 'auton8', name: 'Auton 8', path: '/model/auton8.vrm', rotationY: undefined, positionY: 0, scale: 1 },
  { id: 'ancientauton', name: 'Ancient Auton', path: '/model/ancientauton.vrm', rotationY: undefined, positionY: 0, scale: 1 },
  { id: 'ancientauton2', name: 'Ancient Auton 2', path: '/model/ancientauton2.vrm', rotationY: undefined, positionY: 0, scale: 1 },
  // ancientauton3.vrm is missing/corrupted - removed from list
  { id: 'ancientauton4', name: 'Ancient Auton 4', path: '/model/ancientauton4.vrm', rotationY: undefined, positionY: 0, scale: 1 },
  { id: 'ancientauton5', name: 'Ancient Auton 5', path: '/model/ancientauton5.vrm', rotationY: undefined, positionY: 0, scale: 1 },
  { id: 'ancientauton6', name: 'Ancient Auton 6', path: '/model/ancientauton6.vrm', rotationY: undefined, positionY: 0, scale: 1 },
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
  'idle', 'weightShift', 'talkingOnPhone',
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
  // New animations from Meshy AI
  'aimingGun', 'angryGesture_1', 'backflip', 'bashful', 'beckoning', 'blowAKiss', 'boredmelancholyIdle_1', 'buttonPushing', 'cartwheel', 'catwalkTwistLToWalk180', 'catwalkWalkStopTwistR', 'catwalkWalking', 'cockyHeadTurn', 'crouchToStand', 'dancingTwerk', 'defeatIdle', 'disappointed', 'entry', 'fishingCast', 'floating', 'gettingUp', 'golfDrive', 'golfPuttVictory', 'guitarPlaying', 'happyIdle', 'hipHopDancing', 'jumpingDown', 'jumpingJacks', 'kipUp', 'kiss', 'kneeling', 'layingIdle', 'lookAround', 'lookOverShoulder', 'lowCrawl', 'lyingDown', 'militarySignaling', 'nervouslyLookAround', 'ninjaIdle', 'pacingAndTalkingOnAPhone', 'paddling', 'patting', 'pettingAnimal', 'petting', 'pianoPlaying', 'playingDrums', 'playingTheViolin', 'plotting', 'pointing', 'praying', 'pushStart', 'push', 'roar', 'rumbaDancing', 'rummaging', 'runningUpStairs', 'sadIdle', 'sadWalk', 'sambaDancing', 'searchingPockets', 'sexyauton2.temp2169616280', 'shakingHands1', 'shrugging', 'sillyDancing', 'singing_1', 'sitToStand', 'sittingClap', 'sittingDisapproval', 'sittingTalking', 'sitting', 'situps', 'skateboarding', 'smoking', 'sneakingForward', 'sneakyWalking', 'standToSit', 'standardRun', 'standingArguing', 'standingClap', 'standingGreeting', 'standingJump', 'startClimbingLadder', 'startWalking', 'strongGesture', 'swimming', 'talking', 'textingAndWalking', 'thinking', 'throwing', 'twistDance', 'typing', 'vaultOverBox', 'victoryIdle', 'victory', 'waving', 'yawn', 'yelling',
] as const;

// Gesture animations (subtle emotional expressions)
export const GESTURE_ANIMATIONS = [
  // Head gestures
  'headNod', 'hardHeadNod', 'lengthyHeadNod', 'sarcasticHeadNod',
  'shakingHeadNo', 'annoyedHeadShake', 'thoughtfulHeadShake',
  // Hand gestures
  'happyHandGesture', 'dismissingGesture', 'acknowledging',
  // Emotional expressions
  'angryGesture', 'beingCocky', 'relievedSigh', 'lookAwayGesture',
] as const;

// Breakdance animations
export const BREAKDANCE_ANIMATIONS = [
  'breakdance1990', 'breakdance1990_2', 'breakdance1990_2_alt', 'breakdance1990_3',
  'breakdanceEnding1', 'breakdanceEnding2', 'breakdanceEnding3',
  'breakdanceFootwork1', 'breakdanceFootwork2', 'breakdanceFootwork3', 'breakdanceFootworkToFreeze',
  'breakdanceFreezes', 'breakdanceFreezeVar1', 'breakdanceFreezeVar2', 'breakdanceFreezeVar3', 'breakdanceFreezeVar4',
  'breakdanceReady', 'breakdanceReady_2', 'breakdanceReady_3',
  'breakdanceSwipes', 'breakdanceUprock', 'breakdanceUprock_2', 'breakdanceUprockToGround', 'breakdanceUprockToGround_2',
  'breakdanceUprockVar1', 'breakdanceUprockVar1End', 'breakdanceUprockVar1Start', 'breakdanceUprockVar2',
  'brooklynUprock', 'crosslegFreeze', 'flair', 'flair_2', 'flair_3',
] as const;

// All available animations
export const AVAILABLE_ANIMATIONS = [...CORE_ANIMATIONS, ...EXTENDED_ANIMATIONS, ...GESTURE_ANIMATIONS, ...BREAKDANCE_ANIMATIONS] as const;
export type AnimationName = typeof AVAILABLE_ANIMATIONS[number];