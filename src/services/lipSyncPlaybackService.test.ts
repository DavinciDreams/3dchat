import { describe, expect, it } from 'vitest';
import { LipSyncPlaybackService } from './lipSyncPlaybackService';

describe('speech lip-sync playback clock', () => {
  it('fits cached text visemes to each actual audio duration', () => {
    const playback = new LipSyncPlaybackService();
    let time = 0;
    playback.start('a', 2, () => time);
    time = 0.6;
    expect(playback.getViseme()).toBe('aa');
    time = 2;
    expect(playback.getViseme()).toBe('sil');
    playback.start('a', 4, () => time);
    expect(playback.getViseme()).toBe('aa');
    time = 4;
    expect(playback.getViseme()).toBe('sil');
  });

  it('closes the mouth on stop and ignores cleanup from an older segment', () => {
    const playback = new LipSyncPlaybackService();
    const stopOld = playback.start('a', 2, () => 0.6);
    playback.start('o', 2, () => 0.6);
    stopOld();
    expect(playback.getViseme()).toBe('oh');
    playback.stop();
    expect(playback.getViseme()).toBe('sil');
  });
});
