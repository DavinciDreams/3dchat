import { PreprocessedText } from '../../types';

/**
 * LRU (Least Recently Used) Cache for text preprocessing results.
 * 
 * This cache stores preprocessing results to avoid redundant processing
 * of identical text inputs, significantly improving performance for
 * repeated text processing operations.
 */
export class PreprocessingCache {
  private cache: Map<string, PreprocessedText>;
  private maxSize: number;

  /**
   * Creates a new LRU cache instance
   * @param maxSize - Maximum number of entries to store (default: 100)
   */
  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Retrieve a cached preprocessing result
   * @param text - The input text to look up
   * @returns The cached result, or undefined if not found
   */
  get(text: string): PreprocessedText | undefined {
    const result = this.cache.get(text);
    if (result) {
      // Move to end (most recently used)
      this.cache.delete(text);
      this.cache.set(text, result);
    }
    return result;
  }

  /**
   * Store a preprocessing result in the cache
   * @param text - The input text (cache key)
   * @param result - The preprocessing result to cache
   */
  set(text: string, result: PreprocessedText): void {
    // Remove oldest entry if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(text, result);
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the current number of cached entries
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Check if a text is cached
   * @param text - The input text to check
   * @returns True if the text is cached, false otherwise
   */
  has(text: string): boolean {
    return this.cache.has(text);
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; usagePercent: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      usagePercent: Math.round((this.cache.size / this.maxSize) * 100)
    };
  }
}
