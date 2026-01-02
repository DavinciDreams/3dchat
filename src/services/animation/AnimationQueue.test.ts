/**
 * Unit tests for AnimationQueue
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { AnimationQueue } from './AnimationQueue';
import type { QueuedAnimation, AnimationLayerType } from '../../types';

describe('AnimationQueue', () => {
  let queue: AnimationQueue;

  beforeEach(() => {
    queue = new AnimationQueue();
  });

  afterEach(() => {
    // Cleanup if needed
  });

  describe('add', () => {
    it('should add animation to queue', () => {
      const animation: QueuedAnimation = {
        id: 'test_id',
        name: 'test_animation',
        layer: 'full_body',
        startTime: 0,
        duration: 1000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      };

      queue.add(animation);

      expect(queue.getQueue()).toHaveLength(1);
      expect(queue.getQueue()[0]).toEqual(animation);
    });

    it('should generate ID if not provided', () => {
      const animation: QueuedAnimation = {
        id: '',
        name: 'test_animation',
        layer: 'full_body',
        startTime: 0,
        duration: 1000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      };

      queue.add(animation);

      expect(animation.id).toBe('anim_0');
    });

    it('should use provided ID', () => {
      const animation: QueuedAnimation = {
        id: 'custom_id',
        name: 'test_animation',
        layer: 'full_body',
        startTime: 0,
        duration: 1000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      };

      queue.add(animation);

      expect(animation.id).toBe('custom_id');
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      queue = new AnimationQueue();
      queue.add({
        id: 'test1',
        name: 'test1',
        layer: 'full_body',
        startTime: 0,
        duration: 1000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      });
      queue.add({
        id: 'test2',
        name: 'test2',
        layer: 'upper_body',
        startTime: 0,
        duration: 1000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      });
    });

    it('should remove animation from queue', () => {
      queue.remove('test1');

      expect(queue.getQueue()).toHaveLength(1);
      expect(queue.getQueue()[0].id).toBe('test2');
    });
  });

  describe('getQueue', () => {
    beforeEach(() => {
      queue = new AnimationQueue();
      queue.add({
        id: 'test1',
        name: 'test1',
        layer: 'full_body',
        startTime: 0,
        duration: 1000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      });
    });

    it('should return copy of queue', () => {
      const result = queue.getQueue();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('test1');
      expect(result).not.toBe(queue.getQueue()); // Should be a copy
    });
  });

  describe('getQueueLength', () => {
    beforeEach(() => {
      queue = new AnimationQueue();
      queue.add({
        id: 'test1',
        name: 'test1',
        layer: 'full_body',
        startTime: 0,
        duration: 1000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      });
    });

    it('should return queue length', () => {
      expect(queue.getQueueLength()).toBe(1);
    });
  });

  describe('clearQueue', () => {
    beforeEach(() => {
      queue = new AnimationQueue();
      queue.add({
        id: 'test1',
        name: 'test1',
        layer: 'full_body',
        startTime: 0,
        duration: 1000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      });
    });

    it('should clear all queued animations', () => {
      queue.clearQueue();

      expect(queue.getQueue()).toHaveLength(0);
      expect(queue.getQueueLength()).toBe(0);
    });
  });

  describe('setActiveLayer', () => {
    beforeEach(() => {
      queue = new AnimationQueue();
    });

    it('should set active animation for layer', () => {
      const animation: QueuedAnimation = {
        id: 'test_id',
        name: 'test_animation',
        layer: 'full_body',
        startTime: 0,
        duration: 1000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      };

      queue.setActiveLayer('full_body', animation);

      expect(queue.getActiveLayer('full_body')).toEqual(animation);
    });

    it('should replace existing active animation', () => {
      const animation1: QueuedAnimation = {
        id: 'test_id',
        name: 'test_animation',
        layer: 'full_body',
        startTime: 0,
        duration: 1000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      };

      const animation2: QueuedAnimation = {
        id: 'test2',
        name: 'test2',
        layer: 'upper_body',
        startTime: 0,
        duration: 1000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      };

      queue.setActiveLayer('full_body', animation1);
      queue.setActiveLayer('upper_body', animation2);

      expect(queue.getActiveLayer('full_body')).toEqual(animation2);
      expect(queue.getActiveLayer('upper_body')).toEqual(animation1);
    });
  });

  describe('getActiveLayer', () => {
    beforeEach(() => {
      queue = new AnimationQueue();
      queue.setActiveLayer('full_body', {
        id: 'test_id',
        name: 'test_animation',
        layer: 'full_body',
        startTime: 0,
        duration: 1000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      });
    });

    it('should return active animation for layer', () => {
      const animation: QueuedAnimation = {
        id: 'test_id',
        name: 'test_animation',
        layer: 'full_body',
        startTime: 0,
        duration: 1000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      };

      expect(queue.getActiveLayer('full_body')).toEqual(animation);
      expect(queue.getActiveLayer('upper_body')).toBeNull();
    });
  });

  describe('getAllActiveLayers', () => {
    beforeEach(() => {
      queue = new AnimationQueue();
      queue.setActiveLayer('full_body', {
        id: 'test_id',
        name: 'test_animation',
        layer: 'full_body',
        startTime: 0,
        duration: 1000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      });
      queue.setActiveLayer('upper_body', {
        id: 'test2',
        name: 'test2',
        layer: 'upper_body',
        startTime: 0,
        duration: 1000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      });
    });

    it('should return all active layers', () => {
      const result = queue.getAllActiveLayers();

      expect(result.size).toBe(2);
      expect(result.get('full_body')).toEqual({
        id: 'test_id',
        name: 'test_animation',
        layer: 'full_body',
        startTime: 0,
        duration: 1000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      });
      expect(result.get('upper_body')).toEqual({
        id: 'test2',
        name: 'test2',
        layer: 'upper_body',
        startTime: 0,
        duration: 1000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      });
    });
  });

  describe('removeActiveLayer', () => {
    beforeEach(() => {
      queue = new AnimationQueue();
      queue.setActiveLayer('full_body', {
        id: 'test_id',
        name: 'test_animation',
        layer: 'full_body',
        startTime: 0,
        duration: 1000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      });
    });

    it('should remove active layer', () => {
      queue.removeActiveLayer('full_body');

      expect(queue.getActiveLayer('full_body')).toBeNull();
      expect(queue.getAllActiveLayers().size).toBe(0);
    });
  });

  describe('clearActiveLayers', () => {
    beforeEach(() => {
      queue = new AnimationQueue();
      queue.setActiveLayer('full_body', {
        id: 'test_id',
        name: 'test_animation',
        layer: 'full_body',
        startTime: 0,
        duration: 1000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      });
    });

    it('should clear all active layers', () => {
      queue.clearActiveLayers();

      expect(queue.getAllActiveLayers().size).toBe(0);
    });
  });

  describe('findActiveById', () => {
    beforeEach(() => {
      queue = new AnimationQueue();
      const animation: QueuedAnimation = {
        id: 'test_id',
        name: 'test_animation',
        layer: 'full_body',
        startTime: 0,
        duration: 1000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      };
      queue.setActiveLayer('full_body', animation);
    });

    it('should find active animation by ID', () => {
      const result = queue.findActiveById('test_id');

      expect(result).toEqual({
        id: 'test_id',
        name: 'test_animation',
        layer: 'full_body',
        startTime: 0,
        duration: 1000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      });
    });

    it('should return null if not found', () => {
      const result = queue.findActiveById('non_existent_id');

      expect(result).toBeNull();
    });
  });

  describe('getNextId', () => {
    beforeEach(() => {
      queue = new AnimationQueue();
    });

    it('should generate unique IDs', () => {
      const id1 = queue.getNextId();
      const id2 = queue.getNextId();
      const id3 = queue.getNextId();

      expect(id1).toBe('anim_0');
      expect(id2).toBe('anim_1');
      expect(id3).toBe('anim_2');
    });
  });

  describe('reset', () => {
    beforeEach(() => {
      queue = new AnimationQueue();
      queue.add({
        id: 'test1',
        name: 'test1',
        layer: 'full_body',
        startTime: 0,
        duration: 1000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      });
      queue.setActiveLayer('full_body', {
        id: 'test_id',
        name: 'test_animation',
        layer: 'full_body',
        startTime: 0,
        duration: 1000,
        blendIn: 300,
        blendOut: 300,
        interruptible: true,
      });
    });

    it('should clear queue and active layers', () => {
      queue.reset();

      expect(queue.getQueue()).toHaveLength(0);
      expect(queue.getQueueLength()).toBe(0);
      expect(queue.getAllActiveLayers().size).toBe(0);
    });
  });
});
