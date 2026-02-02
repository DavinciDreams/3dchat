/**
 * TimelineCoordinator
 *
 * Service for coordinating text-based timeline with audio.
 * Manages to synchronization between text-based timing estimates and actual audio playback.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from 'three';
import {
  Emotion,
  ScheduledAnimation,
  TextTimeline,
  TimelineCoordinatorState,
  TimelineCoordinatorOptions,
  TextTimingEstimator,
  AnimationLayerType,
} from '../types';
import { textTimingEstimator } from './textTimingEstimator';
import { timelineManager } from './timelineManager';
import { animationLayeringService } from './animationLayeringService';

/**
 * TimelineCoordinator class
 *
 * Coordinates text-based timeline scheduling with audio playback.
 * Supports streaming text scenarios and automatic sync with audio.
 */
export class TimelineCoordinator {
  private estimator: TextTimingEstimator;
  private timelineManager: unknown;
  private debug: boolean;
  private maxSyncDrift: number;
  private autoSync: boolean;

  // State
  private state: TimelineCoordinatorState = {
    status: 'idle',
    timeline: null,
    currentTime: 0,
    totalDuration: 0,
    hasAudio: false,
    audioDuration: null,
    isSynced: false,
    syncRatio: 1.0,
    error: null,
    lastUpdated: Date.now(),
  };

  // Streaming state
  private accumulatedText: string = '';
  private accumulatedTimeline: any = null;

  // Animation and emotion tracking
  private scheduledAnimations: ScheduledAnimation[] = [];
  private currentEmotion: Emotion = 'neutral';

  constructor(options: TimelineCoordinatorOptions) {
    this.estimator = options.estimator;
    this.timelineManager = options.timelineManager;
    this.debug = options.debug ?? false;
    this.maxSyncDrift = options.maxSyncDrift ?? 500;
    this.autoSync = options.autoSync ?? true;

    if (this.debug) {
      console.log('%c[TimelineCoordinator] Initialized with options:', options,
        'background: #8e44ad; color: white; padding: 4px 8px; border-radius: 4px;');
    }
  }

  /**
   * Initialize coordinator from text
   * @param text - The text to initialize from
   * @param animations - Optional animations to schedule
   * @param emotion - Optional starting emotion
   */
  initializeFromText(text: string, animations: ScheduledAnimation[] = [], emotion?: Emotion): void {
    // Build timeline from text
    const timeline = this.estimator.buildTimeline(text);

    // Store timeline
    this.state.timeline = timeline;
    this.state.totalDuration = timeline.totalDuration;
    this.state.currentTime = 0;
    this.state.hasAudio = false;
    this.state.audioDuration = null;
    this.state.isSynced = false;
    this.state.syncRatio = 1.0;
    this.state.status = 'initialized';
    this.state.lastUpdated = Date.now();

    // Reset accumulated streaming state
    this.accumulatedText = text;
    this.accumulatedTimeline = timeline;

    // Set starting emotion
    if (emotion) {
      this.currentEmotion = emotion;
    }

    // Schedule animations on timeline
    if (animations.length > 0) {
      this.scheduleAnimations(animations);
    }

    if (this.debug) {
      console.log(`%c[TimelineCoordinator] Initialized from text: "${text}"`,
        `duration: ${timeline.totalDuration.toFixed(0)}ms, words: ${timeline.wordCount}, sentences: ${timeline.sentenceCount}`,
        'background: #8e44ad; color: white; padding: 4px 8px; border-radius: 4px;');
    }
  }

  /**
   * Sync timeline with actual audio duration
   * @param audioDuration - The actual audio duration in milliseconds
   */
  syncWithAudio(audioDuration: number): void {
    if (!this.state.timeline) {
      console.warn('[TimelineCoordinator] Cannot sync - no timeline initialized');
      return;
    }

    const textDuration = this.state.totalDuration;

    if (audioDuration <= 0) {
      console.warn('[TimelineCoordinator] Invalid audio duration:', audioDuration);
      return;
    }

    // Calculate sync ratio
    const syncRatio = textDuration / audioDuration;
    this.state.syncRatio = syncRatio;
    this.state.audioDuration = audioDuration;
    this.state.hasAudio = true;
    this.state.isSynced = Math.abs(1.0 - syncRatio) < 0.1; // Within 10%
    this.state.lastUpdated = Date.now();

    // Adjust timeline duration to match audio
    this.adjustTimelineDuration(audioDuration);

    if (this.debug) {
      console.log(`%c[TimelineCoordinator] Synced with audio:`,
        `text=${textDuration.toFixed(0)}ms, audio=${audioDuration.toFixed(0)}ms, ratio=${syncRatio.toFixed(3)}`,
        'background: #8e44ad; color: white; padding: 4px 8px; border-radius: 4px;');
    }
  }

  /**
   * Append streamed text (for streaming scenarios)
   * @param text - The new text to append
   */
  appendStreamedText(text: string): void {
    if (!text || text.trim().length === 0) {
      if (this.debug) {
        console.log('[TimelineCoordinator] Empty text appended, ignoring');
      }
      return;
    }

    // Append to accumulated text
    this.accumulatedText += text;

    // Rebuild timeline with accumulated text
    const newTimeline = this.estimator.buildTimeline(this.accumulatedText);

    // Calculate offset for new segments
    const offset = this.accumulatedTimeline?.totalDuration ?? 0;

    // Adjust new segment times
    const adjustedSegments = newTimeline.segments.map(seg => ({
      ...seg,
      startTime: seg.startTime + offset,
      endTime: seg.endTime + offset,
    }));

    this.accumulatedTimeline = {
      ...newTimeline,
      segments: adjustedSegments,
    };

    // Update state
    this.state.timeline = this.accumulatedTimeline;
    this.state.totalDuration = this.accumulatedTimeline.totalDuration;
    this.state.lastUpdated = Date.now();

    if (this.debug) {
      console.log(`%c[TimelineCoordinator] Appended text: "${text}"`,
        `new duration: ${newTimeline.totalDuration.toFixed(0)}ms, offset: ${offset.toFixed(0)}ms`,
        'background: #8e44ad; color: white; padding: 4px 8px; border-radius: 4px;');
    }
  }

  /**
   * Start timeline
   */
  start(): void {
    if (this.state.status === 'running') {
      console.warn('[TimelineCoordinator] Already running');
      return;
    }

    if (!this.state.timeline) {
      console.warn('[TimelineCoordinator] No timeline to start');
      return;
    }

    // Start timeline manager with text duration
    if (this.state.hasAudio && this.state.audioDuration) {
      // Use audio duration if available
      (this.timelineManager as any).start(this.state.audioDuration);
    } else {
      // Use text duration as fallback
      (this.timelineManager as any).start(this.state.totalDuration);
    }

    this.state.status = 'running';
    this.state.lastUpdated = Date.now();

    if (this.debug) {
      console.log(`%c[TimelineCoordinator] Started timeline: duration=${this.state.totalDuration.toFixed(0)}ms`,
        'background: #27ae60; color: white; padding: 4px 8px; border-radius: 4px;');
    }
  }

  /**
   * Pause timeline
   */
  pause(): void {
    if (this.state.status !== 'running') {
      console.warn('[TimelineCoordinator] Not running, cannot pause');
      return;
    }

    (this.timelineManager as any).pause();
    this.state.status = 'paused';
    this.state.lastUpdated = Date.now();

    if (this.debug) {
      console.log('%c[TimelineCoordinator] Paused timeline',
        'background: #f39c12; color: white; padding: 4px 8px; border-radius: 4px;');
    }
  }

  /**
   * Resume timeline
   */
  resume(): void {
    if (this.state.status !== 'paused') {
      console.warn('[TimelineCoordinator] Not paused, cannot resume');
      return;
    }

    (this.timelineManager as any).resume();
    this.state.status = 'running';
    this.state.lastUpdated = Date.now();

    if (this.debug) {
      console.log('%c[TimelineCoordinator] Resumed timeline',
        'background: #27ae60; color: white; padding: 4px 8px; border-radius: 4px;');
    }
  }

  /**
   * Stop timeline
   */
  stop(): void {
    if (this.state.status === 'idle') {
      console.warn('[TimelineCoordinator] Already stopped');
      return;
    }

    (this.timelineManager as any).stop();
    this.state.status = 'completed';
    this.state.lastUpdated = Date.now();

    if (this.debug) {
      console.log('%c[TimelineCoordinator] Stopped timeline',
        'background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px;');
    }
  }

  /**
   * Get current state
   */
  getState(): TimelineCoordinatorState {
    // Update current time from timeline manager
    if (this.state.status === 'running' || this.state.status === 'paused') {
      this.state.currentTime = (this.timelineManager as any).getCurrentTime();
    }

    return { ...this.state };
  }

  /**
   * Get current progress (0-1)
   */
  getProgress(): number {
    if (this.state.totalDuration <= 0) {
      return 0;
    }

    const progress = this.state.currentTime / this.state.totalDuration;
    return Math.max(0, Math.min(1, progress));
  }

  /**
   * Get current time in milliseconds
   */
  getCurrentTime(): number {
    return this.state.currentTime;
  }

  /**
   * Get total duration in milliseconds
   */
  getTotalDuration(): number {
    return this.state.totalDuration;
  }

  /**
   * Get text timeline
   */
  getTimeline(): any {
    return this.state.timeline;
  }

  /**
   * Check if timeline is running
   */
  isRunning(): boolean {
    return this.state.status === 'running';
  }

  /**
   * Check if timeline is synchronized with audio
   */
  isSynced(): boolean {
    return this.state.isSynced;
  }

  /**
   * Reset coordinator state
   */
  reset(): void {
    // Stop timeline if running
    if (this.state.status === 'running' || this.state.status === 'paused') {
      (this.timelineManager as any).stop();
    }

    // Reset state
    this.state = {
      status: 'idle',
      timeline: null,
      currentTime: 0,
      totalDuration: 0,
      hasAudio: false,
      audioDuration: null,
      isSynced: false,
      syncRatio: 1.0,
      error: null,
      lastUpdated: Date.now(),
    };

    // Reset accumulated streaming state
    this.accumulatedText = '';
    this.accumulatedTimeline = null;
    this.scheduledAnimations = [];
    this.currentEmotion = 'neutral';

    if (this.debug) {
      console.log('%c[TimelineCoordinator] Reset state',
        'background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px;');
    }
  }

  /**
   * Schedule animations on the timeline
   */
  private scheduleAnimations(animations: ScheduledAnimation[]): void {
    if (!this.state.timeline) {
      return;
    }

    animations.forEach(animation => {
      // Calculate trigger time based on text position
      const triggerTime = this.calculateAnimationTriggerTime(animation);

      // Create timeline event
      (this.timelineManager as any).schedule({
        id: `anim_${animation.name}_${Date.now()}`,
        timestamp: triggerTime,
        type: 'animation',
        data: animation,
        callback: () => this.executeAnimation(animation),
        priority: animation.layer ? 100 : 50,
      });

      if (this.debug) {
        console.log(`%c[TimelineCoordinator] Scheduled animation: ${animation.name} at ${triggerTime.toFixed(0)}ms`,
          'background: #3498db; color: white; padding: 4px 8px; border-radius: 4px;');
      }
    });
  }

  /**
   * Calculate trigger time for an animation based on text position
   */
  private calculateAnimationTriggerTime(animation: ScheduledAnimation): number {
    if (!this.state.timeline) {
      return animation.triggerTime;
    }

    // If animation has explicit trigger time, use it
    if (animation.triggerTime !== undefined) {
      return animation.triggerTime;
    }

    // Otherwise, distribute based on timeline position
    const progress = animation.triggerTime !== undefined
      ? animation.triggerTime / this.state.totalDuration
      : 0.5; // Default to middle

    return Math.floor(progress * this.state.totalDuration);
  }

  /**
   * Execute an animation (callback wrapper)
   * PERFORMANCE FIX: Integrated with AnimationLayeringService for actual animation playback
   * Previously this was just a stub that logged to console
   */
  private executeAnimation(animation: ScheduledAnimation): void {
    // Use AnimationLayeringService directly since timing is already handled by timeline
    const layer: AnimationLayerType = animation.layer || 'full_body';
    const duration = animation.duration / 1000; // Convert ms to seconds

    try {
      // Check if animation is registered
      const registeredAnimations = animationLayeringService.getRegisteredAnimations();
      if (!registeredAnimations.includes(animation.name)) {
        console.warn(
          `%c⚠️ [TimelineCoordinator] Animation not registered: ${animation.name}`,
          'color: #f39c12;'
        );
        console.log(
          `%c[TimelineCoordinator] Available animations: ${registeredAnimations.join(', ')}`,
          'color: #95a5a6;'
        );
        return;
      }

      // Play animation with appropriate settings
      const animationId = animationLayeringService.playAnimation(animation.name, layer, {
        fadeInDuration: 0.3,
        fadeOutDuration: 0.3,
        loop: duration > 0 ? THREE.LoopOnce : THREE.LoopRepeat,
        interruptible: animation.interruptible !== false,
      });

      if (this.debug) {
        console.log(
          `%c▶️ [TimelineCoordinator] Executing animation: ${animation.name} on ${layer} (${animationId})`,
          'background: #27ae60; color: white; padding: 4px 8px; border-radius: 4px;'
        );
      }

      // Schedule automatic stop if duration is specified
      if (duration > 0 && animationId) {
        const stopCallback = () => {
          animationLayeringService.stopAnimation(animationId, 0.3);
          if (this.debug) {
            console.log(
              `%c⏹ [TimelineCoordinator] Auto-stopping animation: ${animation.name}`,
              'color: #f39c12;'
            );
          }
        };

        // Schedule stop event through timeline manager
        if (this.timelineManager && typeof this.timelineManager === 'object' && 'schedule' in this.timelineManager) {
          (this.timelineManager as any).schedule({
            id: `${animationId}_stop`,
            timestamp: animation.triggerTime + animation.duration,
            type: 'animation_stop',
            callback: stopCallback,
          });
        }
      }
    } catch (error) {
      console.error(
        `%c❌ [TimelineCoordinator] Failed to execute animation: ${animation.name}`,
        'color: #e74c3c;',
        error
      );
    }
  }

  /**
   * Adjust timeline duration to match audio
   */
  private adjustTimelineDuration(audioDuration: number): void {
    if (!this.state.timeline) {
      return;
    }

    const ratio = audioDuration / this.state.totalDuration;

    // Scale all segment durations
    this.state.timeline = {
      ...this.state.timeline,
      totalDuration: audioDuration,
      segments: this.state.timeline.segments.map(seg => ({
        ...seg,
        duration: seg.duration * ratio,
        startTime: seg.startTime * ratio,
        endTime: seg.endTime * ratio,
      })),
    };

    if (this.debug) {
      console.log(`%c[TimelineCoordinator] Adjusted timeline duration by factor ${ratio.toFixed(3)}`,
        'background: #f39c12; color: white; padding: 4px 8px; border-radius: 4px;');
    }
  }

  /**
   * Set current emotion
   */
  setEmotion(emotion: Emotion): void {
    this.currentEmotion = emotion;

    if (this.debug) {
      console.log(`%c[TimelineCoordinator] Set emotion: ${emotion}`,
        'background: #9b59b6; color: white; padding: 4px 8px; border-radius: 4px;');
    }
  }

  /**
   * Get current emotion
   */
  getCurrentEmotion(): Emotion {
    return this.currentEmotion;
  }

  /**
   * Initialize timeline manager connection
   * FIX: This method allows setting the timelineManager after singleton creation
   * @param timelineManager - TimelineManager instance to connect
   */
  setTimelineManager(timelineManager: unknown): void {
    this.timelineManager = timelineManager;
    if (this.debug) {
      console.log('%c[TimelineCoordinator] TimelineManager connected',
        'background: #3498db; color: white; padding: 4px 8px; border-radius: 4px;');
    }
  }
}

// Export singleton instance
export const timelineCoordinator = new TimelineCoordinator({
  estimator: textTimingEstimator,
  timelineManager: null as any, // FIX: Will be set via setTimelineManager() during app initialization
});

// CRITICAL FIX: Connect TimelineCoordinator to TimelineManager singleton
// This connection is required for timeline coordination features to work properly.
// TimelineCoordinator needs TimelineManager to schedule and execute animations at the correct times.
// Without this connection, the executeAnimation() method would never be invoked.
timelineCoordinator.setTimelineManager(timelineManager);

// Export class for testing
export default TimelineCoordinator;
