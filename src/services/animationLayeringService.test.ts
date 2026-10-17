import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AnimationClip, AnimationMixer } from 'three';
import { AnimationLayeringService } from './animationLayeringService';

vi.mock('three', async importOriginal => importOriginal<typeof import('three')>());

function createService() {
  const action = { reset: vi.fn(), fadeIn: vi.fn(), fadeOut: vi.fn(), play: vi.fn(), stop: vi.fn() };
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
