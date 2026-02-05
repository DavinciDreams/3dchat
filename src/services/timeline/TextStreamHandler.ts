/**
 * TextStreamHandler
 *
 * Handles streaming text scenarios for timeline coordinator.
 * Accumulates streamed text chunks and rebuilds timeline.
 */

import type { TextTimingEstimator, TextTimeline } from '../../types';

/**
 * Streaming Text Handler interface
 */
export interface ITextStreamHandler {
  /**
   * Append text chunk
   */
  append(text: string): void;

  /**
   * Get accumulated text
   */
  getAccumulatedText(): string;

  /**
   * Get accumulated timeline
   */
  getAccumulatedTimeline(): TextTimeline | null;

  /**
   * Reset handler
   */
  reset(): void;

  /**
   * Get accumulated text length
   */
  getAccumulatedTextLength(): number;
}

/**
 * Text Stream Handler options
 */
export interface TextStreamHandlerOptions {
  /** Text timing estimator for building timelines */
  estimator: TextTimingEstimator;
  /** Debug mode */
  debug?: boolean;
}

/**
 * TextStreamHandler class
 *
 * Handles streaming text scenarios.
 */
export class TextStreamHandler implements ITextStreamHandler {
  private estimator: TextTimingEstimator;
  private debug: boolean;

  private accumulatedText: string = '';
  private accumulatedTimeline: TextTimeline | null = null;

  constructor(options: TextStreamHandlerOptions) {
    this.estimator = options.estimator;
    this.debug = options.debug ?? false;
  }

  /**
   * Append text chunk
   */
  append(text: string): void {
    if (!text || text.length === 0) {
      if (this.debug) {
        console.log('[TextStreamHandler] Empty text appended, ignoring');
      }
      return;
    }

    // Append to accumulated text
    this.accumulatedText += text;

    // Rebuild timeline with accumulated text
    const newTimeline = this.estimator.buildTimeline(this.accumulatedText);

    // Calculate offset for new segments
    const offset = this.accumulatedTimeline?.totalDuration ?? 0;

    // Adjust new segment times
    const adjustedSegments = newTimeline.segments.map(seg => ({
      ...seg,
      startTime: seg.startTime + offset,
      endTime: seg.endTime + offset,
    }));

    this.accumulatedTimeline = {
      ...newTimeline,
      segments: adjustedSegments,
    };

    if (this.debug) {
      console.log(
        `%c[TextStreamHandler] Appended text: "${text}"`,
        `new duration: ${newTimeline.totalDuration.toFixed(0)}ms, offset: ${offset.toFixed(0)}ms`,
        'background: #8e44ad; color: white; padding: 4px 8px; border-radius: 4px;'
      );
    }
  }

  /**
   * Get accumulated text
   */
  getAccumulatedText(): string {
    return this.accumulatedText;
  }

  /**
   * Get accumulated timeline
   */
  getAccumulatedTimeline(): TextTimeline | null {
    return this.accumulatedTimeline;
  }

  /**
   * Reset handler
   */
  reset(): void {
    this.accumulatedText = '';
    this.accumulatedTimeline = null;

    if (this.debug) {
      console.log(
        '%c[TextStreamHandler] Reset',
        'background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px;'
      );
    }
  }

  /**
   * Get accumulated text length
   */
  getAccumulatedTextLength(): number {
    return this.accumulatedText.length;
  }
}

export default TextStreamHandler;
