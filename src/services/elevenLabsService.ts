import { supabase } from '../lib/supabaseClient';
import type { SelectOption } from '../components/TypeaheadSelect';

export const isElevenLabsVoice = (id: string): boolean => id.startsWith('elevenlabs:');

async function authorization(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sign in to use ElevenLabs');
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function loadElevenLabsVoices(signal?: AbortSignal): Promise<{ voices: SelectOption[]; defaultVoiceId: string | null }> {
  const response = await fetch('/api/elevenlabs', { headers: await authorization(), signal });
  if (!response.ok) throw new Error('Unable to load ElevenLabs voices');
  return response.json();
}

export async function synthesizeElevenLabs(text: string, voiceId: string, signal?: AbortSignal): Promise<ArrayBuffer> {
  const response = await fetch('/api/elevenlabs', {
    method: 'POST', signal,
    headers: { ...await authorization(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceId: voiceId.slice('elevenlabs:'.length) }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error?.message || 'ElevenLabs speech failed');
  }
  return response.arrayBuffer();
}
