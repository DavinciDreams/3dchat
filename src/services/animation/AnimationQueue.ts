/**
 * AnimationQueue
 *
 * Manages animation queue state and active layers.
 * This is a pure queue management service without scheduling logic.
 */

import type { QueuedAnimation, AnimationLayerType } from '../../types';

/**
 * Animation Queue interface for queue management
 */
export interface IAnimationQueue {
  /**
   * Add animation to queue
   */
  add(animation: QueuedAnimation): void;

  /**
   * Remove animation from queue
   */
  remove(id: string): void;

  /**
   * Get all queued animations
   */
  getQueue(): QueuedAnimation[];

  /**
   * Get queue length
   */
  getQueueLength(): number;

  /**
   * Clear all queued animations
   */
  clearQueue(): void;

  /**
   * Set active animation for a layer
   */
  setActiveLayer(layer: AnimationLayerType, animation: QueuedAnimation): void;

  /**
   * Get active animation for a layer
   */
  getActiveLayer(layer: AnimationLayerType): QueuedAnimation | null;

  /**
   * Get all active layers
   */
  getAllActiveLayers(): Map<AnimationLayerType, QueuedAnimation>;

  /**
   * Remove active layer
   */
  removeActiveLayer(layer: AnimationLayerType): void;

  /**
   * Clear all active layers
   */
  clearActiveLayers(): void;

  /**
   * Find active animation by ID
   */
  findActiveById(id: string): QueuedAnimation | null;

  /**
   * Get animation counter for generating unique IDs
   */
  getNextId(): string;

  /**
   * Reset queue state
   */
  reset(): void;
}

/**
 * AnimationQueue class
 *
 * Manages animation queue and active layer state.
 * This is a pure state management service.
 */
export class AnimationQueue implements IAnimationQueue {
  private queue: QueuedAnimation[] = [];
  private activeLayers: Map<AnimationLayerType, QueuedAnimation> = new Map();
  private animationCounter: number = 0;

  /**
   * Add animation to queue
   */
  add(animation: QueuedAnimation): void {
    // Generate ID if not provided
    if (!animation.id) {
      animation.id = `anim_${this.animationCounter++}`;
    }
    this.queue.push(animation);
  }

  /**
   * Remove animation from queue
   */
  remove(id: string): void {
    this.queue = this.queue.filter(a => a.id !== id);
  }

  /**
   * Get all queued animations
   */
  getQueue(): QueuedAnimation[] {
    return [...this.queue];
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Clear all queued animations
   */
  clearQueue(): void {
    this.queue = [];
  }

  /**
   * Set active animation for a layer
   */
  setActiveLayer(layer: AnimationLayerType, animation: QueuedAnimation): void {
    this.activeLayers.set(layer, animation);
  }

  /**
   * Get active animation for a layer
   */
  getActiveLayer(layer: AnimationLayerType): QueuedAnimation | null {
    return this.activeLayers.get(layer) || null;
  }

  /**
   * Get all active layers
   */
  getAllActiveLayers(): Map<AnimationLayerType, QueuedAnimation> {
    return new Map(this.activeLayers);
  }

  /**
   * Remove active layer
   */
  removeActiveLayer(layer: AnimationLayerType): void {
    this.activeLayers.delete(layer);
  }

  /**
   * Clear all active layers
   */
  clearActiveLayers(): void {
    this.activeLayers.clear();
  }

  /**
   * Find active animation by ID
   */
  findActiveById(id: string): QueuedAnimation | null {
    for (const anim of this.activeLayers.values()) {
      if (anim.id === id) {
        return anim;
      }
    }
    return null;
  }

  /**
   * Get animation counter for generating unique IDs
   */
  getNextId(): string {
    return `anim_${this.animationCounter++}`;
  }

  /**
   * Reset queue state
   */
  reset(): void {
    this.queue = [];
    this.activeLayers.clear();
    this.animationCounter = 0;
  }
}

export default AnimationQueue;
