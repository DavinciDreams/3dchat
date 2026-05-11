/**
 * LLM Client Service
 *
 * Handles LLM API integration for animation judgment.
 * Extracted from AnimationJudgeService to improve separation of concerns.
 */

import axios from 'axios';
import type { ChatMessage, LLMResponse } from '../../di/ServiceInterfaces';
import { truncateString } from '../../utils/safeLogger';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const JUDGE_MODEL = import.meta.env.VITE_ANIMATION_JUDGE_MODEL || 'openai/gpt-4o-mini';
const LLM_TIMEOUT_MS = parseInt(import.meta.env.VITE_LLM_TIMEOUT_MS || '60000'); // Default 60 seconds
const MAX_RETRIES = parseInt(import.meta.env.VITE_LLM_MAX_RETRIES || '2'); // Default 2 retries

const SYSTEM_PROMPT = `You are an animation director for a 3D avatar. Given a conversation exchange, decide which animations avatar should perform to accompany speaking its response.

Available animations:

CORE: peace (victory), shoot (finger guns), spin (twirling), modelPose (idle), thinking
GREETINGS: standingGreeting, waving, greeting, shakingHands1, entry
IDLE/SOCIAL: idle, happyIdle, sillyDancing, weightShift, talkingOnPhone, lookAround, talking, hipHopDancing
TRANSITIONS: sitToStand, standToSit, gettingUp, crouchToStand, startWalking, squat, jumpingDown
DANCE: swinging, catwalk
BREAKDANCE: breakdance1990 (spin), breakdance1990_2/_2_alt/_3 (spin variants), breakdanceEnding1/2/3, breakdanceFootwork1/2/3, breakdanceFootworkToFreeze, breakdanceFreezes, breakdanceFreezeVar1/2/3/4, breakdanceReady/_2/_3, breakdanceSwipes, breakdanceUprock/_2, breakdanceUprockToGround/_2, breakdanceUprockVar1/Var1End/Var1Start/Var2, brooklynUprock, crosslegFreeze, flair/_2/_3
MARTIAL ARTS: punch, dropKick, flyingKnee, ninjaIdle, kipUp, bowing (elbow), bodyBlock, centerBlock
COMBAT: daggerStab, reloading, magicCast, takeCover, aimingGun, salute
LOCOMOTION: walking, jogBackwards, jumping, climbing, turnLeft, turnRight, standardRun, runningUpStairs
SPORTS: golfBadShot, golfPrePutt, golfDrive, golfPuttVictory, skateboarding, defeatIdle, victoryIdle, victory
FITNESS: plank, throwing, catch, situps, jumpingJacks, cartwheel, backflip, standingJump
MUSIC: guitarPlaying, pianoPlaying, playingDrums, playingTheViolin, singing, singing_1
STEALTH: lowCrawl, sneakingForward, sneakyWalking, lookOverShoulder, nervouslyLookAround, plotting, militarySignaling
SITTING: sitting, sittingClap, sittingTalking, sittingDisapproval, kneeling
AFFECTION: patting, kissing, blowAKiss
ANIMALS: pettingAnimal, petting
EMOTIONS: sadIdle, sadWalk, strongGesture (flex), disappointed, relievedSigh, bashful, lookAwayGesture
DANCES: rumbaDancing, sambaDancing, dancingTwerk, twistDance
AGGRESSIVE: roar, yelling, angryGesture, beingCocky, standingArguing, angryGesture_1, pacingAndTalkingOnAPhone
OBJECTS: openDoor, push, pushStart, startClimbingLadder, vaultOverBox, rummaging, searchingPockets, snatch, buttonPushing, typing
WATER: swimming, floating, paddling, fishingCast
TIRED: smoking, yawn, layingIdle, lyingDown, shrugging, zombieStandUp
HEAD GESTURES: headNod (agree), hardHeadNod (emphatic), lengthyHeadNod (thoughtful), sarcasticHeadNod, shakingHeadNo, annoyedHeadShake, thoughtfulHeadShake, cockyHeadTurn
HAND GESTURES: standingClap, happyHandGesture, dismissingGesture, acknowledging, beckoning, pointing

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
    console.log('%c🤖 [LLMClient] Messages (count):', 'color: #3498db;', messages.length);
    console.log('%c🤖 [LLMClient] Model:', 'color: #3498db; font-weight: bold;', JUDGE_MODEL);
    console.log('%c🤖 [LLMClient] API Key present:', 'color: #3498db; font-weight: bold;', !!OPENROUTER_API_KEY);
    console.log('%c🤖 [LLMClient] Timeout:', 'color: #3498db; font-weight: bold;', `${LLM_TIMEOUT_MS}ms`);
    console.log('%c🤖 [LLMClient] Max retries:', 'color: #3498db; font-weight: bold;', MAX_RETRIES);
    
    // Calculate prompt size for diagnostics
    const promptSize = JSON.stringify(messages).length;
    console.log('%c🤖 [LLMClient] Prompt size:', 'color: #3498db; font-weight: bold;', `${promptSize} bytes`);
    
    // Set up warning timer for approaching timeout
    const WARNING_THRESHOLD = Math.floor(LLM_TIMEOUT_MS * 0.7); // Warn at 70% of timeout
    const timeoutWarning = setTimeout(() => {
      const elapsed = performance.now() - startTime;
      console.warn(`%c⚠️ [LLMClient] WARNING: Request taking longer than expected - ${elapsed.toFixed(0)}ms elapsed (timeout at ${LLM_TIMEOUT_MS}ms)`,
        'color: #f39c12; font-weight: bold; font-size: 12px;');
    }, WARNING_THRESHOLD);

    // Retry logic for timeouts
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
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
            timeout: LLM_TIMEOUT_MS,
            headers: {
              'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        clearTimeout(timeoutWarning);
        
        const elapsed = performance.now() - startTime;
        console.log(`%c🤖 [LLMClient] LLM call took ${elapsed.toFixed(0)}ms`, 'color: #3498db;');
        console.log('%c🤖 [LLMClient] Attempt:', 'color: #3498db; font-weight: bold;', `${attempt}/${MAX_RETRIES}`);
        
        // Log response size
        const responseSize = JSON.stringify(response.data).length;
        console.log('%c🤖 [LLMClient] Response size:', 'color: #3498db; font-weight: bold;', `${responseSize} bytes`);
        
        // Warn if response took more than 70% of timeout
        if (elapsed > WARNING_THRESHOLD) {
          console.warn(`%c⚠️ [LLMClient] Slow response detected - ${elapsed.toFixed(0)}ms (consider increasing timeout)`,
            'color: #f39c12; font-weight: bold;');
        }
        console.log('%c🤖 [LLMClient] API Response status:', 'color: #3498db;', response.status);
        // Only log summary of response, not full object to avoid extremely long logs
        console.log('%c🤖 [LLMClient] Response summary:', 'color: #3498db;', {
          hasChoices: !!response.data?.choices,
          choicesCount: response.data?.choices?.length || 0,
          hasContent: !!response.data?.choices?.[0]?.message?.content,
          hasToolCalls: !!response.data?.choices?.[0]?.message?.tool_calls,
          toolCallsCount: response.data?.choices?.[0]?.message?.tool_calls?.length || 0
        });

        // Extract message from response
        if (!response.data?.choices || response.data.choices.length === 0) {
          console.error('%c🤖 [LLMClient] No choices in API response', 'color: #e74c3c;');
          return { content: '', tool_calls: [] };
        }

        const message = response.data.choices[0].message;
        console.log('%c🤖 [LLMClient] Message content preview:', 'color: #3498db;', truncateString(message?.content || '(no content)'));

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
        clearTimeout(timeoutWarning);
        const elapsed = performance.now() - startTime;
        lastError = error instanceof Error ? error : new Error(String(error));
        
        console.error('%c🤖 [LLMClient] ERROR CAUGHT:', 'color: #e74c3c; font-weight: bold;');
        console.error('%c🤖 [LLMClient] Error name:', 'color: #e74c3c;', lastError.name);
        console.error('%c🤖 [LLMClient] Error message:', 'color: #e74c3c;', lastError.message);
        console.error('%c🤖 [LLMClient] Time elapsed before error:', 'color: #e74c3c; font-weight: bold;', `${elapsed.toFixed(0)}ms`);
        console.error('%c🤖 [LLMClient] Attempt:', 'color: #e74c3c; font-weight: bold;', `${attempt}/${MAX_RETRIES}`);

        // Check if it's an axios error with more details
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { data?: unknown; status?: number; headers?: unknown } };
          // Only log status, not full response data to avoid extremely long logs
          console.error('%c🤖 [LLMClient] Axios error status:', 'color: #e74c3c;', axiosError.response?.status);
        }
        
        // Check if it's a timeout error and we have retries left
        const isTimeout = lastError.message.includes('timeout');
        if (isTimeout && attempt < MAX_RETRIES) {
          const retryDelay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
          console.warn(`%c🔄 [LLMClient] Timeout detected, retrying in ${retryDelay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
            'color: #f39c12; font-weight: bold;');
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue; // Try again
        }
        
        // Special handling for timeout errors (final attempt)
        if (isTimeout) {
          console.error('%c🤖 [LLMClient] TIMEOUT ERROR DETAILS:', 'color: #e74c3c; font-weight: bold; font-size: 14px;');
          console.error('%c🤖 [LLMClient] - Request timed out after ${LLM_TIMEOUT_MS}ms', 'color: #e74c3c;');
          console.error('%c🤖 [LLMClient] - Model:', 'color: #e74c3c;', JUDGE_MODEL);
          console.error('%c🤖 [LLMClient] - Prompt size:', 'color: #e74c3c;', `${promptSize} bytes`);
          console.error('%c🤖 [LLMClient] - Messages count:', 'color: #e74c3c;', messages.length);
          console.error('%c🤖 [LLMClient] - Total attempts:', 'color: #e74c3c;', `${attempt}/${MAX_RETRIES}`);
          console.error('%c🤖 [LLMClient] SUGGESTION: Consider increasing VITE_LLM_TIMEOUT_MS or using a faster model', 'color: #f39c12; font-weight: bold;');
        }

        // Re-throw to let caller handle error
        throw lastError;
      }
    }
    
    // This should never be reached, but TypeScript needs it
    throw new Error('Unexpected error: All retries exhausted');
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
