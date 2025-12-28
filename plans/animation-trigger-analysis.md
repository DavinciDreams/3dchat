# Animation Trigger System Analysis

## Problem Statement

User says "can you spin" → AI responds but avatar does NOT perform the spin animation, even though:
- Logs confirm `spin` animation is loaded: `Available VRMA animations: (6) ['spin', 'squat', 'modelPose', 'shoot', 'greeting', 'peace']`
- The avatar just stays in idle pose

## Root Cause

Animations are **only triggered by emotion state changes**, not by explicit commands or AI responses.

### Current Animation Trigger Flow (AvatarModel.tsx:320-357)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  isSpeaking     │────▶│  'greeting'      │     │ No way to       │
│  === true       │     │  animation       │     │ trigger 'spin'  │
└─────────────────┘     └──────────────────┘     │ directly!       │
                                                  └─────────────────┘
┌─────────────────┐     ┌──────────────────┐
│  emotion ===    │────▶│  'spin'          │  ◀── Only way to spin
│  'thinking'     │     │  animation       │      is during AI processing
└─────────────────┘     └──────────────────┘

┌─────────────────┐     ┌──────────────────┐
│  emotion ===    │────▶│  'peace'         │
│  'happy'        │     │  animation       │
└─────────────────┘     └──────────────────┘

┌─────────────────┐     ┌──────────────────┐
│  default        │────▶│  'modelPose'     │
│  (neutral)      │     │  (idle)          │
└─────────────────┘     └──────────────────┘
```

### The Mapping Problem

| Animation | When Triggered | Problem |
|-----------|---------------|---------|
| `spin` | `emotion === 'thinking'` | Only during AI processing, not on command |
| `squat` | Never | No emotion maps to it |
| `shoot` | Never | No emotion maps to it |
| `greeting` | `isSpeaking === true` | Only while audio plays |
| `peace` | `emotion === 'happy'` | Only after AI responds |
| `modelPose` | Default/idle | Always returns to this |

### Why "spin" Doesn't Work

1. User says "do a spin"
2. AI processes → `emotion` set to `'thinking'` → spin plays briefly
3. AI responds → `emotion` set to `'happy'` → peace plays
4. Audio finishes → `emotion` returns to `'neutral'` → idle
5. User never sees spin tied to the command, just briefly during loading

## Available Animations Not Exposed

```typescript
// Loaded but NOT triggerable by user:
'spin'     - mapped to 'thinking' (internal state only)
'squat'    - NOT mapped to anything
'shoot'    - NOT mapped to anything
'greeting' - mapped to isSpeaking (automatic)
'peace'    - mapped to 'happy' (internal state only)
'modelPose' - default idle
```

## Proposed Solution

### Option A: Add Animation Command Detection (Recommended)

Create a new processor that detects animation commands and triggers them directly.

```typescript
// New state in chatStore.ts
currentAnimation: string | null;
setCurrentAnimation: (animation: string | null) => void;

// New processor: AnimationCommandProcessor.ts
const ANIMATION_KEYWORDS: Record<string, string> = {
  'spin': 'spin',
  'spinning': 'spin',
  'twirl': 'spin',
  'squat': 'squat',
  'crouch': 'squat',
  'shoot': 'shoot',
  'wave': 'greeting',
  'hello': 'greeting',
  'peace': 'peace',
  'victory': 'peace',
  'pose': 'modelPose',
};

// Detect in user input OR AI response
function detectAnimationCommand(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [keyword, animation] of Object.entries(ANIMATION_KEYWORDS)) {
    if (lower.includes(keyword)) {
      return animation;
    }
  }
  return null;
}
```

### Option B: Expand Emotion System

Expand `Emotion` type to include animation states:

```typescript
type Emotion = 'neutral' | 'happy' | 'thinking' | 'sad'
             | 'spin' | 'squat' | 'shoot' | 'greeting' | 'peace';
```

Then map each emotion directly to its animation.

### Option C: System Prompt Approach

Instruct the AI to include animation tags in responses:

```
System: When the user asks you to perform an action, include [ANIMATION:name] in your response.
Example: "Sure! [ANIMATION:spin] *spins around* That was fun!"
```

Then parse and extract these tags before TTS.

## Implementation Steps

1. **Add `currentAnimation` to store** - New state for explicit animation control
2. **Create AnimationCommandProcessor** - Detect animation keywords in text
3. **Update AvatarModel.tsx** - React to `currentAnimation` state changes
4. **Add animation queue** - Allow animations to play then return to idle
5. **Expose animation list to AI** - System prompt with available animations

## Files to Modify

- `src/types/index.ts` - Add animation-related types
- `src/store/chatStore.ts` - Add `currentAnimation` state
- `src/components/AvatarModel.tsx` - Add effect for `currentAnimation`
- `src/services/textPreprocessing/processors/AnimationCommandProcessor.ts` - New file
- `src/services/textPreprocessing/PreprocessingPipeline.ts` - Register new processor
- `src/components/ChatInterface.tsx` - Trigger animation from detected commands
