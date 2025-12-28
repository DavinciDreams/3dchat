import { BaseProcessor } from '../BaseProcessor';
import { TextMetadata } from '../../../types';

/**
 * Common emoji to gesture mappings
 * Maps specific emojis to avatar gestures/animations
 */
const EMOJI_TO_GESTURE: Record<string, string> = {
  '😀': 'happy',
  '😂': 'laugh',
  '😊': 'happy',
  '😍': 'love',
  '🤔': 'thinking',
  '😮': 'surprised',
  '😢': 'sad',
  '😠': 'angry',
  '👍': 'thumbs_up',
  '👎': 'thumbs_down',
  '👋': 'wave',
  '🙏': 'praying',
  '🎉': 'celebrate',
  '❤️': 'heart',
  '🔥': 'fire',
  '✨': 'sparkle',
  '🤝': 'handshake',
};

/**
 * Extended emoji regex pattern
 * Matches all emoji characters including extended pictographics
 */
const EMOJI_PATTERN = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;

/**
 * Processor for detecting and extracting emojis from text.
 * 
 * Detects emojis and:
 * - Removes them from clean text (for TTS)
 * - Preserves them in display text (for UI)
 * - Maps them to avatar gestures when available
 */
export class EmojiProcessor extends BaseProcessor {
  name = 'emoji';
  priority = 20;
  
  /**
   * Process text to detect and handle emojis
   * @param text - Input text to process
   * @param metadata - Current metadata state
   * @returns Processed text with emoji metadata
   */
  process(text: string, metadata: TextMetadata) {
    const startTime = performance.now();
    
    const displayText = text;
    // Only clone emojis field since this processor only modifies it
    const newMetadata = this.cloneMetadata(metadata, ['emojis']);
    
    // Convert text to array for O(n) modifications
    // eslint-disable-next-line prefer-const -- Array is modified in place via splice
    let cleanTextChars = text.split('');
    let positionOffset = 0;
    
    // Use regex directly without creating new RegExp instance each time
    let match;
    
    while ((match = EMOJI_PATTERN.exec(text)) !== null) {
      const emoji = match[0];
      const startIndex = match.index;
      const endIndex = startIndex + emoji.length;
      
      // Add to metadata with gesture mapping if available
      newMetadata.emojis.push({
        emoji,
        position: startIndex - positionOffset,
        gesture: EMOJI_TO_GESTURE[emoji]
      });
      
      // Remove emoji from clean text using array splice (O(n) operation)
      const removeStart = startIndex - positionOffset;
      const removeLength = endIndex - startIndex;
      cleanTextChars.splice(removeStart, removeLength);
      
      positionOffset += emoji.length;
    }
    
    const cleanText = cleanTextChars.join('');
    
    const elapsed = performance.now() - startTime;
    if (import.meta.env.DEV && elapsed > 10) {
      console.warn(`⚠️ [EmojiProcessor] Slow processing: ${elapsed.toFixed(2)}ms for ${text.length} chars`);
    }
    
    return { cleanText, displayText, metadata: newMetadata };
  }
}
