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

// ChatMessage type for AI services
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
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
  selectedModelId: string;
  selectedVoiceId: string;
  animationQueue: AnimationTrigger[];
  currentAnimation: string | null;
  animationSpeed: number;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setProcessedMessage: (message: ProcessedMessage) => void;
  setProcessing: (isProcessing: boolean) => void;
  setSpeaking: (isSpeaking: boolean) => void;
  setListening: (isListening: boolean) => void;
  setIsMuted: (isMuted: boolean) => void;
  setEmotion: (emotion: Emotion) => void;
  setSelectedModelId: (modelId: string) => void;
  setSelectedVoiceId: (voiceId: string) => void;
  setAnimationQueue: (queue: AnimationTrigger[]) => void;
  setCurrentAnimation: (animation: string | null) => void;
  setAnimationSpeed: (speed: number) => void;
  clearMessages: () => void;
}

// Speech and animation types
export interface AnimationState {
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
  duration: number;
  error?: AppError;
}

export interface TTSResult {
  audioBuffer: ArrayBuffer;
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
  'idle', 'weightShift', 'talkingOnPhone', 'sadIdle', 'acknowledging',
  // Greetings & Social
  'bowing', 'salute', 'singing', 'shakingHands1', 'standingClap', 'standingGreeting', 'waving', 'yelling',
  // Dance & Celebration
  'hipHopDance', 'swinging', 'catwalk', 'rumbaDancing', 'sambaDancing',
  // Combat & Action
  'punch', 'dropKick', 'flyingKnee', 'daggerStab', 'bodyBlock', 'catch', 'snatch', 'reloading', 'magicCast',
  // Movement
  'walking', 'jogBackwards', 'jumping', 'climbing', 'zombieStandUp', 'turnRight', 'catwalkWalkStopTwistR', 'kipUp', 'paddling', 'sadWalk', 'skateboarding', 'standingArguing', 'standingJump', 'startWalking', 'strongGesture', 'swimming', 'throwing', 'twistDance', 'typing',
  // Sports & Activities
  'golfBadShot', 'golfPrePutt', 'golfDrive', 'golfPuttVictory',
  // New animations from Meshy AI
  'aimingGun', 'angryGesture_1', 'backflip', 'bashful', 'beckoning', 'blowAKiss', 'boredmelancholyIdle_1', 'buttonPushing', 'cartwheel', 'catwalkTwistLToWalk180', 'catwalkWalking', 'cockyHeadTurn', 'crouchToStand', 'dancingTwerk', 'defeatIdle', 'disappointed', 'entry', 'fishingCast', 'floating', 'gettingUp', 'guitarPlaying', 'happyIdle', 'hipHopDancing', 'jumpingDown', 'jumpingJacks', 'kiss', 'kneeling', 'layingIdle', 'lookAround', 'lookOverShoulder', 'lowCrawl', 'lyingDown', 'militarySignaling', 'nervouslyLookAround', 'pacingAndTalkingOnAPhone', 'patting', 'pettingAnimal', 'petting', 'pianoPlaying', 'playingDrums', 'playingTheViolin', 'plotting', 'praying', 'roar', 'rummaging', 'runningUpStairs', 'searchingPockets', 'shrugging', 'sillyDancing', 'singing_1', 'sitToStand', 'sittingDisapproval', 'sittingTalking', 'sitting', 'situps', 'smoking', 'sneakingForward', 'sneakyWalking', 'standToSit', 'standardRun', 'startClimbingLadder', 'talking', 'textingAndWalking', 'thinking', 'vaultOverBox', 'victoryIdle', 'yawn',
] as const;

// Gesture animations (subtle emotional expressions)
export const GESTURE_ANIMATIONS = [
  // Head gestures
  'headNod', 'hardHeadNod', 'lengthyHeadNod', 'sarcasticHeadNod',
  'shakingHeadNo', 'annoyedHeadShake', 'thoughtfulHeadShake',
  // Hand gestures
  'happyHandGesture', 'dismissingGesture', 'pointing', 'thumbsUp', 'thumbsDown',
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

// ============================================
// Parallel Execution Strategy Types
// ============================================

// Animation layer types for layered animation playback
export type AnimationLayerType =
  | 'full_body'      // High priority, overrides everything
  | 'upper_body'      // Can layer over lower body
  | 'lower_body'      // Can layer under upper body
  | 'gesture'         // Hand/head gestures, lowest priority
  | 'idle';           // Default state

// Timeline event types
export type TimelineEventType = 'animation' | 'emotion' | 'custom';

// Timeline event for scheduling time-based callbacks
export interface TimelineEvent {
  id: string;
  timestamp: number;  // Absolute timestamp or relative to audio start
  type: TimelineEventType;
  data: unknown;
  callback: () => void;
  priority?: number;  // For event ordering at same timestamp
}

// Timeline manager options
export interface TimelineOptions {
  tickRate?: number;  // ms between ticks (default: ~16ms for 60fps)
  maxLookahead?: number;  // ms to look ahead for events
}

// Scheduled animation with timing information
export interface ScheduledAnimation {
  name: string;
  triggerTime: number;  // Milliseconds from audio start
  duration: number;     // Animation duration in ms
  layer?: AnimationLayerType;
  interruptible?: boolean;
}

// Queued animation for the animation queue service
export interface QueuedAnimation {
  id: string;
  name: string;
  layer: AnimationLayerType;
  startTime: number;
  duration: number;
  blendIn: number;
  blendOut: number;
  interruptible: boolean;
  fadeIn?: number;
  fadeOut?: number;
}

// Animation layer configuration
export interface AnimationLayer {
  id: string;
  priority: number;  // Higher = more important
  currentAnimation: string | null;
  blendWeight: number;  // 0-1
}

// Animation queue service options
export interface AnimationQueueOptions {
  mixer: THREE.AnimationMixer;
  timelineManager: TimelineManager;
  defaultBlendDuration?: number;
}

// Prefetch service options
export interface PrefetchOptions {
  batchSize?: number;
  priority?: 'speed' | 'completeness';
  timeout?: number;
}

// Prefetch result
export interface PrefetchResult {
  successful: string[];
  failed: Array<{ name: string; error: string }>;
  duration: number;
}

// Audio playback options with event callbacks
export interface AudioPlaybackOptions {
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onInterrupted?: () => void;
  onError?: (error: Error) => void;
}

// TTS result with prefetch information
export interface TTSWithPrefetchResult extends TTSResult {
  prefetchedAnimations: string[];
  prefetchDuration: number;
}

// Enhanced animation judgment with timing and layer suggestions
export interface AnimationJudgmentWithTiming extends AnimationJudgment {
  // Suggested timing relative to audio
  suggestedTiming?: 'early' | 'middle' | 'late' | 'distributed';
  // Layer suggestions
  suggestedLayer?: AnimationLayerType;
  // Interruptibility
  interruptible?: boolean;
}

// Timeline state for store
export interface TimelineState {
  // Timeline status
  isPlaying: boolean;
  startTime: number | null;
  currentTime: number;
  duration: number;
  
  // Scheduled events
  scheduledAnimations: ScheduledAnimation[];
  scheduledEmotions: Array<{ emotion: Emotion; time: number }>;
  
  // Active state
  activeAnimations: Map<AnimationLayerType, string>;
  currentEmotion: Emotion;
  
  // Actions
  startTimeline: (duration: number) => void;
  stopTimeline: () => void;
  scheduleAnimation: (animation: ScheduledAnimation) => void;
  scheduleEmotion: (emotion: Emotion, time: number) => void;
  updateCurrentTime: (time: number) => void;
  clearTimeline: () => void;
}

// Layer priorities
export const LAYER_PRIORITIES: Record<AnimationLayerType, number> = {
  full_body: 100,
  upper_body: 75,
  lower_body: 50,
  gesture: 25,
  idle: 0
};

// Parallel execution configuration
export interface ParallelExecutionConfig {
  enabled: boolean;
  prefetchBatchSize: number;
  prefetchTimeout: number;
  timelineTickRate: number;
  maxTimelineDrift: number;
  defaultBlendDuration: number;
  animationLayerPriorities: Record<AnimationLayerType, number>;
}

export const DEFAULT_PARALLEL_EXECUTION_CONFIG: ParallelExecutionConfig = {
  enabled: true,
  prefetchBatchSize: 3,
  prefetchTimeout: 5000,
  timelineTickRate: 16,  // ~60fps
  maxTimelineDrift: 100,
  defaultBlendDuration: 300,
  animationLayerPriorities: {
    full_body: 100,
    upper_body: 75,
    lower_body: 50,
    gesture: 25,
    idle: 0
  }
};

// Parallel execution metrics
export interface ParallelExecutionMetrics {
  // Pipeline timing
  ttsDuration: number;
  prefetchDuration: number;
  totalPipelineDuration: number;
  
  // Animation timing
  animationLoadSuccess: number;
  animationLoadFailure: number;
  animationTriggerAccuracy: number;  // ms difference from target
  
  // Timeline metrics
  timelineDrift: number;
  eventsTriggered: number;
  eventsMissed: number;
  
  // User experience
  perceivedLatency: number;
  syncQuality: number;  // 0-100 score
}

// Parallel execution error types
export enum ParallelExecutionError {
  TTS_FAILURE = 'tts_failure',
  PREFETCH_FAILURE = 'prefetch_failure',
  TIMELINE_DRIFT = 'timeline_drift',
  EVENT_MISSED = 'event_missed',
  SYNC_FAILURE = 'sync_failure',
  AUDIO_INTERRUPTED = 'audio_interrupted'
}

// ============================================
// Text-Based Timing System Types
// ============================================

/**
 * Options for TextTimingEstimator
 */
export interface TextTimingEstimatorOptions {
  // Word-based timing (milliseconds per word)
  wordsPerMinute?: number;
  minWordDuration?: number;
  maxWordDuration?: number;

  // Character-based timing (milliseconds per character)
  msPerCharacter?: number;
  msPerSpace?: number;

  // Punctuation pauses (milliseconds)
  pauseAfterComma?: number;
  pauseAfterPeriod?: number;
  pauseAfterQuestion?: number;
  pauseAfterExclamation?: number;
  pauseAfterColon?: number;
  pauseAfterSemicolon?: number;
  pauseAfterDash?: number;

  // Sentence pauses
  pauseBetweenSentences?: number;
  pauseBetweenParagraphs?: number;

  // Emphasis modifiers
  emphasisMultiplier?: number;
  emphasisPause?: number;

  // Word count adjustments
  shortWordThreshold?: number;
  shortWordMultiplier?: number;
  longWordThreshold?: number;
  longWordMultiplier?: number;

  // Calibration
  calibrationFactor?: number;
  calibrationOffset?: number;

  // Streaming support
  streamingChunkSize?: number;
  streamingBufferMs?: number;

  // Edge cases
  minTotalDuration?: number;
  maxTotalDuration?: number;
  emptyTextDuration?: number;

  // Logging
  enableDebugLogging?: boolean;
  logTimingBreakdown?: boolean;
}

/**
 * Represents a segment of text with timing information
 */
export interface TextSegment {
  /** The text content of this segment */
  text: string;

  /** Start position in original text (character index) */
  startIndex: number;

  /** End position in original text (character index) */
  endIndex: number;

  /** Estimated duration in milliseconds */
  duration: number;

  /** Start time relative to beginning (milliseconds) */
  startTime: number;

  /** End time relative to beginning (milliseconds) */
  endTime: number;

  /** Type of segment (word, pause, punctuation, etc.) */
  type: 'word' | 'pause' | 'punctuation' | 'sentence' | 'paragraph';

  /** Whether this segment contains emphasized text */
  isEmphasized: boolean;

  /** If this is a pause, the pause duration in milliseconds */
  pauseDuration?: number;

  /** Punctuation character if this is a punctuation segment */
  punctuation?: string;
}

/**
 * Complete timeline built from text analysis
 */
export interface TextTimeline {
  /** The original text that was analyzed */
  originalText: string;

  /** All text segments with timing information */
  segments: TextSegment[];

  /** Total estimated duration in milliseconds */
  totalDuration: number;

  /** Word count */
  wordCount: number;

  /** Sentence count */
  sentenceCount: number;

  /** Character count (excluding spaces) */
  characterCount: number;

  /** Timestamp when timeline was created */
  createdAt: number;
}

/**
 * Analysis results from text timing estimation
 */
export interface TextAnalysis {
  /** The text that was analyzed */
  text: string;

  /** Estimated total duration in milliseconds */
  estimatedDuration: number;

  /** Word count */
  wordCount: number;

  /** Sentence count */
  sentenceCount: number;

  /** Character count */
  characterCount: number;

  /** Average words per minute based on estimation */
  wordsPerMinute: number;

  /** Average duration per word (milliseconds) */
  avgWordDuration: number;

  /** Total pause time (milliseconds) */
  totalPauseTime: number;

  /** Percentage of time spent on pauses */
  pausePercentage: number;

  /** Breakdown by segment type */
  segmentBreakdown: {
    words: number;
    pauses: number;
    punctuation: number;
    sentences: number;
    paragraphs: number;
  };

  /** Emphasized segments */
  emphasizedSegments: Array<{
    text: string;
    startIndex: number;
    endIndex: number;
    duration: number;
  }>;
}

/**
 * State of the TimelineCoordinator
 */
export interface TimelineCoordinatorState {
  /** Current state of the coordinator */
  status: 'idle' | 'initialized' | 'running' | 'paused' | 'completed' | 'error';

  /** The text timeline being used */
  timeline: TextTimeline | null;

  /** Current position in timeline (milliseconds) */
  currentTime: number;

  /** Total duration of timeline (milliseconds) */
  totalDuration: number;

  /** Whether audio is available for sync */
  hasAudio: boolean;

  /** Audio duration if available (milliseconds) */
  audioDuration: number | null;

  /** Whether timeline is synchronized with audio */
  isSynced: boolean;

  /** Sync ratio (text duration / audio duration) */
  syncRatio: number;

  /** Last error if any */
  error: string | null;

  /** Timestamp when state was last updated */
  lastUpdated: number;
}

/**
 * Options for TimelineCoordinator initialization
 */
export interface TimelineCoordinatorOptions {
  /** TextTimingEstimator instance to use */
  estimator: TextTimingEstimator;

  /** TimelineManager instance to coordinate with */
  timelineManager: unknown; // Use unknown to avoid circular dependency with TimelineManager class

  /** Whether to enable debug logging */
  debug?: boolean;

  /** Maximum allowed sync drift (milliseconds) */
  maxSyncDrift?: number;

  /** Whether to auto-sync with audio when available */
  autoSync?: boolean;
}

/**
 * Text timing estimator class type
 */
export interface TextTimingEstimator {
  /**
   * Estimate duration for a given text
   * @param text - The text to estimate duration for
   * @returns Estimated duration in milliseconds
   */
  estimateDuration(text: string): number;

  /**
   * Build a complete timeline from text
   * @param text - The text to build timeline from
   * @returns Complete TextTimeline with segments
   */
  buildTimeline(text: string): TextTimeline;

  /**
   * Analyze text and return detailed analysis
   * @param text - The text to analyze
   * @returns Detailed TextAnalysis
   */
  analyzeText(text: string): TextAnalysis;

  /**
   * Calibrate the estimator based on actual audio duration
   * @param text - The text that was spoken
   * @param actualDuration - The actual audio duration in milliseconds
   */
  calibrate(text: string, actualDuration: number): void;

  /**
   * Reset calibration to default values
   */
  resetCalibration(): void;

  /**
   * Get current calibration factor
   */
  getCalibrationFactor(): number;

  /**
   * Set timing options
   * @param options - New options to apply
   */
  setOptions(options: Partial<TextTimingEstimatorOptions>): void;

  /**
   * Get current timing options
   */
  getOptions(): TextTimingEstimatorOptions;
}

/**
 * Timeline coordinator class type
 */
export interface TimelineCoordinator {
  /**
   * Initialize coordinator from text
   * @param text - The text to initialize from
   * @param animations - Optional animations to schedule
   * @param emotion - Optional starting emotion
   */
  initializeFromText(text: string, animations?: ScheduledAnimation[], emotion?: Emotion): void;

  /**
   * Sync timeline with actual audio duration
   * @param audioDuration - The actual audio duration in milliseconds
   */
  syncWithAudio(audioDuration: number): void;

  /**
   * Append streamed text (for streaming scenarios)
   * @param text - The new text to append
   */
  appendStreamedText(text: string): void;

  /**
   * Start the timeline
   */
  start(): void;

  /**
   * Pause the timeline
   */
  pause(): void;

  /**
   * Resume the timeline
   */
  resume(): void;

  /**
   * Stop the timeline
   */
  stop(): void;

  /**
   * Get current state
   */
  getState(): TimelineCoordinatorState;

  /**
   * Get current progress (0-1)
   */
  getProgress(): number;

  /**
   * Get current time in milliseconds
   */
  getCurrentTime(): number;

  /**
   * Get total duration in milliseconds
   */
  getTotalDuration(): number;

  /**
   * Get the text timeline
   */
  getTimeline(): TextTimeline | null;

  /**
   * Check if timeline is running
   */
  isRunning(): boolean;

  /**
   * Check if timeline is synchronized with audio
   */
  isSynced(): boolean;

  /**
   * Reset coordinator state
   */
  reset(): void;
}