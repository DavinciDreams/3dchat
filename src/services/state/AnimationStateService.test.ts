/**
 * Unit tests for AnimationStateService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { animationStateService } from './AnimationStateService';
import type { AnimationTrigger } from '../../types';

describe('AnimationStateService', () => {
  beforeEach(() => {
    // Reset service state before each test
    animationStateService.reset();
  });

  describe('getState', () => {
    it('should return current state', () => {
      const state = animationStateService.getState();

      expect(state).toEqual({
        animationQueue: [],
        currentAnimation: null,
        animationSpeed: 2.0,
      });
    });

    it('should return a copy of state, not reference', () => {
      const state1 = animationStateService.getState();
      const state2 = animationStateService.getState();

      expect(state1).not.toBe(state2);
    });
  });

  describe('getAnimationQueue', () => {
    it('should return empty queue initially', () => {
      const queue = animationStateService.getAnimationQueue();

      expect(queue).toEqual([]);
    });

    it('should return a copy of queue', () => {
      const animation: AnimationTrigger = { name: 'spin' };
      animationStateService.addToQueue(animation);
      const queue1 = animationStateService.getAnimationQueue();
      const queue2 = animationStateService.getAnimationQueue();

      expect(queue1).not.toBe(queue2);
      expect(queue1).toEqual(queue2);
    });
  });

  describe('getCurrentAnimation', () => {
    it('should return null initially', () => {
      const animation = animationStateService.getCurrentAnimation();

      expect(animation).toBeNull();
    });

    it('should return set animation', () => {
      animationStateService.setCurrentAnimation('spin');

      expect(animationStateService.getCurrentAnimation()).toBe('spin');
    });
  });

  describe('getAnimationSpeed', () => {
    it('should return default speed of 2.0', () => {
      const speed = animationStateService.getAnimationSpeed();

      expect(speed).toBe(2.0);
    });

    it('should return set speed', () => {
      animationStateService.setAnimationSpeed(1.5);

      expect(animationStateService.getAnimationSpeed()).toBe(1.5);
    });
  });

  describe('setAnimationQueue', () => {
    it('should set animation queue', () => {
      const animations: AnimationTrigger[] = [
        { name: 'spin' },
        { name: 'squat' },
        { name: 'jump' },
      ];

      animationStateService.setAnimationQueue(animations);

      expect(animationStateService.getAnimationQueue()).toEqual(animations);
    });

    it('should create a copy of the queue', () => {
      const animations: AnimationTrigger[] = [{ name: 'spin' }];
      animationStateService.setAnimationQueue(animations);

      // Modify original array
      animations.push({ name: 'squat' });

      // Service should not be affected
      expect(animationStateService.getAnimationQueue()).toEqual([{ name: 'spin' }]);
    });
  });

  describe('addToQueue', () => {
    it('should add animation to queue', () => {
      const animation: AnimationTrigger = { name: 'spin' };

      animationStateService.addToQueue(animation);

      expect(animationStateService.getAnimationQueue()).toEqual([animation]);
    });

    it('should add multiple animations to queue', () => {
      const animation1: AnimationTrigger = { name: 'spin' };
      const animation2: AnimationTrigger = { name: 'squat' };

      animationStateService.addToQueue(animation1);
      animationStateService.addToQueue(animation2);

      expect(animationStateService.getAnimationQueue()).toEqual([animation1, animation2]);
    });
  });

  describe('removeFromQueue', () => {
    it('should remove animation from queue', () => {
      const animation1: AnimationTrigger = { name: 'spin' };
      const animation2: AnimationTrigger = { name: 'squat' };

      animationStateService.addToQueue(animation1);
      animationStateService.addToQueue(animation2);
      animationStateService.removeFromQueue(animation1);

      expect(animationStateService.getAnimationQueue()).toEqual([animation2]);
    });

    it('should not affect queue if animation not found', () => {
      const animation: AnimationTrigger = { name: 'spin' };

      animationStateService.addToQueue(animation);
      animationStateService.removeFromQueue({ name: 'squat' });

      expect(animationStateService.getAnimationQueue()).toEqual([animation]);
    });

    it('should remove all matching animations by name', () => {
      const animation1: AnimationTrigger = { name: 'spin', delay: 100 };
      const animation2: AnimationTrigger = { name: 'spin', delay: 200 };
      const animation3: AnimationTrigger = { name: 'squat' };

      animationStateService.addToQueue(animation1);
      animationStateService.addToQueue(animation2);
      animationStateService.addToQueue(animation3);
      animationStateService.removeFromQueue({ name: 'spin' });

      expect(animationStateService.getAnimationQueue()).toEqual([animation3]);
    });
  });

  describe('setCurrentAnimation', () => {
    it('should set current animation', () => {
      animationStateService.setCurrentAnimation('spin');

      expect(animationStateService.getCurrentAnimation()).toBe('spin');
    });

    it('should allow setting to null', () => {
      animationStateService.setCurrentAnimation('spin');
      animationStateService.setCurrentAnimation(null);

      expect(animationStateService.getCurrentAnimation()).toBeNull();
    });

    it('should overwrite previous animation', () => {
      animationStateService.setCurrentAnimation('spin');
      animationStateService.setCurrentAnimation('squat');

      expect(animationStateService.getCurrentAnimation()).toBe('squat');
    });
  });

  describe('setAnimationSpeed', () => {
    it('should set animation speed', () => {
      animationStateService.setAnimationSpeed(1.5);

      expect(animationStateService.getAnimationSpeed()).toBe(1.5);
    });

    it('should allow setting to 0', () => {
      animationStateService.setAnimationSpeed(0);

      expect(animationStateService.getAnimationSpeed()).toBe(0);
    });

    it('should overwrite previous speed', () => {
      animationStateService.setAnimationSpeed(1.5);
      animationStateService.setAnimationSpeed(3.0);

      expect(animationStateService.getAnimationSpeed()).toBe(3.0);
    });
  });

  describe('clearQueue', () => {
    it('should clear animation queue', () => {
      const animations: AnimationTrigger[] = [
        { name: 'spin' },
        { name: 'squat' },
      ];

      animationStateService.setAnimationQueue(animations);
      animationStateService.clearQueue();

      expect(animationStateService.getAnimationQueue()).toEqual([]);
    });

    it('should not affect current animation', () => {
      animationStateService.setCurrentAnimation('spin');
      animationStateService.addToQueue({ name: 'squat' });
      animationStateService.clearQueue();

      expect(animationStateService.getCurrentAnimation()).toBe('spin');
    });

    it('should not affect animation speed', () => {
      animationStateService.setAnimationSpeed(1.5);
      animationStateService.addToQueue({ name: 'spin' });
      animationStateService.clearQueue();

      expect(animationStateService.getAnimationSpeed()).toBe(1.5);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      const animations: AnimationTrigger[] = [{ name: 'spin' }];

      animationStateService.setAnimationQueue(animations);
      animationStateService.setCurrentAnimation('squat');
      animationStateService.setAnimationSpeed(1.5);

      animationStateService.reset();

      const state = animationStateService.getState();
      expect(state).toEqual({
        animationQueue: [],
        currentAnimation: null,
        animationSpeed: 2.0,
      });
    });

    it('should reset after multiple operations', () => {
      const animations: AnimationTrigger[] = [
        { name: 'spin' },
        { name: 'squat' },
        { name: 'jump' },
      ];

      animationStateService.addToQueue(animations[0]);
      animationStateService.addToQueue(animations[1]);
      animationStateService.setCurrentAnimation(animations[0].name);
      animationStateService.setAnimationSpeed(3.0);
      animationStateService.addToQueue(animations[2]);
      animationStateService.removeFromQueue(animations[1]);
      animationStateService.setCurrentAnimation(null);

      animationStateService.reset();

      expect(animationStateService.getState()).toEqual({
        animationQueue: [],
        currentAnimation: null,
        animationSpeed: 2.0,
      });
    });
  });
});
