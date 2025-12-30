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
  private playing: boolean = false;
  private animationFrameId: number | null = null;
  private lastTickTime: number = 0;
  private options: Required<TimelineOptions>;
  private eventCounter: number = 0;

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
   * Main tick loop - executes events whose time has come
   */
  private tick(): void {
    if (!this.playing) return;

    const currentTime = performance.now() - this.audioStartTime;
    
    // Check for significant drift (>100ms)
    if (this.lastTickTime > 0) {
      const expectedTime = this.lastTickTime + this.options.tickRate;
      const drift = Math.abs(currentTime - expectedTime);
      
      if (drift > 100) {
        console.warn(`%c⚠️ [TimelineManager] Timeline drift detected: ${drift.toFixed(0)}ms`, 
          'color: #f39c12;');
        // Adjust start time to compensate
        this.audioStartTime = performance.now() - currentTime;
      }
    }
    
    this.lastTickTime = currentTime;
    
    // Call tick hook
    this.onTick?.(currentTime);
    
    // Execute all events whose time has passed
    while (this.events.length > 0 && this.events[0].timestamp <= currentTime) {
      const event = this.events.shift()!;
      
      console.log(`%c✨ [TimelineManager] Triggering event: ${event.type} at ${currentTime.toFixed(0)}ms`, 
        'background: #27ae60; color: white; padding: 2px 6px;');
      
      // Execute with timeout protection to prevent blocking
      setTimeout(() => {
        try {
          event.callback();
          this.onEventTriggered?.(event);
        } catch (error) {
          console.error(`%c❌ [TimelineManager] Event callback failed for ${event.id}:`, 
            'color: #e74c3c;', error);
        }
      }, 0);
    }

    this.animationFrameId = requestAnimationFrame(() => this.tick());
  }
}

// Export singleton instance
export const timelineManager = new TimelineManager();

// Export class for testing
export default TimelineManager;
