/**
 * Simple Animation Service
 * 
 * A simplified animation service that bypasses complex features:
 * - No animation layering (weight-based blending)
 * - No timeline management (scheduled events)
 * - No animation queuing
 * - No pre-fetching
 * - No visemes
 * - No voice sync
 * - No text preprocessing
 * 
 * Uses direct THREE.js mixer playback for immediate animation triggering.
 * Animation names come from LLM judge service.
 */

import * as THREE from 'three';
import vrmaAnimationService, { VRMA_ANIMATIONS } from './vrmaAnimationService';

// Default idle animation
const DEFAULT_IDLE_ANIMATION = 'modelPose';

class SimpleAnimationService {
  private mixer: THREE.AnimationMixer | null = null;
  private vrm: unknown | null = null;
  private selectedModelId: string = '';
  private currentAction: THREE.AnimationAction | null = null;
  private loadedActions: Map<string, THREE.AnimationAction> = new Map();
  private loadedClips: Map<string, THREE.AnimationClip> = new Map();

  /**
   * Initialize the service with mixer and VRM model
   */
  initialize(mixer: THREE.AnimationMixer, vrm: unknown, modelId: string): void {
    this.mixer = mixer;
    this.vrm = vrm;
    this.selectedModelId = modelId;
    console.log('[SimpleAnimationService] Initialized with model:', modelId);
  }

  /**
   * Load an animation on-demand
   */
  async loadAnimation(animationName: string): Promise<void> {
    if (!this.mixer || !this.vrm) {
      console.warn('[SimpleAnimationService] Mixer or VRM not initialized');
      return;
    }

    // Check if already loaded
    if (this.loadedActions.has(animationName)) {
      return;
    }

    // Find animation config
    const animConfig = VRMA_ANIMATIONS.find(a => a.name === animationName);
    if (!animConfig) {
      console.warn(`[SimpleAnimationService] Animation config not found: ${animationName}`);
      return;
    }

    try {
      // Load VRMA animation
      const loadedAnim = await vrmaAnimationService.loadAnimation(animConfig);
      if (!loadedAnim) {
        console.warn(`[SimpleAnimationService] Failed to load animation: ${animationName}`);
        return;
      }

      // Create retargeted clip
      const retargetedClip = vrmaAnimationService.getOrCreateRetargetedClip(
        loadedAnim.vrmAnimation,
        this.vrm,
        this.selectedModelId,
        animationName,
        undefined // No layer for simple service
      );

      // Create action
      const action = this.mixer.clipAction(retargetedClip);
      
      this.loadedActions.set(animationName, action);
      this.loadedClips.set(animationName, retargetedClip);
      
      console.log(`[SimpleAnimationService] Loaded animation: ${animationName}`);
    } catch (error) {
      console.warn(`[SimpleAnimationService] Failed to load animation ${animationName}:`, error);
    }
  }

  /**
   * Play an animation immediately
   * Stops any currently playing animation
   */
  async playAnimation(animationName: string): Promise<void> {
    if (!this.mixer) {
      console.warn('[SimpleAnimationService] Mixer not initialized');
      return;
    }

    // Load animation if not already loaded
    if (!this.loadedActions.has(animationName)) {
      await this.loadAnimation(animationName);
    }

    const action = this.loadedActions.get(animationName);
    if (!action) {
      console.warn(`[SimpleAnimationService] Action not found: ${animationName}`);
      return;
    }

    // Stop current action if playing
    if (this.currentAction && this.currentAction !== action) {
      this.currentAction.fadeOut(0.2);
      this.currentAction.stop();
    }

    // Play new animation
    action.reset();
    action.fadeIn(0.3);
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.play();
    
    this.currentAction = action;
    console.log(`[SimpleAnimationService] Playing animation: ${animationName}`);
  }

  /**
   * Play idle animation
   */
  async playIdle(): Promise<void> {
    await this.playAnimation(DEFAULT_IDLE_ANIMATION);
  }

  /**
   * Stop all animations
   */
  stopAll(): void {
    if (this.currentAction) {
      this.currentAction.stop();
      this.currentAction = null;
    }
    console.log('[SimpleAnimationService] Stopped all animations');
  }

  /**
   * Check if an animation is loaded
   */
  isLoaded(animationName: string): boolean {
    return this.loadedActions.has(animationName);
  }

  /**
   * Get all loaded animation names
   */
  getLoadedAnimations(): string[] {
    return Array.from(this.loadedActions.keys());
  }

  /**
   * Clear all loaded animations and dispose THREE.js resources
   */
  clear(): void {
    this.stopAll();
    
    // Properly dispose THREE.js AnimationActions to free GPU memory
    this.loadedActions.forEach((action, name) => {
      try {
        action.stop();
        action.reset();
      } catch (error) {
        console.warn(`[SimpleAnimationService] Failed to dispose action ${name}:`, error);
      }
    });
    this.loadedActions.clear();
    
    // Properly dispose THREE.js AnimationClips to free GPU memory
    this.loadedClips.forEach((clip, name) => {
      try {
        // Dispose clip tracks to free memory
        if (clip.tracks) {
          clip.tracks.forEach(track => {
            // Dispose keyframe track values
            if (track.values) {
              track.values = new Float32Array(0);
            }
          });
          clip.tracks = [];
        }
      } catch (error) {
        console.warn(`[SimpleAnimationService] Failed to dispose clip ${name}:`, error);
      }
    });
    this.loadedClips.clear();
    
    console.log('[SimpleAnimationService] Cleared all animations and disposed THREE.js resources');
  }

  /**
   * Clear animations for a specific model
   */
  clearForModel(modelId: string): void {
    if (this.selectedModelId === modelId) {
      this.clear();
    }
  }
}

// Export singleton instance
export const simpleAnimationService = new SimpleAnimationService();

// Export types and constants
export default simpleAnimationService;
export { DEFAULT_IDLE_ANIMATION };
