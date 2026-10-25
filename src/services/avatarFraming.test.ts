import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { AnimatedAvatarBounds, fitAvatarDistance, normalizeAvatar } from './avatarFraming';

vi.mock('three', async importOriginal => importOriginal<typeof import('three')>());

describe('avatar dance framing', () => {
  it('normalizes cached models repeatedly without changing their height or floor position', () => {
    const root = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 1));
    body.position.y = 1;
    root.add(body);
    normalizeAvatar(root);
    const scale = root.scale.y;
    const y = root.position.y;
    root.scale.setScalar(8);
    root.position.y = -20;
    normalizeAvatar(root);
    expect(root.scale.y).toBeCloseTo(scale);
    expect(root.position.y).toBeCloseTo(y);
    const bounds = new THREE.Box3().setFromObject(root);
    expect(bounds.min.y).toBeCloseTo(0);
    expect(bounds.max.y).toBeCloseTo(1.6);
  });

  it('encloses the actually skinned vertices through a jump, rotation and scaled parent', () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, 0, 1, 0, 0, 0, 2, 0], 3));
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute([0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0], 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute([1, 0, 0, 0, 0.5, 0.5, 0, 0, 1, 0, 0, 0], 4));
    const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
    const hip = new THREE.Bone();
    const hand = new THREE.Bone();
    hand.position.y = 1;
    hip.add(hand);
    mesh.add(hip);
    mesh.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton([hip, hand]));
    const root = new THREE.Group();
    root.add(mesh);
    const tracker = new AnimatedAvatarBounds(root);
    for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 3]) {
      root.scale.setScalar(0.8);
      root.position.set(2, 1, -3);
      hip.position.y = 3;
      hand.rotation.z = angle;
      const bounds = tracker.update(new THREE.Box3());
      for (let i = 0; i < 3; i++) {
        const vertex = mesh.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
        expect(bounds.containsPoint(vertex)).toBe(true);
      }
    }
  });

  it.each([0.45, 1, 2])('fits feet, head and outstretched hands at viewport aspect %s', aspect => {
    const bounds = new THREE.Box3(new THREE.Vector3(-1.5, -0.1, -0.4), new THREE.Vector3(1.7, 3, 0.6));
    const target = new THREE.Vector3(0, 0.8, 0);
    for (const direction of [new THREE.Vector3(0, 0.08, 1), new THREE.Vector3(1, 0.5, 1), new THREE.Vector3(-1, 0.2, -1)]) {
      const camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
      const distance = fitAvatarDistance(bounds, target, direction, camera.fov, aspect);
      camera.position.copy(target).addScaledVector(direction.clone().normalize(), distance);
      camera.lookAt(target);
      camera.updateMatrixWorld(true);
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
        const point = new THREE.Vector3(x, y, z).project(camera);
        expect(Math.abs(point.x)).toBeLessThan(1);
        expect(Math.abs(point.y)).toBeLessThan(1);
        expect(point.z).toBeGreaterThan(-1);
        expect(point.z).toBeLessThan(1);
      }
    }
  });
});
