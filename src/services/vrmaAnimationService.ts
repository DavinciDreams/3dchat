import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMAnimationLoaderPlugin } from '@pixiv/three-vrm-animation';
import { createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import {
  CRITICAL_ANIMATIONS,
  HIGH_PRIORITY_ANIMATIONS,
  getFallbackAnimation,
  getAnimationTier,
  type AnimationPriority,
} from '../config/animationPriorities';
import type { AnimationLayerType } from '../types';
import { maskAnimationClip } from '../utils/animationMasking';

/**
 * VRMA Animation Service
 * Handles loading and management of VRMA animation files
 * Supports lazy loading with priority tiers
 */

export interface VRMAAnimation {
  name: string;
  clip: THREE.AnimationClip;
  vrmAnimation: unknown; // The raw VRM animation data for retargeting
}

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
// These are the actual converted animations available
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
  { path: '/animations/vrma/centerBlock.vrma', name: 'centerBlock', description: 'Center block defense' },
  { path: '/animations/vrma/catch.vrma', name: 'catch', description: 'Catch something' },
  { path: '/animations/vrma/snatch.vrma', name: 'snatch', description: 'Snatch grab' },
  { path: '/animations/vrma/reloading.vrma', name: 'reloading', description: 'Reload weapon' },
  { path: '/animations/vrma/standing2HMagicAttack01.vrma', name: 'magicCast', description: 'Cast magic spell' },

  // Movement
  { path: '/animations/vrma/walking.vrma', name: 'walking', description: 'Walking in place' },
  { path: '/animations/vrma/slowJogBackwards.vrma', name: 'jogBackwards', description: 'Jog backwards' },
  { path: '/animations/vrma/jumping.vrma', name: 'jumping', description: 'Jump in place' },
  { path: '/animations/vrma/climbingToTop.vrma', name: 'climbing', description: 'Climbing up' },
  { path: '/animations/vrma/standToCover.vrma', name: 'takeCover', description: 'Take cover' },
  { path: '/animations/vrma/zombieStandUp.vrma', name: 'zombieStandUp', description: 'Zombie stand up' },
  { path: '/animations/vrma/startPlank.vrma', name: 'plank', description: 'Plank exercise' },
  { path: '/animations/vrma/openingDoorInwards.vrma', name: 'openDoor', description: 'Open door' },
  { path: '/animations/vrma/unarmedTurnLeft90.vrma', name: 'turnLeft', description: 'Turn left 90 degrees' },
  { path: '/animations/vrma/rightTurnWBriefcase.vrma', name: 'turnRight', description: 'Turn right with briefcase' },

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
  { path: '/animations/vrma/catwalkWalkStopTwistR.vrma', name: 'catwalkWalkStopTwistR', description: 'Catwalk stop twist' },
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
  { path: '/animations/vrma/golfPuttVictory.vrma', name: 'golfPuttVictory', description: 'Golf putt victory' },
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
  { path: '/animations/vrma/lyingDown.vrma', name: 'lyingDown', description: 'Lying down' },
  { path: '/animations/vrma/militarySignaling.vrma', name: 'militarySignaling', description: 'Military signaling' },
  { path: '/animations/vrma/nervouslyLookAround.vrma', name: 'nervouslyLookAround', description: 'Nervously look around' },
  { path: '/animations/vrma/ninjaIdle.vrma', name: 'ninjaIdle', description: 'Ninja idle' },
  { path: '/animations/vrma/pacingAndTalkingOnAPhone.vrma', name: 'pacingAndTalkingOnAPhone', description: 'Pacing and talking on phone' },
  { path: '/animations/vrma/paddling.vrma', name: 'paddling', description: 'Paddling' },
  { path: '/animations/vrma/patting.vrma', name: 'patting', description: 'Patting' },
  { path: '/animations/vrma/pettingAnimal.vrma', name: 'pettingAnimal', description: 'Petting animal' },
  { path: '/animations/vrma/petting.vrma', name: 'petting', description: 'Petting' },
  { path: '/animations/vrma/pianoPlaying.vrma', name: 'pianoPlaying', description: 'Piano playing' },
  { path: '/animations/vrma/playingDrums.vrma', name: 'playingDrums', description: 'Playing drums' },
  { path: '/animations/vrma/playingTheViolin.vrma', name: 'playingTheViolin', description: 'Playing violin' },
  { path: '/animations/vrma/plotting.vrma', name: 'plotting', description: 'Plotting' },
  { path: '/animations/vrma/pointing.vrma', name: 'pointing', description: 'Pointing' },
  { path: '/animations/vrma/praying.vrma', name: 'praying', description: 'Praying' },
  { path: '/animations/vrma/pushStart.vrma', name: 'pushStart', description: 'Push start' },
  { path: '/animations/vrma/push.vrma', name: 'push', description: 'Push' },
  { path: '/animations/vrma/roar.vrma', name: 'roar', description: 'Roar' },
  { path: '/animations/vrma/rumbaDancing.vrma', name: 'rumbaDancing', description: 'Rumba dancing' },
  { path: '/animations/vrma/rummaging.vrma', name: 'rummaging', description: 'Rummaging' },
  { path: '/animations/vrma/runningUpStairs.vrma', name: 'runningUpStairs', description: 'Running up stairs' },
  { path: '/animations/vrma/sadIdle.vrma', name: 'sadIdle', description: 'Sad idle' },
  { path: '/animations/vrma/sadWalk.vrma', name: 'sadWalk', description: 'Sad walk' },
  { path: '/animations/vrma/sambaDancing.vrma', name: 'sambaDancing', description: 'Samba dancing' },
  { path: '/animations/vrma/searchingPockets.vrma', name: 'searchingPockets', description: 'Searching pockets' },
  { path: '/animations/vrma/sexyauton2.temp2169616280.vrma', name: 'sexyauton2.temp2169616280', description: 'Temp file' },
  { path: '/animations/vrma/shakingHands1.vrma', name: 'shakingHands1', description: 'Shaking hands' },
  { path: '/animations/vrma/shrugging.vrma', name: 'shrugging', description: 'Shrugging' },
  { path: '/animations/vrma/sillyDancing.vrma', name: 'sillyDancing', description: 'Silly dancing' },
  { path: '/animations/vrma/singing_1.vrma', name: 'singing_1', description: 'Singing variation' },
  { path: '/animations/vrma/sitToStand.vrma', name: 'sitToStand', description: 'Sit to stand' },
  { path: '/animations/vrma/sittingClap.vrma', name: 'sittingClap', description: 'Sitting clap' },
  { path: '/animations/vrma/sittingDisapproval.vrma', name: 'sittingDisapproval', description: 'Sitting disapproval' },
  { path: '/animations/vrma/sittingTalking.vrma', name: 'sittingTalking', description: 'Sitting talking' },
  { path: '/animations/vrma/sitting.vrma', name: 'sitting', description: 'Sitting' },
  { path: '/animations/vrma/situps.vrma', name: 'situps', description: 'Situps' },
  { path: '/animations/vrma/skateboarding.vrma', name: 'skateboarding', description: 'Skateboarding' },
  { path: '/animations/vrma/smoking.vrma', name: 'smoking', description: 'Smoking' },
  { path: '/animations/vrma/sneakingForward.vrma', name: 'sneakingForward', description: 'Sneaking forward' },
  { path: '/animations/vrma/sneakyWalking.vrma', name: 'sneakyWalking', description: 'Sneaky walking' },
  { path: '/animations/vrma/standToSit.vrma', name: 'standToSit', description: 'Stand to sit' },
  { path: '/animations/vrma/standardRun.vrma', name: 'standardRun', description: 'Standard run' },
  { path: '/animations/vrma/standingArguing.vrma', name: 'standingArguing', description: 'Standing arguing' },
  { path: '/animations/vrma/standingClap.vrma', name: 'standingClap', description: 'Standing clap' },
  { path: '/animations/vrma/standingGreeting.vrma', name: 'standingGreeting', description: 'Standing greeting' },
  { path: '/animations/vrma/standingJump.vrma', name: 'standingJump', description: 'Standing jump' },
  { path: '/animations/vrma/startClimbingLadder.vrma', name: 'startClimbingLadder', description: 'Start climbing ladder' },
  { path: '/animations/vrma/startWalking.vrma', name: 'startWalking', description: 'Start walking' },
  { path: '/animations/vrma/strongGesture.vrma', name: 'strongGesture', description: 'Strong gesture' },
  { path: '/animations/vrma/swimming.vrma', name: 'swimming', description: 'Swimming' },
  { path: '/animations/vrma/talking.vrma', name: 'talking', description: 'Talking' },
  { path: '/animations/vrma/textingAndWalking.vrma', name: 'textingAndWalking', description: 'Texting and walking' },
  { path: '/animations/vrma/thinking.vrma', name: 'thinking', description: 'Thinking' },
  { path: '/animations/vrma/throwing.vrma', name: 'throwing', description: 'Throwing' },
  { path: '/animations/vrma/twistDance.vrma', name: 'twistDance', description: 'Twist dance' },
  { path: '/animations/vrma/typing.vrma', name: 'typing', description: 'Typing' },
  { path: '/animations/vrma/vaultOverBox.vrma', name: 'vaultOverBox', description: 'Vault over box' },
  { path: '/animations/vrma/victoryIdle.vrma', name: 'victoryIdle', description: 'Victory idle' },
  { path: '/animations/vrma/victory.vrma', name: 'victory', description: 'Victory' },
  { path: '/animations/vrma/waving.vrma', name: 'waving', description: 'Waving' },
  { path: '/animations/vrma/yawn.vrma', name: 'yawn', description: 'Yawn' },
  { path: '/animations/vrma/yelling.vrma', name: 'yelling', description: 'Yelling' },
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
  { path: '/animations/vrma/acknowledging.vrma', name: 'acknowledging', description: 'Acknowledging gesture' },

  // Emotional expressions
  { path: '/animations/vrma/angryGesture.vrma', name: 'angryGesture', description: 'Angry gesture' },
  { path: '/animations/vrma/beingCocky.vrma', name: 'beingCocky', description: 'Cocky pose' },
  { path: '/animations/vrma/relievedSigh.vrma', name: 'relievedSigh', description: 'Relieved sigh' },
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
  'acknowledging': 'acknowledging', // Acknowledging gesture
  'angry': 'angryGesture',  // Angry gesture
  'cocky': 'beingCocky',    // Cocky pose
  'relieved': 'relievedSigh', // Relieved sigh
  'annoyed': 'annoyedHeadShake', // Annoyed head shake
};

class VRMAAnimationService {
  private loader: GLTFLoader;
  private loadedAnimations: Map<string, VRMAAnimation> = new Map();
  private loadingPromises: Map<string, Promise<VRMAAnimation>> = new Map();
  // Cache for retargeted animation clips keyed by modelId + animationName
  private retargetedClipCache: Map<string, THREE.AnimationClip> = new Map();
  // Track failed animations for retry logic
  private failedAnimations: Map<string, { count: number; lastError: string }> = new Map();
  // Track loading states for animations
  private loadingStates: Map<string, 'idle' | 'loading' | 'loaded' | 'error'> = new Map();
  // Maximum retries for failed animations
  private readonly MAX_RETRIES = 3;

  constructor() {
    this.loader = new GLTFLoader();
    this.loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
  }

  /**
   * Load a single VRMA animation file
   * @param config The VRMA animation configuration
   * @returns Promise resolving to loaded animation
   */
  async loadAnimation(config: VRMAAnimationConfig): Promise<VRMAAnimation> {
    // Return cached animation if already loaded
    if (this.loadedAnimations.has(config.name)) {
      return this.loadedAnimations.get(config.name)!;
    }

    // Return existing loading promise if in progress
    if (this.loadingPromises.has(config.name)) {
      return this.loadingPromises.get(config.name)!;
    }

    // Create new loading promise
    const promise = this.loader
      .loadAsync(config.path)
      .then((gltf) => {
        // VRMA files contain animation data in userData.vrmAnimations
        const vrmAnimations = (gltf.userData as { vrmAnimations?: unknown[] }).vrmAnimations;
        
        if (!vrmAnimations || vrmAnimations.length === 0) {
          throw new Error(`No VRM animations found in VRMA file: ${config.path}`);
        }

        // Use first VRM animation from VRMA file
        const vrmAnimation = vrmAnimations[0];
        const animation: VRMAAnimation = {
          name: config.name,
          clip: gltf.animations[0], // Keep raw clip for reference
          vrmAnimation: vrmAnimation, // Store VRM animation data for retargeting
        };

        this.loadedAnimations.set(config.name, animation);
        this.loadingPromises.delete(config.name);
        
        return animation;
      })
      .catch((error) => {
        this.loadingPromises.delete(config.name);
        throw new Error(`Failed to load VRMA animation ${config.name}: ${error.message}`);
      });

    this.loadingPromises.set(config.name, promise);
    return promise;
  }

  /**
   * Load all available VRMA animations
   * Gracefully handles missing files - loads only animations that exist
   * @param coreOnly If true, only load core animations (faster startup)
   * @returns Promise resolving to a map of animation names to animations
   */
  async loadAllAnimations(coreOnly = false): Promise<Map<string, VRMAAnimation>> {
    const animationsToLoad = coreOnly ? VRMA_CORE_ANIMATIONS : VRMA_ANIMATIONS;
    
    const results = await Promise.allSettled(
      animationsToLoad.map((config) => this.loadAnimation(config))
    );

    let loadedCount = 0;
    let failedCount = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        loadedCount++;
      } else {
        failedCount++;
        // Don't log errors for extended animations that don't exist yet
        if (!coreOnly) {
          console.debug(`Animation not available: ${animationsToLoad[index].name}`);
        }
      }
    });

    console.log(`Loaded ${loadedCount} animations (${failedCount} not available)`);
    return this.loadedAnimations;
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
    return this.loadedAnimations.get(name);
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
    return this.loadedAnimations.has(name);
  }

  /**
   * Get all loaded animation names
   * @returns Array of loaded animation names
   */
  getLoadedAnimationNames(): string[] {
    return Array.from(this.loadedAnimations.keys());
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
  ): THREE.AnimationClip {
    const cacheKey = `${modelId}_${animationName}_${layer || 'full'}`;
    
    // Check cache first
    if (this.retargetedClipCache.has(cacheKey)) {
      return this.retargetedClipCache.get(cacheKey)!;
    }
    
    // Create new retargeted clip
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let retargetedClip = createVRMAnimationClip(vrmAnimation as any, vrm as any);
    
    // Apply bone masking if layer is specified
    if (layer) {
      retargetedClip = maskAnimationClip(retargetedClip, layer);
    }
    
    // Cache result
    this.retargetedClipCache.set(cacheKey, retargetedClip);
    
    return retargetedClip;
  }

  /**
   * Check if a retargeted clip exists in cache
   * @param modelId The model ID
   * @param animationName The animation name
   * @param layer Optional animation layer
   * @returns True if cached
   */
  hasRetargetedClip(modelId: string, animationName: string, layer?: AnimationLayerType): boolean {
    const cacheKey = `${modelId}_${animationName}_${layer || 'full'}`;
    return this.retargetedClipCache.has(cacheKey);
  }

  /**
   * Clear all loaded animations
   */
  clear(): void {
    this.loadedAnimations.clear();
    this.loadingPromises.clear();
    this.retargetedClipCache.clear();
  }

  /**
   * Clear retargeted clips for a specific model
   * @param modelId The model ID to clear clips for
   */
  clearRetargetedClipsForModel(modelId: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.retargetedClipCache.keys()) {
      // Match keys starting with modelId (handles new format: modelId_animName_layer)
      if (key.startsWith(`${modelId}_`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.retargetedClipCache.delete(key));
  }

  /**
   * Get number of loaded animations
   * @returns The count of loaded animations
   */
  getLoadedCount(): number {
    return this.loadedAnimations.size;
  }

  /**
   * Check if an animation is currently loading
   * @param name The animation name
   * @returns True if animation is currently loading
   */
  isLoading(name: string): boolean {
    return this.loadingPromises.has(name);
  }

  /**
   * Get loading state for an animation
   * @param name The animation name
   * @returns The loading state
   */
  getLoadingState(name: string): 'idle' | 'loading' | 'loaded' | 'error' {
    return this.loadingStates.get(name) || 'idle';
  }

  /**
   * Get fallback animation for a given animation name
   * @param animationName The animation name
   * @returns The fallback animation name
   */
  getFallbackAnimation(animationName: string): string {
    return getFallbackAnimation(animationName);
  }

  /**
   * Load CRITICAL tier animations synchronously
   * These animations are required for basic avatar functionality
   * @returns Promise resolving when all critical animations are loaded
   */
  async loadCriticalAnimations(): Promise<void> {
    console.log(`%c🚀 [VRMAAnimationService] Loading ${CRITICAL_ANIMATIONS.length} CRITICAL animations...`, 'color: #e74c3c; font-weight: bold;');

    const results = await Promise.allSettled(
      CRITICAL_ANIMATIONS.map(name => {
        const config = VRMA_ANIMATIONS.find(a => a.name === name);
        if (!config) {
          console.warn(`CRITICAL animation config not found: ${name}`);
          return Promise.reject(new Error(`Config not found: ${name}`));
        }
        return this.loadAnimationWithRetry(config);
      })
    );

    let loadedCount = 0;
    let failedCount = 0;

    results.forEach((result, index) => {
      const animName = CRITICAL_ANIMATIONS[index];
      if (result.status === 'fulfilled') {
        loadedCount++;
        this.loadingStates.set(animName, 'loaded');
      } else {
        failedCount++;
        this.loadingStates.set(animName, 'error');
        console.warn(`Failed to load CRITICAL animation: ${animName}`, result.reason);
      }
    });

    console.log(`%c✅ [VRMAAnimationService] Loaded ${loadedCount}/${CRITICAL_ANIMATIONS.length} CRITICAL animations (${failedCount} failed)`, 'color: #27ae60; font-weight: bold;');
  }

  /**
   * Load HIGH priority animations in background batches
   * These animations are frequently used but not critical for initial load
   * @returns Promise resolving when all high priority animations are loaded
   */
  async loadHighPriorityAnimations(): Promise<void> {
    console.log(`%c🔄 [VRMAAnimationService] Starting background load of ${HIGH_PRIORITY_ANIMATIONS.length} HIGH priority animations...`, 'color: #f39c12; font-weight: bold;');

    const batchSize = 5;
    const batches: string[][] = [];

    // Split into batches
    for (let i = 0; i < HIGH_PRIORITY_ANIMATIONS.length; i += batchSize) {
      batches.push(HIGH_PRIORITY_ANIMATIONS.slice(i, i + batchSize));
    }

    let loadedCount = 0;
    let failedCount = 0;

    // Load batches sequentially with small delays
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`%c📦 [VRMAAnimationService] Loading HIGH priority batch ${batchIndex + 1}/${batches.length} (${batch.length} animations)...`, 'color: #3498db;');

      const results = await Promise.allSettled(
        batch.map(name => {
          const config = VRMA_ANIMATIONS.find(a => a.name === name);
          if (!config) {
            console.warn(`HIGH priority animation config not found: ${name}`);
            return Promise.reject(new Error(`Config not found: ${name}`));
          }
          return this.loadAnimationWithRetry(config);
        })
      );

      results.forEach((result) => {
        const animName = batch[results.indexOf(result)];
        if (result.status === 'fulfilled') {
          loadedCount++;
          this.loadingStates.set(animName, 'loaded');
        } else {
          failedCount++;
          this.loadingStates.set(animName, 'error');
          // Log but don't fail whole batch
          console.debug(`Failed to load HIGH priority animation: ${animName}`);
        }
      });

      // Small delay between batches to avoid overwhelming system
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`%c✅ [VRMAAnimationService] Background load complete: ${loadedCount}/${HIGH_PRIORITY_ANIMATIONS.length} HIGH priority animations loaded (${failedCount} failed)`, 'color: #27ae60; font-weight: bold;');
  }

  /**
   * Load an animation with retry logic and exponential backoff
   * @param config The VRMA animation configuration
   * @param retryCount Current retry attempt (default: 0)
   * @returns Promise resolving to loaded animation
   */
  private async loadAnimationWithRetry(
    config: VRMAAnimationConfig,
    retryCount = 0
  ): Promise<VRMAAnimation> {
    const animationName = config.name;

    // Check if animation is permanently failed
    const failedInfo = this.failedAnimations.get(animationName);
    if (failedInfo && failedInfo.count >= this.MAX_RETRIES) {
      console.warn(`Animation ${animationName} permanently failed after ${this.MAX_RETRIES} retries`);
      throw new Error(`Animation ${animationName} failed permanently`);
    }

    // Set loading state
    this.loadingStates.set(animationName, 'loading');

    try {
      const animation = await this.loadAnimation(config);
      // Clear failure info on success
      this.failedAnimations.delete(animationName);
      return animation;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Animation load failed: ${animationName} (attempt ${retryCount + 1}/${this.MAX_RETRIES})`, errorMessage);

      // Track failure
      const currentFailures = (failedInfo?.count || 0) + 1;
      this.failedAnimations.set(animationName, {
        count: currentFailures,
        lastError: errorMessage
      });

      // Retry with exponential backoff
      if (retryCount < this.MAX_RETRIES) {
        const backoffDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(`Retrying ${animationName} in ${backoffDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return this.loadAnimationWithRetry(config, retryCount + 1);
      }

      // Max retries exceeded
      this.loadingStates.set(animationName, 'error');
      throw new Error(`Failed to load animation ${animationName} after ${this.MAX_RETRIES} retries`);
    }
  }

  /**
   * Load an animation on-demand with fallback support
   * @param animationName The animation name to load
   * @returns Promise resolving to loaded animation
   */
  async loadAnimationOnDemand(animationName: string): Promise<VRMAAnimation> {
    // Check if already loaded
    if (this.loadedAnimations.has(animationName)) {
      return this.loadedAnimations.get(animationName)!;
    }

    // Check if currently loading
    if (this.loadingPromises.has(animationName)) {
      console.log(`Animation ${animationName} is already loading, waiting...`);
      return this.loadingPromises.get(animationName)!;
    }

    // Find config
    const config = VRMA_ANIMATIONS.find(a => a.name === animationName);
    if (!config) {
      throw new Error(`Animation config not found: ${animationName}`);
    }

    // Load with retry logic
    try {
      return await this.loadAnimationWithRetry(config);
    } catch (error) {
      console.error(`Failed to load animation on-demand: ${animationName}`, error);
      throw error;
    }
  }

  /**
   * Get failed animations information
   * @returns Map of failed animations with failure counts
   */
  getFailedAnimations(): Map<string, { count: number; lastError: string }> {
    return new Map(this.failedAnimations);
  }

  /**
   * Reset failure tracking for an animation (useful for retrying after network issues)
   * @param animationName The animation name to reset
   */
  resetFailureTracking(animationName: string): void {
    this.failedAnimations.delete(animationName);
    this.loadingStates.delete(animationName);
  }

  /**
   * Clear all failure tracking
   */
  clearFailureTracking(): void {
    this.failedAnimations.clear();
  }
}

// Export singleton instance
export const vrmaAnimationService = new VRMAAnimationService();

// Export types and utilities
export default vrmaAnimationService;
