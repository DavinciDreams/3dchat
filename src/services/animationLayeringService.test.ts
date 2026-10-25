import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AnimationClip, AnimationMixer } from 'three';
import { AnimationLayeringService } from './animationLayeringService';
import * as THREE from 'three';

vi.mock('three', async importOriginal => importOriginal<typeof import('three')>());

function createService() {
  const action = { reset: vi.fn(), fadeIn: vi.fn(), fadeOut: vi.fn(), play: vi.fn(), stop: vi.fn(), stopFading: vi.fn(), setEffectiveWeight: vi.fn() };
  const mixer = { clipAction: () => action } as unknown as AnimationMixer;
  const service = new AnimationLayeringService(mixer);
  service.registerAnimation('twistDance', {} as AnimationClip);
  return service;
}

afterEach(() => vi.restoreAllMocks());

describe('animation completion', () => {
  it('runs the completion callback once when a timed animation finishes', () => {
    const clock = vi.spyOn(performance, 'now').mockReturnValue(0);
    const service = createService();
    const complete = vi.fn();
    service.playAnimation('twistDance', 'full_body', { duration: 1, onComplete: complete });
    clock.mockReturnValue(1100);
    service.update(0.1);
    service.update(0.1);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('does not report natural completion for an interrupted animation', () => {
    const clock = vi.spyOn(performance, 'now').mockReturnValue(0);
    const service = createService();
    const complete = vi.fn();
    const id = service.playAnimation('twistDance', 'full_body', { duration: 1, onComplete: complete });
    service.stopAnimation(id, 0.3);
    clock.mockReturnValue(1100);
    service.update(0.1);
    expect(complete).not.toHaveBeenCalled();
  });
});

describe('continuous mixer transitions', () => {
  function setup() {
    const root = new THREE.Object3D();
    const mixer = new THREE.AnimationMixer(root);
    const service = new AnimationLayeringService(mixer);
    for (const [name, position] of [['a', 10], ['b', 20], ['c', 30]] as const) {
      service.registerAnimation(name, new THREE.AnimationClip(name, 2, [new THREE.NumberKeyframeTrack('.position[x]', [0, 2], [position, position])]));
    }
    const tick = (delta: number) => { service.update(delta); mixer.update(delta); };
    return { root, service, tick };
  }

  it('blends between poses without dipping toward the bind pose', () => {
    const { root, service, tick } = setup();
    service.playAnimation('a', 'full_body', { fadeInDuration: 0.4 });
    tick(0.4);
    expect(root.position.x).toBeCloseTo(10);
    service.playAnimation('b', 'full_body', { fadeInDuration: 0.4 });
    tick(0.2);
    expect(root.position.x).toBeCloseTo(15);
    tick(0.2);
    expect(root.position.x).toBeCloseTo(20);
  });

  it('preserves full pose weight through an interrupted crossfade', () => {
    const { service, tick } = setup();
    service.playAnimation('a', 'full_body', { fadeInDuration: 0.4 });
    tick(0.4);
    service.playAnimation('b', 'full_body', { fadeInDuration: 0.4 });
    tick(0.2);
    service.playAnimation('c', 'full_body', { fadeInDuration: 0.4 });
    for (let i = 0; i < 4; i++) {
      tick(0.1);
      const total = [...service.getAllActiveAnimations().values()].reduce((sum, animation) => sum + animation.action.getEffectiveWeight(), 0);
      expect(total).toBeCloseTo(1);
    }
  });

  it('continues a repeated move and cannot stop it through stale fade cleanup', () => {
    const { service, tick } = setup();
    const first = service.playAnimation('a', 'full_body', { fadeInDuration: 0.4 });
    tick(0.4);
    expect(service.playAnimation('a', 'full_body')).toBe(first);
    service.playAnimation('b', 'full_body', { fadeInDuration: 0.4 });
    tick(0.1);
    service.playAnimation('a', 'full_body', { fadeInDuration: 0.4 });
    tick(0.5);
    expect(service.getAction('a')?.isRunning()).toBe(true);
    expect(service.getAction('a')?.getEffectiveWeight()).toBeCloseTo(1);
    expect(service.getAllActiveAnimations().size).toBe(1);
  });
});
