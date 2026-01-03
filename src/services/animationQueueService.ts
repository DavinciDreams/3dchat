import * as THREE from 'three';
import {
  QueuedAnimation,
  AnimationLayerType,
  AnimationQueueOptions,
} from '../types';
import { TimelineManager } from './timelineManager';
import { animationLayeringService } from './animationLayeringService';
import vrmaAnimationService, { VRMA_ANIMATIONS } from './vrmaAnimationService';
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
  private timelineManager: TimelineManager;
  private options: Required<AnimationQueueOptions>;
  private animationCounter: number = 0;
  
  // References needed for on-demand animation loading
  private mixer: THREE.AnimationMixer | null = null;
  private vrm: unknown | null = null;
  private selectedModelId: string = '';
  
  // Track which animations are currently being loaded to prevent duplicate loads
  private loadingAnimations: Map<string, Promise<void>> = new Map();
  
  // New services from Phase 5 refactoring
  private animationQueue: AnimationQueue;
  private animationScheduler: AnimationScheduler;
  
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
        ) as THREE.AnimationClip;

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
   * Play animation with layering support using AnimationLayeringService
   * @param animation - Animation to play
   * @returns Promise resolving to animation ID
   */
  private async playAnimation(animation: QueuedAnimation): Promise<string> {
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
    
    return animationId;
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
    // Use AnimationScheduler to get active animations
    const activeLayers = this.animationScheduler.getAllActiveLayers();
    for (const anim of activeLayers.values()) {
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
  // Update the singleton's dependencies
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
  
  // Initialize AnimationScheduler with timelineManager
  service.animationScheduler = new AnimationScheduler({
    timelineManager,
    animationQueue: service.animationQueue,
    defaultBlendDuration: 300,
    debug: false,
  });
  
  console.log('%c🔧 [AnimationQueueService] Initialized with:', 
    'color: #3498db; font-weight: bold;', 
    { mixer: !!mixer, vrm: !!vrm, selectedModelId });
}

// Export class for testing
export default AnimationQueueService;
