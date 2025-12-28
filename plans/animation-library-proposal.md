# Animation Library - Comprehensive Proposal

**Version:** 1.0  
**Status:** Draft  
**Date:** 2025-12-28  
**Author:** Architecture Team

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Requirements](#requirements)
3. [Proposed Architecture](#proposed-architecture)
4. [Animation Categories](#animation-categories)
5. [Implementation Strategy](#implementation-strategy)
6. [Performance Considerations](#performance-considerations)
7. [Migration Path](#migration-path)
8. [Success Metrics](#success-metrics)

---

## 1. Current State Analysis

### 1.1 Available Animations

**File:** [`src/services/vrmaAnimationService.ts`](../src/services/vrmaAnimationService.ts:24)

The system currently has 6 VRMA animation files available:

| Animation Name | VRMA File | Description | Current Usage |
|----------------|------------|-------------|----------------|
| greeting | `/animations/vrma/VRMA_02.vrma` | Greeting animation | `talking` state |
| peace | `/animations/vrma/VRMA_03.vrma` | Peace sign animation | `happy` state |
| shoot | `/animations/vrma/VRMA_04.vrma` | Shoot animation | Not used |
| spin | `/animations/vrma/VRMA_05.vrma` | Spin animation | `thinking` state |
| modelPose | `/animations/vrma/VRMA_06.vrma` | Model pose animation | `idle` state |
| squat | `/animations/vrma/VRMA_07.vrma` | Squat animation | Not used |

**Current Limitations:**
- Only 6 animations available
- 2 animations unused (shoot, squat)
- Limited variety for each emotion state
- No gesture-specific animations (wave, thumbs_up, etc.)

### 1.2 Current Emotion-to-Animation Mapping

**File:** [`src/services/vrmaAnimationService.ts`](../src/services/vrmaAnimationService.ts:34)

```typescript
export const ANIMATION_STATE_TO_VRMA: Record<string, string> = {
  'idle': 'modelPose',      // Use model pose for idle
  'talking': 'greeting',    // Use greeting for talking
  'thinking': 'spin',        // Use spin for thinking
  'happy': 'peace',         // Use peace sign for happy
};
```

**Mapping Limitations:**
- Only 4 application states mapped
- No mapping for `sad` emotion state
- No mapping for gesture triggers from [`EmojiProcessor`](../src/services/textPreprocessing/processors/EmojiProcessor.ts:42)
- Gesture mappings in emoji preprocessing include 14 gestures not supported:
  - `laugh`, `love`, `surprised`, `angry`
  - `thumbs_up`, `thumbs_down`, `wave`, `praying`
  - `celebrate`, `heart`, `fire`, `sparkle`, `handshake`

### 1.3 Viseme System Implementation

**File:** [`src/services/visemePreprocessor.ts`](../src/services/visemePreprocessor.ts:1)

The viseme system provides:
- Phoneme-to-viseme mapping for English
- Text-to-viseme conversion with timing
- Smooth viseme transitions
- VRM blend shape mapping

**Current Capabilities:**
- 15 viseme types (including silence)
- Vowel combination detection
- Automatic duration estimation
- Interpolation between visemes

**Limitations:**
- English-only phoneme mapping
- No multi-language support
- No emotion-based viseme variation
- No emphasis-based viseme enhancement

### 1.4 Animation Loading and Caching

**File:** [`src/services/vrmaAnimationService.ts`](../src/services/vrmaAnimationService.ts:41)

The `VRMAAnimationService` provides:
- Lazy loading of VRMA files
- In-memory caching of loaded animations
- Retargeting cache for different VRM models
- Promise deduplication for concurrent loads

**Current Performance:**
- Initial load: 100-500ms per VRMA file
- Cached load: < 1ms
- Retargeting: 50-100ms per model-animation combination

---

## 2. Requirements

### 2.1 Support for Large Number of Default Animations

**Requirement:** The system must support a large library of default animations without performance degradation.

**Specifications:**
- Support for 50+ animations in the default library
- Sub-100ms load time for cached animations
- Memory usage < 100MB for full animation library
- Efficient indexing and lookup by name/category

**Use Cases:**
- Idle animations (breathing, blinking, subtle movements)
- Emotion state animations (happy, sad, angry, etc.)
- Gesture animations (wave, thumbs_up, clap, etc.)
- Talking animations (various speaking styles)
- Transition animations (smooth state changes)

### 2.2 Browser Performance Requirements

**Requirement:** The animation system must perform well in browser environments with limited resources.

**Specifications:**
- Initial load time < 3 seconds for full animation library
- Frame rate > 60 FPS during animation playback
- Memory usage < 200MB for full system (including models)
- Smooth transitions between animations (< 100ms blend time)

**Constraints:**
- Limited memory allocation (typical browser limit: 2-4GB)
- Single-threaded JavaScript execution
- Web Workers for background loading
- Lazy loading for non-critical animations

### 2.3 Support for Multiple Avatar Formats

**Requirement:** The system must support multiple avatar formats beyond VRM.

**Target Formats:**
- **VRM** (Virtual Reality Model) - Current format
- **GLB/GLTF** (Binary/JSON GL Transmission Format) - Widely supported
- **FBX** (Filmbox) - Mixamo format
- **USDZ** (Universal Scene Description) - Apple AR format

**Specifications:**
- Unified animation interface across formats
- Automatic format detection
- Format-specific loaders
- Retargeting between different formats

### 2.4 Gesture Duration Support

**Requirement:** Gestures should have configurable durations and automatic return to idle state.

**Specifications:**
- Configurable gesture duration (default: 1-2 seconds)
- Automatic return to idle state after gesture completes
- Support for looping gestures
- Gesture interruption support (new gesture cancels current)

**API Proposal:**
```typescript
interface GestureConfig {
  animation: string;
  duration?: number;           // Duration in ms (default: 1000)
  loop?: boolean;             // Loop animation (default: false)
  blendIn?: number;           // Blend-in duration in ms (default: 100)
  blendOut?: number;          // Blend-out duration in ms (default: 100)
  returnToIdle?: boolean;     // Return to idle after completion (default: true)
}

function playGesture(config: GestureConfig): void;
```

### 2.5 Sequential Gesture Support

**Requirement:** The system should support queuing and playing multiple gestures in sequence.

**Specifications:**
- Gesture queue with priority support
- Automatic queue management
- Queue inspection and manipulation
- Cancellation of queued gestures

**API Proposal:**
```typescript
interface GestureQueue {
  queue: GestureConfig[];
  current?: GestureConfig;
  isPlaying: boolean;
  
  enqueue(config: GestureConfig, priority?: number): void;
  dequeue(): GestureConfig | undefined;
  clear(): void;
  skipToNext(): void;
  getCurrent(): GestureConfig | undefined;
}
```

**Use Cases:**
- Composite gestures (e.g., celebration sequence)
- Storytelling with multiple animations
- Emotion transitions with intermediate states
- Complex emoji mappings (e.g., 🎉 → celebrate → happy → wave)

### 2.6 Emotion Transition Blending

**Requirement:** Smooth transitions between emotion states with configurable blend durations.

**Specifications:**
- Configurable blend duration (default: 300ms)
- Easing functions for natural transitions
- Emotion priority (new emotion overrides or blends)
- Decay of emotion intensity over time

**API Proposal:**
```typescript
interface EmotionTransition {
  from: Emotion;
  to: Emotion;
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

interface EmotionState {
  current: Emotion;
  intensity: number; // 0-1
  timestamp: number;
  target?: Emotion;
}

function setEmotion(
  emotion: Emotion, 
  intensity?: number,
  transition?: EmotionTransition
): void;
```

---

## 3. Proposed Architecture

### 3.1 Animation Library Structure

```
public/animations/
├── vrma/                          # VRM Animation files
│   ├── idle/
│   │   ├── idle_01.vrma           # Breathing idle
│   │   ├── idle_02.vrma           # Subtle movement idle
│   │   └── idle_03.vrma           # Looking around idle
│   ├── emotions/
│   │   ├── happy/
│   │   │   ├── happy_01.vrma      # Smile
│   │   │   ├── happy_02.vrma      # Laugh
│   │   │   └── happy_03.vrma      # Excited
│   │   ├── sad/
│   │   │   ├── sad_01.vrma        # Frown
│   │   │   └── sad_02.vrma        # Crying
│   │   ├── angry/
│   │   │   ├── angry_01.vrma      # Frown
│   │   │   └── angry_02.vrma      # Yelling
│   │   ├── surprised/
│   │   │   ├── surprised_01.vrma   # Eyes wide
│   │   │   └── surprised_02.vrma   # Jaw drop
│   │   ├── thinking/
│   │   │   ├── thinking_01.vrma    # Head tilt
│   │   │   └── thinking_02.vrma    # Chin scratch
│   │   └── love/
│   │       ├── love_01.vrma        # Heart eyes
│   │       └── love_02.vrma        # Blush
│   ├── gestures/
│   │   ├── wave/
│   │   │   ├── wave_01.vrma       # Simple wave
│   │   │   └── wave_02.vrma       # Enthusiastic wave
│   │   ├── thumbs_up/
│   │   │   ├── thumbs_up_01.vrma   # Thumbs up
│   │   │   └── thumbs_down_01.vrma # Thumbs down
│   │   ├── clap/
│   │   │   ├── clap_01.vrma       # Single clap
│   │   │   └── clap_02.vrma       # Multiple claps
│   │   ├── point/
│   │   │   ├── point_01.vrma       # Point forward
│   │   │   └── point_02.vrma       # Point up/down
│   │   └── other/
│   │       ├── praying_01.vrma     # Prayer
│   │       ├── shrug_01.vrma      # Shrug
│   │       ├── nod_01.vrma         # Nod
│   │       ├── shake_01.vrma       # Head shake
│   │       └── handshake_01.vrma    # Handshake
│   ├── talking/
│   │   ├── talking_01.vrma        # Normal talking
│   │   ├── talking_02.vrma        # Enthusiastic talking
│   │   └── talking_03.vrma        # Quiet talking
│   └── transitions/
│       ├── transition_01.vrma       # Generic transition
│       ├── transition_02.vrma       # Quick transition
│       └── transition_03.vrma       # Slow transition
├── mixamo/                        # Mixamo FBX files (optional)
│   ├── idle/
│   ├── emotions/
│   └── gestures/
└── config/
    └── animations.json            # Animation metadata and mappings
```

### 3.2 Loading Strategy

#### 3.2.1 Lazy Loading

**Strategy:** Load animations on-demand to minimize initial load time.

**Implementation:**
```typescript
class AnimationLibrary {
  private loadedAnimations: Map<string, Animation> = new Map();
  private loadingPromises: Map<string, Promise<Animation>> = new Map();
  private metadata: AnimationMetadata;
  
  async loadAnimation(name: string): Promise<Animation> {
    // Check cache
    if (this.loadedAnimations.has(name)) {
      return this.loadedAnimations.get(name)!;
    }
    
    // Check if already loading
    if (this.loadingPromises.has(name)) {
      return this.loadingPromises.get(name)!;
    }
    
    // Load animation
    const promise = this.loadAnimationFile(name)
      .then(animation => {
        this.loadedAnimations.set(name, animation);
        this.loadingPromises.delete(name);
        return animation;
      });
    
    this.loadingPromises.set(name, promise);
    return promise;
  }
}
```

**Benefits:**
- Reduced initial load time
- Lower memory usage
- Only load animations that are actually used

#### 3.2.2 Preloading Critical Animations

**Strategy:** Preload critical animations (idle, talking) during initialization.

**Implementation:**
```typescript
class AnimationLibrary {
  private readonly CRITICAL_ANIMATIONS = [
    'idle_01',
    'talking_01',
    'happy_01',
    'sad_01'
  ];
  
  async preloadCriticalAnimations(): Promise<void> {
    const promises = this.CRITICAL_ANIMATIONS.map(name => 
      this.loadAnimation(name)
    );
    await Promise.all(promises);
  }
}
```

**Benefits:**
- Instant availability of critical animations
- No latency for common states
- Better user experience

#### 3.2.3 Priority-Based Loading

**Strategy:** Load animations based on usage priority.

**Priority Levels:**
1. **Critical** (preload): idle, talking, basic emotions
2. **High** (load on first use): gestures, additional emotions
3. **Medium** (load when needed): transitions, variations
4. **Low** (load on demand): rare animations

**Implementation:**
```typescript
interface AnimationMetadata {
  name: string;
  path: string;
  category: AnimationCategory;
  priority: 'critical' | 'high' | 'medium' | 'low';
  preload?: boolean;
}
```

### 3.3 Retargeting System for Multiple Avatar Formats

#### 3.3.1 Unified Animation Interface

**Goal:** Provide a unified interface for animations across different avatar formats.

**Interface:**
```typescript
interface Animation {
  name: string;
  format: 'vrma' | 'glb' | 'fbx' | 'usdz';
  clip: THREE.AnimationClip;
  duration: number;
  tracks: THREE.KeyframeTrack[];
}

interface AvatarModel {
  id: string;
  format: 'vrm' | 'glb' | 'fbx' | 'usdz';
  skeleton: THREE.Skeleton;
  bones: Map<string, THREE.Bone>;
}
```

#### 3.3.2 Format-Specific Loaders

**Implementation:**
```typescript
class AnimationLoader {
  private loaders: Map<string, AnimationLoaderPlugin> = new Map();
  
  constructor() {
    this.registerLoader('vrma', new VRMALoader());
    this.registerLoader('glb', new GLTFLoader());
    this.registerLoader('fbx', new FBXLoader());
    this.registerLoader('usdz', new USDZLoader());
  }
  
  registerLoader(format: string, loader: AnimationLoaderPlugin): void {
    this.loaders.set(format, loader);
  }
  
  async loadAnimation(path: string): Promise<Animation> {
    const format = this.getFormatFromPath(path);
    const loader = this.loaders.get(format);
    
    if (!loader) {
      throw new Error(`No loader for format: ${format}`);
    }
    
    return loader.load(path);
  }
}
```

#### 3.3.3 Retargeting Pipeline

**Strategy:** Retarget animations from source format to target avatar.

**Pipeline:**
```
Source Animation (VRMA/FBX)
    ↓
Extract Bone Hierarchy
    ↓
Map Bones to Target Avatar
    ↓
Adjust for Height/Scale
    ↓
Convert Rotation/Position
    ↓
Target Animation (VRM/GLB)
```

**Implementation:**
```typescript
class AnimationRetargeter {
  retarget(
    sourceAnimation: Animation,
    targetAvatar: AvatarModel
  ): Animation {
    // 1. Extract bone mappings
    const boneMapping = this.createBoneMapping(
      sourceAnimation,
      targetAvatar
    );
    
    // 2. Adjust for height/scale
    const scaleFactor = this.calculateScaleFactor(
      sourceAnimation,
      targetAvatar
    );
    
    // 3. Convert tracks
    const retargetedTracks = sourceAnimation.tracks.map(track => 
      this.retargetTrack(track, boneMapping, scaleFactor)
    );
    
    // 4. Create new animation clip
    return new THREE.AnimationClip(
      sourceAnimation.name,
      sourceAnimation.duration,
      retargetedTracks
    );
  }
}
```

### 3.4 Performance Optimization Strategies

#### 3.4.1 Animation Compression

**Strategy:** Use animation compression to reduce file size and memory usage.

**Techniques:**
- **Keyframe reduction**: Remove redundant keyframes
- **Quantization**: Reduce precision of position/rotation values
- **Delta encoding**: Store differences between keyframes
- **Curve fitting**: Use Bezier curves instead of linear interpolation

**Implementation:**
```typescript
class AnimationCompressor {
  compress(animation: Animation, options: CompressionOptions): Animation {
    const compressedTracks = animation.tracks.map(track => {
      // Reduce keyframes
      const reducedKeyframes = this.reduceKeyframes(
        track,
        options.tolerance
      );
      
      // Quantize values
      const quantizedValues = this.quantizeValues(
        reducedKeyframes,
        options.precision
      );
      
      return new THREE.KeyframeTrack(
        track.name,
        reducedKeyframes.times,
        quantizedValues
      );
    });
    
    return new THREE.AnimationClip(
      animation.name,
      animation.duration,
      compressedTracks
    );
  }
}
```

#### 3.4.2 Level of Detail (LOD)

**Strategy:** Provide multiple quality levels for animations.

**LOD Levels:**
- **High**: Full keyframe detail (for close-ups)
- **Medium**: Reduced keyframes (for medium shots)
- **Low**: Minimal keyframes (for background/distance)

**Implementation:**
```typescript
interface LODAnimation {
  high: Animation;
  medium: Animation;
  low: Animation;
}

class LODAnimationManager {
  selectLOD(
    lodAnimation: LODAnimation,
    distance: number
  ): Animation {
    if (distance < 5) {
      return lodAnimation.high;
    } else if (distance < 10) {
      return lodAnimation.medium;
    } else {
      return lodAnimation.low;
    }
  }
}
```

#### 3.4.3 Caching Strategy

**Strategy:** Multi-level caching for optimal performance.

**Cache Levels:**
1. **Memory Cache**: In-memory cache for frequently used animations
2. **IndexedDB Cache**: Persistent cache for loaded animations
3. **CDN Cache**: Content delivery network for animation files

**Implementation:**
```typescript
class AnimationCache {
  private memoryCache: Map<string, Animation> = new Map();
  private idbCache: IDBCache;
  private maxMemorySize: number = 50; // Max 50 animations in memory
  
  async get(name: string): Promise<Animation | undefined> {
    // Check memory cache
    if (this.memoryCache.has(name)) {
      return this.memoryCache.get(name);
    }
    
    // Check IndexedDB cache
    const cached = await this.idbCache.get(name);
    if (cached) {
      // Promote to memory cache
      this.memoryCache.set(name, cached);
      return cached;
    }
    
    return undefined;
  }
  
  async set(name: string, animation: Animation): Promise<void> {
    // Store in memory cache
    if (this.memoryCache.size >= this.maxMemorySize) {
      this.evictLeastRecentlyUsed();
    }
    this.memoryCache.set(name, animation);
    
    // Store in IndexedDB cache
    await this.idbCache.set(name, animation);
  }
}
```

---

## 4. Animation Categories

### 4.1 Idle Animations

**Purpose:** Subtle animations when avatar is not actively interacting.

**Animations:**
1. **Breathing Idle** (`idle_01.vrma`)
   - Subtle chest movement
   - Slight head bobbing
   - Duration: Looping

2. **Looking Around Idle** (`idle_02.vrma`)
   - Head turns left/right
   - Eye movement
   - Duration: Looping (5-10s cycle)

3. **Weight Shift Idle** (`idle_03.vrma`)
   - Subtle weight shift between feet
   - Slight arm movement
   - Duration: Looping (3-5s cycle)

4. **Thinking Idle** (`idle_04.vrma`)
   - Head tilt
   - Hand on chin
   - Duration: Looping (4-6s cycle)

**Use Cases:**
- Waiting for user input
- Listening to user speech
- Processing AI response
- Background state

### 4.2 Emotion State Animations

**Purpose:** Express emotions through body language and facial expressions.

#### 4.2.1 Happy

1. **Smile** (`happy_01.vrma`)
   - Mouth smile
   - Eyes crinkle
   - Slight head tilt
   - Duration: 2-3s

2. **Laugh** (`happy_02.vrma`)
   - Mouth open laugh
   - Body shake
   - Hand on chest
   - Duration: 2-4s

3. **Excited** (`happy_03.vrma`)
   - Jump or bounce
   - Arms raised
   - Big smile
   - Duration: 1-2s

#### 4.2.2 Sad

1. **Frown** (`sad_01.vrma`)
   - Mouth frown
   - Eyebrows down
   - Shoulders slumped
   - Duration: 2-3s

2. **Crying** (`sad_02.vrma`)
   - Tears (if supported)
   - Hand wiping eyes
   - Shoulders shaking
   - Duration: 3-5s

#### 4.2.3 Angry

1. **Frown** (`angry_01.vrma`)
   - Mouth frown
   - Eyebrows furrowed
   - Arms crossed
   - Duration: 2-3s

2. **Yelling** (`angry_02.vrma`)
   - Mouth open
   - Arms raised
   - Body forward
   - Duration: 1-2s

#### 4.2.4 Surprised

1. **Eyes Wide** (`surprised_01.vrma`)
   - Eyes wide
   - Mouth open
   - Eyebrows raised
   - Duration: 1-2s

2. **Jaw Drop** (`surprised_02.vrma`)
   - Mouth open wide
   - Hands to face
   - Body leans back
   - Duration: 2-3s

#### 4.2.5 Thinking

1. **Head Tilt** (`thinking_01.vrma`)
   - Head tilt to side
   - Finger on chin
   - Eyes looking up
   - Duration: 2-4s

2. **Chin Scratch** (`thinking_02.vrma`)
   - Hand scratching chin
   - Eyes looking down
   - Slight head nod
   - Duration: 2-3s

#### 4.2.6 Love

1. **Heart Eyes** (`love_01.vrma`)
   - Heart-shaped eyes (if supported)
   - Hands on heart
   - Slight smile
   - Duration: 2-3s

2. **Blush** (`love_02.vrma`)
   - Cheek blush (if supported)
   - Hands covering face
   - Shy expression
   - Duration: 2-4s

### 4.3 Gesture Animations

**Purpose:** Communicate through hand and body gestures.

#### 4.3.1 Wave

1. **Simple Wave** (`wave_01.vrma`)
   - Hand wave
   - Arm extended
   - Duration: 1-2s

2. **Enthusiastic Wave** (`wave_02.vrma`)
   - Both hands waving
   - Body bounce
   - Big smile
   - Duration: 2-3s

#### 4.3.2 Thumbs Up/Down

1. **Thumbs Up** (`thumbs_up_01.vrma`)
   - Thumbs up gesture
   - Arm raised
   - Smile
   - Duration: 1-2s

2. **Thumbs Down** (`thumbs_down_01.vrma`)
   - Thumbs down gesture
   - Arm raised
   - Frown
   - Duration: 1-2s

#### 4.3.3 Clap

1. **Single Clap** (`clap_01.vrma`)
   - Hands clap once
   - Arms extended
   - Duration: 0.5-1s

2. **Multiple Claps** (`clap_02.vrma`)
   - Hands clap multiple times
   - Rhythmic pattern
   - Duration: 2-3s

#### 4.3.4 Point

1. **Point Forward** (`point_01.vrma`)
   - Finger points forward
   - Arm extended
   - Duration: 1-2s

2. **Point Up/Down** (`point_02.vrma`)
   - Finger points up or down
   - Arm raised
   - Duration: 1-2s

#### 4.3.5 Other Gestures

1. **Prayer** (`praying_01.vrma`)
   - Hands together
   - Head bowed
   - Duration: 2-3s

2. **Shrug** (`shrug_01.vrma`)
   - Shoulders raised
   - Hands out
   - Head tilt
   - Duration: 1-2s

3. **Nod** (`nod_01.vrma`)
   - Head nods up/down
   - Duration: 0.5-1s

4. **Head Shake** (`shake_01.vrma`)
   - Head shakes left/right
   - Duration: 0.5-1s

5. **Handshake** (`handshake_01.vrma`)
   - Hand extends for handshake
   - Duration: 1-2s

### 4.4 Talking Animations

**Purpose:** Natural body language during speech.

**Animations:**
1. **Normal Talking** (`talking_01.vrma`)
   - Subtle head movement
   - Occasional hand gestures
   - Duration: Looping

2. **Enthusiastic Talking** (`talking_02.vrma`)
   - More head movement
   - Frequent hand gestures
   - Body leaning forward
   - Duration: Looping

3. **Quiet Talking** (`talking_03.vrma`)
   - Minimal head movement
   - No hand gestures
   - Body still
   - Duration: Looping

### 4.5 Transition Animations

**Purpose:** Smooth transitions between emotion states.

**Animations:**
1. **Generic Transition** (`transition_01.vrma`)
   - Neutral blend
   - Duration: 300ms

2. **Quick Transition** (`transition_02.vrma`)
   - Fast blend
   - Duration: 100ms

3. **Slow Transition** (`transition_03.vrma`)
   - Gradual blend
   - Duration: 500ms

---

## 5. Implementation Strategy

### 5.1 VRMA Animation Expansion

**Phase 1: Core Emotions (Week 1-2)**
- Create VRMA animations for core emotions:
  - happy (smile, laugh, excited)
  - sad (frown, crying)
  - angry (frown, yelling)
  - surprised (eyes wide, jaw drop)
  - thinking (head tilt, chin scratch)
  - love (heart eyes, blush)

**Phase 2: Idle Animations (Week 2-3)**
- Create idle animations:
  - breathing idle
  - looking around idle
  - weight shift idle
  - thinking idle

**Phase 3: Gesture Animations (Week 3-4)**
- Create gesture animations:
  - wave (simple, enthusiastic)
  - thumbs up/down
  - clap (single, multiple)
  - point (forward, up/down)
  - other gestures (prayer, shrug, nod, shake, handshake)

**Phase 4: Talking Animations (Week 4-5)**
- Create talking animations:
  - normal talking
  - enthusiastic talking
  - quiet talking

**Phase 5: Transition Animations (Week 5)**
- Create transition animations:
  - generic transition
  - quick transition
  - slow transition

**Total Estimated Time:** 5 weeks

### 5.2 Mixamo Integration Approach

**Strategy:** Use Mixamo animations as source and retarget to VRM format.

#### 5.2.1 Mixamo Account Setup

1. Create Mixamo account (free tier available)
2. Download Mixamo animations in FBX format
3. Select animations compatible with VRM skeleton

#### 5.2.2 Retargeting Pipeline

**Existing Solution:** [`public/animations/proposal.md`](../public/animations/proposal.md:1)

The Mixamo-to-VRM retargeting solution is already documented:

```typescript
export function loadMixamoAnimation(url, vrm) {
  const loader = new FBXLoader();
  return loader.loadAsync(url).then((asset) => {
    const clip = THREE.AnimationClip.findByName(asset.animations, 'mixamo.com');
    const tracks = [];
    
    // Adjust with reference to hips height
    const motionHipsHeight = asset.getObjectByName('mixamorigHips').position.y;
    const vrmHipsHeight = vrm.humanoid.normalizedRestPose.hips.position[1];
    const hipsPositionScale = vrmHipsHeight / motionHipsHeight;
    
    clip.tracks.forEach((track) => {
      const trackSplitted = track.name.split('.');
      const mixamoRigName = trackSplitted[0];
      const vrmBoneName = mixamoVRMRigMap[mixamoRigName];
      const vrmNodeName = vrm.humanoid?.getNormalizedBoneNode(vrmBoneName)?.name;
      const mixamoRigNode = asset.getObjectByName(mixamoRigName);
      
      if (vrmNodeName != null) {
        // Retarget rotation and position
        // ... (see full implementation in proposal.md)
      }
    });
    
    return new THREE.AnimationClip('vrmAnimation', clip.duration, tracks);
  });
}
```

#### 5.2.3 Bone Mapping

**Required Mapping:** Mixamo bone names to VRM bone names

```typescript
const mixamoVRMRigMap = {
  'mixamorigHips': 'hips',
  'mixamorigSpine': 'spine',
  'mixamorigSpine1': 'chest',
  'mixamorigSpine2': 'upperChest',
  'mixamorigNeck': 'neck',
  'mixamorigHead': 'head',
  'mixamorigLeftShoulder': 'leftUpperArm',
  'mixamorigLeftArm': 'leftLowerArm',
  'mixamorigLeftForeArm': 'leftHand',
  'mixamorigRightShoulder': 'rightUpperArm',
  'mixamorigRightArm': 'rightLowerArm',
  'mixamorigRightForeArm': 'rightHand',
  'mixamorigLeftUpLeg': 'leftUpperLeg',
  'mixamorigLeftLeg': 'leftLowerLeg',
  'mixamorigLeftFoot': 'leftFoot',
  'mixamorigRightUpLeg': 'rightUpperLeg',
  'mixamorigRightLeg': 'rightLowerLeg',
  'mixamorigRightFoot': 'rightFoot',
};
```

#### 5.2.4 Mixamo Animation Selection

**Recommended Mixamo Animations:**

| Category | Animations | Mixamo Name |
|-----------|-------------|-------------|
| Idle | Idle | Standing Idle |
| Idle | Breathing | Breathing Idle |
| Happy | Smile | Happy Idle |
| Happy | Laugh | Laughing |
| Sad | Sad | Sad Idle |
| Angry | Angry | Angry Idle |
| Surprised | Surprised | Surprised Reaction |
| Thinking | Thinking | Thinking Pose |
| Wave | Wave | Wave |
| Thumbs Up | Thumbs Up | Thumbs Up |
| Clap | Clap | Clapping |
| Point | Point | Pointing Forward |
| Nod | Nod | Yes Nod |
| Shake | Shake | No Nod |

**Total Estimated Time:** 2-3 weeks (including retargeting and testing)

### 5.3 Custom Animation Creation

**Strategy:** Create custom VRMA animations for specific use cases.

#### 5.3.1 Animation Tools

**Recommended Tools:**
1. **VRoid Studio** - Create VRM avatars
2. **Unity + VRM Plugin** - Create and edit VRMA animations
3. **Blender + VRM Addon** - Advanced animation editing
4. **Mixamo** - Source animations for retargeting

#### 5.3.2 Animation Pipeline

```
Concept/Design
    ↓
Source Animation (Mixamo/Custom)
    ↓
Retarget to VRM (if needed)
    ↓
Edit in Unity/Blender
    ↓
Export as VRMA
    ↓
Test in Application
    ↓
Optimize (compression, LOD)
    ↓
Deploy
```

#### 5.3.3 Quality Assurance

**Checklist:**
- [ ] Animation loops smoothly (if looping)
- [ ] No visible glitches or artifacts
- [ ] Proper bone weights
- [ ] Natural movement
- [ ] Appropriate duration
- [ ] Correct file format
- [ ] File size optimized
- [ ] Works with multiple VRM models

**Total Estimated Time:** 3-4 weeks (for 20+ custom animations)

### 5.4 Performance Optimization Techniques

#### 5.4.1 Animation Compression

**Technique 1: Keyframe Reduction**

```typescript
function reduceKeyframes(
  track: THREE.KeyframeTrack,
  tolerance: number = 0.01
): THREE.KeyframeTrack {
  const reducedTimes: number[] = [];
  const reducedValues: number[] = [];
  
  // Always keep first keyframe
  reducedTimes.push(track.times[0]);
  reducedValues.push(...track.values.slice(0, track.getValueSize()));
  
  for (let i = 1; i < track.times.length - 1; i++) {
    const prevValue = track.values.slice(
      (i - 1) * track.getValueSize(),
      i * track.getValueSize()
    );
    const currValue = track.values.slice(
      i * track.getValueSize(),
      (i + 1) * track.getValueSize()
    );
    const nextValue = track.values.slice(
      (i + 1) * track.getValueSize(),
      (i + 2) * track.getValueSize()
    );
    
    // Check if current keyframe can be removed
    const interpolated = interpolate(
      prevValue,
      nextValue,
      (track.times[i] - track.times[i - 1]) / 
      (track.times[i + 1] - track.times[i - 1])
    );
    
    const difference = Math.max(
      ...currValue.map((v, j) => Math.abs(v - interpolated[j]))
    );
    
    if (difference > tolerance) {
      reducedTimes.push(track.times[i]);
      reducedValues.push(...currValue);
    }
  }
  
  // Always keep last keyframe
  reducedTimes.push(track.times[track.times.length - 1]);
  reducedValues.push(...track.values.slice(
    (track.times.length - 1) * track.getValueSize()
  ));
  
  return new THREE.KeyframeTrack(
    track.name,
    reducedTimes,
    reducedValues
  );
}
```

**Expected Improvement:** 30-50% reduction in keyframe count

#### 5.4.2 Lazy Loading Implementation

**Strategy:** Load animations on-demand based on usage patterns.

```typescript
class LazyAnimationLoader {
  private usageStats: Map<string, { count: number; lastUsed: number }> = new Map();
  private preloadThreshold: number = 3; // Preload after 3 uses
  
  async loadAnimation(name: string): Promise<Animation> {
    // Update usage stats
    const stats = this.usageStats.get(name) || { count: 0, lastUsed: 0 };
    stats.count++;
    stats.lastUsed = Date.now();
    this.usageStats.set(name, stats);
    
    // Load animation
    const animation = await this.loadFromFile(name);
    
    // Preload related animations if threshold reached
    if (stats.count >= this.preloadThreshold) {
      const relatedAnimations = this.getRelatedAnimations(name);
      relatedAnimations.forEach(relatedName => {
        this.preloadAnimation(relatedName);
      });
    }
    
    return animation;
  }
  
  private getRelatedAnimations(name: string): string[] {
    // Return animations in the same category
    const category = this.getAnimationCategory(name);
    return this.getAnimationsInCategory(category)
      .filter(n => n !== name);
  }
}
```

**Expected Improvement:** 40-60% reduction in initial load time

#### 5.4.3 Caching Implementation

**Strategy:** Multi-level caching for optimal performance.

```typescript
class MultiLevelCache {
  private memoryCache: LRUCache<string, Animation>;
  private idbCache: IndexedDBCache;
  private networkCache: NetworkCache;
  
  async get(name: string): Promise<Animation | undefined> {
    // Check memory cache (fastest)
    const memoryResult = this.memoryCache.get(name);
    if (memoryResult) {
      return memoryResult;
    }
    
    // Check IndexedDB cache (fast)
    const idbResult = await this.idbCache.get(name);
    if (idbResult) {
      // Promote to memory cache
      this.memoryCache.set(name, idbResult);
      return idbResult;
    }
    
    // Check network cache (moderate)
    const networkResult = await this.networkCache.get(name);
    if (networkResult) {
      // Promote to IndexedDB and memory cache
      await this.idbCache.set(name, networkResult);
      this.memoryCache.set(name, networkResult);
      return networkResult;
    }
    
    return undefined;
  }
  
  async set(name: string, animation: Animation): Promise<void> {
    // Store in all cache levels
    this.memoryCache.set(name, animation);
    await this.idbCache.set(name, animation);
    await this.networkCache.set(name, animation);
  }
}
```

**Expected Improvement:** 70-80% cache hit rate for repeated animations

---

## 6. Performance Considerations

### 6.1 Memory Management

**Strategy:** Efficient memory usage for large animation libraries.

#### 6.1.1 Memory Budget

**Target Memory Usage:**
- Idle animations: 5-10MB
- Emotion animations: 20-30MB
- Gesture animations: 15-25MB
- Talking animations: 5-10MB
- Transition animations: 2-5MB
- **Total**: 47-80MB for full library

**Current Memory Usage:**
- 6 VRMA animations: 6-30MB
- **Improvement needed**: 1.5-2.7x increase for 50+ animations

#### 6.1.2 Memory Optimization Techniques

**Technique 1: Animation Compression**
- Reduce keyframe count by 30-50%
- Quantize position/rotation values
- Use delta encoding

**Technique 2: Lazy Loading**
- Load animations on-demand
- Unload unused animations
- Keep only critical animations in memory

**Technique 3: LOD System**
- Use low-detail animations for distance
- Reduce keyframe count for LOD levels
- Switch LOD based on camera distance

**Technique 4: Memory Pooling**
- Reuse animation clip objects
- Pool keyframe track arrays
- Reduce garbage collection

### 6.2 Loading Strategies

**Strategy:** Balance initial load time with runtime performance.

#### 6.2.1 Progressive Loading

**Phase 1: Critical Animations (0-2s)**
- Load idle animations
- Load basic emotion animations
- Load talking animations

**Phase 2: High-Priority Animations (2-5s)**
- Load gesture animations
- Load additional emotion animations

**Phase 3: Low-Priority Animations (5-10s)**
- Load transition animations
- Load rare animations

#### 6.2.2 Background Loading

**Strategy:** Load animations in background using Web Workers.

```typescript
class BackgroundAnimationLoader {
  private worker: Worker;
  private loadingQueue: Map<string, Promise<Animation>> = new Map();
  
  constructor() {
    this.worker = new Worker('/workers/animation-loader.js');
    this.worker.onmessage = (event) => {
      const { name, animation } = event.data;
      const promise = this.loadingQueue.get(name);
      if (promise) {
        // Resolve promise with loaded animation
        // ...
      }
    };
  }
  
  async loadAnimation(name: string): Promise<Animation> {
    if (this.loadingQueue.has(name)) {
      return this.loadingQueue.get(name)!;
    }
    
    const promise = new Promise<Animation>((resolve) => {
      this.worker.postMessage({ name, path: this.getAnimationPath(name) });
      // Store resolve function
      // ...
    });
    
    this.loadingQueue.set(name, promise);
    return promise;
  }
}
```

**Benefits:**
- Non-blocking UI during animation loading
- Parallel loading of multiple animations
- Better user experience

### 6.3 Caching Mechanisms

**Strategy:** Multi-level caching for optimal performance.

#### 6.3.1 Cache Hierarchy

```
Level 1: Memory Cache (LRU)
  - Size: 50 animations
  - Access time: < 1ms
  - Eviction: Least recently used
  
Level 2: IndexedDB Cache
  - Size: Unlimited (limited by storage)
  - Access time: 10-50ms
  - Persistence: Permanent
  
Level 3: CDN Cache
  - Size: Unlimited
  - Access time: 100-500ms
  - Persistence: Configurable
```

#### 6.3.2 Cache Invalidation

**Strategy:** Invalidate cache based on version and time.

```typescript
class CacheInvalidator {
  private cacheVersion: string = '1.0.0';
  private maxAge: number = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  shouldInvalidate(cacheEntry: CacheEntry): boolean {
    // Check version
    if (cacheEntry.version !== this.cacheVersion) {
      return true;
    }
    
    // Check age
    const age = Date.now() - cacheEntry.timestamp;
    if (age > this.maxAge) {
      return true;
    }
    
    return false;
  }
}
```

### 6.4 LOD (Level of Detail) for Animations

**Strategy:** Provide multiple quality levels for animations.

#### 6.4.1 LOD Levels

**Level 0: High Detail**
- Full keyframe detail
- All bone tracks
- Target: Close-up shots (< 5 units)

**Level 1: Medium Detail**
- Reduced keyframes (50%)
- Essential bone tracks only
- Target: Medium shots (5-10 units)

**Level 2: Low Detail**
- Minimal keyframes (25%)
- Root bone tracks only
- Target: Background/distance (> 10 units)

#### 6.4.2 LOD Selection

```typescript
class LODAnimationManager {
  selectLOD(
    lodAnimation: LODAnimation,
    camera: THREE.Camera,
    avatar: THREE.Object3D
  ): Animation {
    const distance = camera.position.distanceTo(avatar.position);
    
    if (distance < 5) {
      return lodAnimation.high;
    } else if (distance < 10) {
      return lodAnimation.medium;
    } else {
      return lodAnimation.low;
    }
  }
}
```

**Expected Improvement:** 30-50% reduction in CPU usage for distant avatars

---

## 7. Migration Path

### 7.1 Phase 1: Preparation (Week 1)

**Tasks:**
1. Set up animation library structure
2. Create animation metadata configuration
3. Implement lazy loading system
4. Set up caching infrastructure

**Deliverables:**
- Animation library directory structure
- Animation metadata JSON file
- Lazy loading implementation
- Caching system

### 7.2 Phase 2: Core Animations (Week 2-4)

**Tasks:**
1. Create core emotion animations
2. Create idle animations
3. Create talking animations
4. Test animations with existing VRM models

**Deliverables:**
- 20+ VRMA animations
- Updated emotion-to-animation mapping
- Animation testing suite

### 7.3 Phase 3: Gesture Animations (Week 5-7)

**Tasks:**
1. Create gesture animations
2. Implement gesture duration support
3. Implement sequential gesture support
4. Integrate with text preprocessing system

**Deliverables:**
- 15+ gesture animations
- Gesture duration system
- Gesture queue system
- Text preprocessing integration

### 7.4 Phase 4: Mixamo Integration (Week 8-10)

**Tasks:**
1. Set up Mixamo account
2. Download Mixamo animations
3. Implement retargeting pipeline
4. Test retargeted animations

**Deliverables:**
- 20+ Mixamo animations retargeted to VRM
- Retargeting pipeline
- Mixamo integration documentation

### 7.5 Phase 5: Performance Optimization (Week 11-12)

**Tasks:**
1. Implement animation compression
2. Implement LOD system
3. Optimize caching strategy
4. Performance testing and tuning

**Deliverables:**
- Animation compression system
- LOD system
- Optimized caching
- Performance benchmarks

### 7.6 Phase 6: Rollout (Week 13)

**Tasks:**
1. Update documentation
2. Train users on new system
3. Monitor performance
4. Collect feedback

**Deliverables:**
- Updated documentation
- User training materials
- Performance monitoring dashboard
- Feedback collection system

### 7.7 Rollback Plan

**Strategy:** Maintain backward compatibility during rollout.

**Rollback Steps:**
1. Keep old animation files in backup
2. Use feature flags to enable/disable new animations
3. Monitor for issues during rollout
4. Quick rollback if issues detected

**Rollback Triggers:**
- Performance degradation > 20%
- Critical bugs in animation system
- User complaints > 10% of users
- Compatibility issues with VRM models

---

## 8. Success Metrics

### 8.1 Feature Completeness

- [ ] 50+ animations in library
- [ ] All emoji gestures supported
- [ ] All emotion states mapped
- [ ] Gesture duration support implemented
- [ ] Sequential gesture support implemented
- [ ] Emotion transition blending implemented
- [ ] Mixamo integration working
- [ ] LOD system implemented

### 8.2 Performance Targets

| Metric | Current | Target | Improvement |
|--------|---------|---------|-------------|
| Initial load time | 100-500ms | < 3s (50 animations) | Acceptable |
| Cached load time | < 1ms | < 1ms | Maintained |
| Retargeting overhead | 50-100ms | < 50ms | 2x faster |
| Memory usage (50 animations) | N/A | < 100MB | Target |
| Frame rate during playback | 60 FPS | 60 FPS | Maintained |
| Cache hit rate | N/A | > 70% | Target |

### 8.3 Quality Metrics

- [ ] All animations loop smoothly (if looping)
- [ ] No visible glitches or artifacts
- [ ] Natural movement in all animations
- [ ] Proper bone weights
- [ ] Appropriate durations
- [ ] Correct file formats
- [ ] File sizes optimized
- [ ] Works with multiple VRM models

### 8.4 User Experience

- [ ] Avatar emotions match text intent > 90% of the time
- [ ] Gestures feel natural and well-timed
- [ ] Animation transitions are smooth
- [ ] System feels responsive and smooth
- [ ] Load times are acceptable
- [ ] Memory usage is acceptable
- [ ] User satisfaction > 4/5 stars

---

## Appendix

### A. File Structure

```
public/animations/
├── vrma/
│   ├── idle/
│   ├── emotions/
│   │   ├── happy/
│   │   ├── sad/
│   │   ├── angry/
│   │   ├── surprised/
│   │   ├── thinking/
│   │   └── love/
│   ├── gestures/
│   │   ├── wave/
│   │   ├── thumbs_up/
│   │   ├── clap/
│   │   ├── point/
│   │   └── other/
│   ├── talking/
│   └── transitions/
├── mixamo/
│   ├── idle/
│   ├── emotions/
│   └── gestures/
└── config/
    └── animations.json

src/services/
├── vrmaAnimationService.ts
├── visemePreprocessor.ts
├── visemeApplicationService.ts
├── animationLibrary.ts          # NEW
├── animationLoader.ts           # NEW
├── animationRetargeter.ts       # NEW
├── animationCache.ts            # NEW
└── animationLOD.ts             # NEW

src/types/
└── animation.ts                 # NEW (animation types)
```

### B. Related Documents

- [Animation System - Current State](../public/animations/proposal.md)
- [Text Preprocessing System - Current State](text-preprocessing-current-state.md)
- [Text Preprocessing System V2 TODO](text-preprocessing-v2-todo.md)
- [VRMA Animation Service](../src/services/vrmaAnimationService.ts)
- [Viseme Preprocessor](../src/services/visemePreprocessor.ts)

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-28  
**Status:** Draft - Ready for Review  
**Next Review:** After Phase 1 completion
