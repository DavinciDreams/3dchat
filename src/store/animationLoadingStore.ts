import { create } from 'zustand';
import { type AnimationPriority } from '../services/animation/AnimationPriorityService';

export type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

export interface AnimationLoadingInfo {
  name: string;
  state: LoadingState;
  progress?: number; // 0-100
  error?: string;
  tier?: AnimationPriority;
}

export interface AnimationLoadingStore {
  // Loading states for individual animations
  loadingStates: Map<string, LoadingState>;
  
  // Currently loading animations
  currentlyLoading: Set<string>;
  
  // Failed animations
  failedAnimations: Set<string>;
  
  // Progress tracking for each tier
  tierProgress: Record<AnimationPriority, { loaded: number; total: number }>;
  
  // Overall loading state
  isCriticalLoaded: boolean;
  isHighPriorityComplete: boolean;
  
  // Actions
  setLoadingState: (name: string, state: LoadingState) => void;
  setCurrentlyLoading: (name: string, isLoading: boolean) => void;
  setFailedAnimation: (name: string, error: string) => void;
  updateTierProgress: (tier: AnimationPriority, loaded: number, total: number) => void;
  setCriticalLoaded: (isLoaded: boolean) => void;
  setHighPriorityComplete: (isComplete: boolean) => void;
  clearFailed: () => void;
  reset: () => void;
}

/**
 * Animation Loading Store
 * Tracks loading progress and states for VRMA animations
 */
export const useAnimationLoadingStore = create<AnimationLoadingStore>((set, get) => ({
  loadingStates: new Map(),
  currentlyLoading: new Set(),
  failedAnimations: new Set(),
  tierProgress: {
    CRITICAL: { loaded: 0, total: 0 },
    HIGH: { loaded: 0, total: 0 },
    MEDIUM: { loaded: 0, total: 0 },
    LOW: { loaded: 0, total: 0 },
  },
  isCriticalLoaded: false,
  isHighPriorityComplete: false,

  setLoadingState: (name, state) => set((store) => {
    const newStates = new Map(store.loadingStates);
    newStates.set(name, state);
    return { loadingStates: newStates };
  }),

  setCurrentlyLoading: (name, isLoading) => set((store) => {
    const newLoading = new Set(store.currentlyLoading);
    if (isLoading) {
      newLoading.add(name);
    } else {
      newLoading.delete(name);
    }
    return { currentlyLoading: newLoading };
  }),

  setFailedAnimation: (name, error) => set((store) => {
    const newFailed = new Set(store.failedAnimations);
    newFailed.add(name);
    const newStates = new Map(store.loadingStates);
    newStates.set(name, 'error');
    return { 
      failedAnimations: newFailed,
      loadingStates: newStates
    };
  }),

  updateTierProgress: (tier, loaded, total) => set((store) => {
    return {
      tierProgress: {
        ...store.tierProgress,
        [tier]: { loaded, total }
      }
    };
  }),

  setCriticalLoaded: (isLoaded) => set({ isCriticalLoaded: isLoaded }),

  setHighPriorityComplete: (isComplete) => set({ isHighPriorityComplete: isComplete }),

  clearFailed: () => set({ 
    failedAnimations: new Set(),
    loadingStates: new Map(Array.from(get().loadingStates.entries()).map(([name]) => [name, 'idle'] as [string, LoadingState]))
  }),

  reset: () => set({
    loadingStates: new Map(),
    currentlyLoading: new Set(),
    failedAnimations: new Set(),
    tierProgress: {
      CRITICAL: { loaded: 0, total: 0 },
      HIGH: { loaded: 0, total: 0 },
      MEDIUM: { loaded: 0, total: 0 },
      LOW: { loaded: 0, total: 0 },
    },
    isCriticalLoaded: false,
    isHighPriorityComplete: false,
  }),
}));

// Selectors for convenient access
export const selectAnimationLoadingState = (name: string) => (state: AnimationLoadingStore) => 
  state.loadingStates.get(name) || 'idle';

export const selectIsAnimationLoading = (name: string) => (state: AnimationLoadingStore) => 
  state.currentlyLoading.has(name);

export const selectIsAnimationFailed = (name: string) => (state: AnimationLoadingStore) => 
  state.failedAnimations.has(name);

export const selectTierProgress = (tier: AnimationPriority) => (state: AnimationLoadingStore) => 
  state.tierProgress[tier] || { loaded: 0, total: 0 };

export const selectOverallProgress = (state: AnimationLoadingStore) => {
  const totalAnimations = Object.values(state.tierProgress).reduce((sum, tier) => sum + tier.total, 0);
  const loadedAnimations = Object.values(state.tierProgress).reduce((sum, tier) => sum + tier.loaded, 0);
  return totalAnimations > 0 ? Math.round((loadedAnimations / totalAnimations) * 100) : 0;
};
