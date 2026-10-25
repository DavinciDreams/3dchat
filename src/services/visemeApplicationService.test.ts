import { describe, expect, it } from 'vitest';
import type { VRM } from '@pixiv/three-vrm';
import { VisemeApplier } from './visemeApplicationService';

function model() {
  const weights: Record<string, number> = { aa: 0, ee: 0, ih: 0, ou: 0, oh: 0, happy: 0.7, blink: 0.4 };
  const vrm = { expressionManager: {
    expressionMap: Object.fromEntries(Object.keys(weights).map(name => [name, {}])),
    getValue: (name: string) => weights[name] ?? null,
    setValue: (name: string, weight: number) => { weights[name] = weight; },
    update: () => {},
  } } as unknown as VRM;
  return { vrm, weights };
}

describe('VRM mouth expression application', () => {
  it('uses the standard ee vowel and fades older vowels out', () => {
    const { vrm, weights } = model();
    const mouth = new VisemeApplier();
    mouth.setVRM(vrm);
    mouth.applyViseme('aa', 0.5);
    expect(weights.aa).toBeGreaterThan(0.99);
    mouth.applyViseme('E', 0.5);
    expect(weights.ee).toBeGreaterThan(0.99);
    expect(weights.aa).toBe(0);
    expect(weights.happy).toBe(0.7);
    expect(weights.blink).toBe(0.4);
  });

  it('closes vowels for silence and clears the old model when switching', () => {
    const first = model(); const second = model();
    const mouth = new VisemeApplier();
    mouth.setVRM(first.vrm);
    mouth.applyViseme('aa', 0.5);
    mouth.applyViseme('sil', 0.5);
    expect(first.weights.aa).toBe(0);
    mouth.applyViseme('oh', 0.5);
    mouth.setVRM(second.vrm);
    expect(first.weights.oh).toBe(0);
    mouth.applyViseme('ou', 0.5);
    expect(second.weights.ou).toBeGreaterThan(0.99);
    mouth.setVRM(null);
    expect(second.weights.ou).toBe(0);
  });
});
