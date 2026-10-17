/**
 * Unit tests for LLMClientService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LLMClientService } from './LLMClientService';

describe('LLMClientService', () => {
  let service: LLMClientService;

  beforeEach(() => {
    // The OpenRouter key now lives server-side in the /api/openrouter proxy,
    // so the client no longer reads VITE_OPENROUTER_API_KEY.
    service = new LLMClientService();
  });

  afterEach(() => vi.restoreAllMocks());

  it('streams browser response frames split across chunks', async () => {
    const data = 'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\ndata: [DONE]\n\n';
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({ start(controller) {
      controller.enqueue(encoder.encode(data.slice(0, 18)));
      controller.enqueue(encoder.encode(data.slice(18)));
      controller.close();
    } });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body));
    const onChunk = vi.fn();
    await service.stream([{ role: 'user', content: 'Hello' }], onChunk);
    expect(onChunk).toHaveBeenCalledTimes(1);
    expect(onChunk).toHaveBeenCalledWith('Hello');
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
