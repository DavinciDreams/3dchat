/**
 * VRMA Animation Service (Refactored)
 *
 * Facade service that orchestrates VRMA animation loading, caching, and retargeting.
 * Delegates to specialized services for each concern.
 */

import type { AnimationLayerType } from '../types';
import { animationPriorityService } from './animation/AnimationPriorityService';
import type { IVRMALoaderService } from '../di/ServiceInterfaces';
import type { IVMACacheService } from '../di/ServiceInterfaces';
import type { IVMARetargetingService } from '../di/ServiceInterfaces';
import { getContainer } from '../di/ServiceContainer';
import { SERVICE_TOKENS } from '../di/ServiceTokens';

/**
 * VRMA Animation interface
 */
export interface VRMAAnimation {
  name: string;
  clip: unknown;
  vrmAnimation: unknown; // The raw VRM animation data for retargeting
}

/**
 * VRMA Animation Config interface
 */
export interface VRMAAnimationConfig {
  path: string;
  name: string;
  description?: string;
}

// Available VRMA animations - Original VRM Motion Pack
export const VRMA_CORE_ANIMATIONS: VRMAAnimationConfig[] = [
  { path: '/animations/vrma/VRMA_02.vrma', name: 'greeting', description: 'Greeting animation' },
  { path: '/animations/vrma/VRMA_03.vrma', name: 'peace', description: 'Peace sign animation' },
  { path: '/animations/vrma/VRMA_04.vrma', name: 'shoot', description: 'Shoot animation' },
  { path: '/animations/vrma/VRMA_05.vrma', name: 'spin', description: 'Spin animation' },
  { path: '/animations/vrma/VRMA_06.vrma', name: 'modelPose', description: 'Model pose animation' },
  { path: '/animations/vrma/VRMA_07.vrma', name: 'squat', description: 'Squat animation' },
];

// Extended animations from Mixamo (converted from FBX)
// These are actual converted animations available
export const VRMA_EXTENDED_ANIMATIONS: VRMAAnimationConfig[] = [
  // Idle & Standing
  { path: '/animations/vrma/idle.vrma', name: 'idle', description: 'Default standing pose' },
  { path: '/animations/vrma/weightShift.vrma', name: 'weightShift', description: 'Weight shift idle' },
  { path: '/animations/vrma/talkingOnPhone.vrma', name: 'talkingOnPhone', description: 'Talking on phone' },

  // Greetings & Social
  { path: '/animations/vrma/bowing.vrma', name: 'bowing', description: 'Bow gesture' },
  { path: '/animations/vrma/salute.vrma', name: 'salute', description: 'Military-style salute' },
  { path: '/animations/vrma/singing.vrma', name: 'singing', description: 'Singing animation' },

  // Dance & Celebration
  { path: '/animations/vrma/hipHopDance.vrma', name: 'hipHopDance', description: 'Hip hop dance moves' },
  { path: '/animations/vrma/swinging.vrma', name: 'swinging', description: 'Swinging motion' },
  { path: '/animations/vrma/catwalkWalkForwardHighKnees.vrma', name: 'catwalk', description: 'Catwalk strut' },

  // Combat & Action
  { path: '/animations/vrma/punch.vrma', name: 'punch', description: 'Punch forward' },
  { path: '/animations/vrma/dropKick.vrma', name: 'dropKick', description: 'Drop kick attack' },
  { path: '/animations/vrma/flyingKneePunchCombo.vrma', name: 'flyingKnee', description: 'Flying knee combo' },
  { path: '/animations/vrma/doubleDaggerStab.vrma', name: 'daggerStab', description: 'Double dagger stab' },
  { path: '/animations/vrma/bodyBlock.vrma', name: 'bodyBlock', description: 'Body block defense' },
  { path: '/animations/vrma/catch.vrma', name: 'catch', description: 'Catch something' },
  { path: '/animations/vrma/snatch.vrma', name: 'snatch', description: 'Snatch grab' },
  { path: '/animations/vrma/reloading.vrma', name: 'reloading', description: 'Reload weapon' },
  { path: '/animations/vrma/standing2HMagicAttack01.vrma', name: 'magicCast', description: 'Cast magic spell' },

  // Movement
  { path: '/animations/vrma/walking.vrma', name: 'walking', description: 'Walking in place' },
  { path: '/animations/vrma/slowJogBackwards.vrma', name: 'jogBackwards', description: 'Jog backwards' },
  { path: '/animations/vrma/jumping.vrma', name: 'jumping', description: 'Jump in place' },
  { path: '/animations/vrma/climbingToTop.vrma', name: 'climbing', description: 'Climbing up' },
  { path: '/animations/vrma/rightTurnWBriefcase.vrma', name: 'turnRight', description: 'Turn right with briefcase' },
  { path: '/animations/vrma/standardRun.vrma', name: 'standardRun', description: 'Standard running' },
  { path: '/animations/vrma/runningUpStairs.vrma', name: 'runningUpStairs', description: 'Running up stairs' },

  // Sports & Activities
  { path: '/animations/vrma/golfBadShot.vrma', name: 'golfBadShot', description: 'Golf bad shot reaction' },
  { path: '/animations/vrma/golfPrePutt.vrma', name: 'golfPrePutt', description: 'Golf pre-putt stance' },

  // New animations from Meshy AI
  { path: '/animations/vrma/aimingGun.vrma', name: 'aimingGun', description: 'Aiming gun' },
  { path: '/animations/vrma/angryGesture_1.vrma', name: 'angryGesture_1', description: 'Angry gesture variation' },
  { path: '/animations/vrma/backflip.vrma', name: 'backflip', description: 'Backflip' },
  { path: '/animations/vrma/bashful.vrma', name: 'bashful', description: 'Bashful pose' },
  { path: '/animations/vrma/beckoning.vrma', name: 'beckoning', description: 'Beckoning gesture' },
  { path: '/animations/vrma/blowAKiss.vrma', name: 'blowAKiss', description: 'Blow a kiss' },
  { path: '/animations/vrma/boredmelancholyIdle_1.vrma', name: 'boredmelancholyIdle_1', description: 'Bored melancholy idle' },
  { path: '/animations/vrma/buttonPushing.vrma', name: 'buttonPushing', description: 'Button pushing' },
  { path: '/animations/vrma/cartwheel.vrma', name: 'cartwheel', description: 'Cartwheel' },
  { path: '/animations/vrma/catwalkTwistLToWalk180.vrma', name: 'catwalkTwistLToWalk180', description: 'Catwalk twist to walk' },
  { path: '/animations/vrma/catwalkWalking.vrma', name: 'catwalkWalking', description: 'Catwalk walking' },
  { path: '/animations/vrma/cockyHeadTurn.vrma', name: 'cockyHeadTurn', description: 'Cocky head turn' },
  { path: '/animations/vrma/crouchToStand.vrma', name: 'crouchToStand', description: 'Crouch to stand' },
  { path: '/animations/vrma/dancingTwerk.vrma', name: 'dancingTwerk', description: 'Dancing twerk' },
  { path: '/animations/vrma/defeatIdle.vrma', name: 'defeatIdle', description: 'Defeat idle' },
  { path: '/animations/vrma/disappointed.vrma', name: 'disappointed', description: 'Disappointed' },
  { path: '/animations/vrma/entry.vrma', name: 'entry', description: 'Entry' },
  { path: '/animations/vrma/fishingCast.vrma', name: 'fishingCast', description: 'Fishing cast' },
  { path: '/animations/vrma/floating.vrma', name: 'floating', description: 'Floating' },
  { path: '/animations/vrma/gettingUp.vrma', name: 'gettingUp', description: 'Getting up' },
  { path: '/animations/vrma/golfDrive.vrma', name: 'golfDrive', description: 'Golf drive' },
  { path: '/animations/vrma/guitarPlaying.vrma', name: 'guitarPlaying', description: 'Guitar playing' },
  { path: '/animations/vrma/happyIdle.vrma', name: 'happyIdle', description: 'Happy idle' },
  { path: '/animations/vrma/hipHopDancing.vrma', name: 'hipHopDancing', description: 'Hip hop dancing' },
  { path: '/animations/vrma/jumpingDown.vrma', name: 'jumpingDown', description: 'Jumping down' },
  { path: '/animations/vrma/jumpingJacks.vrma', name: 'jumpingJacks', description: 'Jumping jacks' },
  { path: '/animations/vrma/kipUp.vrma', name: 'kipUp', description: 'Kip up' },
  { path: '/animations/vrma/kiss.vrma', name: 'kiss', description: 'Kiss' },
  { path: '/animations/vrma/kneeling.vrma', name: 'kneeling', description: 'Kneeling' },
  { path: '/animations/vrma/layingIdle.vrma', name: 'layingIdle', description: 'Laying idle' },
  { path: '/animations/vrma/lookAround.vrma', name: 'lookAround', description: 'Look around' },
  { path: '/animations/vrma/lookOverShoulder.vrma', name: 'lookOverShoulder', description: 'Look over shoulder' },
  { path: '/animations/vrma/lowCrawl.vrma', name: 'lowCrawl', description: 'Low crawl' },
  { path: '/animations/vrma/sneakingForward.vrma', name: 'sneakingForward', description: 'Sneaking forward' },
  { path: '/animations/vrma/sneakyWalking.vrma', name: 'sneakyWalking', description: 'Sneaky walking' },
  { path: '/animations/vrma/nervouslyLookAround.vrma', name: 'nervouslyLookAround', description: 'Nervously looking around' },
  { path: '/animations/vrma/plotting.vrma', name: 'plotting', description: 'Plotting' },
  { path: '/animations/vrma/militarySignaling.vrma', name: 'militarySignaling', description: 'Military signaling' },
  { path: '/animations/vrma/pacingAndTalkingOnAPhone.vrma', name: 'pacingAndTalkingOnAPhone', description: 'Pacing and talking on phone' },
  { path: '/animations/vrma/rummaging.vrma', name: 'rummaging', description: 'Rummaging' },
  { path: '/animations/vrma/searchingPockets.vrma', name: 'searchingPockets', description: 'Searching pockets' },
  { path: '/animations/vrma/startClimbingLadder.vrma', name: 'startClimbingLadder', description: 'Start climbing ladder' },
  { path: '/animations/vrma/vaultOverBox.vrma', name: 'vaultOverBox', description: 'Vault over box' },
  { path: '/animations/vrma/patting.vrma', name: 'patting', description: 'Patting' },
  { path: '/animations/vrma/petting.vrma', name: 'petting', description: 'Petting' },
  { path: '/animations/vrma/pettingAnimal.vrma', name: 'pettingAnimal', description: 'Petting animal' },
  { path: '/animations/vrma/praying.vrma', name: 'praying', description: 'Praying' },
  { path: '/animations/vrma/yawn.vrma', name: 'yawn', description: 'Yawn' },
  { path: '/animations/vrma/smoking.vrma', name: 'smoking', description: 'Smoking' },
  { path: '/animations/vrma/lyingDown.vrma', name: 'lyingDown', description: 'Lying down' },
  { path: '/animations/vrma/shrugging.vrma', name: 'shrugging', description: 'Shrugging' },
  { path: '/animations/vrma/zombieStandUp.vrma', name: 'zombieStandUp', description: 'Zombie stand up' },
  // Additional animations from animation-list.json
  { path: '/animations/vrma/sadIdle.vrma', name: 'sadIdle', description: 'Sad standing pose' },
  { path: '/animations/vrma/catwalkWalkStopTwistR.vrma', name: 'catwalkWalkStopTwistR', description: 'Catwalk walk stop twist right' },
  { path: '/animations/vrma/paddling.vrma', name: 'paddling', description: 'Paddling motion' },
  { path: '/animations/vrma/roar.vrma', name: 'roar', description: 'Roaring gesture' },
  { path: '/animations/vrma/rumbaDancing.vrma', name: 'rumbaDancing', description: 'Rumba dance moves' },
  { path: '/animations/vrma/sadWalk.vrma', name: 'sadWalk', description: 'Sad walking animation' },
  { path: '/animations/vrma/sambaDancing.vrma', name: 'sambaDancing', description: 'Samba dance moves' },
  { path: '/animations/vrma/shakingHands1.vrma', name: 'shakingHands1', description: 'Shaking hands gesture' },
  { path: '/animations/vrma/skateboarding.vrma', name: 'skateboarding', description: 'Skateboarding animation' },
  { path: '/animations/vrma/standingArguing.vrma', name: 'standingArguing', description: 'Arguing while standing' },
  { path: '/animations/vrma/standingClap.vrma', name: 'standingClap', description: 'Clapping while standing' },
  { path: '/animations/vrma/standingGreeting.vrma', name: 'standingGreeting', description: 'Greeting while standing' },
  { path: '/animations/vrma/standingJump.vrma', name: 'standingJump', description: 'Standing jump' },
  { path: '/animations/vrma/startWalking.vrma', name: 'startWalking', description: 'Start walking' },
  { path: '/animations/vrma/strongGesture.vrma', name: 'strongGesture', description: 'Strong emphatic gesture' },
  { path: '/animations/vrma/swimming.vrma', name: 'swimming', description: 'Swimming animation' },
  { path: '/animations/vrma/talking.vrma', name: 'talking', description: 'Talking gesture' },
  { path: '/animations/vrma/throwing.vrma', name: 'throwing', description: 'Throwing something' },
  { path: '/animations/vrma/twistDance.vrma', name: 'twistDance', description: 'Twist dance moves' },
  { path: '/animations/vrma/typing.vrma', name: 'typing', description: 'Typing animation' },
  { path: '/animations/vrma/victoryIdle.vrma', name: 'victoryIdle', description: 'Victory idle pose' },
  { path: '/animations/vrma/waving.vrma', name: 'waving', description: 'Wave hello/goodbye' },
  { path: '/animations/vrma/yelling.vrma', name: 'yelling', description: 'Yelling gesture' },
  { path: '/animations/vrma/pointing.vrma', name: 'pointing', description: 'Point at something' },
  { path: '/animations/vrma/acknowledging.vrma', name: 'acknowledging', description: 'Acknowledging gesture' },
  // Add thinking and sitting animations that exist in directory
  { path: '/animations/vrma/thinking.vrma', name: 'thinking', description: 'Thinking pose' },
  { path: '/animations/vrma/sitting.vrma', name: 'sitting', description: 'Sitting pose' },
];

// Gesture & Expression animations
export const VRMA_GESTURE_ANIMATIONS: VRMAAnimationConfig[] = [
  // Head gestures
  { path: '/animations/vrma/headNod.vrma', name: 'headNod', description: 'Simple head nod' },
  { path: '/animations/vrma/hardHeadNod.vrma', name: 'hardHeadNod', description: 'Strong head nod' },
  { path: '/animations/vrma/lengthyHeadNod.vrma', name: 'lengthyHeadNod', description: 'Extended head nod' },
  { path: '/animations/vrma/sarcasticHeadNod.vrma', name: 'sarcasticHeadNod', description: 'Sarcastic nod' },
  { path: '/animations/vrma/shakingHeadNo.vrma', name: 'shakingHeadNo', description: 'Shake head no' },
  { path: '/animations/vrma/annoyedHeadShake.vrma', name: 'annoyedHeadShake', description: 'Annoyed head shake' },
  { path: '/animations/vrma/thoughtfulHeadShake.vrma', name: 'thoughtfulHeadShake', description: 'Thoughtful head shake' },

  // Hand gestures
  { path: '/animations/vrma/happyHandGesture.vrma', name: 'happyHandGesture', description: 'Happy hand gesture' },
  { path: '/animations/vrma/dismissingGesture.vrma', name: 'dismissingGesture', description: 'Dismissing wave' },
  { path: '/animations/vrma/beckoning.vrma', name: 'beckoning', description: 'Beckoning gesture' },
  { path: '/animations/vrma/pointing.vrma', name: 'pointing', description: 'Pointing' },

  // Emotional expressions
  { path: '/animations/vrma/angryGesture.vrma', name: 'angryGesture', description: 'Angry gesture' },
  { path: '/animations/vrma/beingCocky.vrma', name: 'beingCocky', description: 'Cocky pose' },
  { path: '/animations/vrma/relievedSigh.vrma', name: 'relievedSigh', description: 'Relieved sigh' },
  { path: '/animations/vrma/disappointed.vrma', name: 'disappointed', description: 'Disappointed' },
  { path: '/animations/vrma/bashful.vrma', name: 'bashful', description: 'Bashful pose' },
  { path: '/animations/vrma/lookAwayGesture.vrma', name: 'lookAwayGesture', description: 'Look away gesture' },
];

// Breakdance animations
export const VRMA_BREAKDANCE_ANIMATIONS: VRMAAnimationConfig[] = [
  // 1990 spins
  { path: '/animations/vrma/breakdance1990.vrma', name: 'breakdance1990' },
  { path: '/animations/vrma/breakdance1990_2.vrma', name: 'breakdance1990_2' },
  { path: '/animations/vrma/breakdance1990(2).vrma', name: 'breakdance1990_2_alt' },
  { path: '/animations/vrma/breakdance1990(3).vrma', name: 'breakdance1990_3' },
  // Endings
  { path: '/animations/vrma/breakdanceEnding1.vrma', name: 'breakdanceEnding1' },
  { path: '/animations/vrma/breakdanceEnding2.vrma', name: 'breakdanceEnding2' },
  { path: '/animations/vrma/breakdanceEnding3.vrma', name: 'breakdanceEnding3' },
  // Footwork
  { path: '/animations/vrma/breakdanceFootwork1.vrma', name: 'breakdanceFootwork1' },
  { path: '/animations/vrma/breakdanceFootwork2.vrma', name: 'breakdanceFootwork2' },
  { path: '/animations/vrma/breakdanceFootwork3.vrma', name: 'breakdanceFootwork3' },
  { path: '/animations/vrma/breakdanceFootworkToFreeze.vrma', name: 'breakdanceFootworkToFreeze' },
  // Freezes
  { path: '/animations/vrma/breakdanceFreezes.vrma', name: 'breakdanceFreezes' },
  { path: '/animations/vrma/breakdanceFreezeVar1.vrma', name: 'breakdanceFreezeVar1' },
  { path: '/animations/vrma/breakdanceFreezeVar2.vrma', name: 'breakdanceFreezeVar2' },
  { path: '/animations/vrma/breakdanceFreezeVar3.vrma', name: 'breakdanceFreezeVar3' },
  { path: '/animations/vrma/breakdanceFreezeVar4.vrma', name: 'breakdanceFreezeVar4' },
  // Ready poses
  { path: '/animations/vrma/breakdanceReady.vrma', name: 'breakdanceReady' },
  { path: '/animations/vrma/breakdanceReady(2).vrma', name: 'breakdanceReady_2' },
  { path: '/animations/vrma/breakdanceReady(3).vrma', name: 'breakdanceReady_3' },
  // Swipes & Uprock
  { path: '/animations/vrma/breakdanceSwipes.vrma', name: 'breakdanceSwipes' },
  { path: '/animations/vrma/breakdanceUprock.vrma', name: 'breakdanceUprock' },
  { path: '/animations/vrma/breakdanceUprock(2).vrma', name: 'breakdanceUprock_2' },
  { path: '/animations/vrma/breakdanceUprockToGround.vrma', name: 'breakdanceUprockToGround' },
  { path: '/animations/vrma/breakdanceUprockToGround(2).vrma', name: 'breakdanceUprockToGround_2' },
  { path: '/animations/vrma/breakdanceUprockVar1.vrma', name: 'breakdanceUprockVar1' },
  { path: '/animations/vrma/breakdanceUprockVar1End.vrma', name: 'breakdanceUprockVar1End' },
  { path: '/animations/vrma/breakdanceUprockVar1Start.vrma', name: 'breakdanceUprockVar1Start' },
  { path: '/animations/vrma/breakdanceUprockVar2.vrma', name: 'breakdanceUprockVar2' },
  // Other breakdance moves
  { path: '/animations/vrma/brooklynUprock.vrma', name: 'brooklynUprock' },
  { path: '/animations/vrma/crosslegFreeze.vrma', name: 'crosslegFreeze' },
  { path: '/animations/vrma/flair.vrma', name: 'flair' },
  { path: '/animations/vrma/flair(2).vrma', name: 'flair_2' },
  { path: '/animations/vrma/flair(3).vrma', name: 'flair_3' },
];

// Combined list of all animations
export const VRMA_ANIMATIONS: VRMAAnimationConfig[] = [
  ...VRMA_CORE_ANIMATIONS,
  ...VRMA_EXTENDED_ANIMATIONS,
  ...VRMA_GESTURE_ANIMATIONS,
  ...VRMA_BREAKDANCE_ANIMATIONS,
];

// Map application animation states to VRMA animations
export const ANIMATION_STATE_TO_VRMA: Record<string, string> = {
  'idle': 'modelPose',      // Use model pose for idle
  'talking': 'talking',    // Use talking for talking
  'thinking': 'thinking',        // Use thinking for thinking
  'happy': 'happyIdle',         // Use happyIdle sign for happy
  'agreeing': 'headNod',    // Head nod for agreeing
  'disagreeing': 'shakingHeadNo', // Shake head for disagreeing
  'angry': 'angryGesture',  // Angry gesture
  'cocky': 'beingCocky',    // Cocky pose
  'relieved': 'relievedSigh', // Relieved sigh
  'annoyed': 'annoyedHeadShake', // Annoyed head shake
  'sitting': 'sitting',        // Use sitting for sitting
};

/**
 * VRMA Animation Service (Refactored)
 *
 * Facade that orchestrates VRMA animation loading, caching, and retargeting.
 * Uses dependency injection for the specialized services.
 */
class VRMAAnimationService {
  // Track loading states for animations
  private loadingStates: Map<string, 'idle' | 'loading' | 'loaded' | 'error'> = new Map();
  // Track failed animations for retry logic
  private failedAnimations: Map<string, { count: number; lastError: string }> = new Map();
  // Maximum retries for failed animations
  private readonly MAX_RETRIES = 3;

  // Lazy-loaded services via DI
  private get loader(): IVRMALoaderService {
    return getContainer().resolve<IVRMALoaderService>(SERVICE_TOKENS.VRMA_LOADER);
  }

  private get cache(): IVMACacheService {
    return getContainer().resolve<IVMACacheService>(SERVICE_TOKENS.VRMA_CACHE);
  }

  private get retargeting(): IVMARetargetingService {
    return getContainer().resolve<IVMARetargetingService>(SERVICE_TOKENS.VRMA_RETARGETING);
  }

  /**
   * Load a single VRMA animation file
   * @param config The VRMA animation configuration
   * @returns Promise resolving to loaded animation
   */
  async loadAnimation(config: VRMAAnimationConfig): Promise<VRMAAnimation> {
    // Check cache first
    const cached = this.cache.getAnimation(config.name);
    if (cached) {
      return cached;
    }

    // Load via loader service
    const animation = await this.loader.loadAnimation(config);
    
    // Cache result
    this.cache.setAnimation(config.name, animation);
    
    return animation;
  }

  /**
   * Load all available VRMA animations
   * Gracefully handles missing files - loads only animations that exist
   * @param coreOnly If true, only load core animations (faster startup)
   * @returns Promise resolving to a map of animation names to animations
   */
  async loadAllAnimations(coreOnly = false): Promise<Map<string, VRMAAnimation>> {
    const animationsToLoad = coreOnly ? VRMA_CORE_ANIMATIONS : VRMA_ANIMATIONS;
    
    // Load via loader service
    const animations = await this.loader.loadAnimations(animationsToLoad);
    
    // Cache all loaded animations
    for (const [name, animation] of animations.entries()) {
      this.cache.setAnimation(name, animation);
    }
    
    return animations;
  }

  /**
   * Load only core animations (faster, guaranteed to exist)
   * @returns Promise resolving to a map of animation names to animations
   */
  async loadCoreAnimations(): Promise<Map<string, VRMAAnimation>> {
    return this.loadAllAnimations(true);
  }

  /**
   * Get a loaded animation by name
   * @param name The animation name
   * @returns The animation or undefined if not found
   */
  getAnimation(name: string): VRMAAnimation | undefined {
    return this.cache.getAnimation(name);
  }

  /**
   * Get a VRMA animation for a specific application state
   * @param state The application state (idle, talking, thinking, happy)
   * @returns The VRMA animation or undefined if not found
   */
  getAnimationForState(state: string): VRMAAnimation | undefined {
    const vrmaName = ANIMATION_STATE_TO_VRMA[state];
    if (!vrmaName) {
      console.warn(`No VRMA mapping for state: ${state}`);
      return undefined;
    }
    return this.getAnimation(vrmaName);
  }

  /**
   * Check if an animation is loaded
   * @param name The animation name
   * @returns True if animation is loaded
   */
  isLoaded(name: string): boolean {
    return this.cache.hasAnimation(name);
  }

  /**
   * Get all loaded animation names
   * @returns Array of loaded animation names
   */
  getLoadedAnimationNames(): string[] {
    return this.cache.getAnimationNames ? this.cache.getAnimationNames() : [];
  }

  /**
   * Get or create a retargeted animation clip for a specific model
   * @param vrmAnimation The VRM animation data
   * @param vrm The VRM model instance
   * @param modelId The model ID for caching
   * @param animationName The animation name for caching
   * @param layer Optional animation layer for bone masking
   * @returns The retargeted animation clip
   */
  getOrCreateRetargetedClip(
    vrmAnimation: unknown,
    vrm: unknown,
    modelId: string,
    animationName: string,
    layer?: AnimationLayerType
  ): unknown {
    return this.retargeting.createRetargetedClip(
      vrmAnimation,
      vrm,
      modelId,
      animationName,
      layer
    );
  }

  /**
   * Check if a retargeted clip exists in cache
   * @param modelId The model ID
   * @param animationName The animation name
   * @param layer Optional animation layer
   * @returns True if cached
   */
  hasRetargetedClip(modelId: string, animationName: string, layer?: AnimationLayerType): boolean {
    return this.retargeting.hasRetargetedClip(modelId, animationName, layer);
  }

  /**
   * Clear all loaded animations
   */
  clear(): void {
    this.cache.clear();
    this.loadingStates.clear();
    this.failedAnimations.clear();
  }

  /**
   * Get number of loaded animations
   */
  getLoadedCount(): number {
    return this.cache.getAnimationCount();
  }

  /**
   * Check if an animation is currently loading
   */
  isLoading(name: string): boolean {
    return this.loadingStates.get(name) === 'loading';
  }

  /**
   * Get loading state for an animation
   */
  getLoadingState(name: string): 'idle' | 'loading' | 'loaded' | 'error' {
    return this.loadingStates.get(name) || 'idle';
  }

  /**
   * Get fallback animation for a given animation name
   */
  getFallbackAnimation(animationName: string): string {
    return animationPriorityService.getFallbackAnimation(animationName);
  }

  /**
   * Clear retargeted clips for a specific model
   */
  clearRetargetedClipsForModel(modelId: string): void {
    this.retargeting.clearCacheForModel(modelId);
  }
}

// Export singleton instance for backward compatibility
export const vrmaAnimationService = new VRMAAnimationService();
export default vrmaAnimationService;
