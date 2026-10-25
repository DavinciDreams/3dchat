import * as THREE from 'three';
import type { AnimationLayerType } from '../types';
import { getAnimationTimeScale } from '../config/animationSpeedConfig';
import {
  getLayerConfig,
  getLayerPriority
} from '../config/animationLayerConfig';

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
  /** Duration of animation in seconds (0 for infinite loop) */
  duration?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
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
  duration: number;
  onComplete?: () => void;
  hasCompleted: boolean;
  fadeStartWeight: number;
  fadeElapsed: number;
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
export class AnimationLayeringService {
  private mixer: THREE.AnimationMixer | null = null;
  private actionCache: Map<string, THREE.AnimationAction> = new Map();
  private activeAnimations: Map<string, ActiveAnimation> = new Map();
  private layerWeights: Map<AnimationLayerType, number> = new Map();
  private animationCounter: number = 0;

  // PERFORMANCE FIX: Conditional debug logging to reduce production overhead
  private readonly DEBUG = process.env.NODE_ENV === 'development';

  constructor(mixer?: THREE.AnimationMixer) {
    if (mixer) {
      this.setMixer(mixer);
    }
  }

  /**
   * Set or update AnimationMixer
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

    const config = getLayerConfig(layer);
    const {
      fadeInDuration = 0.3,
      fadeOutDuration = 0.3,
      weight = config.defaultWeight,
      loop = THREE.LoopRepeat,
      duration = 0,
      onComplete
    } = options;

    // A queued repeat of the same move continues at its current phase.
    let startWeight = 0;
    let resume = false;
    for (const [id, active] of this.activeAnimations) {
      if (active.action !== action) continue;
      if (active.layer === layer && !active.isFadingOut) return id;
      startWeight = active.weight;
      resume = true;
      this.activeAnimations.delete(id);
    }

    // Generate unique animation ID
    const animationId = `anim_${this.animationCounter++}`;

    // Fade out existing animations on same layer
    this.fadeOutLayer(layer, fadeInDuration);

    // FIX: Implement cross-layer weight management
    // When new animation starts, reduce weights on other layers proportionally
    // based on priority to enable proper blending between layers
    const newLayerPriority = getLayerPriority(layer);
    this.activeAnimations.forEach((anim) => {
      if (anim.layer !== layer && !anim.isFadingOut) {
        const existingLayerPriority = getLayerPriority(anim.layer);
        // Reduce weight more for lower priority layers
        const priorityRatio = existingLayerPriority / (existingLayerPriority + newLayerPriority);
        const newWeight = anim.weight * priorityRatio * 0.5; // Reduce to 50% or less based on priority
        
        anim.weight = newWeight;
        anim.action.setEffectiveWeight(newWeight);
        anim.targetWeight = newWeight;
      }
    });

    // Configure action
    if (!resume) action.reset();
    action.stopFading();
    action.loop = loop;
    
    // Set blend mode based on layer configuration
    // Note: THREE.AnimationAction doesn't have direct blendMode property
    // We use weight-based blending instead
    action.enabled = true;

    // Fade in new animation
    action.setEffectiveWeight(startWeight);
    action.play();

    // Track active animation
    this.activeAnimations.set(animationId, {
      action,
      layer,
      weight: startWeight,
      targetWeight: weight,
      fadeInDuration,
      fadeOutDuration,
      startTime: performance.now(),
      isFadingIn: true,
      isFadingOut: false,
      duration,
      onComplete,
      hasCompleted: false,
      fadeStartWeight: startWeight,
      fadeElapsed: 0,
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
   * Fade and cleanup use elapsed animation time at any refresh rate.
   * @param animationId - ID of animation to stop
   * @param fadeOutDuration - Duration of fade-out in seconds
   */
  stopAnimation(animationId: string, fadeOutDuration: number = 0.3): void {
    const anim = this.activeAnimations.get(animationId);
    if (!anim) {
      return;
    }

    anim.isFadingOut = true;
    anim.isFadingIn = false;
    anim.fadeStartWeight = anim.weight;
    anim.fadeElapsed = 0;
    anim.fadeOutDuration = fadeOutDuration;

    if (this.DEBUG) {
      console.log(`%c⏹ [AnimationLayering] Stopping: ${animationId}`, 'color: #f39c12;');
    }

  }

  /**
   * Fade out all animations on a specific layer
   * @param layer - Layer to fade out
   * @param duration - Fade duration in seconds
   */
  fadeOutLayer(layer: AnimationLayerType, duration: number = 0.3): void {
    this.activeAnimations.forEach((anim, animationId) => {
      if (anim.layer === layer) {
        this.stopAnimation(animationId, duration);
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

    this.activeAnimations.forEach((_anim, id) => {
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
    this.activeAnimations.forEach((_anim, id) => {
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
    this.activeAnimations.forEach((_anim, id) => {
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
   * Clear all registered animations and reset state, disposing THREE.js resources
   */
  clear(): void {
    if (this.DEBUG) {
      console.log('%c🗑️ [AnimationLayering] Clearing all animations and disposing resources', 'color: #95a5a6;');
    }

    this.stopAll(0);


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
   * @param delta - Time since last frame in seconds
   */
  update(delta: number): void {
    // PERFORMANCE FIX: Remove redundant mixer.update() call
    // The mixer is already updated in AvatarModel.tsx useFrame hook
    // Calling it again causes triple processing of same time delta
    // which leads to choppy animations (58-86ms per frame instead of ~16ms)

    // Update animation weights for smooth blending
    this.activeAnimations.forEach((anim, animationId) => {
      if (!anim.isFadingOut && !anim.hasCompleted && anim.duration > 0 &&
          (performance.now() - anim.startTime) / 1000 >= anim.duration) {
        anim.hasCompleted = true;
        this.stopAnimation(animationId, anim.fadeOutDuration);
        anim.onComplete?.();
      }

      if (anim.action.paused) return;
      anim.fadeElapsed += Math.max(0, delta);
      if (anim.isFadingOut) {
        const progress = anim.fadeOutDuration > 0 ? Math.min(1, anim.fadeElapsed / anim.fadeOutDuration) : 1;
        anim.weight = anim.fadeStartWeight * (1 - progress);
        anim.action.setEffectiveWeight(anim.weight);
        if (progress === 1) {
          anim.action.stop();
          this.activeAnimations.delete(animationId);
        }
      } else if (anim.isFadingIn) {
        const progress = anim.fadeInDuration > 0 ? Math.min(1, anim.fadeElapsed / anim.fadeInDuration) : 1;
        anim.weight = anim.fadeStartWeight + (anim.targetWeight - anim.fadeStartWeight) * progress;
        anim.action.setEffectiveWeight(anim.weight);
        if (progress === 1) anim.isFadingIn = false;
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
}

// Export singleton instance
export const animationLayeringService = new AnimationLayeringService();

// Export class for testing
export default AnimationLayeringService;
