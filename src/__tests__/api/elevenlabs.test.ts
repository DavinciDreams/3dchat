import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../../api/elevenlabs';

const fetchMock = vi.fn();
const speech = { text: 'You bet!', voiceId: 'voice123' };
function request(body?: unknown, authorized = true): Request {
  return new Request('https://dancerobot.dance/api/elevenlabs', {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(authorized ? { Authorization: 'Bearer user-session' } : {}), 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe('ElevenLabs proxy', () => {
  beforeEach(() => {
    vi.stubEnv('ELEVENLABS_API_KEY', 'private-test-key');
    vi.stubEnv('ELEVENLABS_MODEL_ID', '');
    vi.stubEnv('ELEVENLABS_VOICE_ID', 'voice123');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://auth.example.com');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-anon-key');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset().mockResolvedValueOnce(Response.json({ id: 'user' }));
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('leaves existing voices available without a key', async () => {
    vi.stubEnv('ELEVENLABS_API_KEY', '');
    expect(await (await handler(request())).json()).toEqual({ voices: [], defaultVoiceId: null });
    expect((await handler(request(speech))).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires and verifies a session before calling the paid provider', async () => {
    expect((await handler(request(speech, false))).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockReset().mockResolvedValueOnce(new Response('', { status: 401 }));
    expect((await handler(request(speech))).status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://auth.example.com/auth/v1/user');
  });

  it('returns account voices for the existing picker without leaking the key', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ voices: [{ voice_id: 'voice123', name: 'My voice', category: 'premade', labels: { accent: 'British', gender: 'female' } }] }));
    const response = await handler(request());
    expect(await response.json()).toEqual({ voices: [{ id: 'elevenlabs:voice123', label: 'My voice', description: 'British · female · Standard voice', group: 'ElevenLabs' }], defaultVoiceId: 'elevenlabs:voice123' });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(fetchMock.mock.calls[1][1].headers['xi-api-key']).toBe('private-test-key');
  });

  it('returns playable audio using the server-selected model', async () => {
    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array([73, 68, 51])));
    const response = await handler(request({ ...speech, model_id: 'untrusted' }));
    const [url, options] = fetchMock.mock.calls[1];
    expect(url).toBe('https://api.elevenlabs.io/v1/text-to-speech/voice123/stream?output_format=mp3_44100_128');
    expect(JSON.parse(options.body)).toEqual({ text: 'You bet!', model_id: 'eleven_flash_v2_5' });
    expect(response.headers.get('content-type')).toBe('audio/mpeg');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([73, 68, 51]));
  });

  it.each([null, { ...speech, text: '' }, { ...speech, text: 'x'.repeat(2001) }, { ...speech, voiceId: '../other' }])('rejects invalid speech requests: %j', async body => {
    expect((await handler(request(body))).status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports quota errors without forwarding provider details', async () => {
    fetchMock.mockResolvedValueOnce(new Response('private account details', { status: 429 }));
    const response = await handler(request(speech));
    expect(response.status).toBe(429);
    expect(await response.text()).not.toContain('private account details');
  });

  it('explains when a voice needs a paid plan without changing the selected voice', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 402 }));
    const response = await handler(request(speech));
    expect(response.status).toBe(402);
    expect(await response.text()).toContain('Try a standard voice');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
