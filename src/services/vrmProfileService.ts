/**
 * VRM Profile Service
 * 
 * Manages VRM profile lookups and operations.
 * wLipSync profiles are binary files created in Unity using the uLipSync asset.
 */

import { VRM_PROFILES, type VRMProfileConfig } from '../config/vrmProfiles';

/**
 * VRM Profile Service
 * 
 * Provides methods to query and manage VRM model profiles
 * for wLipSync integration.
 */
class VRMProfileService {
  /**
   * Get profile configuration for a specific model ID
   * 
   * @param modelId - The model ID to get profile for
   * @returns Profile configuration or null if not found
   */
  getProfile(modelId: string): VRMProfileConfig | null {
    return VRM_PROFILES.find(p => p.modelId === modelId) || null;
  }

  /**
   * Check if a model has an available wLipSync profile
   * 
   * @param modelId - The model ID to check
   * @returns True if profile is available
   */
  hasProfile(modelId: string): boolean {
    const profile = this.getProfile(modelId);
    return profile?.isAvailable ?? false;
  }

  /**
   * Get profile path for a model ID
   * 
   * @param modelId - The model ID to get profile path for
   * @returns Profile path or null if not found or not available
   */
  getProfilePath(modelId: string): string | null {
    const profile = this.getProfile(modelId);
    return profile?.isAvailable ? profile.profilePath : null;
  }

  /**
   * Mark a profile as available (after creating Unity profile)
   * 
   * @param modelId - The model ID to mark as available
   */
  markProfileAvailable(modelId: string): void {
    const profile = this.getProfile(modelId);
    if (profile) {
      profile.isAvailable = true;
      console.log(`[VRMProfileService] Marked profile as available for model: ${modelId}`);
    }
  }

  /**
   * Get all available profile paths for preloading
   * 
   * @returns Array of available profile paths
   */
  getAvailableProfiles(): string[] {
    return VRM_PROFILES
      .filter(p => p.isAvailable)
      .map(p => p.profilePath);
  }
}

// Export singleton instance
export const vrmProfileService = new VRMProfileService();

// Export class for testing
export default VRMProfileService;
