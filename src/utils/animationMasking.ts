/**
 * @deprecated
 * 
 * This file is DEPRECATED and will be removed in a future version.
 * 
 * The custom bone masking system has been replaced by Three.js native AnimationMixer
 * blending using the AnimationLayeringService. The new system provides:
 * - Better performance through native weight-based blending
 * - Support for additive blending (THREE.AdditiveBlending) for gesture animations
 * - Simplified layer management without custom bone filtering
 * - Smooth crossfade transitions
 * 
 * Please use AnimationLayeringService instead:
 * import { animationLayeringService } from '../services/animationLayeringService';
 * 
 * @see AnimationLayeringService
 */

import * as THREE from 'three';
import type { AnimationLayerType } from '../types';
import { getBoneNamesForLayer } from '../config/boneLayers';

/**
 * @deprecated Use AnimationLayeringService.playAnimation() instead
 */
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
