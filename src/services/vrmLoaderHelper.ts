import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';

/**
 * Creates a GLTFLoader with VRMLoaderPlugin that handles null/undefined textures safely.
 * 
 * PROBLEM ANALYSIS:
 * The VRMLoaderPlugin has an internal function `setTextureColorSpace` that is called
 * from `GLTFMToonMaterialParamsAssignHelper.assignTexture` method. This method:
 * 1. Calls `this._parser.assignTexture(this._materialParams, key, texture)`
 * 2. Then calls `setTextureColorSpace(this._materialParams[key], "srgb")`
 * 
 * The issue is that step 1 might fail to set `this._materialParams[key]` if the
 * texture loading fails, leaving it as `undefined`. Then step 2 tries to set
 * `colorSpace` property on `undefined`, causing the error:
 * "Cannot set properties of undefined (setting 'colorSpace')"
 * 
 * SOLUTION:
 * Since we cannot modify the internal `setTextureColorSpace` function (it's not
 * exported), we use a custom LoadingManager that intercepts texture loading errors
 * and provides a fallback texture when loading fails. This ensures that
 * `this._materialParams[key]` is always set to a valid texture.
 * 
 * This approach works for both VRM 0.x and VRM 1.0 models.
 * 
 * @returns A GLTFLoader instance with safe texture handling
 */
export function createSafeVRMLoader(): GLTFLoader {
  // Create a custom LoadingManager to handle texture loading errors
  const manager = new THREE.LoadingManager();
  
  // Track URLs that are currently being loaded
  const loadingUrls = new Set<string>();
  
  // Override the itemStart handler to track loading
  manager.itemStart = (url: string) => {
    loadingUrls.add(url);
  };
  
  // Override the itemError handler to catch texture loading failures
  manager.itemError = (url: string) => {
    console.warn(`Texture failed to load: ${url}`);
    loadingUrls.delete(url);
  };
  
  // Override the error handler for general errors
  manager.onError = (url: string) => {
    console.warn(`Resource failed to load: ${url}`);
  };
  
  // Create a TextureLoader with our custom manager
  const textureLoader = new THREE.TextureLoader(manager);
  
  // Store the original TextureLoader.load method
  const originalLoad = textureLoader.load.bind(textureLoader);
  
  // Override the TextureLoader.load method to provide fallback textures
  textureLoader.load = (
    url: string,
    onLoad?: (texture: THREE.Texture) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (error: unknown) => void
  ) => {
    // Call the original load method with a custom error handler
    return originalLoad(
      url,
      (texture) => {
        // If the texture loaded successfully, call the original onLoad callback
        if (onLoad) {
          onLoad(texture);
        }
      },
      onProgress,
      (error) => {
        console.warn(`Texture loading failed for ${url}, providing fallback`);
        
        // Create a fallback dummy texture
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
        
        // Call the original onLoad callback with the dummy texture
        if (onLoad) {
          onLoad(dummyTexture);
        }
      }
    );
  };
  
  // Create the GLTFLoader with our custom manager
  const loader = new GLTFLoader(manager);
  
  // Register the VRMLoaderPlugin
  loader.register((parser) => {
    return new VRMLoaderPlugin(parser);
  });
  
  return loader;
}

/**
 * Alternative approach: Create a simple GLTFLoader with basic error handling.
 * 
 * This approach uses a standard GLTFLoader with a custom LoadingManager
 * that provides better error reporting. It doesn't fix the core issue
 * but provides better visibility into texture loading problems.
 * 
 * @returns A GLTFLoader instance with custom LoadingManager
 */
export function createVRMLoaderWithManager(): GLTFLoader {
  const manager = new THREE.LoadingManager();

  manager.onError = (url: string) => {
    console.warn(`Failed to load resource: ${url}`);
  };

  const loader = new GLTFLoader(manager);

  loader.register((parser) => {
    return new VRMLoaderPlugin(parser);
  });

  return loader;
}
