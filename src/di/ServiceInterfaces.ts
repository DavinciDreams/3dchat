/**
 * Service Interfaces for Dependency Injection
 *
 * These interfaces define the contracts that services must implement.
 * Using interfaces allows for:
 * - Dependency inversion (depend on abstractions, not implementations)
 * - Easier mocking for tests
 * - Swapping implementations without breaking code
 */

// Re-export types from main types file
import type {
  Emotion,
  AnimationLayerType,
  AnimationTrigger,
  AnimationJudgment,
  AnimationJudgmentWithTiming,
  ScheduledAnimation,
  QueuedAnimation,
  TextTimeline,
} from '../types';

// ChatMessage type for LLM services
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ============================================================================
// AI Services
// ============================================================================

/**
 * Stream chunk from AI response
 */
export interface AIStreamChunk {
  content: string;
  isComplete: boolean;
}

/**
 * Stream options for AI response
 */
export interface AIStreamOptions {
  onChunk: (chunk: AIStreamChunk) => void;
  onError?: (error: Error) => void;
}

/**
 * State changes that AI service suggests
 * Returned to caller who decides how to update the store
 */
export interface AIStateChanges {
  isProcessing?: boolean;
  emotion?: Emotion;
}

/**
 * AI Service interface for getting AI responses
 *
 * Phase 6: This service returns data instead of manipulating the store directly.
 * The caller is responsible for updating store state based on returned data.
 */
export interface IAIService {
  /**
   * Get a complete AI response
   * @param input - User input message
   * @param messages - Conversation history messages
   * @returns AI response with suggested state changes
   */
  getResponse(
    input: string,
    messages: ChatMessage[]
  ): Promise<{
    content: string;
    stateChanges: AIStateChanges;
  }>;

  /**
   * Stream an AI response with chunk callbacks
   * @param input - User input message
   * @param messages - Conversation history messages
   * @param options - Stream options with callbacks
   * @returns Promise that resolves when streaming completes
   */
  streamResponse(
    input: string,
    messages: ChatMessage[],
    options: AIStreamOptions
  ): Promise<{
    stateChanges: AIStateChanges;
  }>;
}

// ============================================================================
// Type Definitions
// ============================================================================

export interface LLMResponse {
  content: string;
  tool_calls?: Array<{
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

export interface TimelineEvent {
  time: number;
  type: 'animation' | 'emotion' | 'viseme';
  data: unknown;
}

export interface TimelineCoordinatorState {
  status: 'idle' | 'running' | 'paused' | 'stopped';
  currentTime: number;
  duration: number;
  currentEmotion: Emotion;
}

export interface PriorityConfig {
  CRITICAL: string[];
  HIGH: string[];
  MEDIUM: string[];
  LOW: string[];
}

export type TimingStrategy = 'early' | 'middle' | 'late' | 'distributed';

export interface LoadingState {
  status: 'idle' | 'loading' | 'loaded' | 'error';
  error?: string;
}

// ============================================================================
// AI Services
// ============================================================================

/**
 * LLM Client interface for making API calls to language models
 */
export interface ILLMClient {
  /**
   * Send a chat request and get a response
   */
  chat(messages: ChatMessage[]): Promise<LLMResponse>;

  /**
   * Stream a chat response with chunk callbacks
   */
  stream(
     messages: ChatMessage[],
     onChunk: (chunk: string) => void
   ): Promise<void>;
}

/**
 * Animation Judge interface for selecting animations based on conversation context
 */
export interface IAnimationJudge {
  /**
   * Judge which animations to trigger for a conversation exchange
   */
  judge(
     userMessage: string,
     aiResponse: string
   ): Promise<AnimationJudgment>;

  /**
   * Judge with timing information included
   */
  judgeWithTiming(
     userMessage: string,
     aiResponse: string
   ): Promise<AnimationJudgmentWithTiming>;
}

// ============================================================================
// AI Services (additional)
// ============================================================================

/**
 * Animation Selection Service interface for selecting animations
 */
export interface IAnimationSelectionService {
  /**
   * Parse LLM response to extract animation judgment
   */
  parseLLMResponse(toolCalls: Array<{ function: { name: string; arguments: string } }>): AnimationJudgment;

  /**
   * Suggest appropriate layer for an animation
   */
  suggestLayer(animationName: string): AnimationLayerType;

  /**
   * Suggest timing strategy based on AI response
   */
  suggestTiming(aiResponse: string): TimingStrategy;

  /**
   * Create enhanced animation judgment with timing and layer
   */
  createEnhancedJudgment(baseJudgment: AnimationJudgment, aiResponse: string): AnimationJudgmentWithTiming;

  /**
   * Validate animation name
   */
  isValidAnimation(animationName: string): boolean;

  /**
   * Filter to valid animations only
   */
  filterValidAnimations(animations: AnimationTrigger[]): AnimationTrigger[];
}

/**
 * Animation Queue Processor Service interface for processing animation queues
 */
export interface IAnimationQueueProcessorService {
  /**
   * Process animation queue with callbacks
   */
  processAnimationQueue(
    animations: AnimationTrigger[],
    onPlay: (animationName: string) => void,
    onComplete: () => void,
    timeoutTrackingRef?: React.MutableRefObject<NodeJS.Timeout[]>
  ): void;

  /**
   * Distribute animations across timeline
   */
  distributeAnimationsAcrossAudio(
    animations: AnimationTrigger[],
    audioDuration: number,
    timing?: AnimationJudgmentWithTiming['suggestedTiming']
  ): ScheduledAnimation[];

  /**
   * Enhanced judgment with timing
   */
  judgeAnimationsWithTiming(
    baseJudgment: AnimationJudgment,
    aiResponse: string,
    suggestedLayer?: AnimationLayerType,
    suggestedTiming?: AnimationJudgmentWithTiming['suggestedTiming']
  ): AnimationJudgmentWithTiming;

  /**
   * Get buffer time
   */
  getBufferTime(): number;
}

// ============================================================================
// Animation Services
// ============================================================================

/**
 * Animation Loader interface for loading animation files
 */
export interface IAnimationLoader {
  /**
   * Load a single animation
   */
  load(config: { name: string; path: string }): Promise<unknown>;

  /**
   * Load multiple animations in batch
   */
  loadBatch(configs: Array<{ name: string; path: string }>): Promise<
    Map<string, unknown>
  >;
}

/**
 * Animation Cache interface for caching loaded animations
 */
export interface IAnimationCache {
  /**
   * Get cached animation
   */
  get(key: string): unknown | undefined;

  /**
   * Cache an animation
   */
  set(key: string, value: unknown): void;

  /**
   * Check if animation is cached
   */
  has(key: string): boolean;

  /**
   * Clear all cached animations
   */
  clear(): void;

  /**
   * Clear cache for a specific model
   */
  clearForModel(modelId: string): void;
}

/**
 * Animation Retargeter interface for retargeting animations to VRM models
 */
export interface IAnimationRetargeter {
  /**
   * Retarget animation to a specific VRM model
   */
  retarget(
     animation: unknown,
     vrm: unknown,
     modelId: string
   ): unknown;

  /**
   * Clear cached retargeted clips for a model
   */
  clearCacheForModel(modelId: string): void;
}

/**
 * VRMA Loader interface for loading VRMA animation files
 */
export interface IVRMALoaderService {
  /**
   * Load a single VRMA animation file
   */
  loadAnimation(config: { name: string; path: string }): Promise<{
    name: string;
    clip: unknown;
    vrmAnimation: unknown;
  }>;

  /**
   * Load all VRMA animations from a list of configs
   */
  loadAnimations(configs: Array<{ name: string; path: string }>): Promise<
    Map<string, { name: string; clip: unknown; vrmAnimation: unknown }>
  >;
}

/**
 * VRMA Cache interface for caching VRMA animations and retargeted clips
 */
export interface IVMACacheService {
  /**
   * Get cached VRMA animation
   */
  getAnimation(name: string): { name: string; clip: unknown; vrmAnimation: unknown } | undefined;

  /**
   * Cache a VRMA animation
   */
  setAnimation(name: string, animation: { name: string; clip: unknown; vrmAnimation: unknown }): void;

  /**
   * Check if animation is cached
   */
  hasAnimation(name: string): boolean;

  /**
   * Get cached retargeted clip
   */
  getRetargetedClip(modelId: string, animationName: string, layer?: string): unknown | undefined;

  /**
   * Cache a retargeted clip
   */
  setRetargetedClip(modelId: string, animationName: string, layer: string | undefined, clip: unknown): void;

  /**
   * Check if retargeted clip is cached
   */
  hasRetargetedClip(modelId: string, animationName: string, layer?: string): boolean;

  /**
   * Clear all cached animations and retargeted clips
   */
  clear(): void;

  /**
   * Clear retargeted clips for a specific model
   */
  clearRetargetedClipsForModel(modelId: string): void;

  /**
   * Get count of cached animations
   */
  getAnimationCount(): number;

  /**
   * Get all cached animation names
   */
  getAnimationNames(): string[];
}

/**
 * VRMA Retargeting interface for retargeting VRMA animations to VRM models
 */
export interface IVMARetargetingService {
  /**
   * Create a retargeted animation clip for a specific model
   */
  createRetargetedClip(
     vrmAnimation: unknown,
     vrm: unknown,
     modelId: string,
     animationName: string,
     layer?: string
   ): unknown;

  /**
   * Check if a retargeted clip exists in cache
   */
  hasRetargetedClip(modelId: string, animationName: string, layer?: string): boolean;

  /**
   * Clear retargeted clips for a specific model
   */
  clearCacheForModel(modelId: string): void;
}

/**
 * Animation Scheduler interface for queueing animations
 */
export interface IAnimationScheduler {
  /**
   * Schedule a single animation
   */
  schedule(animation: AnimationTrigger): void;

  /**
   * Schedule multiple animations
   */
  scheduleBatch(animations: AnimationTrigger[]): void;

  /**
   * Cancel a scheduled animation
   */
  cancel(id: string): void;

  /**
   * Cancel all scheduled animations
   */
  cancelAll(): void;

  /**
   * Interrupt animations except on specific layers
   */
  interrupt(exceptLayers: AnimationLayerType[]): void;

  /**
   * Get current queue
   */
  getQueue(): AnimationTrigger[];
}

/**
 * Animation Queue interface for queue management
 */
export interface IAnimationQueue {
  /**
   * Add animation to queue
   */
  add(animation: QueuedAnimation): void;

  /**
   * Remove animation from queue
   */
  remove(id: string): void;

  /**
   * Get all queued animations
   */
  getQueue(): QueuedAnimation[];

  /**
   * Get queue length
   */
  getQueueLength(): number;

  /**
   * Clear all queued animations
   */
  clearQueue(): void;

  /**
   * Set active animation for a layer
   */
  setActiveLayer(layer: AnimationLayerType, animation: QueuedAnimation): void;

  /**
   * Get active animation for a layer
   */
  getActiveLayer(layer: AnimationLayerType): QueuedAnimation | null;

  /**
   * Get all active layers
   */
  getAllActiveLayers(): Map<AnimationLayerType, QueuedAnimation>;

  /**
   * Remove active layer
   */
  removeActiveLayer(layer: AnimationLayerType): void;

  /**
   * Clear all active layers
   */
  clearActiveLayers(): void;

  /**
   * Find active animation by ID
   */
  findActiveById(id: string): QueuedAnimation | null;

  /**
   * Get animation counter for generating unique IDs
   */
  getNextId(): string;

  /**
   * Reset queue state
   */
  reset(): void;
}

/**
 * Animation Player interface for playing animations
 */
export interface IAnimationPlayer {
  /**
   * Play an animation and return its ID
   */
  play(animation: AnimationTrigger): Promise<string>;

  /**
   * Stop an animation with fade out
   */
  stop(animationId: string, fadeDuration: number): void;

  /**
   * Pause all animations
   */
  pauseAll(): void;

  /**
   * Resume all animations
   */
  resumeAll(): void;

  /**
   * Get active animations per layer
   */
  getActiveLayers(): Map<AnimationLayerType, string>;
}

/**
 * Animation Timing Distributor interface for timing animations
 */
export interface IAnimationTimingDistributor {
  /**
   * Distribute animations across a timeline
   */
  distribute(
     animations: QueuedAnimation[],
     audioDuration: number,
     strategy: TimingStrategy
   ): ScheduledAnimation[];
}

/**
 * Animation Duration Provider interface for getting animation durations
 */
export interface IAnimationDurationProvider {
  /**
   * Get duration for a specific animation
   */
  getDuration(animationName: string): number;

  /**
   * Get default duration for unknown animations
   */
  getDefaultDuration(): number;
}

/**
 * Animation Priority Provider interface for getting animation priority and fallbacks
 */
export interface IAnimationPriorityProvider {
  /**
   * Get priority tier for an animation
   */
  getPriorityTier(animationName: string): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

  /**
   * Get all animations for a specific priority tier
   */
  getAnimationsByTier(tier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'): readonly string[];

  /**
   * Get fallback animation for a given animation name
   */
  getFallbackAnimation(animationName: string): string;

  /**
   * Check if an animation is in a specific priority tier
   */
  isInTier(animationName: string, tier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'): boolean;

  /**
   * Get all priority tier constants
   */
  getAllPriorityTiers(): {
    CRITICAL: readonly string[];
    HIGH: readonly string[];
    MEDIUM: readonly string[];
    LOW: readonly string[];
  };
}

/**
 * Animation State Service interface for managing animation state
 */
export interface IAnimationStateService {
  /**
   * Get current animation state
   */
  getState(): {
    animationQueue: AnimationTrigger[];
    currentAnimation: string | null;
    animationSpeed: number;
  };

  /**
   * Get animation queue
   */
  getAnimationQueue(): AnimationTrigger[];

  /**
   * Get current animation
   */
  getCurrentAnimation(): string | null;

  /**
   * Get animation speed
   */
  getAnimationSpeed(): number;

  /**
   * Set animation queue
   */
  setAnimationQueue(queue: AnimationTrigger[]): void;

  /**
   * Add animation to queue
   */
  addToQueue(animation: AnimationTrigger): void;

  /**
   * Remove animation from queue
   */
  removeFromQueue(animation: AnimationTrigger): void;

  /**
   * Set current animation
   */
  setCurrentAnimation(animation: string | null): void;

  /**
   * Set animation speed
   */
  setAnimationSpeed(speed: number): void;

  /**
   * Clear animation queue
   */
  clearQueue(): void;

  /**
   * Reset state to initial values
   */
  reset(): void;
}

/**
 * Animation Layer Suggester interface for suggesting animation layers
 */
export interface IAnimationLayerSuggester {
  /**
   * Suggest appropriate layer for an animation
   */
  suggestLayer(animationName: string): AnimationLayerType;
}

/**
 * Animation Layering Service interface for managing animation layers
 */
export interface IAnimationLayeringService {
  /**
   * Apply layering to animations
   */
  applyLayering(animations: unknown[]): unknown[];
}

// ============================================================================
// Timeline Services
// ============================================================================

/**
 * Timeline Manager interface for managing timeline playback
 */
export interface ITimelineManager {
  /**
   * Schedule an event on timeline
   */
  schedule(event: TimelineEvent): void;

  /**
   * Start timeline
   */
  start(duration: number): void;

  /**
   * Stop timeline
   */
  stop(): void;

  /**
   * Pause timeline
   */
  pause(): void;

  /**
   * Resume timeline
   */
  resume(): void;

  /**
   * Get current timeline time
   */
  getCurrentTime(): number;
}

/**
 * Timeline Coordinator interface for coordinating timeline operations
 */
export interface ITimelineCoordinator {
  /**
   * Initialize timeline from text
   */
  initializeFromText(
     text: string,
     animations?: ScheduledAnimation[],
     emotion?: Emotion
   ): void;

  /**
   * Sync timeline with audio duration
   */
  syncWithAudio(audioDuration: number): void;

  /**
   * Append streamed text to timeline
   */
  appendStreamedText(text: string): void;

  /**
   * Start timeline playback
   */
  start(): void;

  /**
   * Pause timeline playback
   */
  pause(): void;

  /**
   * Resume timeline playback
   */
  resume(): void;

  /**
   * Stop timeline playback
   */
  stop(): void;

  /**
   * Get current timeline state
   */
  getState(): TimelineCoordinatorState;
}

/**
 * Timeline State Manager interface for managing timeline state
 */
export interface ITimelineStateManager {
  /**
   * Get current state
   */
  getState(): TimelineCoordinatorState;

  /**
   * Set timeline status
   */
  setStatus(status: TimelineCoordinatorState['status']): void;

  /**
   * Set current time
   */
  setCurrentTime(time: number): void;

  /**
   * Set total duration
   */
  setTotalDuration(duration: number): void;

  /**
   * Set timeline
   */
  setTimeline(timeline: TextTimeline | null): void;

  /**
   * Get timeline
   */
  getTimeline(): TextTimeline | null;

  /**
   * Set has audio flag
   */
  setHasAudio(hasAudio: boolean): void;

  /**
   * Set audio duration
   */
  setAudioDuration(audioDuration: number | null): void;

  /**
   * Set synced flag
   */
  setIsSynced(isSynced: boolean): void;

  /**
   * Set sync ratio
   */
  setSyncRatio(ratio: number): void;

  /**
   * Set error
   */
  setError(error: string | null): void;

  /**
   * Reset state
   */
  reset(): void;

  /**
   * Get current emotion
   */
  getCurrentEmotion(): Emotion;

  /**
   * Set current emotion
   */
  setCurrentEmotion(emotion: Emotion): void;

  /**
   * Get scheduled animations
   */
  getScheduledAnimations(): unknown[];

  /**
   * Set scheduled animations
   */
  setScheduledAnimations(animations: unknown[]): void;

  /**
   * Clear scheduled animations
   */
  clearScheduledAnimations(): void;
}

/**
 * Timeline Scheduler interface for scheduling animations on timeline
 */
export interface ITimelineScheduler {
  /**
   * Schedule animations on timeline
   */
  scheduleAnimations(
    animations: ScheduledAnimation[],
    timeline: TextTimeline
  ): void;

  /**
   * Calculate trigger time for an animation
   */
  calculateTriggerTime(
    animation: ScheduledAnimation,
    timeline: TextTimeline
  ): number;

  /**
   * Adjust timeline duration to match audio
   */
  adjustTimelineDuration(
    timeline: TextTimeline,
    audioDuration: number
  ): TextTimeline;

  /**
   * Execute an animation
   */
  executeAnimation(animation: ScheduledAnimation): void;
}

/**
 * Streaming Text Handler interface for handling streamed text
 */
export interface IStreamingTextHandler {
  /**
   * Append text chunk
   */
  append(text: string): void;

  /**
   * Get accumulated text
   */
  getAccumulatedText(): string;

  /**
   * Get accumulated timeline
   */
  getAccumulatedTimeline(): TextTimeline | null;

  /**
   * Reset handler
   */
  reset(): void;

  /**
   * Get accumulated text length
   */
  getAccumulatedTextLength(): number;
}

/**
 * Emotion Tracker interface for tracking emotions over time
 */
export interface IEmotionTracker {
  /**
   * Set current emotion
   */
  setEmotion(emotion: Emotion): void;

  /**
   * Get current emotion
   */
  getCurrentEmotion(): Emotion;

  /**
   * Schedule emotion change
   */
  scheduleEmotion(emotion: Emotion, time: number): void;
}

// ============================================================================
// Text Services
// ============================================================================

/**
 * Text Timing Estimator interface for estimating text duration
 */
export interface ITextTimingEstimator {
  /**
   * Estimate duration for text
   */
  estimate(text: string): number;

  /**
   * Estimate duration with word-level breakdown
   */
  estimateWithBreakdown(text: string): Array<{
    word: string;
    startTime: number;
    endTime: number;
  }>;
}

// ============================================================================
// Viseme Services
// ============================================================================

/**
 * Viseme Service interface for managing visemes
 */
export interface IVisemeService {
  /**
   * Process text to generate viseme sequence
   */
  processText(text: string): unknown;

  /**
   * Apply viseme to avatar
   */
  applyViseme(viseme: string): void;
}

/**
 * Viseme Application Service interface
 */
export interface IVisemeApplicationService {
  /**
   * Apply viseme sequence
   */
  applySequence(sequence: unknown[]): void;

  /**
   * Clear current viseme
   */
  clear(): void;
}

/**
 * Viseme Preprocessor interface
 */
export interface IVisemePreprocessor {
  /**
   * Preprocess text for viseme generation
   */
  preprocess(text: string): string;
}

// ============================================================================
// Speech Services
// ============================================================================

/**
 * Speech Service interface for speech recognition
 */
export interface ISpeechService {
  /**
   * Start listening for speech
   */
  startListening(): void;

  /**
   * Stop listening
   */
  stopListening(): void;

  /**
   * Check if currently listening
   */
  isListening(): boolean;
}

/**
 * Speech Synthesis Service interface for TTS
 */
export interface ISpeechSynthesisService {
  /**
   * Synthesize speech from text
   */
  speak(text: string): Promise<void>;

  /**
   * Stop current speech
   */
  stop(): void;

  /**
   * Pause speech
   */
  pause(): void;

  /**
   * Resume speech
   */
  resume(): void;

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean;
}

// ============================================================================
// Infrastructure Services
// ============================================================================

/**
 * Configuration Manager interface for accessing configuration
 */
export interface IConfigurationManager {
  /**
   * Get configuration value by path
   */
  get<T>(path: string): T;

  /**
   * Get animation durations
   */
  getAnimationDurations(): Record<string, number>;

  /**
   * Get priority tiers
   */
  getPriorityTiers(): PriorityConfig;

  /**
   * Get system prompt
   */
  getPrompt(name: string): string;

  /**
   * Reload configuration
   */
  reload(): Promise<void>;
}

/**
 * Cache interface for general caching
 */
export interface ICache {
  /**
   * Get cached value
   */
  get<T>(key: string): T | undefined;

  /**
   * Set cached value
   */
  set<T>(key: string, value: T): void;

  /**
   * Check if key exists
   */
  has(key: string): boolean;

  /**
   * Delete cached value
   */
  delete(key: string): void;

  /**
   * Clear all cache
   */
  clear(): void;

  /**
   * Get cache statistics
   */
  getStats(): { size: number; hits: number; misses: number };
}

/**
 * Logger interface for logging
 */
export interface ILogger {
  /**
   * Log debug message
   */
  debug(message: string, context?: unknown): void;

  /**
   * Log info message
   */
  info(message: string, context?: unknown): void;

  /**
   * Log warning message
   */
  warn(message: string, context?: unknown): void;

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: unknown): void;
}
