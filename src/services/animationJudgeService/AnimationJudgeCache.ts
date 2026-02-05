import { AnimationJudgment } from '../../types';

/**
 * Cache entry with timestamp for expiration
 */
interface CacheEntry {
  judgment: AnimationJudgment;
  timestamp: number;
}

/**
 * Statistics for cache performance tracking
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
}

/**
 * In-memory cache for animation judgments with TTL support.
 * Caches judgments based on user message + AI response pairs.
 * 
 * Features:
 * - 2-hour TTL for cached entries
 * - Configurable max size (default: 200 entries)
 * - Thread-safe concurrent request handling
 * - Cache statistics tracking
 */
export class AnimationJudgeCache {
  private cache: Map<string, CacheEntry>;
  private pendingRequests: Map<string, Promise<AnimationJudgment>>;
  private maxSize: number;
  private maxAge: number; // 2 hours in milliseconds
  private hits: number;
  private misses: number;

  constructor(maxSize: number = 200, maxAge: number = 2 * 60 * 60 * 1000) {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.maxSize = maxSize;
    this.maxAge = maxAge;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Generate a cache key from user message and AI response
   * Uses a simple hash function for browser compatibility
   */
  private generateKey(userMessage: string, aiResponse: string): string {
    const combined = `${userMessage}|||${aiResponse}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `aj_${Math.abs(hash)}`;
  }

  /**
   * Get a cached judgment if available and not expired
   * @param userMessage - The user's message
   * @param aiResponse - The AI's response
   * @returns Cached judgment or undefined if not found/expired
   */
  get(userMessage: string, aiResponse: string): AnimationJudgment | undefined {
    const key = this.generateKey(userMessage, aiResponse);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      this.misses++;
      if (import.meta.env.DEV) {
        console.log('🎯 [AnimationJudgeCache] Cache entry expired:', key);
      }
      return undefined;
    }

    this.hits++;
    if (import.meta.env.DEV) {
      console.log('✅ [AnimationJudgeCache] Cache hit:', key);
    }
    return entry.judgment;
  }

  /**
   * Set a cached judgment
   * @param userMessage - The user's message
   * @param aiResponse - The AI's response
   * @param judgment - The animation judgment to cache
   */
  set(userMessage: string, aiResponse: string, judgment: AnimationJudgment): void {
    const key = this.generateKey(userMessage, aiResponse);

    // Evict oldest entry if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        if (import.meta.env.DEV) {
          console.log('🗑️ [AnimationJudgeCache] Evicted oldest entry:', firstKey);
        }
      }
    }

    this.cache.set(key, {
      judgment,
      timestamp: Date.now()
    });

    if (import.meta.env.DEV) {
      console.log('💾 [AnimationJudgeCache] Cached entry:', key);
    }
  }

  /**
   * Get or set a judgment with thread-safe concurrent request handling
   * If multiple requests for the same key arrive simultaneously,
   * only one will call the LLM, others will wait for the result
   * 
   * @param userMessage - The user's message
   * @param aiResponse - The AI's response
   * @param fetchFn - Function to fetch the judgment if not cached
   * @returns The animation judgment (cached or newly fetched)
   */
  async getOrSet(
    userMessage: string,
    aiResponse: string,
    fetchFn: () => Promise<AnimationJudgment>
  ): Promise<AnimationJudgment> {
    const key = this.generateKey(userMessage, aiResponse);

    // Check cache first
    const cached = this.get(userMessage, aiResponse);
    if (cached) {
      return cached;
    }

    // Check if there's already a pending request for this key
    const pendingRequest = this.pendingRequests.get(key);
    if (pendingRequest) {
      if (import.meta.env.DEV) {
        console.log('⏳ [AnimationJudgeCache] Waiting for pending request:', key);
      }
      return pendingRequest;
    }

    // Create a new request
    const requestPromise = (async () => {
      try {
        const judgment = await fetchFn();
        this.set(userMessage, aiResponse, judgment);
        return judgment;
      } finally {
        // Clean up pending request
        this.pendingRequests.delete(key);
      }
    })();

    // Store the pending request
    this.pendingRequests.set(key, requestPromise);

    return requestPromise;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.pendingRequests.clear();
    this.hits = 0;
    this.misses = 0;
    if (import.meta.env.DEV) {
      console.log('🧹 [AnimationJudgeCache] Cleared', size, 'entries');
    }
  }

  /**
   * Get cache statistics
   * @returns Cache statistics including hit rate
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate,
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }

  /**
   * Log cache statistics to console
   */
  logStats(): void {
    const stats = this.getStats();
    console.log('%c📊 [AnimationJudgeCache] Statistics:', 'background: #3498db; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
    console.log(`  Hits: ${stats.hits}`);
    console.log(`  Misses: ${stats.misses}`);
    console.log(`  Hit Rate: ${stats.hitRate.toFixed(1)}%`);
    console.log(`  Size: ${stats.size}/${stats.maxSize}`);
  }

  /**
   * Clean up expired entries (called periodically)
   * @returns Number of entries removed
   */
  cleanupExpired(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0 && import.meta.env.DEV) {
      console.log(`🧹 [AnimationJudgeCache] Cleaned up ${removed} expired entries`);
    }

    return removed;
  }
}

// Singleton instance for global use
let cacheInstance: AnimationJudgeCache | null = null;

/**
 * Get or create the singleton cache instance
 * @param maxSize - Maximum number of entries (default: 200)
 * @param maxAge - Maximum age in milliseconds (default: 2 hours)
 * @returns The cache instance
 */
export function getAnimationJudgeCache(
  maxSize: number = 200,
  maxAge: number = 2 * 60 * 60 * 1000
): AnimationJudgeCache {
  if (!cacheInstance) {
    cacheInstance = new AnimationJudgeCache(maxSize, maxAge);
  }
  return cacheInstance;
}
