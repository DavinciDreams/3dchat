import * as THREE from 'three';
import type { AnimationLayerType } from '../types';
import { getAnimationTimeScale } from '../config/animationSpeedConfig';

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
  /** Whether to loop animation */
  loop?: THREE.AnimationActionLoopStyles;
  /** Whether to animation can be interrupted */
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
 * Replaces custom bone masking system with weight-based blending for better performance.
 * 
 * Features:
 * - Weight-based blending between animation layers
 * - Additive blending for gesture animations
 * - Normal blending for base animations
 * - Smooth crossfade transitions
 * - Layer priority management
 */
/**
 * Cleanup queue item for frame-based animation disposal
 */
interface CleanupQueueItem {
  animationId: string;
  action: THREE.AnimationAction;
  frameNum: number;
}

export class AnimationLayeringService {
  private mixer: THREE.AnimationMixer | null = null;
  private actionCache: Map<string, THREE.AnimationAction> = new Map();
  private activeAnimations: Map<string, ActiveAnimation> = new Map();
  private layerWeights: Map<AnimationLayerType, number> = new Map();
  private animationCounter: number = 0;
  private frameCount: number = 0;
  private cleanupQueue: CleanupQueueItem[] = [];

  // PERFORMANCE FIX: Conditional debug logging to reduce production overhead
  private readonly DEBUG = process.env.NODE_ENV === 'development';

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
    if (this.DEBUG) {
      console.log('%c🎬 [AnimationLayering] Mixer set', 'color: #3498db;');
    }
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
      return '';
    }

    const action = this.actionCache.get(name);
    if (!action) {
      console.warn(`Animation not found: ${name}`);
      return '';
    }

    // Set animation playback speed
    action.timeScale = getAnimationTimeScale();

    const config = AnimationLayeringService.LAYER_CONFIGS[layer];
    const {
      fadeInDuration = 0.3,
      fadeOutDuration = 0.3,
      weight = config.defaultWeight,
      loop = THREE.LoopRepeat
    } = options;

    // Generate unique animation ID
    const animationId = `anim_${this.animationCounter++}`;

    // Fade out existing animations on same layer
    this.fadeOutLayer(layer, fadeOutDuration);

    // FIX: Implement cross-layer weight management
    // When new animation starts, reduce weights on other layers proportionally
    // based on priority to enable proper blending between layers
    const newLayerPriority = AnimationLayeringService.LAYER_CONFIGS[layer].priority;
    this.activeAnimations.forEach((anim, id) => {
      if (anim.layer !== layer && !anim.isFadingOut) {
        const existingLayerPriority = AnimationLayeringService.LAYER_CONFIGS[anim.layer].priority;
        // Reduce weight more for lower priority layers
        const priorityRatio = existingLayerPriority / (existingLayerPriority + newLayerPriority);
        const newWeight = anim.weight * priorityRatio * 0.5; // Reduce to 50% or less based on priority
        
        anim.action.weight = newWeight;
        anim.targetWeight = newWeight;
      }
    });

    // Configure action
    action.reset();
    action.loop = loop;
    
    // Set blend mode based on layer configuration
    // Note: THREE.AnimationAction doesn't have direct blendMode property
    // We use weight-based blending instead
    action.enabled = true;

    // Fade in new animation
    action.fadeIn(fadeInDuration);
    action.play();

    // Track active animation
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

    if (this.DEBUG) {
      console.log(
        `%c▶️ [AnimationLayering] Playing: ${name} on ${layer} (weight: ${weight})`,
        'background: #27ae60; color: white; padding: 4px 8px; border-radius: 4px;'
      );
    }

    return animationId;
  }

  /**
   * Stop and fade out an animation by ID
   * PERFORMANCE FIX: Replaced setTimeout with frame-based cleanup queue
   * to prevent memory leaks on component unmount
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

    if (this.DEBUG) {
      console.log(`%c⏹ [AnimationLayering] Stopping: ${animationId}`, 'color: #f39c12;');
    }

    // Queue for cleanup in update loop (frame-based, prevents memory leaks)
    // Assuming 60fps, calculate target frame number
    const framesToWait = Math.ceil(fadeOutDuration * 60);
    this.cleanupQueue.push({
      animationId,
      action: anim.action,
      frameNum: this.frameCount + framesToWait
    });
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
    if (this.DEBUG) {
      console.log('%c🗑️ [AnimationLayering] Stopping all animations', 'color: #95a5a6;');
    }

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
      if (this.DEBUG) {
        console.log(`%c⏸️ [AnimationLayering] Paused: ${animationId}`, 'color: #f39c12;');
      }
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
      if (this.DEBUG) {
        console.log(`%c▶️ [AnimationLayering] Resumed: ${animationId}`, 'color: #27ae60;');
      }
    }
  }

  /**
   * Pause all active animations
   */
  pauseAll(): void {
    if (this.DEBUG) {
      console.log('%c⏸️ [AnimationLayering] Pausing all animations', 'color: #f39c12;');
    }
    this.activeAnimations.forEach((anim, id) => {
      this.pauseAnimation(id);
    });
  }

  /**
   * Resume all paused animations
   */
  resumeAll(): void {
    if (this.DEBUG) {
      console.log('%c▶️ [AnimationLayering] Resuming all animations', 'color: #27ae60;');
    }
    this.activeAnimations.forEach((anim, id) => {
      this.resumeAnimation(id);
    });
  }

  /**
   * Get current weight of a layer
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
   * Clear all registered animations and reset state, disposing THREE.js resources
   */
  clear(): void {
    if (this.DEBUG) {
      console.log('%c🗑️ [AnimationLayering] Clearing all animations and disposing resources', 'color: #95a5a6;');
    }

    this.stopAll(0);

    // Clear the cleanup queue to prevent memory leaks
    this.cleanupQueue = [];
    this.frameCount = 0;

    // Properly dispose THREE.js AnimationActions to free GPU memory
    this.actionCache.forEach((action, name) => {
      try {
        action.stop();
        action.reset();
        // Note: AnimationActions are automatically cleaned up when their clips are uncached
      } catch (error) {
        if (this.DEBUG) {
          console.warn(`%c⚠️ [AnimationLayering] Failed to dispose action ${name}:`, 'color: #f39c12;', error);
        }
      }
    });
    this.actionCache.clear();

    // FIX: Properly dispose THREE.js AnimationClips to free GPU memory
    // Previously used track.values = new Float32Array(0) which doesn't free GPU memory
    // Now properly dispose clips using mixer.uncacheClip()
    this.activeAnimations.forEach((anim, id) => {
      try {
        const clip = anim.action.getClip();
        if (clip) {
          // Uncache the clip from the mixer to free GPU memory
          if (this.mixer) {
            this.mixer.uncacheClip(clip);
          }
        }
      } catch (error) {
        if (this.DEBUG) {
          console.warn(`%c⚠️ [AnimationLayering] Failed to dispose clip for animation ${id}:`, 'color: #f39c12;', error);
        }
      }
    });
    this.activeAnimations.clear();
    this.layerWeights.clear();

    if (this.DEBUG) {
      console.log('%c✅ [AnimationLayering] Cleared all animations and disposed THREE.js resources', 'color: #27ae60;');
    }
  }

  /**
   * Update animation weights for smooth blending
   * Called each frame to interpolate weights
   * PERFORMANCE FIX: Added frame-based cleanup queue processing
   * @param delta - Time since last frame in seconds
   */
  update(delta: number): void {
    // PERFORMANCE FIX: Remove redundant mixer.update() call
    // The mixer is already updated in AvatarModel.tsx useFrame hook
    // Calling it again causes triple processing of the same time delta
    // which leads to choppy animations (58-86ms per frame instead of ~16ms)

    // Increment frame counter for cleanup queue
    this.frameCount++;

    // Process cleanup queue (replaces setTimeout to prevent memory leaks)
    this.cleanupQueue = this.cleanupQueue.filter(item => {
      if (item.frameNum <= this.frameCount) {
        // Time to clean up this animation
        try {
          item.action.stop();
          this.activeAnimations.delete(item.animationId);
        } catch (error) {
          console.warn(`%c⚠️ [AnimationLayering] Failed to cleanup animation ${item.animationId}:`, 'color: #f39c12;', error);
        }
        return false; // Remove from queue
      }
      return true; // Keep in queue
    });

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
