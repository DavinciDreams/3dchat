/**
 * Three.js Mock Utilities
 *
 * Provides mock implementations of Three.js objects for testing
 * These mocks allow testing without actual Three.js library
 */

import { vi } from 'vitest';

/**
 * Mock Vector3 type
 */
export interface MockVector3 {
  x: number;
  y: number;
  z: number;
  set: ReturnType<typeof vi.fn>;
  clone: ReturnType<typeof vi.fn>;
  add: ReturnType<typeof vi.fn>;
  sub: ReturnType<typeof vi.fn>;
  multiplyScalar: ReturnType<typeof vi.fn>;
  normalize: ReturnType<typeof vi.fn>;
  length: ReturnType<typeof vi.fn>;
  distanceTo: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock Vector3
 */
export function createMockVector3(x = 0, y = 0, z = 0): MockVector3 {
  return {
    x,
    y,
    z,
    set: vi.fn(),
    clone: vi.fn(function () {
      return createMockVector3(x, y, z);
    }),
    add: vi.fn(),
    sub: vi.fn(),
    multiplyScalar: vi.fn(),
    normalize: vi.fn(),
    length: vi.fn(() => Math.sqrt(x * x + y * y + z * z)),
    distanceTo: vi.fn(),
  };
}

/**
 * Mock Quaternion type
 */
export interface MockQuaternion {
  x: number;
  y: number;
  z: number;
  w: number;
  set: ReturnType<typeof vi.fn>;
  clone: ReturnType<typeof vi.fn>;
  multiply: ReturnType<typeof vi.fn>;
  normalize: ReturnType<typeof vi.fn>;
  slerp: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock Quaternion
 */
export function createMockQuaternion(x = 0, y = 0, z = 0, w = 1): MockQuaternion {
  return {
    x,
    y,
    z,
    w,
    set: vi.fn(),
    clone: vi.fn(function () {
      return createMockQuaternion(x, y, z, w);
    }),
    multiply: vi.fn(),
    normalize: vi.fn(),
    slerp: vi.fn(),
  };
}

/**
 * Mock Object3D type
 */
export interface MockObject3D {
  uuid: string;
  name: string;
  type: string;
  parent: MockObject3D | null;
  children: MockObject3D[];
  position: MockVector3;
  rotation: MockQuaternion;
  scale: MockVector3;
  matrix: Float32Array;
  add: (child: MockObject3D) => void;
  remove: (child: MockObject3D) => void;
  traverse: (callback: (obj: MockObject3D) => void) => void;
  updateMatrix: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock Object3D
 */
export function createMockObject3D(): MockObject3D {
  const children: MockObject3D[] = [];
  const position = createMockVector3();
  const rotation = createMockQuaternion();
  const scale = createMockVector3(1, 1, 1);

  const add = (child: MockObject3D) => {
    children.push(child);
    child.parent = obj;
  };

  const remove = (child: MockObject3D) => {
    const index = children.indexOf(child);
    if (index > -1) {
      children.splice(index, 1);
      child.parent = null;
    }
  };

  const traverse = (callback: (obj: MockObject3D) => void) => {
    callback(obj);
    children.forEach((child) => {
      child.traverse(callback);
    });
  };

  const obj: MockObject3D = {
    uuid: `mock-uuid-${Math.random().toString(36).substring(2, 9)}`,
    name: 'mock-object',
    type: 'Object3D',
    parent: null,
    children,
    position,
    rotation,
    scale,
    matrix: new Float32Array(16),
    add,
    remove,
    traverse,
    updateMatrix: vi.fn(),
  };

  return obj;
}

/**
 * Create a mock Scene
 */
export function createMockScene(): MockObject3D {
  const scene = createMockObject3D();
  scene.type = 'Scene';
  (scene as unknown as { background: unknown }).background = null;
  (scene as unknown as { fog: unknown }).fog = null;
  return scene;
}

/**
 * Mock Camera type
 */
export interface MockCamera {
  uuid: string;
  name: string;
  type: string;
  position: MockVector3;
  rotation: MockQuaternion;
  lookAt: ReturnType<typeof vi.fn>;
  updateMatrixWorld: ReturnType<typeof vi.fn>;
  matrix: Float32Array;
}

/**
 * Create a mock Camera
 */
export function createMockCamera(): MockCamera {
  return {
    uuid: `mock-camera-${Math.random().toString(36).substring(2, 9)}`,
    name: 'mock-camera',
    type: 'PerspectiveCamera',
    position: createMockVector3(0, 0, 5),
    rotation: createMockQuaternion(),
    lookAt: vi.fn(),
    updateMatrixWorld: vi.fn(),
    matrix: new Float32Array(16),
  };
}

/**
 * Mock WebGLRenderer type
 */
export interface MockRenderer {
  domElement: HTMLCanvasElement;
  render: ReturnType<typeof vi.fn>;
  setSize: ReturnType<typeof vi.fn>;
  setPixelRatio: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock WebGLRenderer
 */
export function createMockRenderer(): MockRenderer {
  return {
    domElement: document.createElement('canvas'),
    render: vi.fn(),
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    dispose: vi.fn(),
    clear: vi.fn(),
  };
}

/**
 * Mock AnimationClip type
 */
export interface MockAnimationClip {
  uuid: string;
  name: string;
  duration: number;
  tracks: unknown[];
  resetDuration: ReturnType<typeof vi.fn>;
  trim: ReturnType<typeof vi.fn>;
  optimize: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock AnimationClip
 */
export function createMockAnimationClip(name = 'mock-clip'): MockAnimationClip {
  return {
    uuid: `mock-clip-${Math.random().toString(36).substring(2, 9)}`,
    name,
    duration: 1,
    tracks: [],
    resetDuration: vi.fn(),
    trim: vi.fn(),
    optimize: vi.fn(),
  };
}

/**
 * Mock AnimationAction type
 */
export interface MockAnimationAction {
  clip: MockAnimationClip;
  time: number;
  weight: number;
  loop: number;
  enabled: boolean;
  play: () => MockAnimationAction;
  stop: () => MockAnimationAction;
  pause: () => MockAnimationAction;
  reset: () => MockAnimationAction;
  getMixer: ReturnType<typeof vi.fn>;
  isRunning: ReturnType<typeof vi.fn>;
  fadeIn: ReturnType<typeof vi.fn>;
  fadeOut: ReturnType<typeof vi.fn>;
  crossFadeTo: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock AnimationAction
 */
export function createMockAnimationAction(clip: MockAnimationClip): MockAnimationAction {
  let isPlaying = false;
  let isPaused = false;

  const action: MockAnimationAction = {
    clip,
    time: 0,
    weight: 1,
    loop: 0,
    enabled: true,
    play: function () {
      isPlaying = true;
      isPaused = false;
      return action;
    },
    stop: function () {
      isPlaying = false;
      isPaused = false;
      action.time = 0;
      return action;
    },
    pause: function () {
      isPaused = true;
      return action;
    },
    reset: function () {
      action.time = 0;
      return action;
    },
    getMixer: vi.fn(() => null),
    isRunning: vi.fn(() => isPlaying && !isPaused),
    fadeIn: vi.fn(),
    fadeOut: vi.fn(),
    crossFadeTo: vi.fn(),
  };

  return action;
}

/**
 * Mock AnimationMixer type
 */
export interface MockAnimationMixer {
  clipAction: (clip: MockAnimationClip) => MockAnimationAction;
  existingAction: (clip: MockAnimationClip) => MockAnimationAction | undefined;
  stopAllAction: () => void;
  update: (deltaTime: number) => void;
  getTime: ReturnType<typeof vi.fn>;
  setTime: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock AnimationMixer
 */
export function createMockAnimationMixer(): MockAnimationMixer {
  const actions = new Map<string, MockAnimationAction>();

  return {
    clipAction: function (clip: MockAnimationClip) {
      const action = createMockAnimationAction(clip);
      actions.set(clip.name, action);
      return action;
    },
    existingAction: function (clip: MockAnimationClip) {
      return actions.get(clip.name);
    },
    stopAllAction: function () {
      actions.forEach((action) => {
        action.stop();
      });
    },
    update: function (deltaTime: number) {
      actions.forEach((action) => {
        action.time += deltaTime;
      });
    },
    getTime: vi.fn(() => 0),
    setTime: vi.fn(),
  };
}

/**
 * Create a mock Group
 */
export function createMockGroup(): MockObject3D {
  const group = createMockObject3D();
  group.type = 'Group';
  return group;
}

/**
 * Mock BufferGeometry type
 */
export interface MockBufferGeometry {
  uuid: string;
  type: string;
  attributes: Record<string, unknown>;
  index: unknown;
  groups: unknown[];
  boundingBox: unknown;
  boundingSphere: unknown;
  dispose: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock BufferGeometry
 */
export function createMockBufferGeometry(): MockBufferGeometry {
  return {
    uuid: `mock-geometry-${Math.random().toString(36).substring(2, 9)}`,
    type: 'BufferGeometry',
    attributes: {},
    index: null,
    groups: [],
    boundingBox: null,
    boundingSphere: null,
    dispose: vi.fn(),
  };
}

/**
 * Mock Material type
 */
export interface MockMaterial {
  uuid: string;
  name: string;
  type: string;
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
  side: number;
  needsUpdate: boolean;
  dispose: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock Material
 */
export function createMockMaterial(): MockMaterial {
  return {
    uuid: `mock-material-${Math.random().toString(36).substring(2, 9)}`,
    name: 'mock-material',
    type: 'MeshStandardMaterial',
    opacity: 1,
    transparent: false,
    depthWrite: true,
    side: 0,
    needsUpdate: false,
    dispose: vi.fn(),
  };
}

/**
 * Mock Mesh type
 */
export interface MockMesh extends MockObject3D {
  type: string;
  geometry: MockBufferGeometry;
  material: MockMaterial;
}

/**
 * Create a mock Mesh
 */
export function createMockMesh(): MockMesh {
  const mesh = createMockObject3D() as MockMesh;
  mesh.type = 'Mesh';
  mesh.geometry = createMockBufferGeometry();
  mesh.material = createMockMaterial();
  return mesh;
}
