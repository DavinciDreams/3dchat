import { afterEach, expect, it, vi } from 'vitest';

vi.mock('../services/aiService', () => ({ aiService: {} }));
vi.mock('../services/state/AnimationStateService', () => ({ animationStateService: { getAnimationSpeed: () => 1 } }));

afterEach(() => localStorage.removeItem('chat-preferences'));

it('keeps an ElevenLabs voice selection when saved preferences are loaded', async () => {
  localStorage.setItem('chat-preferences', JSON.stringify({ state: { selectedVoiceId: 'elevenlabs:my-voice' }, version: 0 }));
  const { useChatStore } = await import('./chatStore');
  expect(useChatStore.getState().selectedVoiceId).toBe('elevenlabs:my-voice');
  expect(JSON.parse(localStorage.getItem('chat-preferences')!).state.selectedVoiceId).toBe('elevenlabs:my-voice');
});
