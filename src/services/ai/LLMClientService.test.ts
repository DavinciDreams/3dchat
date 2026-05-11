/**
 * Unit tests for LLMClientService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LLMClientService } from './LLMClientService';

describe('LLMClientService', () => {
  let service: LLMClientService;

  beforeEach(() => {
    // The OpenRouter key now lives server-side in the /api/openrouter proxy,
    // so the client no longer reads VITE_OPENROUTER_API_KEY.
    service = new LLMClientService();
  });

  describe('getSystemPrompt', () => {
    it('should return system prompt', () => {
      const prompt = service.getSystemPrompt();

      expect(prompt).toContain('animation director');
      expect(prompt).toContain('Available animations by category');
      expect(prompt).toContain('Rules:');
    });
  });

  describe('getToolDefinition', () => {
    it('should return tool definition', () => {
      const toolDef = service.getToolDefinition();

      expect(toolDef.type).toBe('function');
      expect(toolDef.function.name).toBe('trigger_animations');
      expect(toolDef.function.description).toBeDefined();
      expect(toolDef.function.parameters).toBeDefined();
    });
  });

  describe('getModel', () => {
    it('should return model name from environment or default', () => {
      const model = service.getModel();

      // Model comes from VITE_ANIMATION_JUDGE_MODEL env var or defaults to 'openai/gpt-4o-mini'
      // In test environment, it will use the default since import.meta.env is read-only
      expect(model).toBeTruthy();
      expect(typeof model).toBe('string');
    });
  });

  describe('isConfigured', () => {
    it('always returns true (key is held server-side)', () => {
      expect(service.isConfigured()).toBe(true);
    });
  });
});
