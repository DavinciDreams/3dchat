/**
 * Unit tests for TimelineManager
 * Tests for MAX_EVENTS_PER_FRAME fix to prevent browser freeze
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { TimelineManager } from './timelineManager';

describe('TimelineManager', () => {
  let manager: TimelineManager;

  beforeEach(() => {
    manager = new TimelineManager();
  });

  afterEach(() => {
    manager.stop();
    manager.clear();
  });

  describe('Event Management', () => {
    it('should schedule events', () => {
      manager.schedule({
        id: 'test_event',
        timestamp: 100,
        type: 'animation',
        data: { name: 'test_anim' },
        callback: () => {},
      });

      const upcoming = manager.getUpcomingEvents();
      expect(upcoming).toHaveLength(1);
      expect(upcoming[0].id).toBe('test_event');
    });

    it('should schedule multiple events at same timestamp', () => {
      // Schedule 10 events at same timestamp
      for (let i = 0; i < 10; i++) {
        manager.schedule({
          id: `event_${i}`,
          timestamp: 100,
          type: 'animation',
          data: { name: `anim_${i}` },
          callback: () => {},
        });
      }

      const upcoming = manager.getUpcomingEvents();
      expect(upcoming).toHaveLength(10);
    });

    it('should schedule more than 5 events at same timestamp', () => {
      // Schedule 7 events at same timestamp to test edge case
      for (let i = 0; i < 7; i++) {
        manager.schedule({
          id: `event_${i}`,
          timestamp: 100,
          type: 'animation',
          data: { name: `anim_${i}` },
          callback: () => {},
        });
      }

      const upcoming = manager.getUpcomingEvents();
      expect(upcoming).toHaveLength(7);
    });

    it('should cancel event by ID', () => {
      manager.schedule({
        id: 'event_1',
        timestamp: 100,
        type: 'animation',
        data: { name: 'anim_1' },
        callback: () => {},
      });

      manager.schedule({
        id: 'event_2',
        timestamp: 100,
        type: 'animation',
        data: { name: 'anim_2' },
        callback: () => {},
      });

      expect(manager.getUpcomingEvents()).toHaveLength(2);

      manager.cancelEvent('event_1');

      expect(manager.getUpcomingEvents()).toHaveLength(1);
      expect(manager.getUpcomingEvents()[0].id).toBe('event_2');
    });

    it('should cancel events by type', () => {
      manager.schedule({
        id: 'event_1',
        timestamp: 100,
        type: 'animation',
        data: { name: 'anim_1' },
        callback: () => {},
      });

      manager.schedule({
        id: 'event_2',
        timestamp: 100,
        type: 'emotion',
        data: { name: 'emotion_1' },
        callback: () => {},
      });

      manager.schedule({
        id: 'event_3',
        timestamp: 100,
        type: 'animation',
        data: { name: 'anim_2' },
        callback: () => {},
      });

      expect(manager.getUpcomingEvents()).toHaveLength(3);

      manager.cancelEventsByType('animation');

      expect(manager.getUpcomingEvents()).toHaveLength(1);
      expect(manager.getUpcomingEvents()[0].type).toBe('emotion');
    });

    it('should clear all events', () => {
      manager.schedule({
        id: 'event_1',
        timestamp: 100,
        type: 'animation',
        data: { name: 'anim_1' },
        callback: () => {},
      });

      manager.schedule({
        id: 'event_2',
        timestamp: 100,
        type: 'animation',
        data: { name: 'anim_2' },
        callback: () => {},
      });

      expect(manager.getUpcomingEvents()).toHaveLength(2);

      manager.clear();

      expect(manager.getUpcomingEvents()).toHaveLength(0);
    });
  });

  describe('Timeline State', () => {
    it('should track playing state', () => {
      expect(manager.isPlaying()).toBe(false);

      manager.start(1000);
      expect(manager.isPlaying()).toBe(true);

      manager.stop();
      expect(manager.isPlaying()).toBe(false);
    });

    it('should track duration', () => {
      manager.start(5000);
      expect(manager.getDuration()).toBe(5000);
    });

    it('should calculate progress correctly', () => {
      manager.start(1000);
      
      // Progress should be 0 at start
      expect(manager.getProgress()).toBe(0);
    });

    it('should handle pause and resume', () => {
      manager.start(1000);
      expect(manager.isPlaying()).toBe(true);

      manager.pause();
      expect(manager.isPlaying()).toBe(false);

      manager.resume();
      expect(manager.isPlaying()).toBe(true);
    });
  });
});
