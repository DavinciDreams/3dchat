import { ITextProcessor, PreprocessedText, TextMetadata } from '../../types';
import { PunctuationProcessor } from './processors/PunctuationProcessor';
import { EmojiProcessor } from './processors/EmojiProcessor';
import { LinkProcessor } from './processors/LinkProcessor';

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
  
  constructor() {
    // Register default processors
    this.register(new PunctuationProcessor());
    this.register(new EmojiProcessor());
    this.register(new LinkProcessor());
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
    console.log('⏱️ [PreprocessingPipeline] Starting preprocessing for text length:', text.length);
    
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
      
      console.log(`⏱️ [PreprocessingPipeline] ${processor.name} took ${processorTime.toFixed(2)}ms`);
      
      cleanText = result.cleanText;
      displayText = result.displayText;
      metadata.emphasis = result.metadata.emphasis;
      metadata.emojis = result.metadata.emojis;
      metadata.links = result.metadata.links;
    }
    
    const totalTime = performance.now() - startTime;
    console.log(`⏱️ [PreprocessingPipeline] Total preprocessing time: ${totalTime.toFixed(2)}ms`);
    
    return {
      original: text,
      cleanText: cleanText.trim(),
      displayText: displayText.trim(),
      metadata
    };
  }
}

/**
 * Singleton instance of the preprocessing pipeline
 * Use this instance throughout the application for consistent text processing
 */
export const preprocessingPipeline = new PreprocessingPipeline();
