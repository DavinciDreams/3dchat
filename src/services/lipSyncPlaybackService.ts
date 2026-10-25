import type { VisemeName } from '../types';
import { getCurrentViseme, textToVisemes } from './visemePreprocessor';

/** Approximate text visemes, scaled to the decoded audio and its playback clock. */
export class LipSyncPlaybackService {
  private playback: { sample: () => VisemeName } | null = null;

  start(text: string, duration: number, elapsedSeconds: () => number): () => void {
    const visemes = textToVisemes(text);
    const estimatedDuration = visemes.reduce((sum, viseme) => sum + (viseme.duration ?? 0.1), 0);
    const playback = {
      sample: (): VisemeName => {
        const elapsed = elapsedSeconds();
        if (duration <= 0 || elapsed < 0 || elapsed >= duration) return 'sil';
        return getCurrentViseme(visemes, elapsed * estimatedDuration / duration);
      },
    };
    this.playback = playback;
    return () => { if (this.playback === playback) this.stop(); };
  }

  getViseme(): VisemeName { return this.playback?.sample() || 'sil'; }
  stop(): void { this.playback = null; }
}

export const lipSyncPlaybackService = new LipSyncPlaybackService();
