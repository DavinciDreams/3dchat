/**
 * VRMA Animation Service (Refactored)
 *
 * Facade service that orchestrates VRMA animation loading, caching, and retargeting.
 * Delegates to specialized services for each concern.
 */

import type { AnimationLayerType } from '../types';
import { animationPriorityService } from './animation/AnimationPriorityService';
import type { IVRMALoaderService } from '../di/ServiceInterfaces';
import type { IVMACacheService } from '../di/ServiceInterfaces';
import type { IVMARetargetingService } from '../di/ServiceInterfaces';
import { getContainer } from '../di/ServiceContainer';
import { SERVICE_TOKENS } from '../di/ServiceTokens';

/**
 * VRMA Animation interface
 */
export interface VRMAAnimation {
  name: string;
  clip: unknown;
  vrmAnimation: unknown; // The raw VRM animation data for retargeting
}

/**
 * VRMA Animation Config interface
 */
export interface VRMAAnimationConfig {
  path: string;
  name: string;
  description?: string;
}

// Import animation configuration from generated file
import {
  VRMA_CORE_ANIMATIONS,
  VRMA_EXTENDED_ANIMATIONS,
  VRMA_GESTURE_ANIMATIONS,
  VRMA_BREAKDANCE_ANIMATIONS,
  VRMA_ANIMATIONS
} from '../generated/animationConfig.generated';

// Map application animation states to VRMA animations
export const ANIMATION_STATE_TO_VRMA: Record<string, string> = {
  'idle': 'modelPose',      // Use model pose for idle
  'talking': 'talking',    // Use talking for talking
  'thinking': 'thinking',        // Use thinking for thinking
  'happy': 'happyIdle',         // Use happyIdle sign for happy
  'agreeing': 'headNod',    // Head nod for agreeing
  'disagreeing': 'shakingHeadNo', // Shake head for disagreeing
  'angry': 'angryGesture',  // Angry gesture
  'cocky': 'beingCocky',    // Cocky pose
  'relieved': 'relievedSigh', // Relieved sigh
  'annoyed': 'annoyedHeadShake', // Annoyed head shake
  'sitting': 'sitting',        // Use sitting for sitting
};

/**
 * VRMA Animation Service (Refactored)
 *
 * Facade that orchestrates VRMA animation loading, caching, and retargeting.
 * Uses dependency injection for the specialized services.
 */
class VRMAAnimationService {
  // Track loading states for animations
  private loadingStates: Map<string, 'idle' | 'loading' | 'loaded' | 'error'> = new Map();
  // Track failed animations for retry logic
  private failedAnimations: Map<string, { count: number; lastError: string }> = new Map();
  // Maximum retries for failed animations
  private readonly MAX_RETRIES = 3;

  // PERFORMANCE FIX: LRU cache management to prevent unbounded memory growth
  private cacheAccessOrder: string[] = []; // Track LRU order (oldest first)
  private estimatedCacheSize: number = 0; // Estimated memory usage in bytes
  private readonly MAX_CACHE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB limit

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
  /**
   * PERFORMANCE FIX: Add timeout wrapper to prevent infinite loading hangs
   * Wraps a promise with a timeout that rejects if not resolved in time
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      )
    ]);
  }

  /**
   * PERFORMANCE FIX: Estimate memory size of an AnimationClip
   * Used for LRU cache size management
   */
  private estimateClipSize(clip: THREE.AnimationClip): number {
    let totalSize = 0;

    // Estimate based on tracks and keyframes
    clip.tracks.forEach(track => {
      // Each track has:
      // - name (string): ~20-50 bytes
      // - times array (Float32Array): 4 bytes per keyframe
      // - values array (Float32Array): varies by track type
      const keyframeCount = track.times.length;
      const nameSize = track.name.length * 2; // UTF-16 encoding
      const timesSize = keyframeCount * 4;
      const valuesSize = track.values.length * 4; // Float32Array

      totalSize += nameSize + timesSize + valuesSize;
    });

    // Add overhead for clip metadata (~1KB)
    totalSize += 1024;

    return totalSize;
  }

  /**
   * PERFORMANCE FIX: Evict least recently used cache entries until under size limit
   * Implements LRU eviction policy to prevent unbounded memory growth
   */
  private evictLRUCacheEntries(): void {
    while (this.estimatedCacheSize > this.MAX_CACHE_SIZE_BYTES && this.cacheAccessOrder.length > 0) {
      // Remove oldest (least recently used) entry
      const lruKey = this.cacheAccessOrder.shift()!;
      const clip = this.retargetedClipCache.get(lruKey);

      if (clip) {
        const clipSize = this.estimateClipSize(clip);
        this.estimatedCacheSize -= clipSize;
        this.retargetedClipCache.delete(lruKey);

        console.log(
          `%c🗑️ [VRMAAnimationService] Evicted LRU cache entry: ${lruKey} (freed ${(clipSize / 1024).toFixed(1)}KB, total: ${(this.estimatedCacheSize / 1024 / 1024).toFixed(1)}MB)`,
          'color: #95a5a6;'
        );
      }
    }
  }

  /**
   * PERFORMANCE FIX: Track cache access for LRU ordering
   * Moves accessed key to end of access order (most recently used)
   */
  private trackCacheAccess(cacheKey: string): void {
    // Remove from current position
    const index = this.cacheAccessOrder.indexOf(cacheKey);
    if (index !== -1) {
      this.cacheAccessOrder.splice(index, 1);
    }

    // Add to end (most recently used)
    this.cacheAccessOrder.push(cacheKey);
  }

  async loadAnimation(config: VRMAAnimationConfig): Promise<VRMAAnimation> {
    // Check cache first
    const cached = this.cache.getAnimation(config.name);
    if (cached) {
      return cached;
    }

    // PERFORMANCE FIX: Wrap loader with 10-second timeout to prevent hangs
    const LOAD_TIMEOUT_MS = 10000; // 10 seconds

    // Create new loading promise with timeout
    const loadPromise = this.withTimeout(
      this.loader.loadAsync(config.path),
      LOAD_TIMEOUT_MS,
      `Animation loading timeout after ${LOAD_TIMEOUT_MS}ms: ${config.name}`
    );

    const promise = loadPromise
      .then((gltf) => {
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
    
    // Load via loader service
    const animations = await this.loader.loadAnimations(animationsToLoad);
    
    // Cache all loaded animations
    for (const [name, animation] of animations.entries()) {
      this.cache.setAnimation(name, animation);
    }
    
    return animations;
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
    return this.cache.getAnimation(name);
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
   * @returns True if animation is loaded
   */
  isLoaded(name: string): boolean {
    return this.cache.hasAnimation(name);
  }

  /**
   * Get all loaded animation names
   * @returns Array of loaded animation names
   */
  getLoadedAnimationNames(): string[] {
    return this.cache.getAnimationNames ? this.cache.getAnimationNames() : [];
  }

  /**
   * Get or create a retargeted animation clip for a specific model
   * @param vrmAnimation The VRM animation data
   * @param vrm The VRM model instance
   * @param modelId The model ID for caching
   * @param animationName The animation name for caching
   * @param layer Optional animation layer for bone masking
   * @returns The retargeted animation clip
   */
  getOrCreateRetargetedClip(
    vrmAnimation: unknown,
    vrm: unknown,
    modelId: string,
    animationName: string,
    layer?: AnimationLayerType
  ): THREE.AnimationClip {
    const cacheKey = `${modelId}_${animationName}_${layer || 'full'}`;

    // PERFORMANCE FIX: Track cache access for LRU ordering
    // Check cache first
    if (this.retargetedClipCache.has(cacheKey)) {
      this.trackCacheAccess(cacheKey);
      return this.retargetedClipCache.get(cacheKey)!;
    }

    // Create new retargeted clip
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let retargetedClip = createVRMAnimationClip(vrmAnimation as any, vrm as any);

    // Apply bone masking if layer is specified
    if (layer) {
      retargetedClip = maskAnimationClip(retargetedClip, layer);
    }

    // PERFORMANCE FIX: Evict LRU entries if cache size exceeds limit before adding new clip
    const clipSize = this.estimateClipSize(retargetedClip);
    this.estimatedCacheSize += clipSize;

    if (this.estimatedCacheSize > this.MAX_CACHE_SIZE_BYTES) {
      console.log(
        `%c⚠️ [VRMAAnimationService] Cache size exceeded ${(this.MAX_CACHE_SIZE_BYTES / 1024 / 1024).toFixed(0)}MB (${(this.estimatedCacheSize / 1024 / 1024).toFixed(1)}MB), evicting LRU entries...`,
        'color: #f39c12;'
      );
      this.evictLRUCacheEntries();
    }

    // Cache result and track access
    this.retargetedClipCache.set(cacheKey, retargetedClip);
    this.trackCacheAccess(cacheKey);

    return retargetedClip;
  }

  /**
   * Check if a retargeted clip exists in cache
   * @param modelId The model ID
   * @param animationName The animation name
   * @param layer Optional animation layer
   * @returns True if cached
   */
  hasRetargetedClip(modelId: string, animationName: string, layer?: AnimationLayerType): boolean {
    return this.retargeting.hasRetargetedClip(modelId, animationName, layer);
  }

  /**
   * Clear all loaded animations
   * PERFORMANCE FIX: Also clear LRU cache tracking
   */
  clear(): void {
    this.loadedAnimations.clear();
    this.loadingPromises.clear();
    this.retargetedClipCache.clear();
    // Clear LRU cache tracking
    this.cacheAccessOrder = [];
    this.estimatedCacheSize = 0;
  }

  /**
   * Clear retargeted clips for a specific model
   * PERFORMANCE FIX: Also update LRU cache tracking and size estimates
   * @param modelId The model ID to clear clips for
   */
  clearRetargetedClipsForModel(modelId: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.retargetedClipCache.keys()) {
      // Match keys starting with modelId (handles new format: modelId_animName_layer)
      if (key.startsWith(`${modelId}_`)) {
        keysToDelete.push(key);
      }
    }
    // Properly dispose THREE.js AnimationClips to free GPU memory
    keysToDelete.forEach(key => {
      const clip = this.retargetedClipCache.get(key);
      if (clip) {
        // Update cache size estimate
        const clipSize = this.estimateClipSize(clip);
        this.estimatedCacheSize -= clipSize;

        // Dispose clip tracks to free memory
        if (clip.tracks) {
          clip.tracks.forEach(track => {
            // Dispose keyframe track values
            if (track.values) {
              track.values = new Float32Array(0);
            }
          });
          clip.tracks = [];
        }
      }
      this.retargetedClipCache.delete(key);

      // Remove from LRU access order
      const index = this.cacheAccessOrder.indexOf(key);
      if (index !== -1) {
        this.cacheAccessOrder.splice(index, 1);
      }
    });
    console.log(`[VRMAAnimationService] Cleared ${keysToDelete.length} retargeted clips for model: ${modelId}`);
  }

  /**
   * Get number of loaded animations
   */
  getLoadedCount(): number {
    return this.cache.getAnimationCount();
  }

  /**
   * Check if an animation is currently loading
   */
  isLoading(name: string): boolean {
    return this.loadingStates.get(name) === 'loading';
  }

  /**
   * Get loading state for an animation
   */
  getLoadingState(name: string): 'idle' | 'loading' | 'loaded' | 'error' {
    return this.loadingStates.get(name) || 'idle';
  }

  /**
   * Get fallback animation for a given animation name
   */
  getFallbackAnimation(animationName: string): string {
    return getFallbackAnimation(animationName);
  }

  /**
   * Load CRITICAL tier animations synchronously
   * These animations are required for basic avatar functionality
   * @returns Promise resolving when all critical animations are loaded
   */
  async loadCriticalAnimations(): Promise<void> {
    console.log(`%c🚀 [VRMAAnimationService] Loading ${CRITICAL_ANIMATIONS.length} CRITICAL animations...`, 'color: #e74c3c; font-weight: bold;');

    const results = await Promise.allSettled(
      CRITICAL_ANIMATIONS.map(name => {
        const config = VRMA_ANIMATIONS.find(a => a.name === name);
        if (!config) {
          console.warn(`CRITICAL animation config not found: ${name}`);
          return Promise.reject(new Error(`Config not found: ${name}`));
        }
        return this.loadAnimationWithRetry(config);
      })
    );

    let loadedCount = 0;
    let failedCount = 0;

    results.forEach((result, index) => {
      const animName = CRITICAL_ANIMATIONS[index];
      if (result.status === 'fulfilled') {
        loadedCount++;
        this.loadingStates.set(animName, 'loaded');
      } else {
        failedCount++;
        this.loadingStates.set(animName, 'error');
        console.warn(`Failed to load CRITICAL animation: ${animName}`, result.reason);
      }
    });

    console.log(`%c✅ [VRMAAnimationService] Loaded ${loadedCount}/${CRITICAL_ANIMATIONS.length} CRITICAL animations (${failedCount} failed)`, 'color: #27ae60; font-weight: bold;');
  }

  /**
   * Load HIGH priority animations in background batches
   * PERFORMANCE FIX: Changed from sequential to parallel batch loading
   * Eliminates 100ms delays between batches (500-800ms faster)
   * These animations are frequently used but not critical for initial load
   * @returns Promise resolving when all high priority animations are loaded
   */
  async loadHighPriorityAnimations(): Promise<void> {
    console.log(`%c🔄 [VRMAAnimationService] Starting parallel load of ${HIGH_PRIORITY_ANIMATIONS.length} HIGH priority animations...`, 'color: #f39c12; font-weight: bold;');

    const batchSize = 5;
    const batches: string[][] = [];

    // Split into batches
    for (let i = 0; i < HIGH_PRIORITY_ANIMATIONS.length; i += batchSize) {
      batches.push(HIGH_PRIORITY_ANIMATIONS.slice(i, i + batchSize));
    }

    // PERFORMANCE FIX: Load all batches in parallel instead of sequentially
    // This eliminates the 100ms delay per batch (600ms saved for 6 batches)
    const allResults = await Promise.all(
      batches.map((batch, batchIndex) => {
        console.log(`%c📦 [VRMAAnimationService] Starting HIGH priority batch ${batchIndex + 1}/${batches.length} (${batch.length} animations)...`, 'color: #3498db;');

        return Promise.allSettled(
          batch.map(name => {
            const config = VRMA_ANIMATIONS.find(a => a.name === name);
            if (!config) {
              console.warn(`HIGH priority animation config not found: ${name}`);
              return Promise.reject(new Error(`Config not found: ${name}`));
            }
            return this.loadAnimationWithRetry(config);
          })
        ).then(results => ({ batch, results }));
      })
    );

    // Process results from all batches
    let loadedCount = 0;
    let failedCount = 0;

    allResults.forEach(({ batch, results }) => {
      results.forEach((result, index) => {
        const animName = batch[index];
        if (result.status === 'fulfilled') {
          loadedCount++;
          this.loadingStates.set(animName, 'loaded');
        } else {
          failedCount++;
          this.loadingStates.set(animName, 'error');
          // Log but don't fail whole batch
          console.debug(`Failed to load HIGH priority animation: ${animName}`);
        }
      });
    });

    console.log(`%c✅ [VRMAAnimationService] Parallel load complete: ${loadedCount}/${HIGH_PRIORITY_ANIMATIONS.length} HIGH priority animations loaded (${failedCount} failed)`, 'color: #27ae60; font-weight: bold;');
  }

  /**
   * Clear retargeted clips for a specific model
   */
  clearRetargetedClipsForModel(modelId: string): void {
    this.retargeting.clearCacheForModel(modelId);
  }
}

// Export singleton instance for backward compatibility
export const vrmaAnimationService = new VRMAAnimationService();
export default vrmaAnimationService;

// Re-export animation configurations for backward compatibility
export {
  VRMA_CORE_ANIMATIONS,
  VRMA_EXTENDED_ANIMATIONS,
  VRMA_GESTURE_ANIMATIONS,
  VRMA_BREAKDANCE_ANIMATIONS,
  VRMA_ANIMATIONS
} from '../generated/animationConfig.generated';
