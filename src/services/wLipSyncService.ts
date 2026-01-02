/**
 * wLipSync Service
 * 
 * Manages audio-based lip sync using MFCC analysis via wLipSync library.
 * This provides significantly improved accuracy over text-based viseme systems.
 * 
 * @see https://github.com/mrxz/wLipSync for library documentation
 * @see https://github.com/hecomi/uLipSync for Unity profile creation
 */

import { createWLipSyncNode, WLipSyncAudioNode } from 'wlipsync';
import { vrmProfileService } from './vrmProfileService';

/**
 * Phoneme weights from wLipSync
 * Maps to VRM blend shapes: A -> aa, E -> ee, I -> ih, O -> oh, U -> ou
 */
export interface PhonemeWeights {
  /** A phoneme weight (maps to VRM 'aa' blend shape) */
  A: number;
  /** E phoneme weight (maps to VRM 'ee' blend shape) */
  E: number;
  /** I phoneme weight (maps to VRM 'ih' blend shape) */
  I: number;
  /** O phoneme weight (maps to VRM 'oh' blend shape) */
  O: number;
  /** U phoneme weight (maps to VRM 'ou' blend shape) */
  U: number;
}

/**
 * wLipSync service configuration options
 */
export interface WLipSyncOptions {
  /** Minimum volume threshold for lip sync activation (0-1) */
  minVolume?: number;
  /** Maximum volume threshold (0-1) */
  maxVolume?: number;
  /** Smoothing factor for weight transitions (0-1, higher = smoother) */
  smoothness?: number;
  /** Audio block size for processing (default: 512) */
  blockSize?: number;
}

/**
 * Default options for wLipSync
 */
const DEFAULT_OPTIONS: Required<WLipSyncOptions> = {
  minVolume: 0.0,
  maxVolume: 1.0,
  smoothness: 0.5,
  blockSize: 512,
};

/**
 * wLipSync Service class
 * 
 * Manages the wLipSync audio node for real-time lip sync.
 */
export class WLipSyncService {
  private audioContext: AudioContext | null = null;
  private lipsyncNode: WLipSyncAudioNode | null = null;
  private audioSource: AudioBufferSourceNode | MediaStreamAudioSourceNode | null = null;
  private modelId: string | null = null;
  private isInitialized: boolean = false;
  private options: Required<WLipSyncOptions>;

  constructor(options: WLipSyncOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Initialize wLipSync for a specific VRM model
   * 
   * @param modelId - The VRM model ID to initialize lip sync for
   * @returns Promise that resolves when initialization is complete
   * @throws Error if profile is not available or initialization fails
   */
  async initialize(modelId: string): Promise<void> {
    // Check if profile exists for this model
    if (!vrmProfileService.hasProfile(modelId)) {
      console.warn(`[wLipSyncService] No profile available for model: ${modelId}`);
      throw new Error(`No wLipSync profile available for model: ${modelId}`);
    }

    const profile = vrmProfileService.getProfile(modelId);
    if (!profile || !profile.isAvailable) {
      throw new Error(`Could not get profile path for model: ${modelId}`);
    }
    const profilePath = profile.profilePath;

    // Check secure context requirement (HTTPS or localhost)
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      console.warn('[wLipSyncService] wLipSync requires secure context (HTTPS or localhost)');
      throw new Error('wLipSync requires secure context (HTTPS or localhost)');
    }

    try {
      // Create or resume audio context
      if (!this.audioContext) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioContext = new AudioContextClass();
      }
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Load profile JSON
      const profileResponse = await fetch(profilePath);
      if (!profileResponse.ok) {
        throw new Error(`Failed to load profile from: ${profilePath}`);
      }
      const profile = await profileResponse.json();

      // Create wLipSync node
      this.lipsyncNode = await createWLipSyncNode(this.audioContext, profile);

      // Configure node with options
      this.lipsyncNode.minVolume = this.options.minVolume;
      this.lipsyncNode.maxVolume = this.options.maxVolume;
      this.lipsyncNode.smoothness = this.options.smoothness;
      // blockSize is a property, not a method
      (this.lipsyncNode as { blockSize: number }).blockSize = this.options.blockSize;

      this.modelId = modelId;
      this.isInitialized = true;

      console.log(`[wLipSyncService] Initialized for model: ${modelId}`);
    } catch (error) {
      console.error('[wLipSyncService] Initialization failed:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Connect an audio source to the wLipSync node
   * 
   * @param source - Audio source to connect (AudioBufferSourceNode or MediaStreamAudioSourceNode)
   * @throws Error if not initialized
   */
  connectAudioSource(source: AudioBufferSourceNode | MediaStreamAudioSourceNode): void {
    if (!this.isInitialized || !this.lipsyncNode || !this.audioContext) {
      throw new Error('wLipSyncService not initialized. Call initialize() first.');
    }

    // Disconnect previous source if exists
    if (this.audioSource) {
      this.audioSource.disconnect();
    }

    // Connect new source
    source.connect(this.lipsyncNode);
    this.audioSource = source;

    console.log('[wLipSyncService] Audio source connected');
  }

  /**
   * Get current phoneme weights
   * 
   * @returns Object with weights for A, E, I, O, U phonemes
   * @throws Error if not initialized
   */
  getWeights(): PhonemeWeights {
    if (!this.isInitialized || !this.lipsyncNode) {
      throw new Error('wLipSyncService not initialized. Call initialize() first.');
    }

    const weights = this.lipsyncNode.weights;
    return {
      A: weights.A ?? 0,
      E: weights.E ?? 0,
      I: weights.I ?? 0,
      O: weights.O ?? 0,
      U: weights.U ?? 0,
    };
  }

  /**
   * Get current volume level
   * 
   * @returns Volume level (0-1)
   * @throws Error if not initialized
   */
  getVolume(): number {
    if (!this.isInitialized || !this.lipsyncNode) {
      throw new Error('wLipSyncService not initialized. Call initialize() first.');
    }

    return this.lipsyncNode.volume;
  }

  /**
   * Update method to be called in animation loop
   * This is a no-op as wLipSync processes audio in real-time via AudioWorklet
   * The weights and volume are updated automatically by the audio processor
   * 
   * @deprecated This method is kept for API compatibility but does nothing
   */
  update(): void {
    // wLipSync processes audio in real-time via AudioWorklet
    // No manual update needed - weights are updated automatically
  }

  /**
   * Check if service is initialized
   * 
   * @returns True if initialized and ready to use
   */
  isReady(): boolean {
    return this.isInitialized && this.lipsyncNode !== null;
  }

  /**
   * Get the current model ID
   * 
   * @returns Model ID or null if not initialized
   */
  getModelId(): string | null {
    return this.modelId;
  }

  /**
   * Get the AudioContext (useful for connecting to other audio nodes)
   * 
   * @returns AudioContext or null if not initialized
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Get the wLipSync node (useful for advanced audio routing)
   * 
   * @returns WLipSyncAudioNode or null if not initialized
   */
  getLipSyncNode(): WLipSyncAudioNode | null {
    return this.lipsyncNode;
  }

  /**
   * Update configuration options
   * 
   * @param options - New options to apply
   */
  updateOptions(options: Partial<WLipSyncOptions>): void {
    this.options = { ...this.options, ...options };

    if (this.lipsyncNode) {
      if (options.minVolume !== undefined) {
        this.lipsyncNode.minVolume = options.minVolume;
      }
      if (options.maxVolume !== undefined) {
        this.lipsyncNode.maxVolume = options.maxVolume;
      }
      if (options.smoothness !== undefined) {
        this.lipsyncNode.smoothness = options.smoothness;
      }
      if (options.blockSize !== undefined) {
        // blockSize is a property, not a method
        (this.lipsyncNode as { blockSize: number }).blockSize = options.blockSize;
      }
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.audioSource) {
      this.audioSource.disconnect();
      this.audioSource = null;
    }

    if (this.lipsyncNode) {
      this.lipsyncNode.disconnect();
      this.lipsyncNode = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      // Don't close the audio context as it may be used by other services
      this.audioContext = null;
    }

    this.modelId = null;
    this.isInitialized = false;

    console.log('[wLipSyncService] Cleaned up');
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    // wLipSync automatically resets when audio stops
    // No manual reset needed
  }
}

// Singleton instance
let wLipSyncServiceInstance: WLipSyncService | null = null;

/**
 * Get or create the singleton wLipSync service instance
 * 
 * @param options - Options for the service (only used on first call)
 * @returns The singleton instance
 */
export function getWLipSyncService(options?: WLipSyncOptions): WLipSyncService {
  if (!wLipSyncServiceInstance) {
    wLipSyncServiceInstance = new WLipSyncService(options);
  }
  return wLipSyncServiceInstance;
}

/**
 * Reset the singleton instance (useful for testing or model changes)
 */
export function resetWLipSyncService(): void {
  if (wLipSyncServiceInstance) {
    wLipSyncServiceInstance.cleanup();
    wLipSyncServiceInstance = null;
  }
}
