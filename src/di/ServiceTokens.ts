/**
 * Service tokens for dependency injection
 *
 * These tokens are used to uniquely identify services in the DI container.
 * Using string tokens instead of types allows for better flexibility and debugging.
 */

export const SERVICE_TOKENS = {
  // AI Services
  LLM_CLIENT: 'services.llm.client',
  AI_SERVICE: 'services.ai',

  // Animation Services
  ANIMATION_JUDGE: 'services.animation.judge',
  ANIMATION_LOADER: 'services.animation.loader',
  ANIMATION_CACHE: 'services.animation.cache',
  ANIMATION_RETARGETER: 'services.animation.retargeter',
  ANIMATION_SCHEDULER: 'services.animation.scheduler',
  ANIMATION_PLAYER: 'services.animation.player',
  ANIMATION_TIMING_DISTRIBUTOR: 'services.animation.timingDistributor',
  ANIMATION_DURATION_PROVIDER: 'services.animation.durationProvider',
  ANIMATION_PRIORITY_PROVIDER: 'services.animation.priorityProvider',
  ANIMATION_STATE_SERVICE: 'services.animation.state',
  ANIMATION_LAYER_SUGGESTER: 'services.animation.layerSuggester',
  ANIMATION_LAYERING: 'services.animation.layering',
  ANIMATION_SELECTION_SERVICE: 'services.animation.selection',
  ANIMATION_QUEUE_PROCESSOR_SERVICE: 'services.animation.queueProcessor',
  
  // VRMA Services
  VRMA_LOADER: 'services.vrma.loader',
  VRMA_CACHE: 'services.vrma.cache',
  VRMA_RETARGETING: 'services.vrma.retargeting',

  // Timeline Services
  TIMELINE_COORDINATOR: 'services.timeline.coordinator',
  TIMELINE_STATE_MANAGER: 'services.timeline.stateManager',
  TIMELINE_MANAGER: 'services.timeline.manager',
  STREAMING_TEXT_HANDLER: 'services.timeline.streamingHandler',
  EMOTION_TRACKER: 'services.timeline.emotionTracker',

  // Text Services
  TEXT_TIMING_ESTIMATOR: 'services.textTiming',

  // Viseme Services
  VISERVICE_SERVICE: 'services.viseme',
  VISERVICE_APPLICATION: 'services.viseme.application',
  VISERVICE_PREPROCESSOR: 'services.viseme.preprocessor',

  // Speech Services
  SPEECH_SERVICE: 'services.speech',
  SPEECH_SYNTHESIS: 'services.speech.synthesis',

  // Infrastructure Services
  CONFIGURATION: 'infrastructure.config',
  CACHE: 'infrastructure.cache',
  LOGGER: 'infrastructure.logger',
} as const;

/**
 * Type for service token values
 */
export type ServiceToken = (typeof SERVICE_TOKENS)[keyof typeof SERVICE_TOKENS];
