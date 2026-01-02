/**
 * Unit tests for AnimationQueueProcessorService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnimationQueueProcessorService } from './AnimationQueueProcessorService';

describe('AnimationQueueProcessorService', () => {
  let service: AnimationQueueProcessorService;

  beforeEach(() => {
    service = new AnimationQueueProcessorService();
  });

  describe('processAnimationQueue', () => {
    it('should process animation queue with callbacks', () => {
      const queue = [
        { name: 'peace', delay: 0 },
        { name: 'spin', delay: 1 }
      ];

      const onPlay = vi.fn();
      const onComplete = vi.fn();

      service.processAnimationQueue(queue, onPlay, onComplete);

      expect(onPlay).toHaveBeenCalledTimes(2);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should handle empty queue', () => {
      const onPlay = vi.fn();
      const onComplete = vi.fn();

      service.processAnimationQueue([], onPlay, onComplete);

      expect(onPlay).not.toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('distributeAnimationsAcrossAudio', () => {
    it('should distribute animations with early timing', () => {
      const animations = [
        { name: 'peace', delay: 0 }
      ];
      const audioDuration = 5000;

      const result = service.distributeAnimationsAcrossAudio(
        animations,
        audioDuration,
        'early'
      );

      expect(result).toHaveLength(1);
      expect(result[0].triggerTime).toBeLessThan(1500); // 500ms + 0 * 500ms
    });

    it('should distribute animations with middle timing', () => {
      const animations = [
        { name: 'peace', delay: 0 }
      ];
      const audioDuration = 5000;

      const result = service.distributeAnimationsAcrossAudio(
        animations,
        audioDuration,
        'middle'
      );

      expect(result).toHaveLength(1);
      expect(result[0].triggerTime).toBeGreaterThanOrEqual(1650); // 5000 * 0.33
      expect(result[0].triggerTime).toBeLessThanOrEqual(3500); // 5000 * 0.33 + 500
    });

    it('should distribute animations with late timing', () => {
      const animations = [
        { name: 'peace', delay: 0 }
      ];
      const audioDuration = 5000;

      const result = service.distributeAnimationsAcrossAudio(
        animations,
        audioDuration,
        'late'
      );

      expect(result).toHaveLength(1);
      expect(result[0].triggerTime).toBeGreaterThan(3300); // 5000 * 0.66
    });

    it('should distribute animations with distributed timing', () => {
      const animations = [
        { name: 'peace', delay: 0 },
        { name: 'spin', delay: 1 }
      ];
      const audioDuration = 5000;

      const result = service.distributeAnimationsAcrossAudio(
        animations,
        audioDuration,
        'distributed'
      );

      expect(result).toHaveLength(2);
      // Animations should be spread across the audio duration
      const triggerTime1 = result[0].triggerTime;
      const triggerTime2 = result[1].triggerTime;
      expect(Math.abs(triggerTime2 - triggerTime1)).toBeGreaterThan(0);
    });
  });

  describe('judgeAnimationsWithTiming', () => {
    it('should create enhanced judgment with timing', () => {
      const baseJudgment = {
        animations: [{ name: 'peace', delay: 0 }],
        reasoning: 'Test reasoning'
      };
      const aiResponse = 'Hello, how are you?';

      const result = service.judgeAnimationsWithTiming(
        baseJudgment,
        aiResponse,
        'upper_body',
        'early'
      );

      expect(result.suggestedTiming).toBe('early');
      expect(result.suggestedLayer).toBe('upper_body');
      expect(result.interruptible).toBe(true);
    });

    it('should use default timing and layer when not provided', () => {
      const baseJudgment = {
        animations: [{ name: 'peace', delay: 0 }],
        reasoning: 'Test reasoning'
      };
      const aiResponse = 'Regular response';

      const result = service.judgeAnimationsWithTiming(baseJudgment, aiResponse);

      expect(result.suggestedTiming).toBe('distributed');
      expect(result.suggestedLayer).toBe('gesture');
    });
  });

  describe('getBufferTime', () => {
    it('should return default buffer time', () => {
      const bufferTime = service.getBufferTime();
      expect(bufferTime).toBe(500); // Default 500ms
    });

    it('should return buffer time as positive number', () => {
      const bufferTime = service.getBufferTime();
      expect(typeof bufferTime).toBe('number');
      expect(bufferTime).toBeGreaterThan(0);
    });
  });
});
