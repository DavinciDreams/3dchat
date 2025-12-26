# Text Preprocessing System V2 - TODO Document

## Overview

This document outlines planned extensions and improvements for V2 of the text preprocessing system. V1 provides a solid foundation with punctuation, emoji, and link processing. V2 aims to expand capabilities, address limitations, and introduce advanced features for richer text-to-speech and avatar interaction experiences.

**V1 Implementation Status:** ✅ Complete
- Punctuation processing (asterisk-wrapped emphasis, CAPS detection)
- Emoji processing (detection, removal from speech, gesture mapping)
- Link processing (URL detection, removal from speech, clickable rendering)

---

## 1. Known Issues and Limitations from V1

### 1.1 Gesture Mapping Limitations

**Issue:** The [`Emotion`](../src/types/index.ts:2) type is limited to only four states:
```typescript
type Emotion = 'neutral' | 'happy' | 'thinking' | 'sad';
```

**Impact:** The [`EmojiProcessor`](../src/services/textPreprocessing/processors/EmojiProcessor.ts:8) maps emojis to gestures that are not supported by the current `Emotion` type:
- `'laugh'`, `'love'`, `'surprised'`, `'angry'`
- `'thumbs_up'`, `'thumbs_down'`, `'wave'`, `'praying'`
- `'celebrate'`, `'heart'`, `'fire'`, `'sparkle'`, `'handshake'`

These gesture mappings are stored in metadata but cannot be fully utilized by the avatar system.

**Example:**
```typescript
// EmojiProcessor maps 😀 to 'happy' ✅ (supported)
// But maps 😂 to 'laugh' ❌ (not in Emotion type)
// And maps 👋 to 'wave' ❌ (not in Emotion type)
```

### 1.2 Nested Asterisks Not Supported

**Issue:** The [`PunctuationProcessor`](../src/services/textPreprocessing/processors/PunctuationProcessor.ts:27) uses a simple regex pattern that doesn't handle nested asterisks correctly.

**Current Pattern:**
```typescript
const asteriskPattern = /\*+([^*]+)\*+/g;
```

**Impact:** Text like `*This is *nested* emphasis*` is not processed correctly. The pattern matches from the first `*` to the last `*`, treating the entire string as a single emphasis marker.

**Expected Behavior:**
- Input: `*This is *nested* emphasis*`
- Expected: Detect `*This is ` (incomplete) and `*nested*` (valid) separately
- Current: Detects entire `*This is *nested* emphasis*` as invalid

### 1.3 Domain-Only URLs Not Detected

**Issue:** The [`LinkProcessor`](../src/services/textPreprocessing/processors/LinkProcessor.ts:8) only detects URLs with protocols or `www` prefix.

**Current Pattern:**
```typescript
const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
```

**Impact:** Common domain-only references are not detected:
- `google.com` ❌
- `example.org` ❌
- `github.com/user/repo` ❌

**Detected URLs:**
- `https://google.com` ✅
- `http://example.org` ✅
- `www.github.com` ✅

### 1.4 Limited Emphasis Types

**Issue:** Only two emphasis types are supported: `'asterisk'` and `'caps'`.

**Current Types:**
```typescript
type EmphasisType = 'asterisk' | 'caps';
```

**Impact:** Cannot distinguish between different levels or styles of emphasis:
- Single asterisk `*text*` vs double asterisk `**text**` (both treated as `'asterisk'`)
- No support for markdown-style bold/italic distinction
- No support for code blocks, strikethrough, or other markdown formatting

---

## 2. Planned Features for V2

### 2.1 Link Processing Enhancements

#### 2.1.1 Domain-Only URL Detection

**Description:** Extend URL detection to recognize domain-only URLs without protocols.

**Implementation Requirements:**
- Detect patterns like `google.com`, `example.org`, `github.io`
- Support common top-level domains (TLDs): `.com`, `.org`, `.net`, `.io`, `.co`, `.edu`, `.gov`, `.info`, `.biz`, `.me`, `.tv`, `.ai`, `.dev`, `.app`
- Handle subdomains: `subdomain.example.com`
- Support paths: `github.com/user/repo`

**Proposed Regex Pattern:**
```typescript
// Enhanced URL pattern including domain-only URLs
const DOMAIN_PATTERN = /\b[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.(com|org|net|io|co|edu|gov|info|biz|me|tv|ai|dev|app)(?:\/[^\s]*)?\b/g;
```

**Smart Detection Strategy:**
- Distinguish between regular words and domains (e.g., "help" vs "help.com")
- Require at least 2 characters before the TLD
- Exclude common words that end with TLD-like patterns (e.g., "come" → not a domain)
- Use word boundaries to prevent false positives

**Examples:**
```typescript
// Should detect:
"Check google.com for more info" → google.com ✅
"Visit github.com/user/repo" → github.com/user/repo ✅
"Go to example.org" → example.org ✅

// Should NOT detect:
"The word is help" → no match ✅
"Welcome home" → no match ✅
"Time to come" → no match ✅
```

#### 2.1.2 URL Normalization Improvements

**Description:** Enhance URL normalization to handle more edge cases.

**Enhancements:**
- Preserve protocol when present (`https://google.com` → `https://google.com`)
- Add `https://` to domain-only URLs (`google.com` → `https://google.com`)
- Handle trailing slashes consistently
- Support internationalized domain names (IDNs)

---

### 2.2 Gesture System Expansion

#### 2.2.1 Expand Emotion Type

**Description:** Extend the [`Emotion`](../src/types/index.ts:2) type to include all gestures currently mapped in [`EmojiProcessor`](../src/services/textPreprocessing/processors/EmojiProcessor.ts:8).

**Proposed New Emotion Type:**
```typescript
type Emotion = 
  // Core emotions
  | 'neutral' | 'happy' | 'thinking' | 'sad' | 'angry' | 'surprised' | 'love'
  // Gestures/actions
  | 'laugh' | 'thumbs_up' | 'thumbs_down' | 'wave' | 'praying' 
  | 'celebrate' | 'heart' | 'fire' | 'sparkle' | 'handshake'
  // Additional gestures
  | 'nod' | 'shake' | 'point' | 'shrug' | 'clap';
```

**Implementation Tasks:**
- [ ] Update [`Emotion`](../src/types/index.ts:2) type definition
- [ ] Update [`ChatState`](../src/types/index.ts:38) interface
- [ ] Update avatar animation system to support new emotions
- [ ] Add VRM animation clips for new gestures
- [ ] Test gesture transitions between states

#### 2.2.2 Separate Emotion State from Gesture Triggers

**Description:** Decouple persistent emotion state from transient gesture triggers.

**Rationale:** Some emojis should trigger one-time gestures (e.g., `👋` wave) while others should set a persistent emotion state (e.g., `😀` happy).

**Proposed Data Structure:**
```typescript
interface EmojiMapping {
  emoji: string;
  gesture?: string;           // One-time gesture to trigger
  emotion?: Emotion;          // Persistent emotion state to set
  duration?: number;          // How long to display gesture (ms)
}

const EMOJI_MAPPINGS: Record<string, EmojiMapping> = {
  '😀': { emotion: 'happy' },
  '😂': { gesture: 'laugh', duration: 2000 },
  '👋': { gesture: 'wave', duration: 1000 },
  '🤝': { gesture: 'handshake', duration: 1500 },
  '😠': { emotion: 'angry' },
};
```

**Implementation Tasks:**
- [ ] Define `EmojiMapping` interface
- [ ] Update [`EmojiProcessor`](../src/services/textPreprocessing/processors/EmojiProcessor.ts:8) to use new mapping structure
- [ ] Modify metadata to include both gesture triggers and emotion states
- [ ] Update avatar system to handle gesture duration
- [ ] Add gesture queue system for sequential gestures

#### 2.2.3 Composite Gesture Support

**Description:** Support sequences of gestures triggered by a single emoji or text pattern.

**Use Cases:**
- `🎉` could trigger: `celebrate` → `happy` → `wave`
- Complex emotions expressed through gesture sequences
- Storytelling with multi-step animations

**Proposed Implementation:**
```typescript
interface CompositeGesture {
  sequence: Array<{
    gesture: string;
    emotion?: Emotion;
    duration: number;
    delay?: number;
  }>;
}

const COMPOSITE_GESTURES: Record<string, CompositeGesture> = {
  'celebration': {
    sequence: [
      { gesture: 'celebrate', duration: 1500 },
      { emotion: 'happy', duration: 2000 },
      { gesture: 'wave', duration: 1000 }
    ]
  }
};
```

---

### 2.3 Emotion and Pose Processing

#### 2.3.1 Keyword-Based Emotion Detection

**Description:** Detect emotion keywords in text and map them to avatar poses/expressions.

**Implementation Requirements:**
- Create emotion keyword dictionary
- Detect emotion phrases (e.g., "I'm happy", "This is sad", "I'm excited")
- Handle negations (e.g., "I'm not happy" → not sad)
- Support intensity modifiers (e.g., "very happy", "extremely sad")

**Proposed Keyword Dictionary:**
```typescript
const EMOTION_KEYWORDS: Record<Emotion, string[]> = {
  happy: ['happy', 'joy', 'excited', 'delighted', 'thrilled', 'glad', 'pleased'],
  sad: ['sad', 'unhappy', 'depressed', 'disappointed', 'upset', 'down', 'miserable'],
  angry: ['angry', 'mad', 'furious', 'annoyed', 'frustrated', 'irritated'],
  surprised: ['surprised', 'shocked', 'amazed', 'astonished', 'stunned'],
  thinking: ['thinking', 'wondering', 'considering', 'pondering', 'contemplating'],
  love: ['love', 'adore', 'cherish', 'care for', 'affection'],
  // ... more emotions
};
```

**New Processor:** `EmotionProcessor`
```typescript
export class EmotionProcessor extends BaseProcessor {
  name = 'emotion';
  priority = 15; // Between punctuation and emoji
  
  process(text: string, metadata: TextMetadata) {
    // Detect emotion keywords
    // Add emotion state to metadata
    // Return processed text
  }
}
```

#### 2.3.2 Emotion Transitions and Blending

**Description:** Support smooth transitions between emotion states.

**Features:**
- Blend duration configuration
- Transition easing functions
- Emotion priority (new emotion overrides or blends with current)
- Decay of emotion intensity over time

**Proposed API:**
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
```

---

### 2.4 Canvas Rendering System

#### 2.4.1 Visual Element Rendering

**Description:** Design a system for rendering visual elements (images, diagrams) on a canvas.

**Use Cases:**
- Display images referenced in text (e.g., "Look at this: [image]")
- Show diagrams or visual aids
- Render markdown-style image links

**Proposed Data Structure:**
```typescript
interface CanvasElement {
  type: 'image' | 'diagram' | 'chart' | 'text';
  source: string; // URL or data URI
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex?: number;
  duration?: number; // How long to display
}

interface CanvasMetadata {
  elements: CanvasElement[];
  activeElement?: string;
}
```

**New Processor:** `CanvasProcessor`
```typescript
export class CanvasProcessor extends BaseProcessor {
  name = 'canvas';
  priority = 40; // After other processors
  
  process(text: string, metadata: TextMetadata) {
    // Detect image references: ![alt](url) or [image: url]
    // Extract canvas elements
    // Add to metadata
    // Remove from clean text
  }
}
```

#### 2.4.2 Avatar-Canvas Interaction

**Description:** Enable avatar to point/gesture to canvas elements.

**Features:**
- Detect references to canvas elements in text (e.g., "this image", "the diagram on the left")
- Map references to pointing gestures
- Calculate pointing direction based on element position
- Coordinate gesture timing with element display

**Proposed Implementation:**
```typescript
interface PointingGesture {
  targetElementId: string;
  duration: number;
  intensity: number; // 0-1
}

interface CanvasInteraction {
  pointing?: PointingGesture;
  gaze?: {
    targetElementId: string;
    duration: number;
  };
}
```

---

### 2.5 Advanced Punctuation

#### 2.5.1 Markdown-Style Formatting

**Description:** Support standard markdown formatting syntax.

**Supported Formats:**
- **Bold**: `**text**` or `__text__`
- *Italic*: `*text*` or `_text_`
- ~~Strikethrough~~: `~~text~~`
- `Code`: `` `text` ``
- ```Code blocks```: ```text```

**Proposed Emphasis Types:**
```typescript
type EmphasisType = 
  | 'bold'        // **text**
  | 'italic'      // *text*
  | 'bold-italic' // ***text***
  | 'strikethrough' // ~~text~~
  | 'code'        // `text`
  | 'code-block'  // ```text```
  | 'caps';       // CAPS (existing)
```

**Updated PunctuationProcessor:**
```typescript
// New patterns
const BOLD_PATTERN = /\*\*([^*]+)\*\*/g;
const ITALIC_PATTERN = /(?<!\*)\*([^*]+)\*(?!\*)/g; // Negative lookbehind for **
const STRIKETHROUGH_PATTERN = /~~([^~]+)~~/g;
const CODE_PATTERN = /`([^`]+)`/g;
const CODE_BLOCK_PATTERN = /```([^`]+)```/g;
```

#### 2.5.2 Quoted Text Emphasis

**Description:** Handle quoted text with special emphasis.

**Features:**
- Detect quoted text: `"text"` or `'text'`
- Apply special emphasis or pause during TTS
- Optional: Different emphasis for different quote types

**Proposed Implementation:**
```typescript
interface QuoteEmphasis {
  text: string;
  startIndex: number;
  endIndex: number;
  quoteType: 'single' | 'double';
  emphasisLevel: 'low' | 'medium' | 'high';
}
```

#### 2.5.3 List Detection

**Description:** Detect numbered and bulleted lists for structured TTS output.

**Supported List Formats:**
- Numbered: `1. item`, `2. item`
- Bulleted: `- item`, `* item`, `• item`
- Nested lists (indentation-based)

**Proposed Metadata:**
```typescript
interface ListData {
  type: 'numbered' | 'bulleted';
  items: Array<{
    text: string;
    level: number;
    index: number;
  }>;
}
```

---

### 2.6 Performance Optimizations

#### 2.6.1 String Concatenation Optimization

**Description:** Use array join instead of string concatenation for long text processing.

**Current Issue:**
```typescript
// Current approach - inefficient for long text
cleanText = cleanText.substring(0, startIndex) + 
            innerText + 
            cleanText.substring(endIndex);
```

**Optimized Approach:**
```typescript
// Use array for modifications
const textParts = text.split('');
// ... modifications ...
cleanText = textParts.join('');
```

**Benefits:**
- Better performance for long texts
- Reduced memory allocations
- More efficient substring operations

#### 2.6.2 Result Caching

**Description:** Cache processed results for repeated text.

**Implementation:**
```typescript
class PreprocessingCache {
  private cache: Map<string, PreprocessedText>;
  private maxSize: number = 100;
  
  get(text: string): PreprocessedText | undefined {
    return this.cache.get(text);
  }
  
  set(text: string, result: PreprocessedText): void {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(text, result);
  }
}
```

**Cache Invalidation:**
- Time-based expiration
- LRU (Least Recently Used) eviction
- Manual cache clear

#### 2.6.3 Lazy Processor Loading

**Description:** Load processors only when needed.

**Implementation:**
```typescript
class PreprocessingPipeline {
  private processorFactories: Map<string, () => ITextProcessor>;
  private loadedProcessors: Map<string, ITextProcessor>;
  
  register(name: string, factory: () => ITextProcessor): void {
    this.processorFactories.set(name, factory);
  }
  
  getProcessor(name: string): ITextProcessor {
    if (!this.loadedProcessors.has(name)) {
      const factory = this.processorFactories.get(name);
      if (factory) {
        this.loadedProcessors.set(name, factory());
      }
    }
    return this.loadedProcessors.get(name)!;
  }
}
```

**Benefits:**
- Faster initial load time
- Reduced memory footprint
- Only load processors that are actually used

---

## 3. Future Considerations (V3+)

### 3.1 Multi-Language Support

**Description:** Support emphasis and emotion detection across multiple languages.

**Requirements:**
- Language detection in input text
- Language-specific emotion keywords
- Language-specific punctuation rules
- RTL (Right-to-Left) text support

**Example:**
```typescript
const EMOTION_KEYWORDS_MULTILANG: Record<string, Record<Emotion, string[]>> = {
  en: {
    happy: ['happy', 'joy', 'excited'],
    sad: ['sad', 'unhappy', 'depressed']
  },
  es: {
    happy: ['feliz', 'alegre', 'contento'],
    sad: ['triste', 'infeliz', 'deprimido']
  },
  fr: {
    happy: ['heureux', 'joyeux', 'content'],
    sad: ['triste', 'malheureux', 'déprimé']
  }
};
```

### 3.2 Custom Processor Plugins

**Description:** Allow users to create and register custom processors.

**Plugin System:**
```typescript
interface ProcessorPlugin {
  name: string;
  priority: number;
  process(text: string, metadata: TextMetadata): ProcessResult;
}

class PreprocessingPipeline {
  registerPlugin(plugin: ProcessorPlugin): void {
    this.register(plugin);
  }
}

// Example custom plugin
const HashtagProcessor: ProcessorPlugin = {
  name: 'hashtag',
  priority: 25,
  process(text: string, metadata: TextMetadata) {
    // Detect and handle hashtags
  }
};
```

### 3.3 Configuration-Driven Behavior

**Description:** Allow users to configure processor behavior through settings.

**Configuration Schema:**
```typescript
interface PreprocessingConfig {
  processors: {
    punctuation: {
      enableAsterisk: boolean;
      enableCaps: boolean;
      minCapsLength: number;
    };
    emoji: {
      enableDetection: boolean;
      enableGestureMapping: boolean;
      customMappings: Record<string, string>;
    };
    link: {
      enableDetection: boolean;
      normalizeUrls: boolean;
      detectDomainOnly: boolean;
      customTlds: string[];
    };
    emotion: {
      enableKeywordDetection: boolean;
      enableNegationHandling: boolean;
      intensityModifiers: boolean;
    };
  };
  performance: {
    enableCaching: boolean;
    cacheSize: number;
    lazyLoading: boolean;
  };
}
```

### 3.4 User Preferences

**Description:** Store and apply user-specific preprocessing preferences.

**Features:**
- Per-user configuration
- Preference persistence (localStorage, database)
- Import/export configurations
- Preset configurations (e.g., "minimal", "standard", "full")

**Example:**
```typescript
interface UserPreferences {
  preprocessingConfig: PreprocessingConfig;
  avatarPreferences: {
    gestureIntensity: number;
    emotionDecayRate: number;
    defaultEmotion: Emotion;
  };
}
```

---

## 4. Implementation Priorities

### High Priority

**Justification:** Core functionality improvements that address significant limitations and enable key features.

1. **Expand Emotion Type** ([`Emotion`](../src/types/index.ts:2))
   - Addresses major limitation where emoji gestures cannot be used
   - Enables full utilization of existing emoji mappings
   - Required for emotion keyword detection
   - **Estimated Effort:** 2-3 days

2. **Domain-Only URL Detection**
   - Addresses common use case (users often type "google.com" not "https://google.com")
   - Improves user experience significantly
   - Relatively straightforward implementation
   - **Estimated Effort:** 1-2 days

3. **Keyword-Based Emotion Detection**
   - Major feature enhancement
   - Enables text-driven avatar emotions
   - High user value
   - **Estimated Effort:** 3-4 days

### Medium Priority

**Justification:** Important enhancements that improve functionality but are not blocking.

4. **Separate Emotion State from Gesture Triggers**
   - Improves gesture system architecture
   - Enables more nuanced avatar behavior
   - Requires some refactoring
   - **Estimated Effort:** 2-3 days

5. **Markdown-Style Formatting**
   - Standard markdown support is expected
   - Improves text rendering capabilities
   - Moderate complexity
   - **Estimated Effort:** 2-3 days

6. **Performance Optimizations (Caching, String Concatenation)**
   - Improves performance for long texts
   - Good practice for production systems
   - **Estimated Effort:** 1-2 days

### Low Priority

**Justification:** Nice-to-have features that can be deferred.

7. **Canvas Rendering System**
   - Complex feature requiring significant work
   - Dependent on other systems (avatar, UI)
   - **Estimated Effort:** 5-7 days

8. **Composite Gesture Support**
   - Advanced feature with limited immediate use cases
   - Can be built after gesture system is stable
   - **Estimated Effort:** 2-3 days

9. **List Detection**
   - Useful but not critical
   - Can be added incrementally
   - **Estimated Effort:** 1-2 days

10. **Nested Asterisk Support**
    - Edge case with limited impact
    - Complex regex implementation
    - **Estimated Effort:** 1-2 days

---

## 5. Technical Considerations

### 5.1 Backward Compatibility Requirements

**V1 API Compatibility:**
- [`PreprocessedText`](../src/types/index.ts:144) interface must remain compatible
- [`TextMetadata`](../src/types/index.ts:151) structure must be extendable without breaking changes
- [`ITextProcessor`](../src/types/index.ts:182) interface must remain stable
- [`PreprocessingPipeline`](../src/services/textPreprocessing/PreprocessingPipeline.ts:21) public API must not break

**Compatibility Strategy:**
- Add new fields to interfaces (not remove or rename)
- Use optional fields for new features
- Default values for new configuration options
- Maintain existing processor behavior unless explicitly changed

**Example:**
```typescript
// V1 - existing
export interface TextMetadata {
  emphasis: EmphasisData[];
  emojis: EmojiData[];
  links: LinkData[];
}

// V2 - extended (backward compatible)
export interface TextMetadata {
  emphasis: EmphasisData[];
  emojis: EmojiData[];
  links: LinkData[];
  // New fields - optional to maintain compatibility
  emotions?: EmotionData[];      // NEW
  canvasElements?: CanvasElement[]; // NEW
  lists?: ListData[];            // NEW
}
```

### 5.2 Breaking Changes Needed

**Emotion Type Expansion:**
- **Breaking Change:** Expanding [`Emotion`](../src/types/index.ts:2) type will break code that uses strict equality checks
- **Impact:** Avatar animation system, chat store, any code handling emotion state
- **Migration:** Update all emotion handling code to support new values
- **Mitigation:** Use `includes` checks instead of strict equality where possible

**Example Migration:**
```typescript
// Before (V1)
if (emotion === 'happy') { /* ... */ }

// After (V2) - more flexible
if (['happy', 'joy', 'excited'].includes(emotion)) { /* ... */ }
// Or use a helper function
if (isPositiveEmotion(emotion)) { /* ... */ }
```

**Emphasis Type Changes:**
- **Breaking Change:** Changing emphasis types from `'asterisk'`/`'caps'` to more specific types
- **Impact:** UI rendering code that depends on emphasis type
- **Migration:** Update UI components to handle new emphasis types
- **Mitigation:** Map old types to new types for backward compatibility

### 5.3 Migration Path from V1 to V2

**Phase 1: Preparation (1-2 days)**
- Create feature flags for new V2 features
- Set up parallel V1/V2 code paths where needed
- Add deprecation warnings for V1-only features

**Phase 2: Core Type Updates (2-3 days)**
- Expand [`Emotion`](../src/types/index.ts:2) type
- Extend [`TextMetadata`](../src/types/index.ts:151) interface
- Update type definitions across codebase
- Add migration utilities

**Phase 3: Processor Enhancements (5-7 days)**
- Update [`LinkProcessor`](../src/services/textPreprocessing/processors/LinkProcessor.ts:18) for domain-only URLs
- Create new `EmotionProcessor`
- Enhance [`PunctuationProcessor`](../src/services/textPreprocessing/processors/PunctuationProcessor.ts:11) for markdown support
- Update [`EmojiProcessor`](../src/services/textPreprocessing/processors/EmojiProcessor.ts:42) for new gesture system

**Phase 4: Avatar System Updates (3-4 days)**
- Add VRM animations for new emotions
- Implement gesture duration handling
- Add emotion transition system
- Update avatar state management

**Phase 5: Testing and Validation (2-3 days)**
- Unit tests for all processors
- Integration tests for pipeline
- End-to-end tests with avatar
- Performance benchmarks

**Phase 6: Rollout (1-2 days)**
- Enable V2 features via feature flags
- Monitor for issues
- Gradual rollout to users
- Disable V1 code paths

**Rollback Plan:**
- Keep V1 code paths available for 1-2 releases
- Feature flags allow quick rollback
- Database migrations must be reversible
- User preferences should be versioned

### 5.4 Testing Strategy

**Unit Tests:**
- Each processor tested independently
- Edge cases and error conditions
- Regex pattern validation
- Type safety checks

**Integration Tests:**
- Pipeline processing with multiple processors
- Metadata accumulation across processors
- Processor priority ordering
- Feature flag toggling

**End-to-End Tests:**
- Full text-to-speech flow
- Avatar emotion transitions
- Gesture triggering
- Canvas rendering (if implemented)

**Performance Tests:**
- Long text processing (>1000 characters)
- Multiple rapid processing requests
- Memory usage over time
- Cache effectiveness

### 5.5 Documentation Requirements

**API Documentation:**
- Updated type definitions with JSDoc comments
- Processor interface documentation
- Configuration options reference
- Migration guide from V1 to V2

**User Documentation:**
- Feature overview
- Supported syntax examples
- Configuration guide
- Troubleshooting guide

**Developer Documentation:**
- Architecture diagrams
- Processor development guide
- Plugin system documentation
- Performance optimization guidelines

---

## 6. Success Metrics

### 6.1 Feature Completeness

- [ ] All High Priority features implemented
- [ ] 80% of Medium Priority features implemented
- [ ] 50% of Low Priority features implemented
- [ ] All V1 limitations addressed

### 6.2 Performance Targets

- Processing time < 50ms for typical messages (<500 characters)
- Processing time < 200ms for long messages (>2000 characters)
- Cache hit rate > 70% for repeated messages
- Memory usage < 50MB for typical usage

### 6.3 Quality Metrics

- 100% backward compatibility for V1 API (with feature flags)
- < 5% false positive rate for URL detection
- < 5% false positive rate for emotion detection
- Zero critical bugs in production

### 6.4 User Experience

- Avatar emotions match text intent > 90% of the time
- Gestures feel natural and well-timed
- Text rendering is visually appealing
- System feels responsive and smooth

---

## 7. Risks and Mitigations

### 7.1 Technical Risks

**Risk:** Complex regex patterns for URL detection may have false positives/negatives
- **Mitigation:** Extensive testing with real-world examples
- **Mitigation:** User feedback collection and pattern refinement
- **Mitigation:** Fallback to simpler patterns if issues persist

**Risk:** Emotion detection may misinterpret context (e.g., sarcasm)
- **Mitigation:** Add confidence scores to emotion detection
- **Mitigation:** Allow user override of detected emotions
- **Mitigation:** Use machine learning models in V3+ for better accuracy

**Risk:** Performance degradation with many processors
- **Mitigation:** Implement lazy loading
- **Mitigation:** Add performance monitoring
- **Mitigation:** Optimize critical paths

### 7.2 Schedule Risks

**Risk:** Avatar animation system may not support all new emotions
- **Mitigation:** Prioritize core emotions first
- **Mitigation:** Use fallback animations for unsupported emotions
- **Mitigation:** Phase rollout of new emotions

**Risk:** Integration with existing codebase may be complex
- **Mitigation:** Incremental implementation
- **Mitigation:** Feature flags for gradual rollout
- **Mitigation:** Extensive testing before release

### 7.3 User Adoption Risks

**Risk:** Users may find new features confusing
- **Mitigation:** Clear documentation and examples
- **Mitigation:** Onboarding tutorials
- **Mitigation:** Default configurations that work well out-of-the-box

**Risk:** Breaking changes may disrupt existing workflows
- **Mitigation:** Maintain backward compatibility
- **Mitigation:** Clear migration guide
- **Mitigation:** Support for V1 during transition period

---

## 8. Next Steps

1. **Review and Approve:** Stakeholders review this TODO document
2. **Prioritize Sprint:** Select features for first V2 sprint
3. **Set Up Branching:** Create `feature/v2-preprocessing` branch
4. **Implement High Priority Items:** Start with emotion type expansion and domain-only URL detection
5. **Continuous Integration:** Set up CI/CD for automated testing
6. **Regular Reviews:** Weekly progress reviews and adjustments

---

## Appendix A: Code Examples

### A.1 Enhanced Link Detection

```typescript
// V2 LinkProcessor with domain-only detection
export class LinkProcessor extends BaseProcessor {
  name = 'link';
  priority = 30;
  
  private readonly COMMON_TLDS = [
    'com', 'org', 'net', 'io', 'co', 'edu', 'gov', 
    'info', 'biz', 'me', 'tv', 'ai', 'dev', 'app'
  ];
  
  private readonly URL_PATTERN = new RegExp(
    `(https?:\\/\\/[^\\s]+|www\\.[^\\s]+|` +
    `\\b[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\\.(${this.COMMON_TLDS.join('|')})(?:\\/[^\\s]*)?\\b)`,
    'g'
  );
  
  process(text: string, metadata: TextMetadata) {
    // Implementation...
  }
}
```

### A.2 Emotion Detection Processor

```typescript
export class EmotionProcessor extends BaseProcessor {
  name = 'emotion';
  priority = 15;
  
  private readonly EMOTION_KEYWORDS: Record<Emotion, string[]> = {
    happy: ['happy', 'joy', 'excited', 'delighted', 'thrilled'],
    sad: ['sad', 'unhappy', 'depressed', 'disappointed', 'upset'],
    angry: ['angry', 'mad', 'furious', 'annoyed', 'frustrated'],
    surprised: ['surprised', 'shocked', 'amazed', 'astonished'],
    thinking: ['thinking', 'wondering', 'considering', 'pondering'],
    love: ['love', 'adore', 'cherish', 'care for'],
    // ... more emotions
  };
  
  process(text: string, metadata: TextMetadata) {
    const newMetadata = this.cloneMetadata(metadata);
    const detectedEmotions: EmotionData[] = [];
    
    for (const [emotion, keywords] of Object.entries(this.EMOTION_KEYWORDS)) {
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        let match;
        
        while ((match = regex.exec(text)) !== null) {
          detectedEmotions.push({
            emotion: emotion as Emotion,
            keyword: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            confidence: 0.8 // Can be refined with ML in V3+
          });
        }
      }
    }
    
    // Add to metadata
    (newMetadata as any).emotions = detectedEmotions;
    
    return { cleanText: text, displayText: text, metadata: newMetadata };
  }
}
```

### A.3 Configuration System

```typescript
export class PreprocessingPipeline {
  private config: PreprocessingConfig;
  
  constructor(config?: Partial<PreprocessingConfig>) {
    this.config = {
      processors: {
        punctuation: {
          enableAsterisk: true,
          enableCaps: true,
          minCapsLength: 3
        },
        emoji: {
          enableDetection: true,
          enableGestureMapping: true,
          customMappings: {}
        },
        link: {
          enableDetection: true,
          normalizeUrls: true,
          detectDomainOnly: true,
          customTlds: []
        },
        emotion: {
          enableKeywordDetection: true,
          enableNegationHandling: true,
          intensityModifiers: true
        }
      },
      performance: {
        enableCaching: true,
        cacheSize: 100,
        lazyLoading: false
      }
    };
    
    if (config) {
      this.config = this.mergeConfig(this.config, config);
    }
    
    this.initializeProcessors();
  }
  
  private mergeConfig(base: PreprocessingConfig, override: Partial<PreprocessingConfig>): PreprocessingConfig {
    // Deep merge implementation
    return deepMerge(base, override);
  }
  
  updateConfig(updates: Partial<PreprocessingConfig>): void {
    this.config = this.mergeConfig(this.config, updates);
    this.reinitializeProcessors();
  }
}
```

---

## Appendix B: Related Documents

- [Text Preprocessing System V1 Specification](text-preprocessing-system-spec.md)
- [TypeScript Type Definitions](../src/types/index.ts)
- [Processor Implementations](../src/services/textPreprocessing/processors/)
- [Preprocessing Pipeline](../src/services/textPreprocessing/PreprocessingPipeline.ts)

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-26  
**Status:** Draft - Ready for Review  
**Next Review:** After initial V2 sprint planning
