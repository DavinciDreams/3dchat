import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';

/**
 * VRMA Animation Service
 * Handles loading and management of VRMA animation files
 */

export interface VRMAAnimation {
  name: string;
  clip: THREE.AnimationClip;
}

export interface VRMAAnimationConfig {
  path: string;
  name: string;
  description?: string;
}

// Available VRMA animations
export const VRMA_ANIMATIONS: VRMAAnimationConfig[] = [
  { path: '/animations/vrma/VRMA_02.vrma', name: 'greeting', description: 'Greeting animation' },
  { path: '/animations/vrma/VRMA_03.vrma', name: 'peace', description: 'Peace sign animation' },
  { path: '/animations/vrma/VRMA_04.vrma', name: 'shoot', description: 'Shoot animation' },
  { path: '/animations/vrma/VRMA_05.vrma', name: 'spin', description: 'Spin animation' },
  { path: '/animations/vrma/VRMA_06.vrma', name: 'modelPose', description: 'Model pose animation' },
  { path: '/animations/vrma/VRMA_07.vrma', name: 'squat', description: 'Squat animation' },
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
    this.loader.register((parser) => new VRMLoaderPlugin(parser));
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
        // VRMA files contain animation clips in the animations array
        const animations = gltf.animations;
        
        if (!animations || animations.length === 0) {
          throw new Error(`No animations found in VRMA file: ${config.path}`);
        }

        // Use the first animation clip from the VRMA file
        const clip = animations[0];
        const animation: VRMAAnimation = {
          name: config.name,
          clip: clip,
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
   * @returns Promise resolving to a map of animation names to animations
   */
  async loadAllAnimations(): Promise<Map<string, VRMAAnimation>> {
    const promises = VRMA_ANIMATIONS.map((config) => this.loadAnimation(config));
    
    try {
      const animations = await Promise.all(promises);
      animations.forEach((animation) => {
        this.loadedAnimations.set(animation.name, animation);
      });
      
      return this.loadedAnimations;
    } catch (error) {
      console.error('Error loading VRMA animations:', error);
      throw error;
    }
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
