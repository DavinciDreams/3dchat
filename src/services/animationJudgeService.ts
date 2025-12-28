import axios from 'axios';
import { AnimationJudgment, AnimationTrigger, AVAILABLE_ANIMATIONS } from '../types';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
// Use a fast, cheap model for the judge - falls back to same model if not specified
const JUDGE_MODEL = import.meta.env.VITE_ANIMATION_JUDGE_MODEL || 'openai/gpt-4.1-mini';

const SYSTEM_PROMPT = `You are an animation director for a 3D avatar. Given a conversation exchange, decide which animations the avatar should perform while speaking its response.

Available animations by category:

CORE ANIMATIONS:
- greeting: Waving hello gesture - use for hellos, goodbyes, friendly acknowledgment
- peace: Peace sign/victory pose - use for success, positivity, celebration
- shoot: Finger guns/shooting gesture - use for playful pointing, "gotcha", cool moments
- spin: A playful spinning/twirling motion - use for fun, excitement, showing off
- modelPose: Idle standing pose - use for neutral moments
- squat: Bending down/crouching motion - use for exercising, hiding, getting low

IDLE & SOCIAL:
- idle: Default standing pose
- talkingOnPhone: Talking on phone animation
- bowing: Respectful bow - use for formal greetings or respect
- salute: Military-style salute - use for playful formality
- singing: Singing animation - use for music or singing

DANCE & CELEBRATION:
- hipHopDance: Hip hop dance moves - use for dancing or celebration
- swinging: Swinging motion - use for playful swinging
- catwalk: Catwalk strut - use for showing off or fashion

COMBAT & ACTION:
- punch: Punch forward - use for action or fighting
- dropKick: Drop kick attack - use for aggressive action
- flyingKnee: Flying knee combo - use for martial arts
- daggerStab: Double dagger stab - use for weapon attacks
- bodyBlock: Body block defense - use for blocking
- centerBlock: Center block defense - use for blocking
- catch: Catch something - use for catching
- snatch: Snatch grab - use for grabbing quickly
- reloading: Reload weapon - use for gun/weapon context
- magicCast: Cast magic spell - use for magic or power

MOVEMENT:
- walking: Walking in place - use when discussing travel
- jogBackwards: Jog backwards - use for retreating
- jumping: Jump in place - use for excitement or jumping
- climbing: Climbing up - use for climbing context
- takeCover: Take cover - use for hiding or stealth
- zombieStandUp: Zombie stand up - use for zombie/horror context
- plank: Plank exercise - use for exercise
- openDoor: Open door - use for door interactions
- turnLeft: Turn left 90 degrees - use for turning
- turnRight: Turn right with briefcase - use for turning

SPORTS:
- golfBadShot: Golf bad shot reaction - use for golf or frustration
- golfPrePutt: Golf pre-putt stance - use for golf

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
  let accumulatedDelay = 0;

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
