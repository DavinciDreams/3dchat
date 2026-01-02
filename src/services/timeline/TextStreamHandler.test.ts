/**
 * Unit tests for TextStreamHandler
 */

import { describe, it, beforeEach, expect, vi } from 'vitest';
import { TextStreamHandler } from './TextStreamHandler';
import type { TextTimingEstimator } from '../../types';

describe('TextStreamHandler', () => {
  let handler: TextStreamHandler;
  let mockEstimator: TextTimingEstimator;

  beforeEach(() => {
    mockEstimator = {
      buildTimeline: vi.fn((text: string) => ({
        originalText: text,
        segments: [],
        totalDuration: text.length * 100, // Simple estimation
        wordCount: text.split(' ').length,
        sentenceCount: text.split('.').length,
        characterCount: text.length,
        createdAt: Date.now(),
      })),
      estimateDuration: vi.fn((text: string) => text.length * 100),
      analyzeText: vi.fn((text: string) => ({
        text,
        estimatedDuration: text.length * 100,
        wordCount: text.split(' ').length,
        sentenceCount: text.split('.').length,
        characterCount: text.length,
        wordsPerMinute: 150,
        avgWordDuration: 100,
        totalPauseTime: 0,
        pausePercentage: 0,
        segmentBreakdown: {
          words: text.split(' ').length,
          pauses: 0,
          punctuation: 0,
          sentences: text.split('.').length,
          paragraphs: 0,
        },
        emphasizedSegments: [],
      })),
      calibrate: vi.fn(),
      resetCalibration: vi.fn(),
      getCalibrationFactor: vi.fn(() => 1),
      setOptions: vi.fn(),
      getOptions: vi.fn(() => ({})),
    };

    handler = new TextStreamHandler({
      estimator: mockEstimator,
      debug: false,
    });
  });

  describe('initial state', () => {
    it('should have empty accumulated text', () => {
      expect(handler.getAccumulatedText()).toBe('');
    });

    it('should have empty accumulated timeline', () => {
      expect(handler.getAccumulatedTimeline()).toBeNull();
    });

    it('should have zero accumulated text length', () => {
      expect(handler.getAccumulatedTextLength()).toBe(0);
    });
  });

  describe('append', () => {
    it('should append text chunk', () => {
      handler.append('Hello');

      expect(handler.getAccumulatedText()).toBe('Hello');
      expect(handler.getAccumulatedTextLength()).toBe(5);
    });

    it('should append multiple text chunks', () => {
      handler.append('Hello');
      handler.append(' ');
      handler.append('world');

      expect(handler.getAccumulatedText()).toBe('Hello world');
      expect(handler.getAccumulatedTextLength()).toBe(11);
    });

    it('should handle empty text chunks', () => {
      handler.append('');
      handler.append('Hello');

      expect(handler.getAccumulatedText()).toBe('Hello');
      expect(handler.getAccumulatedTextLength()).toBe(5);
    });

    it('should rebuild timeline on append', () => {
      handler.append('Hello');

      expect(mockEstimator.buildTimeline).toHaveBeenCalledWith('Hello');
      expect(handler.getAccumulatedTimeline()).not.toBeNull();
    });
  });

  describe('getAccumulatedText', () => {
    beforeEach(() => {
      handler.append('Hello world');
    });

    it('should return accumulated text', () => {
      expect(handler.getAccumulatedText()).toBe('Hello world');
    });

    it('should return copy of text', () => {
      const text1 = handler.getAccumulatedText();
      const text2 = handler.getAccumulatedText();

      expect(text1).toBe(text2);
      expect(text1).not.toBe(text2); // Should be a copy
    });
  });

  describe('getAccumulatedTimeline', () => {
    beforeEach(() => {
      handler.append('Hello world');
    });

    it('should return accumulated timeline', () => {
      const timeline = handler.getAccumulatedTimeline();

      expect(timeline).not.toBeNull();
      expect(timeline?.originalText).toBe('Hello world');
    });
  });

  describe('getAccumulatedTextLength', () => {
    beforeEach(() => {
      handler.append('Hello world');
    });

    it('should return accumulated text length', () => {
      expect(handler.getAccumulatedTextLength()).toBe(11);
    });
  });

  describe('reset', () => {
    beforeEach(() => {
      handler.append('Hello world');
    });

    it('should clear accumulated text', () => {
      handler.reset();

      expect(handler.getAccumulatedText()).toBe('');
      expect(handler.getAccumulatedTextLength()).toBe(0);
    });

    it('should clear accumulated timeline', () => {
      handler.reset();

      expect(handler.getAccumulatedTimeline()).toBeNull();
    });
  });

  describe('streaming scenario', () => {
    it('should handle streaming text properly', () => {
      const chunks = ['Hello', ' ', 'world', '!'];

      chunks.forEach(chunk => handler.append(chunk));

      expect(handler.getAccumulatedText()).toBe('Hello world!');
      expect(handler.getAccumulatedTextLength()).toBe(12);
    });

    it('should handle reset between streams', () => {
      handler.append('Hello world');
      handler.reset();
      handler.append('Goodbye');

      expect(handler.getAccumulatedText()).toBe('Goodbye');
      expect(handler.getAccumulatedTextLength()).toBe(7);
    });

    it('should accumulate timeline across multiple appends', () => {
      handler.append('Hello');
      handler.append(' ');
      handler.append('world');

      const timeline = handler.getAccumulatedTimeline();

      expect(timeline).not.toBeNull();
      expect(timeline?.originalText).toBe('Hello world');
      expect(mockEstimator.buildTimeline).toHaveBeenCalledTimes(3);
    });
  });
});
