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
  /** Path to wLipSync profile JSON file */
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
