/**
 * Unit tests for AIService
 * 
 * Phase 6: Tests for aiService without store dependencies.
 * The service now returns data instead of manipulating store directly.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIService } from './aiService';
import type { ChatMessage, AIStateChanges } from '../di/ServiceInterfaces';

describe('AIService', () => {
  let service: AIService;

  beforeEach(() => {
    service = new AIService();
  });

  describe('getResponse', () => {
    it('should return AI response with state changes', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' }
      ];

      const result = await service.getResponse('Test input', messages);

      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe('string');
      expect(result.stateChanges).toBeDefined();
      expect(result.stateChanges.isProcessing).toBe(false);
      expect(result.stateChanges.emotion).toBe('happy');
    });

    it('should return error state changes on API error', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' }
      ];

      // Mock axios to throw error
      const mockPost = vi.fn().mockRejectedValue(new Error('API error'));
      vi.doMock('axios').post = mockPost;

      const result = await service.getResponse('Test input', messages);

      expect(result.content).toBe('');
      expect(result.stateChanges).toBeDefined();
      expect(result.stateChanges.isProcessing).toBe(false);
      expect(result.stateChanges.emotion).toBe('neutral');
    });

    it('should handle empty messages array', async () => {
      const result = await service.getResponse('Test input', []);

      expect(result.content).toBeDefined();
      expect(result.stateChanges).toBeDefined();
    });
  });

  describe('streamResponse', () => {
    it('should stream AI response with state changes', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' }
      ];

      const onChunkMock = vi.fn();
      const stateChangesPromise = service.streamResponse('Test input', messages, {
        onChunk: onChunkMock
      });

      const stateChanges = await stateChangesPromise;

      expect(stateChanges).toBeDefined();
      expect(stateChanges.isProcessing).toBe(false);
      expect(stateChanges.emotion).toBe('happy');
    });

    it('should call onChunk with content', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' }
      ];

      const onChunkMock = vi.fn();

      // Mock fetch to return successful response
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"}}]') })
          .mockResolvedValueOnce({ done: true, value: null })
      };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader
        }
      } as any);

      await service.streamResponse('Test input', messages, {
        onChunk: onChunkMock
      });

      expect(onChunkMock).toHaveBeenCalled();
      expect(onChunkMock).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Hello',
          isComplete: false
        })
      );
    });

    it('should call onChunk with completion when done', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' }
      ];

      const onChunkMock = vi.fn();

      // Mock fetch to return successful response with [DONE]
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"}}]') })
          .mockResolvedValueOnce({ done: true, value: new TextEncoder().encode('data: [DONE]') })
      };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader
        }
      } as any);

      await service.streamResponse('Test input', messages, {
        onChunk: onChunkMock
      });

      expect(onChunkMock).toHaveBeenCalledWith(
        expect.objectContaining({
          content: '',
          isComplete: true
        })
      );
    });

    it('should return error state changes on network error', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' }
      ];

      const onErrorMock = vi.fn();

      // Mock fetch to return error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const stateChanges = await service.streamResponse('Test input', messages, {
        onChunk: vi.fn(),
        onError: onErrorMock
      });

      expect(stateChanges).toBeDefined();
      expect(stateChanges.isProcessing).toBe(false);
      expect(stateChanges.emotion).toBe('neutral');
      expect(onErrorMock).toHaveBeenCalled();
    });

    it('should handle fetch HTTP error', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' }
      ];

      const onErrorMock = vi.fn();

      // Mock fetch to return error response
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      } as any);

      const stateChanges = await service.streamResponse('Test input', messages, {
        onChunk: vi.fn(),
        onError: onErrorMock
      });

      expect(stateChanges).toBeDefined();
      expect(stateChanges.isProcessing).toBe(false);
      expect(stateChanges.emotion).toBe('neutral');
      expect(onErrorMock).toHaveBeenCalled();
    });
  });

  describe('backward compatibility', () => {
    it('getAIResponse should work with legacy interface', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' }
      ];

      const onChunkMock = vi.fn();

      // Mock fetch to return successful response
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"choices":[{"message":{"content":"Hello"}}]') })
          .mockResolvedValueOnce({ done: true, value: null })
      };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader
        }
      } as any);

      // Mock axios
      const mockPost = vi.fn().mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Hello' } }]
        }
      });

      vi.doMock('axios').post = mockPost;

      const result = await service.getResponse('Test input', messages);

      expect(result.content).toBe('Hello');
      expect(result.stateChanges).toBeDefined();
      expect(result.stateChanges.isProcessing).toBe(false);
      expect(result.stateChanges.emotion).toBe('happy');
    });
  });
});
