/**
 * TimelineCoordinator
 *
 * Service for coordinating text-based timeline with audio.
 * Manages to synchronization between text-based timing estimates and actual audio playback.
 */


/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  Emotion,
  ScheduledAnimation,

  TimelineCoordinatorState,
  TimelineCoordinatorOptions,
  TextTimingEstimator,

} from '../types';
import { textTimingEstimator } from './textTimingEstimator';
import { timelineManager } from './timelineManager';

import { TimelineStateService } from './timeline/TimelineStateService';
import { TimelineScheduler as TimelineSchedulerService } from './timeline/TimelineScheduler';
import { TextStreamHandler } from './timeline/TextStreamHandler';

/**
 * TimelineCoordinator class
 *
 * Service for coordinating text-based timeline with audio.
 * Manages to synchronization between text-based timing estimates and actual audio playback.
 * Supports streaming text scenarios and automatic sync with audio.
 */
export class TimelineCoordinator {
  private estimator: TextTimingEstimator;
  private timelineManager: typeof timelineManager;
  private debug: boolean;

  // New services from Phase 5 refactoring
  private stateService: TimelineStateService;
  private scheduler: TimelineSchedulerService;
  private streamHandler: TextStreamHandler;

  constructor(options: TimelineCoordinatorOptions) {
    this.estimator = options.estimator;
    this.timelineManager = options.timelineManager;
    this.debug = options.debug ?? false;

    // Initialize new services from Phase 5
    this.stateService = new TimelineStateService();
    this.scheduler = new TimelineSchedulerService({
      timelineManager: options.timelineManager,
      debug: this.debug,
    });
    this.streamHandler = new TextStreamHandler({
      estimator: this.estimator,
      debug: this.debug,
    });

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

    // Update state
    this.stateService.setStatus('initialized');
    this.stateService.setTimeline(timeline);
    this.stateService.setTotalDuration(timeline.totalDuration);
    this.stateService.setCurrentTime(0);
    this.stateService.setHasAudio(false);
    this.stateService.setAudioDuration(null);
    this.stateService.setIsSynced(false);
    this.stateService.setSyncRatio(1.0);
    this.stateService.setCurrentEmotion(emotion || 'neutral');

    // Schedule animations using scheduler
    if (animations.length > 0) {
      this.scheduler.scheduleAnimations(animations, timeline);
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
    if (!this.stateService.getTimeline()) {
      console.warn('[TimelineCoordinator] Cannot sync - no timeline initialized');
      return;
    }

    const textDuration = this.stateService.getState().totalDuration;

    if (audioDuration <= 0) {
      console.warn('[TimelineCoordinator] Invalid audio duration:', audioDuration);
      return;
    }

    // Calculate sync ratio
    const syncRatio = textDuration / audioDuration;
    this.stateService.setSyncRatio(syncRatio);
    this.stateService.setAudioDuration(audioDuration);
    this.stateService.setHasAudio(true);
    this.stateService.setIsSynced(Math.abs(1.0 - syncRatio) < 0.1); // Within 10%

    // Adjust timeline duration to match audio
    this.stateService.setTimeline(this.scheduler.adjustTimelineDuration(this.stateService.getTimeline()!, audioDuration));

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
    this.streamHandler.append(text);
    
    // Update state with new timeline from stream handler
    const newTimeline = this.streamHandler.getAccumulatedTimeline();
    if (newTimeline) {
      this.stateService.setTimeline(newTimeline);
      this.stateService.setTotalDuration(newTimeline.totalDuration);
    }

    if (this.debug && newTimeline) {
      console.log(`%c[TimelineCoordinator] Appended text: "${text}"`,
        `new duration: ${newTimeline.totalDuration.toFixed(0)}ms, offset: ${this.streamHandler.getAccumulatedTimeline()?.totalDuration?.toFixed(0) || '0'}ms`,
        'background: #8e44ad; color: white; padding: 4px 8px; border-radius: 4px;');
    }
  }

  /**
   * Start timeline
   */
  start(): void {
    if (this.stateService.getState().status === 'running') {
      console.warn('[TimelineCoordinator] Already running');
      return;
    }

    if (!this.stateService.getTimeline()) {
      console.warn('[TimelineCoordinator] No timeline to start');
      return;
    }

    // Start timeline manager with text duration
    const duration = this.stateService.getState().hasAudio && this.stateService.getState().audioDuration
      ? this.stateService.getState().audioDuration!
      : this.stateService.getState().totalDuration;

    (this.timelineManager as any).start(duration);
    this.stateService.setStatus('running');

    if (this.debug) {
      console.log(`%c[TimelineCoordinator] Started timeline: duration=${duration.toFixed(0)}ms`,
        'background: #27ae60; color: white; padding: 4px 8px; border-radius: 4px;');
    }
  }

  /**
   * Pause timeline
   */
  pause(): void {
    if (this.stateService.getState().status !== 'running') {
      console.warn('[TimelineCoordinator] Not running, cannot pause');
      return;
    }

    (this.timelineManager as any).pause();
    this.stateService.setStatus('paused');

    if (this.debug) {
      console.log('%c[TimelineCoordinator] Paused timeline',
        'background: #f39c12; color: white; padding: 4px 8px; border-radius: 4px;');
    }
  }

  /**
   * Resume timeline
   */
  resume(): void {
    if (this.stateService.getState().status !== 'paused') {
      console.warn('[TimelineCoordinator] Not paused, cannot resume');
      return;
    }

    (this.timelineManager as any).resume();
    this.stateService.setStatus('running');

    if (this.debug) {
      console.log('%c[TimelineCoordinator] Resumed timeline',
        'background: #27ae60; color: white; padding: 4px 8px; border-radius: 4px;');
    }
  }

  /**
   * Stop timeline
   */
  stop(): void {
    if (this.stateService.getState().status === 'idle') {
      console.warn('[TimelineCoordinator] Already stopped');
      return;
    }

    (this.timelineManager as any).stop();
    this.stateService.setStatus('completed');

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
    if (this.stateService.getState().status === 'running' || this.stateService.getState().status === 'paused') {
      this.stateService.setCurrentTime((this.timelineManager as any).getCurrentTime());
    }

    return {
      status: this.stateService.getState().status,
      timeline: this.stateService.getTimeline(),
      currentTime: this.stateService.getState().currentTime,
      totalDuration: this.stateService.getState().totalDuration,
      hasAudio: this.stateService.getState().hasAudio,
      audioDuration: this.stateService.getState().audioDuration,
      isSynced: this.stateService.getState().isSynced,
      syncRatio: this.stateService.getState().syncRatio,
      error: this.stateService.getState().error,
      lastUpdated: this.stateService.getState().lastUpdated,
    };
  }

  /**
   * Get current progress (0-1)
   */
  getProgress(): number {
    const duration = this.stateService.getState().totalDuration;
    if (duration <= 0) {
      return 0;
    }

    const progress = this.stateService.getState().currentTime / duration;
    return Math.max(0, Math.min(1, progress));
  }

  /**
   * Get current time in milliseconds
   */
  getCurrentTime(): number {
    return this.stateService.getState().currentTime;
  }

  /**
   * Get total duration in milliseconds
   */
  getTotalDuration(): number {
    return this.stateService.getState().totalDuration;
  }

  /**
   * Get text timeline
   */
  getTimeline(): any {
    return this.stateService.getTimeline();
  }

  /**
   * Check if timeline is running
   */
  isRunning(): boolean {
    return this.stateService.getState().status === 'running';
  }

  /**
   * Check if timeline is synchronized with audio
   */
  isSynced(): boolean {
    return this.stateService.getState().isSynced;
  }

  /**
   * Reset coordinator state
   */
  reset(): void {
    // Stop timeline if running
    if (this.stateService.getState().status === 'running' || this.stateService.getState().status === 'paused') {
      (this.timelineManager as any).stop();
    }

    // Reset state
    this.stateService.reset();

    // Reset streaming handler
    this.streamHandler.reset();

    if (this.debug) {
      console.log('%c[TimelineCoordinator] Reset state',
        'background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px;');
    }
  }

  /**
   * Set current emotion
   */
  setEmotion(emotion: Emotion): void {
    this.stateService.setCurrentEmotion(emotion);

    if (this.debug) {
      console.log(`%c[TimelineCoordinator] Set emotion: ${emotion}`,
        'background: #9b59b6; color: white; padding: 4px 8px; border-radius: 4px;');
    }
  }

  /**
   * Get current emotion
   */
  getCurrentEmotion(): Emotion {
    return this.stateService.getCurrentEmotion();
  }
}

// Export singleton instance
export const timelineCoordinator = new TimelineCoordinator({
  estimator: textTimingEstimator,
  timelineManager: timelineManager, // FIX: No longer null - use actual TimelineManager instance
  debug: false,
});

// Export class for testing
export default TimelineCoordinator;
