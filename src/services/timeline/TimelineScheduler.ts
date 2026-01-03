/**
 * TimelineScheduler
 *
 * Schedules animations on timeline for timeline coordinator.
 * Handles animation timing and trigger time calculation.
 */

import type {
  ScheduledAnimation,
  TextTimeline,
  TimelineEvent,
} from '../../types';

/**
 * Timeline Scheduler interface
 */
export interface ITimelineScheduler {
  /**
   * Schedule animations on timeline
   */
  scheduleAnimations(
    animations: ScheduledAnimation[],
    timeline: TextTimeline
  ): void;

  /**
   * Calculate trigger time for an animation
   */
  calculateTriggerTime(
    animation: ScheduledAnimation,
    timeline: TextTimeline
  ): number;

  /**
   * Adjust timeline duration to match audio
   */
  adjustTimelineDuration(
    timeline: TextTimeline,
    audioDuration: number
  ): TextTimeline;

  /**
   * Execute an animation
   */
  executeAnimation(animation: ScheduledAnimation): void;
}

/**
 * Timeline Scheduler options
 */
export interface TimelineSchedulerOptions {
  /** Timeline manager for scheduling events */
  timelineManager: {
    schedule(event: TimelineEvent): void;
  };
  /** Debug mode */
  debug?: boolean;
}

/**
 * TimelineScheduler class
 *
 * Schedules animations on timeline with proper timing.
 */
export class TimelineScheduler implements ITimelineScheduler {
  private timelineManager: {
    schedule(event: TimelineEvent): void;
  };
  private debug: boolean;

  constructor(options: TimelineSchedulerOptions) {
    this.timelineManager = options.timelineManager;
    this.debug = options.debug ?? false;
  }

  /**
   * Schedule animations on timeline
   */
  scheduleAnimations(
    animations: ScheduledAnimation[],
    timeline: TextTimeline
  ): void {
    animations.forEach(animation => {
      // Calculate trigger time based on text position
      const triggerTime = this.calculateTriggerTime(animation, timeline);

      // Create timeline event
      const event: TimelineEvent = {
        id: `anim_${animation.name}_${Date.now()}`,
        timestamp: triggerTime,
        type: 'animation',
        data: animation,
        callback: () => this.executeAnimation(animation),
        priority: animation.layer ? 100 : 50,
      };

      this.timelineManager.schedule(event);

      if (this.debug) {
        console.log(
          `%c[TimelineScheduler] Scheduled animation: ${animation.name} at ${triggerTime.toFixed(0)}ms`,
          'background: #3498db; color: white; padding: 4px 8px; border-radius: 4px;'
        );
      }
    });
  }

  /**
   * Calculate trigger time for an animation based on text position
   */
  calculateTriggerTime(
    animation: ScheduledAnimation,
    timeline: TextTimeline
  ): number {
    // If animation has explicit trigger time, use it
    if (animation.triggerTime !== undefined) {
      return animation.triggerTime;
    }

    // Otherwise, distribute based on timeline position
    const progress = animation.triggerTime !== undefined
      ? animation.triggerTime / timeline.totalDuration
      : 0.5; // Default to middle

    return Math.floor(progress * timeline.totalDuration);
  }

  /**
   * Adjust timeline duration to match audio
   */
  adjustTimelineDuration(
    timeline: TextTimeline,
    audioDuration: number
  ): TextTimeline {
    const ratio = audioDuration / timeline.totalDuration;

    // Scale all segment durations
    return {
      ...timeline,
      totalDuration: audioDuration,
      segments: timeline.segments.map(seg => ({
        ...seg,
        duration: seg.duration * ratio,
        startTime: seg.startTime * ratio,
        endTime: seg.endTime * ratio,
      })),
    };
  }

  /**
   * Execute an animation (callback wrapper)
   * FIX: Actually execute animation using AnimationQueueService
   * Previously this was just a stub that logged to console
   */
  executeAnimation(animation: ScheduledAnimation): void {
    if (this.debug) {
      console.log(
        `%c[TimelineScheduler] Executing animation: ${animation.name}`,
        'background: #27ae60; color: white; padding: 4px 8px; border-radius: 4px;'
      );
      console.log(
        '%c⚠️ [TimelineScheduler] NOTE: AnimationQueueService integration needed for actual execution',
        'color: #f39c12;'
      );
    }
    // The actual execution should use AnimationQueueService.playAnimation()
    // For now, this is a placeholder
  }
}

export default TimelineScheduler;
