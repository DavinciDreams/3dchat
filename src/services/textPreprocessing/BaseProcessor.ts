import { ITextProcessor, TextMetadata } from '../../types';

/**
 * Abstract base class for text processors.
 * All processors must extend this class and implement the abstract methods.
 */
export abstract class BaseProcessor implements ITextProcessor {
  /**
   * The name identifier for this processor
   */
  abstract name: string;
  
  /**
   * Priority determines execution order (lower number = higher priority)
   */
  abstract priority: number;
  
  /**
   * Process the input text and return processed results
   * @param text - The input text to process
   * @param metadata - Current metadata state
   * @returns Object containing cleanText, displayText, and updated metadata
   */
  abstract process(
    text: string, 
    metadata: TextMetadata
  ): {
    cleanText: string;
    displayText: string;
    metadata: TextMetadata;
  };
  
  /**
   * Creates a deep clone of the TextMetadata object
   * @param metadata - The metadata to clone
   * @param fieldsToClone - Optional array of specific fields to clone (backward compatible)
   * @returns A new TextMetadata object with cloned arrays
   */
  protected cloneMetadata(
    metadata: TextMetadata,
    fieldsToClone?: (keyof TextMetadata)[]
  ): TextMetadata {
    // If no fields specified, clone all (backward compatible)
    if (!fieldsToClone || fieldsToClone.length === 0) {
      return {
        emphasis: [...metadata.emphasis],
        emojis: [...metadata.emojis],
        links: [...metadata.links]
      };
    }
    
    const newMetadata: TextMetadata = {
      emphasis: [],
      emojis: [],
      links: []
    };
    
    if (fieldsToClone.includes('emphasis')) {
      newMetadata.emphasis = [...metadata.emphasis];
    }
    if (fieldsToClone.includes('emojis')) {
      newMetadata.emojis = [...metadata.emojis];
    }
    if (fieldsToClone.includes('links')) {
      newMetadata.links = [...metadata.links];
    }
    
    return newMetadata;
  }
}
