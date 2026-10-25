import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { beginStreamingSpeech, finishStreamingSpeech, hasPendingSpeech, speakChunk, stopStreamingSpeech } from './speechSynthesisService';
import { lipSyncPlaybackService } from './lipSyncPlaybackService';

const { synthesize, state } = vi.hoisted(() => ({
  synthesize: vi.fn(),
  state: { selectedVoiceId: 'elevenlabs:voice123', isMuted: false, speechError: null as string | null, setSpeaking: vi.fn() },
}));
vi.mock('./elevenLabsService', () => ({ isElevenLabsVoice: (id: string) => id.startsWith('elevenlabs:'), synthesizeElevenLabs: synthesize }));
vi.mock('../store/chatStore', () => ({ useChatStore: { getState: () => state, setState: (update: object) => Object.assign(state, update) } }));
vi.mock('./animationPrefetchService', () => ({ animationPrefetchService: {} }));
vi.mock('./visemePreprocessor', () => ({ textToVisemes: () => [{ name: 'aa', weight: 1, duration: 1 }], getCurrentViseme: () => 'aa' }));

const started = vi.fn();
const decodeAudio = vi.fn();
const sources: Array<{ onended: (() => void) | null; stop: ReturnType<typeof vi.fn> }> = [];
class AudioContextMock {
  currentTime = 0;
  state = 'running';
  destination = {};
  decodeAudioData = decodeAudio;
  createGain() { return { gain: { value: 1 }, connect: vi.fn() }; }
  createBufferSource() {
    const source = { buffer: null, onended: null as (() => void) | null, connect: vi.fn(), disconnect: vi.fn(), addEventListener: vi.fn(), start: started, stop: vi.fn(() => source.onended?.()) };
    sources.push(source);
    return source;
  }
}

describe('ElevenLabs streaming speech queue', () => {
  beforeEach(() => {
    vi.stubGlobal('AudioContext', AudioContextMock);
    state.isMuted = false;
    state.selectedVoiceId = 'elevenlabs:voice123';
    synthesize.mockReset().mockResolvedValue(new ArrayBuffer(3));
    started.mockClear();
    decodeAudio.mockReset().mockResolvedValue({ duration: 1 });
    beginStreamingSpeech();
    sources.length = 0;
  });
  afterEach(() => { stopStreamingSpeech(); vi.unstubAllGlobals(); });

  it('buffers token fragments and flushes the final unfinished sentence', async () => {
    speakChunk('You '); speakChunk('bet');
    expect(synthesize).not.toHaveBeenCalled();
    finishStreamingSpeech();
    await vi.waitFor(() => expect(started).toHaveBeenCalledTimes(1));
    expect(synthesize).toHaveBeenCalledWith('You bet', 'elevenlabs:voice123', expect.any(AbortSignal));
    sources[0].onended?.();
    await vi.waitFor(() => expect(hasPendingSpeech()).toBe(false));
  });

  it('plays sentences sequentially', async () => {
    speakChunk('Hello! Next sentence.');
    await vi.waitFor(() => expect(started).toHaveBeenCalledTimes(1));
    expect(synthesize).toHaveBeenCalledTimes(1);
    sources[0].onended?.();
    await vi.waitFor(() => expect(started).toHaveBeenCalledTimes(2));
    expect(synthesize.mock.calls.map(call => call[0])).toEqual(['Hello!', 'Next sentence.']);
  });

  it('starts lip sync with decoded audio and closes it when playback ends', async () => {
    const start = vi.spyOn(lipSyncPlaybackService, 'start');
    speakChunk('Hello!');
    await vi.waitFor(() => expect(started).toHaveBeenCalledTimes(1));
    expect(start).toHaveBeenCalledWith('Hello!', 1, expect.any(Function));
    expect(lipSyncPlaybackService.getViseme()).toBe('aa');
    sources[0].onended?.();
    await vi.waitFor(() => expect(lipSyncPlaybackService.getViseme()).toBe('sil'));
    start.mockRestore();
  });

  it('aborts in-flight synthesis and ignores later chunks after Stop', async () => {
    let complete: (value: ArrayBuffer) => void = () => {};
    synthesize.mockImplementation(() => new Promise<ArrayBuffer>(resolve => { complete = resolve; }));
    speakChunk('Hello!');
    const signal = synthesize.mock.calls[0][2] as AbortSignal;
    stopStreamingSpeech();
    speakChunk('Do not say this.'); finishStreamingSpeech();
    complete(new ArrayBuffer(3));
    await Promise.resolve(); await Promise.resolve();
    expect(signal.aborted).toBe(true);
    expect(started).not.toHaveBeenCalled();
    expect(synthesize).toHaveBeenCalledTimes(1);
    expect(hasPendingSpeech()).toBe(false);
  });

  it('stops active audio and makes no requests while muted', async () => {
    speakChunk('Hello!');
    await vi.waitFor(() => expect(started).toHaveBeenCalledTimes(1));
    state.isMuted = true;
    stopStreamingSpeech(); speakChunk('Muted.');
    expect(sources[0].stop).toHaveBeenCalled();
    expect(synthesize).toHaveBeenCalledTimes(1);
  });

  it('shows provider errors and clears queued speech', async () => {
    synthesize.mockRejectedValue(new Error('Quota reached'));
    speakChunk('Hello! Next sentence.');
    await vi.waitFor(() => expect(state.speechError).toBe('Quota reached'));
    expect(synthesize).toHaveBeenCalledTimes(1);
    expect(started).not.toHaveBeenCalled();
    expect(hasPendingSpeech()).toBe(false);
  });

  it('does not start audio if Stop happens during decoding', async () => {
    let complete: (value: { duration: number }) => void = () => {};
    decodeAudio.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    speakChunk('Hello!');
    await vi.waitFor(() => expect(decodeAudio).toHaveBeenCalledTimes(1));
    stopStreamingSpeech();
    complete({ duration: 1 });
    await Promise.resolve(); await Promise.resolve();
    expect(started).not.toHaveBeenCalled();
  });

  it('ignores stale synthesis when a new response has already started', async () => {
    let complete: (value: ArrayBuffer) => void = () => {};
    synthesize.mockImplementationOnce(() => new Promise<ArrayBuffer>(resolve => { complete = resolve; }));
    speakChunk('Old response.');
    beginStreamingSpeech();
    speakChunk('New response.');
    await vi.waitFor(() => expect(started).toHaveBeenCalledTimes(1));
    complete(new ArrayBuffer(3));
    await Promise.resolve(); await Promise.resolve();
    expect(started).toHaveBeenCalledTimes(1);
    expect(hasPendingSpeech()).toBe(true);
  });
});
