import { VRM } from '@pixiv/three-vrm';
import { VisemeName } from '../types';
import { getVRMBlendShapes } from './visemeService';

export class VisemeApplier {
  private vrm: VRM | null = null;
  private currentViseme: VisemeName = 'sil';
  private targetViseme: VisemeName = 'sil';
  private transitionProgress: number = 1.0;
  private readonly transitionDuration: number = 0.1;
  private availableExpressions: Set<string> = new Set();

  setVRM(vrm: VRM | null) {
    this.vrm = vrm;
    if (vrm?.expressionManager) {
      // Initialize with common VRM expression names
      // We'll try to set these and see what works
      this.availableExpressions = new Set([
        'neutral', 'aa', 'ih', 'ou', 'E', 'oh', 'fun', 'angry', 'sad', 'surprised',
        'joy', 'sorrow', 'blink', 'blinkLeft', 'blinkRight',
        'mouth_a', 'mouth_i', 'mouth_u', 'mouth_e', 'mouth_o',
        'mouth_close', 'mouth_open'
      ]);
      console.log('VRM expression manager initialized');
    }
  }

  private findAvailableExpression(candidates: string[]): string | null {
    for (const name of candidates) {
      if (this.availableExpressions.has(name)) return name;
    }
    return this.availableExpressions.has('neutral') ? 'neutral' : null;
  }

  applyViseme(visemeName: VisemeName, deltaTime: number) {
    if (!this.vrm?.expressionManager) return;

    if (visemeName !== this.targetViseme) {
      this.currentViseme = this.targetViseme;
      this.targetViseme = visemeName;
      this.transitionProgress = 0.0;
    }

    if (this.transitionProgress < 1.0) {
      this.transitionProgress += deltaTime / this.transitionDuration;
      this.transitionProgress = Math.min(this.transitionProgress, 1.0);
    }

    const currentCandidates = getVRMBlendShapes(this.currentViseme);
    const targetCandidates = getVRMBlendShapes(this.targetViseme);

    const currentExpression = this.findAvailableExpression(currentCandidates) || 'neutral';
    const targetExpression = this.findAvailableExpression(targetCandidates) || 'neutral';

    try {
      this.vrm.expressionManager.setValue(currentExpression, 1.0 - this.transitionProgress);
      this.vrm.expressionManager.setValue(targetExpression, this.transitionProgress);
      this.vrm.expressionManager.update();
    } catch {
      // Expression may not exist, silently handle
    }
  }

  reset() {
    if (!this.vrm?.expressionManager) return;
    const expressionManager = this.vrm.expressionManager;
    try {
      this.availableExpressions.forEach(name => {
        expressionManager.setValue(name, 0);
      });
      const neutral = this.findAvailableExpression(getVRMBlendShapes('sil'));
      if (neutral) {
        expressionManager.setValue(neutral, 1.0);
      }
      expressionManager.update();
    } catch {
      // Expression may not exist, silently handle
    }
    this.currentViseme = 'sil';
    this.targetViseme = 'sil';
    this.transitionProgress = 1.0;
  }
}

export const visemeApplier = new VisemeApplier();
