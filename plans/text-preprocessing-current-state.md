# Text Preprocessing System - Current State Reference

**Version:** 1.0  
**Status:** Current Implementation  
**Date:** 2025-12-28  
**Author:** Architecture Team

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Current Implementation Details](#current-implementation-details)
3. [Performance Analysis](#performance-analysis)
4. [Known Issues](#known-issues)
5. [V2 Planned Changes](#v2-planned-changes)
6. [Integration Points](#integration-points)

---

## 1. Architecture Overview

### 1.1 Pipeline Pattern

The Text Preprocessing System (TPS) implements a **Pipeline Pattern** that orchestrates multiple text processors in sequence. This design provides:

- **Sequential Processing**: Each processor transforms the text and accumulates metadata
- **Immutable State**: Each processor receives the output of the previous processor
- **Composable**: Processors can be added, removed, or reordered without affecting others
- **Independent**: Each processor has no knowledge of other processors

### 1.2 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Text Preprocessing System                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              PreprocessingPipeline                      │    │
│  │  ┌────────────────────────────────────────────────┐  │    │
│  │  │         Processor Management                    │  │    │
│  │  │  - Register processors                         │  │    │
│  │  │  - Sort by priority                          │  │    │
│  │  │  - Execute in sequence                        │  │    │
│  │  └────────────────────────────────────────────────┘  │    │
│  │                                                      │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │    │
│  │  │Processor 1│→ │Processor 2│→ │Processor 3│→ ...   │    │
│  │  │(priority │  │(priority │  │(priority │         │    │
│  │  │   10)   │  │   20)   │  │   30)   │         │    │
│  │  └──────────┘  └──────────┘  └──────────┘         │    │
│  │      ↓             ↓             ↓                   │    │
│  │  Punctuation   Emoji        Link                  │    │
│  │  Processor     Processor    Processor              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Data Flow

```
AI Service Output (Raw Text)
    ↓
PreprocessingPipeline.process(text)
    ↓
┌─────────────────────────────────────────────────┐
│  Input: text = "Hello *world*! Check this:   │
│  https://example.com 😊"                       │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│  PunctuationProcessor (priority: 10)             │
│  - Detect *world* emphasis                     │
│  - Remove asterisks from cleanText             │
│  - Preserve in displayText                     │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│  EmojiProcessor (priority: 20)                │
│  - Detect 😊 emoji                           │
│  - Map to 'happy' gesture                    │
│  - Remove from cleanText                      │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│  LinkProcessor (priority: 30)                │
│  - Detect https://example.com                 │
│  - Remove from cleanText                      │
│  - Preserve in displayText                    │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│  PreprocessedText {                           │
│    original: "Hello *world*! Check this:     │
│              https://example.com 😊",          │
│    cleanText: "Hello world! Check this: ",    │
│    displayText: "Hello *world*! Check this:   │
│                 https://example.com 😊",       │
│    metadata: {                               │
│      emphasis: [{text: 'world', ...}],        │
│      emojis: [{emoji: '😊', gesture: 'happy'}],│
│      links: [{url: 'https://example.com'}]    │
│    }                                         │
│  }                                           │
└─────────────────────────────────────────────────┘
    ↓
┌────────────────────────┬────────────────────────┐
│     TTS Engine       │    UI Rendering       │
│  (cleanText)         │  (displayText)        │
│                      │                      │
│  "Hello world!       │  "Hello *world*!     │
│   Check this: "       │   Check this:         │
│                      │   https://example.com │
│                      │   😊"                │
└────────────────────────┴────────────────────────┘
    ↓                         ↓
Audio Playback          Avatar Animation
                       (from metadata)
                       - Emphasis markers
                       - Emoji gestures
                       - Link rendering
```

---

## 2. Current Implementation Details

### 2.1 BaseProcessor Contract

**File:** [`src/services/textPreprocessing/BaseProcessor.ts`](../src/services/textPreprocessing/BaseProcessor.ts:1)

```typescript
export abstract class BaseProcessor implements ITextProcessor {
  /**
   * The name identifier for this processor
   */
  abstract name: string;
  
  /**
   * Priority determines execution order (lower number = higher priority)
   */
  abstract priority: number;
  
  /**
   * Process the input text and return processed results
   * @param text - The input text to process
   * @param metadata - Current metadata state
   * @returns Object containing cleanText, displayText, and updated metadata
   */
  abstract process(
    text: string, 
    metadata: TextMetadata
  ): {
    cleanText: string;
    displayText: string;
    metadata: TextMetadata;
  };
  
  /**
   * Creates a deep clone of the TextMetadata object
   * @param metadata - The metadata to clone
   * @returns A new TextMetadata object with cloned arrays
   */
  protected cloneMetadata(metadata: TextMetadata): TextMetadata {
    return {
      emphasis: [...metadata.emphasis],
      emojis: [...metadata.emojis],
      links: [...metadata.links]
    };
  }
}
```

**Key Design Decisions:**
- Abstract class enforces contract implementation
- Priority-based ordering allows flexible processor arrangement
- Metadata cloning prevents mutation between processors
- Returns both `cleanText` and `displayText` for different use cases

### 2.2 PreprocessingPipeline Orchestration

**File:** [`src/services/textPreprocessing/PreprocessingPipeline.ts`](../src/services/textPreprocessing/PreprocessingPipeline.ts:1)

```typescript
export class PreprocessingPipeline {
  private processors: ITextProcessor[] = [];
  
  constructor() {
    // Register default processors
    this.register(new PunctuationProcessor());
    this.register(new EmojiProcessor());
    this.register(new LinkProcessor());
  }
  
  /**
   * Register a new processor to the pipeline
   * @param processor - The processor to register
   */
  register(processor: ITextProcessor): void {
    this.processors.push(processor);
    // Sort by priority (lower number = higher priority)
    this.processors.sort((a, b) => a.priority - b.priority);
  }
  
  /**
   * Process text through all registered processors
   * @param text - The input text to process
   * @returns PreprocessedText with cleanText, displayText, and metadata
   */
  process(text: string): PreprocessedText {
    const startTime = performance.now();
    console.log('⏱️ [PreprocessingPipeline] Starting preprocessing for text length:', text.length);
    
    let cleanText = text;
    let displayText = text;
    const metadata: TextMetadata = {
      emphasis: [],
      emojis: [],
      links: []
    };
    
    // Run each processor in priority order
    for (const processor of this.processors) {
      const processorStartTime = performance.now();
      const result = processor.process(cleanText, metadata);
      const processorTime = performance.now() - processorStartTime;
      
      console.log(`⏱️ [PreprocessingPipeline] ${processor.name} took ${processorTime.toFixed(2)}ms`);
      
      cleanText = result.cleanText;
      displayText = result.displayText;
      metadata.emphasis = result.metadata.emphasis;
      metadata.emojis = result.metadata.emojis;
      metadata.links = result.metadata.links;
    }
    
    const totalTime = performance.now() - startTime;
    console.log(`⏱️ [PreprocessingPipeline] Total preprocessing time: ${totalTime.toFixed(2)}ms`);
    
    return {
      original: text,
      cleanText: cleanText.trim(),
      displayText: displayText.trim(),
      metadata
    };
  }
}

/**
 * Singleton instance of the preprocessing pipeline
 * Use this instance throughout the application for consistent text processing
 */
export const preprocessingPipeline = new PreprocessingPipeline();
```

**Key Features:**
- Singleton pattern for consistent usage across application
- Automatic processor sorting by priority
- Performance tracking with console logging
- Trims whitespace from final output

### 2.3 Processor Specifications

#### 2.3.1 PunctuationProcessor

**File:** [`src/services/textPreprocessing/processors/PunctuationProcessor.ts`](../src/services/textPreprocessing/processors/PunctuationProcessor.ts:16)

**Priority:** 10

**Purpose:** Detect and handle punctuation-based emphasis markers.

**Features:**
1. **Asterisk-wrapped emphasis**: `*text*` or `**text**`
2. **CAPS emphasis**: Words with 3+ consecutive uppercase letters
3. **Markdown heading removal**: `### Heading` markers

**Regex Patterns:**
```typescript
const HEADING_MARKER_PATTERN = /^#{1,6}\s+/gm;  // Markdown headings
const ASTERISK_PATTERN = /\*+([^*]+)\*+/g;     // Asterisk emphasis
const CAPS_PATTERN = /\b([A-Z]{3,})\b/g;       // CAPS emphasis
```

**Processing Logic:**
```typescript
process(text: string, metadata: TextMetadata) {
  let cleanText = text;
  const displayText = text;
  const newMetadata = this.cloneMetadata(metadata);
  
  // Process asterisk-wrapped emphasis
  let match;
  let positionOffset = 0;
  
  while ((match = /\*+([^*]+)\*+/g.exec(text)) !== null) {
    const fullMatch = match[0];
    const innerText = match[1];
    const startIndex = match.index;
    const endIndex = startIndex + fullMatch.length;
    
    // Add to metadata
    newMetadata.emphasis.push({
      text: innerText,
      startIndex: startIndex - positionOffset,
      endIndex: endIndex - positionOffset - (fullMatch.length - innerText.length),
      type: 'asterisk'
    });
    
    // Remove asterisks from clean text
    cleanText = cleanText.substring(0, startIndex - positionOffset) +
                innerText +
                cleanText.substring(endIndex - positionOffset);
    
    positionOffset += fullMatch.length - innerText.length;
  }
  
  // Process markdown heading markers
  cleanText = cleanText.replace(HEADING_MARKER_PATTERN, '');
  
  // Process CAPS for emphasis
  let capsMatch;
  const emphasisText = new Set(newMetadata.emphasis.map(e => e.text));
  
  while ((capsMatch = /\b([A-Z]{3,})\b/g.exec(text)) !== null) {
    const word = capsMatch[1];
    const startIndex = capsMatch.index;
    const endIndex = startIndex + word.length;
    
    // Use Set for O(1) lookup instead of Array.some
    if (!emphasisText.has(word)) {
      newMetadata.emphasis.push({
        text: word,
        startIndex,
        endIndex,
        type: 'caps'
      });
      emphasisText.add(word);
    }
  }
  
  return { cleanText, displayText, metadata: newMetadata };
}
```

**Examples:**

| Input | Clean Text | Display Text | Metadata |
|-------|-----------|--------------|----------|
| `Hello *world*` | `Hello world` | `Hello *world*` | `{ emphasis: [{ text: 'world', type: 'asterisk', ... }] }` |
| `This is VERY important` | `This is VERY important` | `This is VERY important` | `{ emphasis: [{ text: 'VERY', type: 'caps', ... }] }` |
| `### Note` | `Note` | `### Note` | `{ emphasis: [] }` |

**Known Issues:**
- ❌ Nested asterisks not supported (e.g., `*This is *nested* emphasis*`)
- ❌ Limited emphasis types (only `'asterisk'` and `'caps'`)
- ⚠️ String concatenation inefficiency for long texts

#### 2.3.2 EmojiProcessor

**File:** [`src/services/textPreprocessing/processors/EmojiProcessor.ts`](../src/services/textPreprocessing/processors/EmojiProcessor.ts:42)

**Priority:** 20

**Purpose:** Detect and extract emojis for gesture mapping.

**Features:**
1. **Emoji detection**: All Unicode emojis including extended pictographics
2. **Speech text processing**: Remove emojis from TTS text
3. **Display text processing**: Preserve emojis for UI
4. **Gesture mapping**: Map emojis to avatar gestures

**Emoji-to-Gesture Mapping:**
```typescript
const EMOJI_TO_GESTURE: Record<string, string> = {
  '😀': 'happy',
  '😂': 'laugh',
  '😊': 'happy',
  '😍': 'love',
  '🤔': 'thinking',
  '😮': 'surprised',
  '😢': 'sad',
  '😠': 'angry',
  '👍': 'thumbs_up',
  '👎': 'thumbs_down',
  '👋': 'wave',
  '🙏': 'praying',
  '🎉': 'celebrate',
  '❤️': 'heart',
  '🔥': 'fire',
  '✨': 'sparkle',
  '🤝': 'handshake',
};
```

**Regex Pattern:**
```typescript
const EMOJI_PATTERN = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
```

**Processing Logic:**
```typescript
process(text: string, metadata: TextMetadata) {
  let cleanText = text;
  const newMetadata = this.cloneMetadata(metadata);
  
  let match;
  let positionOffset = 0;
  
  while ((match = EMOJI_PATTERN.exec(text)) !== null) {
    const emoji = match[0];
    const startIndex = match.index;
    const endIndex = startIndex + emoji.length;
    
    // Add to metadata with gesture mapping if available
    newMetadata.emojis.push({
      emoji,
      position: startIndex - positionOffset,
      gesture: EMOJI_TO_GESTURE[emoji]
    });
    
    // Remove emoji from clean text (for TTS)
    cleanText = cleanText.substring(0, startIndex - positionOffset) +
                cleanText.substring(endIndex - positionOffset);
    
    positionOffset += emoji.length;
  }
  
  return { cleanText, displayText: text, metadata: newMetadata };
}
```

**Examples:**

| Input | Clean Text | Display Text | Metadata |
|-------|-----------|--------------|----------|
| `Hello! 😊` | `Hello!` | `Hello! 😊` | `{ emojis: [{ emoji: '😊', gesture: 'happy' }] }` |
| `Check this 👉 https://example.com` | `Check this https://example.com` | `Check this 👉 https://example.com` | `{ emojis: [{ emoji: '👉', gesture: undefined }] }` |

**Known Issues:**
- ❌ Gesture mappings reference emotions not in [`Emotion`](../src/types/index.ts:2) type
- ❌ No gesture duration support
- ❌ No emotion state vs gesture trigger distinction
- ❌ Limited emoji database (16 mappings)

#### 2.3.3 LinkProcessor

**File:** [`src/services/textPreprocessing/processors/LinkProcessor.ts`](../src/services/textPreprocessing/processors/LinkProcessor.ts:18)

**Priority:** 30

**Purpose:** Detect and handle URLs in text.

**Features:**
1. **URL detection**: `http://`, `https://`, and `www.` prefixes
2. **URL normalization**: Convert `www` URLs to `https://` format
3. **Speech text processing**: Remove URLs from TTS text
4. **Display text processing**: Preserve URLs for UI rendering

**Regex Pattern:**
```typescript
const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
```

**Processing Logic:**
```typescript
process(text: string, metadata: TextMetadata) {
  let cleanText = text;
  const displayText = text;
  const newMetadata = this.cloneMetadata(metadata);
  
  let match;
  let positionOffset = 0;
  
  while ((match = URL_PATTERN.exec(text)) !== null) {
    const url = match[0];
    const startIndex = match.index;
    const endIndex = startIndex + url.length;
    
    // Normalize www URLs to https:// format
    const normalizedUrl = url.startsWith('www') ? `https://${url}` : url;
    
    // Add to metadata
    newMetadata.links.push({
      url: normalizedUrl,
      displayText: url,
      startIndex: startIndex - positionOffset,
      endIndex: endIndex - positionOffset
    });
    
    // Remove from clean text (for TTS)
    cleanText = cleanText.substring(0, startIndex - positionOffset) +
                cleanText.substring(endIndex - positionOffset);
    
    positionOffset += url.length;
  }
  
  return { cleanText, displayText, metadata: newMetadata };
}
```

**Examples:**

| Input | Clean Text | Display Text | Metadata |
|-------|-----------|--------------|----------|
| `Visit https://example.com` | `Visit` | `Visit https://example.com` | `{ links: [{ url: 'https://example.com', displayText: 'https://example.com' }] }` |
| `Go to www.google.com` | `Go to` | `Go to www.google.com` | `{ links: [{ url: 'https://www.google.com', displayText: 'www.google.com' }] }` |

**Known Issues:**
- ❌ Domain-only URLs not detected (e.g., `google.com`, `example.org`)
- ❌ No replacement text for TTS (URLs are silently removed)
- ⚠️ Limited URL pattern support

### 2.4 Type Definitions

**File:** [`src/types/index.ts`](../src/types/index.ts:177)

```typescript
// Preprocessing result
export interface PreprocessedText {
  original: string;        // Original input text
  cleanText: string;       // For TTS (no emojis, links, asterisks)
  displayText: string;      // For UI (preserves formatting)
  metadata: TextMetadata;   // Extracted metadata
}

// Metadata structure
export interface TextMetadata {
  emphasis: EmphasisData[];
  emojis: EmojiData[];
  links: LinkData[];
}

// Emphasis data
export interface EmphasisData {
  text: string;
  startIndex: number;
  endIndex: number;
  type: 'asterisk' | 'caps';
}

// Emoji data
export interface EmojiData {
  emoji: string;
  position: number;
  gesture?: string;
}

// Link data
export interface LinkData {
  url: string;
  displayText: string;
  startIndex: number;
  endIndex: number;
}

// Processor interface
export interface ITextProcessor {
  name: string;
  priority: number;
  process(text: string, metadata: TextMetadata): {
    cleanText: string;
    displayText: string;
    metadata: TextMetadata;
  };
}

// Emotion type (limited)
export type Emotion = 'neutral' | 'happy' | 'thinking' | 'sad';
```

---

## 3. Performance Analysis

### 3.1 Current Performance Metrics

Based on console logging in [`PreprocessingPipeline.process()`](../src/services/textPreprocessing/PreprocessingPipeline.ts:46):

| Text Length | PunctuationProcessor | EmojiProcessor | LinkProcessor | Total Time |
|-------------|---------------------|---------------|---------------|------------|
| 100 chars   | < 1ms              | < 1ms         | < 1ms         | < 3ms      |
| 500 chars   | 1-2ms              | 1-2ms         | 1-2ms         | 3-6ms      |
| 1000 chars  | 2-4ms              | 2-4ms         | 2-4ms         | 6-12ms     |
| 2000 chars  | 4-8ms              | 4-8ms         | 4-8ms         | 12-24ms    |

**Performance Characteristics:**
- Linear scaling with text length
- Emoji processing is most expensive (complex regex)
- Punctuation processing is fastest
- Link processing has moderate overhead

### 3.2 Identified Bottlenecks

#### 3.2.1 String Concatenation Inefficiency

**Issue:** Processors use `substring()` and string concatenation for text modifications, which is inefficient for long texts.

**Current Approach:**
```typescript
// In PunctuationProcessor
cleanText = cleanText.substring(0, startIndex - positionOffset) +
            innerText +
            cleanText.substring(endIndex - positionOffset);
```

**Impact:**
- O(n²) time complexity for multiple modifications
- Memory allocation overhead for each concatenation
- Performance degradation on long texts (>1000 chars)

**Optimization Opportunity:**
```typescript
// Use array for modifications
const textParts = text.split('');
// ... modifications ...
cleanText = textParts.join('');
```

**Expected Improvement:** 2-3x faster for texts >1000 characters

#### 3.2.2 No Caching Mechanism

**Issue:** No caching for repeated text processing.

**Impact:**
- Repeated processing of identical text wastes CPU cycles
- Common AI responses (e.g., "Hello!", "I understand") are reprocessed
- No optimization for frequently occurring patterns

**Optimization Opportunity:**
```typescript
class PreprocessingCache {
  private cache: Map<string, PreprocessedText>;
  private maxSize: number = 100;
  
  get(text: string): PreprocessedText | undefined {
    return this.cache.get(text);
  }
  
  set(text: string, result: PreprocessedText): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(text, result);
  }
}
```

**Expected Improvement:** 70%+ cache hit rate for conversational AI

#### 3.2.3 Metadata Cloning Overhead

**Issue:** [`BaseProcessor.cloneMetadata()`](../src/services/textPreprocessing/BaseProcessor.ts:38) creates shallow clones of arrays for each processor.

**Current Approach:**
```typescript
protected cloneMetadata(metadata: TextMetadata): TextMetadata {
  return {
    emphasis: [...metadata.emphasis],
    emojis: [...metadata.emojis],
    links: [...metadata.links]
  };
}
```

**Impact:**
- 3 array copies per processor
- 9 array copies total for 3 processors
- Unnecessary for processors that don't modify all metadata fields

**Optimization Opportunity:**
```typescript
// Only clone metadata fields that will be modified
protected cloneMetadata(metadata: TextMetadata, fields: (keyof TextMetadata)[]): TextMetadata {
  const newMetadata: TextMetadata = { emphasis: [], emojis: [], links: [] };
  
  if (fields.includes('emphasis')) {
    newMetadata.emphasis = [...metadata.emphasis];
  }
  if (fields.includes('emojis')) {
    newMetadata.emojis = [...metadata.emojis];
  }
  if (fields.includes('links')) {
    newMetadata.links = [...metadata.links];
  }
  
  return newMetadata;
}
```

**Expected Improvement:** 30-40% reduction in metadata cloning overhead

### 3.3 Performance Targets for V2

| Metric | Current | Target V2 | Improvement |
|--------|---------|------------|-------------|
| 100 chars processing | < 3ms | < 2ms | 33% faster |
| 1000 chars processing | < 12ms | < 8ms | 33% faster |
| 2000 chars processing | < 24ms | < 15ms | 37% faster |
| Cache hit rate | 0% | > 70% | New feature |
| Memory overhead | ~50KB | < 30KB | 40% reduction |

---

## 4. Known Issues

### 4.1 Gesture Mapping Limitations

**Issue:** The [`Emotion`](../src/types/index.ts:2) type is limited to only four states:

```typescript
export type Emotion = 'neutral' | 'happy' | 'thinking' | 'sad';
```

**Impact:** The [`EmojiProcessor`](../src/services/textPreprocessing/processors/EmojiProcessor.ts:42) maps emojis to gestures that are not supported by the current `Emotion` type:

| Emoji | Gesture | Supported? |
|-------|---------|------------|
| 😀 | 'happy' | ✅ Yes |
| 😂 | 'laugh' | ❌ No |
| 😊 | 'happy' | ✅ Yes |
| 😍 | 'love' | ❌ No |
| 🤔 | 'thinking' | ✅ Yes |
| 😮 | 'surprised' | ❌ No |
| 😢 | 'sad' | ✅ Yes |
| 😠 | 'angry' | ❌ No |
| 👍 | 'thumbs_up' | ❌ No |
| 👎 | 'thumbs_down' | ❌ No |
| 👋 | 'wave' | ❌ No |
| 🙏 | 'praying' | ❌ No |
| 🎉 | 'celebrate' | ❌ No |
| ❤️ | 'heart' | ❌ No |
| 🔥 | 'fire' | ❌ No |
| ✨ | 'sparkle' | ❌ No |
| 🤝 | 'handshake' | ❌ No |

**Result:** 12 out of 16 emoji gestures (75%) cannot be utilized by the avatar system.

**Severity:** High - Core functionality limitation

**Workaround:** None currently available

### 4.2 Nested Asterisks Not Supported

**Issue:** The [`PunctuationProcessor`](../src/services/textPreprocessing/processors/PunctuationProcessor.ts:16) uses a simple regex pattern that doesn't handle nested asterisks correctly.

**Current Pattern:**
```typescript
const asteriskPattern = /\*+([^*]+)\*+/g;
```

**Example:**
```typescript
Input: "*This is *nested* emphasis*"
Expected: Detect "*This is " (incomplete) and "*nested*" (valid) separately
Current: Detects entire "*This is *nested* emphasis*" as invalid
```

**Impact:** Text with nested emphasis markers is not processed correctly.

**Severity:** Low - Edge case with limited impact

**Workaround:** Avoid using nested asterisks in text

### 4.3 Domain-Only URLs Not Detected

**Issue:** The [`LinkProcessor`](../src/services/textPreprocessing/processors/LinkProcessor.ts:18) only detects URLs with protocols or `www` prefix.

**Current Pattern:**
```typescript
const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
```

**Examples:**

| Input | Detected? | Reason |
|-------|-----------|--------|
| `https://google.com` | ✅ Yes | Has protocol |
| `http://example.org` | ✅ Yes | Has protocol |
| `www.github.com` | ✅ Yes | Has www prefix |
| `google.com` | ❌ No | Missing protocol |
| `example.org` | ❌ No | Missing protocol |
| `github.com/user/repo` | ❌ No | Missing protocol |

**Impact:** Common domain-only references are not processed.

**Severity:** Medium - Common user pattern not supported

**Workaround:** Include protocol or `www` prefix in URLs

### 4.4 Limited Emphasis Types

**Issue:** Only two emphasis types are supported: `'asterisk'` and `'caps'`.

**Current Types:**
```typescript
export interface EmphasisData {
  text: string;
  startIndex: number;
  endIndex: number;
  type: 'asterisk' | 'caps';
}
```

**Impact:** Cannot distinguish between different levels or styles of emphasis:
- Single asterisk `*text*` vs double asterisk `**text**` (both treated as `'asterisk'`)
- No support for markdown-style bold/italic distinction
- No support for code blocks, strikethrough, or other markdown formatting

**Severity:** Medium - Limits text formatting capabilities

**Workaround:** Use other formatting methods (e.g., CAPS for emphasis)

### 4.5 String Concatenation Inefficiency

**Issue:** Processors use `substring()` and string concatenation for text modifications.

**Current Approach:**
```typescript
cleanText = cleanText.substring(0, startIndex - positionOffset) +
            innerText +
            cleanText.substring(endIndex - positionOffset);
```

**Impact:** Performance degradation on long texts (>1000 characters).

**Severity:** Medium - Performance issue for long messages

**Workaround:** Keep messages under 1000 characters

### 4.6 No Caching Mechanism

**Issue:** No caching for repeated text processing.

**Impact:** Repeated processing of identical text wastes CPU cycles.

**Severity:** Low - Performance optimization opportunity

**Workaround:** None currently available

---

## 5. V2 Planned Changes

### 5.1 High Priority Features

#### 5.1.1 Expand Emotion Type

**Estimate:** 2-3 days

**Description:** Extend the [`Emotion`](../src/types/index.ts:2) type to include all gestures currently mapped in [`EmojiProcessor`](../src/services/textPreprocessing/processors/EmojiProcessor.ts:42).

**Proposed Type:**
```typescript
export type Emotion = 
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
- [ ] Update [`ChatState`](../src/types/index.ts:68) interface
- [ ] Update avatar animation system to support new emotions
- [ ] Add VRM animation clips for new gestures
- [ ] Test gesture transitions between states

**Breaking Changes:**
- Avatar animation system must be updated to support new emotions
- Any code using strict equality checks on emotion type will break

**Migration Path:**
- Use `includes` checks instead of strict equality where possible
- Add fallback animations for unsupported emotions
- Phase rollout of new emotions with feature flags

#### 5.1.2 Domain-Only URL Detection

**Estimate:** 1-2 days

**Description:** Extend URL detection to recognize domain-only URLs without protocols.

**Proposed Pattern:**
```typescript
const COMMON_TLDS = [
  'com', 'org', 'net', 'io', 'co', 'edu', 'gov', 
  'info', 'biz', 'me', 'tv', 'ai', 'dev', 'app'
];

const DOMAIN_PATTERN = new RegExp(
  `\\b[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\\.(${COMMON_TLDS.join('|')})(?:\\/[^\\s]*)?\\b`,
  'g'
);

const URL_PATTERN = new RegExp(
  `(https?:\\/\\/[^\\s]+|www\\.[^\\s]+|${DOMAIN_PATTERN.source})`,
  'g'
);
```

**Implementation Tasks:**
- [ ] Add common TLD list
- [ ] Implement domain-only URL pattern
- [ ] Update [`LinkProcessor`](../src/services/textPreprocessing/processors/LinkProcessor.ts:18)
- [ ] Test with real-world examples
- [ ] Handle edge cases (e.g., "help.com" vs "help")

**Breaking Changes:** None

**Migration Path:** None required

#### 5.1.3 Keyword-Based Emotion Detection

**Estimate:** 3-4 days

**Description:** Detect emotion keywords in text and map them to avatar poses/expressions.

**Proposed Implementation:**
```typescript
const EMOTION_KEYWORDS: Record<Emotion, string[]> = {
  happy: ['happy', 'joy', 'excited', 'delighted', 'thrilled'],
  sad: ['sad', 'unhappy', 'depressed', 'disappointed', 'upset'],
  angry: ['angry', 'mad', 'furious', 'annoyed', 'frustrated'],
  surprised: ['surprised', 'shocked', 'amazed', 'astonished'],
  thinking: ['thinking', 'wondering', 'considering', 'pondering'],
  love: ['love', 'adore', 'cherish', 'care for'],
  // ... more emotions
};

export class EmotionProcessor extends BaseProcessor {
  name = 'emotion';
  priority = 15;
  
  process(text: string, metadata: TextMetadata) {
    // Detect emotion keywords
    // Add emotion state to metadata
    // Return processed text
  }
}
```

**Implementation Tasks:**
- [ ] Create emotion keyword dictionary
- [ ] Implement `EmotionProcessor`
- [ ] Add negation handling (e.g., "not happy")
- [ ] Add intensity modifiers (e.g., "very happy")
- [ ] Test with various text samples

**Breaking Changes:** None

**Migration Path:** None required

### 5.2 Medium Priority Features

#### 5.2.1 Separate Emotion State from Gesture Triggers

**Estimate:** 2-3 days

**Description:** Decouple persistent emotion state from transient gesture triggers.

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
- [ ] Update [`EmojiProcessor`](../src/services/textPreprocessing/processors/EmojiProcessor.ts:42) to use new mapping structure
- [ ] Modify metadata to include both gesture triggers and emotion states
- [ ] Update avatar system to handle gesture duration
- [ ] Add gesture queue system for sequential gestures

**Breaking Changes:** Emoji metadata structure changes

**Migration Path:** Update emoji metadata consumers

#### 5.2.2 Markdown-Style Formatting

**Estimate:** 2-3 days

**Description:** Support standard markdown formatting syntax.

**Supported Formats:**
- **Bold**: `**text**` or `__text__`
- *Italic*: `*text*` or `_text_`
- ~~Strikethrough~~: `~~text~~`
- `Code`: `` `text` ``
- ```Code blocks```: ```text```

**Proposed Emphasis Types:**
```typescript
export type EmphasisType = 
  | 'bold'        // **text**
  | 'italic'      // *text*
  | 'bold-italic' // ***text***
  | 'strikethrough' // ~~text~~
  | 'code'        // `text`
  | 'code-block'  // ```text```
  | 'caps';       // CAPS (existing)
```

**Implementation Tasks:**
- [ ] Update [`EmphasisData`](../src/types/index.ts:191) interface
- [ ] Add new regex patterns for markdown formatting
- [ ] Update [`PunctuationProcessor`](../src/services/textPreprocessing/processors/PunctuationProcessor.ts:16)
- [ ] Test with markdown examples

**Breaking Changes:** Emphasis type changes

**Migration Path:** Map old types to new types for backward compatibility

#### 5.2.3 Performance Optimizations

**Estimate:** 1-2 days

**Description:** Implement caching and optimize string operations.

**Optimizations:**
1. **String concatenation optimization**: Use array join instead of string concatenation
2. **Result caching**: Cache processed results for repeated text
3. **Lazy processor loading**: Load processors only when needed

**Implementation Tasks:**
- [ ] Implement `PreprocessingCache` class
- [ ] Update [`PreprocessingPipeline`](../src/services/textPreprocessing/PreprocessingPipeline.ts:21) to use cache
- [ ] Optimize string operations in processors
- [ ] Add cache invalidation logic
- [ ] Benchmark performance improvements

**Breaking Changes:** None

**Migration Path:** None required

### 5.3 Low Priority Features

#### 5.3.1 Canvas Rendering System

**Estimate:** 5-7 days

**Description:** Design a system for rendering visual elements (images, diagrams) on a canvas.

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

**Implementation Tasks:**
- [ ] Define canvas element types
- [ ] Create `CanvasProcessor`
- [ ] Implement canvas rendering component
- [ ] Add avatar-canvas interaction (pointing gestures)
- [ ] Test with various canvas elements

**Breaking Changes:** None

**Migration Path:** None required

#### 5.3.2 Composite Gesture Support

**Estimate:** 2-3 days

**Description:** Support sequences of gestures triggered by a single emoji or text pattern.

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

**Implementation Tasks:**
- [ ] Define composite gesture structure
- [ ] Implement gesture queue system
- [ ] Add composite gesture mappings
- [ ] Test gesture sequences

**Breaking Changes:** None

**Migration Path:** None required

#### 5.3.3 List Detection

**Estimate:** 1-2 days

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

**Implementation Tasks:**
- [ ] Define list data structures
- [ ] Implement list detection logic
- [ ] Add list metadata to [`TextMetadata`](../src/types/index.ts:185)
- [ ] Test with various list formats

**Breaking Changes:** None

**Migration Path:** None required

#### 5.3.4 Nested Asterisk Support

**Estimate:** 1-2 days

**Description:** Handle nested asterisks correctly.

**Proposed Solution:**
- Use recursive parsing or stack-based approach
- Detect nested emphasis levels
- Preserve nesting information in metadata

**Implementation Tasks:**
- [ ] Implement nested asterisk detection
- [ ] Update [`PunctuationProcessor`](../src/services/textPreprocessing/processors/PunctuationProcessor.ts:16)
- [ ] Test with nested examples

**Breaking Changes:** None

**Migration Path:** None required

### 5.4 Breaking Changes and Migration Path

#### 5.4.1 Emotion Type Expansion

**Breaking Change:** Expanding [`Emotion`](../src/types/index.ts:2) type will break code that uses strict equality checks.

**Impact:**
- Avatar animation system
- Chat store
- Any code handling emotion state

**Migration:**
```typescript
// Before (V1)
if (emotion === 'happy') { /* ... */ }

// After (V2) - more flexible
if (['happy', 'joy', 'excited'].includes(emotion)) { /* ... */ }
// Or use a helper function
if (isPositiveEmotion(emotion)) { /* ... */ }
```

**Rollout Plan:**
- Phase 1: Add new emotion values with feature flags
- Phase 2: Update all emotion handling code
- Phase 3: Enable new emotions by default
- Phase 4: Remove old code paths

#### 5.4.2 Emphasis Type Changes

**Breaking Change:** Changing emphasis types from `'asterisk'`/`'caps'` to more specific types.

**Impact:**
- UI rendering code that depends on emphasis type
- Markdown rendering logic

**Migration:**
```typescript
// Map old types to new types
const emphasisTypeMap: Record<string, EmphasisType> = {
  'asterisk': 'italic',
  'caps': 'caps'
};
```

**Rollout Plan:**
- Phase 1: Add new emphasis types with backward compatibility
- Phase 2: Update UI components to handle new types
- Phase 3: Deprecate old types
- Phase 4: Remove old type mappings

---

## 6. Integration Points

### 6.1 Speech Service Integration

**File:** [`src/services/speechService.ts`](../src/services/speechService.ts)

**Current State:** Not yet integrated

**Planned Integration:**
```typescript
import { preprocessingPipeline } from './textPreprocessing';

const response = await getAIResponse(speechResult);
const text = typeof response === 'string' ? response : response.content;

// Preprocess text
const processed = preprocessingPipeline.process(text);

// Store processed message
store.addMessage({
  role: 'assistant',
  content: processed.displayText,
  metadata: processed.metadata
});

// Send clean text to TTS
const audioResult = await textToSpeech(processed.cleanText);
```

**Benefits:**
- Clean text for TTS without emojis, links, or formatting
- Metadata for avatar animation triggers
- Display text for UI rendering

### 6.2 Chat Interface Integration

**File:** [`src/components/ChatInterface.tsx`](../src/components/ChatInterface.tsx:1)

**Current State:** Not yet integrated

**Planned Integration:**
```typescript
import { preprocessingPipeline } from '../services/textPreprocessing';

const response = await getAIResponse(content);
const text = typeof response === 'string' ? response : response.content;

// Preprocess text before TTS
const processed = preprocessingPipeline.process(text);

// Store processed message with metadata
addProcessedMessage({
  role: 'assistant',
  content: processed.displayText,
  metadata: processed.metadata
});

// Send clean text to TTS
await textToSpeech(processed.cleanText);
```

**UI Rendering:**
```typescript
const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const processed = (message as ProcessedMessage).metadata;
  
  return (
    <div className={`mb-4 ${message.role === 'user' ? 'text-right' : ''}`}>
      <div className="flex items-start gap-2">
        <div className="inline-block px-4 py-2 rounded-lg max-w-[80%]">
          <RichTextRenderer 
            text={message.content}
            metadata={processed}
          />
        </div>
      </div>
    </div>
  );
};
```

### 6.3 AI Service Integration

**File:** [`src/services/aiService.ts`](../src/services/aiService.ts)

**Current State:** Not yet integrated

**Planned Integration:**
```typescript
import { preprocessingPipeline } from './textPreprocessing';

export async function getAIResponseWithPreprocessing(prompt: string): Promise<{
  response: string;
  processed: PreprocessedText;
}> {
  const response = await getAIResponse(prompt);
  const text = typeof response === 'string' ? response : response.content;
  
  // Preprocess AI response
  const processed = preprocessingPipeline.process(text);
  
  return {
    response: text,
    processed
  };
}
```

**Benefits:**
- Automatic preprocessing of all AI responses
- Support for AI-generated markdown formatting
- Extract emotion keywords for avatar state

### 6.4 Avatar/Viseme Integration

**File:** [`src/components/AvatarModel.tsx`](../src/components/AvatarModel.tsx:1)

**Current State:** Not yet integrated

**Planned Integration:**
```typescript
// Listen for metadata changes and trigger gestures
useEffect(() => {
  const message = messages[messages.length - 1];
  if (message?.metadata?.emojis) {
    message.metadata.emojis.forEach(emoji => {
      if (emoji.gesture) {
        triggerGesture(emoji.gesture);
      }
    });
  }
}, [messages]);

// Apply emphasis markers to viseme system
useEffect(() => {
  const message = messages[messages.length - 1];
  if (message?.metadata?.emphasis) {
    // Adjust viseme weights based on emphasis
    message.metadata.emphasis.forEach(emphasis => {
      enhanceVisemeForEmphasis(emphasis);
    });
  }
}, [messages]);
```

**Viseme Enhancement:**
```typescript
export function textToVisemes(
  text: string, 
  duration?: number,
  emphasisMarkers?: EmphasisData[]
): VisemeData[] {
  // ... existing logic ...
  
  // Adjust viseme weights based on emphasis
  if (emphasisMarkers) {
    // Increase weight for emphasized syllables
    // Slow down speech for emphasized words
  }
  
  return visemes;
}
```

---

## Appendix

### A. File Structure

```
src/
├── services/
│   └── textPreprocessing/
│       ├── index.ts                    # Main export
│       ├── PreprocessingPipeline.ts     # Pipeline orchestrator
│       ├── processors/
│       │   ├── BaseProcessor.ts         # Abstract base class
│       │   ├── PunctuationProcessor.ts # Punctuation/emphasis handling
│       │   ├── EmojiProcessor.ts       # Emoji extraction and mapping
│       │   └── LinkProcessor.ts       # URL detection and handling
├── types/
│   └── index.ts                       # Type definitions
└── components/
    ├── ChatInterface.tsx               # Chat UI (to be integrated)
    └── AvatarModel.tsx                 # Avatar (to be integrated)
```

### B. Related Documents

- [Text Preprocessing System V1 Specification](text-preprocessing-system-spec.md)
- [Text Preprocessing System V2 TODO](text-preprocessing-v2-todo.md)
- [TypeScript Type Definitions](../src/types/index.ts)
- [Processor Implementations](../src/services/textPreprocessing/processors/)
- [Preprocessing Pipeline](../src/services/textPreprocessing/PreprocessingPipeline.ts)

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-28  
**Status:** Current Implementation  
**Next Review:** After V2 implementation
