import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getContainer, resetContainer } from '../di/ServiceContainer';
import { SERVICE_TOKENS } from '../di/ServiceTokens';
import { VRMACacheService } from './animation/VRMACacheService';
import { vrmaAnimationService } from './vrmaAnimationService';

describe('VRMA animation facade', () => {
  const animation = { name: 'twistDance', clip: {}, vrmAnimation: {} };
  const loadAnimation = vi.fn();
  let cache: VRMACacheService;

  beforeEach(() => {
    resetContainer();
    loadAnimation.mockReset().mockResolvedValue(animation);
    cache = new VRMACacheService();
    getContainer().registerInstance(SERVICE_TOKENS.VRMA_LOADER, { loadAnimation });
    getContainer().registerInstance(SERVICE_TOKENS.VRMA_CACHE, cache);
  });

  it('loads through the registered loader and reuses the cached animation', async () => {
    const config = { name: 'twistDance', path: '/animations/vrma/twistDance.vrma' };
    expect(await vrmaAnimationService.loadAnimation(config)).toBe(animation);
    expect(await vrmaAnimationService.loadAnimation(config)).toBe(animation);
    expect(loadAnimation).toHaveBeenCalledTimes(1);
    expect(cache.getAnimationCount()).toBe(1);
  });

  it('does not cache a failed load and allows a later retry', async () => {
    const config = { name: 'twistDance', path: '/animations/vrma/twistDance.vrma' };
    loadAnimation.mockRejectedValueOnce(new Error('Unavailable'));
    await expect(vrmaAnimationService.loadAnimation(config)).rejects.toThrow('Unavailable');
    expect(vrmaAnimationService.getLoadingState('twistDance')).toBe('error');
    expect(cache.hasAnimation('twistDance')).toBe(false);
    expect(await vrmaAnimationService.loadAnimation(config)).toBe(animation);
    expect(loadAnimation).toHaveBeenCalledTimes(2);
    expect(vrmaAnimationService.getLoadingState('twistDance')).toBe('loaded');
  });

  it('shares an in-flight load between simultaneous requests', async () => {
    let complete!: (value: typeof animation) => void;
    loadAnimation.mockReturnValue(new Promise(resolve => { complete = resolve; }));
    const config = { name: 'twistDance', path: '/animations/vrma/twistDance.vrma' };
    const first = vrmaAnimationService.loadAnimation(config);
    const second = vrmaAnimationService.loadAnimation(config);
    expect(vrmaAnimationService.isLoading('twistDance')).toBe(true);
    expect(loadAnimation).toHaveBeenCalledTimes(1);
    complete(animation);
    expect(await Promise.all([first, second])).toEqual([animation, animation]);
  });
});
