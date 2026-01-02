/**
 * VRMA Retargeting Service
 *
 * Handles retargeting VRMA animations to specific VRM models.
 * Uses createVRMAnimationClip from @pixiv/three-vrm-animation.
 */

import { createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import type { IVMARetargetingService } from '../../di/ServiceInterfaces';
import type { IVMACacheService } from '../../di/ServiceInterfaces';
import type { AnimationLayerType } from '../../types';
import { maskAnimationClip } from '../../utils/animationMasking';

/**
 * VRMA Retargeting Service
 *
 * Retargets VRMA animations to VRM models and caches the results.
 * Supports optional bone masking via animation layers.
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
   * @param layer Optional animation layer for bone masking
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
    let retargetedClip = createVRMAnimationClip(vrmAnimation as any, vrm as any);
    
    // Apply bone masking if layer is specified
    // Note: maskAnimationClip is deprecated but kept for backward compatibility
    // This will be replaced by AnimationLayeringService in Phase 8
    if (layer) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      retargetedClip = maskAnimationClip(retargetedClip as any, layer as AnimationLayerType);
    }
    
    // Cache the result
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
}

// Export singleton instance for backward compatibility
// Note: This will be replaced with DI in refactored VRMAAnimationService
let vrmaRetargetingServiceInstance: VRMARetargetingService | null = null;

export function getVRMARetargetingService(): VRMARetargetingService {
  if (!vrmaRetargetingServiceInstance) {
    // Dynamic import to avoid circular dependency
    import('./VRMACacheService').then(({ vrmaCacheService }) => {
      vrmaRetargetingServiceInstance = new VRMARetargetingService(vrmaCacheService);
    });
  }
  return vrmaRetargetingServiceInstance!;
}

export default getVRMARetargetingService;
