import { VisemeData } from '../../types';

export class VisemeCache {
  private cache: Map<string, VisemeData[]>;
  private maxSize: number;

  constructor(maxSize: number = 200) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(text: string): VisemeData[] | undefined {
    const cached = this.cache.get(text);
    if (cached && import.meta.env.DEV) {
      console.log('✅ [VisemeCache] Cache hit:', text);
    }
    return cached;
  }

  set(text: string, visemes: VisemeData[]): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      if (import.meta.env.DEV) {
        console.log('🗑️ [VisemeCache] Evicted oldest entry:', firstKey);
      }
    }
    this.cache.set(text, visemes);
    if (import.meta.env.DEV) {
      console.log('💾 [VisemeCache] Cached entry:', text);
    }
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    if (import.meta.env.DEV) {
      console.log('🧹 [VisemeCache] Cleared', size, 'entries');
    }
  }

  getStats(): { size: number; maxSize: number } {
    return { size: this.cache.size, maxSize: this.maxSize };
  }
}
