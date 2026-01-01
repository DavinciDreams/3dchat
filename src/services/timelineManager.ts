import {
  TimelineEvent,
  TimelineOptions,
  TimelineEventType
} from '../types';

/**
 * TimelineManager
 * 
 * Central coordination service for all time-based events.
 * Manages scheduling and execution of animations, visemes, and emotions
 * synchronized with audio playback.
 */
export class TimelineManager {
  private events: TimelineEvent[] = [];
  private audioStartTime: number = 0;
  private audioDuration: number = 0;
  private playing: boolean = false;
  private animationFrameId: number | null = null;
  private lastTickTime: number = 0;
  private options: Required<TimelineOptions>;
  private eventCounter: number = 0;
  // FIX: Store original expected time separately for drift calculation
  private originalExpectedTime: number = 0;

  // Event hooks
  public onTick?: (currentTime: number) => void;
  public onEventTriggered?: (event: TimelineEvent) => void;
  public onTimelineComplete?: () => void;

  constructor(options?: TimelineOptions) {
    this.options = {
      tickRate: options?.tickRate ?? 16,
      maxLookahead: options?.maxLookahead ?? 1000
    };
  }

  /**
   * Start timeline synchronized with audio
   * @param audioDuration - Total duration of audio in milliseconds
   */
  start(audioDuration: number): void {
    console.log(`%c⏱️ [TimelineManager] Starting timeline with duration: ${audioDuration}ms`,
      'background: #3498db; color: white; padding: 4px 8px; border-radius: 4px;');
    
    this.audioDuration = audioDuration;
    this.audioStartTime = performance.now();
    this.playing = true;
    this.lastTickTime = 0;
    this.tick();
  }

  /**
   * Schedule an event at a specific time
   * @param event - The event to schedule
   */
  schedule(event: TimelineEvent): void {
    if (!event.id) {
      event.id = `timeline_event_${this.eventCounter++}`;
    }
    
    this.events.push(event);
    this.events.sort((a, b) => {
      // Sort by timestamp, then by priority for same timestamp
      const timeDiff = a.timestamp - b.timestamp;
      if (timeDiff !== 0) return timeDiff;
      
      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;
      return priorityB - priorityA; // Higher priority first
    });
    
    console.log(`%c📅 [TimelineManager] Scheduled event: ${event.type} at ${event.timestamp}ms`, 
      'color: #3498db;');
  }

  /**
   * Schedule multiple events at once
   * @param events - Array of events to schedule
   */
  scheduleBatch(events: TimelineEvent[]): void {
    events.forEach(event => this.schedule(event));
  }

  /**
   * Cancel a specific event by ID
   * @param id - Event ID to cancel
   */
  cancelEvent(id: string): void {
    const index = this.events.findIndex(e => e.id === id);
    if (index !== -1) {
      this.events.splice(index, 1);
      console.log(`%c❌ [TimelineManager] Cancelled event: ${id}`, 'color: #e74c3c;');
    }
  }

  /**
   * Cancel all events of a specific type
   * @param type - Event type to cancel
   */
  cancelEventsByType(type: TimelineEventType): void {
    const countBefore = this.events.length;
    this.events = this.events.filter(e => e.type !== type);
    const cancelled = countBefore - this.events.length;
    if (cancelled > 0) {
      console.log(`%c❌ [TimelineManager] Cancelled ${cancelled} events of type: ${type}`, 
        'color: #e74c3c;');
    }
  }

  /**
   * Get current playback time
   * @returns Current time in milliseconds since timeline start
   */
  getCurrentTime(): number {
    if (!this.playing || this.audioStartTime === 0) {
      return 0;
    }
    return performance.now() - this.audioStartTime;
  }

  /**
   * Get total timeline duration
   * @returns Duration in milliseconds
   */
  getDuration(): number {
    return this.audioDuration;
  }

  /**
   * Get upcoming events
   * @param count - Maximum number of events to return
   * @returns Array of upcoming events
   */
  getUpcomingEvents(count?: number): TimelineEvent[] {
    const currentTime = this.getCurrentTime();
    const upcoming = this.events.filter(e => e.timestamp > currentTime);
    return count ? upcoming.slice(0, count) : upcoming;
  }

  /**
   * Check if timeline is currently playing
   * @returns True if playing
   */
  isPlaying(): boolean {
    return this.playing;
  }

  /**
   * Pause the timeline (keeps events, stops execution)
   */
  pause(): void {
    console.log('%c⏸️ [TimelineManager] Pausing timeline', 'color: #f39c12;');
    this.playing = false;
  }

  /**
   * Resume the timeline
   */
  resume(): void {
    console.log('%c▶️ [TimelineManager] Resuming timeline', 'color: #27ae60;');
    this.playing = true;
    this.lastTickTime = 0;
    this.tick();
  }

  /**
   * Stop and clear all events
   */
  stop(): void {
    console.log('%c⏹ [TimelineManager] Stopping timeline', 'color: #e74c3c;');
    this.playing = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.onTimelineComplete?.();
  }

  /**
   * Clear all scheduled events
   */
  clear(): void {
    this.events = [];
    this.stop();
    console.log('%c🗑️ [TimelineManager] Cleared all events', 'color: #95a5a6;');
  }

  /**
   * Start timeline from text duration (text-based timing)
   * @param textDuration - Text duration in milliseconds
   */
  startFromText(textDuration: number): void {
    console.log(`%c⏱️ [TimelineManager] Starting timeline from text duration: ${textDuration}ms`,
      'background: #27ae60; color: white; padding: 4px 8px; border-radius: 4px;');

    this.audioDuration = textDuration;
    this.audioStartTime = performance.now();
    this.playing = true;
    this.lastTickTime = 0;
    this.tick();
  }

  /**
   * Adjust timeline duration (for syncing with audio)
   * @param newDuration - New duration in milliseconds
   */
  adjustDuration(newDuration: number): void {
    console.log(`%c⏱️ [TimelineManager] Adjusting timeline duration from ${this.getDuration()}ms to ${newDuration}ms`,
      'background: #f39c12; color: white; padding: 4px 8px; border-radius: 4px;');

    const ratio = newDuration / this.getDuration();
    if (ratio !== 1) {
      // Scale all event timestamps by the ratio
      this.events.forEach(event => {
        event.timestamp = Math.floor(event.timestamp * ratio);
      });
    }

    this.audioDuration = newDuration;
    this.onTimelineComplete?.();
  }

  /**
   * Get current progress (0-1)
   * @returns Progress value between 0 and 1
   */
  getProgress(): number {
    const duration = this.getDuration();
    if (duration <= 0) {
      return 0;
    }

    const currentTime = this.getCurrentTime();
    const progress = currentTime / duration;
    return Math.max(0, Math.min(1, progress));
  }

  /**
   * Main tick loop - executes on each animation frame
   */
  private tick(): void {
    if (!this.playing) return;

    const currentTime = performance.now() - this.audioStartTime;
    
    // FIX: Store original expected time separately for drift calculation
    // Previously used circular reference (currentTime vs expectedTime) which didn't fix drift
    if (this.lastTickTime > 0) {
      // Calculate expected time based on original baseline
      this.originalExpectedTime += this.options.tickRate;
      const drift = Math.abs(currentTime - this.originalExpectedTime);
      
      if (drift > 100) {
        console.warn(`%c⚠️ [TimelineManager] Timeline drift detected: ${drift.toFixed(0)}ms`,
          'color: #f39c12;');
        // Adjust start time to compensate for drift
        this.audioStartTime = performance.now() - this.originalExpectedTime;
      }
    } else {
      // Initialize on first tick
      this.originalExpectedTime = currentTime;
    }
    
    this.lastTickTime = currentTime;
    
    // Call tick hook
    this.onTick?.(currentTime);
    
    // Execute all events whose time has passed
    while (this.events.length > 0 && this.events[0].timestamp <= currentTime) {
      const event = this.events.shift()!;
      
      console.log(`%c✨ [TimelineManager] Triggering event: ${event.type} at ${currentTime.toFixed(0)}ms`,
        'background: #27ae60; color: white; padding: 2px 6px;');
      
      // FIX: Execute callbacks synchronously to prevent timing drift
      // Previously used setTimeout(..., 0) which caused timing inconsistencies
      try {
        event.callback();
        this.onEventTriggered?.(event);
      } catch (error) {
        console.error(`%c❌ [TimelineManager] Event callback failed for ${event.id}:`,
          'color: #e74c3c;', error);
      }
    }

    this.animationFrameId = requestAnimationFrame(() => this.tick());
  }
}

// Export singleton instance
export const timelineManager = new TimelineManager();

// Export class for testing
export default TimelineManager;
