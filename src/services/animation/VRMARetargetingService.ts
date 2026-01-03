/**
 * VRMA Retargeting Service
 *
 * Handles retargeting VRMA animations to specific VRM models.
 * Uses createVRMAnimationClip from @pixiv/three-vrm-animation.
 * 
 * Note: Bone masking has been removed. AnimationLayeringService now handles
 * layering through Three.js native AnimationMixer blending.
 */

import { createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import type { IVMARetargetingService } from '../../di/ServiceInterfaces';
import type { IVMACacheService } from '../../di/ServiceInterfaces';
import vrmaAnimationService from '../vrmaAnimationService';

/**
 * VRMA Retargeting Service
 *
 * Retargets VRMA animations to VRM models and caches results.
 * Note: Bone masking has been removed. AnimationLayeringService handles
 * layering through Three.js native AnimationMixer blending.
 */
export class VRMARetargetingService implements IVMARetargetingService {
  constructor(
    private cache: IVMACacheService
  ) {}

  /**
   * Create a retargeted animation clip for a specific model
   * @param vrmAnimation The VRM animation data
   * @param vrm The VRM model instance
   * @param modelId The model ID for caching
   * @param animationName The animation name for caching
   * @param layer Optional animation layer for caching
   * @returns The retargeted animation clip
   */
  createRetargetedClip(
    vrmAnimation: unknown,
    vrm: unknown,
    modelId: string,
    animationName: string,
    layer?: string
  ): unknown {
    // Check cache first
    if (this.cache.hasRetargetedClip(modelId, animationName, layer)) {
      return this.cache.getRetargetedClip(modelId, animationName, layer);
    }
    
    // Create new retargeted clip
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const retargetedClip = createVRMAnimationClip(vrmAnimation as any, vrm as any);
    
    // Note: Bone masking has been removed. AnimationLayeringService handles
    // layering through Three.js native AnimationMixer blending.
    // The layer parameter is now only used for caching purposes.
    
    // Cache result
    this.cache.setRetargetedClip(modelId, animationName, layer, retargetedClip);
    
    return retargetedClip;
  }

  /**
   * Check if a retargeted clip exists in cache
   * @param modelId The model ID
   * @param animationName The animation name
   * @param layer Optional animation layer
   * @returns True if cached
   */
  hasRetargetedClip(modelId: string, animationName: string, layer?: string): boolean {
    return this.cache.hasRetargetedClip(modelId, animationName, layer);
  }

  /**
   * Clear retargeted clips for a specific model
   * @param modelId The model ID
   */
  clearCacheForModel(modelId: string): void {
    this.cache.clearRetargetedClipsForModel(modelId);
  }

  /**
   * Pre-populate cache with retargeted clips for a list of animations
   * This should be called during initial loading to avoid blocking on-demand playback
   * PERFORMANCE FIX: Reduces animation startup delay by 100-300ms for commonly used animations
   *
   * @param vrm The VRM model instance
   * @param animations Array of animation names and layers to pre-cache
   */
  async preCacheRetargetedClips(
    vrm: unknown,
    animations: { name: string; layer?: string }[]
  ): Promise<void> {
    // Get model ID from VRM (extract from VRM object)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modelId = (vrm as any)?.scene?.uuid || 'default';
    
    // Process in batches to avoid blocking main thread
    const BATCH_SIZE = 3;
    for (let i = 0; i < animations.length; i += BATCH_SIZE) {
      const batch = animations.slice(i, i + BATCH_SIZE);
      
      await Promise.all(
        batch.map(async ({ name, layer }) => {
          if (!this.cache.hasRetargetedClip(modelId, name, layer)) {
            try {
              // Load VRMA animation file
              const loadedAnim = await vrmaAnimationService.loadAnimation(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                { name, path: `/animations/vrma/${name}.vrma` } as any
              );
              if (!loadedAnim) {
                return;
              }
              
              // Create retargeted clip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const retargetedClip = createVRMAnimationClip(
                loadedAnim.vrmAnimation as any,
                vrm as any
              );
              
              // Cache result
              this.cache.setRetargetedClip(modelId, name, layer, retargetedClip);
            } catch (error) {
              // Silently fail - some animations may not be compatible
              console.warn(`Failed to pre-cache animation '${name}':`, error);
            }
          }
        })
      );
      
      // Yield to main thread between batches
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}

// Export singleton instance for backward compatibility
let vrmaRetargetingServiceInstance: VRMARetargetingService | null = null;
let initializationPromise: Promise<VRMARetargetingService> | null = null;

export function getVRMARetargetingService(): VRMARetargetingService | null {
  if (!vrmaRetargetingServiceInstance) {
    if (!initializationPromise) {
      // Dynamic import to avoid circular dependency
      initializationPromise = import('./VRMACacheService').then(({ vrmaCacheService }) => {
        vrmaRetargetingServiceInstance = new VRMARetargetingService(vrmaCacheService);
        return vrmaRetargetingServiceInstance;
      });
    }
    // Return null while initializing
    return null;
  }
  return vrmaRetargetingServiceInstance;
}

export default getVRMARetargetingService;
