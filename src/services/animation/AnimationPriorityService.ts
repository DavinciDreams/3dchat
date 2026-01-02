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
  'acknowledging', // Conversation acknowledgment - high frequency
] as const;

// HIGH Tier - Background load after critical complete
export const HIGH_PRIORITY_ANIMATIONS = [
  // Core emotional expressions
  'happyIdle', 'sadIdle', 'thinking', 'angryGesture',
  'beingCocky', 'relievedSigh', 'disappointed', 'bashful',

  // Common social gestures
  'waving',  'salute', 'shakingHands1',
  'pointing', 'shrugging',

  // Common movements
  'lookAround', 'idle', 'weightShift', 'walking', 'jumping',
  'sitting',

  // Common actions
  'typing',
] as const;

// MEDIUM Tier - Load on-demand when requested
export const MEDIUM_PRIORITY_ANIMATIONS = [
  // Music & Performance
  'guitarPlaying', 'pianoPlaying', 'playingDrums', 'playingTheViolin',
  'singing', 'singing_1', 'hipHopDance', 'hipHopDancing',
  'swinging', 'catwalk', 'catwalkWalking', 'rumbaDancing',
  'sambaDancing', 'sillyDancing', 'twistDance', 'dancingTwerk',

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
  'dropKick', 'flyingKnee', 'daggerStab', 'bodyBlock', 'centerBlock', 'reloading', 'magicCast',
  'aimingGun', 'takeCover', 'ninjaIdle', 'kipUp', 'roar', 'punch',

  // Movement variations
  'jogBackwards', 'climbing', 'turnLeft', 'turnRight',
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
  // Breakdance animations (40)
  'breakdance1990', 'breakdance1990_2', 'breakdance1990_2_alt', 'breakdance1990_3',
  'breakdanceEnding1', 'breakdanceEnding2', 'breakdanceEnding3',
  'breakdanceFootwork1', 'breakdanceFootwork2', 'breakdanceFootwork3', 'breakdanceFootworkToFreeze',
  'breakdanceFreezes', 'breakdanceFreezeVar1', 'breakdanceFreezeVar2', 'breakdanceFreezeVar3', 'breakdanceFreezeVar4',
  'breakdanceReady', 'breakdanceReady_2', 'breakdanceReady_3',
  'breakdanceSwipes', 'breakdanceUprock', 'breakdanceUprock_2', 'breakdanceUprockToGround', 'breakdanceUprockToGround_2',
  'breakdanceUprockVar1', 'breakdanceUprockVar1End', 'breakdanceUprockVar1Start', 'breakdanceUprockVar2',
  'brooklynUprock', 'crosslegFreeze', 'flair', 'flair_2', 'flair_3',

  // Gesture variations
  'hardHeadNod', 'lengthyHeadNod', 'sarcasticHeadNod',
  'annoyedHeadShake', 'thoughtfulHeadShake',
  'happyHandGesture', 'dismissingGesture', 'lookAwayGesture',
  'cockyHeadTurn', 'strongGesture', 'standingClap', 'sittingClap',

  // Social variations
  'standingGreeting', 'standingArguing', 'sittingTalking', 'sittingDisapproval',
  'beckoning', 'standingJump', 'sadWalk', 'victory', 'yelling', 'standingClap',

  // Rare movements
  'standardRun', 'floating', 'gettingUp', 'zombieStandUp',
  'catwalkTwistLToWalk180', 'catwalkWalkStopTwistR', 'entry', 'push',
  'pushStart', 'snatch',

  // Rare actions
  'angryGesture_1', 'aimingGun', 'victory', 'situps', 'plank',
  'jumpingJacks', 'vaultOverBox',
  'rummaging', 'searchingPockets', 'buttonPushing',

  // Rare idle states
  'boredmelancholyIdle_1', 'ninjaIdle', 'defeatIdle', 'victoryIdle',
  'layingIdle',
] as const;

// Fallback animation mapping
// When an animation is requested but not loaded, use this fallback
const FALLBACK_MAP: Record<string, string> = {
  // Idle fallbacks
  'happyIdle': 'modelPose',
  'sadIdle': 'modelPose',
  'defeatIdle': 'modelPose',
  'victoryIdle': 'modelPose',
  'boredmelancholyIdle_1': 'modelPose',

  // Gesture fallbacks
  'headNod': 'acknowledging',
  'hardHeadNod': 'headNod',
  'lengthyHeadNod': 'headNod',
  'sarcasticHeadNod': 'headNod',
  'shakingHeadNo': 'acknowledging',
  'annoyedHeadShake': 'shakingHeadNo',
  'thoughtfulHeadShake': 'shakingHeadNo',

  // Dance fallbacks
  'hipHopDance': 'greeting',
  'hipHopDancing': 'greeting',
  'swinging': 'greeting',
  'catwalk': 'greeting',
  'catwalkWalking': 'greeting',
  'rumbaDancing': 'greeting',
  'sambaDancing': 'greeting',
  'sillyDancing': 'greeting',
  'twistDance': 'greeting',
  'dancingTwerk': 'greeting',

  // Combat fallbacks
  'punch': 'angryGesture',
  'dropKick': 'angryGesture',
  'flyingKnee': 'angryGesture',
  'daggerStab': 'angryGesture',
  'bodyBlock': 'angryGesture',
  'centerBlock': 'angryGesture',
  'reloading': 'angryGesture',
  'magicCast': 'angryGesture',
  'aimingGun': 'angryGesture',
  'takeCover': 'angryGesture',
  'ninjaIdle': 'modelPose',
  'kipUp': 'angryGesture',
  'roar': 'angryGesture',

  // Movement fallbacks
  'walking': 'modelPose',
  'jogBackwards': 'modelPose',
  'jumping': 'modelPose',
  'climbing': 'modelPose',
  'turnLeft': 'modelPose',
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
  'zombieStandUp': 'modelPose',

  // Sports fallbacks
  'golfBadShot': 'modelPose',
  'golfPrePutt': 'modelPose',
  'golfDrive': 'modelPose',
  'golfPuttVictory': 'modelPose',
  'situps': 'modelPose',
  'plank': 'modelPose',
  'cartwheel': 'modelPose',
  'backflip': 'modelPose',

  // Stealth fallbacks
  'lowCrawl': 'modelPose',
  'sneakingForward': 'modelPose',
  'sneakyWalking': 'modelPose',
  'lookOverShoulder': 'modelPose',
  'nervouslyLookAround': 'modelPose',
  'plotting': 'thinking',
  'militarySignaling': 'salute',

  // Other action fallbacks
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

  // Emotional expression fallbacks
  'happyHandGesture': 'peace',
  'dismissingGesture': 'shakingHeadNo',
  'lookAwayGesture': 'modelPose',
  'cockyHeadTurn': 'beingCocky',
  'strongGesture': 'angryGesture',

  // Social gesture fallbacks
  'standingGreeting': 'greeting',
  'bowing': 'greeting',
  'salute': 'greeting',
  'shakingHands1': 'greeting',
  'pointing': 'modelPose',
  'shrugging': 'modelPose',
  'beckoning': 'waving',
  'standingJump': 'jumping',
  'sadWalk': 'modelPose',
  'victory': 'peace',
  'yelling': 'angryGesture',
  'standingClap': 'peace',
  'sittingClap': 'peace',

  // Breakdance fallbacks (all use greeting as fallback)
  'breakdance1990': 'greeting',
  'breakdance1990_2': 'greeting',
  'breakdance1990_2_alt': 'greeting',
  'breakdance1990_3': 'greeting',
  'breakdanceEnding1': 'greeting',
  'breakdanceEnding2': 'greeting',
  'breakdanceEnding3': 'greeting',
  'breakdanceFootwork1': 'greeting',
  'breakdanceFootwork2': 'greeting',
  'breakdanceFootwork3': 'greeting',
  'breakdanceFootworkToFreeze': 'greeting',
  'breakdanceFreezes': 'greeting',
  'breakdanceFreezeVar1': 'greeting',
  'breakdanceFreezeVar2': 'greeting',
  'breakdanceFreezeVar3': 'greeting',
  'breakdanceFreezeVar4': 'greeting',
  'breakdanceReady': 'greeting',
  'breakdanceReady_2': 'greeting',
  'breakdanceReady_3': 'greeting',
  'breakdanceSwipes': 'greeting',
  'breakdanceUprock': 'greeting',
  'breakdanceUprock_2': 'greeting',
  'breakdanceUprockToGround': 'greeting',
  'breakdanceUprockToGround_2': 'greeting',
  'breakdanceUprockVar1': 'greeting',
  'breakdanceUprockVar1End': 'greeting',
  'breakdanceUprockVar1Start': 'greeting',
  'breakdanceUprockVar2': 'greeting',
  'brooklynUprock': 'greeting',
  'crosslegFreeze': 'greeting',
  'flair': 'greeting',
  'flair_2': 'greeting',
  'flair_3': 'greeting',

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
