/**
 * Animation Queue Processor Service
 *
 * Handles animation queue processing, timing distribution, and enhanced judgment.
 * Extracted from AnimationJudgeService to improve separation of concerns.
 */

import type { AnimationTrigger, ScheduledAnimation, AnimationLayerType, AnimationJudgment, AnimationJudgmentWithTiming } from '../../types';
import { animationDurationService } from './AnimationDurationService';
import { truncateArray } from '../../utils/safeLogger';

const BUFFER_BETWEEN_ANIMATIONS = 0; // Buffer time between animations (ms) - set to 0 for continuous dance sequences

/**
 * Animation Queue Processor Service implementation
 */
export class AnimationQueueProcessorService {
  /**
   * Process animation queue - schedules animations with their delays
   * @param animations - List of animations with delays
   * @param onPlay - Callback to trigger each animation
   * @param onComplete - Callback when all animations complete
   * @param timeoutTrackingRef - Optional ref to track timeouts for cancellation
   */
  processAnimationQueue(
    animations: AnimationTrigger[],
    onPlay: (animationName: string) => void,
    onComplete: () => void,
    timeoutTrackingRef?: React.MutableRefObject<NodeJS.Timeout[]>
  ): void {
    if (animations.length === 0) {
      console.log('%c📭 [AnimationQueueProcessor] Empty queue, nothing to process', 'color: #95a5a6;');
      onComplete();
      return;
    }

    console.log('%c📋 [AnimationQueueProcessor] PROCESSING QUEUE', 'background: #f39c12; color: black; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
    console.log('%c📋 [AnimationQueueProcessor] Animations:', 'color: #f39c12; font-weight: bold;', truncateArray(animations));

    let currentIndex = 0;

    // Clear any previous tracked timeouts if ref provided
    if (timeoutTrackingRef && timeoutTrackingRef.current.length > 0) {
      console.log('%c🛑 [AnimationQueueProcessor] Clearing ' + timeoutTrackingRef.current.length + ' previous timeouts', 'background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px;');
      timeoutTrackingRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutTrackingRef.current = [];
    }

    const playNext = () => {
      if (currentIndex >= animations.length) {
        // Complete immediately without buffer for continuous sequences
        console.log('%c🎉 [AnimationQueueProcessor] ALL ANIMATIONS COMPLETE', 'background: #27ae60; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
        onComplete();
        return;
      }

      const animation = animations[currentIndex];
      // Ignore LLM delay values for continuous dance sequences - set to 0
      const animationDelay = 0;
      const animationDuration = animationDurationService.getDuration(animation.name);

      console.log('%c⏱️ [AnimationQueueProcessor] Scheduling "' + animation.name + '" - delay: ' + animationDelay + 'ms (continuous), duration: ' + animationDuration + 'ms', 'color: #f39c12;');

      // Play animation immediately without delay for continuous sequences
      console.log('%c▶️ [AnimationQueueProcessor] EXECUTING: ' + animation.name + ' (duration: ' + animationDuration + 'ms)', 'background: #e67e22; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 14px;');
      onPlay(animation.name);

      // Wait for animation to complete, then play next
      const durationTimeoutId = setTimeout(() => {
        console.log('%c🏁 [AnimationQueueProcessor] Animation "' + animation.name + '" finished (' + (currentIndex + 1) + '/' + animations.length + ')', 'color: #27ae60;');
        currentIndex++;
        playNext();
      }, animationDuration);

      // Track duration timeout for cancellation if ref provided
      if (timeoutTrackingRef) {
        timeoutTrackingRef.current.push(durationTimeoutId);
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
  distributeAnimationsAcrossAudio(
    animations: AnimationTrigger[],
    audioDuration: number,
    timing?: AnimationJudgmentWithTiming['suggestedTiming']
  ): ScheduledAnimation[] {
    console.log('%c⏱️ [AnimationQueueProcessor] Distributing animations',
      'background: #3498db; color: white; padding: 4px 8px; border-radius: 4px;');
    console.log('%c⏱️ [AnimationQueueProcessor] Audio duration:', 'color: #3498db; font-weight: bold;', audioDuration);
    console.log('%c⏱️ [AnimationQueueProcessor] Timing strategy:', 'color: #3498db; font-weight: bold;', timing);

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

    console.log('%c⏱️ [AnimationQueueProcessor] Scheduled animations:',
      'background: #3498db; color: white; padding: 4px 8px; border-radius: 4px;',
      scheduled.map(a => `${a.name} at ${a.triggerTime}ms`));

    return scheduled;
  }

  /**
   * Enhanced animation judgment with timing and layer suggestions
   * @param baseJudgment - Base animation judgment
   * @param aiResponse - The AI's response
   * @param suggestedLayer - Suggested animation layer
   * @param suggestedTiming - Suggested timing strategy
   * @returns Enhanced animation judgment with timing and layer suggestions
   */
  judgeAnimationsWithTiming(
    baseJudgment: AnimationJudgment,
    aiResponse: string,
    suggestedLayer: AnimationLayerType = 'gesture',
    suggestedTiming: AnimationJudgmentWithTiming['suggestedTiming'] = 'distributed'
  ): AnimationJudgmentWithTiming {
    console.log('%c🎬 [AnimationQueueProcessor] Creating enhanced judgment',
      'background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');

    console.log('%c🎬 [AnimationQueueProcessor] Suggested timing:',
      'color: #e74c3c; font-weight: bold;', suggestedTiming);
    console.log('%c🎬 [AnimationQueueProcessor] Suggested layer:',
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
  getBufferTime(): number {
    return BUFFER_BETWEEN_ANIMATIONS;
  }
}
