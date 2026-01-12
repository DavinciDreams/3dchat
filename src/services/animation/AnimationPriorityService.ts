/**
 * Animation Priority Service
 * 
 * Manages animation priority tiers and provides fallback logic.
 * This service extracts priority-related logic from VRMAAnimationService
 * and provides a clean interface for determining animation priority and fallbacks.
 */

import type { IAnimationPriorityProvider } from '../../di/ServiceInterfaces';

// Priority tiers
export type AnimationPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

// CRITICAL Tier - Load immediately during initialization
export const CRITICAL_ANIMATIONS = [
  'modelPose',    // Default idle state - always needed
  'standingGreeting',     // Used while speaking - high frequency
  'peace',        // Happy emotion - high frequency
  'headNod',      // Agreement gestures - high frequency
  'shakingHeadNo', // Disagreement gestures - high frequency
] as const;

// HIGH Tier - Background load after critical complete
export const HIGH_PRIORITY_ANIMATIONS = [
  // Core emotional expressions
  'happyIdle', 'sadIdle', 'thinking', 'angryGesture',
  'beingCocky', 'relievedSigh', 'disappointed', 'bashful',

  // Common social gestures
  'waving',  'salute', 'shakingHands1',
  'shrugging',

  // Common movements
  'lookAround', 'idle', 'weightShift', 'walking', 'jumping',
  'sitting',

  // Common actions
  'typing',
  'shoot', 'spin', 'squat',
] as const;

// MEDIUM Tier - Load on-demand when requested
export const MEDIUM_PRIORITY_ANIMATIONS = [
  // Music & Performance
  'guitarPlaying', 'pianoPlaying', 'playingDrums', 'playingTheViolin',
  'singing_1', 'hipHopDance', 'hipHopDancing',
  'catwalkWalking', 'rumbaDancing',
  'sambaDancing', 'sillyDancing', 'twistDance', 'dancingTwerk',
  'victoryDance', 'golfPuttVictory',

  // Dance variations
  'breakdance1990', 'breakdance1990_2', 'breakdance1990_2_alt', 'breakdance1990_3',
  'breakdanceEnding1', 'breakdanceEnding2', 'breakdanceEnding3',
  'breakdanceFootwork1', 'breakdanceFootwork2', 'breakdanceFootwork3', 'breakdanceFootworkToFreeze',
  'breakdanceFreezes', 'breakdanceFreezeVar1', 'breakdanceFreezeVar2', 'breakdanceFreezeVar3', 'breakdanceFreezeVar4',
  'breakdanceReady', 'breakdanceReady_2', 'breakdanceReady_3',
  'breakdanceSwipes', 'breakdanceUprock', 'breakdanceUprock_2', 'breakdanceUprockToGround', 'breakdanceUprockToGround_2',
  'breakdanceUprockVar1', 'breakdanceUprockVar1End', 'breakdanceUprockVar1Start', 'breakdanceUprockVar2',
  'brooklynUprock', 'crosslegFreeze', 'flair', 'flair_2', 'flair_3',

  // Combat & Martial Arts
  'dropKick', 'flyingKnee', 'daggerStab', 'bodyBlock', 'reloading',
  'aimingGun', 'ninjaIdle', 'kipUp', 'roar', 'punch',

  // Movement variations
  'jogBackwards', 'climbing', 'turnRight',
  'runningUpStairs', 'startWalking', 'crouchToStand', 'sitToStand',
  'standToSit', 'jumpingDown', 'jumpingJacks', 'vaultOverBox',

  // Sports
  'golfBadShot', 'golfPrePutt',
  'situps', 'plank', 'cartwheel', 'backflip', 'golfDrive',
  'skateboarding', 'swimming', 'paddling', 'catch', 'throwing', 'fishingCast',

  // Stealth
  'lowCrawl', 'sneakingForward', 'sneakyWalking', 'lookOverShoulder',
  'nervouslyLookAround', 'plotting', 'militarySignaling',

  // Other common actions
  'talkingOnPhone', 'textingAndWalking', 'pacingAndTalkingOnAPhone',
  'rummaging', 'searchingPockets', 'buttonPushing',
  'openDoor', 'startClimbingLadder', 'patting',
  'petting', 'pettingAnimal', 'kiss', 'blowAKiss', 'praying',
  'yawn', 'smoking', 'lyingDown', 'layingIdle', 'kneeling',
] as const;

// LOW Tier - Load on-demand, lower cache priority
export const LOW_PRIORITY_ANIMATIONS = [
  // Gesture variations
  'hardHeadNod', 'lengthyHeadNod', 'sarcasticHeadNod',
  'annoyedHeadShake', 'thoughtfulHeadShake',
  'happyHandGesture', 'dismissingGesture', 'lookAwayGesture',
  'cockyHeadTurn', 'strongGesture', 'sittingClap',

  // Social variations
  'standingArguing', 'sittingTalking', 'sittingDisapproval',
  'beckoning', 'standingJump', 'sadWalk', 'victory', 'yelling',

  // Rare movements
  'standardRun', 'floating', 'gettingUp',
  'catwalkTwistLToWalk180', 'catwalkWalkStopTwistR', 'entry', 'push',
  'pushStart',

  // Rare actions
  'angryGesture_1', 'victory',

  // Rare idle states
  'boredmelancholyIdle_1', 'defeatIdle', 'victoryIdle',
  'layingIdle',
] as const;

// Fallback animation mapping
// When an animation is requested but not loaded, use this fallback
// IMPORTANT: All fallbacks must reference animations that exist in AVAILABLE_ANIMATIONS
const FALLBACK_MAP: Record<string, string> = {
  // Idle fallbacks - all map to modelPose which always exists
  'happyIdle': 'modelPose',
  'sadIdle': 'modelPose',
  'defeatIdle': 'modelPose',
  'victoryIdle': 'modelPose',
  'boredmelancholyIdle_1': 'modelPose',
  
  // Gesture fallbacks - use CRITICAL animations that always exist
  'headNod': 'headNod',
  'hardHeadNod': 'headNod',
  'lengthyHeadNod': 'headNod',
  'sarcasticHeadNod': 'headNod',
  'shakingHeadNo': 'shakingHeadNo',
  'annoyedHeadShake': 'shakingHeadNo',
  'thoughtfulHeadShake': 'shakingHeadNo',
  
  // Dance fallbacks - use standingGreeting which exists
  'hipHopDance': 'standingGreeting',
  'hipHopDancing': 'standingGreeting',
  'catwalkWalking': 'standingGreeting',
  'rumbaDancing': 'standingGreeting',
  'sambaDancing': 'standingGreeting',
  'sillyDancing': 'standingGreeting',
  'twistDance': 'standingGreeting',
  'dancingTwerk': 'standingGreeting',
  'victoryDance': 'standingGreeting',
  
  // Combat fallbacks - use CRITICAL animations that always exist
  'punch': 'peace',
  'dropKick': 'peace',
  'flyingKnee': 'peace',
  'daggerStab': 'peace',
  'bodyBlock': 'peace',
  'reloading': 'peace',
  'aimingGun': 'peace',
  'ninjaIdle': 'modelPose',
  'kipUp': 'peace',
  'roar': 'peace',
  
  // Movement fallbacks - all map to modelPose which always exists
  'walking': 'modelPose',
  'jogBackwards': 'modelPose',
  'jumping': 'modelPose',
  'climbing': 'modelPose',
  'turnRight': 'modelPose',
  'runningUpStairs': 'modelPose',
  'startWalking': 'modelPose',
  'crouchToStand': 'modelPose',
  'sitToStand': 'modelPose',
  'standToSit': 'modelPose',
  'jumpingDown': 'modelPose',
  'jumpingJacks': 'modelPose',
  'vaultOverBox': 'modelPose',
  'skateboarding': 'modelPose',
  'swimming': 'modelPose',
  'paddling': 'modelPose',
  'floating': 'modelPose',
  'gettingUp': 'modelPose',
  
  // Sports fallbacks - all map to modelPose which always exists
  'golfBadShot': 'modelPose',
  'golfPrePutt': 'modelPose',
  'golfDrive': 'modelPose',
  'golfPuttVictory': 'modelPose',
  'situps': 'modelPose',
  'plank': 'modelPose',
  'cartwheel': 'modelPose',
  'backflip': 'modelPose',
  
  // Stealth fallbacks - all map to modelPose which always exists
  'lowCrawl': 'modelPose',
  'sneakingForward': 'modelPose',
  'sneakyWalking': 'modelPose',
  'lookOverShoulder': 'modelPose',
  'nervouslyLookAround': 'modelPose',
  'plotting': 'thinking',
  'militarySignaling': 'salute',
  
  // Other action fallbacks - use CRITICAL animations that always exist
  'talkingOnPhone': 'modelPose',
  'lookAround': 'modelPose',
  'textingAndWalking': 'modelPose',
  'pacingAndTalkingOnAPhone': 'modelPose',
  'rummaging': 'modelPose',
  'searchingPockets': 'modelPose',
  'buttonPushing': 'modelPose',
  'openDoor': 'modelPose',
  'startClimbingLadder': 'modelPose',
  'patting': 'modelPose',
  'petting': 'modelPose',
  'pettingAnimal': 'modelPose',
  'kiss': 'peace',
  'blowAKiss': 'peace',
  'praying': 'modelPose',
  'yawn': 'modelPose',
  'smoking': 'modelPose',
  'lyingDown': 'modelPose',
  'layingIdle': 'modelPose',
  'kneeling': 'modelPose',
  
  // Emotional expression fallbacks - use CRITICAL animations that always exist
  'happyHandGesture': 'peace',
  'dismissingGesture': 'shakingHeadNo',
  'lookAwayGesture': 'modelPose',
  'cockyHeadTurn': 'happyIdle',
  'strongGesture': 'peace',
  
  // Social gesture fallbacks - use CRITICAL animations that always exist
  'standingGreeting': 'standingGreeting',
  'bowing': 'standingGreeting',
  'salute': 'standingGreeting',
  'shakingHands1': 'standingGreeting',
  'shrugging': 'modelPose',
  'beckoning': 'waving',
  'standingJump': 'jumping',
  'sadWalk': 'modelPose',
  'victory': 'peace',
  'yelling': 'peace',
  'standingClap': 'peace',
  'sittingClap': 'peace',
  
  // Breakdance fallbacks - use standingGreeting which exists
  'breakdance1990': 'standingGreeting',
  'breakdance1990_2': 'standingGreeting',
  'breakdance1990_2_alt': 'standingGreeting',
  'breakdance1990_3': 'standingGreeting',
  'breakdanceEnding1': 'standingGreeting',
  'breakdanceEnding2': 'standingGreeting',
  'breakdanceEnding3': 'standingGreeting',
  'breakdanceFootwork1': 'standingGreeting',
  'breakdanceFootwork2': 'standingGreeting',
  'breakdanceFootwork3': 'standingGreeting',
  'breakdanceFootworkToFreeze': 'standingGreeting',
  'breakdanceFreezes': 'standingGreeting',
  'breakdanceFreezeVar1': 'standingGreeting',
  'breakdanceFreezeVar2': 'standingGreeting',
  'breakdanceFreezeVar3': 'standingGreeting',
  'breakdanceFreezeVar4': 'standingGreeting',
  'breakdanceReady': 'standingGreeting',
  'breakdanceReady_2': 'standingGreeting',
  'breakdanceReady_3': 'standingGreeting',
  'breakdanceSwipes': 'standingGreeting',
  'breakdanceUprock': 'standingGreeting',
  'breakdanceUprock_2': 'standingGreeting',
  'breakdanceUprockToGround': 'standingGreeting',
  'breakdanceUprockToGround_2': 'standingGreeting',
  'breakdanceUprockVar1': 'standingGreeting',
  'breakdanceUprockVar1End': 'standingGreeting',
  'breakdanceUprockVar1Start': 'standingGreeting',
  'breakdanceUprockVar2': 'standingGreeting',
  'brooklynUprock': 'standingGreeting',
  'crosslegFreeze': 'standingGreeting',
  'flair': 'standingGreeting',
  'flair_2': 'standingGreeting',
  'flair_3': 'standingGreeting',
  
  // Default fallback for any animation not in map
  'default': 'modelPose',
};

/**
 * Animation Priority Service
 * 
 * Provides priority tier information and fallback logic for animations.
 */
export class AnimationPriorityService implements IAnimationPriorityProvider {
  /**
   * Get priority tier for an animation
   * @param animationName - The animation name
   * @returns The priority tier
   */
  getPriorityTier(animationName: string): AnimationPriority {
    if (CRITICAL_ANIMATIONS.includes(animationName as any)) {
      return 'CRITICAL';
    }
    if (HIGH_PRIORITY_ANIMATIONS.includes(animationName as any)) {
      return 'HIGH';
    }
    if (MEDIUM_PRIORITY_ANIMATIONS.includes(animationName as any)) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  /**
   * Get all animations for a specific priority tier
   * @param tier - The priority tier
   * @returns Array of animation names in that tier
   */
  getAnimationsByTier(tier: AnimationPriority): readonly string[] {
    switch (tier) {
      case 'CRITICAL':
        return CRITICAL_ANIMATIONS;
      case 'HIGH':
        return HIGH_PRIORITY_ANIMATIONS;
      case 'MEDIUM':
        return MEDIUM_PRIORITY_ANIMATIONS;
      case 'LOW':
        return LOW_PRIORITY_ANIMATIONS;
    }
  }

  /**
   * Get fallback animation for a given animation name
   * @param animationName - The animation name
   * @returns The fallback animation name
   */
  getFallbackAnimation(animationName: string): string {
    return FALLBACK_MAP[animationName] || FALLBACK_MAP['default'] || 'modelPose';
  }

  /**
   * Check if an animation is in a specific priority tier
   * @param animationName - The animation name
   * @param tier - The priority tier to check
   * @returns True if animation is in the tier
   */
  isInTier(animationName: string, tier: AnimationPriority): boolean {
    switch (tier) {
      case 'CRITICAL':
        return CRITICAL_ANIMATIONS.includes(animationName as any);
      case 'HIGH':
        return HIGH_PRIORITY_ANIMATIONS.includes(animationName as any);
      case 'MEDIUM':
        return MEDIUM_PRIORITY_ANIMATIONS.includes(animationName as any);
      case 'LOW':
        return LOW_PRIORITY_ANIMATIONS.includes(animationName as any);
    }
  }

  /**
   * Get all priority tier constants
   * @returns Object containing all priority tier arrays
   */
  getAllPriorityTiers(): {
    CRITICAL: readonly string[];
    HIGH: readonly string[];
    MEDIUM: readonly string[];
    LOW: readonly string[];
  } {
    return {
      CRITICAL: CRITICAL_ANIMATIONS,
      HIGH: HIGH_PRIORITY_ANIMATIONS,
      MEDIUM: MEDIUM_PRIORITY_ANIMATIONS,
      LOW: LOW_PRIORITY_ANIMATIONS,
    };
  }
}

// Export singleton instance
export const animationPriorityService = new AnimationPriorityService();
export default animationPriorityService;
