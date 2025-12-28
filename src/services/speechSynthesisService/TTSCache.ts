import { VisemeData } from '../../types';

export interface TTSCacheEntry {
  audioBuffer: ArrayBuffer;
  visemes: VisemeData[];
  timestamp: number;
}

export class TTSCache {
  private cache: Map<string, TTSCacheEntry>;
  private maxSize: number; // ~50MB limit
  private maxAge: number; // 5 minutes TTL

  constructor(maxSize: number = 50, maxAge: number = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.maxAge = maxAge;
  }

  private generateKey(text: string, voice: string, rate: number, pitch: number): string {
    return `${text}|${voice}|${rate}|${pitch}`;
  }

  get(text: string, voice: string, rate: number, pitch: number): TTSCacheEntry | undefined {
    const key = this.generateKey(text, voice, rate, pitch);
    const entry = this.cache.get(key);

    if (!entry) return undefined;

    // Check TTL
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      if (import.meta.env.DEV) {
        console.log('🎯 [TTSCache] Cache entry expired:', key);
      }
      return undefined;
    }

    if (import.meta.env.DEV) {
      console.log('✅ [TTSCache] Cache hit:', key);
    }
    return entry;
  }

  set(text: string, voice: string, rate: number, pitch: number, audioBuffer: ArrayBuffer, visemes: VisemeData[]): void {
    const key = this.generateKey(text, voice, rate, pitch);

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      if (import.meta.env.DEV) {
        console.log('🗑️ [TTSCache] Evicted oldest entry:', oldestKey);
      }
    }

    this.cache.set(key, {
      audioBuffer,
      visemes,
      timestamp: Date.now()
    });

    if (import.meta.env.DEV) {
      console.log('💾 [TTSCache] Cached entry:', key);
    }
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    if (import.meta.env.DEV) {
      console.log('🧹 [TTSCache] Cleared', size, 'entries');
    }
  }

  getStats(): { size: number; maxSize: number } {
    return { size: this.cache.size, maxSize: this.maxSize };
  }
}
