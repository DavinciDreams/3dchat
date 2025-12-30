import * as THREE from 'three';
import {
  QueuedAnimation,
  AnimationLayerType,
  AnimationQueueOptions,
  TimelineEvent
} from '../types';
import { TimelineManager } from './timelineManager';

/**
 * AnimationQueueService
 * 
 * Manages layered animation playback with interruptibility support.
 * Animations can play simultaneously on different body layers.
 */
export class AnimationQueueService {
  private queue: QueuedAnimation[] = [];
  private activeLayers: Map<AnimationLayerType, QueuedAnimation> = new Map();
  private timelineManager: TimelineManager;
  private mixer: THREE.AnimationMixer;
  private options: Required<AnimationQueueOptions>;
  private actionCache: Map<string, THREE.AnimationAction> = new Map();
  private animationCounter: number = 0;
  private animationLayerMap: Map<string, AnimationLayerType> = new Map();

  constructor(options: AnimationQueueOptions) {
    this.timelineManager = options.timelineManager;
    this.mixer = options.mixer;
    this.options = {
      mixer: options.mixer,
      timelineManager: options.timelineManager,
      defaultBlendDuration: options.defaultBlendDuration ?? 300
    };
  }

  /**
   * Schedule animation on timeline
   * @param animation - Animation to schedule
   * @param audioOffset - Audio offset in milliseconds
   */
  scheduleAnimation(
    animation: QueuedAnimation,
    audioOffset: number = 0
  ): void {
    if (!animation.id) {
      animation.id = `anim_${this.animationCounter++}`;
    }
    
    // Set default blend durations
    if (!animation.blendIn) {
      animation.blendIn = this.options.defaultBlendDuration;
    }
    if (!animation.blendOut) {
      animation.blendOut = this.options.defaultBlendDuration;
    }
    
    // Add to queue
    this.queue.push(animation);
    
    // Create timeline event for animation start
    const event: TimelineEvent = {
      id: `${animation.id}_start`,
      timestamp: animation.startTime + audioOffset,
      type: 'animation',
      data: animation,
      callback: () => this.playAnimation(animation)
    };
    
    this.timelineManager.schedule(event);
    
    // Schedule fade out if duration is set
    if (animation.duration > 0) {
      const fadeOutEvent: TimelineEvent = {
        id: `${animation.id}_fadeOut`,
        timestamp: animation.startTime + animation.duration + audioOffset,
        type: 'animation',
        data: animation,
        callback: () => this.fadeOutAnimation(animation, animation.blendOut)
      };
      this.timelineManager.schedule(fadeOutEvent);
    }
    
    console.log(`%c📋 [AnimationQueue] Scheduled: ${animation.name} on ${animation.layer} at ${animation.startTime}ms`, 
      'color: #3498db;');
  }

  /**
   * Schedule multiple animations at once
   * @param animations - Array of animations to schedule
   * @param audioOffset - Audio offset in milliseconds
   */
  scheduleBatch(animations: QueuedAnimation[], audioOffset: number = 0): void {
    animations.forEach(anim => this.scheduleAnimation(anim, audioOffset));
  }

  /**
   * Cancel a specific animation by ID
   * @param id - Animation ID to cancel
   */
  cancel(id: string): void {
    // Cancel timeline events
    this.timelineManager.cancelEvent(`${id}_start`);
    this.timelineManager.cancelEvent(`${id}_fadeOut`);
    
    // Remove from queue
    this.queue = this.queue.filter(a => a.id !== id);
    
    // Stop if currently playing
    const active = this.getActiveAnimationById(id);
    if (active) {
      this.fadeOutAnimation(active, 0.2); // Quick fade out
      this.activeLayers.delete(active.layer);
    }
    
    console.log(`%c❌ [AnimationQueue] Cancelled: ${id}`, 'color: #e74c3c;');
  }

  /**
   * Cancel all animations
   */
  cancelAll(): void {
    console.log('%c🗑️ [AnimationQueue] Cancelling all animations', 'color: #95a5a6;');
    
    // Cancel all timeline events
    this.timelineManager.cancelEventsByType('animation');
    
    // Fade out all active animations
    this.activeLayers.forEach(anim => {
      this.fadeOutAnimation(anim, 0.2);
    });
    
    // Clear state
    this.queue = [];
    this.activeLayers.clear();
  }

  /**
   * Interrupt current animations
   * @param exceptLayers - Layers to keep playing
   */
  interrupt(exceptLayers: AnimationLayerType[] = []): void {
    console.log('%c⏹ [AnimationQueue] Interrupting animations', 'color: #f39c12;');
    
    this.activeLayers.forEach((anim, layer) => {
      if (!exceptLayers.includes(layer) && anim.interruptible) {
        this.fadeOutAnimation(anim, 0.2); // Quick fade out
        this.activeLayers.delete(layer);
        console.log(`%c⏹ [AnimationQueue] Interrupted: ${anim.name} on ${layer}`, 
          'color: #f39c12;');
      }
    });
  }

  /**
   * Pause all animations
   */
  pause(): void {
    console.log('%c⏸️ [AnimationQueue] Pausing all animations', 'color: #f39c12;');
    this.activeLayers.forEach(anim => {
      const action = this.getAction(anim.name);
      if (action) {
        action.paused = true;
      }
    });
  }

  /**
   * Resume all animations
   */
  resume(): void {
    console.log('%c▶️ [AnimationQueue] Resuming all animations', 'color: #27ae60;');
    this.activeLayers.forEach(anim => {
      const action = this.getAction(anim.name);
      if (action) {
        action.paused = false;
      }
    });
  }

  /**
   * Get active animation for a specific layer
   * @param layerType - Layer type to query
   * @returns Active animation or null
   */
  getActiveLayer(layerType: AnimationLayerType): QueuedAnimation | null {
    return this.activeLayers.get(layerType) || null;
  }

  /**
   * Get all active layers
   * @returns Map of layer type to active animation
   */
  getAllActiveLayers(): Map<AnimationLayerType, QueuedAnimation> {
    return new Map(this.activeLayers);
  }

  /**
   * Get current queue
   * @returns Array of queued animations
   */
  getQueue(): QueuedAnimation[] {
    return [...this.queue];
  }

  /**
   * Get queue length
   * @returns Number of queued animations
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Play animation with layering support
   * @param animation - Animation to play
   */
  private playAnimation(animation: QueuedAnimation): void {
    const layerType = animation.layer;
    
    console.log(`%c▶️ [AnimationQueue] Playing: ${animation.name} on ${layerType}`, 
      'background: #27ae60; color: white; padding: 4px 8px; border-radius: 4px;');
    
    // Fade out current animation on this layer
    const current = this.activeLayers.get(layerType);
    if (current) {
      this.fadeOutAnimation(current, animation.blendIn);
    }

    // Fade in new animation
    this.fadeInAnimation(animation, animation.blendIn);
    this.activeLayers.set(layerType, animation);
  }

  /**
   * Fade in animation
   * @param animation - Animation to fade in
   * @param duration - Fade duration in milliseconds
   */
  private fadeInAnimation(animation: QueuedAnimation, duration: number): void {
    const action = this.getAction(animation.name);
    if (!action) {
      console.warn(`%c⚠️ [AnimationQueue] No action found for: ${animation.name}`, 
        'color: #f39c12;');
      return;
    }
    
    action.reset();
    action.fadeIn(duration / 1000).play(); // Convert ms to seconds
  }

  /**
   * Fade out animation
   * @param animation - Animation to fade out
   * @param duration - Fade duration in milliseconds
   */
  private fadeOutAnimation(animation: QueuedAnimation, duration: number): void {
    const action = this.getAction(animation.name);
    if (!action) {
      return;
    }
    
    action.fadeOut(duration / 1000); // Convert ms to seconds
  }

  /**
   * Get or create animation action
   * @param name - Animation name
   * @returns Animation action or null
   */
  private getAction(name: string): THREE.AnimationAction | null {
    // Check cache first
    if (this.actionCache.has(name)) {
      return this.actionCache.get(name)!;
    }
    
    // Note: The actual animation clips are managed by vrmaAnimationService
    // This method is a placeholder - in practice, AvatarModel will
    // provide the actual actions. For now, return null.
    console.warn(`%c⚠️ [AnimationQueue] Action not in cache: ${name}`, 
      'color: #f39c12;');
    return null;
  }

  /**
   * Register an animation action (called by AvatarModel)
   * @param name - Animation name
   * @param action - Animation action to register
   * @param layer - Optional animation layer
   */
  registerAction(name: string, action: THREE.AnimationAction, layer?: AnimationLayerType): void {
    this.actionCache.set(name, action);
    if (layer) {
      this.animationLayerMap.set(name, layer);
    }
    console.log(`%c📝 [AnimationQueue] Registered action: ${name} on layer: ${layer || 'none'}`, 'color: #3498db;');
  }

  /**
   * Get active animation by ID
   * @param id - Animation ID
   * @returns Active animation or null
   */
  private getActiveAnimationById(id: string): QueuedAnimation | null {
    for (const anim of this.activeLayers.values()) {
      if (anim.id === id) {
        return anim;
      }
    }
    return null;
  }

  /**
   * Clear action cache
   */
  clearActionCache(): void {
    this.actionCache.clear();
    this.animationLayerMap.clear();
  }
}

// Export singleton instance with placeholder values (will be initialized by AvatarModel)
export const animationQueueService = new AnimationQueueService({
  mixer: null as unknown as THREE.AnimationMixer, // Will be set by AvatarModel
  timelineManager: null as unknown as TimelineManager // Will be set by ChatInterface
});

/**
 * Initialize animation queue service with required dependencies
 * @param mixer - THREE AnimationMixer from AvatarModel
 * @param timelineManager - TimelineManager instance
 */
export function initializeAnimationQueueService(
  mixer: THREE.AnimationMixer,
  timelineManager: TimelineManager
): void {
  // Update the singleton's dependencies
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = animationQueueService as any;
  service.timelineManager = timelineManager;
  service.mixer = mixer;
}

// Export class for testing
export default AnimationQueueService;
