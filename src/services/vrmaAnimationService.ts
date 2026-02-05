/**
 * VRMA Animation Service (Refactored)
 *
 * Facade service that orchestrates VRMA animation loading, caching, and retargeting.
 * Delegates to specialized services for each concern.
 */

import type { AnimationLayerType } from '../types';
import { animationPriorityService } from './animation/AnimationPriorityService';
import type { IVRMALoaderService } from '../di/ServiceInterfaces';
import type { IVMACacheService } from '../di/ServiceInterfaces';
import type { IVMARetargetingService } from '../di/ServiceInterfaces';
import { getContainer } from '../di/ServiceContainer';
import { SERVICE_TOKENS } from '../di/ServiceTokens';

/**
 * VRMA Animation interface
 */
export interface VRMAAnimation {
  name: string;
  clip: unknown;
  vrmAnimation: unknown; // The raw VRM animation data for retargeting
}

/**
 * VRMA Animation Config interface
 */
export interface VRMAAnimationConfig {
  path: string;
  name: string;
  description?: string;
}

// Import animation configuration from generated file
import {
  VRMA_CORE_ANIMATIONS,
  VRMA_EXTENDED_ANIMATIONS,
  VRMA_GESTURE_ANIMATIONS,
  VRMA_BREAKDANCE_ANIMATIONS,
  VRMA_ANIMATIONS
} from '../generated/animationConfig.generated';

// Map application animation states to VRMA animations
export const ANIMATION_STATE_TO_VRMA: Record<string, string> = {
  'idle': 'modelPose',      // Use model pose for idle
  'talking': 'talking',    // Use talking for talking
  'thinking': 'thinking',        // Use thinking for thinking
  'happy': 'happyIdle',         // Use happyIdle sign for happy
  'agreeing': 'headNod',    // Head nod for agreeing
  'disagreeing': 'shakingHeadNo', // Shake head for disagreeing
  'angry': 'angryGesture',  // Angry gesture
  'cocky': 'beingCocky',    // Cocky pose
  'relieved': 'relievedSigh', // Relieved sigh
  'annoyed': 'annoyedHeadShake', // Annoyed head shake
  'sitting': 'sitting',        // Use sitting for sitting
};

/**
 * VRMA Animation Service (Refactored)
 *
 * Facade that orchestrates VRMA animation loading, caching, and retargeting.
 * Uses dependency injection for the specialized services.
 */
class VRMAAnimationService {
  // Track loading states for animations
  private loadingStates: Map<string, 'idle' | 'loading' | 'loaded' | 'error'> = new Map();
  // Track failed animations for retry logic
  private failedAnimations: Map<string, { count: number; lastError: string }> = new Map();
  // Maximum retries for failed animations
  private readonly MAX_RETRIES = 3;

  // Lazy-loaded services via DI
  private get loader(): IVRMALoaderService {
    return getContainer().resolve<IVRMALoaderService>(SERVICE_TOKENS.VRMA_LOADER);
  }

  private get cache(): IVMACacheService {
    return getContainer().resolve<IVMACacheService>(SERVICE_TOKENS.VRMA_CACHE);
  }

  private get retargeting(): IVMARetargetingService {
    return getContainer().resolve<IVMARetargetingService>(SERVICE_TOKENS.VRMA_RETARGETING);
  }

  /**
   * Load a single VRMA animation file
   * @param config The VRMA animation configuration
   * @returns Promise resolving to loaded animation
   */
  async loadAnimation(config: VRMAAnimationConfig): Promise<VRMAAnimation> {
    // Check cache first
    const cached = this.cache.getAnimation(config.name);
    if (cached) {
      return cached;
    }

    // Load via loader service
    const animation = await this.loader.loadAnimation(config);
    
    // Cache result
    this.cache.setAnimation(config.name, animation);
    
    return animation;
  }

  /**
   * Load all available VRMA animations
   * Gracefully handles missing files - loads only animations that exist
   * @param coreOnly If true, only load core animations (faster startup)
   * @returns Promise resolving to a map of animation names to animations
   */
  async loadAllAnimations(coreOnly = false): Promise<Map<string, VRMAAnimation>> {
    const animationsToLoad = coreOnly ? VRMA_CORE_ANIMATIONS : VRMA_ANIMATIONS;
    
    // Load via loader service
    const animations = await this.loader.loadAnimations(animationsToLoad);
    
    // Cache all loaded animations
    for (const [name, animation] of animations.entries()) {
      this.cache.setAnimation(name, animation);
    }
    
    return animations;
  }

  /**
   * Load only core animations (faster, guaranteed to exist)
   * @returns Promise resolving to a map of animation names to animations
   */
  async loadCoreAnimations(): Promise<Map<string, VRMAAnimation>> {
    return this.loadAllAnimations(true);
  }

  /**
   * Get a loaded animation by name
   * @param name The animation name
   * @returns The animation or undefined if not found
   */
  getAnimation(name: string): VRMAAnimation | undefined {
    return this.cache.getAnimation(name);
  }

  /**
   * Get a VRMA animation for a specific application state
   * @param state The application state (idle, talking, thinking, happy)
   * @returns The VRMA animation or undefined if not found
   */
  getAnimationForState(state: string): VRMAAnimation | undefined {
    const vrmaName = ANIMATION_STATE_TO_VRMA[state];
    if (!vrmaName) {
      console.warn(`No VRMA mapping for state: ${state}`);
      return undefined;
    }
    return this.getAnimation(vrmaName);
  }

  /**
   * Check if an animation is loaded
   * @param name The animation name
   * @returns True if animation is loaded
   */
  isLoaded(name: string): boolean {
    return this.cache.hasAnimation(name);
  }

  /**
   * Get all loaded animation names
   * @returns Array of loaded animation names
   */
  getLoadedAnimationNames(): string[] {
    return this.cache.getAnimationNames ? this.cache.getAnimationNames() : [];
  }

  /**
   * Get or create a retargeted animation clip for a specific model
   * @param vrmAnimation The VRM animation data
   * @param vrm The VRM model instance
   * @param modelId The model ID for caching
   * @param animationName The animation name for caching
   * @param layer Optional animation layer for bone masking
   * @returns The retargeted animation clip
   */
  getOrCreateRetargetedClip(
     vrmAnimation: unknown,
     vrm: unknown,
     modelId: string,
     animationName: string,
     layer?: AnimationLayerType
  ): unknown {
    return this.retargeting.createRetargetedClip(
      vrmAnimation,
      vrm,
      modelId,
      animationName,
      layer
    );
  }

  /**
   * Check if a retargeted clip exists in cache
   * @param modelId The model ID
   * @param animationName The animation name
   * @param layer Optional animation layer
   * @returns True if cached
   */
  hasRetargetedClip(modelId: string, animationName: string, layer?: AnimationLayerType): boolean {
    return this.retargeting.hasRetargetedClip(modelId, animationName, layer);
  }

  /**
   * Clear all loaded animations
   */
  clear(): void {
    this.cache.clear();
    this.loadingStates.clear();
    this.failedAnimations.clear();
  }

  /**
   * Get number of loaded animations
   */
  getLoadedCount(): number {
    return this.cache.getAnimationCount();
  }

  /**
   * Check if an animation is currently loading
   */
  isLoading(name: string): boolean {
    return this.loadingStates.get(name) === 'loading';
  }

  /**
   * Get loading state for an animation
   */
  getLoadingState(name: string): 'idle' | 'loading' | 'loaded' | 'error' {
    return this.loadingStates.get(name) || 'idle';
  }

  /**
   * Get fallback animation for a given animation name
   */
  getFallbackAnimation(animationName: string): string {
    return animationPriorityService.getFallbackAnimation(animationName);
  }

  /**
   * Clear retargeted clips for a specific model
   */
  clearRetargetedClipsForModel(modelId: string): void {
    this.retargeting.clearCacheForModel(modelId);
  }
}

// Export singleton instance for backward compatibility
export const vrmaAnimationService = new VRMAAnimationService();
export default vrmaAnimationService;

// Re-export animation configurations for backward compatibility
export {
  VRMA_CORE_ANIMATIONS,
  VRMA_EXTENDED_ANIMATIONS,
  VRMA_GESTURE_ANIMATIONS,
  VRMA_BREAKDANCE_ANIMATIONS,
  VRMA_ANIMATIONS
} from '../generated/animationConfig.generated';
