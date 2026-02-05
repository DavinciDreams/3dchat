/**
 * Unit tests for TimelineScheduler
 */

import { describe, it, beforeEach, expect, vi } from 'vitest';
import { TimelineScheduler } from './TimelineScheduler';
import type { ScheduledAnimation, TextTimeline } from '../../types';

describe('TimelineScheduler', () => {
  let scheduler: TimelineScheduler;
  let mockTimelineManager: {
    schedule: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockTimelineManager = {
      schedule: vi.fn(),
    };

    scheduler = new TimelineScheduler({
      timelineManager: mockTimelineManager,
      debug: false,
    });
  });

  describe('scheduleAnimations', () => {
    it('should schedule animations on timeline', () => {
      const animations: ScheduledAnimation[] = [
        { name: 'test1', triggerTime: 1000, duration: 2000 },
        { name: 'test2', triggerTime: 3000, duration: 1500 },
      ];

      const timeline: TextTimeline = {
        originalText: 'Hello world',
        segments: [],
        totalDuration: 5000,
        wordCount: 2,
        sentenceCount: 1,
        characterCount: 11,
        createdAt: Date.now(),
      };

      scheduler.scheduleAnimations(animations, timeline);

      expect(mockTimelineManager.schedule).toHaveBeenCalled();
    });

    it('should calculate trigger time for each animation', () => {
      const animations: ScheduledAnimation[] = [
        { name: 'test1', triggerTime: 1000, duration: 2000 },
      ];

      const timeline: TextTimeline = {
        originalText: 'Hello world',
        segments: [],
        totalDuration: 5000,
        wordCount: 2,
        sentenceCount: 1,
        characterCount: 11,
        createdAt: Date.now(),
      };

      scheduler.scheduleAnimations(animations, timeline);

      expect(mockTimelineManager.schedule).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: 1000,
        })
      );
    });
  });

  describe('calculateTriggerTime', () => {
    it('should calculate trigger time for animation', () => {
      const timeline: TextTimeline = {
        originalText: 'Hello world',
        segments: [],
        totalDuration: 5000,
        wordCount: 2,
        sentenceCount: 1,
        characterCount: 11,
        createdAt: Date.now(),
      };

      const animation: ScheduledAnimation = {
        name: 'test',
        triggerTime: 1000,
        duration: 2000,
      };

      const result = scheduler.calculateTriggerTime(animation, timeline);

      expect(result).toBe(1000);
    });

    it('should handle animations at end of timeline', () => {
      const timeline: TextTimeline = {
        originalText: 'Hello world',
        segments: [],
        totalDuration: 5000,
        wordCount: 2,
        sentenceCount: 1,
        characterCount: 11,
        createdAt: Date.now(),
      };

      const animation: ScheduledAnimation = {
        name: 'test',
        triggerTime: 5000,
        duration: 2000,
      };

      const result = scheduler.calculateTriggerTime(animation, timeline);

      expect(result).toBe(5000);
    });

    it('should handle animations without explicit trigger time', () => {
      const timeline: TextTimeline = {
        originalText: 'Hello world',
        segments: [],
        totalDuration: 5000,
        wordCount: 2,
        sentenceCount: 1,
        characterCount: 11,
        createdAt: Date.now(),
      };

      // Create animation without explicit trigger time
      const animation: Partial<ScheduledAnimation> = {
        name: 'test',
        duration: 2000,
      };

      const result = scheduler.calculateTriggerTime(animation as ScheduledAnimation, timeline);

      expect(result).toBe(2500); // Middle of timeline (0.5 * 5000)
    });
  });

  describe('adjustTimelineDuration', () => {
    it('should adjust timeline duration to match audio', () => {
      const timeline: TextTimeline = {
        originalText: 'Hello world',
        segments: [],
        totalDuration: 5000,
        wordCount: 2,
        sentenceCount: 1,
        characterCount: 11,
        createdAt: Date.now(),
      };

      const audioDuration = 6000;

      const result = scheduler.adjustTimelineDuration(timeline, audioDuration);

      expect(result.totalDuration).toBe(6000);
    });

    it('should preserve other timeline properties', () => {
      const timeline: TextTimeline = {
        originalText: 'Hello world',
        segments: [],
        totalDuration: 5000,
        wordCount: 2,
        sentenceCount: 1,
        characterCount: 11,
        createdAt: 1234567890,
      };

      const audioDuration = 6000;

      const result = scheduler.adjustTimelineDuration(timeline, audioDuration);

      expect(result.originalText).toBe('Hello world');
      expect(result.wordCount).toBe(2);
      expect(result.sentenceCount).toBe(1);
      expect(result.characterCount).toBe(11);
      expect(result.createdAt).toBe(1234567890);
    });

    it('should handle audio duration shorter than timeline', () => {
      const timeline: TextTimeline = {
        originalText: 'Hello world',
        segments: [],
        totalDuration: 5000,
        wordCount: 2,
        sentenceCount: 1,
        characterCount: 11,
        createdAt: Date.now(),
      };

      const audioDuration = 4000;

      const result = scheduler.adjustTimelineDuration(timeline, audioDuration);

      expect(result.totalDuration).toBe(4000);
    });

    it('should scale segment durations', () => {
      const timeline: TextTimeline = {
        originalText: 'Hello world',
        segments: [
          {
            text: 'Hello',
            startIndex: 0,
            endIndex: 5,
            duration: 1000,
            startTime: 0,
            endTime: 1000,
            type: 'word',
            isEmphasized: false,
          },
        ],
        totalDuration: 5000,
        wordCount: 2,
        sentenceCount: 1,
        characterCount: 11,
        createdAt: Date.now(),
      };

      const audioDuration = 10000;

      const result = scheduler.adjustTimelineDuration(timeline, audioDuration);

      expect(result.totalDuration).toBe(10000);
      expect(result.segments[0].duration).toBe(2000); // 1000 * (10000/5000)
      expect(result.segments[0].startTime).toBe(0);
      expect(result.segments[0].endTime).toBe(2000);
    });
  });

  describe('executeAnimation', () => {
    it('should execute animation (placeholder)', () => {
      const animation: ScheduledAnimation = {
        name: 'test',
        triggerTime: 1000,
        duration: 2000,
      };

      // This is a placeholder method - just verify it doesn't throw
      expect(() => scheduler.executeAnimation(animation)).not.toThrow();
    });
  });
});
