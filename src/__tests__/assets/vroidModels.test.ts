import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AVAILABLE_VRM_MODELS } from '../../types';

describe('VRoid test character assets', () => {
  it.each(['goldie', 'red-peach'])('ships %s with a humanoid head and five bound vowel expressions', id => {
    const model = AVAILABLE_VRM_MODELS.find(model => model.id === id)!;
    const bytes = readFileSync(`public${model.path}`);
    expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
    expect(bytes.readUInt32LE(8)).toBe(bytes.length);
    const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    const vrm1 = gltf.extensions.VRMC_vrm;
    if (vrm1) {
      expect(vrm1.humanoid.humanBones.head.node).toEqual(expect.any(Number));
      for (const vowel of ['aa', 'ih', 'ou', 'ee', 'oh']) {
        expect(vrm1.expressions.preset[vowel].morphTargetBinds.length).toBeGreaterThan(0);
      }
    } else {
      const vrm0 = gltf.extensions.VRM;
      expect(vrm0.humanoid.humanBones.find((bone: { bone: string }) => bone.bone === 'head').node).toEqual(expect.any(Number));
      for (const vowel of ['a', 'i', 'u', 'e', 'o']) {
        expect(vrm0.blendShapeMaster.blendShapeGroups.find((group: { presetName: string }) => group.presetName === vowel).binds.length).toBeGreaterThan(0);
      }
    }
    expect(model.author).toBeTruthy();
    expect(model.sourceUrl).toMatch(/^https:\/\/3d\.flobots\.xyz\/model\//);
  });
});
