/**
 * Unit tests for AIService
 *
 * Phase 6: Tests for aiService without store dependencies.
 * The service now returns data instead of manipulating store directly.
 *
 * Note: Full integration tests with mocked API calls are complex to set up.
 * These tests verify the core structure and interface compliance.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AIService } from '../../services/aiService';
import type { ChatMessage } from '../../di/ServiceInterfaces';

describe('AIService', () => {
  let service: AIService;

  beforeEach(() => {
    service = new AIService();
  });

  describe('service structure', () => {
    it('should have getResponse method', () => {
      expect(service.getResponse).toBeDefined();
      expect(typeof service.getResponse).toBe('function');
    });

    it('should have streamResponse method', () => {
      expect(service.streamResponse).toBeDefined();
      expect(typeof service.streamResponse).toBe('function');
    });
  });

  describe('getResponse', () => {
    it('should return correct structure', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' }
      ];

      const result = await service.getResponse('Test input', messages);

      // Verify the service returns the expected structure
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('stateChanges');
      expect(result.stateChanges).toHaveProperty('isProcessing');
      expect(result.stateChanges).toHaveProperty('emotion');
    });

    it('should handle empty messages array', async () => {
      const result = await service.getResponse('Test input', []);

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('stateChanges');
    });
  });

  describe('streamResponse', () => {
    it('should return correct structure', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' }
      ];

      const onChunkMock = vi.fn();

      const result = await service.streamResponse('Test input', messages, {
        onChunk: onChunkMock
      });

      // Verify the service returns the expected structure
      expect(result).toHaveProperty('stateChanges');
      expect(result.stateChanges).toHaveProperty('isProcessing');
      expect(result.stateChanges).toHaveProperty('emotion');
    });

    it('should call onChunk callback', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' }
      ];

      const onChunkMock = vi.fn();

      await service.streamResponse('Test input', messages, {
        onChunk: onChunkMock
      });

      expect(onChunkMock).toHaveBeenCalled();
    });
  });

  describe('Phase 6 compliance', () => {
    it('should not directly manipulate store', () => {
      // This test verifies that the service doesn't import store
      const serviceCode = AIService.toString();
      
      // The service should not have direct store imports
      expect(serviceCode).not.toContain('useChatStore');
      expect(serviceCode).not.toContain('setState');
    });

    it('should return data objects instead of void', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'Test' }
      ];

      const result = await service.getResponse('Test', messages);

      // Verify return type is object with content and stateChanges
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('stateChanges');
    });
  });
});
