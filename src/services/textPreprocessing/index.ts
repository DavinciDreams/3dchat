/**
 * Text Preprocessing Service
 * 
 * This module provides a flexible pipeline for preprocessing text messages
 * in the 3D chat application. It separates concerns for:
 * - Text-to-Speech (cleanText): Removes emojis, links, and asterisks
 * - UI Display (displayText): Preserves formatting for user interface
 * - Metadata extraction: Captures emphasis, emojis, and links for avatar gestures
 * 
 * Usage:
 * ```typescript
 * import { preprocessingPipeline } from '@/services/textPreprocessing';
 * 
 * const result = preprocessingPipeline.process("Hello *world*! 😊");
 * console.log(result.cleanText);   // "Hello world!"
 * console.log(result.displayText); // "Hello *world*! 😊"
 * console.log(result.metadata);    // { emphasis: [...], emojis: [...], links: [...] }
 * ```
 */

export { PreprocessingPipeline, preprocessingPipeline } from './PreprocessingPipeline';
export { PunctuationProcessor } from './processors/PunctuationProcessor';
export { EmojiProcessor } from './processors/EmojiProcessor';
export { LinkProcessor } from './processors/LinkProcessor';
export { BaseProcessor } from './BaseProcessor';
