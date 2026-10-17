import * as THREE from 'three';
import {
  QueuedAnimation,
  AnimationLayerType,
  AnimationQueueOptions,
} from '../types';
import { TimelineManager } from './timelineManager';
import { animationLayeringService } from './animationLayeringService';

import { AnimationQueue } from './animation/AnimationQueue';
import { AnimationScheduler } from './animation/AnimationScheduler';

/**
 * AnimationQueueService
 * 
 * Manages queued animation playback with interruptibility support.
 * Uses AnimationScheduler for queue management and scheduling.
 * Uses AnimationLayeringService for weight-based blending and layer management.
 * Animations can play simultaneously on different body layers.
 * 
 * DEPRECATED: This service is being refactored. Use AnimationScheduler directly.
 * Kept for backward compatibility.
 */
export class AnimationQueueService {
  
  // References needed for on-demand animation loading
  
  // Track which animations are currently being loaded to prevent duplicate loads
  
  // New services from Phase 5 refactoring
  private animationQueue: AnimationQueue;
  private animationScheduler: AnimationScheduler;
  
  setTimelineManager(timelineManager: TimelineManager): void {
    this.animationScheduler = new AnimationScheduler({ timelineManager, animationQueue: this.animationQueue, defaultBlendDuration: 300, debug: false });
  }

  constructor(options: AnimationQueueOptions) {
    
    // Initialize AnimationLayeringService with mixer
    animationLayeringService.setMixer(options.mixer);
    
    // Initialize new services from Phase 5
    this.animationQueue = new AnimationQueue();
    this.animationScheduler = new AnimationScheduler({
      timelineManager: options.timelineManager,
      animationQueue: this.animationQueue,
      defaultBlendDuration: options.defaultBlendDuration ?? 300,
      debug: false,
    });
  }
  
  /**
   * Schedule animation on timeline
   * @param animation - Animation to schedule
   * @param audioOffset - Audio offset in milliseconds
   * 
   * DEPRECATED: Use AnimationScheduler.schedule() directly
   */
  scheduleAnimation(
    animation: QueuedAnimation,
    audioOffset: number = 0
  ): void {
    console.warn('[AnimationQueueService] scheduleAnimation is deprecated. Use AnimationScheduler.schedule() directly.');
    this.animationScheduler.schedule(animation, audioOffset);
  }
  
  /**
   * Schedule multiple animations at once
   * @param animations - Array of animations to schedule
   * @param audioOffset - Audio offset in milliseconds
   * 
   * DEPRECATED: Use AnimationScheduler.scheduleBatch() directly
   */
  scheduleBatch(animations: QueuedAnimation[], audioOffset: number = 0): void {
    console.warn('[AnimationQueueService] scheduleBatch is deprecated. Use AnimationScheduler.scheduleBatch() directly.');
    this.animationScheduler.scheduleBatch(animations, audioOffset);
  }
  
  /**
   * Cancel a specific animation by ID
   * @param id - Animation ID to cancel
   * 
   * DEPRECATED: Use AnimationScheduler.cancel() directly
   */
  cancel(id: string): void {
    console.warn('[AnimationQueueService] cancel is deprecated. Use AnimationScheduler.cancel() directly.');
    this.animationScheduler.cancel(id);
  }
  
  /**
   * Cancel all animations
   * 
   * DEPRECATED: Use AnimationScheduler.cancelAll() directly
   */
  cancelAll(): void {
    console.warn('[AnimationQueueService] cancelAll is deprecated. Use AnimationScheduler.cancelAll() directly.');
    this.animationScheduler.cancelAll();
  }
  
  /**
   * Interrupt current animations
   * @param exceptLayers - Layers to keep playing
   * 
   * DEPRECATED: Use AnimationScheduler.interrupt() directly
   */
  interrupt(exceptLayers: AnimationLayerType[] = []): void {
    console.warn('[AnimationQueueService] interrupt is deprecated. Use AnimationScheduler.interrupt() directly.');
    this.animationScheduler.interrupt(exceptLayers);
  }
  
  /**
   * Pause all animations
   * 
   * DEPRECATED: Use AnimationScheduler.pause() directly
   */
  pause(): void {
    console.warn('[AnimationQueueService] pause is deprecated. Use AnimationScheduler.pause() directly.');
    this.animationScheduler.pause();
  }
  
  /**
   * Resume all animations
   * 
   * DEPRECATED: Use AnimationScheduler.resume() directly
   */
  resume(): void {
    console.warn('[AnimationQueueService] resume is deprecated. Use AnimationScheduler.resume() directly.');
    this.animationScheduler.resume();
  }
  
  /**
   * Get active animation for a specific layer
   * @param layerType - Layer type to query
   * @returns Active animation or null
   * 
   * DEPRECATED: Use AnimationScheduler.getActiveLayer() directly
   */
  getActiveLayer(layerType: AnimationLayerType): QueuedAnimation | null {
    console.warn('[AnimationQueueService] getActiveLayer is deprecated. Use AnimationScheduler.getActiveLayer() directly.');
    return this.animationScheduler.getActiveLayer(layerType);
  }
  
  /**
   * Get all active layers
   * @returns Map of layer type to active animation
   * 
   * DEPRECATED: Use AnimationScheduler.getAllActiveLayers() directly
   */
  getAllActiveLayers(): Map<AnimationLayerType, QueuedAnimation> {
    console.warn('[AnimationQueueService] getAllActiveLayers is deprecated. Use AnimationScheduler.getAllActiveLayers() directly.');
    return this.animationScheduler.getAllActiveLayers();
  }
  
  /**
   * Get current queue
   * @returns Array of queued animations
   * 
   * DEPRECATED: Use AnimationScheduler.getQueue() directly
   */
  getQueue(): QueuedAnimation[] {
    console.warn('[AnimationQueueService] getQueue is deprecated. Use AnimationScheduler.getQueue() directly.');
    return this.animationScheduler.getQueue();
  }
  
  /**
   * Get queue length
   * @returns Number of queued animations
   * 
   * DEPRECATED: Use AnimationScheduler.getQueueLength() directly
   */
  getQueueLength(): number {
    console.warn('[AnimationQueueService] getQueueLength is deprecated. Use AnimationScheduler.getQueueLength() directly.');
    return this.animationScheduler.getQueueLength();
  }
  
  /**
   * Clear action cache
   */
  clearActionCache(): void {
    animationLayeringService.clear();
  }
  
  /**
   * Get animation queue for backward compatibility
   * @returns The AnimationQueue instance
   */
  getAnimationQueue(): AnimationQueue {
    return this.animationQueue;
  }
  
  /**
   * Get animation scheduler for backward compatibility
   * @returns The AnimationScheduler instance
   */
  getAnimationScheduler(): AnimationScheduler {
    return this.animationScheduler;
  }
}

// Export singleton instance with placeholder values (will be initialized by AvatarModel)
export const animationQueueService = new AnimationQueueService({
  mixer: null as unknown as THREE.AnimationMixer, // Will be set by AvatarModel
  timelineManager: null as unknown as TimelineManager, // Will be set by ChatInterface
});

/**
 * Initialize animation queue service with required dependencies
 * @param mixer - THREE.AnimationMixer from AvatarModel
 * @param timelineManager - TimelineManager instance
 * @param vrm - VRM model instance for animation retargeting
 * @param selectedModelId - Selected model ID for caching
 */
export function initializeAnimationQueueService(
  mixer: THREE.AnimationMixer,
  timelineManager: TimelineManager,
  vrm?: unknown,
  selectedModelId?: string
): void {
  // AnimationLayeringService is already initialized with mixer in constructor
  animationLayeringService.setMixer(mixer);
  
  // Initialize AnimationScheduler with timelineManager
  animationQueueService.setTimelineManager(timelineManager);
  
  console.log('%c🔧 [AnimationQueueService] Initialized with:', 
    'color: #3498db; font-weight: bold;', 
    { mixer: !!mixer, vrm: !!vrm, selectedModelId });
}

// Export class for testing
export default AnimationQueueService;
