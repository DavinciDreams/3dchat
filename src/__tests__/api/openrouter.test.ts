import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../../api/openrouter';

const fetchMock = vi.fn();
const messages = [{ role: 'user', content: 'Can you do the twist?' }];

function request(body: unknown = { model: 'retired-model', messages, stream: true }) {
  return new Request('https://dancerobot.dance/api/openrouter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://dancerobot.dance' },
    body: JSON.stringify(body),
  });
}

describe('chat completion proxy', () => {
  beforeEach(() => {
    vi.stubEnv('LLM_PROVIDER', '');
    vi.stubEnv('OPENROUTER_API_KEY', 'test-openrouter-key');
    vi.stubEnv('ZAI_API_KEY', 'test-zai-key');
    vi.stubEnv('ZAI_MODEL', '');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response('data: [DONE]\n\n', {
      headers: { 'Content-Type': 'text/event-stream' },
    }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('preserves the OpenRouter route and its request body by default', async () => {
    const response = await handler(request());
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(options.headers.Authorization).toBe('Bearer test-openrouter-key');
    expect(JSON.parse(options.body)).toEqual({ model: 'retired-model', messages, stream: true });
    expect(await response.text()).toBe('data: [DONE]\n\n');
    expect(response.headers.get('content-type')).toBe('text/event-stream');
  });

  it('uses GLM for streaming dialogue even when a cached client requests an old model', async () => {
    vi.stubEnv('LLM_PROVIDER', 'zai');
    const response = await handler(request());
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.z.ai/api/coding/paas/v4/chat/completions');
    expect(options.headers.Authorization).toBe('Bearer test-zai-key');
    expect(JSON.parse(options.body)).toEqual({
      model: 'glm-5.3-flash', messages, stream: true, reasoning_effort: 'low',
    });
    expect(await response.text()).toBe('data: [DONE]\n\n');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('adapts forced animation calls to Z.ai and preserves the tool result', async () => {
    vi.stubEnv('LLM_PROVIDER', 'zai');
    const tool = { type: 'function', function: { name: 'trigger_animations', parameters: { type: 'object' } } };
    const result = { choices: [{ message: { tool_calls: [{ function: {
      name: 'trigger_animations', arguments: '{"animations":[{"name":"twistDance"}]}',
    } }] } }] };
    fetchMock.mockResolvedValue(Response.json(result));
    const response = await handler(request({ messages, tools: [tool], tool_choice: {
      type: 'function', function: { name: 'trigger_animations' },
    } }));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.tools).toEqual([tool]);
    expect(body.tool_choice).toBe('auto');
    expect(body.messages[1]).toEqual({ role: 'system', content: expect.stringContaining('calling the trigger_animations function') });
    expect(await response.json()).toEqual(result);
  });

  it('fails without forwarding when the selected provider key is missing', async () => {
    vi.stubEnv('LLM_PROVIDER', 'zai');
    vi.stubEnv('ZAI_API_KEY', '');
    expect((await handler(request())).status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects unsupported providers and malformed request bodies', async () => {
    vi.stubEnv('LLM_PROVIDER', 'other');
    expect((await handler(request())).status).toBe(500);
    vi.stubEnv('LLM_PROVIDER', 'zai');
    expect((await handler(request(null))).status).toBe(400);
    expect((await handler(request({ messages: [] }))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves upstream error status without leaking credentials on connection failure', async () => {
    vi.stubEnv('LLM_PROVIDER', 'zai');
    fetchMock.mockResolvedValue(Response.json({ error: { message: 'Rate limited' } }, { status: 429 }));
    expect((await handler(request())).status).toBe(429);
    fetchMock.mockRejectedValue(new Error('network failure'));
    const response = await handler(request());
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('test-zai-key');
  });
});
