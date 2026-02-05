/**
 * Unit tests for AnimationSelectionService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnimationSelectionService } from './AnimationSelectionService';

describe('AnimationSelectionService', () => {
  let service: AnimationSelectionService;

  beforeEach(() => {
    service = new AnimationSelectionService();
  });

  describe('parseLLMResponse', () => {
    it('should parse valid animations from LLM response', () => {
      const toolCalls = [{
        function: {
          name: 'trigger_animations',
          arguments: JSON.stringify({
            animations: [
              { name: 'peace', delay: 0 },
              { name: 'spin', delay: 1 }
            ],
            reasoning: 'Test reasoning'
          })
        }
      }];

      const result = service.parseLLMResponse(toolCalls);

      expect(result).toEqual({
        animations: [
          { name: 'peace', delay: 0 },
          { name: 'spin', delay: 1 }
        ],
        reasoning: 'Test reasoning'
      });
    });

    it('should filter out invalid animations', () => {
      const toolCalls = [{
        function: {
          name: 'trigger_animations',
          arguments: JSON.stringify({
            animations: [
              { name: 'peace', delay: 0 },
              { name: 'invalidAnimation', delay: 0 }  // Invalid animation
            ],
            reasoning: 'Test reasoning'
          })
        }
      }];

      const result = service.parseLLMResponse(toolCalls);

      expect(result.animations).toHaveLength(1); // Only peace should be valid
      expect(result.animations[0].name).toBe('peace');
    });

    it('should return empty judgment when no tool calls', () => {
      const result = service.parseLLMResponse([]);

      expect(result).toEqual({
        animations: [],
        reasoning: 'No animation decision made'
      });
    });
  });

  describe('suggestLayer', () => {
    it('should suggest full_body for full body animations', () => {
      const layer = service.suggestLayer('spin');
      expect(layer).toBe('full_body');
    });

    it('should suggest upper_body for upper body animations', () => {
      const layer = service.suggestLayer('peace');
      expect(layer).toBe('upper_body');
    });

    it('should suggest lower_body for lower body animations', () => {
      const layer = service.suggestLayer('squat');
      expect(layer).toBe('lower_body');
    });

    it('should suggest idle for idle animations', () => {
      const layer = service.suggestLayer('idle');
      expect(layer).toBe('idle');
    });

    it('should suggest gesture for gesture animations', () => {
      const layer = service.suggestLayer('headNod');
      expect(layer).toBe('gesture');
    });

    it('should suggest gesture as default for unknown animations', () => {
      const layer = service.suggestLayer('unknownAnimation');
      expect(layer).toBe('gesture');
    });
  });

  describe('suggestTiming', () => {
    it('should suggest early for greetings', () => {
      const timing = service.suggestTiming('Hello, how are you?');
      expect(timing).toBe('early');
    });

    it('should suggest late for conclusions', () => {
      const timing = service.suggestTiming('Finally, in conclusion');
      expect(timing).toBe('late');
    });

    it('should suggest middle for meanwhile/additionally', () => {
      const timing = service.suggestTiming('Meanwhile, check this out');
      expect(timing).toBe('middle');
    });

    it('should suggest distributed by default', () => {
      const timing = service.suggestTiming('This is a regular response');
      expect(timing).toBe('distributed');
    });
  });

  describe('createEnhancedJudgment', () => {
    it('should create enhanced judgment with timing and layer', () => {
      const baseJudgment = {
        animations: [{ name: 'peace', delay: 0 }],
        reasoning: 'Test reasoning'
      };

      const result = service.createEnhancedJudgment(baseJudgment, 'Hello, how are you?');

      expect(result).toEqual({
        animations: [{ name: 'peace', delay: 0 }],
        reasoning: 'Test reasoning',
        suggestedTiming: 'early',
        suggestedLayer: 'upper_body',
        interruptible: true
      });
    });
  });

  describe('isValidAnimation', () => {
    it('should return true for valid animations', () => {
      expect(service.isValidAnimation('peace')).toBe(true);
    });

    it('should return false for invalid animations', () => {
      expect(service.isValidAnimation('invalidAnimation')).toBe(false);
    });
  });

  describe('filterValidAnimations', () => {
    it('should filter out invalid animations', () => {
      const animations = [
        { name: 'peace', delay: 0 },
        { name: 'invalidAnimation', delay: 0 },
        { name: 'spin', delay: 1 }
      ];

      const result = service.filterValidAnimations(animations);

      expect(result).toHaveLength(2); // peace and spin only
      expect(result[0].name).toBe('peace');
      expect(result[1].name).toBe('spin');
    });
  });
});
