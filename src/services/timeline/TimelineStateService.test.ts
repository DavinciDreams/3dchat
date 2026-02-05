/**
 * Unit tests for TimelineStateService
 */

import { describe, it, beforeEach, expect } from 'vitest';
import { TimelineStateService } from './TimelineStateService';
import type { TextTimeline } from '../../types';

describe('TimelineStateService', () => {
  let service: TimelineStateService;

  beforeEach(() => {
    service = new TimelineStateService();
  });

  describe('initial state', () => {
    it('should have default idle status', () => {
      expect(service.getState().status).toBe('idle');
    });

    it('should have null timeline', () => {
      expect(service.getState().timeline).toBeNull();
    });

    it('should have zero current time', () => {
      expect(service.getState().currentTime).toBe(0);
    });

    it('should have zero total duration', () => {
      expect(service.getState().totalDuration).toBe(0);
    });

    it('should have false hasAudio', () => {
      expect(service.getState().hasAudio).toBe(false);
    });

    it('should have null audioDuration', () => {
      expect(service.getState().audioDuration).toBeNull();
    });

    it('should have false isSynced', () => {
      expect(service.getState().isSynced).toBe(false);
    });

    it('should have 1 syncRatio', () => {
      expect(service.getState().syncRatio).toBe(1);
    });

    it('should have null error', () => {
      expect(service.getState().error).toBeNull();
    });

    it('should have neutral emotion', () => {
      expect(service.getCurrentEmotion()).toBe('neutral');
    });

    it('should have empty scheduled animations', () => {
      expect(service.getScheduledAnimations()).toHaveLength(0);
    });
  });

  describe('setStatus', () => {
    it('should update status', () => {
      service.setStatus('running');

      expect(service.getState().status).toBe('running');
    });
  });

  describe('setCurrentTime', () => {
    it('should update current time', () => {
      service.setCurrentTime(5000);

      expect(service.getState().currentTime).toBe(5000);
    });
  });

  describe('setTotalDuration', () => {
    it('should update total duration', () => {
      service.setTotalDuration(10000);

      expect(service.getState().totalDuration).toBe(10000);
    });
  });

  describe('setTimeline', () => {
    it('should update timeline', () => {
      const timeline: TextTimeline = {
        originalText: 'Hello world',
        segments: [],
        totalDuration: 5000,
        wordCount: 2,
        sentenceCount: 1,
        characterCount: 11,
        createdAt: Date.now(),
      };

      service.setTimeline(timeline);

      expect(service.getState().timeline).toEqual(timeline);
    });
  });

  describe('setHasAudio', () => {
    it('should update hasAudio flag', () => {
      service.setHasAudio(true);

      expect(service.getState().hasAudio).toBe(true);
    });
  });

  describe('setAudioDuration', () => {
    it('should update audio duration', () => {
      service.setAudioDuration(8000);

      expect(service.getState().audioDuration).toBe(8000);
    });
  });

  describe('setIsSynced', () => {
    it('should update isSynced flag', () => {
      service.setIsSynced(true);

      expect(service.getState().isSynced).toBe(true);
    });
  });

  describe('setSyncRatio', () => {
    it('should update sync ratio', () => {
      service.setSyncRatio(0.9);

      expect(service.getState().syncRatio).toBe(0.9);
    });
  });

  describe('setError', () => {
    it('should update error', () => {
      service.setError('Test error');

      expect(service.getState().error).toBe('Test error');
    });

    it('should clear error with null', () => {
      service.setError('Test error');
      service.setError(null);

      expect(service.getState().error).toBeNull();
    });
  });

  describe('emotion management', () => {
    it('should set current emotion', () => {
      service.setCurrentEmotion('happy');

      expect(service.getCurrentEmotion()).toBe('happy');
    });

    it('should update status when emotion changes', () => {
      service.setStatus('running');
      service.setCurrentEmotion('thinking');

      expect(service.getState().status).toBe('running');
    });
  });

  describe('scheduledAnimations management', () => {
    it('should set scheduled animations', () => {
      const animations = [
        { name: 'test1', triggerTime: 1000, duration: 2000 },
        { name: 'test2', triggerTime: 3000, duration: 1500 },
      ];

      service.setScheduledAnimations(animations);

      expect(service.getScheduledAnimations()).toEqual(animations);
    });

    it('should clear scheduled animations', () => {
      const animations = [
        { name: 'test1', triggerTime: 1000, duration: 2000 },
      ];

      service.setScheduledAnimations(animations);
      service.clearScheduledAnimations();

      expect(service.getScheduledAnimations()).toHaveLength(0);
    });
  });

  describe('getState', () => {
    it('should return copy of state', () => {
      service.setStatus('running');
      service.setCurrentTime(5000);

      const state1 = service.getState();
      const state2 = service.getState();

      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2); // Should be a copy
    });
  });

  describe('reset', () => {
    beforeEach(() => {
      service.setStatus('running');
      service.setCurrentTime(5000);
      service.setTotalDuration(10000);
      service.setHasAudio(true);
      service.setAudioDuration(8000);
      service.setIsSynced(true);
      service.setSyncRatio(0.9);
      service.setError('Test error');
      service.setCurrentEmotion('happy');
    });

    it('should reset state to defaults', () => {
      service.reset();

      expect(service.getState().status).toBe('idle');
      expect(service.getState().currentTime).toBe(0);
      expect(service.getState().totalDuration).toBe(0);
      expect(service.getState().hasAudio).toBe(false);
      expect(service.getState().audioDuration).toBeNull();
      expect(service.getState().isSynced).toBe(false);
      expect(service.getState().syncRatio).toBe(1);
      expect(service.getState().error).toBeNull();
      expect(service.getCurrentEmotion()).toBe('neutral');
      expect(service.getScheduledAnimations()).toHaveLength(0);
    });

    it('should preserve timeline after reset', () => {
      const timeline: TextTimeline = {
        originalText: 'Hello world',
        segments: [],
        totalDuration: 5000,
        wordCount: 2,
        sentenceCount: 1,
        characterCount: 11,
        createdAt: Date.now(),
      };

      service.setTimeline(timeline);
      service.reset();

      expect(service.getState().timeline).toBeNull();
    });
  });
});
