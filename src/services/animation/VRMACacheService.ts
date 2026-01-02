/**
 * VRMA Cache Service
 *
 * Manages caching of VRMA animations and retargeted animation clips.
 * Provides efficient storage and retrieval of loaded animations.
 */

import type { IVMACacheService } from '../../di/ServiceInterfaces';

export interface VRMAAnimation {
  name: string;
  clip: unknown;
  vrmAnimation: unknown;
}

/**
 * VRMA Cache Service
 *
 * Caches VRMA animations and retargeted clips for efficient reuse.
 * Maintains separate caches for raw animations and retargeted clips.
 */
export class VRMACacheService implements IVMACacheService {
  private animationCache: Map<string, VRMAAnimation> = new Map();
  private retargetedClipCache: Map<string, unknown> = new Map();

  /**
   * Get cached VRMA animation
   * @param name The animation name
   * @returns The cached animation or undefined if not found
   */
  getAnimation(name: string): VRMAAnimation | undefined {
    return this.animationCache.get(name);
  }

  /**
   * Cache a VRMA animation
   * @param name The animation name
   * @param animation The animation to cache
   */
  setAnimation(name: string, animation: VRMAAnimation): void {
    this.animationCache.set(name, animation);
  }

  /**
   * Check if animation is cached
   * @param name The animation name
   * @returns True if animation is cached
   */
  hasAnimation(name: string): boolean {
    return this.animationCache.has(name);
  }

  /**
   * Get cached retargeted clip
   * @param modelId The model ID
   * @param animationName The animation name
   * @param layer Optional animation layer
   * @returns The cached retargeted clip or undefined if not found
   */
  getRetargetedClip(modelId: string, animationName: string, layer?: string): unknown | undefined {
    const cacheKey = `${modelId}_${animationName}_${layer || 'full'}`;
    return this.retargetedClipCache.get(cacheKey);
  }

  /**
   * Cache a retargeted clip
   * @param modelId The model ID
   * @param animationName The animation name
   * @param layer Optional animation layer
   * @param clip The retargeted clip to cache
   */
  setRetargetedClip(modelId: string, animationName: string, layer: string | undefined, clip: unknown): void {
    const cacheKey = `${modelId}_${animationName}_${layer || 'full'}`;
    this.retargetedClipCache.set(cacheKey, clip);
  }

  /**
   * Check if retargeted clip is cached
   * @param modelId The model ID
   * @param animationName The animation name
   * @param layer Optional animation layer
   * @returns True if retargeted clip is cached
   */
  hasRetargetedClip(modelId: string, animationName: string, layer?: string): boolean {
    const cacheKey = `${modelId}_${animationName}_${layer || 'full'}`;
    return this.retargetedClipCache.has(cacheKey);
  }

  /**
   * Clear all cached animations and retargeted clips
   */
  clear(): void {
    this.animationCache.clear();
    this.retargetedClipCache.clear();
  }

  /**
   * Clear retargeted clips for a specific model
   * @param modelId The model ID
   */
  clearRetargetedClipsForModel(modelId: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.retargetedClipCache.keys()) {
      // Match keys starting with modelId (handles format: modelId_animName_layer)
      if (key.startsWith(`${modelId}_`)) {
        keysToDelete.push(key);
      }
    }
    // Properly dispose THREE.js AnimationClips to free GPU memory
    keysToDelete.forEach(key => {
      const clip = this.retargetedClipCache.get(key);
      if (clip && typeof clip === 'object' && clip !== null && 'tracks' in clip) {
        // Dispose clip tracks to free memory
        const clipWithTracks = clip as { tracks: Array<{ values?: Float32Array }> };
        if (Array.isArray(clipWithTracks.tracks)) {
          clipWithTracks.tracks.forEach((track) => {
            // Dispose keyframe track values
            if (track.values) {
              track.values = new Float32Array(0);
            }
          });
          clipWithTracks.tracks = [];
        }
      }
      this.retargetedClipCache.delete(key);
    });
  }

  /**
   * Get count of cached animations
   * @returns Number of cached animations
   */
  getAnimationCount(): number {
    return this.animationCache.size;
  }

  /**
   * Get all cached animation names
   * @returns Array of cached animation names
   */
  getAnimationNames(): string[] {
    return Array.from(this.animationCache.keys());
  }

  /**
   * Get number of cached retargeted clips
   * @returns Number of cached retargeted clips
   */
  getRetargetedClipCount(): number {
    return this.retargetedClipCache.size;
  }
}

// Export singleton instance for backward compatibility
export const vrmaCacheService = new VRMACacheService();
export default vrmaCacheService;
