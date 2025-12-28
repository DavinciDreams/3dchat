import axios from 'axios';
import { AnimationJudgment, AnimationTrigger, AVAILABLE_ANIMATIONS } from '../types';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
// Use a fast, cheap model for the judge - falls back to same model if not specified
const JUDGE_MODEL = import.meta.env.VITE_ANIMATION_JUDGE_MODEL || 'openai/gpt-4.1-mini';

const SYSTEM_PROMPT = `You are an animation director for a 3D avatar. Given a conversation exchange, decide which animations the avatar should perform while speaking its response.

Available animations by category:

CORE ANIMATIONS:
- peace: Peace sign/victory pose - use for success, positivity, celebration
- shoot: Finger guns/shooting gesture - use for playful pointing, "gotcha", cool moments
- spin: A playful spinning/twirling motion - use for fun, excitement, showing off
- modelPose: Idle standing pose - use for neutral moments
- thinking: Thinking - use for contemplation

GREETINGS:
- standingGreeting: Standing greeting - use for formal greeting
- waving: Waving - use for greeting or farewell
- greeting: Waving hello gesture - use for hellos, goodbyes, friendly acknowledgment
- shakingHands1: Shaking hands - use for greeting or agreement
- entry: Entry - use for entering scene


IDLE & SOCIAL:
- idle: Default standing pose
- weightShift: Shifting weight between feet - use for subtle idle variation
- talkingOnPhone: Talking on phone animation
- lookAround: Looking around - use for searching/observing
- talking: Talking - use for conversation

TRANSITIONAL POSES:
- sitToStand: Sit to stand transition - use for getting up
- standToSit: Stand to sit transition - use for sitting down
- gettingUp: Getting up - use for standing up
- crouchToStand: Crouch to stand - use for getting up
- startWalking: Start walking - use for beginning movement
- squat: Bending down/crouching motion - use for exercising, hiding, getting low
- jumpingDown: Jumping down - use for dropping/jumping down

DANCE & CELEBRATION:
- hipHopDance: Hip hop dance moves - use for dancing or celebration
- swinging: Swinging motion - use for playful swinging
- catwalk: Catwalk strut - use for showing off or fashion

BREAKDANCE:
- breakdance1990: 1990 spin - use for breakdance power moves
- breakdance1990_2: Alternative 1990 spin
- breakdance1990_2_alt: Alternative 1990 spin variation
- breakdance1990_3: Another 1990 spin variation
- breakdanceEnding1: Breakdance ending pose 1
- breakdanceEnding2: Breakdance ending pose 2
- breakdanceEnding3: Breakdance ending pose 3
- breakdanceFootwork1: Breakdance footwork pattern 1
- breakdanceFootwork2: Breakdance footwork pattern 2
- breakdanceFootwork3: Breakdance footwork pattern 3
- breakdanceFootworkToFreeze: Footwork transitioning to freeze
- breakdanceFreezes: Breakdance freeze poses
- breakdanceFreezeVar1: Freeze variation 1
- breakdanceFreezeVar2: Freeze variation 2
- breakdanceFreezeVar3: Freeze variation 3
- breakdanceFreezeVar4: Freeze variation 4
- breakdanceReady: Breakdance ready stance
- breakdanceReady_2: Alternative ready stance
- breakdanceReady_3: Another ready stance
- breakdanceSwipes: Breakdance swipes
- breakdanceUprock: Breakdance uprock
- breakdanceUprock_2: Alternative uprock
- breakdanceUprockToGround: Uprock to ground transition
- breakdanceUprockToGround_2: Alternative ground transition
- breakdanceUprockVar1: Uprock variation 1
- breakdanceUprockVar1End: Uprock variation 1 ending
- breakdanceUprockVar1Start: Uprock variation 1 start
- breakdanceUprockVar2: Uprock variation 2
- brooklynUprock: Brooklyn uprock style
- crosslegFreeze: Crossleg freeze pose
- flair: Breakdance flair move
- flair_2: Alternative flair move
- flair_3: Another flair variation

MARTIAL ARTS:
- punch: Punch forward - use for action or fighting
- dropKick: Drop kick attack - use for aggressive action
- flyingKnee: Flying knee combo - use for martial arts
- ninjaIdle: Ninja idle - use for stealth pose
- kipUp: Kip up - use for martial arts
- bowing: Elbowing - use for fights to throw an elbow strike
- bodyBlock: Body block defense - use for blocking
- centerBlock: Center block defense - use for blocking

COMBAT:
- daggerStab: Double dagger stab - use for weapon attacks
- reloading: Reload weapon - use for gun/weapon context
- magicCast: Cast magic spell - use for magic or power
- takeCover: Take cover - use for hiding or stealth
- aimingGun: Aiming gun - use for shooting context
- salute: Military-style salute - use for playful formality

Locomotion & MOVEMENT:
- walking: Walking in place - use when discussing travel
- jogBackwards: Jog backwards - use for retreating
- jumping: Jump in place - use for excitement or jumping
- climbing: Climbing up - use for climbing context
- turnLeft: Turn left 90 degrees - use for turning
- turnRight: Turn right with briefcase - use for turning
- standardRun: Standard running - use for running
- runningUpStairs: Running up stairs - use for climbing stairs

SPORTS:
- golfBadShot: Golf bad shot reaction - use for golf or frustration
- golfPrePutt: Golf pre-putt stance - use for golf
- golfDrive: Golf drive swing - use for golf
- golfPuttVictory: Golf putt victory celebration - use for golf success
- skateboarding: Skateboarding - use for skating
- defeatIdle: Defeat idle - use for losing/failure
- victory: Victory pose - use for celebration

Exercise & Fitness:
- plank: Plank exercise - use for exercise
- throwing: Throwing - use for throwing objects
- catch: Catch something - use for catching
- situps: Situps - use for exercise
- jumpingJacks: Jumping jacks - use for exercise
- cartwheel: Cartwheel - use for gymnastics
- backflip: Backflip - use for acrobatics
- standingJump: Standing jump - use for jumping

MUSIC & PERFORMANCE:
- guitarPlaying: Playing guitar - use for music performance
- pianoPlaying: Playing piano - use for music performance
- playingDrums: Playing drums - use for music performance
- playingTheViolin: Playing violin - use for music performance
- singing_1: Singing variation - use for music or singing
- singing: Singing animation - use for music or singing

Sneaky/Stealthy Movements:
- lowCrawl: Low crawl - use for stealth/crawling
- sneakingForward: Sneaking forward - use for stealth
- sneakyWalking: Sneaky walking - use for stealth
- lookOverShoulder: Look over shoulder - use for checking behind
- nervouslyLookAround: Nervously looking around - use for anxiety
- plotting: Plotting - use for scheming
- militarySignaling: Military signaling used to communicate silently

SITTING & KNEELING DOWN:
- sitting: Sitting down - use for sitting
- sittingClap: Sitting clap - use for celebration while sitting
- sittingTalking: Sitting and talking - use for conversation
- sittingDisapproval: Sitting disapproval - use for disagreement
- kneeling: Kneeling down - use for kneeling

Affectionate Gestures:
- patting: Patting - use for pat on the back or shoulder
- kissing: Kissing - use for affection
- blowAKiss: Blowing a kiss - use for affection
- shrugging: Shrugging - use for uncertainty or indifference

Animals & Pets:
- pettingAnimal: Petting animal - use for interacting with animals
- petting: Petting - use for showing affection

EMOTIONAL STATES:
- happyIdle: Happy idle - use for happiness
- sadIdle: Sad idle - use for sadness
- sadWalk: Sad walk - use for walking sadly
- cockyHeadTurn: Cocky head turn - use for arrogance
- strongGesture: Muscle flex, strong gesture
- victoryIdle: Victory idle - use for winning/success
- disappointed: Disappointed - use for disappointment
- relievedSigh: Relieved sigh - use for relief, letting go of tension
- bashful: Bashful - use for shyness
- lookAwayGesture: Look away - use for embarrassment, shame, or looking away

SILLY DANCES:
- rumbaDancing: Rumba dancing - use for dancing
- sambaDancing: Samba dancing - use for dancing
- sillyDancing: Silly dancing - use for fun dancing
- hipHopDancing: Hip hop dancing - use for dancing
- dancingTwerk: Dancing twerk - use for dancing
- twistDance: Twist dance - use for dancing

ANGRY & AGGRESSIVE:
- roar: Roar - use for aggressive expression
- yelling: Yelling - use for shouting
- angryGesture: Angry gesture - use for anger, frustration
- beingCocky: Cocky pose - use for arrogance, showing off
- standingArguing: Standing arguing - use for conflict
- angryGesture_1: Angry gesture variation - use for anger
- pacingAndTalkingOnAPhone: Pacing and talking on phone - use for conversation

Object Interaction:
- openDoor: Open door - use for door interactions
- push: Push - use for pushing large objects
- pushStart: Push start - use to begin pushing very large objects
- startClimbingLadder: Start climbing ladder - use for climbing
- vaultOverBox: Vault over box - use for parkour/obstacle
- rummaging: Rummaging - use for searching
- searchingPockets: Searching pockets - use for looking for something
- snatch: Snatch grab - use for grabbing quickly
- fishingCast: Fishing cast - use for fishing
- buttonPushing: Button pushing - use for pressing buttons
- typing: Typing - use for working at computer

Water Activities:
- swimming: Swimming - use for water activities
- floating: Floating - use for floating/levitation
- paddling: Paddling - use for water activities

Bored / Tired Gestures:
- smoking: Smoking - use for smoking
- yawn: Yawn - use for tiredness/boredom
- layingIdle: Laying idle - use for resting
- lyingDown: Lying down - use for lying down
- zombieStandUp: Zombie stand up - use for unsteady standing

GESTURE ANIMATIONS (subtle expressions):
HEAD GESTURES:
- headNod: Simple nod - use for agreement, understanding, yes
- hardHeadNod: Strong nod - use for emphatic agreement
- lengthyHeadNod: Extended nod - use for thoughtful agreement
- sarcasticHeadNod: Sarcastic nod - use for irony or sarcasm
- shakingHeadNo: Shake head no - use for disagreement, refusal
- annoyedHeadShake: Annoyed shake - use for frustration, annoyance
- thoughtfulHeadShake: Thoughtful shake - use for uncertainty, contemplation

HAND GESTURES:
- standingClap: Standing clap - use for celebration
- happyHandGesture: Happy hand gesture - use for joy, celebration
- dismissingGesture: Dismissing wave - use for dismissal, ending topic
- acknowledging: Acknowledging gesture - use for recognition, "I hear you"
- beckoning: Beckoning - use for calling someone over
- pointing: Pointing - use for indicating direction

Rules:
1. Only trigger animations that naturally match what the avatar is saying
2. Can return multiple animations to be played in sequence with delays
3. Return empty array if no animation fits the context
4. Consider the user's request AND the AI's response
5. Be selective - not every response needs an animation (most don't!)
6. If the user explicitly asks for an action (spin, wave, dance, etc), definitely include it
7. Prefer core animations for basic interactions, extended for more specific scenarios`;

const TOOL_DEFINITION = {
  type: 'function',
  function: {
    name: 'trigger_animations',
    description: 'Trigger avatar animations based on conversation context',
    parameters: {
      type: 'object',
      properties: {
        animations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                enum: AVAILABLE_ANIMATIONS,
                description: 'The animation to play'
              },
              delay: {
                type: 'number',
                description: 'Seconds to wait before playing this animation (0 for immediate)'
              }
            },
            required: ['name']
          },
          description: 'List of animations to play in order'
        },
        reasoning: {
          type: 'string',
          description: 'Brief explanation of why these animations were chosen'
        }
      },
      required: ['animations', 'reasoning']
    }
  }
};

/**
 * Calls an LLM to judge which animations should play based on the conversation
 * @param userMessage - The user's message
 * @param aiResponse - The AI's response to the user
 * @returns AnimationJudgment with list of animations and reasoning
 */
export async function judgeAnimations(
  userMessage: string,
  aiResponse: string
): Promise<AnimationJudgment> {
  const startTime = performance.now();

  try {
    console.log('🎬 [AnimationJudge] Analyzing conversation for animations...');

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: JUDGE_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `User said: "${userMessage}"\n\nAI responded: "${aiResponse}"\n\nWhat animations should the avatar perform?`
          }
        ],
        tools: [TOOL_DEFINITION],
        tool_choice: { type: 'function', function: { name: 'trigger_animations' } }
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const elapsed = performance.now() - startTime;
    console.log(`🎬 [AnimationJudge] LLM call took ${elapsed.toFixed(0)}ms`);

    // Extract tool call from response
    const message = response.data.choices[0].message;

    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);

      console.log('%c🎬 [AnimationJudge] Tool call received!', 'background: #ff6b6b; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
      console.log('%c🎬 [AnimationJudge] Raw args:', 'color: #ff6b6b; font-weight: bold;', args);

      // Validate animations are in our allowed list
      const validAnimations: AnimationTrigger[] = args.animations
        .filter((a: AnimationTrigger) => AVAILABLE_ANIMATIONS.includes(a.name as typeof AVAILABLE_ANIMATIONS[number]))
        .map((a: AnimationTrigger) => ({
          name: a.name,
          delay: a.delay || 0
        }));

      console.log('%c🎬 [AnimationJudge] Valid animations:', 'color: #ff6b6b; font-weight: bold;', validAnimations);

      return {
        animations: validAnimations,
        reasoning: args.reasoning || 'No reasoning provided'
      };
    }

    // No tool call in response
    console.log('🎬 [AnimationJudge] No tool call in response');
    return { animations: [], reasoning: 'No animation decision made' };

  } catch (error) {
    console.error('🎬 [AnimationJudge] Error:', error);
    // Don't throw - animation judgment is optional, return empty
    return { animations: [], reasoning: 'Error during animation judgment' };
  }
}

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
const BUFFER_BETWEEN_ANIMATIONS = 500; // Buffer time between animations

/**
 * Process animation queue - schedules animations with their delays
 * @param animations - List of animations with delays
 * @param onPlay - Callback to trigger each animation
 * @param onComplete - Callback when all animations complete
 */
export function processAnimationQueue(
  animations: AnimationTrigger[],
  onPlay: (animationName: string) => void,
  onComplete: () => void
): void {
  if (animations.length === 0) {
    console.log('%c📭 [AnimationQueue] Empty queue, nothing to process', 'color: #95a5a6;');
    onComplete();
    return;
  }

  console.log('%c📋 [AnimationQueue] PROCESSING QUEUE', 'background: #f39c12; color: black; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
  console.log('%c📋 [AnimationQueue] Animations:', 'color: #f39c12; font-weight: bold;', animations);

  let currentIndex = 0;

  const playNext = () => {
    if (currentIndex >= animations.length) {
      // Add buffer before completing to let the last animation finish smoothly
      console.log('%c⏳ [AnimationQueue] Adding buffer before completion...', 'color: #f39c12;');
      setTimeout(() => {
        console.log('%c🎉 [AnimationQueue] ALL ANIMATIONS COMPLETE', 'background: #27ae60; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
        onComplete();
      }, BUFFER_BETWEEN_ANIMATIONS);
      return;
    }

    const animation = animations[currentIndex];
    const animationDelay = (animation.delay || 0) * 1000;
    const animationDuration = ANIMATION_DURATIONS[animation.name] || DEFAULT_ANIMATION_DURATION;

    console.log('%c⏱️ [AnimationQueue] Scheduling "' + animation.name + '" - delay: ' + animationDelay + 'ms, duration: ' + animationDuration + 'ms', 'color: #f39c12;');

    // Wait for the specified delay before playing
    setTimeout(() => {
      console.log('%c▶️ [AnimationQueue] EXECUTING: ' + animation.name + ' (duration: ' + animationDuration + 'ms)', 'background: #e67e22; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 14px;');
      onPlay(animation.name);

      // Wait for animation to complete, then play next
      setTimeout(() => {
        console.log('%c🏁 [AnimationQueue] Animation "' + animation.name + '" finished (' + (currentIndex + 1) + '/' + animations.length + ')', 'color: #27ae60;');
        currentIndex++;
        playNext();
      }, animationDuration);
    }, animationDelay);
  };

  // Start the queue
  playNext();
}
