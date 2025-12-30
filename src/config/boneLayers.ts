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

export const getBoneNamesForLayer = (layer: AnimationLayerType): readonly string[] => {
  return BONE_LAYERS[layer] || BONE_LAYERS.full_body;
};
