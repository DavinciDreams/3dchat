/**
 * VRMA Cache Service Tests
 *
 * Unit tests for VRMACacheService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VRMACacheService } from './VRMACacheService';
import type { IVMACacheService } from '../../di/ServiceInterfaces';

describe('VRMACacheService', () => {
  let service: IVMACacheService;

  beforeEach(() => {
    service = new VRMACacheService();
  });

  describe('getAnimation', () => {
    it('should return cached animation', () => {
      const animation = {
        name: 'test',
        clip: { mockClip: 'test' },
        vrmAnimation: { mockData: 'test' },
      };
      service.setAnimation('test', animation);

      const result = service.getAnimation('test');
      expect(result).toEqual(animation);
    });

    it('should return undefined for non-existent animation', () => {
      const result = service.getAnimation('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('setAnimation', () => {
    it('should cache an animation', () => {
      const animation = {
        name: 'test',
        clip: { mockClip: 'test' },
        vrmAnimation: { mockData: 'test' },
      };
      service.setAnimation('test', animation);

      const result = service.getAnimation('test');
      expect(result).toEqual(animation);
    });
  });

  describe('hasAnimation', () => {
    it('should return true for cached animation', () => {
      const animation = {
        name: 'test',
        clip: { mockClip: 'test' },
        vrmAnimation: { mockData: 'test' },
      };
      service.setAnimation('test', animation);

      expect(service.hasAnimation('test')).toBe(true);
    });

    it('should return false for non-existent animation', () => {
      expect(service.hasAnimation('nonexistent')).toBe(false);
    });
  });

  describe('getRetargetedClip', () => {
    it('should return cached retargeted clip', () => {
      const clip = { mockClip: 'retargeted' };
      service.setRetargetedClip('model1', 'test', 'upper_body', clip);

      const result = service.getRetargetedClip('model1', 'test', 'upper_body');
      expect(result).toEqual(clip);
    });

    it('should return undefined for non-existent clip', () => {
      const result = service.getRetargetedClip('model1', 'test', 'upper_body');
      expect(result).toBeUndefined();
    });
  });

  describe('setRetargetedClip', () => {
    it('should cache a retargeted clip', () => {
      const clip = { mockClip: 'retargeted' };
      service.setRetargetedClip('model1', 'test', 'upper_body', clip);

      const result = service.getRetargetedClip('model1', 'test', 'upper_body');
      expect(result).toEqual(clip);
    });
  });

  describe('hasRetargetedClip', () => {
    it('should return true for cached clip', () => {
      const clip = { mockClip: 'retargeted' };
      service.setRetargetedClip('model1', 'test', 'upper_body', clip);

      expect(service.hasRetargetedClip('model1', 'test', 'upper_body')).toBe(true);
    });

    it('should return false for non-existent clip', () => {
      expect(service.hasRetargetedClip('model1', 'test', 'nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all caches', () => {
      const animation = {
        name: 'test',
        clip: { mockClip: 'test' },
        vrmAnimation: { mockData: 'test' },
      };
      const clip = { mockClip: 'retargeted' };
      service.setAnimation('test', animation);
      service.setRetargetedClip('model1', 'test', 'upper_body', clip);

      service.clear();

      expect(service.getAnimation('test')).toBeUndefined();
      expect(service.getRetargetedClip('model1', 'test', 'upper_body')).toBeUndefined();
      expect(service.hasAnimation('test')).toBe(false);
      expect(service.hasRetargetedClip('model1', 'test', 'upper_body')).toBe(false);
    });
  });

  describe('getAnimationCount', () => {
    it('should return count of cached animations', () => {
      const animation = {
        name: 'test',
        clip: { mockClip: 'test' },
        vrmAnimation: { mockData: 'test' },
      };
      service.setAnimation('test', animation);

      expect(service.getAnimationCount()).toBe(1);
    });
  });

  describe('getAnimationNames', () => {
    it('should return all cached animation names', () => {
      const animation = {
        name: 'test',
        clip: { mockClip: 'test' },
        vrmAnimation: { mockData: 'test' },
      };
      service.setAnimation('test', animation);

      expect(service.getAnimationNames()).toEqual(['test']);
    });
  });

  describe('clearRetargetedClipsForModel', () => {
    it('should clear retargeted clips for a model', () => {
      const clip = { mockClip: 'retargeted' };
      service.setRetargetedClip('model1', 'test', 'upper_body', clip);
      service.setRetargetedClip('model1', 'test2', 'full', clip);

      service.clearRetargetedClipsForModel('model1');

      expect(service.hasRetargetedClip('model1', 'test', 'upper_body')).toBe(false);
      expect(service.hasRetargetedClip('model1', 'test2', 'full')).toBe(false);
    });
  });
});
