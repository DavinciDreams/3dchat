/**
 * DI Container Initialization for Phase 5 and Phase 6 Services
 *
 * Registers all Phase 5 and Phase 6 services in DI container.
 * Services are registered in dependency order to ensure proper resolution.
 */

import { getContainer, ServiceLifetime } from './ServiceContainer';
import { SERVICE_TOKENS } from './ServiceTokens';

// Phase 5: Animation Queue Services
import { AnimationQueue } from '../services/animation/AnimationQueue';
import { AnimationScheduler } from '../services/animation/AnimationScheduler';

// Phase 5: Timeline Services
import { TimelineStateService } from '../services/timeline/TimelineStateService';
import { TimelineScheduler as TimelineSchedulerService } from '../services/timeline/TimelineScheduler';
import { TextStreamHandler } from '../services/timeline/TextStreamHandler';

// Core services needed by Phase 5
import { textTimingEstimator } from '../services/textTimingEstimator';
import { timelineManager } from '../services/timelineManager';

// Phase 6: AI Service
import { aiService } from '../services/aiService';

/**
 * Initialize Phase 5 services in DI container
 * This should be called once at application startup
 */
export function initializePhase5Services(): void {
  const container = getContainer();

  // ============================================
  // Register core services (no dependencies)
  // ============================================

  // Register TimelineManager as a singleton instance
  if (!container.has(SERVICE_TOKENS.TIMELINE_MANAGER)) {
    container.registerInstance(SERVICE_TOKENS.TIMELINE_MANAGER, timelineManager);
  }

  // Register TextTimingEstimator as a singleton instance
  if (!container.has(SERVICE_TOKENS.TEXT_TIMING_ESTIMATOR)) {
    container.registerInstance(SERVICE_TOKENS.TEXT_TIMING_ESTIMATOR, textTimingEstimator);
  }

  // ============================================
  // Phase 5: Animation Queue Services
  // ============================================

  // Animation Queue (Phase 5)
  if (!container.has(SERVICE_TOKENS.ANIMATION_QUEUE)) {
    container.register({
      token: SERVICE_TOKENS.ANIMATION_QUEUE,
      factory: () => new AnimationQueue(),
      lifetime: ServiceLifetime.Singleton,
    });
  }

  // Animation Scheduler (Phase 5)
  if (!container.has(SERVICE_TOKENS.ANIMATION_SCHEDULER_SERVICE)) {
    container.register({
      token: SERVICE_TOKENS.ANIMATION_SCHEDULER_SERVICE,
      factory: () => new AnimationScheduler({
        timelineManager: container.resolve(SERVICE_TOKENS.TIMELINE_MANAGER) as any,
        animationQueue: container.resolve(SERVICE_TOKENS.ANIMATION_QUEUE),
        debug: false,
      }),
      lifetime: ServiceLifetime.Singleton,
    });
  }

  // ============================================
  // Phase 5: Timeline Services
  // ============================================

  // Timeline State Service (Phase 5)
  if (!container.has(SERVICE_TOKENS.TIMELINE_STATE_MANAGER)) {
    container.register({
      token: SERVICE_TOKENS.TIMELINE_STATE_MANAGER,
      factory: () => new TimelineStateService(),
      lifetime: ServiceLifetime.Singleton,
    });
  }

  // Timeline Scheduler (Phase 5)
  if (!container.has(SERVICE_TOKENS.TIMELINE_SCHEDULER)) {
    container.register({
      token: SERVICE_TOKENS.TIMELINE_SCHEDULER,
      factory: () => new TimelineSchedulerService({
        timelineManager: container.resolve(SERVICE_TOKENS.TIMELINE_MANAGER) as any,
        debug: false,
      }),
      lifetime: ServiceLifetime.Singleton,
    });
  }

  // Text Stream Handler (Phase 5)
  if (!container.has(SERVICE_TOKENS.STREAMING_TEXT_HANDLER)) {
    container.register({
      token: SERVICE_TOKENS.STREAMING_TEXT_HANDLER,
      factory: () => new TextStreamHandler({
        estimator: container.resolve(SERVICE_TOKENS.TEXT_TIMING_ESTIMATOR) as any,
        debug: false,
      }),
      lifetime: ServiceLifetime.Singleton,
    });
  }

  console.log('%c[DI] Phase 5 services registered successfully', 'color: #27ae60; font-weight: bold;');
}

/**
 * Initialize Phase 6 services in DI container
 * This should be called once at application startup
 */
export function initializePhase6Services(): void {
  const container = getContainer();

  // ============================================
  // Phase 6: AI Service
  // ============================================

  // AI Service (Phase 6)
  if (!container.has(SERVICE_TOKENS.AI_SERVICE)) {
    container.register({
      token: SERVICE_TOKENS.AI_SERVICE,
      factory: () => aiService,
      lifetime: ServiceLifetime.Singleton,
    });
  }

  console.log('%c[DI] Phase 6 services registered successfully', 'color: #8e44ad; font-weight: bold;');
}

/**
 * Get all registered service tokens
 */
export function getRegisteredTokens(): string[] {
  return getContainer().getTokens();
}

/**
 * Check if a service is registered
 */
export function isServiceRegistered(token: string): boolean {
  return getContainer().has(token);
}
