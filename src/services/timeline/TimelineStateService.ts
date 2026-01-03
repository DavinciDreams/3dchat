/**
 * TimelineStateService
 *
 * Manages timeline state including status, time, duration, and emotion.
 * Pure state management without business logic.
 */

import type { Emotion, TimelineCoordinatorState, TextTimeline } from '../../types';

/**
 * Timeline State Manager interface
 */
export interface ITimelineStateService {
  /**
   * Get current state
   */
  getState(): TimelineCoordinatorState;

  /**
   * Set timeline status
   */
  setStatus(status: TimelineCoordinatorState['status']): void;

  /**
   * Set current time
   */
  setCurrentTime(time: number): void;

  /**
   * Set total duration
   */
  setTotalDuration(duration: number): void;

  /**
   * Set timeline
   */
  setTimeline(timeline: TextTimeline | null): void;

  /**
   * Get timeline
   */
  getTimeline(): TextTimeline | null;

  /**
   * Set has audio flag
   */
  setHasAudio(hasAudio: boolean): void;

  /**
   * Set audio duration
   */
  setAudioDuration(audioDuration: number | null): void;

  /**
   * Set synced flag
   */
  setIsSynced(isSynced: boolean): void;

  /**
   * Set sync ratio
   */
  setSyncRatio(ratio: number): void;

  /**
   * Set error
   */
  setError(error: string | null): void;

  /**
   * Reset state
   */
  reset(): void;

  /**
   * Get current emotion
   */
  getCurrentEmotion(): Emotion;

  /**
   * Set current emotion
   */
  setCurrentEmotion(emotion: Emotion): void;

  /**
   * Get scheduled animations
   */
  getScheduledAnimations(): unknown[];

  /**
   * Set scheduled animations
   */
  setScheduledAnimations(animations: unknown[]): void;

  /**
   * Clear scheduled animations
   */
  clearScheduledAnimations(): void;
}

/**
 * Timeline State Service class
 *
 * Pure state management for timeline coordinator.
 */
export class TimelineStateService implements ITimelineStateService {
  private state: TimelineCoordinatorState;
  private currentEmotion: Emotion;
  private timeline: TextTimeline | null;
  private scheduledAnimations: unknown[] = [];

  constructor() {
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
    this.currentEmotion = 'neutral';
    this.timeline = null;
  }

  /**
   * Get current state
   */
  getState(): TimelineCoordinatorState {
    return { ...this.state };
  }

  /**
   * Set timeline status
   */
  setStatus(status: TimelineCoordinatorState['status']): void {
    this.state.status = status;
    this.updateLastUpdated();
  }

  /**
   * Set current time
   */
  setCurrentTime(time: number): void {
    this.state.currentTime = time;
    this.updateLastUpdated();
  }

  /**
   * Set total duration
   */
  setTotalDuration(duration: number): void {
    this.state.totalDuration = duration;
    this.updateLastUpdated();
  }

  /**
   * Set timeline
   */
  setTimeline(timeline: TextTimeline | null): void {
    this.timeline = timeline;
    this.state.timeline = timeline;
    if (timeline) {
      this.state.totalDuration = timeline.totalDuration;
    }
    this.updateLastUpdated();
  }

  /**
   * Get timeline
   */
  getTimeline(): TextTimeline | null {
    return this.timeline;
  }

  /**
   * Set has audio flag
   */
  setHasAudio(hasAudio: boolean): void {
    this.state.hasAudio = hasAudio;
    this.updateLastUpdated();
  }

  /**
   * Set audio duration
   */
  setAudioDuration(audioDuration: number | null): void {
    this.state.audioDuration = audioDuration;
    this.updateLastUpdated();
  }

  /**
   * Set synced flag
   */
  setIsSynced(isSynced: boolean): void {
    this.state.isSynced = isSynced;
    this.updateLastUpdated();
  }

  /**
   * Set sync ratio
   */
  setSyncRatio(ratio: number): void {
    this.state.syncRatio = ratio;
    this.updateLastUpdated();
  }

  /**
   * Set error
   */
  setError(error: string | null): void {
    this.state.error = error;
    this.updateLastUpdated();
  }

  /**
   * Reset state
   */
  reset(): void {
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
    this.currentEmotion = 'neutral';
    this.timeline = null;
    this.scheduledAnimations = [];
  }

  /**
   * Get current emotion
   */
  getCurrentEmotion(): Emotion {
    return this.currentEmotion;
  }

  /**
   * Set current emotion
   */
  setCurrentEmotion(emotion: Emotion): void {
    this.currentEmotion = emotion;
    this.updateLastUpdated();
  }

  /**
   * Get scheduled animations
   */
  getScheduledAnimations(): unknown[] {
    return [...this.scheduledAnimations];
  }

  /**
   * Set scheduled animations
   */
  setScheduledAnimations(animations: unknown[]): void {
    this.scheduledAnimations = animations;
  }

  /**
   * Clear scheduled animations
   */
  clearScheduledAnimations(): void {
    this.scheduledAnimations = [];
  }

  /**
   * Update last updated timestamp
   */
  private updateLastUpdated(): void {
    this.state.lastUpdated = Date.now();
  }
}

export default TimelineStateService;
