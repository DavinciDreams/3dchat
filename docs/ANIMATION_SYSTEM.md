# Animation System Implementation

This document describes the animation system additions made to the 3D Chat application, enabling 50+ VRMA animations triggered by an LLM-based animation judge.

## Overview

The animation system allows the 3D avatar to perform contextual animations based on conversation content. An LLM analyzes each exchange and decides which animations to trigger.

## Architecture

```
User Message → AI Response → Animation Judge (LLM) → Animation Queue → Avatar
```

### Components

1. **Animation Judge Service** (`src/services/animationJudgeService.ts`)
   - Uses OpenRouter API with tool calling
   - Analyzes user message + AI response
   - Returns list of animations with timing delays
   - Processes animation queue sequentially

2. **VRMA Animation Service** (`src/services/vrmaAnimationService.ts`)
   - Loads VRMA files using `@pixiv/three-vrm-animation`
   - Manages animation caching
   - Supports core (bundled) and extended (converted) animations

3. **Avatar Model** (`src/components/AvatarModel.tsx`)
   - Listens to `currentAnimation` state changes
   - Fades between animations smoothly
   - Returns to idle after animation completes

4. **Chat Interface** (`src/components/ChatInterface.tsx`)
   - Calls animation judge in parallel with text preprocessing
   - Includes test dropdown for manual animation triggering

## Animation Categories

### Core Animations (VRM Motion Pack)
Pre-bundled VRMA files in `public/animations/vrma/`:
- `greeting` - Wave hello
- `peace` - Peace sign
- `shoot` - Finger guns
- `spin` - Playful spin
- `modelPose` - Idle pose
- `squat` - Squat down

### Extended Animations (Converted from Mixamo)
Converted VRMA files in `public/animations/`:
- **Idle & Social:** idle, talkingOnPhone, bowing, salute, singing
- **Dance:** hipHopDance, swinging, catwalk
- **Combat:** punch, dropKick, flyingKnee, daggerStab, bodyBlock, centerBlock, catch, snatch, reloading, magicCast
- **Movement:** walking, jogBackwards, jumping, climbing, takeCover, zombieStandUp, plank, openDoor, turnLeft, turnRight
- **Sports:** golfBadShot, golfPrePutt

## Conversion Pipeline

### Tools Setup
- `tools/fbx2vrma-converter/` - Cloned from [tk256ailab/fbx2vrma-converter](https://github.com/tk256ailab/fbx2vrma-converter)
- Uses FBX2glTF binary for FBX → glTF conversion
- Adds VRMC_vrm_animation extension for VRM compatibility

### Scripts
Located in `scripts/`:

1. **download-mixamo.js** - Automated Mixamo downloader
   ```bash
   MIXAMO_EMAIL="email" MIXAMO_PASSWORD="pass" node scripts/download-mixamo.js
   ```

2. **convert-to-vrma.js** - Batch FBX to VRMA converter
   ```bash
   node scripts/convert-to-vrma.js
   ```

3. **animation-list.json** - Defines 52 target animations with Mixamo names

### Workflow
```
Mixamo FBX → animations-raw/ → convert-to-vrma.js → public/animations/*.vrma
```

## State Management

Added to Zustand store (`src/store/chatStore.ts`):
```typescript
animationQueue: AnimationTrigger[];
currentAnimation: string | null;
setAnimationQueue: (queue: AnimationTrigger[]) => void;
setCurrentAnimation: (animation: string | null) => void;
```

## Types

Added to `src/types/index.ts`:
```typescript
interface AnimationTrigger {
  name: string;
  delay?: number;
}

interface AnimationJudgment {
  animations: AnimationTrigger[];
  reasoning: string;
}

const AVAILABLE_ANIMATIONS = [...CORE_ANIMATIONS, ...EXTENDED_ANIMATIONS] as const;
```

## LLM Animation Judge

The judge uses OpenRouter with tool calling:

```typescript
// Tool definition
{
  name: 'trigger_animations',
  parameters: {
    animations: [{ name: string, delay: number }],
    reasoning: string
  }
}
```

### Model Configuration
```env
VITE_ANIMATION_JUDGE_MODEL=openai/gpt-4.1-mini  # Fast, cheap model
```

### Decision Rules
1. Only trigger animations matching the response content
2. Can return multiple animations with delays
3. Return empty array if no animation fits
4. Always include animation if user explicitly requests it
5. Be selective - most responses don't need animations

## Bug Fixes During Implementation

### 1. Preprocessing Infinite Loop
**Problem:** Regex inside while loops caused infinite loops
```javascript
// BUG
while ((match = /pattern/g.exec(text)) !== null)

// FIX
for (const match of text.matchAll(pattern))
```

### 2. Animation Not Playing
**Problem:** VRM reloaded during animation due to React re-renders
```javascript
// BUG - New array each render
position = [0, 0, 0]

// FIX - Constant reference
const DEFAULT_POSITION: [number, number, number] = [0, 0, 0];
```

### 3. ES Module Compatibility
**Problem:** Scripts used CommonJS in ES module project
```javascript
// FIX - Use ES imports
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
```

## File Structure

```
src/
├── services/
│   ├── animationJudgeService.ts    # LLM animation decisions
│   └── vrmaAnimationService.ts     # VRMA loading & management
├── components/
│   ├── AvatarModel.tsx             # Animation playback
│   └── ChatInterface.tsx           # Animation test UI
├── store/
│   └── chatStore.ts                # Animation state
└── types/
    └── index.ts                    # Animation types

scripts/
├── download-mixamo.js              # Mixamo automation
├── convert-to-vrma.js              # FBX→VRMA batch converter
├── animation-list.json             # Animation definitions
└── README.md                       # Script documentation

public/animations/
├── vrma/                           # Core VRM Motion Pack
│   ├── VRMA_02.vrma ... VRMA_07.vrma
└── *.vrma                          # Converted Mixamo animations

tools/
└── fbx2vrma-converter/             # Conversion tool (gitignored)

animations-raw/                      # FBX source files (gitignored)
```

## Adding New Animations

1. Download FBX from Mixamo (Format: FBX, Skin: Without Skin)
2. Place in `animations-raw/`
3. Run `node scripts/convert-to-vrma.js`
4. Add to `VRMA_EXTENDED_ANIMATIONS` in vrmaAnimationService.ts
5. Add to `EXTENDED_ANIMATIONS` in types/index.ts
6. Add to `SYSTEM_PROMPT` and `ANIMATION_DURATIONS` in animationJudgeService.ts

## Dependencies

- `@pixiv/three-vrm-animation` - VRMA loading and retargeting
- `puppeteer` - Mixamo automation (dev dependency)
- OpenRouter API - Animation judge LLM calls

## Environment Variables

```env
VITE_OPENROUTER_API_KEY=your_key
VITE_ANIMATION_JUDGE_MODEL=openai/gpt-4.1-mini  # Optional
```
