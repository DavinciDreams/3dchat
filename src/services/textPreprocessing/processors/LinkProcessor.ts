import { BaseProcessor } from '../BaseProcessor';
import { TextMetadata } from '../../../types';

/**
 * URL regex pattern
 * Matches both http/https URLs and www-prefixed URLs
 */
const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;

/**
 * Processor for detecting and handling URLs in text.
 * 
 * Detects URLs and:
 * - Removes them from clean text (for TTS)
 * - Preserves them in display text (for UI)
 * - Normalizes www URLs to https:// format
 */
export class LinkProcessor extends BaseProcessor {
  name = 'link';
  priority = 30;
  
  /**
   * Process text to detect and handle URLs
   * @param text - Input text to process
   * @param metadata - Current metadata state
   * @returns Processed text with link metadata
   */
  process(text: string, metadata: TextMetadata) {
    const startTime = performance.now();

    let cleanText = text;
    const displayText = text;
    const newMetadata = this.cloneMetadata(metadata);
    let positionOffset = 0;

    // Use matchAll to avoid lastIndex issues between calls
    for (const match of text.matchAll(URL_PATTERN)) {
      const url = match[0];
      const startIndex = match.index!;
      const endIndex = startIndex + url.length;

      // Normalize www URLs to https:// format
      const normalizedUrl = url.startsWith('www') ? `https://${url}` : url;

      // Add to metadata
      newMetadata.links.push({
        url: normalizedUrl,
        displayText: url,
        startIndex: startIndex - positionOffset,
        endIndex: endIndex - positionOffset
      });

      // Remove from clean text (for TTS)
      cleanText = cleanText.substring(0, startIndex - positionOffset) +
                  cleanText.substring(endIndex - positionOffset);

      positionOffset += url.length;
    }
    
    const cleanText = cleanTextChars.join('');
    
    const elapsed = performance.now() - startTime;
    if (import.meta.env.DEV && elapsed > 10) {
      console.warn(`⚠️ [LinkProcessor] Slow processing: ${elapsed.toFixed(2)}ms for ${text.length} chars`);
    }
    
    return { cleanText, displayText, metadata: newMetadata };
  }
}
