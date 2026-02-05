/**
 * Service Mock Factories
 *
 * Provides mock implementations of service interfaces for testing
 * These mocks allow testing services without actual implementations
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { vi } from 'vitest';
import type {
  ILLMClient,
  IAnimationJudge,
  IAnimationLoader,
  IAnimationCache,
  IAnimationScheduler,
  IAnimationPlayer,
  IAnimationTimingDistributor,
  IAnimationDurationProvider,
  IAnimationLayerSuggester,
  ITimelineManager,
  ITimelineCoordinator,
  ITextTimingEstimator,
  IVisemeService,
  ISpeechService,
  ISpeechSynthesisService,
  IConfigurationManager,
  ICache,
  ILogger,
  ChatMessage,
  QueuedAnimation,
  ScheduledAnimation,
  PriorityConfig,
  TimelineEvent,
  TimelineCoordinatorState,
  AnimationLayerType,
} from '../../di/ServiceInterfaces';

/**
 * Create a mock LLM Client
 */
export function createMockLLMClient(): ILLMClient {
  return {
    chat: vi.fn(),
    stream: vi.fn(),
  };
}

/**
 * Create a mock Animation Judge
 */
export function createMockAnimationJudge(): IAnimationJudge {
  return {
    judge: vi.fn(),
    judgeWithTiming: vi.fn(),
  };
}

/**
 * Create a mock Animation Loader
 */
export function createMockAnimationLoader(): IAnimationLoader {
  return {
    load: vi.fn(),
    loadBatch: vi.fn(),
  };
}

/**
 * Create a mock Animation Cache
 */
export function createMockAnimationCache(): IAnimationCache {
  const cache = new Map<string, unknown>();
  return {
    get: vi.fn((key: string) => cache.get(key)),
    set: vi.fn((key: string, value: unknown) => cache.set(key, value)),
    has: vi.fn((key: string) => cache.has(key)),
    clear: vi.fn(() => cache.clear()),
    clearForModel: vi.fn(),
  };
}

/**
 * Create a mock Animation Scheduler
 */
export function createMockAnimationScheduler(): IAnimationScheduler {
  const queue: QueuedAnimation[] = [];
  return {
    schedule: vi.fn((animation: QueuedAnimation) => queue.push(animation)),
    scheduleBatch: vi.fn((animations: QueuedAnimation[]) => queue.push(...animations)),
    cancel: vi.fn((id: string) => {
      const index = queue.findIndex((a) => a.id === id);
      if (index > -1) {
        queue.splice(index, 1);
      }
    }),
    cancelAll: vi.fn(() => queue.length = 0),
    interrupt: vi.fn(),
    getQueue: vi.fn(() => [...queue]),
  };
}

/**
 * Create a mock Animation Player
 */
export function createMockAnimationPlayer(): IAnimationPlayer {
  const activeLayers = new Map<AnimationLayerType, string>();
  return {
    play: vi.fn((animation: QueuedAnimation) => {
      const id = `anim-${animation.id}`;
      activeLayers.set(animation.layer, id);
      return Promise.resolve(id);
    }),
    stop: vi.fn((animationId: string) => {
      for (const [layer, id] of activeLayers.entries()) {
        if (id === animationId) {
          activeLayers.delete(layer);
        }
      }
    }),
    pauseAll: vi.fn(),
    resumeAll: vi.fn(),
    getActiveLayers: vi.fn(() => activeLayers),
  };
}

/**
 * Create a mock Animation Timing Distributor
 */
export function createMockAnimationTimingDistributor(): IAnimationTimingDistributor {
  return {
    distribute: vi.fn((animations: QueuedAnimation[], audioDuration: number) => {
      return animations.map((anim, index) => ({
        ...anim,
        triggerTime: (audioDuration / animations.length) * index,
      })) as ScheduledAnimation[];
    }),
  };
}

/**
 * Create a mock Animation Duration Provider
 */
export function createMockAnimationDurationProvider(): IAnimationDurationProvider {
  const durations = {
    greeting: 3000,
    peace: 2500,
    shoot: 2500,
    spin: 4000,
    modelPose: 2000,
    squat: 2000,
    default: 3000,
  };

  return {
    getDuration: vi.fn((animationName: string) => {
      return (durations as any)[animationName] ?? durations.default;
    }),
    getDefaultDuration: vi.fn(() => 3000),
  };
}

/**
 * Create a mock Animation Layer Suggester
 */
export function createMockAnimationLayerSuggester(): IAnimationLayerSuggester {
  return {
    suggestLayer: vi.fn((animationName: string) => {
      const fullBodyAnimations = ['spin', 'backflip', 'breakdance1990', 'jumping'];
      const upperBodyAnimations = ['peace', 'shoot', 'greeting', 'bowing'];
      const gestureAnimations = ['headNod', 'waving', 'pointing'];

      if (fullBodyAnimations.includes(animationName)) {
        return 'full_body';
      } else if (upperBodyAnimations.includes(animationName)) {
        return 'upper_body';
      } else if (gestureAnimations.includes(animationName)) {
        return 'gesture';
      }
      return 'idle';
    }),
  };
}

/**
 * Create a mock Timeline Manager
 */
export function createMockTimelineManager(): ITimelineManager {
  const events: TimelineEvent[] = [];
  return {
    schedule: vi.fn((event: TimelineEvent) => events.push(event)),
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getCurrentTime: vi.fn(() => 0),
  };
}

/**
 * Create a mock Timeline Coordinator
 */
export function createMockTimelineCoordinator(): ITimelineCoordinator {
  const state: TimelineCoordinatorState = {
    status: 'idle',
    currentTime: 0,
    duration: 0,
    currentEmotion: 'neutral',
  };

  return {
    initializeFromText: vi.fn(),
    syncWithAudio: vi.fn(),
    appendStreamedText: vi.fn(),
    start: vi.fn(() => {
      state.status = 'running';
    }),
    pause: vi.fn(() => {
      state.status = 'paused';
    }),
    resume: vi.fn(() => {
      state.status = 'running';
    }),
    stop: vi.fn(() => {
      state.status = 'stopped';
    }),
    getState: vi.fn(() => state),
  };
}

/**
 * Create a mock Text Timing Estimator
 */
export function createMockTextTimingEstimator(): ITextTimingEstimator {
  return {
    estimate: vi.fn((text: string) => {
      const wordCount = text.split(/\s+/).length;
      return wordCount * 200; // ~200ms per word
    }),
    estimateWithBreakdown: vi.fn((text: string) => {
      const words = text.split(/\s+/);
      let currentTime = 0;
      return words.map((word) => {
        const duration = word.length * 50; // ~50ms per character
        const segment = {
          word,
          startTime: currentTime,
          endTime: currentTime + duration,
        };
        currentTime += duration;
        return segment;
      });
    }),
  };
}

/**
 * Create a mock Viseme Service
 */
export function createMockVisemeService(): IVisemeService {
  return {
    processText: vi.fn(),
    applyViseme: vi.fn(),
  };
}

/**
 * Create a mock Speech Service
 */
export function createMockSpeechService(): ISpeechService {
  return {
    startListening: vi.fn(),
    stopListening: vi.fn(),
    isListening: vi.fn(() => false),
  };
}

/**
 * Create a mock Speech Synthesis Service
 */
export function createMockSpeechSynthesisService(): ISpeechSynthesisService {
  return {
    speak: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    isSpeaking: vi.fn(() => false),
  };
}

/**
 * Create a mock Configuration Manager
 */
export function createMockConfigurationManager(): IConfigurationManager {
  const animationDurations = {
    greeting: 3000,
    peace: 2500,
    shoot: 2500,
    spin: 4000,
    modelPose: 2000,
    squat: 2000,
    default: 3000,
  };

  const config = {
    animations: {
      durations: animationDurations,
      priorities: {
        CRITICAL: ['greeting', 'peace'],
        HIGH: ['shoot', 'spin'],
        MEDIUM: ['modelPose', 'squat'],
        LOW: ['idle'],
      } as PriorityConfig,
    },
    prompts: {
      ai: 'You are a helpful AI assistant.',
      animationJudge: 'Select appropriate animations.',
    },
    app: {
      maxMessages: 10,
      defaultEmotion: 'neutral',
    },
  };

  return {
    get: vi.fn((path: string): any => {
      const parts = path.split('.');
      let current: any = config;
      for (const part of parts) {
        current = current[part];
      }
      return current;
    }),
    getAnimationDurations: vi.fn(() => config.animations.durations),
    getPriorityTiers: vi.fn(() => config.animations.priorities),
    getPrompt: vi.fn((name: string) => {
      return (config.prompts as any)[name] || '';
    }),
    reload: vi.fn(() => Promise.resolve()),
  };
}

/**
 * Create a mock Cache
 */
export function createMockCache(): ICache {
  const cache = new Map<string, unknown>();
  let hits = 0;
  let misses = 0;

  return {
    get: vi.fn((key: string): any => {
      const value = cache.get(key);
      if (value !== undefined) {
        hits++;
      } else {
        misses++;
      }
      return value;
    }),
    set: vi.fn((key: string, value: unknown) => {
      cache.set(key, value);
    }),
    has: vi.fn((key: string) => cache.has(key)),
    delete: vi.fn((key: string) => {
      cache.delete(key);
    }),
    clear: vi.fn(() => {
      cache.clear();
      hits = 0;
      misses = 0;
    }),
    getStats: vi.fn(() => ({
      size: cache.size,
      hits,
      misses,
    })),
  };
}

/**
 * Create a mock Logger
 */
export function createMockLogger(): ILogger {
  const logs: Array<{ level: string; message: string; context?: unknown; error?: Error }> = [];

  return {
    debug: vi.fn((message: string, context?: unknown) => {
      logs.push({ level: 'debug', message, context });
    }),
    info: vi.fn((message: string, context?: unknown) => {
      logs.push({ level: 'info', message, context });
    }),
    warn: vi.fn((message: string, context?: unknown) => {
      logs.push({ level: 'warn', message, context });
    }),
    error: vi.fn((message: string, error?: Error, context?: unknown) => {
      logs.push({ level: 'error', message, error, context });
    }),
  };
}

/**
 * Create a mock with all service mocks
 */
export function createMockServices() {
  return {
    llmClient: createMockLLMClient(),
    animationJudge: createMockAnimationJudge(),
    animationLoader: createMockAnimationLoader(),
    animationCache: createMockAnimationCache(),
    animationScheduler: createMockAnimationScheduler(),
    animationPlayer: createMockAnimationPlayer(),
    animationTimingDistributor: createMockAnimationTimingDistributor(),
    animationDurationProvider: createMockAnimationDurationProvider(),
    animationLayerSuggester: createMockAnimationLayerSuggester(),
    timelineManager: createMockTimelineManager(),
    timelineCoordinator: createMockTimelineCoordinator(),
    textTimingEstimator: createMockTextTimingEstimator(),
    visemeService: createMockVisemeService(),
    speechService: createMockSpeechService(),
    speechSynthesisService: createMockSpeechSynthesisService(),
    configurationManager: createMockConfigurationManager(),
    cache: createMockCache(),
    logger: createMockLogger(),
  };
}
