import { VRM } from '@pixiv/three-vrm';
import { VisemeName } from '../types';
import { getVRMBlendShapes } from './visemePreprocessor';
import type { PhonemeWeights } from './wLipSyncService';

export class VisemeApplier {
  private vrm: VRM | null = null;
  private availableExpressions: Set<string> = new Set();

  setVRM(vrm: VRM | null) {
    this.reset();
    this.vrm = vrm;
    const mouthNames = new Set(['aa', 'ih', 'ou', 'ee', 'E', 'oh', 'mouth_a', 'mouth_i', 'mouth_u', 'mouth_e', 'mouth_o']);
    this.availableExpressions = new Set(Object.keys(vrm?.expressionManager?.expressionMap || {}).filter(name => mouthNames.has(name)));
  }

  private findAvailableExpression(candidates: string[]): string | null {
    for (const name of candidates) {
      if (this.availableExpressions.has(name)) return name;
    }
    return null;
  }

  applyViseme(visemeName: VisemeName, deltaTime: number) {
    const manager = this.vrm?.expressionManager;
    if (!manager || !this.availableExpressions.size) return;
    const target = visemeName === 'sil' || visemeName === 'PP' ? null : this.findAvailableExpression(getVRMBlendShapes(visemeName));
    const blend = 1 - Math.exp(-Math.max(0, deltaTime) / 0.045);
    for (const name of this.availableExpressions) {
      const current = manager.getValue(name) || 0;
      const weight = current + ((name === target ? 1 : 0) - current) * blend;
      manager.setValue(name, weight < 0.001 ? 0 : weight);
    }
    manager.update();
  }

  reset() {
    if (!this.vrm?.expressionManager) return;
    const expressionManager = this.vrm.expressionManager;
    this.availableExpressions.forEach(name => expressionManager.setValue(name, 0));
    expressionManager.update();
  }

  /**
   * Enable wLipSync for audio-based lip sync
   *
   * @param wLipSyncService - The wLipSync service instance
   */
  enableWLipSync(): void {
    console.log('[VisemeApplier] wLipSync enabled');
  }

  /**
   * Disable wLipSync and fall back to text-based visemes
   */
  disableWLipSync(): void {
    console.log('[VisemeApplier] wLipSync disabled, using text-based visemes');
  }

  /**
   * Apply visemes from wLipSync audio analysis
   *
   * @param weights - Phoneme weights from wLipSync (A, E, I, O, U)
   */
  applyFromAudio(weights: PhonemeWeights): void {
    if (!this.vrm?.expressionManager) return;

    // Map wLipSync phonemes to VRM blend shapes:
    // A -> aa, E -> ee, I -> ih, O -> oh, U -> ou
    const phonemeToBlendShape: Record<keyof PhonemeWeights, string[]> = {
      A: ['aa'],
      E: ['ee'],
      I: ['ih'],
      O: ['oh'],
      U: ['ou'],
    };

    // Apply each phoneme weight to corresponding blend shape
    Object.entries(weights).forEach(([phoneme, weight]) => {
      if (weight > 0.01) { // Only apply if weight is significant
        const blendShapes = phonemeToBlendShape[phoneme as keyof PhonemeWeights];
        if (blendShapes) {
          for (const shapeName of blendShapes) {
            try {
              this.vrm!.expressionManager!.setValue(shapeName, weight);
            } catch {
              // Expression may not exist, silently handle
            }
          }
        }
      }
    });

    this.vrm.expressionManager.update();
  }
}

export const visemeApplier = new VisemeApplier();
