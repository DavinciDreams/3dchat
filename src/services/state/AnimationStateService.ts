/**
 * Animation State Service
 *
 * Manages animation state that was previously in chatStore.
 * This service provides a clean interface for managing
 * animation queue, current animation, and animation speed.
 */

import type { IAnimationStateService } from '../../di/ServiceInterfaces';
import type { AnimationTrigger } from '../../types';

// Animation state interface
export interface AnimationState {
  animationQueue: AnimationTrigger[];
  currentAnimation: string | null;
  animationSpeed: number;
}

/**
 * Animation State Service
 * 
 * Manages animation state for the avatar.
 * This includes the animation queue, current animation, and animation speed.
 */
export class AnimationStateService implements IAnimationStateService {
  private state: AnimationState = {
    animationQueue: [],
    currentAnimation: null,
    animationSpeed: 2.0,
  };

  /**
   * Get current animation state
   * @returns The current animation state
   */
  getState(): AnimationState {
    return { ...this.state };
  }

  /**
   * Get animation queue
   * @returns Current animation queue
   */
  getAnimationQueue(): AnimationTrigger[] {
    return [...this.state.animationQueue];
  }

  /**
   * Get current animation
   * @returns Current animation or null
   */
  getCurrentAnimation(): string | null {
    return this.state.currentAnimation;
  }

  /**
   * Get animation speed
   * @returns Current animation speed multiplier
   */
  getAnimationSpeed(): number {
    return this.state.animationSpeed;
  }

  /**
   * Set animation queue
   * @param queue - New animation queue to set
   */
  setAnimationQueue(queue: AnimationTrigger[]): void {
    this.state.animationQueue = [...queue];
  }

  /**
   * Add animation to queue
   * @param animation - Animation name to add
   */
  addToQueue(animation: AnimationTrigger): void {
    this.state.animationQueue.push(animation);
  }

  /**
   * Remove animation from queue
   * @param animation - Animation name to remove
   */
  removeFromQueue(animation: AnimationTrigger): void {
    this.state.animationQueue = this.state.animationQueue.filter(a => a.name !== animation.name);
  }

  /**
   * Set current animation
   * @param animation - Animation name to set as current, or null to clear
   */
  setCurrentAnimation(animation: string | null): void {
    this.state.currentAnimation = animation;
  }

  /**
   * Set animation speed
   * @param speed - Animation speed multiplier (default is 1.0)
   */
  setAnimationSpeed(speed: number): void {
    this.state.animationSpeed = speed;
  }

  /**
   * Clear animation queue
   */
  clearQueue(): void {
    this.state.animationQueue = [];
  }

  /**
   * Reset state to initial values
   */
  reset(): void {
    this.state = {
      animationQueue: [],
      currentAnimation: null,
      animationSpeed: 2.0,
    };
  }
}

// Export singleton instance
export const animationStateService = new AnimationStateService();
export default animationStateService;
