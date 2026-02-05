/**
 * Animation Judge Performance Tests
 *
 * Tests for animation judge performance improvements including:
 * 1. Judgment Caching (AnimationJudgeCache)
 * 2. Optimized prompt
 * 3. Simplified judgment flow
 * 4. Performance improvements
 * 5. Edge cases
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AnimationJudgeCache, getAnimationJudgeCache } from '../src/services/animationJudgeService/AnimationJudgeCache';
import type { AnimationJudgment } from '../src/types';

describe('Animation Judge Performance Tests', () => {
  let cache: AnimationJudgeCache;

  beforeEach(() => {
    // Clear singleton instance
    (global as any).cacheInstance = null;
    cache = new AnimationJudgeCache(10, 1000); // Small cache for testing, 1 second TTL
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('1. CACHING FUNCTIONALITY', () => {
    describe('Cache Key Generation', () => {
      it('should generate consistent keys for same input', () => {
        const key1 = (cache as any).generateKey('Hello', 'Hi there!');
        const key2 = (cache as any).generateKey('Hello', 'Hi there!');
        expect(key1).toBe(key2);
      });

      it('should generate different keys for different input', () => {
        const key1 = (cache as any).generateKey('Hello', 'Hi there!');
        const key2 = (cache as any).generateKey('Goodbye', 'Bye!');
        expect(key1).not.toBe(key2);
      });

      it('should handle empty strings', () => {
        const key = (cache as any).generateKey('', '');
        expect(key).toBeTruthy();
        expect(typeof key).toBe('string');
      });

      it('should handle special characters', () => {
        const key = (cache as any).generateKey('Hello! @#$%', 'Response: <test>');
        expect(key).toBeTruthy();
        expect(typeof key).toBe('string');
      });

      it('should handle very long messages', () => {
        const longMessage = 'a'.repeat(10000);
        const key = (cache as any).generateKey(longMessage, longMessage);
        expect(key).toBeTruthy();
        expect(typeof key).toBe('string');
      });
    });

    describe('Cache Get/Set Operations', () => {
      it('should store and retrieve judgments', () => {
        const judgment: AnimationJudgment = {
          animations: [{ name: 'spin', delay: 0 }],
          reasoning: 'Test reasoning'
        };

        cache.set('User message', 'AI response', judgment);
        const retrieved = cache.get('User message', 'AI response');

        expect(retrieved).toEqual(judgment);
      });

      it('should return undefined for non-existent keys', () => {
        const retrieved = cache.get('Non-existent', 'Non-existent');
        expect(retrieved).toBeUndefined();
      });

      it('should track misses for non-existent keys', () => {
        cache.get('Non-existent', 'Non-existent');
        const stats = cache.getStats();
        expect(stats.misses).toBe(1);
        expect(stats.hits).toBe(0);
      });

      it('should track hits for existing keys', () => {
        const judgment: AnimationJudgment = {
          animations: [{ name: 'spin', delay: 0 }],
          reasoning: 'Test reasoning'
        };

        cache.set('User message', 'AI response', judgment);
        cache.get('User message', 'AI response');

        const stats = cache.getStats();
        expect(stats.hits).toBe(1);
        expect(stats.misses).toBe(0);
      });

      it('should update cache size correctly', () => {
        const judgment: AnimationJudgment = {
          animations: [{ name: 'spin', delay: 0 }],
          reasoning: 'Test reasoning'
        };

        cache.set('User message', 'AI response', judgment);
        const stats = cache.getStats();
        expect(stats.size).toBe(1);
      });

      it('should evict oldest entry when at capacity', () => {
        const judgment: AnimationJudgment = {
          animations: [{ name: 'spin', delay: 0 }],
          reasoning: 'Test reasoning'
        };

        // Fill cache to capacity
        for (let i = 0; i < 10; i++) {
          cache.set(`User ${i}`, `AI ${i}`, judgment);
        }

        expect(cache.getStats().size).toBe(10);

        // Add one more - should evict first
        cache.set('User 10', 'AI 10', judgment);

        expect(cache.getStats().size).toBe(10);
        expect(cache.get('User 0', 'AI 0')).toBeUndefined();
        expect(cache.get('User 1', 'AI 1')).toBeDefined();
      });
    });

    describe('TTL (Time To Live) Expiration', () => {
      it('should expire entries after TTL', async () => {
        const judgment: AnimationJudgment = {
          animations: [{ name: 'spin', delay: 0 }],
          reasoning: 'Test reasoning'
        };

        cache.set('User message', 'AI response', judgment);

        // Wait for TTL to expire (1 second)
        await new Promise(resolve => setTimeout(resolve, 1100));

        const retrieved = cache.get('User message', 'AI response');
        expect(retrieved).toBeUndefined();
      });

      it('should track expired entries as misses', async () => {
        const judgment: AnimationJudgment = {
          animations: [{ name: 'spin', delay: 0 }],
          reasoning: 'Test reasoning'
        };

        cache.set('User message', 'AI response', judgment);

        // Wait for TTL to expire
        await new Promise(resolve => setTimeout(resolve, 1100));

        cache.get('User message', 'AI response');

        const stats = cache.getStats();
        expect(stats.misses).toBe(1);
      });

      it('should not expire entries before TTL', async () => {
        const judgment: AnimationJudgment = {
          animations: [{ name: 'spin', delay: 0 }],
          reasoning: 'Test reasoning'
        };

        cache.set('User message', 'AI response', judgment);

        // Wait less than TTL
        await new Promise(resolve => setTimeout(resolve, 500));

        const retrieved = cache.get('User message', 'AI response');
        expect(retrieved).toEqual(judgment);
      });

      it('should clean up expired entries via cleanupExpired', async () => {
        const judgment: AnimationJudgment = {
          animations: [{ name: 'spin', delay: 0 }],
          reasoning: 'Test reasoning'
        };

        // Add multiple entries
        cache.set('User 1', 'AI 1', judgment);
        cache.set('User 2', 'AI 2', judgment);

        // Wait for TTL to expire
        await new Promise(resolve => setTimeout(resolve, 1100));

        // Add a fresh entry
        cache.set('User 3', 'AI 3', judgment);

        const removed = cache.cleanupExpired();
        expect(removed).toBe(2);
        expect(cache.getStats().size).toBe(1);
      });
    });

    describe('Thread-Safe Concurrent Request Handling', () => {
      it('should handle concurrent requests for same key', async () => {
        const judgment: AnimationJudgment = {
          animations: [{ name: 'spin', delay: 0 }],
          reasoning: 'Test reasoning'
        };

        let fetchCount = 0;
        const fetchFn = async (): Promise<AnimationJudgment> => {
          fetchCount++;
          await new Promise(resolve => setTimeout(resolve, 100));
          return judgment;
        };

        // Make concurrent requests for same key
        const results = await Promise.all([
          cache.getOrSet('User message', 'AI response', fetchFn),
          cache.getOrSet('User message', 'AI response', fetchFn),
          cache.getOrSet('User message', 'AI response', fetchFn),
        ]);

        // Only one fetch should have been called
        expect(fetchCount).toBe(1);

        // All results should be same
        expect(results[0]).toEqual(judgment);
        expect(results[1]).toEqual(judgment);
        expect(results[2]).toEqual(judgment);
      });

      it('should handle concurrent requests for different keys', async () => {
        const judgment: AnimationJudgment = {
          animations: [{ name: 'spin', delay: 0 }],
          reasoning: 'Test reasoning'
        };

        let fetchCount = 0;
        const fetchFn = async (): Promise<AnimationJudgment> => {
          fetchCount++;
          await new Promise(resolve => setTimeout(resolve, 100));
          return judgment;
        };

        // Make concurrent requests for different keys
        await Promise.all([
          cache.getOrSet('User 1', 'AI 1', fetchFn),
          cache.getOrSet('User 2', 'AI 2', fetchFn),
          cache.getOrSet('User 3', 'AI 3', fetchFn),
        ]);

        // Three fetches should have been called
        expect(fetchCount).toBe(3);
      });

      it('should use cached result for subsequent requests', async () => {
        const judgment: AnimationJudgment = {
          animations: [{ name: 'spin', delay: 0 }],
          reasoning: 'Test reasoning'
        };

        let fetchCount = 0;
        const fetchFn = async (): Promise<AnimationJudgment> => {
          fetchCount++;
          return judgment;
        };

        // First request
        await cache.getOrSet('User message', 'AI response', fetchFn);
        expect(fetchCount).toBe(1);

        // Second request (should use cache)
        await cache.getOrSet('User message', 'AI response', fetchFn);
        expect(fetchCount).toBe(1);
      });
    });

    describe('Cache Statistics', () => {
      it('should calculate hit rate correctly', () => {
        const judgment: AnimationJudgment = {
          animations: [{ name: 'spin', delay: 0 }],
          reasoning: 'Test reasoning'
        };

        cache.set('User 1', 'AI 1', judgment);
        cache.set('User 2', 'AI 2', judgment);

        cache.get('User 1', 'AI 1'); // Hit
        cache.get('User 2', 'AI 2'); // Hit
        cache.get('User 3', 'AI 3'); // Miss

        const stats = cache.getStats();
        expect(stats.hits).toBe(2);
        expect(stats.misses).toBe(1);
        expect(stats.hitRate).toBe(66.67);
      });

      it('should return 0% hit rate when no requests', () => {
        const stats = cache.getStats();
        expect(stats.hitRate).toBe(0);
      });

      it('should return 100% hit rate when all requests hit', () => {
        const judgment: AnimationJudgment = {
          animations: [{ name: 'spin', delay: 0 }],
          reasoning: 'Test reasoning'
        };

        cache.set('User 1', 'AI 1', judgment);
        cache.get('User 1', 'AI 1');

        const stats = cache.getStats();
        expect(stats.hitRate).toBe(100);
      });

      it('should track maxSize correctly', () => {
        const stats = cache.getStats();
        expect(stats.maxSize).toBe(10);
      });
    });

    describe('Cache Clear', () => {
      it('should clear all entries', () => {
        const judgment: AnimationJudgment = {
          animations: [{ name: 'spin', delay: 0 }],
          reasoning: 'Test reasoning'
        };

        cache.set('User 1', 'AI 1', judgment);
        cache.set('User 2', 'AI 2', judgment);

        expect(cache.getStats().size).toBe(2);

        cache.clear();

        expect(cache.getStats().size).toBe(0);
        expect(cache.get('User 1', 'AI 1')).toBeUndefined();
      });

      it('should reset statistics after clear', () => {
        const judgment: AnimationJudgment = {
          animations: [{ name: 'spin', delay: 0 }],
          reasoning: 'Test reasoning'
        };

        cache.set('User 1', 'AI 1', judgment);
        cache.get('User 1', 'AI 1');
        cache.get('User 2', 'AI 2');

        expect(cache.getStats().hits).toBe(1);
        expect(cache.getStats().misses).toBe(1);

        cache.clear();

        expect(cache.getStats().hits).toBe(0);
        expect(cache.getStats().misses).toBe(0);
      });
    });

    describe('Singleton Instance', () => {
      it('should return same instance on subsequent calls', () => {
        const instance1 = getAnimationJudgeCache();
        const instance2 = getAnimationJudgeCache();

        expect(instance1).toBe(instance2);
      });

      it('should use default parameters when not specified', () => {
        const instance = getAnimationJudgeCache();
        const stats = instance.getStats();

        expect(stats.maxSize).toBe(200);
      });

      it('should use custom parameters when specified', () => {
        const instance = getAnimationJudgeCache(50, 5000);
        const stats = instance.getStats();

        expect(stats.maxSize).toBe(50);
      });
    });
  });

  describe('2. OPTIMIZED PROMPT VERIFICATION', () => {
    it('should verify LLMClientService has optimized prompt', () => {
      // Import LLMClientService to check its prompt
      const { LLMClientService } = require('../src/services/ai/LLMClientService');
      const llmService = new LLMClientService();

      const systemPrompt = llmService.getSystemPrompt();

      // The optimized prompt should be much shorter
      const promptLines = systemPrompt.split('\n').length;

      // Should be around 37 lines (optimized), not 234 (original)
      expect(promptLines).toBeLessThan(50);
      expect(promptLines).toBeGreaterThan(30);

      // Should contain essential elements
      expect(systemPrompt).toContain('animation director');
      expect(systemPrompt).toContain('Available animations');
      expect(systemPrompt).toContain('Rules');
    });

    it('should verify tool definition is correct', () => {
      const { LLMClientService } = require('../src/services/ai/LLMClientService');
      const llmService = new LLMClientService();

      const toolDef = llmService.getToolDefinition();

      expect(toolDef).toBeDefined();
      expect(toolDef.type).toBe('function');
      expect(toolDef.function.name).toBe('trigger_animations');
      expect(toolDef.function.parameters.properties.animations).toBeDefined();
      expect(toolDef.function.parameters.properties.reasoning).toBeDefined();
    });
  });

  describe('3. SIMPLIFIED JUDGMENT FLOW', () => {
    it('should verify judgment is called once at stream completion', () => {
      // Read ChatInterface.tsx to verify simplified flow
      const fs = require('fs');
      const chatInterfaceCode = fs.readFileSync(
        require('path').join(__dirname, '../src/components/ChatInterface.tsx'),
        'utf-8'
      );

      // Should have hasMadeJudgmentRef for single judgment
      expect(chatInterfaceCode).toContain('hasMadeJudgmentRef');

      // Should judge only when chunk.isComplete is true
      expect(chatInterfaceCode).toContain('if (chunk.isComplete)');

      // Should check hasMadeJudgmentRef before judging
      expect(chatInterfaceCode).toContain('if (!hasMadeJudgmentRef.current');

      // Should NOT have debounced streaming judgment logic
      expect(chatInterfaceCode).not.toContain('debounce');
    });

    it('should verify refs removed for streaming judgment', () => {
      const fs = require('fs');
      const chatInterfaceCode = fs.readFileSync(
        require('path').join(__dirname, '../src/components/ChatInterface.tsx'),
        'utf-8'
      );

      // Should NOT have these refs that were removed
      expect(chatInterfaceCode).not.toContain('streamingJudgmentTimeoutRef');
      expect(chatInterfaceCode).not.toContain('lastJudgmentTextRef');
      expect(chatInterfaceCode).not.toContain('judgmentInProgressRef');
    });

    it('should verify animation queue cancellation is present', () => {
      const fs = require('fs');
      const chatInterfaceCode = fs.readFileSync(
        require('path').join(__dirname, '../src/components/ChatInterface.tsx'),
        'utf-8'
      );

      // Should have activeQueueTimeoutsRef for cancellation
      expect(chatInterfaceCode).toContain('activeQueueTimeoutsRef');

      // Should have cancelActiveQueueTimeouts function
      expect(chatInterfaceCode).toContain('cancelActiveQueueTimeouts');

      // Should call cancelActiveQueueTimeouts before judgment
      expect(chatInterfaceCode).toContain('cancelActiveQueueTimeouts()');
    });
  });

  describe('4. PERFORMANCE IMPROVEMENTS', () => {
    it('should measure cache hit performance', () => {
      const judgment: AnimationJudgment = {
        animations: [{ name: 'spin', delay: 0 }],
        reasoning: 'Test reasoning'
      };

      cache.set('User message', 'AI response', judgment);

      const start = performance.now();
      cache.get('User message', 'AI response');
      const elapsed = performance.now() - start;

      // Cache hit should be very fast (< 1ms)
      expect(elapsed).toBeLessThan(1);
    });

    it('should handle rapid sequential requests', async () => {
      const judgment: AnimationJudgment = {
        animations: [{ name: 'spin', delay: 0 }],
        reasoning: 'Test reasoning'
      };

      const fetchFn = async (): Promise<AnimationJudgment> => {
        return judgment;
      };

      // Make 100 rapid requests
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(cache.getOrSet(`User ${i % 10}`, `AI ${i % 10}`, fetchFn));
      }

      await Promise.all(promises);

      // Should have only called fetchFn 10 times (due to caching)
      const stats = cache.getStats();
      expect(stats.size).toBe(10);
    });

    it('should maintain performance with many cache entries', () => {
      const judgment: AnimationJudgment = {
        animations: [{ name: 'spin', delay: 0 }],
        reasoning: 'Test reasoning'
      };

      // Add 100 entries
      for (let i = 0; i < 100; i++) {
        cache.set(`User ${i}`, `AI ${i}`, judgment);
      }

      const start = performance.now();
      cache.get('User 50', 'AI 50');
      const elapsed = performance.now() - start;

      // Should still be fast even with many entries (< 1ms)
      expect(elapsed).toBeLessThan(1);
    });

    it('should simulate typical conversation flow with caching', async () => {
      const cache = getAnimationJudgeCache(20, 2000);

      const conversations = [
        { user: 'Hello', ai: 'Hi there! How can I help you today?' },
        { user: 'What can you do?', ai: 'I can help you with many things including spinning, dancing, and greeting people.' },
        { user: 'Spin for me', ai: 'Sure! Let me spin for you!' },
        { user: 'Hello', ai: 'Hi there! How can I help you today?' }, // Repeat
        { user: 'Dance', ai: 'Let me show you some dance moves!' },
      ];

      const judgment: AnimationJudgment = {
        animations: [{ name: 'greeting', delay: 0 }],
        reasoning: 'Test reasoning'
      };

      let fetchCount = 0;
      const fetchFn = async (): Promise<AnimationJudgment> => {
        fetchCount++;
        return judgment;
      };

      // Process all conversations
      for (const conv of conversations) {
        await cache.getOrSet(conv.user, conv.ai, fetchFn);
      }

      // Should have only called fetch 4 times (one conversation was repeated)
      expect(fetchCount).toBe(4);

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(4);
    });
  });

  describe('5. EDGE CASES', () => {
    it('should handle empty user message', () => {
      const judgment: AnimationJudgment = {
        animations: [{ name: 'spin', delay: 0 }],
        reasoning: 'Test reasoning'
      };

      cache.set('', 'AI response', judgment);
      const retrieved = cache.get('', 'AI response');

      expect(retrieved).toEqual(judgment);
    });

    it('should handle empty AI response', () => {
      const judgment: AnimationJudgment = {
        animations: [{ name: 'spin', delay: 0 }],
        reasoning: 'Test reasoning'
      };

      cache.set('User message', '', judgment);
      const retrieved = cache.get('User message', '');

      expect(retrieved).toEqual(judgment);
    });

    it('should handle very short messages', () => {
      const judgment: AnimationJudgment = {
        animations: [{ name: 'spin', delay: 0 }],
        reasoning: 'Test reasoning'
      };

      cache.set('Hi', 'Hey', judgment);
      const retrieved = cache.get('Hi', 'Hey');

      expect(retrieved).toEqual(judgment);
    });

    it('should handle very long messages', () => {
      const judgment: AnimationJudgment = {
        animations: [{ name: 'spin', delay: 0 }],
        reasoning: 'Test reasoning'
      };

      const longMessage = 'a'.repeat(100000);
      cache.set(longMessage, longMessage, judgment);
      const retrieved = cache.get(longMessage, longMessage);

      expect(retrieved).toEqual(judgment);
    });

    it('should handle messages with special characters', () => {
      const judgment: AnimationJudgment = {
        animations: [{ name: 'spin', delay: 0 }],
        reasoning: 'Test reasoning'
      };

      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      cache.set(specialChars, specialChars, judgment);
      const retrieved = cache.get(specialChars, specialChars);

      expect(retrieved).toEqual(judgment);
    });

    it('should handle messages with Unicode characters', () => {
      const judgment: AnimationJudgment = {
        animations: [{ name: 'spin', delay: 0 }],
        reasoning: 'Test reasoning'
      };

      const unicode = 'Hello 世界 🌍 Привет مرحبا';
      cache.set(unicode, unicode, judgment);
      const retrieved = cache.get(unicode, unicode);

      expect(retrieved).toEqual(judgment);
    });

    it('should handle messages with newlines and tabs', () => {
      const judgment: AnimationJudgment = {
        animations: [{ name: 'spin', delay: 0 }],
        reasoning: 'Test reasoning'
      };

      const withWhitespace = 'Line 1\nLine 2\tTabbed';
      cache.set(withWhitespace, withWhitespace, judgment);
      const retrieved = cache.get(withWhitespace, withWhitespace);

      expect(retrieved).toEqual(judgment);
    });

    it('should handle empty animations array', () => {
      const judgment: AnimationJudgment = {
        animations: [],
        reasoning: 'No animation fits'
      };

      cache.set('User message', 'AI response', judgment);
      const retrieved = cache.get('User message', 'AI response');

      expect(retrieved).toEqual(judgment);
    });

    it('should handle multiple animations', () => {
      const judgment: AnimationJudgment = {
        animations: [
          { name: 'greeting', delay: 0 },
          { name: 'spin', delay: 2 },
          { name: 'peace', delay: 4 }
        ],
        reasoning: 'Multiple animations'
      };

      cache.set('User message', 'AI response', judgment);
      const retrieved = cache.get('User message', 'AI response');

      expect(retrieved).toEqual(judgment);
    });

    it('should handle rapid repeated requests', async () => {
      const judgment: AnimationJudgment = {
        animations: [{ name: 'spin', delay: 0 }],
        reasoning: 'Test reasoning'
      };

      let fetchCount = 0;
      const fetchFn = async (): Promise<AnimationJudgment> => {
        fetchCount++;
        await new Promise(resolve => setTimeout(resolve, 10));
        return judgment;
      };

      // Make 10 rapid requests for same key
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(cache.getOrSet('User message', 'AI response', fetchFn));
      }

      await Promise.all(promises);

      // Only one fetch should have been called
      expect(fetchCount).toBe(1);
    });
  });

  describe('INTEGRATION TESTS', () => {
    it('should work with real-world animation judgments', async () => {
      const cache = getAnimationJudgeCache(10, 2000);

      const judgment: AnimationJudgment = {
        animations: [
          { name: 'greeting', delay: 0 },
          { name: 'waving', delay: 1.5 }
        ],
        reasoning: 'User said hello, so avatar should greet and wave'
      };

      // Simulate real usage pattern
      let fetchCount = 0;
      const fetchFn = async (): Promise<AnimationJudgment> => {
        fetchCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
        return judgment;
      };

      // First request - should call fetch
      const result1 = await cache.getOrSet('Hello', 'Hi there! How can I help you today?', fetchFn);
      expect(fetchCount).toBe(1);
      expect(result1).toEqual(judgment);

      // Second request - should use cache
      const result2 = await cache.getOrSet('Hello', 'Hi there! How can I help you today?', fetchFn);
      expect(fetchCount).toBe(1);
      expect(result2).toEqual(judgment);

      // Different request - should call fetch
      const result3 = await cache.getOrSet('Goodbye', 'Goodbye! Have a great day!', fetchFn);
      expect(fetchCount).toBe(2);
      expect(result3).toEqual(judgment);

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(33.33);
    });

    it('should verify judgeAnimations uses cache', () => {
      const fs = require('fs');
      const judgeServiceCode = fs.readFileSync(
        require('path').join(__dirname, '../src/services/animationJudgeService.ts'),
        'utf-8'
      );

      // Should import getAnimationJudgeCache
      expect(judgeServiceCode).toContain('getAnimationJudgeCache');

      // Should use cache.getOrSet
      expect(judgeServiceCode).toContain('cache.getOrSet');

      // Should expose cache stats functions
      expect(judgeServiceCode).toContain('getAnimationJudgeCacheStats');
      expect(judgeServiceCode).toContain('logAnimationJudgeCacheStats');
      expect(judgeServiceCode).toContain('clearAnimationJudgeCache');
    });
  });
});
