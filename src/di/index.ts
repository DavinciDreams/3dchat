/**
 * Dependency Injection Module
 *
 * Barrel export for all DI-related functionality
 */

export * from './ServiceContainer';
export * from './ServiceTokens';
export * from './ServiceInterfaces';

// Export new services
export { LLMClientService } from '../services/ai/LLMClientService';
export { AnimationSelectionService } from '../services/animation/AnimationSelectionService';
export { AnimationQueueProcessorService } from '../services/animation/AnimationQueueProcessorService';

// Phase 5: Animation Queue Services
export { AnimationQueue } from '../services/animation/AnimationQueue';
export { AnimationScheduler } from '../services/animation/AnimationScheduler';

// Phase 5: Timeline Services
export { TimelineStateService } from '../services/timeline/TimelineStateService';
export { TimelineScheduler as TimelineSchedulerService } from '../services/timeline/TimelineScheduler';
export { TextStreamHandler } from '../services/timeline/TextStreamHandler';

// Export DI initialization
export { initializePhase5Services, getRegisteredTokens, isServiceRegistered } from './initializeServices';
