/**
 * @deprecated
 * 
 * This file is DEPRECATED and will be removed in a future version.
 * 
 * The custom bone layer definitions have been replaced by Three.js native AnimationMixer
 * blending using AnimationLayeringService. The new system provides:
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

import type { AnimationLayerType } from '../types';

export const BONE_LAYERS = {
  full_body: [
    // All humanoid bones
    'hips', 'spine', 'chest', 'upperChest', 'neck', 'head',
    'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
    'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
    'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'leftToes',
    'rightUpperLeg', 'rightLowerLeg', 'rightFoot', 'rightToes',
    'leftEye', 'rightEye', 'jaw'
  ],
  upper_body: [
    'head', 'neck', 'chest', 'spine', 'upperChest',
    'leftShoulder', 'rightShoulder',
    'leftUpperArm', 'rightUpperArm',
    'leftLowerArm', 'rightLowerArm',
    'leftHand', 'rightHand'
  ],
  lower_body: [
    'hips',
    'leftUpperLeg', 'rightUpperLeg',
    'leftLowerLeg', 'rightLowerLeg',
    'leftFoot', 'rightFoot',
    'leftToes', 'rightToes'
  ],
  gesture: [
    'head', 'neck',
    'leftShoulder', 'rightShoulder',
    'leftUpperArm', 'rightUpperArm',
    'leftLowerArm', 'rightLowerArm',
    'leftHand', 'rightHand'
  ],
  idle: [
    // All bones - idle is the fallback
    'hips', 'spine', 'chest', 'upperChest', 'neck', 'head',
    'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
    'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
    'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'leftToes',
    'rightUpperLeg', 'rightLowerLeg', 'rightFoot', 'rightToes',
    'leftEye', 'rightEye', 'jaw'
  ]
} as const;

/**
 * @deprecated Use AnimationLayeringService instead
 */
export const getBoneNamesForLayer = (layer: AnimationLayerType): readonly string[] => {
  return BONE_LAYERS[layer] || BONE_LAYERS.full_body;
};
