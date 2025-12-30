/**
 * VRM Profile Configuration for wLipSync
 * 
 * This file maps each VRM model to its corresponding wLipSync profile.
 * wLipSync profiles are binary files created in Unity using the uLipSync asset.
 * 
 * Profile creation process:
 * 1. Import VRM model into Unity
 * 2. Set up uLipSync component with proper blend shape mappings
 * 3. Export profile using uLipSync's profile export feature
 * 4. Place the .json profile file in the public/lipsync-profiles/ directory
 * 
 * @see https://github.com/hecomi/uLipSync for Unity profile creation
 * @see https://github.com/mrxz/wLipSync for wLipSync documentation
 */

/**
 * Profile configuration for a single VRM model
 */
export interface VRMProfileConfig {
  /** Model ID matching AVAILABLE_VRM_MODELS */
  modelId: string;
  /** Path to the wLipSync profile JSON file */
  profilePath: string;
  /** Whether the profile has been created and is available */
  isAvailable: boolean;
}

/**
 * VRM profile configurations
 * 
 * NOTE: Profile paths are placeholders and need to be filled in after
 * creating Unity profiles for each model. Set isAvailable to true
 * when the corresponding profile file exists.
 */
export const VRM_PROFILES: VRMProfileConfig[] = [
  {
    modelId: 'robot',
    profilePath: '/lipsync-profiles/robot.json',
    isAvailable: false,
  },
  {
    modelId: 'auton2',
    profilePath: '/lipsync-profiles/auton2.json',
    isAvailable: false,
  },
  {
    modelId: 'auton3',
    profilePath: '/lipsync-profiles/auton3.json',
    isAvailable: false,
  },
  {
    modelId: 'auton4',
    profilePath: '/lipsync-profiles/auton4.json',
    isAvailable: false,
  },
  {
    modelId: 'auton5',
    profilePath: '/lipsync-profiles/auton5.json',
    isAvailable: false,
  },
  {
    modelId: 'auton6',
    profilePath: '/lipsync-profiles/auton6.json',
    isAvailable: false,
  },
  {
    modelId: 'auton7',
    profilePath: '/lipsync-profiles/auton7.json',
    isAvailable: false,
  },
  {
    modelId: 'auton8',
    profilePath: '/lipsync-profiles/auton8.json',
    isAvailable: false,
  },
  {
    modelId: 'ancientauton',
    profilePath: '/lipsync-profiles/ancientauton.json',
    isAvailable: false,
  },
  {
    modelId: 'ancientauton2',
    profilePath: '/lipsync-profiles/ancientauton2.json',
    isAvailable: false,
  },
  {
    modelId: 'ancientauton4',
    profilePath: '/lipsync-profiles/ancientauton4.json',
    isAvailable: false,
  },
  {
    modelId: 'ancientauton5',
    profilePath: '/lipsync-profiles/ancientauton5.json',
    isAvailable: false,
  },
  {
    modelId: 'ancientauton6',
    profilePath: '/lipsync-profiles/ancientauton6.json',
    isAvailable: false,
  },
];

/**
 * Get profile configuration for a specific model ID
 * 
 * @param modelId - The model ID to get the profile for
 * @returns Profile configuration or null if not found
 */
export function getVRMProfile(modelId: string): VRMProfileConfig | null {
  return VRM_PROFILES.find(p => p.modelId === modelId) || null;
}

/**
 * Check if a model has an available wLipSync profile
 * 
 * @param modelId - The model ID to check
 * @returns True if profile is available
 */
export function hasProfile(modelId: string): boolean {
  const profile = getVRMProfile(modelId);
  return profile?.isAvailable ?? false;
}

/**
 * Get profile path for a model ID
 * 
 * @param modelId - The model ID to get the profile path for
 * @returns Profile path or null if not found or not available
 */
export function getProfilePath(modelId: string): string | null {
  const profile = getVRMProfile(modelId);
  return profile?.isAvailable ? profile.profilePath : null;
}

/**
 * Mark a profile as available (after creating Unity profile)
 * 
 * @param modelId - The model ID to mark as available
 */
export function markProfileAvailable(modelId: string): void {
  const profile = getVRMProfile(modelId);
  if (profile) {
    profile.isAvailable = true;
    console.log(`[vrmProfiles] Marked profile as available for model: ${modelId}`);
  }
}

/**
 * Get all available profile paths for preloading
 * 
 * @returns Array of available profile paths
 */
export function getAvailableProfiles(): string[] {
  return VRM_PROFILES
    .filter(p => p.isAvailable)
    .map(p => p.profilePath);
}
