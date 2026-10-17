// Matches the existing standalone Vite API route contract.
export const config = { runtime: 'edge' };

const API = 'https://api.elevenlabs.io';
const headers = { 'Cache-Control': 'no-store' };

function error(message: string, status: number): Response {
  return Response.json({ error: { message } }, { status, headers });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET' && req.method !== 'POST') return error('Method not allowed', 405);
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return req.method === 'GET'
      ? Response.json({ voices: [], defaultVoiceId: null }, { headers })
      : error('ElevenLabs is not configured', 503);
  }

  const token = req.headers.get('authorization');
  if (!token?.startsWith('Bearer ')) return error('Sign in to use ElevenLabs', 401);
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return error('Voice authentication is not configured', 503);

  try {
    const auth = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: token, apikey: anonKey },
      signal: AbortSignal.timeout(10000),
    });
    if (!auth.ok) return error('Your session has expired. Please sign in again.', 401);
  } catch {
    return error('Unable to verify your session', 503);
  }

  try {
    if (req.method === 'GET') {
      const result = await fetch(`${API}/v2/voices?page_size=100`, {
        headers: { 'xi-api-key': key }, signal: AbortSignal.timeout(15000),
      });
      if (!result.ok) return error('Unable to load ElevenLabs voices. Check the key and Voices read permission.', 502);
      const data = await result.json() as { voices: Array<{ voice_id: string; name: string; category?: string; labels?: Record<string, string> }> };
      const voices = data.voices.map(voice => ({
        id: `elevenlabs:${voice.voice_id}`,
        label: voice.name,
        description: [voice.labels?.accent, voice.labels?.gender, voice.category === 'premade' ? 'Standard voice' : 'Library / custom voice'].filter(Boolean).join(' · '),
        group: 'ElevenLabs',
      }));
      const preferred = `elevenlabs:${process.env.ELEVENLABS_VOICE_ID || ''}`;
      return Response.json({ voices, defaultVoiceId: voices.find(v => v.id === preferred)?.id || voices[0]?.id || null }, { headers });
    }

    let body: { text?: unknown; voiceId?: unknown };
    try { body = await req.json(); } catch { return error('Expected JSON speech request', 400); }
    if (!body || typeof body.text !== 'string' || !body.text.trim() || body.text.length > 2000 ||
        typeof body.voiceId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(body.voiceId)) {
      return error('Expected text of 1–2000 characters and a valid voice ID', 400);
    }
    const audio = await fetch(`${API}/v1/text-to-speech/${body.voiceId}/stream?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: body.text, model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5' }),
      signal: AbortSignal.timeout(20000),
    });
    if (!audio.ok) {
      if (audio.status === 402) return error('This ElevenLabs voice requires a paid plan or credits. Try a standard voice, or check your ElevenLabs account.', 402);
      return error(audio.status === 429 ? 'ElevenLabs quota or rate limit reached' : 'ElevenLabs could not generate speech', audio.status === 429 ? 429 : 502);
    }
    return new Response(audio.body, { headers: { ...headers, 'Content-Type': 'audio/mpeg' } });
  } catch {
    return error('ElevenLabs is temporarily unavailable', 502);
  }
}
