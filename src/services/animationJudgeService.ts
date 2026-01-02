import { AnimationJudgment, AnimationTrigger, AVAILABLE_ANIMATIONS, AnimationJudgmentWithTiming, ScheduledAnimation, AnimationLayerType } from '../types';
import { getContainer } from '../di';
import type { ILLMClientService, IAnimationSelectionService, IAnimationQueueProcessorService } from '../di/ServiceInterfaces';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
// Use a fast, cheap model for judge - falls back to free model if not specified
const JUDGE_MODEL = import.meta.env.VITE_ANIMATION_JUDGE_MODEL || 'openai/gpt-4o-mini';

const SYSTEM_PROMPT = `You are an animation director for a 3D avatar. Given a conversation exchange, decide which animations avatar should perform to accompany speaking its response.

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

IDLE & SOCIAL:
- idle: Default standing pose
- happyIdle: Happy idle - use for happiness
- sillyDancing: Silly dancing - use for fun dancing
- weightShift: Shifting weight between feet - use for subtle idle variation
- talkingOnPhone: Talking on phone animation
- lookAround: Looking around - use for searching/observing
- talking: Talking - use for conversation
- hipHopDancing: Hip hop dancing - use for dancing

TRANSITIONAL POSES:
- sitToStand: Sit to stand transition - use for getting up
- standToSit: Stand to sit transition - use for sitting down
- gettingUp: Getting up - use for standing up
- crouchToStand: Crouch to stand - use for getting up
- startWalking: Start walking - use for beginning movement
- squat: Bending down/crouching motion - use for exercising, hiding, getting low
- jumpingDown: Jumping down - use for dropping/jumping down

DANCE & CELEBRATION:
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
- breakdanceSwipes: Breakdance swipes
- breakdanceUprock: Breakdance uprock
- breakdanceUprock_2: Alternative uprock
- breakdanceUprockToGround: Uprock to ground transition
- breakdanceUprockVar1: Uprock variation 1
- breakdanceUprockVar1End: Uprock variation 1 ending
- breakdanceUprockVar2: Uprock variation 2
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

Exercise & Fitness:
- plank: Plank exercise - use for exercise
- throwing: Throwing - use for throwing objects
- catch: Catch something - use for catching
- situps: Situps - use for exercise
- jumpingJacks: Jumping jacks - use for exercise
- cartwheel: Cartwheel - use for gymnastics
- backflip: Backflip - use for acrobatics
- standingJump: Standing jump - use for jumping

Music & PERFORMANCE:
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
- patting: Patting - use for pat on back or shoulder
- kissing: Kissing - use for affection
- blowAKiss: Blowing a kiss - use for affection

Animals & Pets:
- pettingAnimal: Petting animal - use for interacting with animals
- petting: Petting - use for showing affection

EMOTIONAL STATES:
- sadIdle: Sad idle - use for sadness
- sadWalk: Sad walk - use for walking sadly
- strongGesture: Muscle flex, strong gesture
- disappointed: Disappointed - use for disappointment
- relievedSigh: Relieved sigh - use for relief, letting go of tension
- bashful: Bashful - use for shyness
- lookAwayGesture: Look away - use for embarrassment, shame, or looking away

SILLY DANCES:
- rumbaDancing: Rumba dancing - use for dancing
- sambaDancing: Samba dancing - use for dancing
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
- buttonPushing: Button pushing - use for pressing buttons
- typing: Typing - use for working at computer

Water Activities:
- swimming: Swimming - use for water activities
- floating: Floating - use for floating/levitation
- paddling: Paddling - use for water activities
- fishingCast: Fishing cast - use for fishing

Bored / Tired Gestures:
- smoking: Smoking - use for smoking
- yawn: Yawn - use for tiredness/boredom
- layingIdle: Laying idle - use for resting
- lyingDown: Lying down - use for lying down
- shrugging: Shrugging - use for uncertainty or indifference
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
- cockyHeadTurn: Cocky head turn - use for arrogance

HAND GESTURES:
- standingClap: Standing clap - use for celebration
- happyHandGesture: Happy hand gesture - use for joy, celebration
- dismissingGesture: Dismissing wave - use for dismissal, ending topic
- acknowledging: Acknowledging gesture - use for recognition, "I hear you"
- beckoning: Beckoning - use for calling someone over
- pointing: Pointing - use for indicating direction

Rules:
1. Only trigger animations that naturally match what is avatar is saying
2. Can return multiple animations to be played in sequence with delays
3. Return empty array if no animation fits the context
4. Consider the user's request AND the AI's response
5. Be selective - not every response needs an animation
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
 * Calls an LLM to judge which animations should play based on conversation
 * @param userMessage - The user's message
 * @param aiResponse - The AI's response to user
 * @returns AnimationJudgment with list of animations and reasoning
 */
export async function judgeAnimations(
  userMessage: string,
  aiResponse: string
): Promise<AnimationJudgment> {
  const startTime = performance.now();

  console.log('%c🎬 [AnimationJudge] FUNCTION ENTRY - judgeAnimations called!', 'background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 14px;');
  console.log('%c🎬 [AnimationJudge] userMessage:', 'color: #e74c3c; font-weight: bold;', userMessage);
  console.log('%c🎬 [AnimationJudge] aiResponse:', 'color: #e74c3c; font-weight: bold;', aiResponse);
  console.log('%c🎬 [AnimationJudge] JUDGE_MODEL:', 'color: #e74c3c; font-weight: bold;', JUDGE_MODEL);
  console.log('%c🎬 [AnimationJudge] OPENROUTER_API_KEY present:', 'color: #e74c3c; font-weight: bold;', !!OPENROUTER_API_KEY);

  try {
    console.log('🎬 [AnimationJudge] Analyzing conversation for animations...');
    console.log('🎬 [AnimationJudge] Input - User message:', userMessage);
    console.log('🎬 [AnimationJudge] Input - AI response:', aiResponse);
    console.log('🎬 [AnimationJudge] Using model:', JUDGE_MODEL);

    const llmClientService = getContainer().resolve<ILLMClientService>('LLM_CLIENT_SERVICE');
    const response = await llmClientService.chat(
      `User said: "${userMessage}"\n\nAI responded: "${aiResponse}"\n\nWhat animations should avatar perform?`
    );

    const elapsed = performance.now() - startTime;
    console.log(`🎬 [AnimationJudge] LLM call took ${elapsed.toFixed(0)}ms`);
    console.log('🎬 [AnimationJudge] API Response status:', response.status);
    console.log('🎬 [AnimationJudge] Full API response:', response.data);

    // Extract tool call from response
    const toolCall = response.data.choices[0].message.tool_calls[0];
    if (!toolCall) {
      console.error('🎬 [AnimationJudge] No tool call in response');
      return { animations: [], reasoning: 'No animation decision made' };
    }

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
  } catch (error) {
    console.error('🎬 [AnimationJudge] ERROR CAUGHT:');
    console.error('🎬 [AnimationJudge] Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('🎬 [AnimationJudge] Error message:', error instanceof Error ? error.message : String(error));
    console.error('🎬 [AnimationJudge] Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    // Don't throw - animation judgment is optional, return empty with detailed reasoning
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      animations: [],
      reasoning: `Error during animation judgment: ${errorMessage}`
    };
  }
}

const BUFFER_BETWEEN_ANIMATIONS = 500; // Buffer time between animations (ms)

/**
 * Process animation queue - schedules animations with their delays
 * @param animations - List of animations with delays
 * @param onPlay - Callback to trigger each animation
 * @param onComplete - Callback when all animations complete
 * @param timeoutTrackingRef - Optional ref to track timeouts for cancellation (FIX #2)
 */
export function processAnimationQueue(
  animations: AnimationTrigger[],
  onPlay: (animationName: string) => void,
  onComplete: () => void,
  timeoutTrackingRef?: React.MutableRefObject<NodeJS.Timeout[]>
): void {
  if (animations.length === 0) {
    console.log('%c📭 [AnimationQueue] Empty queue, nothing to process', 'color: #95a5a6;');
    onComplete();
    return;
  }

  console.log('%c📋 [AnimationQueue] PROCESSING QUEUE', 'background: #f39c12; color: black; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
  console.log('%c📋 [AnimationQueue] Animations:', 'color: #f39c12; font-weight: bold;', animations);

  let currentIndex = 0;

  // FIX #2: Clear any previous tracked timeouts if ref provided
  if (timeoutTrackingRef && timeoutTrackingRef.current.length > 0) {
    console.log('%c🛑 [AnimationQueue] Clearing ' + timeoutTrackingRef.current.length + ' previous timeouts', 'background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px;');
    timeoutTrackingRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutTrackingRef.current = [];
  }

  const playNext = () => {
    if (currentIndex >= animations.length) {
      // Add buffer before completing to let last animation finish smoothly
      console.log('%c⏳ [AnimationQueue] Adding buffer before completion...', 'color: #f39c12;');
      setTimeout(() => {
        console.log('%c🎉 [AnimationQueue] ALL ANIMATIONS COMPLETE', 'background: #27ae60; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
        onComplete();
      }, BUFFER_BETWEEN_ANIMATIONS);
      return;
    }

    const animation = animations[currentIndex];
    const animationDelay = (animation.delay || 0) * 1000;
    const animationDuration = getContainer().resolve<IAnimationQueueProcessorService>('ANIMATION_QUEUE_PROCESSOR_SERVICE').getDuration(animation.name);

    console.log('%c⏱️ [AnimationQueue] Scheduling "' + animation.name + '" - delay: ' + animationDelay + 'ms, duration: ' + animationDuration + 'ms', 'color: #f39c12;');

    // Wait for specified delay before playing
    const delayTimeoutId = setTimeout(() => {
      console.log('%c▶️ [AnimationQueue] EXECUTING: ' + animation.name + ' (duration: ' + animationDuration + 'ms)', 'background: #e67e22; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 14px;');
      onPlay(animation.name);

      // Wait for animation to complete, then play next
      const durationTimeoutId = setTimeout(() => {
        console.log('%c🏁 [AnimationQueue] Animation "' + animation.name + '" finished (' + (currentIndex + 1) + '/' + animations.length + ')', 'color: #27ae60;');
        currentIndex++;
        playNext();
      }, animationDuration);

      // FIX #2: Track duration timeout for cancellation if ref provided
      if (timeoutTrackingRef) {
        timeoutTrackingRef.current.push(durationTimeoutId);
      }
    }, animationDelay);

    // FIX #2: Track delay timeout for cancellation if ref provided
    if (timeoutTrackingRef) {
      timeoutTrackingRef.current.push(delayTimeoutId);
    }
  };

  // Start the queue
  playNext();
}

/**
 * Distribute animations across audio timeline based on timing strategy
 * @param animations - List of animations to schedule
 * @param audioDuration - Total audio duration in milliseconds
 * @param timing - Timing strategy (early, middle, late, distributed)
 * @returns Array of scheduled animations with timestamps
 */
export function distributeAnimationsAcrossAudio(
  animations: AnimationTrigger[],
  audioDuration: number,
  timing?: AnimationJudgmentWithTiming['suggestedTiming']
): ScheduledAnimation[] {
  console.log('%c⏱️ [distributeAnimationsAcrossAudio] Distributing animations',
    'background: #3498db; color: white; padding: 4px 8px; border-radius: 4px;');
  console.log('%c⏱️ [distributeAnimationsAcrossAudio] Audio duration:', 'color: #3498db; font-weight: bold;', audioDuration);
  console.log('%c⏱️ [distributeAnimationsAcrossAudio] Timing strategy:', 'color: #3498db; font-weight: bold;', timing);

  const scheduled: ScheduledAnimation[] = [];

  if (animations.length === 0) {
    return scheduled;
  }

  // Default timing strategy
  const timingStrategy = timing || 'distributed';

  switch (timingStrategy) {
    case 'early': {
      // All animations in first third
      animations.forEach((anim, index) => {
        const duration = getContainer().resolve<IAnimationQueueProcessorService>('ANIMATION_QUEUE_PROCESSOR_SERVICE').getDuration(anim.name);
        const triggerTime = (index * 500) + 500; // Start at 500ms, 500ms apart
        scheduled.push({
          name: anim.name,
          triggerTime,
          duration,
          interruptible: true
        });
      });
      break;
    }

    case 'middle': {
      // All animations in middle third
      const middleStart = audioDuration * 0.33;
      animations.forEach((anim, index) => {
        const duration = getContainer().resolve<IAnimationQueueProcessorService>('ANIMATION_QUEUE_PROCESSOR_SERVICE').getDuration(anim.name);
        const triggerTime = middleStart + (index * 500);
        scheduled.push({
          name: anim.name,
          triggerTime,
          duration,
          interruptible: true
        });
      });
      break;
    }

    case 'late': {
      // All animations in last third
      const lateStart = audioDuration * 0.66;
      animations.forEach((anim, index) => {
        const duration = getContainer().resolve<IAnimationQueueProcessorService>('ANIMATION_QUEUE_PROCESSOR_SERVICE').getDuration(anim.name);
        const triggerTime = lateStart + (index * 500);
        scheduled.push({
          name: anim.name,
          triggerTime,
          duration,
          interruptible: true
        });
      });
      break;
    }

    case 'distributed':
    default: {
      // Evenly distribute across entire audio
      const availableTime = audioDuration - 1000; // Leave 1s buffer at end
      const gap = availableTime / Math.max(animations.length, 1);

      animations.forEach((anim, index) => {
        const duration = getContainer().resolve<IAnimationQueueProcessorService>('ANIMATION_QUEUE_PROCESSOR_SERVICE').getDuration(anim.name);
        const triggerTime = (index * gap) + 500; // Start at 500ms
        scheduled.push({
          name: anim.name,
          triggerTime,
          duration,
          interruptible: true
        });
      });
      break;
    }
  }

  console.log('%c⏱️ [distributeAnimationsAcrossAudio] Scheduled animations:',
    'background: #3498db; color: white; padding: 4px 8px; border-radius: 4px;',
    scheduled.map(a => `${a.name} at ${a.triggerTime}ms`));

  return scheduled;
}

/**
 * Enhanced animation judgment with timing and layer suggestions
 * @param userMessage - The user's message
 * @param aiResponse - The AI's response
 * @returns Enhanced animation judgment with timing and layer suggestions
 */
export async function judgeAnimationsWithTiming(
  userMessage: string,
  aiResponse: string
): Promise<AnimationJudgmentWithTiming> {
  console.log('%c🎬 [judgeAnimationsWithTiming] FUNCTION ENTRY',
    'background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');

  // Get base animation judgment
  const baseJudgment = await judgeAnimations(userMessage, aiResponse);

  // Analyze response for timing and layer suggestions
  const responseLower = aiResponse.toLowerCase();
  let suggestedTiming: AnimationJudgmentWithTiming['suggestedTiming'] = 'distributed';
  let suggestedLayer: AnimationLayerType = 'gesture';

  // Timing analysis - delegate to AnimationSelectionService
  const animationSelectionService = getContainer().resolve<IAnimationSelectionService>('ANIMATION_SELECTION_SERVICE');
  if (baseJudgment.animations.length > 0) {
    suggestedTiming = animationSelectionService.suggestTiming(aiResponse);
    suggestedLayer;
  }

  console.log('%c🎬 [judgeAnimationsWithTiming] Suggested timing:',
    'color: #e74c3c; font-weight: bold;', suggestedTiming);
  console.log('%c🎬 [judgeAnimationsWithTiming] Suggested layer:',
    'color: #e74c3c; font-weight: bold;', suggestedLayer);

  return {
    ...baseJudgment,
    suggestedTiming,
    suggestedLayer,
    interruptible: true
  };
}

/**
 * Get buffer time between animations
 * @returns Buffer time in milliseconds
 */
export function getBufferTime(): number {
  return BUFFER_BETWEEN_ANIMATIONS;
}
