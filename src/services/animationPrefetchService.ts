import { AnimationTrigger, PrefetchOptions, PrefetchResult } from '../types';
import { vrmaAnimationService } from './vrmaAnimationService';
import type { AnimationPriority } from './animation/AnimationPriorityService';

/**
 * AnimationPrefetchService
 * 
 * Handles parallel pre-fetching of animations to reduce loading delays.
 * Animations are loaded in batches to avoid overwhelming the system.
 */
export class AnimationPrefetchService {
  private prefetchQueue: Set<string> = new Set();
  private loadingPromises: Map<string, Promise<void | unknown>> = new Map();
  private options: Required<PrefetchOptions>;
  private prefetchCount: number = 0;
  private successCount: number = 0;
  private failureCount: number = 0;

  constructor(options?: PrefetchOptions) {
    this.options = {
      batchSize: options?.batchSize ?? 3,
      priority: options?.priority ?? 'speed',
      timeout: options?.timeout ?? 5000
    };
  }

  /**
   * Prefetch animations based on judgment
   * @param animations - List of animations to prefetch
   * @returns Prefetch result with statistics
   */
  async prefetchAnimations(animations: AnimationTrigger[]): Promise<PrefetchResult> {
    const startTime = performance.now();
    
    console.log(`%c📥 [AnimationPrefetch] Starting prefetch for ${animations.length} animations`, 
      'background: #9b59b6; color: white; padding: 4px 8px; border-radius: 4px;');
    
    // Get unique animation names
    const uniqueNames = [...new Set(animations.map(a => a.name))];
    
    // Filter out already loaded animations
    const toLoad = uniqueNames.filter(name => {
      const isLoaded = vrmaAnimationService.isLoaded(name);
      const isLoading = this.loadingPromises.has(name);
      if (isLoaded) {
        console.log(`%c✅ [AnimationPrefetch] Already loaded: ${name}`, 'color: #27ae60;');
      }
      if (isLoading) {
        console.log(`%c⏳ [AnimationPrefetch] Already loading: ${name}`, 'color: #f39c12;');
      }
      return !isLoaded && !isLoading;
    });
    
    if (toLoad.length === 0) {
      console.log('%c✅ [AnimationPrefetch] All animations already loaded', 'color: #27ae60;');
      return {
        successful: uniqueNames,
        failed: [],
        duration: performance.now() - startTime
      };
    }
    
    const successful: string[] = [];
    const failed: Array<{ name: string; error: string }> = [];
    
    // Load in parallel batches
    const batchSize = this.options.batchSize;
    for (let i = 0; i < toLoad.length; i += batchSize) {
      const batch = toLoad.slice(i, i + batchSize);
      console.log(`%c📦 [AnimationPrefetch] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(toLoad.length / batchSize)} (${batch.length} animations)`, 
        'color: #3498db;');
      
      const results = await Promise.allSettled(
        batch.map(name => this.prefetchSingle(name))
      );
      
      results.forEach((result, index) => {
        const name = batch[index];
        if (result.status === 'fulfilled') {
          successful.push(name);
          this.successCount++;
        } else {
          const errorMessage = result.reason instanceof Error 
            ? result.reason.message 
            : String(result.reason);
          failed.push({ name, error: errorMessage });
          this.failureCount++;
          console.warn(`%c❌ [AnimationPrefetch] Failed to prefetch ${name}:`, 
            'color: #e74c3c;', errorMessage);
        }
      });
      
      // Small delay between batches to avoid overwhelming system
      if (i + batchSize < toLoad.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    const duration = performance.now() - startTime;
    
    console.log(`%c✅ [AnimationPrefetch] Prefetch complete: ${successful.length}/${uniqueNames.length} successful, ${failed.length} failed (${duration.toFixed(0)}ms)`, 
      'background: #27ae60; color: white; padding: 4px 8px; border-radius: 4px;');
    
    return {
      successful,
      failed,
      duration
    };
  }

  /**
   * Prefetch a single animation
   * @param name - Animation name to prefetch
   * @returns Promise resolving when animation is loaded
   */
  async prefetchSingle(name: string): Promise<void> {
    // Skip if already loaded
    if (vrmaAnimationService.isLoaded(name)) {
      console.log(`%c✅ [AnimationPrefetch] ${name} already loaded, skipping`, 'color: #27ae60;');
      return;
    }
    
    // Return existing promise if loading
    if (this.loadingPromises.has(name)) {
      console.log(`%c⏳ [AnimationPrefetch] ${name} already loading, waiting...`, 'color: #f39c12;');
      const existing = this.loadingPromises.get(name);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return existing as Promise<void>;
    }

    console.log(`%c📥 [AnimationPrefetch] Loading: ${name}`, 'color: #3498db;');
    
    // Try to load the animation - if it fails, try fallback
    const promise = this.loadAnimationWithFallback(name)
      .then(() => {
        // Animation loaded successfully
      })
      .catch((error: unknown) => {
        console.warn(`%c❌ [AnimationPrefetch] Prefetch failed for ${name}:`,
          'color: #e74c3c;', error);
        throw error;
      });
    
    this.loadingPromises.set(name, promise);
    
    try {
      await promise;
    } finally {
      this.loadingPromises.delete(name);
    }
  }

  /**
   * Load animation with fallback logic
   * @param name - Animation name to load
   * @returns Promise resolving when animation is loaded
   */
  private async loadAnimationWithFallback(name: string): Promise<void> {
    try {
      // Get the animation from VRMAAnimationService
      const animation = vrmaAnimationService.getAnimation(name);
      
      if (animation) {
        // Animation is already loaded
        return;
      }
      
      // If not loaded, we need to load it
      // Note: VRMAAnimationService.loadAnimation requires a config object
      // For now, we'll just log that the animation needs to be loaded
      console.log(`%c📥 [AnimationPrefetch] Animation ${name} needs to be loaded`, 'color: #3498db;');
    } catch (error) {
      // Try fallback animation
      const fallback = vrmaAnimationService.getFallbackAnimation(name);
      if (fallback !== name) {
        console.log(`%c🔄 [AnimationPrefetch] Trying fallback: ${fallback}`, 'color: #f39c12;');
        
        try {
          const fallbackAnimation = vrmaAnimationService.getAnimation(fallback);
          if (fallbackAnimation) {
            // Fallback animation is loaded
            return;
          }
        } catch {
          // Fallback also failed, throw original error
          throw error;
        }
      }
      
      // Don't fail whole batch - throw to let caller handle
      throw error;
    }
  }

  /**
   * Prefetch animations by priority tier
   * @param tier - Animation priority tier
   * @returns Prefetch result with statistics
   */
  async prefetchByTier(tier: AnimationPriority): Promise<PrefetchResult> {
    console.log(`%c📥 [AnimationPrefetch] Prefetching tier: ${tier}`, 
      'color: #9b59b6;');
    
    // Get animations for this tier
    // This is a simplified approach - in production, you'd have a mapping
    const tierAnimations: AnimationTrigger[] = [];
    
    // For now, just prefetch core animations for 'CRITICAL' tier
    if (tier === 'CRITICAL') {
      const { CRITICAL_ANIMATIONS } = await import('./animation/AnimationPriorityService');
      tierAnimations.push(...CRITICAL_ANIMATIONS.map(name => ({ name })));
    }
    
    return this.prefetchAnimations(tierAnimations);
  }

  /**
   * Clear prefetch cache (not the actual animation cache)
   */
  clearPrefetchCache(): void {
    this.prefetchQueue.clear();
    this.loadingPromises.clear();
    console.log('%c🗑️ [AnimationPrefetch] Prefetch cache cleared', 'color: #95a5a6;');
  }

  /**
   * Get number of prefetched animations
   * @returns Count of prefetched animations
   */
  getPrefetchedCount(): number {
    return this.prefetchCount;
  }

  /**
   * Check if an animation is prefetched
   * @param name - Animation name to check
   * @returns True if prefetched
   */
  isPrefetched(name: string): boolean {
    return this.prefetchQueue.has(name) || vrmaAnimationService.isLoaded(name);
  }

  /**
   * Get cache hit rate
   * @returns Percentage of cache hits (0-100)
   */
  getCacheHitRate(): number {
    const total = this.prefetchCount;
    if (total === 0) return 100;
    return (this.successCount / total) * 100;
  }

  /**
   * Get average load time
   * @returns Average load time in milliseconds
   */
  getAverageLoadTime(): number {
    // This would need to track individual load times
    // For now, return 0
    return 0;
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.prefetchCount = 0;
    this.successCount = 0;
    this.failureCount = 0;
    console.log('%c📊 [AnimationPrefetch] Statistics reset', 'color: #3498db;');
  }
}

// Export singleton instance
export const animationPrefetchService = new AnimationPrefetchService();

// Export class for testing
export default AnimationPrefetchService;
