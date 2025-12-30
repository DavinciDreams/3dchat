/**
 * Default configuration for text-based timing estimation
 *
 * This configuration provides timing parameters for estimating speech duration
 * from text, which serves as source of truth for timeline scheduling.
 */

/**
 * Default timing estimation options
 */
export const DEFAULT_TEXT_TIMING_OPTIONS = {
  // Word-based timing (milliseconds per word)
  wordsPerMinute: 150,        // Average speaking rate
  minWordDuration: 50,        // Minimum time per word (ms)
  maxWordDuration: 500,       // Maximum time per word (ms)

  // Character-based timing (milliseconds per character)
  msPerCharacter: 60,         // Base timing per character
  msPerSpace: 150,            // Extra time for spaces (pauses)

  // Punctuation pauses (milliseconds)
  pauseAfterComma: 200,        // Pause after comma
  pauseAfterPeriod: 400,       // Pause after period
  pauseAfterQuestion: 500,    // Pause after question mark
  pauseAfterExclamation: 450, // Pause after exclamation mark
  pauseAfterColon: 300,       // Pause after colon
  pauseAfterSemicolon: 350,   // Pause after semicolon
  pauseAfterDash: 250,        // Pause after dash

  // Sentence pauses
  pauseBetweenSentences: 500,  // Base pause between sentences
  pauseBetweenParagraphs: 1000, // Pause between paragraphs

  // Emphasis modifiers
  emphasisMultiplier: 1.3,    // Slower rate for emphasized words
  emphasisPause: 100,          // Extra pause before/after emphasized text

  // Word count adjustments
  shortWordThreshold: 3,       // Words with <= 3 letters are "short"
  shortWordMultiplier: 0.8,    // Short words are spoken faster
  longWordThreshold: 8,        // Words with >= 8 letters are "long"
  longWordMultiplier: 1.2,     // Long words are spoken slower

  // Calibration
  calibrationFactor: 1.0,      // Global calibration multiplier
  calibrationOffset: 0,        // Global calibration offset (ms)

  // Streaming support
  streamingChunkSize: 50,      // Characters per streaming chunk
  streamingBufferMs: 500,       // Buffer time for streaming updates

  // Edge cases
  minTotalDuration: 500,      // Minimum total duration (ms)
  maxTotalDuration: 60000,    // Maximum total duration (ms)
  emptyTextDuration: 0,        // Duration for empty text

  // Logging
  enableDebugLogging: false,   // Enable detailed debug logging
  logTimingBreakdown: false,   // Log timing breakdown by segment
};

/**
 * Text timing configuration type
 */
export type TextTimingConfig = {
  // Word-based timing (milliseconds per word)
  wordsPerMinute: number;
  minWordDuration: number;
  maxWordDuration: number;

  // Character-based timing (milliseconds per character)
  msPerCharacter: number;
  msPerSpace: number;

  // Punctuation pauses (milliseconds)
  pauseAfterComma: number;
  pauseAfterPeriod: number;
  pauseAfterQuestion: number;
  pauseAfterExclamation: number;
  pauseAfterColon: number;
  pauseAfterSemicolon: number;
  pauseAfterDash: number;

  // Sentence pauses
  pauseBetweenSentences: number;
  pauseBetweenParagraphs: number;

  // Emphasis modifiers
  emphasisMultiplier: number;
  emphasisPause: number;

  // Word count adjustments
  shortWordThreshold: number;
  shortWordMultiplier: number;
  longWordThreshold: number;
  longWordMultiplier: number;

  // Calibration
  calibrationFactor: number;
  calibrationOffset: number;

  // Streaming support
  streamingChunkSize: number;
  streamingBufferMs: number;

  // Edge cases
  minTotalDuration: number;
  maxTotalDuration: number;
  emptyTextDuration: number;

  // Logging
  enableDebugLogging: boolean;
  logTimingBreakdown: boolean;
};

/**
 * Get default text timing configuration
 */
export function getDefaultTextTimingConfig(): TextTimingConfig {
  return { ...DEFAULT_TEXT_TIMING_OPTIONS };
}

/**
 * Create custom text timing configuration by merging with defaults
 */
export function createTextTimingConfig(
  overrides: Partial<TextTimingConfig>
): TextTimingConfig {
  return {
    ...DEFAULT_TEXT_TIMING_OPTIONS,
    ...overrides,
  };
}

/**
 * Preset configurations for different speaking styles
 */
export const SPEAKING_STYLE_PRESETS: Record<string, Partial<TextTimingConfig>> = {
  normal: {
    wordsPerMinute: 150,
    pauseAfterPeriod: 400,
    pauseAfterQuestion: 500,
  },
  fast: {
    wordsPerMinute: 180,
    pauseAfterComma: 150,
    pauseAfterPeriod: 300,
    pauseAfterQuestion: 350,
    pauseBetweenSentences: 350,
  },
  slow: {
    wordsPerMinute: 120,
    pauseAfterComma: 300,
    pauseAfterPeriod: 600,
    pauseAfterQuestion: 700,
    pauseBetweenSentences: 700,
  },
  dramatic: {
    wordsPerMinute: 130,
    pauseAfterComma: 400,
    pauseAfterPeriod: 800,
    pauseAfterQuestion: 1000,
    pauseAfterExclamation: 900,
    pauseBetweenSentences: 1000,
    emphasisMultiplier: 1.5,
    emphasisPause: 200,
  },
  casual: {
    wordsPerMinute: 160,
    pauseAfterComma: 150,
    pauseAfterPeriod: 300,
    pauseAfterQuestion: 400,
    pauseBetweenSentences: 400,
  },
};

/**
 * Get preset configuration by speaking style
 */
export function getPresetConfig(style: string): TextTimingConfig {
  const preset = SPEAKING_STYLE_PRESETS[style] || SPEAKING_STYLE_PRESETS.normal;
  return createTextTimingConfig(preset);
}
