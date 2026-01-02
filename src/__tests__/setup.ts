/* eslint-disable @typescript-eslint/no-explicit-any */
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Simple mocks for Three.js and VRM libraries
vi.mock('three', () => ({
  Scene: vi.fn(),
  Camera: vi.fn(),
  WebGLRenderer: vi.fn(),
  Vector3: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
  Quaternion: vi.fn(() => ({ x: 0, y: 0, z: 0, w: 1 })),
  AnimationClip: vi.fn(),
  AnimationMixer: vi.fn(() => ({
    clipAction: vi.fn(() => ({
      play: vi.fn(),
      stop: vi.fn(),
      reset: vi.fn(),
    })),
    update: vi.fn(),
  })),
  Group: vi.fn(() => ({
    add: vi.fn(),
    remove: vi.fn(),
    traverse: vi.fn(),
  })),
  Object3D: vi.fn(() => ({
    add: vi.fn(),
    remove: vi.fn(),
    traverse: vi.fn(),
  })),
  LoadingManager: vi.fn(),
  TextureLoader: vi.fn(),
}));

vi.mock('@pixiv/three-vrm', () => ({
  VRM: vi.fn(() => ({
    scene: {
      traverse: vi.fn(),
    },
    humanoid: {
      getNormalizedBoneNode: vi.fn(),
    },
    expressionManager: {
      setValue: vi.fn(),
    },
  })),
  VRMLoaderPlugin: vi.fn(),
  VRMAnimationLoaderPlugin: vi.fn(),
  createVRMAnimationClip: vi.fn(),
}));

vi.mock('@pixiv/three-vrm-animation', () => ({
  VRMAAnimationLoaderPlugin: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;
