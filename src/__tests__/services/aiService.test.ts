import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { AIService } from '../../services/aiService';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));

describe('AIService', () => {
  let service: AIService;
  beforeEach(() => {
    vi.clearAllMocks();
    service = new AIService();
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns dialogue and state changes through the server proxy', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { choices: [{ message: { content: 'You bet!' } }] } });
    const result = await service.getResponse('Can you do the twist?', [{ role: 'assistant', content: 'Hello!' }]);
    expect(result.content).toBe('You bet!');
    expect(result.stateChanges).toEqual({ isProcessing: false, emotion: 'happy' });
    expect(axios.post).toHaveBeenCalledWith('/api/openrouter', expect.objectContaining({
      messages: expect.arrayContaining([{ role: 'user', content: 'Can you do the twist?' }]),
    }), expect.any(Object));
  });

  it('returns a neutral state when the provider fails', async () => {
    vi.mocked(axios.post).mockRejectedValue(new Error('Provider unavailable'));
    const result = await service.getResponse('Hello', []);
    expect(result).toEqual({ content: '', stateChanges: { isProcessing: false, emotion: 'neutral' } });
  });

  it('reassembles SSE frames split across network chunks and completes once', async () => {
    const frames = 'data: {"choices":[{"delta":{"content":"You "}}]}\n\ndata: {"choices":[{"delta":{"content":"bet!"}}]}\n\ndata: [DONE]\n\n';
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({ start(controller) {
      for (const part of [frames.slice(0, 13), frames.slice(13, 66), frames.slice(66)]) controller.enqueue(encoder.encode(part));
      controller.close();
    } });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(stream));
    const onChunk = vi.fn();
    const onError = vi.fn();
    const result = await service.streamResponse('Can you do the twist?', [], { onChunk, onError });
    expect(onChunk.mock.calls.map(([chunk]) => chunk)).toEqual([
      { content: 'You ', isComplete: false }, { content: 'bet!', isComplete: false }, { content: '', isComplete: true },
    ]);
    expect(onError).not.toHaveBeenCalled();
    expect(result.stateChanges.isProcessing).toBe(false);
  });

  it('reports HTTP failures without inventing a completed response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Unavailable', { status: 503 }));
    const onChunk = vi.fn();
    const onError = vi.fn();
    await service.streamResponse('Hello', [], { onChunk, onError });
    expect(onError).toHaveBeenCalledOnce();
    expect(onChunk).not.toHaveBeenCalled();
  });
});
