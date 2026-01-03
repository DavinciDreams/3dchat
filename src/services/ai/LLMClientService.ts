/**
 * LLM Client Service
 *
 * Handles LLM API integration for animation judgment.
 * Extracted from AnimationJudgeService to improve separation of concerns.
 */

import axios from 'axios';
import type { ChatMessage, LLMResponse } from '../../di/ServiceInterfaces';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const JUDGE_MODEL = import.meta.env.VITE_ANIMATION_JUDGE_MODEL || 'openai/gpt-4o-mini';

const SYSTEM_PROMPT = `You are an animation director for a 3D avatar. Given a conversation exchange, decide which animations avatar should perform to accompany speaking its response.

Available animations by category:

CORE ANIMATIONS:
- peace: Peace sign/victory pose - use for success, positivity, celebration
- shoot: Finger guns/shooting gesture - use for playful pointing, "gotcha", cool moments
- spin: A playful spinning/twirling motion - use for fun, excitement, showing off
- modelPose: Idle standing pose - use for neutral moments
- thinking: Thinking - use for contemplation

GREETINGS:
- standingGreeting: Standing greeting - use for formal greeting
- waving: Waving - use for greeting or farewell
- greeting: Waving hello gesture - use for hellos, goodbyes, friendly acknowledgment
- shakingHands1: Shaking hands - use for greeting or agreement
- entry: Entry - use for entering scene

IDLE & SOCIAL:
- idle: Default standing pose
- happyIdle: Happy idle - use for happiness
- sillyDancing: Silly dancing - use for fun dancing
- weightShift: Shifting weight between feet - use for subtle idle variation
- talkingOnPhone: Talking on phone animation
- lookAround: Looking around - use for searching/observing
- talking: Talking - use for conversation
- hipHopDancing: Hip hop dancing - use for dancing

TRANSITIONAL POSES:
- sitToStand: Sit to stand transition - use for getting up
- standToSit: Stand to sit transition - use for sitting down
- gettingUp: Getting up - use for standing up
- crouchToStand: Crouch to stand - use for getting up
- startWalking: Start walking - use for beginning movement
- squat: Bending down/crouching motion - use for exercising, hiding, getting low
- jumpingDown: Jumping down - use for dropping/jumping down

DANCE & CELEBRATION:
- swinging: Swinging motion - use for playful swinging
- catwalk: Catwalk strut - use for showing off or fashion

BREAKDANCE:
- breakdance1990: 1990 spin - use for breakdance power moves
- breakdance1990_2: Alternative 1990 spin
- breakdance1990_2_alt: Alternative 1990 spin variation
- breakdance1990_3: Another 1990 spin variation
- breakdanceEnding1: Breakdance ending pose 1
- breakdanceEnding2: Breakdance ending pose 2
- breakdanceEnding3: Breakdance ending pose 3
- breakdanceFootwork1: Breakdance footwork pattern 1
- breakdanceFootwork2: Breakdance footwork pattern 2
- breakdanceFootwork3: Breakdance footwork pattern 3
- breakdanceFootworkToFreeze: Footwork transitioning to freeze
- breakdanceFreezes: Breakdance freeze poses
- breakdanceFreezeVar1: Freeze variation 1
- breakdanceFreezeVar2: Freeze variation 2
- breakdanceFreezeVar3: Freeze variation 3
- breakdanceFreezeVar4: Freeze variation 4
- breakdanceReady: Breakdance ready stance
- breakdanceReady_2: Alternative ready stance
- breakdanceReady_3: Another ready stance
- breakdanceSwipes: Breakdance swipes
- breakdanceUprock: Breakdance uprock
- breakdanceUprock_2: Alternative uprock
- breakdanceUprockToGround: Uprock to ground transition
- breakdanceUprockToGround_2: Alternative ground transition
- breakdanceUprockVar1: Uprock variation 1
- breakdanceUprockVar1End: Uprock variation 1 ending
- breakdanceUprockVar1Start: Uprock variation 1 start
- breakdanceUprockVar2: Uprock variation 2
- brooklynUprock: Brooklyn uprock style
- crosslegFreeze: Crossleg freeze pose
- flair: Breakdance flair move
- flair_2: Alternative flair move
- flair_3: Another flair variation

MARTIAL ARTS:
- punch: Punch forward - use for action or fighting
- dropKick: Drop kick attack - use for aggressive action
- flyingKnee: Flying knee combo - use for martial arts
- ninjaIdle: Ninja idle - use for stealth pose
- kipUp: Kip up - use for martial arts
- bowing: Elbowing - use for fights to throw an elbow strike
- bodyBlock: Body block defense - use for blocking
- centerBlock: Center block defense - use for blocking

COMBAT:
- daggerStab: Double dagger stab - use for weapon attacks
- reloading: Reload weapon - use for gun/weapon context
- magicCast: Cast magic spell - use for magic or power
- takeCover: Take cover - use for hiding or stealth
- aimingGun: Aiming gun - use for shooting context
- salute: Military-style salute - use for playful formality

Locomotion & MOVEMENT:
- walking: Walking in place - use when discussing travel
- jogBackwards: Jog backwards - use for retreating
- jumping: Jump in place - use for excitement or jumping
- climbing: Climbing up - use for climbing context
- turnLeft: Turn left 90 degrees - use for turning
- turnRight: Turn right with briefcase - use for turning
- standardRun: Standard running - use for running
- runningUpStairs: Running up stairs - use for climbing stairs

SPORTS:
- golfBadShot: Golf bad shot reaction - use for golf or frustration
- golfPrePutt: Golf pre-putt stance - use for golf
- golfDrive: Golf drive swing - use for golf
- golfPuttVictory: Golf putt victory celebration - use for golf success
- skateboarding: Skateboarding - use for skating
- defeatIdle: Defeat idle - use for losing/failure
- victoryIdle: Victory idle - use for winning/success
- victory: Victory pose - use for celebration

Exercise & Fitness:
- plank: Plank exercise - use for exercise
- throwing: Throwing - use for throwing objects
- catch: Catch something - use for catching
- situps: Situps - use for exercise
- jumpingJacks: Jumping jacks - use for exercise
- cartwheel: Cartwheel - use for gymnastics
- backflip: Backflip - use for acrobatics
- standingJump: Standing jump - use for jumping

MUSIC & PERFORMANCE:
- guitarPlaying: Playing guitar - use for music performance
- pianoPlaying: Playing piano - use for music performance
- playingDrums: Playing drums - use for music performance
- playingTheViolin: Playing violin - use for music performance
- singing_1: Singing variation - use for music or singing
- singing: Singing animation - use for music or singing

Sneaky/Stealthy Movements:
- lowCrawl: Low crawl - use for stealth/crawling
- sneakingForward: Sneaking forward - use for stealth
- sneakyWalking: Sneaky walking - use for stealth
- lookOverShoulder: Look over shoulder - use for checking behind
- nervouslyLookAround: Nervously looking around - use for anxiety
- plotting: Plotting - use for scheming
- militarySignaling: Military signaling used to communicate silently

SITTING & KNEELING DOWN:
- sitting: Sitting down - use for sitting
- sittingClap: Sitting clap - use for celebration while sitting
- sittingTalking: Sitting and talking - use for conversation
- sittingDisapproval: Sitting disapproval - use for disagreement
- kneeling: Kneeling down - use for kneeling

Affectionate Gestures:
- patting: Patting - use for pat on back or shoulder
- kissing: Kissing - use for affection
- blowAKiss: Blowing a kiss - use for affection

Animals & Pets:
- pettingAnimal: Petting animal - use for interacting with animals
- petting: Petting - use for showing affection

EMOTIONAL STATES:
- sadIdle: Sad idle - use for sadness
- sadWalk: Sad walk - use for walking sadly
- strongGesture: Muscle flex, strong gesture
- disappointed: Disappointed - use for disappointment
- relievedSigh: Relieved sigh - use for relief, letting go of tension
- bashful: Bashful - use for shyness
- lookAwayGesture: Look away - use for embarrassment, shame, or looking away

SILLY DANCES:
- rumbaDancing: Rumba dancing - use for dancing
- sambaDancing: Samba dancing - use for dancing
- dancingTwerk: Dancing twerk - use for dancing
- twistDance: Twist dance - use for dancing

ANGRY & AGGRESSIVE:
- roar: Roar - use for aggressive expression
- yelling: Yelling - use for shouting
- angryGesture: Angry gesture - use for anger, frustration
- beingCocky: Cocky pose - use for arrogance, showing off
- standingArguing: Standing arguing - use for conflict
- angryGesture_1: Angry gesture variation - use for anger
- pacingAndTalkingOnAPhone: Pacing and talking on phone - use for conversation

Object Interaction:
- openDoor: Open door - use for door interactions
- push: Push - use for pushing large objects
- pushStart: Push start - use to begin pushing very large objects
- startClimbingLadder: Start climbing ladder - use for climbing
- vaultOverBox: Vault over box - use for parkour/obstacle
- rummaging: Rummaging - use for searching
- searchingPockets: Searching pockets - use for looking for something
- snatch: Snatch grab - use for grabbing quickly
- buttonPushing: Button pushing - use for pressing buttons
- typing: Typing - use for working at computer

Water Activities:
- swimming: Swimming - use for water activities
- floating: Floating - use for floating/levitation
- paddling: Paddling - use for water activities
- fishingCast: Fishing cast - use for fishing

Bored / Tired Gestures:
- smoking: Smoking - use for smoking
- yawn: Yawn - use for tiredness/boredom
- layingIdle: Laying idle - use for resting
- lyingDown: Lying down - use for lying down
- shrugging: Shrugging - use for uncertainty or indifference
- zombieStandUp: Zombie stand up - use for unsteady standing

GESTURE ANIMATIONS (subtle expressions):
HEAD GESTURES:
- headNod: Simple nod - use for agreement, understanding, yes
- hardHeadNod: Strong nod - use for emphatic agreement
- lengthyHeadNod: Extended nod - use for thoughtful agreement
- sarcasticHeadNod: Sarcastic nod - use for irony or sarcasm
- shakingHeadNo: Shake head no - use for disagreement, refusal
- annoyedHeadShake: Annoyed shake - use for frustration, annoyance
- thoughtfulHeadShake: Thoughtful shake - use for uncertainty, contemplation
- cockyHeadTurn: Cocky head turn - use for arrogance

HAND GESTURES:
- standingClap: Standing clap - use for celebration
- happyHandGesture: Happy hand gesture - use for joy, celebration
- dismissingGesture: Dismissing wave - use for dismissal, ending topic
- acknowledging: Acknowledging gesture - use for recognition, "I hear you"
- beckoning: Beckoning - use for calling someone over
- pointing: Pointing - use for indicating direction

Rules:
1. Only trigger animations that naturally match what the avatar is saying
2. Can return multiple animations to be played in sequence with delays
3. Return empty array if no animation fits the context
4. Consider the user's request AND the AI's response
5. Be selective - not every response needs an animation
6. If the user explicitly asks for an action (spin, wave, dance, etc), definitely include it
7. Prefer core animations for basic interactions, extended for more specific scenarios`;

const TOOL_DEFINITION = {
  type: 'function' as const,
  function: {
    name: 'trigger_animations',
    description: 'Trigger avatar animations based on conversation context',
    parameters: {
      type: 'object',
      properties: {
        animations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'The animation to play'
              },
              delay: {
                type: 'number',
                description: 'Seconds to wait before playing this animation (0 for immediate)'
              }
            },
            required: ['name']
          },
          description: 'List of animations to play in order'
        },
        reasoning: {
          type: 'string',
          description: 'Brief explanation of why these animations were chosen'
        }
      },
      required: ['animations', 'reasoning']
    }
  }
};

/**
 * LLM Client Service implementation
 */
export class LLMClientService {
  /**
   * Send a chat request to the LLM
   * @param messages - Array of chat messages
   * @returns LLM response with content and optional tool calls
   */
  async chat(messages: ChatMessage[]): Promise<LLMResponse> {
    const startTime = performance.now();

    console.log('%c🤖 [LLMClient] Sending chat request', 'color: #3498db; font-weight: bold;');
    console.log('%c🤖 [LLMClient] Messages:', 'color: #3498db;', messages);
    console.log('%c🤖 [LLMClient] Model:', 'color: #3498db; font-weight: bold;', JUDGE_MODEL);
    console.log('%c🤖 [LLMClient] API Key present:', 'color: #3498db; font-weight: bold;', !!OPENROUTER_API_KEY);

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: JUDGE_MODEL,
          messages,
          tools: [TOOL_DEFINITION],
          tool_choice: { type: 'function', function: { name: 'trigger_animations' } }
        },
        {
          timeout: 30000, // 30 second timeout to prevent indefinite hanging
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const elapsed = performance.now() - startTime;
      console.log(`%c🤖 [LLMClient] LLM call took ${elapsed.toFixed(0)}ms`, 'color: #3498db;');
      console.log('%c🤖 [LLMClient] API Response status:', 'color: #3498db;', response.status);
      console.log('%c🤖 [LLMClient] Full API response:', 'color: #3498db;', response.data);

      // Extract message from response
      if (!response.data?.choices || response.data.choices.length === 0) {
        console.error('%c🤖 [LLMClient] No choices in API response', 'color: #e74c3c;');
        return { content: '', tool_calls: [] };
      }

      const message = response.data.choices[0].message;
      console.log('%c🤖 [LLMClient] Message from response:', 'color: #3498db;', message);

      // Extract tool calls if present
      const toolCalls = message.tool_calls || [];

      return {
        content: message.content || '',
        tool_calls: toolCalls.map((call: any) => ({
          function: {
            name: call.function.name,
            arguments: call.function.arguments
          }
        }))
      };
    } catch (error) {
      console.error('%c🤖 [LLMClient] ERROR CAUGHT:', 'color: #e74c3c; font-weight: bold;');
      console.error('%c🤖 [LLMClient] Error name:', 'color: #e74c3c;', error instanceof Error ? error.name : 'Unknown');
      console.error('%c🤖 [LLMClient] Error message:', 'color: #e74c3c;', error instanceof Error ? error.message : String(error));
      console.error('%c🤖 [LLMClient] Error stack:', 'color: #e74c3c;', error instanceof Error ? error.stack : 'No stack trace');

      // Check if it's an axios error with more details
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown; status?: number; headers?: unknown } };
        console.error('%c🤖 [LLMClient] Axios error response:', 'color: #e74c3c;', axiosError.response?.data);
        console.error('%c🤖 [LLMClient] Axios error status:', 'color: #e74c3c;', axiosError.response?.status);
        console.error('%c🤖 [LLMClient] Axios error headers:', 'color: #e74c3c;', axiosError.response?.headers);
      }

      // Re-throw to let caller handle error
      throw error;
    }
  }

  /**
   * Stream a chat response with chunk callbacks
   * @param messages - Array of chat messages
   * @param onChunk - Callback for each chunk of the response
   */
  async stream(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<void> {
    const startTime = performance.now();

    console.log('%c🤖 [LLMClient] Starting stream request', 'color: #3498db; font-weight: bold;');

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: JUDGE_MODEL,
          messages,
          tools: [TOOL_DEFINITION],
          tool_choice: { type: 'function', function: { name: 'trigger_animations' } },
          stream: true
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json'
          },
          responseType: 'stream'
        }
      );

      const elapsed = performance.now() - startTime;
      console.log(`%c🤖 [LLMClient] Stream setup took ${elapsed.toFixed(0)}ms`, 'color: #3498db;');

      // Handle streaming response
      return new Promise<void>((resolve, reject) => {
        const stream = response.data as any;

        stream.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                resolve();
                return;
              }
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  onChunk(content);
                }
              } catch {
                // Ignore parsing errors for incomplete chunks
              }
            }
          }
        });

        stream.on('error', reject);
        stream.on('end', resolve);
      });
    } catch (error) {
      console.error('%c🤖 [LLMClient] Stream error:', 'color: #e74c3c;', error);
      throw error;
    }
  }

  /**
   * Get the system prompt used for animation judgment
   */
  getSystemPrompt(): string {
    return SYSTEM_PROMPT;
  }

  /**
   * Get the tool definition used for animation judgment
   */
  getToolDefinition(): any {
    return TOOL_DEFINITION;
  }

  /**
   * Get the current model being used
   */
  getModel(): string {
    return JUDGE_MODEL;
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!OPENROUTER_API_KEY;
  }
}
