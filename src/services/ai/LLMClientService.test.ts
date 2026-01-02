/**
 * Unit tests for LLMClientService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMClientService } from './LLMClientService';

describe('LLMClientService', () => {
  let service: LLMClientService;

  beforeEach(() => {
    // Set up environment variables for testing
    process.env.VITE_OPENROUTER_API_KEY = 'test-api-key';
    process.env.VITE_OPENROUTER_API_URL = 'https://api.openrouter.ai/api/v1/chat/completions';
    process.env.VITE_OPENROUTER_MODEL = 'openai/gpt-4o-mini';

    service = new LLMClientService();
  });

  describe('getSystemPrompt', () => {
    it('should return system prompt', () => {
      const prompt = service.getSystemPrompt();

      expect(prompt).toContain('Animation Judge');
      expect(prompt).toContain('Available Animations');
      expect(prompt).toContain('Animation Layers');
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
    it('should return model name from environment', () => {
      const model = service.getModel();

      expect(model).toBe('openai/gpt-4o-mini');
    });
  });

  describe('isConfigured', () => {
    it('should return true when API key is set', () => {
      const configured = service.isConfigured();

      expect(configured).toBe(true);
    });
  });
});
