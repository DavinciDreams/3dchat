/**
 * TextTimingEstimator
 *
 * Service for estimating speech duration from text.
 * Uses configurable timing parameters to estimate how long text will take to speak.
 */

import {
  TextSegment,
  TextTimeline,
  TextAnalysis,
  TextTimingEstimatorOptions,
} from '../types';
import { getDefaultTextTimingConfig, TextTimingConfig } from '../config/textTimingConfig';

/**
 * TextTimingEstimator class
 *
 * Estimates speech duration from text using configurable timing parameters.
 * Supports word count, sentence pauses, comma pauses, and emphasis.
 */
export class TextTimingEstimator {
  private options: Required<TextTimingConfig>;
  private calibrationFactor: number = 1.0;
  private calibrationOffset: number = 0;
  private calibrationHistory: Array<{ text: string; estimated: number; actual: number; factor: number }> = [];

  constructor(options?: Partial<TextTimingEstimatorOptions>) {
    this.options = { ...getDefaultTextTimingConfig(), ...options };
  }

  /**
   * Estimate duration for a given text
   * @param text - The text to estimate duration for
   * @returns Estimated duration in milliseconds
   */
  estimateDuration(text: string): number {
    if (!text || text.trim().length === 0) {
      return this.options.emptyTextDuration;
    }

    // Calculate base duration from words and characters
    const words = this.extractWords(text);
    const wordDuration = this.calculateWordDuration(words);
    const charDuration = this.calculateCharacterDuration(text);
    const pauseDuration = this.calculatePauseDuration(text);

    // Calculate emphasis adjustment
    const emphasisDuration = this.calculateEmphasisDuration(text);

    // Combine all durations
    let totalDuration = Math.max(wordDuration, charDuration) + pauseDuration + emphasisDuration;

    // Apply calibration
    totalDuration = totalDuration * this.calibrationFactor + this.calibrationOffset;

    // Clamp to min/max bounds
    totalDuration = Math.max(this.options.minTotalDuration, totalDuration);
    totalDuration = Math.min(this.options.maxTotalDuration, totalDuration);

    if (this.options.enableDebugLogging) {
      console.log(`%c[TextTimingEstimator] Estimated duration for "${text}": ${totalDuration.toFixed(0)}ms`,
        'background: #9b59b6; color: white; padding: 4px 8px; border-radius: 4px;');
    }

    return totalDuration;
  }

  /**
   * Build a complete timeline from text
   * @param text - The text to build timeline from
   * @returns Complete TextTimeline with segments
   */
  buildTimeline(text: string): TextTimeline {
    if (!text || text.trim().length === 0) {
      return {
        originalText: text,
        segments: [],
        totalDuration: this.options.emptyTextDuration,
        wordCount: 0,
        sentenceCount: 0,
        characterCount: 0,
        createdAt: Date.now(),
      };
    }

    const segments: TextSegment[] = [];
    const words = this.extractWords(text);
    const sentences = this.extractSentences(text);

    let currentTime = 0;

    // Process text character by character to build segments
    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Check for emphasis markers
      if (char === '*' && i > 0 && text[i - 1] !== '*') {
        // Start of emphasis
        const endEmphasis = text.indexOf('*', i + 1);
        if (endEmphasis !== -1) {
          const emphasizedText = text.substring(i, endEmphasis + 1);
          const emphasisDuration = this.calculateEmphasizedTextDuration(emphasizedText);
          segments.push({
            text: emphasizedText,
            startIndex: i,
            endIndex: endEmphasis + 1,
            duration: emphasisDuration,
            startTime: currentTime,
            endTime: currentTime + emphasisDuration,
            type: 'word',
            isEmphasized: true,
          });
          currentTime += emphasisDuration;
          i = endEmphasis;
          continue;
        }
      }

      // Check for punctuation pauses
      const pauseInfo = this.getPauseInfo(char);
      if (pauseInfo && i > 0) {
        segments.push({
          text: char,
          startIndex: i,
          endIndex: i + 1,
          duration: pauseInfo.duration,
          startTime: currentTime,
          endTime: currentTime + pauseInfo.duration,
          type: pauseInfo.type,
          isEmphasized: false,
          pauseDuration: pauseInfo.duration,
          punctuation: char,
        });
        currentTime += pauseInfo.duration;
        continue;
      }

      // Regular character - accumulate (handled by duration calculation)
    }

    // Apply calibration to all segments
    const calibratedSegments = segments.map(seg => ({
      ...seg,
      duration: seg.duration * this.calibrationFactor,
      startTime: seg.startTime * this.calibrationFactor,
      endTime: seg.endTime * this.calibrationFactor,
    }));

    // Recalculate total duration with calibration
    const totalDuration = calibratedSegments.reduce((sum, seg) => sum + seg.duration, 0);

    if (this.options.logTimingBreakdown) {
      console.log(`%c[TextTimingEstimator] Timeline breakdown:`,
        'background: #3498db; color: white; padding: 4px 8px; border-radius: 4px;');
      calibratedSegments.forEach(seg => {
        console.log(`  [${seg.type}] "${seg.text}" (${seg.startTime.toFixed(0)}ms - ${seg.endTime.toFixed(0)}ms)`);
      });
    }

    return {
      originalText: text,
      segments: calibratedSegments,
      totalDuration,
      wordCount: words.length,
      sentenceCount: sentences.length,
      characterCount: text.replace(/\s/g, '').length,
      createdAt: Date.now(),
    };
  }

  /**
   * Analyze text and return detailed analysis
   * @param text - The text to analyze
   * @returns Detailed TextAnalysis
   */
  analyzeText(text: string): TextAnalysis {
    if (!text || text.trim().length === 0) {
      return {
        text,
        estimatedDuration: this.options.emptyTextDuration,
        wordCount: 0,
        sentenceCount: 0,
        characterCount: 0,
        wordsPerMinute: 0,
        avgWordDuration: 0,
        totalPauseTime: 0,
        pausePercentage: 0,
        segmentBreakdown: {
          words: 0,
          pauses: 0,
          punctuation: 0,
          sentences: 0,
          paragraphs: 0,
        },
        emphasizedSegments: [],
      };
    }

    const timeline = this.buildTimeline(text);
    const words = this.extractWords(text);
    const sentences = this.extractSentences(text);

    // Calculate pause time from timeline
    const totalPauseTime = timeline.segments
      .filter(s => s.type === 'pause' || s.type === 'punctuation')
      .reduce((sum, s) => sum + (s.pauseDuration || 0), 0);

    // Calculate emphasized segments
    const emphasizedSegments = timeline.segments
      .filter(s => s.isEmphasized)
      .map(s => ({
        text: s.text,
        startIndex: s.startIndex,
        endIndex: s.endIndex,
        duration: s.duration,
      }));

    // Calculate segment breakdown
    const segmentBreakdown = {
      words: timeline.segments.filter(s => s.type === 'word').length,
      pauses: timeline.segments.filter(s => s.type === 'pause').length,
      punctuation: timeline.segments.filter(s => s.type === 'punctuation').length,
      sentences: sentences.length,
      paragraphs: text.split(/\n\n+/).filter(p => p.trim().length > 0).length,
    };

    const avgWordDuration = words.length > 0 ? timeline.totalDuration / words.length : 0;
    const wordsPerMinute = timeline.totalDuration > 0
      ? (words.length / (timeline.totalDuration / 60000))
      : 0;

    const pausePercentage = timeline.totalDuration > 0
      ? (totalPauseTime / timeline.totalDuration) * 100
      : 0;

    return {
      text,
      estimatedDuration: timeline.totalDuration,
      wordCount: words.length,
      sentenceCount: sentences.length,
      characterCount: text.replace(/\s/g, '').length,
      wordsPerMinute,
      avgWordDuration,
      totalPauseTime,
      pausePercentage,
      segmentBreakdown,
      emphasizedSegments,
    };
  }

  /**
   * Calibrate estimator based on actual audio duration
   * @param text - The text that was spoken
   * @param actualDuration - The actual audio duration in milliseconds
   */
  calibrate(text: string, actualDuration: number): void {
    const estimated = this.estimateDuration(text);

    if (estimated <= 0) {
      console.warn('[TextTimingEstimator] Cannot calibrate with zero estimated duration');
      return;
    }

    const newFactor = actualDuration / estimated;

    // Store calibration history
    this.calibrationHistory.push({
      text,
      estimated,
      actual: actualDuration,
      factor: newFactor,
    });

    // Keep only last 10 calibrations
    if (this.calibrationHistory.length > 10) {
      this.calibrationHistory.shift();
    }

    // Use weighted average for calibration factor
    // More recent calibrations have higher weight
    const weightedSum = this.calibrationHistory.reduce((sum, entry, index) => {
      const weight = index + 1; // 1-based weight
      return sum + entry.factor * weight;
    }, 0);

    const totalWeight = this.calibrationHistory.reduce((sum, _, index) => sum + (index + 1), 0);

    this.calibrationFactor = weightedSum / totalWeight;

    if (this.options.enableDebugLogging) {
      console.log(`%c[TextTimingEstimator] Calibrated: factor=${this.calibrationFactor.toFixed(3)} (estimated=${estimated.toFixed(0)}ms, actual=${actualDuration.toFixed(0)}ms)`,
        'background: #8e44ad; color: white; padding: 4px 8px; border-radius: 4px;');
    }
  }

  /**
   * Reset calibration to default values
   */
  resetCalibration(): void {
    this.calibrationFactor = 1.0;
    this.calibrationOffset = 0;
    this.calibrationHistory = [];

    if (this.options.enableDebugLogging) {
      console.log('%c[TextTimingEstimator] Calibration reset to defaults',
        'background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px;');
    }
  }

  /**
   * Get current calibration factor
   */
  getCalibrationFactor(): number {
    return this.calibrationFactor;
  }

  /**
   * Set timing options
   * @param options - New options to apply
   */
  setOptions(options: Partial<TextTimingEstimatorOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current timing options
   */
  getOptions(): TextTimingEstimatorOptions {
    return { ...this.options };
  }

  /**
   * Extract words from text
   */
  private extractWords(text: string): string[] {
    // Split on whitespace and filter empty strings
    return text.split(/\s+/).filter(w => w.length > 0);
  }

  /**
   * Extract sentences from text
   */
  private extractSentences(text: string): string[] {
    // Split on sentence-ending punctuation
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Calculate duration based on word count
   */
  private calculateWordDuration(words: string[]): number {
    if (words.length === 0) {
      return 0;
    }

    let totalDuration = 0;

    for (const word of words) {
      let wordDuration = this.options.msPerCharacter * word.length;

      // Apply word length modifiers
      if (word.length <= this.options.shortWordThreshold) {
        wordDuration *= this.options.shortWordMultiplier;
      } else if (word.length >= this.options.longWordThreshold) {
        wordDuration *= this.options.longWordMultiplier;
      }

      // Clamp to min/max word duration
      wordDuration = Math.max(this.options.minWordDuration, wordDuration);
      wordDuration = Math.min(this.options.maxWordDuration, wordDuration);

      totalDuration += wordDuration;
    }

    // Add space duration between words
    if (words.length > 1) {
      totalDuration += (words.length - 1) * this.options.msPerSpace;
    }

    return totalDuration;
  }

  /**
   * Calculate duration based on character count
   */
  private calculateCharacterDuration(text: string): number {
    const charCount = text.replace(/\s/g, '').length;
    return charCount * this.options.msPerCharacter;
  }

  /**
   * Calculate total pause duration from punctuation
   */
  private calculatePauseDuration(text: string): number {
    let totalPause = 0;

    for (const char of text) {
      const pauseInfo = this.getPauseInfo(char);
      if (pauseInfo) {
        totalPause += pauseInfo.duration;
      }
    }

    return totalPause;
  }

  /**
   * Get pause information for a character
   */
  private getPauseInfo(char: string): { duration: number; type: 'pause' | 'punctuation' } | null {
    switch (char) {
      case ',':
        return { duration: this.options.pauseAfterComma, type: 'punctuation' };
      case '.':
        return { duration: this.options.pauseAfterPeriod, type: 'punctuation' };
      case '?':
        return { duration: this.options.pauseAfterQuestion, type: 'punctuation' };
      case '!':
        return { duration: this.options.pauseAfterExclamation, type: 'punctuation' };
      case ':':
        return { duration: this.options.pauseAfterColon, type: 'punctuation' };
      case ';':
        return { duration: this.options.pauseAfterSemicolon, type: 'punctuation' };
      case '-':
        return { duration: this.options.pauseAfterDash, type: 'punctuation' };
      case '\n':
        return { duration: this.options.pauseBetweenSentences, type: 'pause' };
      case ' ':
        return { duration: this.options.msPerSpace, type: 'pause' };
      default:
        return null;
    }
  }

  /**
   * Calculate additional duration from emphasis markers in text
   */
  private calculateEmphasisDuration(text: string): number {
    let totalEmphasisDuration = 0;
    let inEmphasis = false;

    for (let i = 0; i < text.length; i++) {
      if (text[i] === '*') {
        if (!inEmphasis) {
          // Start of emphasis
          inEmphasis = true;
        } else {
          // End of emphasis
          inEmphasis = false;
          totalEmphasisDuration += this.options.emphasisPause;
        }
      }
    }

    return totalEmphasisDuration;
  }

  /**
   * Calculate duration for emphasized text segment
   */
  private calculateEmphasizedTextDuration(text: string): number {
    const baseDuration = this.estimateDuration(text);
    return baseDuration * this.options.emphasisMultiplier;
  }

  /**
   * Get calibration history
   */
  getCalibrationHistory(): Array<{ text: string; estimated: number; actual: number; factor: number }> {
    return [...this.calibrationHistory];
  }

  /**
   * Get average calibration factor from history
   */
  getAverageCalibrationFactor(): number {
    if (this.calibrationHistory.length === 0) {
      return 1.0;
    }

    const sum = this.calibrationHistory.reduce((s, e) => s + e.factor, 0);
    return sum / this.calibrationHistory.length;
  }
}

// Export singleton instance
export const textTimingEstimator = new TextTimingEstimator();

// Export class for testing
export default TextTimingEstimator;
