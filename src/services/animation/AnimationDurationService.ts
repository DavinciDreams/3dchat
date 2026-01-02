/**
 * Animation Duration Service
 * 
 * Provides animation durations for all available animations.
 * This service extracts duration data from the hardcoded constants
 * and provides a clean interface for looking up animation durations.
 */

import type { IAnimationDurationProvider } from '../../di/ServiceInterfaces';

// Animation durations in milliseconds (approximate based on VRMA clips)
const ANIMATION_DURATIONS: Record<string, number> = {
  // Core animations
  'greeting': 3000,
  'peace': 2500,
  'shoot': 2500,
  'spin': 4000,
  'modelPose': 2000,
  'squat': 3000,

  // Idle & Social
  'idle': 3000,
  'talkingOnPhone': 5000,
  'bowing': 3500,
  'salute': 2500,
  'singing': 5000,

  // Dance & Celebration
  'hipHopDance': 5000,
  'swinging': 4000,
  'catwalk': 4000,

  // Combat & Action
  'punch': 1500,
  'dropKick': 2500,
  'flyingKnee': 3000,
  'daggerStab': 2000,
  'bodyBlock': 2000,
  'centerBlock': 2000,
  'catch': 1500,
  'snatch': 1500,
  'reloading': 3000,
  'magicCast': 3500,

  // Movement
  'walking': 3000,
  'jogBackwards': 3000,
  'jumping': 2000,
  'climbing': 4000,
  'takeCover': 2500,
  'zombieStandUp': 3500,
  'plank': 3000,
  'openDoor': 3000,
  'turnLeft': 2000,
  'turnRight': 2500,

  // Sports
  'golfBadShot': 4000,
  'golfPrePutt': 3500,

  // Gesture animations
  'weightShift': 3000,
  'headNod': 2000,
  'hardHeadNod': 1500,
  'lengthyHeadNod': 3000,
  'sarcasticHeadNod': 2500,
  'shakingHeadNo': 2000,
  'annoyedHeadShake': 2000,
  'thoughtfulHeadShake': 2500,
  'happyHandGesture': 2000,
  'dismissingGesture': 2000,
  'acknowledging': 2000,
  'angryGesture': 2000,
  'beingCocky': 3000,
  'relievedSigh': 2500,
  'lookAwayGesture': 3000,

  // Breakdance animations
  'breakdance1990': 4000,
  'breakdance1990_2': 4000,
  'breakdance1990_2_alt': 4000,
  'breakdance1990_3': 4000,
  'breakdanceEnding1': 3000,
  'breakdanceEnding2': 3000,
  'breakdanceEnding3': 3000,
  'breakdanceFootwork1': 4000,
  'breakdanceFootwork2': 4000,
  'breakdanceFootwork3': 4000,
  'breakdanceFootworkToFreeze': 4000,
  'breakdanceFreezes': 3000,
  'breakdanceFreezeVar1': 3000,
  'breakdanceFreezeVar2': 3000,
  'breakdanceFreezeVar3': 3000,
  'breakdanceFreezeVar4': 3000,
  'breakdanceReady': 3000,
  'breakdanceReady_2': 3000,
  'breakdanceReady_3': 3000,
  'breakdanceSwipes': 4000,
  'breakdanceUprock': 4000,
  'breakdanceUprock_2': 4000,
  'breakdanceUprockToGround': 4000,
  'breakdanceUprockToGround_2': 4000,
  'breakdanceUprockVar1': 4000,
  'breakdanceUprockVar1End': 3000,
  'breakdanceUprockVar1Start': 3000,
  'breakdanceUprockVar2': 4000,
  'brooklynUprock': 4000,
  'crosslegFreeze': 3000,
  'flair': 4000,
  'flair_2': 4000,
  'flair_3': 4000,

  // New animations from Meshy AI
  // Music & Performance
  'guitarPlaying': 4000,
  'pianoPlaying': 4000,
  'playingDrums': 4000,
  'playingTheViolin': 4000,
  'singing_1': 5000,

  // Movement variations
  'standardRun': 3000,
  'runningUpStairs': 4000,
  'startWalking': 2000,
  'jumpingDown': 2500,
  'jumpingJacks': 3000,
  'vaultOverBox': 3000,
  'skateboarding': 4000,
  'swimming': 4000,
  'paddling': 4000,
  'lowCrawl': 3000,
  'sneakingForward': 3000,
  'sneakyWalking': 3000,

  // Sitting & Lying
  'sitting': 3000,
  'sitToStand': 2500,
  'standToSit': 2500,
  'sittingClap': 2000,
  'sittingTalking': 5000,
  'sittingDisapproval': 2000,
  'layingIdle': 3000,
  'lyingDown': 3000,
  'kneeling': 3000,
  'crouchToStand': 2500,
  'gettingUp': 2000,

  // Social & Interaction
  'waving': 2500,
  'shakingHands1': 3000,
  'beckoning': 2000,
  'pointing': 2000,
  'patting': 2000,
  'petting': 2000,
  'pettingAnimal': 2000,
  'kiss': 2500,
  'blowAKiss': 2500,
  'shrugging': 2000,

  // Emotional states
  'happyIdle': 3000,
  'sadIdle': 3000,
  'defeatIdle': 3000,
  'victoryIdle': 3000,
  'victory': 3000,
  'disappointed': 2500,
  'bashful': 2000,
  'angryGesture_1': 2000,
  'thinking': 3000,
  'nervouslyLookAround': 4000,
  'lookAround': 3000,
  'lookOverShoulder': 2500,

  // Action & Activity
  'aimingGun': 2000,
  'buttonPushing': 1500,
  'cartwheel': 3000,
  'backflip': 3000,
  'kipUp': 2500,
  'throwing': 2000,
  'textingAndWalking': 4000,
  'typing': 3000,
  'talking': 4000,
  'pacingAndTalkingOnAPhone': 5000,
  'fishingCast': 3000,
  'plotting': 3000,
  'startClimbingLadder': 3000,
  'cockyHeadTurn': 2000,
  'strongGesture': 2000,

  // Dance variations
  'rumbaDancing': 5000,
  'sambaDancing': 5000,
  'sillyDancing': 5000,
  'hipHopDancing': 5000,
  'dancingTwerk': 4000,
  'twistDance': 4000,

  // Combat & Aggressive
  'roar': 2000,
  'push': 2000,
  'pushStart': 2000,

  // Other
  'floating': 4000,
  'ninjaIdle': 3000,
  'militarySignaling': 3000,
  'rummaging': 3000,
  'searchingPockets': 3000,
  'entry': 3000,
  'sadWalk': 4000,
  'standingArguing': 3000,
  'standingClap': 2000,
  'standingGreeting': 3000,
  'standingJump': 2500,
  'situps': 3000,
  'smoking': 4000,
  'yawn': 3000,
  'yelling': 2000,
};

const DEFAULT_ANIMATION_DURATION = 3000;

/**
 * Animation Duration Service
 * 
 * Provides duration information for animations.
 */
export class AnimationDurationService implements IAnimationDurationProvider {
  /**
   * Get duration for a specific animation
   * @param animationName - The name of the animation
   * @returns Duration in milliseconds
   */
  getDuration(animationName: string): number {
    return ANIMATION_DURATIONS[animationName] || DEFAULT_ANIMATION_DURATION;
  }

  /**
   * Get default duration for unknown animations
   * @returns Default duration in milliseconds
   */
  getDefaultDuration(): number {
    return DEFAULT_ANIMATION_DURATION;
  }

  /**
   * Get all animation durations
   * @returns Record of all animation durations
   */
  getAllDurations(): Record<string, number> {
    return { ...ANIMATION_DURATIONS };
  }

  /**
   * Check if an animation has a defined duration
   * @param animationName - The name of the animation
   * @returns True if the animation has a defined duration
   */
  hasDuration(animationName: string): boolean {
    return animationName in ANIMATION_DURATIONS;
  }
}

// Export singleton instance
export const animationDurationService = new AnimationDurationService();
export default animationDurationService;
