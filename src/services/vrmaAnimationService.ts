import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMAnimationLoaderPlugin } from '@pixiv/three-vrm-animation';

/**
 * VRMA Animation Service
 * Handles loading and management of VRMA animation files
 */

export interface VRMAAnimation {
  name: string;
  clip: THREE.AnimationClip;
  vrmAnimation: unknown; // The raw VRM animation data for retargeting
}

export interface VRMAAnimationConfig {
  path: string;
  name: string;
  description?: string;
}

// Available VRMA animations - Original VRM Motion Pack
export const VRMA_CORE_ANIMATIONS: VRMAAnimationConfig[] = [
  { path: '/animations/vrma/VRMA_02.vrma', name: 'greeting', description: 'Greeting animation' },
  { path: '/animations/vrma/VRMA_03.vrma', name: 'peace', description: 'Peace sign animation' },
  { path: '/animations/vrma/VRMA_04.vrma', name: 'shoot', description: 'Shoot animation' },
  { path: '/animations/vrma/VRMA_05.vrma', name: 'spin', description: 'Spin animation' },
  { path: '/animations/vrma/VRMA_06.vrma', name: 'modelPose', description: 'Model pose animation' },
  { path: '/animations/vrma/VRMA_07.vrma', name: 'squat', description: 'Squat animation' },
];

// Extended animations from Mixamo (converted from FBX)
// These are the actual converted animations available
export const VRMA_EXTENDED_ANIMATIONS: VRMAAnimationConfig[] = [
  // Idle & Standing
  { path: '/animations/idle.vrma', name: 'idle', description: 'Default standing pose' },
  { path: '/animations/talkingOnPhone.vrma', name: 'talkingOnPhone', description: 'Talking on phone' },

  // Greetings & Social
  { path: '/animations/bowing.vrma', name: 'bowing', description: 'Bow gesture' },
  { path: '/animations/salute.vrma', name: 'salute', description: 'Military-style salute' },
  { path: '/animations/singing.vrma', name: 'singing', description: 'Singing animation' },

  // Dance & Celebration
  { path: '/animations/hipHopDance.vrma', name: 'hipHopDance', description: 'Hip hop dance moves' },
  { path: '/animations/swinging.vrma', name: 'swinging', description: 'Swinging motion' },
  { path: '/animations/catwalkWalkForwardHighKnees.vrma', name: 'catwalk', description: 'Catwalk strut' },

  // Combat & Action
  { path: '/animations/punch.vrma', name: 'punch', description: 'Punch forward' },
  { path: '/animations/dropKick.vrma', name: 'dropKick', description: 'Drop kick attack' },
  { path: '/animations/flyingKneePunchCombo.vrma', name: 'flyingKnee', description: 'Flying knee combo' },
  { path: '/animations/doubleDaggerStab.vrma', name: 'daggerStab', description: 'Double dagger stab' },
  { path: '/animations/bodyBlock.vrma', name: 'bodyBlock', description: 'Body block defense' },
  { path: '/animations/centerBlock.vrma', name: 'centerBlock', description: 'Center block defense' },
  { path: '/animations/catch.vrma', name: 'catch', description: 'Catch something' },
  { path: '/animations/snatch.vrma', name: 'snatch', description: 'Snatch grab' },
  { path: '/animations/reloading.vrma', name: 'reloading', description: 'Reload weapon' },
  { path: '/animations/standing2HMagicAttack01.vrma', name: 'magicCast', description: 'Cast magic spell' },

  // Movement
  { path: '/animations/walking.vrma', name: 'walking', description: 'Walking in place' },
  { path: '/animations/slowJogBackwards.vrma', name: 'jogBackwards', description: 'Jog backwards' },
  { path: '/animations/jumping.vrma', name: 'jumping', description: 'Jump in place' },
  { path: '/animations/climbingToTop.vrma', name: 'climbing', description: 'Climbing up' },
  { path: '/animations/standToCover.vrma', name: 'takeCover', description: 'Take cover' },
  { path: '/animations/zombieStandUp.vrma', name: 'zombieStandUp', description: 'Zombie stand up' },
  { path: '/animations/startPlank.vrma', name: 'plank', description: 'Plank exercise' },
  { path: '/animations/openingDoorInwards.vrma', name: 'openDoor', description: 'Open door' },
  { path: '/animations/unarmedTurnLeft90.vrma', name: 'turnLeft', description: 'Turn left 90 degrees' },
  { path: '/animations/rightTurnWBriefcase.vrma', name: 'turnRight', description: 'Turn right with briefcase' },

  // Sports & Activities
  { path: '/animations/golfBadShot.vrma', name: 'golfBadShot', description: 'Golf bad shot reaction' },
  { path: '/animations/golfPrePutt.vrma', name: 'golfPrePutt', description: 'Golf pre-putt stance' },
];

// Combined list of all animations
export const VRMA_ANIMATIONS: VRMAAnimationConfig[] = [
  ...VRMA_CORE_ANIMATIONS,
  ...VRMA_EXTENDED_ANIMATIONS,
];

// Map application animation states to VRMA animations
export const ANIMATION_STATE_TO_VRMA: Record<string, string> = {
  'idle': 'modelPose',      // Use model pose for idle
  'talking': 'greeting',    // Use greeting for talking
  'thinking': 'spin',        // Use spin for thinking
  'happy': 'peace',         // Use peace sign for happy
};

class VRMAAnimationService {
  private loader: GLTFLoader;
  private loadedAnimations: Map<string, VRMAAnimation> = new Map();
  private loadingPromises: Map<string, Promise<VRMAAnimation>> = new Map();

  constructor() {
    this.loader = new GLTFLoader();
    this.loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
  }

  /**
   * Load a single VRMA animation file
   * @param config The VRMA animation configuration
   * @returns Promise resolving to the loaded animation
   */
  async loadAnimation(config: VRMAAnimationConfig): Promise<VRMAAnimation> {
    // Return cached animation if already loaded
    if (this.loadedAnimations.has(config.name)) {
      return this.loadedAnimations.get(config.name)!;
    }

    // Return existing loading promise if in progress
    if (this.loadingPromises.has(config.name)) {
      return this.loadingPromises.get(config.name)!;
    }

    // Create new loading promise
    const promise = this.loader
      .loadAsync(config.path)
      .then((gltf) => {
        // VRMA files contain animation data in userData.vrmAnimations
        const vrmAnimations = (gltf.userData as { vrmAnimations?: unknown[] }).vrmAnimations;
        
        if (!vrmAnimations || vrmAnimations.length === 0) {
          throw new Error(`No VRM animations found in VRMA file: ${config.path}`);
        }

        // Use the first VRM animation from the VRMA file
        const vrmAnimation = vrmAnimations[0];
        const animation: VRMAAnimation = {
          name: config.name,
          clip: gltf.animations[0], // Keep the raw clip for reference
          vrmAnimation: vrmAnimation, // Store the VRM animation data for retargeting
        };

        this.loadedAnimations.set(config.name, animation);
        this.loadingPromises.delete(config.name);
        
        return animation;
      })
      .catch((error) => {
        this.loadingPromises.delete(config.name);
        throw new Error(`Failed to load VRMA animation ${config.name}: ${error.message}`);
      });

    this.loadingPromises.set(config.name, promise);
    return promise;
  }

  /**
   * Load all available VRMA animations
   * Gracefully handles missing files - loads only animations that exist
   * @param coreOnly If true, only load core animations (faster startup)
   * @returns Promise resolving to a map of animation names to animations
   */
  async loadAllAnimations(coreOnly = false): Promise<Map<string, VRMAAnimation>> {
    const animationsToLoad = coreOnly ? VRMA_CORE_ANIMATIONS : VRMA_ANIMATIONS;

    const results = await Promise.allSettled(
      animationsToLoad.map((config) => this.loadAnimation(config))
    );

    let loadedCount = 0;
    let failedCount = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        loadedCount++;
      } else {
        failedCount++;
        // Don't log errors for extended animations that don't exist yet
        if (!coreOnly) {
          console.debug(`Animation not available: ${animationsToLoad[index].name}`);
        }
      }
    });

    console.log(`Loaded ${loadedCount} animations (${failedCount} not available)`);
    return this.loadedAnimations;
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
    return this.loadedAnimations.get(name);
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
   * @returns True if the animation is loaded
   */
  isLoaded(name: string): boolean {
    return this.loadedAnimations.has(name);
  }

  /**
   * Get all loaded animation names
   * @returns Array of loaded animation names
   */
  getLoadedAnimationNames(): string[] {
    return Array.from(this.loadedAnimations.keys());
  }

  /**
   * Clear all loaded animations
   */
  clear(): void {
    this.loadedAnimations.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get the number of loaded animations
   * @returns The count of loaded animations
   */
  getLoadedCount(): number {
    return this.loadedAnimations.size;
  }
}

// Export singleton instance
export const vrmaAnimationService = new VRMAAnimationService();

// Export types and utilities
export default vrmaAnimationService;
