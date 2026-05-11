/**
 * Unit tests for AnimationScheduler
 */

import { describe, it, beforeEach, expect, vi } from 'vitest';
import { AnimationScheduler } from './AnimationScheduler';
import { AnimationQueue } from './AnimationQueue';
import type { QueuedAnimation, TimelineEvent } from '../../types';

describe('AnimationScheduler', () => {
  let scheduler: AnimationScheduler;
  let mockTimelineManager: {
    schedule: ReturnType<typeof vi.fn>;
    cancelEvent: ReturnType<typeof vi.fn>;
    cancelEventsByType: ReturnType<typeof vi.fn>;
  };
  let animationQueue: AnimationQueue;

  beforeEach(() => {
    // Track all scheduled callbacks for triggering
    const scheduledCallbacks: Array<() => void> = [];
    
    mockTimelineManager = {
      schedule: vi.fn((event: TimelineEvent) => {
        // Call the callback synchronously for tests
        if (event.callback) {
          scheduledCallbacks.push(event.callback);
          event.callback();
        }
        return { callback: event.callback };
      }),
      cancelEvent: vi.fn(),
      cancelEventsByType: vi.fn(),
    };

    animationQueue = new AnimationQueue();

    scheduler = new AnimationScheduler({
      timelineManager: mockTimelineManager,
      animationQueue,
      defaultBlendDuration: 300,
      debug: false,
    });
    
    // Trigger all scheduled callbacks after scheduler is created
    scheduledCallbacks.forEach(cb => cb());
    scheduledCallbacks.length = 0;
  });

  describe('schedule', () => {
    it('should schedule animation on timeline', () => {
      const animation: QueuedAnimation = {
        id: 'test_id',
        name: 'test_animation',
        layer: 'full_body',
        startTime: 1000,
        duration: 2000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      };

      scheduler.schedule(animation, 0);

      expect(mockTimelineManager.schedule).toHaveBeenCalled();
    });

    it('should add animation to queue', () => {
      const animation: QueuedAnimation = {
        id: 'test_id',
        name: 'test_animation',
        layer: 'full_body',
        startTime: 1000,
        duration: 2000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      };

      scheduler.schedule(animation, 0);

      expect(scheduler.getQueue()).toHaveLength(1);
    });

    it('should set active layer for animation', () => {
      const animation: QueuedAnimation = {
        id: 'test_id',
        name: 'test_animation',
        layer: 'full_body',
        startTime: 1000,
        duration: 2000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      };

      scheduler.schedule(animation, 0);

      // Manually trigger timeline callback to set active layer
      const scheduledCall = mockTimelineManager.schedule.mock.calls[0];
      const scheduledEvent = scheduledCall[0];
      if (scheduledEvent.callback) {
        scheduledEvent.callback();
      }

      expect(scheduler.getActiveLayer('full_body')).toEqual(animation);
    });
  });

  describe('scheduleBatch', () => {
    it('should schedule multiple animations', () => {
      const animations: QueuedAnimation[] = [
        {
          id: 'test1',
          name: 'test1',
          layer: 'full_body',
          startTime: 1000,
          duration: 2000,
          blendIn: 300,
          blendOut: 300,
          interruptible: true,
        },
        {
          id: 'test2',
          name: 'test2',
          layer: 'upper_body',
          startTime: 2000,
          duration: 1500,
          blendIn: 300,
          blendOut: 300,
          interruptible: true,
        },
      ];

      scheduler.scheduleBatch(animations, 0);

      expect(mockTimelineManager.schedule).toHaveBeenCalledTimes(4); // 2 start + 2 fadeOut events
      expect(scheduler.getQueue()).toHaveLength(2);
    });
  });

  describe('cancel', () => {
    beforeEach(() => {
      const animation: QueuedAnimation = {
        id: 'test_id',
        name: 'test_animation',
        layer: 'full_body',
        startTime: 1000,
        duration: 2000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      };

      scheduler.schedule(animation, 0);
    });

    it('should cancel scheduled animation', () => {
      scheduler.cancel('test_id');

      expect(mockTimelineManager.cancelEvent).toHaveBeenCalledWith('test_id_start');
      expect(mockTimelineManager.cancelEvent).toHaveBeenCalledWith('test_id_fadeOut');
      expect(scheduler.getQueue()).toHaveLength(0);
    });
  });

  describe('cancelAll', () => {
    beforeEach(() => {
      const animations: QueuedAnimation[] = [
        {
          id: 'test1',
          name: 'test1',
          layer: 'full_body',
          startTime: 1000,
          duration: 2000,
          blendIn: 300,
          blendOut: 300,
          interruptible: true,
        },
        {
          id: 'test2',
          name: 'test2',
          layer: 'upper_body',
          startTime: 2000,
          duration: 1500,
          blendIn: 300,
          blendOut: 300,
          interruptible: true,
        },
      ];

      scheduler.scheduleBatch(animations, 0);
    });

    it('should cancel all animations', () => {
      scheduler.cancelAll();

      expect(mockTimelineManager.cancelEventsByType).toHaveBeenCalledWith('animation');
      expect(scheduler.getQueue()).toHaveLength(0);
    });
  });

  describe('interrupt', () => {
    beforeEach(() => {
      const animations: QueuedAnimation[] = [
        {
          id: 'test1',
          name: 'test1',
          layer: 'full_body',
          startTime: 1000,
          duration: 2000,
          blendIn: 300,
          blendOut: 300,
          interruptible: true,
        },
        {
          id: 'test2',
          name: 'test2',
          layer: 'upper_body',
          startTime: 2000,
          duration: 1500,
          blendIn: 300,
          blendOut: 300,
          interruptible: true,
        },
      ];

      scheduler.scheduleBatch(animations, 0);
      
      // Manually trigger timeline callbacks to set active layers
      const calls = mockTimelineManager.schedule.mock.calls;
      calls.forEach((call) => {
        const event = call[0];
        if (event.callback && event.id?.includes('_start')) {
          event.callback();
        }
      });
    });

    it('should interrupt animations except on specified layers', () => {
      scheduler.interrupt(['upper_body']);

      expect(scheduler.getQueue()).toHaveLength(2); // Queue is not cleared on interrupt
      expect(scheduler.getActiveLayer('full_body')).toBeNull();
      expect(scheduler.getActiveLayer('upper_body')).not.toBeNull();
    });

    it('should interrupt all animations when no layers specified', () => {
      scheduler.interrupt([]);

      expect(scheduler.getActiveLayer('full_body')).toBeNull();
      expect(scheduler.getActiveLayer('upper_body')).toBeNull();
    });
  });

  describe('getQueue', () => {
    beforeEach(() => {
      const animation: QueuedAnimation = {
        id: 'test_id',
        name: 'test_animation',
        layer: 'full_body',
        startTime: 1000,
        duration: 2000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      };

      scheduler.schedule(animation, 0);
    });

    it('should return copy of queue', () => {
      const result = scheduler.getQueue();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('test_id');
      expect(result).not.toBe(scheduler.getQueue()); // Should be a copy
    });
  });

  describe('getQueueLength', () => {
    beforeEach(() => {
      const animation: QueuedAnimation = {
        id: 'test_id',
        name: 'test_animation',
        layer: 'full_body',
        startTime: 1000,
        duration: 2000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      };

      scheduler.schedule(animation, 0);
    });

    it('should return queue length', () => {
      expect(scheduler.getQueueLength()).toBe(1);
    });
  });

  describe('getActiveLayer', () => {
    beforeEach(() => {
      const animation: QueuedAnimation = {
        id: 'test_id',
        name: 'test_animation',
        layer: 'full_body',
        startTime: 1000,
        duration: 2000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      };

      scheduler.schedule(animation, 0);

      // Manually trigger timeline callback to set active layer
      const scheduledCall = mockTimelineManager.schedule.mock.calls[0];
      const scheduledEvent = scheduledCall[0];
      if (scheduledEvent.callback) {
        scheduledEvent.callback();
      }
    });

    it('should return active animation for layer', () => {
      const result = scheduler.getActiveLayer('full_body');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('test_id');
    });

    it('should return null for non-active layer', () => {
      const result = scheduler.getActiveLayer('upper_body');

      expect(result).toBeNull();
    });
  });

  describe('getAllActiveLayers', () => {
    beforeEach(() => {
      const animations: QueuedAnimation[] = [
        {
          id: 'test1',
          name: 'test1',
          layer: 'full_body',
          startTime: 1000,
          duration: 2000,
          blendIn: 300,
          blendOut: 300,
          interruptible: true,
        },
        {
          id: 'test2',
          name: 'test2',
          layer: 'upper_body',
          startTime: 2000,
          duration: 1500,
          blendIn: 300,
          blendOut: 300,
          interruptible: true,
        },
      ];

      scheduler.scheduleBatch(animations, 0);
      
      // Manually trigger timeline callbacks to set active layers
      const calls = mockTimelineManager.schedule.mock.calls;
      calls.forEach((call) => {
        const event = call[0];
        if (event.callback && event.id?.includes('_start')) {
          event.callback();
        }
      });
    });

    it('should return all active layers', () => {
      const result = scheduler.getAllActiveLayers();

      expect(result.size).toBe(2);
      expect(result.get('full_body')?.id).toBe('test1');
      expect(result.get('upper_body')?.id).toBe('test2');
    });
  });

  describe('reset', () => {
    beforeEach(() => {
      const animations: QueuedAnimation[] = [
        {
          id: 'test1',
          name: 'test1',
          layer: 'full_body',
          startTime: 1000,
          duration: 2000,
          blendIn: 300,
          blendOut: 300,
          interruptible: true,
        },
      ];

      scheduler.scheduleBatch(animations, 0);
    });

    it('should clear queue and active layers', () => {
      scheduler.reset();

      expect(scheduler.getQueue()).toHaveLength(0);
      expect(scheduler.getActiveLayer('full_body')).toBeNull();
    });
  });
});
