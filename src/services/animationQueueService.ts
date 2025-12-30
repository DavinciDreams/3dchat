import * as THREE from 'three';
import {
  QueuedAnimation,
  AnimationLayerType,
  AnimationQueueOptions,
  TimelineEvent
} from '../types';
import { TimelineManager } from './timelineManager';
import { animationLayeringService } from './animationLayeringService';
import vrmaAnimationService, { VRMA_ANIMATIONS } from './vrmaAnimationService';

/**
 * AnimationQueueService
 * 
 * Manages queued animation playback with interruptibility support.
 * Uses AnimationLayeringService for weight-based blending and layer management.
 * Animations can play simultaneously on different body layers.
 */
export class AnimationQueueService {
  private queue: QueuedAnimation[] = [];
  private activeLayers: Map<AnimationLayerType, QueuedAnimation> = new Map();
  private timelineManager: TimelineManager;
  private options: Required<AnimationQueueOptions>;
  private animationCounter: number = 0;
  
  // References needed for on-demand animation loading
  private mixer: THREE.AnimationMixer | null = null;
  private vrm: unknown | null = null;
  private selectedModelId: string = '';
  
  // Track which animations are currently being loaded to prevent duplicate loads
  private loadingAnimations: Map<string, Promise<void>> = new Map();

  constructor(options: AnimationQueueOptions) {
    this.timelineManager = options.timelineManager;
    this.options = {
      mixer: options.mixer,
      timelineManager: options.timelineManager,
      defaultBlendDuration: options.defaultBlendDuration ?? 300
    };
    
    // Initialize AnimationLayeringService with mixer
    animationLayeringService.setMixer(options.mixer);
    this.mixer = options.mixer;
  }

  /**
   * Load and register an animation on-demand
   * This is called when an animation is requested but not yet registered
   * @param animationName - Animation name to load
   * @param layer - Optional layer for bone masking
   * @returns Promise resolving when animation is loaded and registered
   */
  private async loadAndRegisterAnimation(
    animationName: string,
    layer?: AnimationLayerType
  ): Promise<void> {
    // Return existing promise if already loading
    if (this.loadingAnimations.has(animationName)) {
      console.log(`%c📥 [AnimationQueue] Animation already loading: ${animationName}`, 'color: #f39c12;');
      return this.loadingAnimations.get(animationName)!;
    }

    console.log(`%c📥 [AnimationQueue] Loading and registering animation on-demand: ${animationName}`, 
      'color: #3498db; font-weight: bold;');

    const loadPromise = (async () => {
      if (!this.mixer || !this.vrm) {
        console.warn(`%c📥 [AnimationQueue] Cannot load animation - mixer or vrm not ready`, 'color: #e74c3c;');
        throw new Error('Mixer or VRM not ready for animation loading');
      }

      try {
        // Find animation config
        const animConfig = VRMA_ANIMATIONS.find(a => a.name === animationName);
        if (!animConfig) {
          console.warn(`VRMA animation '${animationName}' not found in config`);
          throw new Error(`Animation config not found: ${animationName}`);
        }

        // Load VRMA animation file
        const loadedAnim = await vrmaAnimationService.loadAnimation(animConfig);
        
        if (!loadedAnim) {
          console.warn(`Failed to load VRMA animation '${animationName}'`);
          throw new Error(`Failed to load animation: ${animationName}`);
        }

        // Create retargeted clip for current model
        const retargetedClip = vrmaAnimationService.getOrCreateRetargetedClip(
          loadedAnim.vrmAnimation,
          this.vrm,
          this.selectedModelId,
          animationName,
          layer
        );

        // Register animation with AnimationLayeringService
        animationLayeringService.registerAnimation(animationName, retargetedClip);

        console.log(`%c✅ [AnimationQueue] Animation loaded and registered: ${animationName}`, 
          'color: #27ae60; font-weight: bold;');
      } catch (error) {
        console.error(`%c❌ [AnimationQueue] Failed to load animation: ${animationName}`, 
          'color: #e74c3c;', error);
        throw error;
      }
    })();

    this.loadingAnimations.set(animationName, loadPromise);
    
    try {
      await loadPromise;
    } finally {
      this.loadingAnimations.delete(animationName);
    }
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
    animationLayeringService.pauseAll();
  }

  /**
   * Resume all animations
   */
  resume(): void {
    console.log('%c▶️ [AnimationQueue] Resuming all animations', 'color: #27ae60;');
    animationLayeringService.resumeAll();
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
   * Play animation with layering support using AnimationLayeringService
   * @param animation - Animation to play
   */
  private async playAnimation(animation: QueuedAnimation): Promise<void> {
    const layerType = animation.layer;
    
    console.log(`%c▶️ [AnimationQueue] Playing: ${animation.name} on ${layerType}`, 
      'background: #27ae60; color: white; padding: 4px 8px; border-radius: 4px;');
    
    // Check if animation is registered with AnimationLayeringService
    const isRegistered = animationLayeringService.getRegisteredAnimations().includes(animation.name);
    
    if (!isRegistered) {
      console.log(`%c📥 [AnimationQueue] Animation not registered, loading on-demand: ${animation.name}`, 
        'color: #f39c12;');
      try {
        await this.loadAndRegisterAnimation(animation.name, layerType);
      } catch (error) {
        console.error(`%c❌ [AnimationQueue] Failed to load animation: ${animation.name}`, 
          'color: #e74c3c;', error);
        return; // Skip playing if load failed
      }
    }
    
    // Play animation using AnimationLayeringService
    const animationId = animationLayeringService.playAnimation(
      animation.name,
      layerType,
      {
        fadeInDuration: animation.blendIn / 1000, // Convert ms to seconds
        fadeOutDuration: animation.blendOut / 1000,
        loop: animation.duration > 0 ? THREE.LoopRepeat : THREE.LoopOnce
      }
    );
    
    // Track animation ID for later cancellation
    if (animation.id) {
      this.activeLayers.set(layerType, { ...animation, id: animationId });
    }
  }

  /**
   * Fade out animation using AnimationLayeringService
   * @param animation - Animation to fade out
   * @param duration - Fade duration in milliseconds
   */
  private fadeOutAnimation(animation: QueuedAnimation, duration: number): void {
    // Stop animation using AnimationLayeringService
    if (animation.id) {
      animationLayeringService.stopAnimation(animation.id, duration / 1000); // Convert ms to seconds
    }
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
    animationLayeringService.clear();
  }
}

// Export singleton instance with placeholder values (will be initialized by AvatarModel)
export const animationQueueService = new AnimationQueueService({
  mixer: null as unknown as THREE.AnimationMixer, // Will be set by AvatarModel
  timelineManager: null as unknown as TimelineManager // Will be set by ChatInterface
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
  // Update the singleton's dependencies
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = animationQueueService as any;
  service.timelineManager = timelineManager;
  service.mixer = mixer;
  
  // Set VRM and model ID for on-demand animation loading
  if (vrm !== undefined) {
    service.vrm = vrm;
  }
  if (selectedModelId !== undefined) {
    service.selectedModelId = selectedModelId;
  }
  
  // AnimationLayeringService is already initialized with mixer in constructor
  animationLayeringService.setMixer(mixer);
  
  console.log('%c🔧 [AnimationQueueService] Initialized with:', 
    'color: #3498db; font-weight: bold;', 
    { mixer: !!mixer, vrm: !!vrm, selectedModelId });
}

// Export class for testing
export default AnimationQueueService;
