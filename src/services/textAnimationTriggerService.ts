/**
 * Text Animation Trigger Service
 * 
 * A simple keyword-based animation trigger system.
 * Text is the source of truth for when animations should play.
 * No LLM analysis - just keyword matching.
 */

import { ANIMATION_TRIGGER_KEYWORDS, type KeywordMapping } from '../config/animationTriggerKeywords';

class TextAnimationTriggerService {
  // Keyword to animation mappings (imported from config)
  private keywordMappings: KeywordMapping[] = ANIMATION_TRIGGER_KEYWORDS;

  /**
   * Get animations to play based on text content
   * Returns the first matching animation from the first matching keyword category
   */
  getAnimationForText(text: string): string | null {
    if (!text || typeof text !== 'string') {
      return null;
    }

    const lowerText = text.toLowerCase();

    // Check each keyword mapping
    for (const mapping of this.keywordMappings) {
      for (const keyword of mapping.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          // Return the first animation from the matching category
          return mapping.animations[0] || null;
        }
      }
    }

    // No matching keywords found
    return null;
  }

  /**
   * Get all matching animations for text content
   * Returns an array of all animations from all matching keyword categories
   */
  getAllAnimationsForText(text: string): string[] {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const lowerText = text.toLowerCase();
    const matchedAnimations = new Set<string>();

    // Check each keyword mapping
    for (const mapping of this.keywordMappings) {
      for (const keyword of mapping.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          // Add all animations from this category
          mapping.animations.forEach(anim => matchedAnimations.add(anim));
          break; // Only add animations once per category
        }
      }
    }

    return Array.from(matchedAnimations);
  }

  /**
   * Check if text contains any animation-triggering keywords
   */
  hasAnimationTrigger(text: string): boolean {
    return this.getAnimationForText(text) !== null;
  }

  /**
   * Add custom keyword mapping
   */
  addKeywordMapping(keywords: string[], animations: string[]): void {
    this.keywordMappings.push({ keywords, animations });
  }

  /**
   * Get all keyword mappings
   */
  getKeywordMappings(): KeywordMapping[] {
    return [...this.keywordMappings];
  }
}

// Export singleton instance
export const textAnimationTriggerService = new TextAnimationTriggerService();

// Export types
export default textAnimationTriggerService;
export type { KeywordMapping };
