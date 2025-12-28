# LLM Animation Judge System

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INPUT                                      │
│                         "Can you do a spin?"                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          LLM CALL #1 (Chat)                                  │
│                                                                              │
│  Model: xiaomi/mimo-v2-flash:free                                           │
│  Input: User message + conversation history                                  │
│  Output: AI response text                                                    │
│                                                                              │
│  Response: "Of course! I'd be happy to spin for you! Here I go...           │
│             Wheeee! That was fun! Want me to do another trick?"             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
┌──────────────────────────────┐   ┌──────────────────────────────────────────┐
│      TEXT PREPROCESSING      │   │         LLM CALL #2 (Animation Judge)    │
│                              │   │                                          │
│  - Remove emojis for TTS     │   │  Model: haiku (fast, cheap)              │
│  - Extract links             │   │                                          │
│  - Clean text for speech     │   │  Input:                                  │
│                              │   │  - User message: "Can you do a spin?"    │
│         (parallel)           │   │  - AI response: "Of course! I'd be..."   │
│                              │   │  - Available animations:                 │
└──────────────────────────────┘   │      spin, squat, shoot, greeting, peace │
                    │              │                                          │
                    │              │  Tool Definition:                        │
                    │              │  {                                       │
                    │              │    "name": "trigger_animations",         │
                    │              │    "parameters": {                       │
                    │              │      "animations": ["spin"],             │
                    │              │      "reasoning": "User asked to spin"   │
                    │              │    }                                     │
                    │              │  }                                       │
                    │              │                                          │
                    │              │  Output: Tool call with animation list   │
                    └──────────────┴──────────────────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MERGE RESULTS                                   │
│                                                                              │
│  cleanText ─────────────────────────────▶ TTS Service                       │
│  animations: ['spin'] ──────────────────▶ Store (queued)                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
┌──────────────────────────────┐   ┌──────────────────────────────────────────┐
│        TTS + PLAYBACK        │   │           ANIMATION PLAYBACK             │
│                              │   │                                          │
│  Edge TTS generates audio    │   │  While audio plays:                      │
│  Audio plays with visemes    │   │  - Queue animations                      │
│                              │   │  - Play 'spin' at appropriate moment     │
│                              │   │  - Can sequence multiple animations      │
└──────────────────────────────┘   └──────────────────────────────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            AVATAR PERFORMS                                   │
│                                                                              │
│  - Speaks response with lip sync                                            │
│  - Performs spin animation during speech                                    │
│  - Returns to idle after completion                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Sequence Diagram

```
User          ChatInterface       AI Service       Animation Judge       Avatar
 │                  │                  │                  │                 │
 │  "Do a spin!"    │                  │                  │                 │
 │─────────────────▶│                  │                  │                 │
 │                  │                  │                  │                 │
 │                  │  getAIResponse() │                  │                 │
 │                  │─────────────────▶│                  │                 │
 │                  │                  │                  │                 │
 │                  │    AI Response   │                  │                 │
 │                  │◀─────────────────│                  │                 │
 │                  │                  │                  │                 │
 │                  │        ┌─────────┴─────────┐        │                 │
 │                  │        │    PARALLEL       │        │                 │
 │                  │        └─────────┬─────────┘        │                 │
 │                  │                  │                  │                 │
 │                  │  ┌───preprocess()│ judgeAnimations()│                 │
 │                  │  │               │─────────────────▶│                 │
 │                  │  │               │                  │                 │
 │                  │  │               │  Tool Call:      │                 │
 │                  │  │               │  ['spin']        │                 │
 │                  │  │               │◀─────────────────│                 │
 │                  │  │               │                  │                 │
 │                  │  └───────────────┤                  │                 │
 │                  │                  │                  │                 │
 │                  │◀─────────────────┤                  │                 │
 │                  │  cleanText +     │                  │                 │
 │                  │  animations[]    │                  │                 │
 │                  │                  │                  │                 │
 │                  │  TTS + Play Audio                   │                 │
 │                  │─────────────────────────────────────────────────────▶│
 │                  │                                     │                 │
 │                  │  setCurrentAnimation('spin')        │                 │
 │                  │─────────────────────────────────────────────────────▶│
 │                  │                                     │   *spins*       │
 │                  │                                     │                 │
 │◀────────────────────────────────────────────────────────────────────────│
 │                  │                  │                  │                 │
```

## Animation Judge LLM Call

### System Prompt

```
You are an animation director for a 3D avatar. Given a conversation exchange,
decide which animations the avatar should perform while speaking its response.

Available animations:
- spin: A playful spinning/twirling motion
- squat: Bending down/crouching motion
- shoot: Finger guns/shooting gesture
- greeting: Waving hello gesture
- peace: Peace sign/victory pose

Rules:
1. Only trigger animations that match the context
2. Can return multiple animations to be played in sequence
3. Return empty array if no animation fits
4. Consider both what the user asked AND what the AI is saying
```

### Tool Definition

```typescript
{
  name: "trigger_animations",
  description: "Trigger avatar animations based on conversation context",
  parameters: {
    type: "object",
    properties: {
      animations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              enum: ["spin", "squat", "shoot", "greeting", "peace"]
            },
            delay: {
              type: "number",
              description: "Seconds to wait before playing this animation"
            }
          },
          required: ["name"]
        },
        description: "List of animations to play in order"
      },
      reasoning: {
        type: "string",
        description: "Brief explanation of why these animations were chosen"
      }
    },
    required: ["animations"]
  }
}
```

### Example Calls

**User: "Can you spin?"**
```json
{
  "animations": [{ "name": "spin", "delay": 0.5 }],
  "reasoning": "User directly requested a spin"
}
```

**User: "Hello! Nice to meet you"**
```json
{
  "animations": [{ "name": "greeting", "delay": 0 }],
  "reasoning": "Greeting context, avatar should wave"
}
```

**User: "Do something cool!"**
```json
{
  "animations": [
    { "name": "spin", "delay": 0.5 },
    { "name": "peace", "delay": 2.0 }
  ],
  "reasoning": "User wants something impressive, combo spin into peace pose"
}
```

**User: "What's the weather like?"**
```json
{
  "animations": [],
  "reasoning": "Informational question, no animation needed"
}
```

## Why This Is Better Than Keyword Matching

| Aspect | Keyword Matching | LLM Judge |
|--------|------------------|-----------|
| Context awareness | None | Full conversation context |
| False positives | "I can't spin" triggers spin | Understands negation |
| Intent detection | Matches literal words | Understands meaning |
| Sequencing | Single animation | Can choreograph multiple |
| Timing | Immediate | Can specify delays |
| Extensibility | Add more keywords | Describe new animations in prompt |

## Implementation Files

| File | Purpose |
|------|---------|
| `src/services/animationJudgeService.ts` | New service for LLM animation judgment |
| `src/types/index.ts` | Add animation queue types |
| `src/store/chatStore.ts` | Add animation queue state |
| `src/components/ChatInterface.tsx` | Call judge in parallel with preprocessing |
| `src/components/AvatarModel.tsx` | Process animation queue with timing |
