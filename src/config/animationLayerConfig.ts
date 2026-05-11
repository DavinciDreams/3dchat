/**
 * Animation Layer Configuration
 * 
 * Configuration for animation layering system including layer priorities,
 * blend modes, and default weights for each animation layer type.
 */

import * as THREE from 'three';
import type { AnimationLayerType } from '../types';

/**
 * Animation layer configuration
 */
export interface AnimationLayerConfig {
  /** Layer priority (higher = overrides lower priority layers) */
  priority: number;
  /** Default blend mode for this layer */
  blendMode: THREE.Blending;
  /** Default weight for animations on this layer */
  defaultWeight: number;
}

/**
 * Default layer configurations for animation layering
 * 
 * Each layer has:
 * - priority: Higher priority layers override lower priority layers
 * - blendMode: Normal for full animations, Additive for gestures
 * - defaultWeight: Base weight for animations on this layer
 */
export const LAYER_CONFIGS: Record<AnimationLayerType, AnimationLayerConfig> = {
  full_body: {
    priority: 100,
    blendMode: THREE.NormalBlending,
    defaultWeight: 1.0
  },
  upper_body: {
    priority: 75,
    blendMode: THREE.NormalBlending,
    defaultWeight: 0.8
  },
  lower_body: {
    priority: 50,
    blendMode: THREE.NormalBlending,
    defaultWeight: 0.7
  },
  gesture: {
    priority: 25,
    blendMode: THREE.AdditiveBlending,
    defaultWeight: 0.5
  },
  idle: {
    priority: 0,
    blendMode: THREE.NormalBlending,
    defaultWeight: 1.0
  }
};

/**
 * Get layer configuration by layer type
 * 
 * @param layer - The layer type to get configuration for
 * @returns The layer configuration
 */
export function getLayerConfig(layer: AnimationLayerType): AnimationLayerConfig {
  return LAYER_CONFIGS[layer];
}

/**
 * Get layer priority
 * 
 * @param layer - The layer type to get priority for
 * @returns The priority value
 */
export function getLayerPriority(layer: AnimationLayerType): number {
  return LAYER_CONFIGS[layer].priority;
}

/**
 * Compare layer priorities
 * 
 * @param layer1 - First layer to compare
 * @param layer2 - Second layer to compare
 * @returns Positive if layer1 has higher priority, negative if lower
 */
export function compareLayerPriority(layer1: AnimationLayerType, layer2: AnimationLayerType): number {
  return getLayerPriority(layer1) - getLayerPriority(layer2);
}
