import * as THREE from 'three';

const restBounds = new WeakMap<THREE.Object3D, THREE.Box3>();

/** Measure the unscaled model once, so selecting a cached model cannot compound its scale. */
export function normalizeAvatar(scene: THREE.Object3D, scale = 1, offsetY = 0): void {
  let bounds = restBounds.get(scene);
  if (!bounds) {
    scene.scale.setScalar(1);
    scene.position.set(0, 0, 0);
    scene.updateMatrixWorld(true);
    bounds = new THREE.Box3().setFromObject(scene);
    restBounds.set(scene, bounds.clone());
  }
  const height = bounds.max.y - bounds.min.y;
  const finalScale = height > 0 ? 1.6 / height * scale : scale;
  scene.scale.setScalar(finalScale);
  scene.position.y = -bounds.min.y * finalScale + offsetY;
  scene.updateMatrixWorld(true);
}

interface BoneEnvelope { mesh: THREE.SkinnedMesh; bone: THREE.Bone; bounds: THREE.Box3 }
interface StaticEnvelope { mesh: THREE.Mesh; bounds: THREE.Box3 }

/**
 * Conservative animated skin bounds without reskinning every vertex every frame.
 * Each influenced vertex is enclosed in each contributing bone's bind-space box.
 * Skinning is a weighted sum, so their transformed union also encloses the result.
 */
export class AnimatedAvatarBounds {
  private bones: BoneEnvelope[] = [];
  private staticMeshes: StaticEnvelope[] = [];
  private matrix = new THREE.Matrix4();
  private transformed = new THREE.Box3();

  constructor(private scene: THREE.Object3D) {
    const vertex = new THREE.Vector3();
    const local = new THREE.Vector3();
    const indices = new THREE.Vector4();
    const weights = new THREE.Vector4();
    scene.traverse(object => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const skin = mesh as THREE.SkinnedMesh;
      const position = mesh.geometry.getAttribute('position');
      const skinIndex = mesh.geometry.getAttribute('skinIndex');
      const skinWeight = mesh.geometry.getAttribute('skinWeight');
      if (skin.isSkinnedMesh && position && skinIndex && skinWeight) {
        const boxes = skin.skeleton.bones.map(() => new THREE.Box3());
        for (let i = 0; i < position.count; i++) {
          vertex.fromBufferAttribute(position, i).applyMatrix4(skin.bindMatrix);
          indices.set(skinIndex.getX(i), skinIndex.getY(i), skinIndex.getZ(i), skinIndex.getW(i));
          weights.set(skinWeight.getX(i), skinWeight.getY(i), skinWeight.getZ(i), skinWeight.getW(i));
          for (let slot = 0; slot < 4; slot++) {
            if (weights.getComponent(slot) <= 0) continue;
            const index = indices.getComponent(slot);
            const inverse = skin.skeleton.boneInverses[index];
            if (inverse && boxes[index]) boxes[index].expandByPoint(local.copy(vertex).applyMatrix4(inverse));
          }
        }
        boxes.forEach((bounds, index) => {
          if (!bounds.isEmpty()) this.bones.push({ mesh: skin, bone: skin.skeleton.bones[index], bounds });
        });
      } else {
        mesh.geometry.computeBoundingBox();
        if (mesh.geometry.boundingBox) this.staticMeshes.push({ mesh, bounds: mesh.geometry.boundingBox.clone() });
      }
    });
  }

  update(target: THREE.Box3): THREE.Box3 {
    this.scene.updateWorldMatrix(true, false);
    this.scene.updateMatrixWorld(true);
    target.makeEmpty();
    for (const { mesh, bone, bounds } of this.bones) {
      this.matrix.multiplyMatrices(mesh.matrixWorld, mesh.bindMatrixInverse).multiply(bone.matrixWorld);
      target.union(this.transformed.copy(bounds).applyMatrix4(this.matrix));
    }
    for (const { mesh, bounds } of this.staticMeshes) {
      target.union(this.transformed.copy(bounds).applyMatrix4(mesh.matrixWorld));
    }
    // Allow room for facial morphs and a small border around clothing and hair.
    if (!target.isEmpty()) target.expandByScalar(0.06);
    return target;
  }
}

/** Distance that keeps all eight world-space corners inside both camera axes. */
export function fitAvatarDistance(bounds: THREE.Box3, target: THREE.Vector3, direction: THREE.Vector3, fov: number, aspect: number): number {
  const back = direction.clone().normalize();
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), back).normalize();
  const up = new THREE.Vector3().crossVectors(back, right).normalize();
  const tanVertical = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const tanHorizontal = tanVertical * Math.max(aspect, 0.01);
  const point = new THREE.Vector3();
  let distance = 0.1;
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    point.set(x, y, z).sub(target);
    distance = Math.max(distance, point.dot(back) + Math.max(Math.abs(point.dot(right)) / tanHorizontal, Math.abs(point.dot(up)) / tanVertical) * 1.12);
  }
  return distance;
}
