/**
 * VRMA Loader Service
 *
 * Handles loading VRMA animation files with custom texture error handling.
 * VRMA files reference external textures that don't exist, so we need
 * to gracefully handle these errors to prevent console spam and loading failures.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMAnimationLoaderPlugin } from '@pixiv/three-vrm-animation';
import type { IVRMALoaderService } from '../../di/ServiceInterfaces';

export interface VRMAAnimationConfig {
  path: string;
  name: string;
  description?: string;
}

export interface VRMAAnimation {
  name: string;
  clip: unknown;
  vrmAnimation: unknown;
}

/**
 * VRMA Loader Service
 *
 * Loads VRMA animation files and handles texture errors gracefully.
 * VRMA files reference external textures (e.g., Image_0.jpg) that don't exist.
 * This service creates a custom LoadingManager to suppress these errors.
 */
export class VRMALoaderService implements IVRMALoaderService {
  private loader: GLTFLoader;

  constructor() {
    // Create a custom LoadingManager to handle VRMA texture loading errors gracefully
    // VRMA files reference external textures (e.g., Image_0.jpg) that don't exist
    // This prevents console spam and animation loading failures
    const manager = new THREE.LoadingManager();
    
    // Override error handler to suppress texture warnings for VRMA files
    manager.onError = (url: string) => {
      // Only log texture errors for VRMA files (not VRM models)
      if (url.includes('.vrma') || url.includes('Image_')) {
        // Silently ignore - VRMA animations don't need external textures
        return;
      }
      console.warn(`Failed to load resource: ${url}`);
    };
    
    // Override itemError handler to catch texture loading failures
    manager.itemError = (url: string) => {
      // Silently ignore texture errors for VRMA files
      if (url.includes('Image_')) {
        return;
      }
      console.warn(`Failed to load item: ${url}`);
    };
    
    // Create TextureLoader with custom manager
    const textureLoader = new THREE.TextureLoader(manager);
    const originalLoad = textureLoader.load.bind(textureLoader);
    
    // Override TextureLoader.load to provide fallback for missing textures
    textureLoader.load = (
      url: string,
      onLoad?: (texture: THREE.Texture) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (error: unknown) => void
    ) => {
      // Check if this is an external texture reference from VRMA
      if (url.includes('Image_') && !url.startsWith('data:')) {
        // Create a fallback dummy texture to prevent errors
        const canvas = document.createElement('canvas');
        canvas.width = 4;
        canvas.height = 4;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#808080'; // Neutral gray
          ctx.fillRect(0, 0, 4, 4);
        }
        
        const dummyTexture = new THREE.CanvasTexture(canvas);
        dummyTexture.colorSpace = THREE.SRGBColorSpace;
        dummyTexture.needsUpdate = true;
        
        // Call onLoad callback with dummy texture
        if (onLoad) {
          onLoad(dummyTexture);
        }
        return dummyTexture;
      }
      
      // Normal loading for other textures
      return originalLoad(url, onLoad, onProgress, onError);
    };
    
    // Create GLTFLoader with custom manager
    this.loader = new GLTFLoader(manager);
    this.loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
  }

  /**
   * Load a single VRMA animation file
   * @param config The VRMA animation configuration
   * @returns Promise resolving to loaded animation
   */
  async loadAnimation(config: VRMAAnimationConfig): Promise<VRMAAnimation> {
    try {
      // URL-encode the path to handle spaces and special characters
      const encodedPath = encodeURI(config.path);
      const gltf = await this.loader.loadAsync(encodedPath);
      
      // VRMA files contain animation data in userData.vrmAnimations
      const vrmAnimations = (gltf.userData as { vrmAnimations?: unknown[] }).vrmAnimations;
      
      if (!vrmAnimations || vrmAnimations.length === 0) {
        throw new Error(`No VRM animations found in VRMA file: ${config.path}`);
      }

      // Use first VRM animation from VRMA file
      const vrmAnimation = vrmAnimations[0];
      const animation: VRMAAnimation = {
        name: config.name,
        clip: gltf.animations[0], // Keep raw clip for reference
        vrmAnimation: vrmAnimation, // Store VRM animation data for retargeting
      };

      return animation;
    } catch (error) {
      throw new Error(`Failed to load VRMA animation ${config.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load multiple VRMA animations in batch
   * @param configs Array of VRMA animation configurations
   * @returns Promise resolving to a map of animation names to animations
   */
  async loadAnimations(configs: VRMAAnimationConfig[]): Promise<Map<string, VRMAAnimation>> {
    const results = await Promise.allSettled(
      configs.map((config) => this.loadAnimation(config))
    );

    const animations = new Map<string, VRMAAnimation>();
    let loadedCount = 0;
    let failedCount = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        animations.set(result.value.name, result.value);
        loadedCount++;
      } else {
        failedCount++;
        console.debug(`Animation not available: ${configs[index].name}`);
      }
    });

    console.log(`Loaded ${loadedCount} animations (${failedCount} not available)`);
    return animations;
  }
}

// Export singleton instance for backward compatibility
export const vrmaLoaderService = new VRMALoaderService();
export default vrmaLoaderService;
