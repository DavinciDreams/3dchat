# AI Response Animation Trigger System

## Overview

Trigger avatar animations based on **what the AI says in its response**, not internal state changes.

```
User: "Can you spin?"
AI Response: "Of course! *spins around* That was fun!"
                         ↓
              Detect "spin" keyword
                         ↓
              Trigger spin animation
```

## Design

### Detection Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI Response                               │
│  "Sure! I'd love to spin for you! *does a little twirl*"        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  AnimationCommandProcessor                       │
│  - Scans response text for animation keywords                    │
│  - Returns detected animation name                               │
│  - Adds to metadata.animations[]                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ChatInterface.tsx                            │
│  - After TTS/playback, check metadata.animations                 │
│  - Call store.setCurrentAnimation('spin')                        │
│  - Animation plays, then returns to idle                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AvatarModel.tsx                             │
│  - useEffect watches currentAnimation state                      │
│  - Plays requested animation                                     │
│  - After animation completes, reset to idle                      │
└─────────────────────────────────────────────────────────────────┘
```

## Animation Keyword Mapping

```typescript
const ANIMATION_TRIGGERS: Record<string, string[]> = {
  'spin': ['spin', 'spinning', 'twirl', 'twirling', 'rotate', 'turn around'],
  'squat': ['squat', 'squatting', 'crouch', 'crouching', 'duck', 'ducking'],
  'shoot': ['shoot', 'shooting', 'pew', 'bang', 'fire', 'gun'],
  'greeting': ['wave', 'waving', 'hello', 'hi there', 'greet', 'greeting'],
  'peace': ['peace', 'victory', 'peace sign', 'v sign', 'yeah'],
};
```

## Implementation

### 1. Add Types (src/types/index.ts)

```typescript
// Add to TextMetadata interface
export interface TextMetadata {
  emphasis: EmphasisData[];
  emojis: EmojiData[];
  links: LinkData[];
  animations: AnimationTrigger[];  // NEW
}

export interface AnimationTrigger {
  name: string;           // Animation name: 'spin', 'squat', etc.
  keyword: string;        // The keyword that triggered it
  position: number;       // Position in text where found
}
```

### 2. Add Store State (src/store/chatStore.ts)

```typescript
// Add to ChatState
currentAnimation: string | null;
setCurrentAnimation: (animation: string | null) => void;

// In create()
currentAnimation: null,
setCurrentAnimation: (animation) => set({ currentAnimation: animation }),
```

### 3. Create AnimationCommandProcessor

```typescript
// src/services/textPreprocessing/processors/AnimationCommandProcessor.ts

import { BaseProcessor } from '../BaseProcessor';
import { TextMetadata } from '../../../types';

const ANIMATION_TRIGGERS: Record<string, string[]> = {
  'spin': ['spin', 'spinning', 'twirl', 'twirling', 'rotate', 'turn around', 'pirouette'],
  'squat': ['squat', 'squatting', 'crouch', 'crouching', 'duck', 'ducking', 'bend down'],
  'shoot': ['shoot', 'shooting', 'pew pew', 'bang', 'fire', 'finger guns'],
  'greeting': ['wave', 'waving', 'hello', 'hi there', 'hey there'],
  'peace': ['peace sign', 'peace', 'victory sign', 'v sign'],
};

export class AnimationCommandProcessor extends BaseProcessor {
  name = 'animation';
  priority = 25; // After emoji (20), before link (30)

  process(text: string, metadata: TextMetadata) {
    const lowerText = text.toLowerCase();
    const animations: AnimationTrigger[] = [];

    for (const [animationName, keywords] of Object.entries(ANIMATION_TRIGGERS)) {
      for (const keyword of keywords) {
        const position = lowerText.indexOf(keyword);
        if (position !== -1) {
          animations.push({
            name: animationName,
            keyword,
            position
          });
          break; // Only trigger each animation once
        }
      }
    }

    return {
      cleanText: text,  // Don't modify text
      displayText: text,
      metadata: {
        ...metadata,
        animations
      }
    };
  }
}
```

### 4. Register Processor (PreprocessingPipeline.ts)

```typescript
import { AnimationCommandProcessor } from './processors/AnimationCommandProcessor';

constructor() {
  this.register(new PunctuationProcessor());
  this.register(new EmojiProcessor());
  this.register(new AnimationCommandProcessor());  // NEW
  this.register(new LinkProcessor());
}
```

### 5. Trigger Animation (ChatInterface.tsx)

```typescript
// After audio playback completes (~line 233)
console.log('Audio playback finished');

// Trigger animations from AI response
if (processed.metadata.animations && processed.metadata.animations.length > 0) {
  const store = useChatStore.getState();
  // Play the first detected animation
  const animation = processed.metadata.animations[0];
  console.log('🎬 Triggering animation:', animation.name);
  store.setCurrentAnimation(animation.name);

  // Reset to idle after animation duration (e.g., 2 seconds)
  setTimeout(() => {
    store.setCurrentAnimation(null);
  }, 2000);
}
```

### 6. React to Animation State (AvatarModel.tsx)

```typescript
// Add currentAnimation to destructured store values
const { emotion, isSpeaking, visemes, selectedModelId, currentAnimation } = store;

// Add new useEffect for explicit animation triggers
useEffect(() => {
  if (!mixer.current || !currentAnimation) return;

  const action = vrmaActions.current[currentAnimation];
  if (!action) {
    console.warn(`Animation not found: ${currentAnimation}`);
    return;
  }

  console.log('🎬 Playing triggered animation:', currentAnimation);

  // Fade out all other actions
  Object.values(vrmaActions.current).forEach(a => {
    if (a !== action) a.fadeOut(0.3);
  });

  // Play the requested animation
  action.reset().fadeIn(0.3).play();

}, [currentAnimation, vrmaAnimationsLoaded]);

// Update the emotion useEffect to not override currentAnimation
useEffect(() => {
  if (!mixer.current) return;
  if (currentAnimation) return; // Don't override explicit animation

  // ... existing emotion-based animation logic
}, [emotion, isSpeaking, vrmaAnimationsLoaded, currentAnimation]);
```

## Example Interactions

### User: "Do a spin!"
```
AI Response: "Wheee! *spins around excitedly* That was fun!"
Detected: animations: [{ name: 'spin', keyword: 'spins', position: 12 }]
Result: Avatar performs spin animation
```

### User: "Can you wave hello?"
```
AI Response: "Hello there! *waves enthusiastically*"
Detected: animations: [{ name: 'greeting', keyword: 'waves', position: 16 }]
Result: Avatar performs greeting/wave animation
```

### User: "Show me your victory pose"
```
AI Response: "Victory! *strikes a peace sign pose*"
Detected: animations: [{ name: 'peace', keyword: 'peace sign', position: 18 }]
Result: Avatar performs peace animation
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/types/index.ts` | Modify | Add `animations` to `TextMetadata`, add `AnimationTrigger` type |
| `src/store/chatStore.ts` | Modify | Add `currentAnimation` state and setter |
| `src/services/textPreprocessing/processors/AnimationCommandProcessor.ts` | Create | New processor to detect animation keywords |
| `src/services/textPreprocessing/PreprocessingPipeline.ts` | Modify | Register new processor |
| `src/components/ChatInterface.tsx` | Modify | Trigger animation after audio playback |
| `src/components/AvatarModel.tsx` | Modify | React to `currentAnimation` state |

## Future Enhancements

1. **Animation Queue**: Support multiple animations in sequence
2. **Animation Duration Detection**: Read actual clip duration instead of hardcoded timeout
3. **AI System Prompt**: Tell AI about available animations so it uses them appropriately
4. **User Command Parsing**: Detect commands in user input to make AI more likely to animate
