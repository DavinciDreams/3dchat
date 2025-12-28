import axios from 'axios';
import { AnimationJudgment, AnimationTrigger, AVAILABLE_ANIMATIONS } from '../types';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
// Use a fast, cheap model for the judge - falls back to same model if not specified
const JUDGE_MODEL = import.meta.env.VITE_ANIMATION_JUDGE_MODEL || 'openai/gpt-4.1-mini';

const SYSTEM_PROMPT = `You are an animation director for a 3D avatar. Given a conversation exchange, decide which animations the avatar should perform while speaking its response.

Available animations:
- spin: A playful spinning/twirling motion - use for fun, excitement, showing off
- squat: Bending down/crouching motion - use for exercising, hiding, getting low
- shoot: Finger guns/shooting gesture - use for playful pointing, "gotcha", cool moments
- greeting: Waving hello gesture - use for hellos, goodbyes, friendly acknowledgment
- peace: Peace sign/victory pose - use for success, positivity, celebration

Rules:
1. Only trigger animations that naturally match what the avatar is saying
2. Can return multiple animations to be played in sequence with delays
3. Return empty array if no animation fits the context
4. Consider the user's request AND the AI's response
5. Be selective - not every response needs an animation
6. If the user explicitly asks for an action (spin, wave, etc), definitely include it`;

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
  'spin': 4000,      // Spin takes about 4 seconds
  'squat': 3000,     // Squat takes about 3 seconds
  'shoot': 2500,     // Shoot gesture takes about 2.5 seconds
  'greeting': 3000,  // Wave takes about 3 seconds
  'peace': 2500,     // Peace sign takes about 2.5 seconds
  'modelPose': 2000, // Default idle pose
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
