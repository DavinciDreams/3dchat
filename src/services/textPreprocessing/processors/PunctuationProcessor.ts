import { BaseProcessor } from '../BaseProcessor';
import { TextMetadata } from '../../../types';

/**
 * Processor for handling punctuation-based emphasis markers.
 *
 * Detects and processes:
 * - Asterisk-wrapped text: *text* or **text**
 * - CAPS words (3+ characters) for emphasis
 * - Markdown heading markers: ### Heading
 */

// Pattern to match markdown heading markers (1-6 hash characters at start of line)
const HEADING_MARKER_PATTERN = /^#{1,6}\s+/gm;

export class PunctuationProcessor extends BaseProcessor {
  name = 'punctuation';
  priority = 10;
  
  /**
   * Process text to detect and handle punctuation-based emphasis
   * @param text - Input text to process
   * @param metadata - Current metadata state
   * @returns Processed text with emphasis metadata
   */
  process(text: string, metadata: TextMetadata) {
    let cleanText = text;
    const displayText = text;
    const newMetadata = this.cloneMetadata(metadata);
    
    // Process asterisk-wrapped emphasis: *text* or **text**
    const asteriskPattern = /\*+([^*]+)\*+/g;
    let match;
    let positionOffset = 0;
    
    while ((match = asteriskPattern.exec(text)) !== null) {
      const fullMatch = match[0];
      const innerText = match[1];
      const startIndex = match.index;
      const endIndex = startIndex + fullMatch.length;
      
      // Add to metadata
      newMetadata.emphasis.push({
        text: innerText,
        startIndex: startIndex - positionOffset,
        endIndex: endIndex - positionOffset - (fullMatch.length - innerText.length),
        type: 'asterisk'
      });
      
      // Remove asterisks from clean text
      cleanText = cleanText.substring(0, startIndex - positionOffset) + 
                  innerText + 
                  cleanText.substring(endIndex - positionOffset);
      
      positionOffset += fullMatch.length - innerText.length;
    }
    
    // Process markdown heading markers: ### Heading
    cleanText = cleanText.replace(HEADING_MARKER_PATTERN, '');
    
    // Process CAPS for emphasis (all caps words 3+ characters)
    const capsPattern = /\b([A-Z]{3,})\b/g;
    let capsMatch;
    
    while ((capsMatch = capsPattern.exec(text)) !== null) {
      const word = capsMatch[1];
      const startIndex = capsMatch.index;
      const endIndex = startIndex + word.length;
      
      // Only add if not already in emphasis
      const alreadyExists = newMetadata.emphasis.some(
        e => e.text === word && e.type === 'caps'
      );
      
      if (!alreadyExists) {
        newMetadata.emphasis.push({
          text: word,
          startIndex,
          endIndex,
          type: 'caps'
        });
      }
    }
    
    return { cleanText, displayText, metadata: newMetadata };
  }
}
