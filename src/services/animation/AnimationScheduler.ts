/**
 * AnimationScheduler
 *
 * Schedules animations on timeline with queue management.
 * Handles timeline integration, priority, and interruptibility.
 */

import type {
  QueuedAnimation,
  AnimationLayerType,
  TimelineEvent,
} from '../../types';
import type { IAnimationQueue } from './AnimationQueue';

/**
 * Animation Scheduler interface
 */
export interface IAnimationScheduler {
  /**
   * Schedule a single animation
   */
  schedule(animation: QueuedAnimation, audioOffset?: number): void;

  /**
   * Schedule multiple animations
   */
  scheduleBatch(animations: QueuedAnimation[], audioOffset?: number): void;

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
  getQueue(): QueuedAnimation[];

  /**
   * Get queue length
   */
  getQueueLength(): number;

  /**
   * Pause all animations
   */
  pause(): void;

  /**
   * Resume all animations
   */
  resume(): void;

  /**
   * Get active animation for a layer
   */
  getActiveLayer(layer: AnimationLayerType): QueuedAnimation | null;

  /**
   * Get all active layers
   */
  getAllActiveLayers(): Map<AnimationLayerType, QueuedAnimation>;

  /**
   * Reset scheduler state
   */
  reset(): void;
}

/**
 * Animation Scheduler options
 */
export interface AnimationSchedulerOptions {
  /** Timeline manager for scheduling events */
  timelineManager: {
    schedule(event: TimelineEvent): void;
    cancelEvent(id: string): void;
    cancelEventsByType(type: string): void;
  };
  /** Animation queue for state management */
  animationQueue: IAnimationQueue;
  /** Default blend duration in milliseconds */
  defaultBlendDuration?: number;
  /** Debug mode */
  debug?: boolean;
}

/**
 * AnimationScheduler class
 *
 * Schedules animations on timeline with proper queue management.
 */
export class AnimationScheduler implements IAnimationScheduler {
  private timelineManager: {
    schedule(event: TimelineEvent): void;
    cancelEvent(id: string): void;
    cancelEventsByType(type: string): void;
  };
  private animationQueue: IAnimationQueue;
  private defaultBlendDuration: number;
  private debug: boolean;

  constructor(options: AnimationSchedulerOptions) {
    this.timelineManager = options.timelineManager;
    this.animationQueue = options.animationQueue;
    this.defaultBlendDuration = options.defaultBlendDuration ?? 300;
    this.debug = options.debug ?? false;
  }

  /**
   * Schedule a single animation
   */
  schedule(animation: QueuedAnimation, audioOffset: number = 0): void {
    // Set default blend durations
    if (!animation.blendIn) {
      animation.blendIn = this.defaultBlendDuration;
    }
    if (!animation.blendOut) {
      animation.blendOut = this.defaultBlendDuration;
    }

    // Add to queue
    this.animationQueue.add(animation);

    // Create timeline event for animation start
    const event: TimelineEvent = {
      id: `${animation.id}_start`,
      timestamp: animation.startTime + audioOffset,
      type: 'animation',
      data: animation,
      callback: () => this.onAnimationStart(animation),
    };

    this.timelineManager.schedule(event);

    // Schedule fade out if duration is set
    if (animation.duration > 0) {
      const fadeOutEvent: TimelineEvent = {
        id: `${animation.id}_fadeOut`,
        timestamp: animation.startTime + animation.duration + audioOffset,
        type: 'animation',
        data: animation,
        callback: () => this.onAnimationFadeOut(animation),
      };
      this.timelineManager.schedule(fadeOutEvent);
    }

    if (this.debug) {
      console.log(
        `%c📋 [AnimationScheduler] Scheduled: ${animation.name} on ${animation.layer} at ${animation.startTime}ms`,
        'color: #3498db;'
      );
    }
  }

  /**
   * Schedule multiple animations
   */
  scheduleBatch(animations: QueuedAnimation[], audioOffset: number = 0): void {
    animations.forEach(anim => this.schedule(anim, audioOffset));
  }

  /**
   * Cancel a scheduled animation
   */
  cancel(id: string): void {
    // Cancel timeline events
    this.timelineManager.cancelEvent(`${id}_start`);
    this.timelineManager.cancelEvent(`${id}_fadeOut`);

    // Remove from queue
    this.animationQueue.remove(id);

    // Stop if currently playing
    const active = this.animationQueue.findActiveById(id);
    if (active) {
      this.onAnimationFadeOut(active);
      this.animationQueue.removeActiveLayer(active.layer);
    }

    if (this.debug) {
      console.log(`%c❌ [AnimationScheduler] Cancelled: ${id}`, 'color: #e74c3c;');
    }
  }

  /**
   * Cancel all scheduled animations
   */
  cancelAll(): void {
    console.log('%c🗑️ [AnimationScheduler] Cancelling all animations', 'color: #95a5a6;');

    // Cancel all timeline events
    this.timelineManager.cancelEventsByType('animation');

    // Fade out all active animations
    const activeLayers = this.animationQueue.getAllActiveLayers();
    activeLayers.forEach((anim) => {
      this.onAnimationFadeOut(anim);
    });

    // Clear state
    this.animationQueue.clearQueue();
    this.animationQueue.clearActiveLayers();
  }

  /**
   * Interrupt animations except on specific layers
   */
  interrupt(exceptLayers: AnimationLayerType[] = []): void {
    console.log('%c⏹ [AnimationScheduler] Interrupting animations', 'color: #f39c12;');

    const activeLayers = this.animationQueue.getAllActiveLayers();
    activeLayers.forEach((anim, layer) => {
      if (!exceptLayers.includes(layer) && anim.interruptible) {
        this.onAnimationFadeOut(anim);
        this.animationQueue.removeActiveLayer(layer);

        if (this.debug) {
          console.log(
            `%c⏹ [AnimationScheduler] Interrupted: ${anim.name} on ${layer}`,
            'color: #f39c12;'
          );
        }
      }
    });
  }

  /**
   * Get current queue
   */
  getQueue(): QueuedAnimation[] {
    return this.animationQueue.getQueue();
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.animationQueue.getQueueLength();
  }

  /**
   * Pause all animations
   */
  pause(): void {
    console.log('%c⏸️ [AnimationScheduler] Pausing all animations', 'color: #f39c12;');
    // Pause is handled by AnimationLayeringService, not here
    // This is a placeholder for future pause functionality
  }

  /**
   * Resume all animations
   */
  resume(): void {
    console.log('%c▶️ [AnimationScheduler] Resuming all animations', 'color: #27ae60;');
    // Resume is handled by AnimationLayeringService, not here
    // This is a placeholder for future resume functionality
  }

  /**
   * Get active animation for a layer
   */
  getActiveLayer(layer: AnimationLayerType): QueuedAnimation | null {
    return this.animationQueue.getActiveLayer(layer);
  }

  /**
   * Get all active layers
   */
  getAllActiveLayers(): Map<AnimationLayerType, QueuedAnimation> {
    return this.animationQueue.getAllActiveLayers();
  }

  /**
   * Reset scheduler state
   */
  reset(): void {
    this.cancelAll();
    this.animationQueue.clearQueue();
    this.animationQueue.clearActiveLayers();
  }

  /**
   * Internal: Handle animation start
   * This is called by timeline when animation should start
   */
  private onAnimationStart(animation: QueuedAnimation): void {
    console.log(
      `%c▶️ [AnimationScheduler] Animation start triggered: ${animation.name}`,
      'background: #27ae60; color: white; padding: 4px 8px; border-radius: 4px;'
    );
    // The actual playback is handled by AnimationQueueService
    // This just marks the animation as active
    this.animationQueue.setActiveLayer(animation.layer, animation);
  }

  /**
   * Internal: Handle animation fade out
   */
  private onAnimationFadeOut(animation: QueuedAnimation): void {
    console.log(
      `%c⏹ [AnimationScheduler] Animation fade out: ${animation.name}`,
      'background: #f39c12; color: white; padding: 4px 8px; border-radius: 4px;'
    );
    // The actual fade out is handled by AnimationQueueService
    this.animationQueue.removeActiveLayer(animation.layer);
  }
}

export default AnimationScheduler;
