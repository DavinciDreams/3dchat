/**
 * Text Timing Config Service
 * 
 * Manages text timing configuration and preset lookups.
 */

import {
  DEFAULT_TEXT_TIMING_OPTIONS,
  SPEAKING_STYLE_PRESETS,
  type TextTimingConfig
} from '../config/textTimingConfig';

/**
 * Text Timing Config Service
 * 
 * Provides methods to query and manage text timing configuration
 * for text-based timing estimation.
 */
class TextTimingConfigService {
  /**
   * Get default text timing configuration
   */
  getDefaultConfig(): TextTimingConfig {
    return { ...DEFAULT_TEXT_TIMING_OPTIONS };
  }

  /**
   * Create custom text timing configuration by merging with defaults
   */
  createConfig(overrides: Partial<TextTimingConfig>): TextTimingConfig {
    return {
      ...DEFAULT_TEXT_TIMING_OPTIONS,
      ...overrides,
    };
  }

  /**
   * Get preset configuration by speaking style
   */
  getPresetConfig(style: string): TextTimingConfig {
    const preset = SPEAKING_STYLE_PRESETS[style] || SPEAKING_STYLE_PRESETS.normal;
    return this.createConfig(preset);
  }
}

// Export singleton instance
export const textTimingConfigService = new TextTimingConfigService();

// Export class for testing
export default TextTimingConfigService;
