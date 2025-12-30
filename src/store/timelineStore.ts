import { create } from 'zustand';
import {
  TimelineState,
  ScheduledAnimation,
  VisemeData,
  Emotion
} from '../types';

/**
 * Timeline Store
 * 
 * Manages timeline state for parallel execution strategy.
 * Tracks scheduled events, active animations, and timeline status.
 */
export const useTimelineStore = create<TimelineState>()((set) => ({
  // Timeline status
  isPlaying: false,
  startTime: null,
  currentTime: 0,
  duration: 0,
  
  // Scheduled events
  scheduledAnimations: [],
  scheduledVisemes: [],
  scheduledEmotions: [],
  
  // Active state
  activeAnimations: new Map(),
  currentViseme: null,
  currentEmotion: 'neutral',
  
  // Actions
  startTimeline: (duration) => set({
    isPlaying: true,
    startTime: performance.now(),
    duration,
    currentTime: 0
  }),
  
  stopTimeline: () => set({
    isPlaying: false,
    startTime: null,
    activeAnimations: new Map()
  }),
  
  scheduleAnimation: (animation) => set((state) => ({
    scheduledAnimations: [...state.scheduledAnimations, animation].sort(
      (a, b) => a.triggerTime - b.triggerTime
    )
  })),
  
  scheduleViseme: (viseme, time) => set((state) => ({
    scheduledVisemes: [...state.scheduledVisemes, { viseme, time }].sort(
      (a, b) => a.time - b.time
    )
  })),
  
  scheduleEmotion: (emotion, time) => set((state) => ({
    scheduledEmotions: [...state.scheduledEmotions, { emotion, time }].sort(
      (a, b) => a.time - b.time
    )
  })),
  
  updateCurrentTime: (time) => set({ currentTime: time }),
  
  clearTimeline: () => set({
    scheduledAnimations: [],
    scheduledVisemes: [],
    scheduledEmotions: [],
    activeAnimations: new Map(),
    currentViseme: null
  })
}));

export default useTimelineStore;
