import { ITextProcessor, PreprocessedText, TextMetadata } from '../../types';
import { PunctuationProcessor } from './processors/PunctuationProcessor';
import { EmojiProcessor } from './processors/EmojiProcessor';
import { LinkProcessor } from './processors/LinkProcessor';
import { PreprocessingCache } from './PreprocessingCache';

/**
 * Performance metrics for the preprocessing pipeline
 */
export interface PerformanceMetrics {
  totalProcessingTime: number;
  processorTimes: Map<string, number>;
  cacheHits: number;
  cacheMisses: number;
  averageProcessingTime: number;
}

/**
 * Main pipeline orchestrator for text preprocessing.
 * 
 * The pipeline manages a collection of processors and executes them
 * in priority order to transform text for different use cases:
 * - cleanText: Text optimized for TTS (no emojis, links, asterisks)
 * - displayText: Text with formatting preserved for UI
 * - metadata: Structured data about emphasis, emojis, and links
 * 
 * Processors are registered with a priority value (lower = higher priority).
 * The default processors are:
 * 1. PunctuationProcessor (priority 10) - Handles *emphasis* and CAPS
 * 2. EmojiProcessor (priority 20) - Detects and extracts emojis
 * 3. LinkProcessor (priority 30) - Detects and handles URLs
 */
export class PreprocessingPipeline {
  private processors: ITextProcessor[] = [];
  private cache: PreprocessingCache;
  private metrics: {
    totalProcessingTime: number;
    processorTimes: Map<string, number>;
    cacheHits: number;
    cacheMisses: number;
    processingCount: number;
  };

  constructor(cacheSize: number = 100) {
    // Register default processors
    this.register(new PunctuationProcessor());
    this.register(new EmojiProcessor());
    this.register(new LinkProcessor());
    
    // Initialize cache
    this.cache = new PreprocessingCache(cacheSize);
    
    // Initialize metrics
    this.metrics = {
      totalProcessingTime: 0,
      processorTimes: new Map(),
      cacheHits: 0,
      cacheMisses: 0,
      processingCount: 0
    };
  }
  
  /**
   * Register a new processor to the pipeline
   * @param processor - The processor to register
   */
  register(processor: ITextProcessor): void {
    this.processors.push(processor);
    // Sort by priority (lower number = higher priority)
    this.processors.sort((a, b) => a.priority - b.priority);
  }
  
  /**
   * Process text through all registered processors
   * @param text - The input text to process
   * @returns PreprocessedText with cleanText, displayText, and metadata
   */
  process(text: string): PreprocessedText {
    const startTime = performance.now();
    
    // Early exit for empty or whitespace-only text
    if (!text || text.trim().length === 0) {
      const emptyResult: PreprocessedText = {
        original: text,
        cleanText: '',
        displayText: '',
        metadata: {
          emphasis: [],
          emojis: [],
          links: []
        }
      };
      
      if (import.meta.env.DEV) {
        console.log('⏱️ [PreprocessingPipeline] Early exit: empty text');
      }
      return emptyResult;
    }
    
    // Check cache first
    const cached = this.cache.get(text);
    if (cached) {
      this.metrics.cacheHits++;
      if (import.meta.env.DEV) {
        const cacheTime = performance.now() - startTime;
        console.log(`⏱️ [PreprocessingPipeline] Cache hit (${cacheTime.toFixed(2)}ms) for text length: ${text.length}`);
      }
      return cached;
    }
    
    // Cache miss
    this.metrics.cacheMisses++;
    
    if (import.meta.env.DEV) {
      console.log('⏱️ [PreprocessingPipeline] Starting preprocessing for text length:', text.length);
    }
    
    let cleanText = text;
    let displayText = text;
    const metadata: TextMetadata = {
      emphasis: [],
      emojis: [],
      links: []
    };
    
    // Run each processor in priority order
    for (const processor of this.processors) {
      const processorStartTime = performance.now();
      const result = processor.process(cleanText, metadata);
      const processorTime = performance.now() - processorStartTime;
      
      // Track processor time
      const existingTime = this.metrics.processorTimes.get(processor.name) || 0;
      this.metrics.processorTimes.set(processor.name, existingTime + processorTime);
      
      if (import.meta.env.DEV) {
        console.log(`⏱️ [PreprocessingPipeline] ${processor.name} took ${processorTime.toFixed(2)}ms`);
      }
      
      cleanText = result.cleanText;
      displayText = result.displayText;
      metadata.emphasis = result.metadata.emphasis;
      metadata.emojis = result.metadata.emojis;
      metadata.links = result.metadata.links;
    }
    
    const result: PreprocessedText = {
      original: text,
      cleanText: cleanText.trim(),
      displayText: displayText.trim(),
      metadata
    };
    
    // Store in cache
    this.cache.set(text, result);
    
    const totalTime = performance.now() - startTime;
    
    // Track total processing time and count
    this.metrics.totalProcessingTime += totalTime;
    this.metrics.processingCount++;
    
    if (import.meta.env.DEV) {
      console.log(`⏱️ [PreprocessingPipeline] Total preprocessing time: ${totalTime.toFixed(2)}ms`);
      console.log(`⏱️ [PreprocessingPipeline] Cache stats: ${this.cache.size}/${this.cache['maxSize']} entries`);
    }
    
    return result;
  }

  /**
   * Get current performance metrics
   * @returns PerformanceMetrics object with all tracked metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const avgTime = this.metrics.processingCount > 0
      ? this.metrics.totalProcessingTime / this.metrics.processingCount
      : 0;
      
    return {
      totalProcessingTime: this.metrics.totalProcessingTime,
      processorTimes: new Map(this.metrics.processorTimes),
      cacheHits: this.metrics.cacheHits,
      cacheMisses: this.metrics.cacheMisses,
      averageProcessingTime: avgTime
    };
  }

  /**
   * Reset all performance metrics to zero
   */
  resetMetrics(): void {
    this.metrics = {
      totalProcessingTime: 0,
      processorTimes: new Map(),
      cacheHits: 0,
      cacheMisses: 0,
      processingCount: 0
    };
  }

  /**
   * Clear the preprocessing cache and reset metrics
   */
  clearCache(): void {
    this.cache.clear();
    this.resetMetrics();
    if (import.meta.env.DEV) {
      console.log('⏱️ [PreprocessingPipeline] Cache cleared and metrics reset');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }
}

/**
 * Singleton instance of the preprocessing pipeline
 * Use this instance throughout the application for consistent text processing
 */
export const preprocessingPipeline = new PreprocessingPipeline();
