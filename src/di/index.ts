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
