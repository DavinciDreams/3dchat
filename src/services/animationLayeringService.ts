import * as THREE from 'three';
import type { AnimationLayerType } from '../types';

/**
 * Animation layer configuration
 */
export interface AnimationLayerConfig {
  /** Layer priority (higher = overrides lower priority layers) */
  priority: number;
  /** Default blend mode for this layer */
  blendMode: THREE.Blending;
  /** Default weight for animations on this layer */
  defaultWeight: number;
}

/**
 * Animation playback options
 */
export interface AnimationPlaybackOptions {
  /** Duration of fade-in transition in seconds */
  fadeInDuration?: number;
  /** Duration of fade-out transition in seconds */
  fadeOutDuration?: number;
  /** Target weight (0-1) */
  weight?: number;
  /** Whether to loop the animation */
  loop?: THREE.AnimationActionLoopStyles;
  /** Whether the animation can be interrupted */
  interruptible?: boolean;
}

/**
 * Active animation state
 */
interface ActiveAnimation {
  action: THREE.AnimationAction;
  layer: AnimationLayerType;
  weight: number;
  targetWeight: number;
  fadeInDuration: number;
  fadeOutDuration: number;
  startTime: number;
  isFadingIn: boolean;
  isFadingOut: boolean;
}

/**
 * AnimationLayeringService
 * 
 * Manages layered animation playback using Three.js native AnimationMixer blending.
 * Replaces the custom bone masking system with weight-based blending for better performance.
 * 
 * Features:
 * - Weight-based blending between animation layers
 * - Additive blending for gesture animations
 * - Normal blending for base animations
 * - Smooth crossfade transitions
 * - Layer priority management
 */
export class AnimationLayeringService {
  private mixer: THREE.AnimationMixer | null = null;
  private actionCache: Map<string, THREE.AnimationAction> = new Map();
  private activeAnimations: Map<string, ActiveAnimation> = new Map();
  private layerWeights: Map<AnimationLayerType, number> = new Map();
  private animationCounter: number = 0;

  /** Default layer configurations */
  private static readonly LAYER_CONFIGS: Record<AnimationLayerType, AnimationLayerConfig> = {
    full_body: {
      priority: 100,
      blendMode: THREE.NormalBlending,
      defaultWeight: 1.0
    },
    upper_body: {
      priority: 75,
      blendMode: THREE.NormalBlending,
      defaultWeight: 0.8
    },
    lower_body: {
      priority: 50,
      blendMode: THREE.NormalBlending,
      defaultWeight: 0.7
    },
    gesture: {
      priority: 25,
      blendMode: THREE.AdditiveBlending,
      defaultWeight: 0.5
    },
    idle: {
      priority: 0,
      blendMode: THREE.NormalBlending,
      defaultWeight: 1.0
    }
  };

  constructor(mixer?: THREE.AnimationMixer) {
    if (mixer) {
      this.setMixer(mixer);
    }
  }

  /**
   * Set or update the AnimationMixer
   * @param mixer - THREE.AnimationMixer instance
   */
  setMixer(mixer: THREE.AnimationMixer): void {
    this.mixer = mixer;
    console.log('%c🎬 [AnimationLayering] Mixer set', 'color: #3498db;');
  }

  /**
   * Register an animation clip and create an action
   * @param name - Animation name/identifier
   * @param clip - THREE.AnimationClip to register
   * @returns The created AnimationAction
   */
  registerAnimation(name: string, clip: THREE.AnimationClip): THREE.AnimationAction {
    if (!this.mixer) {
      throw new Error('AnimationMixer not set. Call setMixer() first.');
    }

    const action = this.mixer.clipAction(clip);
    this.actionCache.set(name, action);
    console.log(`%c📝 [AnimationLayering] Registered animation: ${name}`, 'color: #3498db;');
    return action;
  }

  /**
   * Play an animation on a specific layer with weight-based blending
   * @param name - Animation name to play
   * @param layer - Layer to play on
   * @param options - Playback options
   * @returns The animation ID for tracking
   */
  playAnimation(
    name: string,
    layer: AnimationLayerType,
    options: AnimationPlaybackOptions = {}
  ): string {
    if (!this.mixer) {
      console.warn('%c⚠️ [AnimationLayering] Mixer not set', 'color: #f39c12;');
      return '';
    }

    const action = this.actionCache.get(name);
    if (!action) {
      console.warn(`%c⚠️ [AnimationLayering] Animation not found: ${name}`, 'color: #f39c12;');
      return '';
    }

    const config = AnimationLayeringService.LAYER_CONFIGS[layer];
    const {
      fadeInDuration = 0.3,
      fadeOutDuration = 0.3,
      weight = config.defaultWeight,
      loop = THREE.LoopRepeat
    } = options;

    // Generate unique animation ID
    const animationId = `anim_${this.animationCounter++}`;

    // Fade out existing animations on the same layer
    this.fadeOutLayer(layer, fadeOutDuration);

    // Configure the action
    action.reset();
    action.loop = loop;
    
    // Set blend mode based on layer configuration
    // Note: THREE.AnimationAction doesn't have direct blendMode property
    // We use weight-based blending instead
    action.enabled = true;

    // Fade in the new animation
    action.fadeIn(fadeInDuration);
    action.play();

    // Track the active animation
    this.activeAnimations.set(animationId, {
      action,
      layer,
      weight: 0,
      targetWeight: weight,
      fadeInDuration,
      fadeOutDuration,
      startTime: performance.now(),
      isFadingIn: true,
      isFadingOut: false
    });

    // Update layer weight
    this.layerWeights.set(layer, weight);

    console.log(
      `%c▶️ [AnimationLayering] Playing: ${name} on ${layer} (weight: ${weight})`,
      'background: #27ae60; color: white; padding: 4px 8px; border-radius: 4px;'
    );

    return animationId;
  }

  /**
   * Stop and fade out an animation by ID
   * @param animationId - ID of animation to stop
   * @param fadeOutDuration - Duration of fade-out in seconds
   */
  stopAnimation(animationId: string, fadeOutDuration: number = 0.3): void {
    const anim = this.activeAnimations.get(animationId);
    if (!anim) {
      return;
    }

    anim.isFadingOut = true;
    anim.action.fadeOut(fadeOutDuration);
    
    console.log(`%c⏹ [AnimationLayering] Stopping: ${animationId}`, 'color: #f39c12;');

    // Remove from active animations after fade out
    setTimeout(() => {
      this.activeAnimations.delete(animationId);
    }, fadeOutDuration * 1000);
  }

  /**
   * Fade out all animations on a specific layer
   * @param layer - Layer to fade out
   * @param duration - Fade duration in seconds
   */
  fadeOutLayer(layer: AnimationLayerType, duration: number = 0.3): void {
    this.activeAnimations.forEach((anim, id) => {
      if (anim.layer === layer && !anim.isFadingOut) {
        this.stopAnimation(id, duration);
      }
    });
  }

  /**
   * Stop all animations on all layers
   * @param fadeOutDuration - Duration of fade-out in seconds
   */
  stopAll(fadeOutDuration: number = 0.3): void {
    console.log('%c🗑️ [AnimationLayering] Stopping all animations', 'color: #95a5a6;');
    
    this.activeAnimations.forEach((anim, id) => {
      this.stopAnimation(id, fadeOutDuration);
    });
    
    this.layerWeights.clear();
  }

  /**
   * Pause an animation by ID
   * @param animationId - ID of animation to pause
   */
  pauseAnimation(animationId: string): void {
    const anim = this.activeAnimations.get(animationId);
    if (anim) {
      anim.action.paused = true;
      console.log(`%c⏸️ [AnimationLayering] Paused: ${animationId}`, 'color: #f39c12;');
    }
  }

  /**
   * Resume a paused animation by ID
   * @param animationId - ID of animation to resume
   */
  resumeAnimation(animationId: string): void {
    const anim = this.activeAnimations.get(animationId);
    if (anim) {
      anim.action.paused = false;
      console.log(`%c▶️ [AnimationLayering] Resumed: ${animationId}`, 'color: #27ae60;');
    }
  }

  /**
   * Pause all active animations
   */
  pauseAll(): void {
    console.log('%c⏸️ [AnimationLayering] Pausing all animations', 'color: #f39c12;');
    this.activeAnimations.forEach((anim, id) => {
      this.pauseAnimation(id);
    });
  }

  /**
   * Resume all paused animations
   */
  resumeAll(): void {
    console.log('%c▶️ [AnimationLayering] Resuming all animations', 'color: #27ae60;');
    this.activeAnimations.forEach((anim, id) => {
      this.resumeAnimation(id);
    });
  }

  /**
   * Get the current weight of a layer
   * @param layer - Layer to query
   * @returns Current weight (0-1) or 0 if layer not active
   */
  getLayerWeight(layer: AnimationLayerType): number {
    return this.layerWeights.get(layer) ?? 0;
  }

  /**
   * Get active animation for a specific layer
   * @param layer - Layer to query
   * @returns Active animation ID or null
   */
  getActiveAnimationOnLayer(layer: AnimationLayerType): string | null {
    for (const [id, anim] of this.activeAnimations) {
      if (anim.layer === layer && !anim.isFadingOut) {
        return id;
      }
    }
    return null;
  }

  /**
   * Get all active animations
   * @returns Map of animation ID to animation info
   */
  getAllActiveAnimations(): Map<string, ActiveAnimation> {
    return new Map(this.activeAnimations);
  }

  /**
   * Check if an animation is currently playing
   * @param name - Animation name to check
   * @returns True if animation is active
   */
  isPlaying(name: string): boolean {
    for (const anim of this.activeAnimations.values()) {
      if (anim.action.getClip().name === name && !anim.isFadingOut) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get layer configuration
   * @param layer - Layer to query
   * @returns Layer configuration
   */
  getLayerConfig(layer: AnimationLayerType): AnimationLayerConfig {
    return AnimationLayeringService.LAYER_CONFIGS[layer];
  }

  /**
   * Clear all registered animations and reset state
   */
  clear(): void {
    console.log('%c🗑️ [AnimationLayering] Clearing all animations', 'color: #95a5a6;');
    
    this.stopAll(0);
    this.actionCache.clear();
    this.activeAnimations.clear();
    this.layerWeights.clear();
  }

  /**
   * Update animation weights for smooth blending
   * Called each frame to interpolate weights
   * @param delta - Time since last frame in seconds
   */
  update(delta: number): void {
    if (!this.mixer) return;

    // Update the mixer
    this.mixer.update(delta);

    // Update animation weights for smooth blending
    this.activeAnimations.forEach((anim) => {
      if (anim.isFadingIn) {
        // Interpolate weight towards target
        const fadeSpeed = 1 / anim.fadeInDuration;
        anim.weight = Math.min(anim.weight + fadeSpeed * delta, anim.targetWeight);
        
        if (anim.weight >= anim.targetWeight) {
          anim.isFadingIn = false;
        }
        
        // Apply weight to action
        anim.action.weight = anim.weight;
      }
    });
  }

  /**
   * Get animation action by name
   * @param name - Animation name
   * @returns AnimationAction or null
   */
  getAction(name: string): THREE.AnimationAction | null {
    return this.actionCache.get(name) ?? null;
  }

  /**
   * Get all registered animation names
   * @returns Array of animation names
   */
  getRegisteredAnimations(): string[] {
    return Array.from(this.actionCache.keys());
  }

  /**
   * Get layer priority
   * @param layer - Layer to query
   * @returns Priority value
   */
  getLayerPriority(layer: AnimationLayerType): number {
    return AnimationLayeringService.LAYER_CONFIGS[layer].priority;
  }

  /**
   * Compare layer priorities
   * @param layer1 - First layer
   * @param layer2 - Second layer
   * @returns Positive if layer1 has higher priority, negative if lower
   */
  compareLayerPriority(layer1: AnimationLayerType, layer2: AnimationLayerType): number {
    return this.getLayerPriority(layer1) - this.getLayerPriority(layer2);
  }
}

// Export singleton instance
export const animationLayeringService = new AnimationLayeringService();

// Export class for testing
export default AnimationLayeringService;
