// Import animation configuration and prompt from generated files
import { ANIMATION_JUDGE_SYSTEM_PROMPT } from '../generated/animationPrompt.generated';
import { AVAILABLE_ANIMATIONS } from '../generated/animationTypes.generated';
import { AnimationJudgment, AnimationTrigger, AnimationJudgmentWithTiming, ScheduledAnimation, AnimationLayerType } from '../types';
import { getContainer, SERVICE_TOKENS } from '../di';
import type { ILLMClient, IAnimationSelectionService } from '../di/ServiceInterfaces';
import { animationDurationService } from './animation/AnimationDurationService';
import { truncateString } from '../utils/safeLogger';
import { getAnimationJudgeCache } from './animationJudgeService/AnimationJudgeCache';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
// Use a fast, cheap model for judge - falls back to free model if not specified
const JUDGE_MODEL = import.meta.env.VITE_ANIMATION_JUDGE_MODEL || 'openai/gpt-4o-mini';

const SYSTEM_PROMPT = ANIMATION_JUDGE_SYSTEM_PROMPT;

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
 * Uses caching to avoid redundant LLM calls for identical conversations.
 * @param userMessage - The user's message
 * @param aiResponse - The AI's response to user
 * @returns AnimationJudgment with list of animations and reasoning
 */
export async function judgeAnimations(
  userMessage: string,
  aiResponse: string
): Promise<AnimationJudgment> {
  const startTime = performance.now();
  const cache = getAnimationJudgeCache();

  console.log('%c🎬 [AnimationJudge] FUNCTION ENTRY - judgeAnimations called!', 'background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 14px;');
  console.log('%c🎬 [AnimationJudge] userMessage:', 'color: #e74c3c; font-weight: bold;', truncateString(userMessage));
  console.log('%c🎬 [AnimationJudge] aiResponse:', 'color: #e74c3c; font-weight: bold;', truncateString(aiResponse));
  console.log('%c🎬 [AnimationJudge] JUDGE_MODEL:', 'color: #e74c3c; font-weight: bold;', JUDGE_MODEL);
  console.log('%c🎬 [AnimationJudge] OPENROUTER_API_KEY present:', 'color: #e74c3c; font-weight: bold;', !!OPENROUTER_API_KEY);

  // Use cache with thread-safe concurrent request handling
  return cache.getOrSet(userMessage, aiResponse, async () => {
    console.log('🎬 [AnimationJudge] Analyzing conversation for animations...');
    console.log('🎬 [AnimationJudge] Input - User message (preview):', truncateString(userMessage));
    console.log('🎬 [AnimationJudge] Input - AI response (preview):', truncateString(aiResponse));
    console.log('🎬 [AnimationJudge] Using model:', JUDGE_MODEL);

    try {
      const llmClientService = getContainer().resolve<ILLMClient>(SERVICE_TOKENS.LLM_CLIENT);
      const response = await llmClientService.chat([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `User said: "${userMessage}"\n\nAI responded: "${aiResponse}"\n\nWhat animations should avatar perform?` }
      ]);

      const elapsed = performance.now() - startTime;
      console.log(`🎬 [AnimationJudge] LLM call took ${elapsed.toFixed(0)}ms`);

      // Extract tool call from response
      const toolCall = response.tool_calls?.[0];
      if (!toolCall) {
        console.error('🎬 [AnimationJudge] No tool call in response');
        return { animations: [], reasoning: 'No animation decision made' };
      }

      const args = JSON.parse(toolCall.function.arguments);

      console.log('%c🎬 [AnimationJudge] Tool call received!', 'background: #ff6b6b; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
      console.log('%c🎬 [AnimationJudge] Raw args:', 'color: #ff6b6b; font-weight: bold;', args);

      // Helper function to find closest matching animation name
      function findClosestAnimationName(requestedName: string): string | null {
        // Try exact match first
        if (AVAILABLE_ANIMATIONS.includes(requestedName as typeof AVAILABLE_ANIMATIONS[number])) {
          return requestedName;
        }

        // Try case-insensitive match
        const caseInsensitiveMatch = AVAILABLE_ANIMATIONS.find(
          anim => anim.toLowerCase() === requestedName.toLowerCase()
        );
        if (caseInsensitiveMatch) {
          console.log('%c🔍 [AnimationJudge] Case-insensitive match found:', 'color: #3498db; font-weight: bold;',
            `"${requestedName}" → "${caseInsensitiveMatch}"`);
          return caseInsensitiveMatch;
        }

        // Try fuzzy match - remove common suffixes and try partial match
        const normalizedRequested = requestedName
          .toLowerCase()
          .replace(/ing$/, '')
          .replace(/s$/, '');

        const fuzzyMatch = AVAILABLE_ANIMATIONS.find(anim => {
          const normalizedAnim = anim.toLowerCase().replace(/ing$/, '').replace(/s$/, '');
          return normalizedAnim === normalizedRequested ||
                 normalizedAnim.includes(normalizedRequested) ||
                 normalizedRequested.includes(normalizedAnim);
        });

        if (fuzzyMatch) {
          console.log('%c🔍 [AnimationJudge] Fuzzy match found:', 'color: #3498db; font-weight: bold;',
            `"${requestedName}" → "${fuzzyMatch}"`);
          return fuzzyMatch;
        }

        // No match found
        return null;
      }

      // Validate animations are in our allowed list with fuzzy matching
      const validAnimations: AnimationTrigger[] = args.animations
        .map((a: AnimationTrigger) => {
          const matchedName = findClosestAnimationName(a.name);
          if (matchedName) {
            return {
              name: matchedName,
              delay: a.delay || 0
            };
          } else {
            console.log('%c❌ [AnimationJudge] Animation rejected - no match found:', 'color: #e74c3c; font-weight: bold;', a.name);
            console.log('%c❌ [AnimationJudge] Did you mean one of these?', 'color: #e74c3c; font-weight: bold;',
              AVAILABLE_ANIMATIONS.filter(anim => {
                const search = a.name.toLowerCase().replace(/ing$/, '').substring(0, 10);
                return anim.toLowerCase().includes(search);
              }).slice(0, 5)
            );
            return null;
          }
        })
        .filter((a): a is AnimationTrigger => a !== null) as AnimationTrigger[];

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
  });
}

const BUFFER_BETWEEN_ANIMATIONS = 0; // Buffer time between animations (ms) - set to 0 for continuous dance sequences

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
  console.log('%c📋 [AnimationQueue] Animations (count):', 'color: #f39c12; font-weight: bold;', animations.length);

  let currentIndex = 0;

  // FIX #2: Clear any previous tracked timeouts if ref provided
  if (timeoutTrackingRef && timeoutTrackingRef.current.length > 0) {
    console.log('%c🛑 [AnimationQueue] Clearing ' + timeoutTrackingRef.current.length + ' previous timeouts', 'background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px;');
    timeoutTrackingRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutTrackingRef.current = [];
  }

  const playNext = () => {
    if (currentIndex >= animations.length) {
      // Complete immediately without buffer for continuous sequences
      console.log('%c🎉 [AnimationQueue] ALL ANIMATIONS COMPLETE', 'background: #27ae60; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
      onComplete();
      return;
    }

    const animation = animations[currentIndex];
    // Ignore LLM delay values for continuous dance sequences - set to 0
    const animationDelay = 0;
    const animationDuration = animationDurationService.getDuration(animation.name);

    console.log('%c⏱️ [AnimationQueue] Scheduling "' + animation.name + '" - delay: ' + animationDelay + 'ms (continuous), duration: ' + animationDuration + 'ms', 'color: #f39c12;');

    // Play animation immediately without delay for continuous sequences
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
  };

  // Start of the queue
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
        const duration = animationDurationService.getDuration(anim.name);
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
        const duration = animationDurationService.getDuration(anim.name);
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
        const duration = animationDurationService.getDuration(anim.name);
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
        const duration = animationDurationService.getDuration(anim.name);
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

/**
 * Get animation judge cache statistics
 * @returns Cache statistics including hit rate
 */
export function getAnimationJudgeCacheStats() {
  const cache = getAnimationJudgeCache();
  return cache.getStats();
}

/**
 * Log animation judge cache statistics to console
 */
export function logAnimationJudgeCacheStats() {
  const cache = getAnimationJudgeCache();
  cache.logStats();
}

/**
 * Clear animation judge cache
 */
export function clearAnimationJudgeCache() {
  const cache = getAnimationJudgeCache();
  cache.clear();
}

/**
 * Clean up expired entries from animation judge cache
 * @returns Number of entries removed
 */
export function cleanupAnimationJudgeCache() {
  const cache = getAnimationJudgeCache();
  return cache.cleanupExpired();
}

// Expose cache functions to window for debugging in development
if (import.meta.env.DEV) {
  (window as any).animationJudgeCache = {
    getStats: getAnimationJudgeCacheStats,
    logStats: logAnimationJudgeCacheStats,
    clear: clearAnimationJudgeCache,
    cleanup: cleanupAnimationJudgeCache
  };
}
