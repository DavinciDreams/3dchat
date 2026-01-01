/**
 * Text Animation Trigger Service
 * 
 * A simple keyword-based animation trigger system.
 * Text is the source of truth for when animations should play.
 * No LLM analysis - just keyword matching.
 */

interface KeywordMapping {
  keywords: string[];
  animations: string[];
}

class TextAnimationTriggerService {
  // Keyword to animation mappings
  private keywordMappings: KeywordMapping[] = [
    // Greetings
    {
      keywords: ['hello', 'hi', 'hey', 'greetings', 'howdy'],
      animations: ['greeting', 'peace']
    },
    // Dancing
    {
      keywords: ['dance', 'hip hop', 'breakdance', 'move', 'groove', 'boogie'],
      animations: ['hipHopDancing', 'breakdance1990', 'sillyDancing']
    },
    // Happy
    {
      keywords: ['happy', 'great', 'awesome', 'wonderful', 'fantastic', 'excellent', 'amazing', 'yay', 'hooray'],
      animations: ['happyIdle', 'peace', 'victory']
    },
    // Sad
    {
      keywords: ['sad', 'sorry', 'unhappy', 'depressed', 'disappointed', 'regret'],
      animations: ['sadIdle', 'sadWalk', 'defeatIdle']
    },
    // Angry
    {
      keywords: ['angry', 'mad', 'upset', 'furious', 'annoyed', 'irritated'],
      animations: ['angryGesture', 'angryGesture_1', 'standingArguing']
    },
    // Thinking
    {
      keywords: ['hmm', 'let me think', 'thinking', 'ponder', 'consider', 'wonder'],
      animations: ['thinking', 'modelPose', 'nervouslyLookAround']
    },
    // Yes/Agreeing
    {
      keywords: ['yes', 'yeah', 'yep', 'agree', 'correct', 'right', 'absolutely', 'definitely', 'certainly'],
      animations: ['headNod', 'hardHeadNod', 'happyHandGesture']
    },
    // No/Disagreeing
    {
      keywords: ['no', 'nope', 'disagree', 'wrong', 'incorrect', 'not really', 'never'],
      animations: ['shakingHeadNo', 'annoyedHeadShake', 'thoughtfulHeadShake']
    },
    // Bye
    {
      keywords: ['bye', 'goodbye', 'see you', 'farewell', 'take care', 'later'],
      animations: ['standingGreeting', 'waving', 'peace']
    },
    // Victory/Celebration
    {
      keywords: ['win', 'victory', 'celebrate', 'success', 'congratulations', 'congrats'],
      animations: ['victory', 'victoryIdle', 'standingClap']
    },
    // Confused/Unsure
    {
      keywords: ['confused', 'unsure', 'uncertain', 'maybe', 'perhaps', 'not sure'],
      animations: ['shrugging', 'nervouslyLookAround', 'lookAround']
    },
    // Surprised
    {
      keywords: ['surprised', 'wow', 'shocked', 'amazed', 'incredible', 'unbelievable'],
      animations: ['standingJump', 'lookAround', 'lookOverShoulder']
    },
    // Waiting/Idle
    {
      keywords: ['wait', 'hold on', 'one moment', 'just a sec', 'hang on'],
      animations: ['modelPose', 'idle', 'weightShift']
    },
    // Action/Movement
    {
      keywords: ['spin', 'turn', 'rotate', 'twist'],
      animations: ['spin', 'twistDance', 'turnLeft']
    },
    // Combat/Action
    {
      keywords: ['fight', 'punch', 'kick', 'attack', 'hit', 'strike'],
      animations: ['punch', 'dropKick', 'flyingKnee']
    },
    // Running/Movement
    {
      keywords: ['run', 'jog', 'sprint', 'fast', 'quickly'],
      animations: ['standardRun', 'jogBackwards']
    },
    // Jumping
    {
      keywords: ['jump', 'hop', 'leap', 'bounce'],
      animations: ['jumping', 'jumpingDown', 'jumpingJacks']
    },
    // Sitting
    {
      keywords: ['sit', 'sit down', 'take a seat', 'chair'],
      animations: ['sitting', 'sitToStand', 'sittingTalking']
    },
    // Standing up
    {
      keywords: ['stand', 'stand up', 'get up', 'rise'],
      animations: ['standToSit', 'crouchToStand', 'gettingUp']
    },
    // Sleeping/Tired
    {
      keywords: ['sleep', 'tired', 'exhausted', 'yawn', 'rest'],
      animations: ['yawn', 'lyingDown', 'layingIdle']
    },
    // Music/Performance
    {
      keywords: ['sing', 'music', 'song', 'perform', 'guitar', 'piano', 'drums'],
      animations: ['singing', 'singing_1', 'guitarPlaying', 'pianoPlaying', 'playingDrums', 'playingTheViolin']
    },
    // Sports
    {
      keywords: ['golf', 'sport', 'game', 'play'],
      animations: ['golfDrive', 'golfPuttVictory', 'golfBadShot', 'golfPrePutt']
    },
    // Swimming
    {
      keywords: ['swim', 'water', 'pool', 'ocean'],
      animations: ['swimming', 'paddling']
    },
    // Climbing
    {
      keywords: ['climb', 'climbing', 'ladder', 'scale'],
      animations: ['climbing', 'startClimbingLadder', 'runningUpStairs']
    },
    // Sneaking
    {
      keywords: ['sneak', 'quiet', 'stealth', 'careful'],
      animations: ['sneakingForward', 'sneakyWalking', 'ninjaIdle']
    },
    // Skateboarding
    {
      keywords: ['skate', 'skateboard', 'skating'],
      animations: ['skateboarding']
    },
    // Walking
    {
      keywords: ['walk', 'stroll', 'march', 'step'],
      animations: ['walking', 'startWalking', 'textingAndWalking']
    },
    // Salute/Respect
    {
      keywords: ['salute', 'respect', 'honor', 'salutations'],
      animations: ['salute', 'bowing', 'shakingHands1']
    },
    // Pointing
    {
      keywords: ['point', 'there', 'look', 'see that'],
      animations: ['pointing', 'lookAround', 'lookOverShoulder']
    },
    // Praying
    {
      keywords: ['pray', 'god', 'bless', 'amen'],
      animations: ['praying']
    },
    // Kissing
    {
      keywords: ['kiss', 'love', 'affection'],
      animations: ['kiss', 'blowAKiss']
    },
    // Laughing
    {
      keywords: ['laugh', 'haha', 'funny', 'joke', 'hilarious'],
      animations: ['happyIdle', 'victory', 'standingClap']
    },
    // Crying
    {
      keywords: ['cry', 'tears', 'weep', 'sob'],
      animations: ['sadIdle', 'defeatIdle']
    },
    // Apologizing
    {
      keywords: ['apologize', 'sorry', 'forgive', 'excuse me'],
      animations: ['bowing', 'sadIdle', 'shrugging']
    },
    // Thanking
    {
      keywords: ['thank', 'thanks', 'grateful', 'appreciate'],
      animations: ['peace', 'greeting', 'happyHandGesture']
    },
    // Explaining
    {
      keywords: ['explain', 'describe', 'tell you', 'let me explain'],
      animations: ['talking', 'pacingAndTalkingOnAPhone', 'standingArguing']
    },
    // Asking
    {
      keywords: ['ask', 'question', 'wonder', 'curious'],
      animations: ['thinking', 'lookAround', 'nervouslyLookAround']
    },
    // Answering
    {
      keywords: ['answer', 'reply', 'respond', 'here is'],
      animations: ['talking', 'happyHandGesture', 'acknowledging']
    },
    // Agreeing strongly
    {
      keywords: ['absolutely', 'definitely', 'certainly', 'without doubt'],
      animations: ['hardHeadNod', 'headNod', 'happyHandGesture']
    },
    // Disagreeing strongly
    {
      keywords: ['absolutely not', 'definitely not', 'no way', 'never'],
      animations: ['shakingHeadNo', 'annoyedHeadShake', 'angryGesture']
    },
    // Excited
    {
      keywords: ['excited', 'thrilled', 'pumped', 'stoked'],
      animations: ['victory', 'victoryIdle', 'jumping', 'standingClap']
    },
    // Bored
    {
      keywords: ['bored', 'boring', 'dull', 'uninteresting'],
      animations: ['boredmelancholyIdle_1', 'yawn', 'sitting']
    },
    // Scared
    {
      keywords: ['scared', 'afraid', 'frightened', 'terrified'],
      animations: ['nervouslyLookAround', 'takeCover', 'lowCrawl']
    },
    // Proud
    {
      keywords: ['proud', 'accomplished', 'achieved', 'succeeded'],
      animations: ['victory', 'victoryIdle', 'modelPose']
    },
    // Embarrassed
    {
      keywords: ['embarrassed', 'ashamed', 'shy', 'bashful'],
      animations: ['bashful', 'lookAwayGesture', 'shrugging']
    },
    // Disappointed
    {
      keywords: ['disappointed', 'let down', 'bummed', 'upset'],
      animations: ['disappointed', 'sadIdle', 'defeatIdle']
    },
    // Relieved
    {
      keywords: ['relieved', 'whew', 'thank goodness', 'finally'],
      animations: ['relievedSigh', 'happyIdle', 'peace']
    },
    // Impatient
    {
      keywords: ['impatient', 'hurry', 'rush', 'waiting too long'],
      animations: ['talking', 'pacingAndTalkingOnAPhone', 'nervouslyLookAround']
    },
    // Calm
    {
      keywords: ['calm', 'relax', 'peaceful', 'serene', 'tranquil'],
      animations: ['modelPose', 'idle', 'peace']
    },
    // Energetic
    {
      keywords: ['energetic', 'active', 'dynamic', 'lively'],
      animations: ['jumping', 'jumpingJacks', 'hipHopDancing']
    },
  ];

  /**
   * Get animations to play based on text content
   * Returns the first matching animation from the first matching keyword category
   */
  getAnimationForText(text: string): string | null {
    if (!text || typeof text !== 'string') {
      return null;
    }

    const lowerText = text.toLowerCase();

    // Check each keyword mapping
    for (const mapping of this.keywordMappings) {
      for (const keyword of mapping.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          // Return the first animation from the matching category
          return mapping.animations[0] || null;
        }
      }
    }

    // No matching keywords found
    return null;
  }

  /**
   * Get all matching animations for text content
   * Returns an array of all animations from all matching keyword categories
   */
  getAllAnimationsForText(text: string): string[] {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const lowerText = text.toLowerCase();
    const matchedAnimations = new Set<string>();

    // Check each keyword mapping
    for (const mapping of this.keywordMappings) {
      for (const keyword of mapping.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          // Add all animations from this category
          mapping.animations.forEach(anim => matchedAnimations.add(anim));
          break; // Only add animations once per category
        }
      }
    }

    return Array.from(matchedAnimations);
  }

  /**
   * Check if text contains any animation-triggering keywords
   */
  hasAnimationTrigger(text: string): boolean {
    return this.getAnimationForText(text) !== null;
  }

  /**
   * Add custom keyword mapping
   */
  addKeywordMapping(keywords: string[], animations: string[]): void {
    this.keywordMappings.push({ keywords, animations });
  }

  /**
   * Get all keyword mappings
   */
  getKeywordMappings(): KeywordMapping[] {
    return [...this.keywordMappings];
  }
}

// Export singleton instance
export const textAnimationTriggerService = new TextAnimationTriggerService();

// Export types
export default textAnimationTriggerService;
export type { KeywordMapping };
