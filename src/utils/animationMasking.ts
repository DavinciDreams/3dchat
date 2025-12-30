import * as THREE from 'three';
import type { AnimationLayerType } from '../types';
import { getBoneNamesForLayer } from '../config/boneLayers';

export function maskAnimationClip(
  clip: THREE.AnimationClip,
  layer: AnimationLayerType
): THREE.AnimationClip {
  const boneNames = getBoneNamesForLayer(layer);
  
  const filteredTracks = clip.tracks.filter(track => {
    const trackName = track.name;
    // Extract bone name from track name (e.g., "hips.position" -> "hips")
    const boneName = trackName.split('.')[0];
    return boneNames.includes(boneName);
  });
  
  return new THREE.AnimationClip(
    `${clip.name}_${layer}`,
    clip.duration,
    filteredTracks
  );
}
