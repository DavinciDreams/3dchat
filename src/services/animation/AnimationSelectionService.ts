/**
 * Animation Selection Service
 *
 * Handles animation selection and layer suggestion logic.
 * Extracted from AnimationJudgeService to improve separation of concerns.
 */

import type { AnimationTrigger, AnimationLayerType, AnimationJudgment, AnimationJudgmentWithTiming } from '../../types';
import { AVAILABLE_ANIMATIONS } from '../../types';

/**
 * Animation Selection Service implementation
 */
export class AnimationSelectionService {
  /**
   * Parse LLM response to extract animation judgment
   * @param toolCalls - Tool calls from LLM response
   * @returns Animation judgment with animations and reasoning
   */
  parseLLMResponse(toolCalls: Array<{ function: { name: string; arguments: string } }>): AnimationJudgment {
    console.log('%c🎯 [AnimationSelection] Parsing LLM response', 'color: #9b59b6; font-weight: bold;');
    console.log('%c🎯 [AnimationSelection] Tool calls:', 'color: #9b59b6;', toolCalls);

    if (!toolCalls || toolCalls.length === 0) {
      console.log('%c🎯 [AnimationSelection] No tool calls found', 'color: #f39c12;');
      return { animations: [], reasoning: 'No animation decision made' };
    }

    const toolCall = toolCalls[0];
    const args = JSON.parse(toolCall.function.arguments);

    console.log('%c🎯 [AnimationSelection] Raw args:', 'color: #9b59b6; font-weight: bold;', args);

    // Validate animations are in our allowed list
    const validAnimations: AnimationTrigger[] = args.animations
      .filter((a: AnimationTrigger) => AVAILABLE_ANIMATIONS.includes(a.name as typeof AVAILABLE_ANIMATIONS[number]))
      .map((a: AnimationTrigger) => ({
        name: a.name,
        delay: a.delay || 0
      }));

    console.log('%c🎯 [AnimationSelection] Valid animations:', 'color: #9b59b6; font-weight: bold;', validAnimations);

    return {
      animations: validAnimations,
      reasoning: args.reasoning || 'No reasoning provided'
    };
  }

  /**
   * Suggest appropriate animation layer based on animation type
   * @param animationName - Name of the animation
   * @returns Suggested animation layer type
   */
  suggestLayer(animationName: string): AnimationLayerType {
    // Define animation categories by layer
    const fullBodyAnimations = [
      'spin', 'jumping', 'backflip', 'cartwheel', 'breakdance',
      'breakdance1990', 'breakdance1990_2', 'breakdance1990_2_alt', 'breakdance1990_3',
      'flair', 'flair_2', 'flair_3'
    ];

    const upperBodyAnimations = [
      'peace', 'shoot', 'waving', 'pointing', 'standingClap',
      'happyHandGesture', 'dismissingGesture', 'acknowledging', 'beckoning'
    ];

    const lowerBodyAnimations = [
      'squat', 'kick', 'plank', 'sitting', 'sitToStand', 'standToSit'
    ];

    const idleAnimations = [
      'idle', 'thinking', 'waiting', 'standing', 'modelPose',
      'happyIdle', 'sadIdle', 'defeatIdle', 'victoryIdle'
    ];

    const gestureAnimations = [
      'headNod', 'shakingHeadNo', 'shrugging', 'beckoning',
      'hardHeadNod', 'lengthyHeadNod', 'sarcasticHeadNod',
      'annoyedHeadShake', 'thoughtfulHeadShake', 'cockyHeadTurn'
    ];

    // Determine layer based on animation name
    if (fullBodyAnimations.includes(animationName)) {
      console.log('%c🎯 [AnimationSelection] Layer: full_body', 'color: #9b59b6;');
      return 'full_body';
    } else if (upperBodyAnimations.includes(animationName)) {
      console.log('%c🎯 [AnimationSelection] Layer: upper_body', 'color: #9b59b6;');
      return 'upper_body';
    } else if (lowerBodyAnimations.includes(animationName)) {
      console.log('%c🎯 [AnimationSelection] Layer: lower_body', 'color: #9b59b6;');
      return 'lower_body';
    } else if (idleAnimations.includes(animationName)) {
      console.log('%c🎯 [AnimationSelection] Layer: idle', 'color: #9b59b6;');
      return 'idle';
    } else if (gestureAnimations.includes(animationName)) {
      console.log('%c🎯 [AnimationSelection] Layer: gesture', 'color: #9b59b6;');
      return 'gesture';
    }

    // Default to gesture for unknown animations
    console.log('%c🎯 [AnimationSelection] Layer: gesture (default)', 'color: #9b59b6;');
    return 'gesture';
  }

  /**
   * Suggest timing strategy based on AI response content
   * @param aiResponse - The AI's response text
   * @returns Suggested timing strategy
   */
  suggestTiming(aiResponse: string): 'early' | 'middle' | 'late' | 'distributed' {
    const responseLower = aiResponse.toLowerCase();

    // Early timing indicators (use word boundaries)
    if (/\bhello\b/i.test(responseLower) || /\bhi\b/i.test(responseLower) || /\bhey\b/i.test(responseLower)) {
      console.log('%c🎯 [AnimationSelection] Timing: early', 'color: #9b59b6;');
      return 'early';
    }

    // Late timing indicators (use word boundaries)
    if (/\bfinally\b/i.test(responseLower) || /\bin conclusion\b/i.test(responseLower) || /\bso\b/i.test(responseLower)) {
      console.log('%c🎯 [AnimationSelection] Timing: late', 'color: #9b59b6;');
      return 'late';
    }

    // Middle timing indicators (use word boundaries)
    if (/\bmeanwhile\b/i.test(responseLower) || /\balso\b/i.test(responseLower) || /\badditionally\b/i.test(responseLower)) {
      console.log('%c🎯 [AnimationSelection] Timing: middle', 'color: #9b59b6;');
      return 'middle';
    }

    // Default to distributed
    console.log('%c🎯 [AnimationSelection] Timing: distributed (default)', 'color: #9b59b6;');
    return 'distributed';
  }

  /**
   * Create enhanced animation judgment with timing and layer suggestions
   * @param baseJudgment - Base animation judgment
   * @param aiResponse - The AI's response text
   * @returns Enhanced animation judgment with timing and layer
   */
  createEnhancedJudgment(
    baseJudgment: AnimationJudgment,
    aiResponse: string
  ): AnimationJudgmentWithTiming {
    console.log('%c🎯 [AnimationSelection] Creating enhanced judgment', 'color: #9b59b6; font-weight: bold;');

    const suggestedTiming = this.suggestTiming(aiResponse);
    let suggestedLayer: AnimationLayerType = 'gesture';

    // Suggest layer based on first animation
    if (baseJudgment.animations.length > 0) {
      const firstAnimation = baseJudgment.animations[0].name;
      suggestedLayer = this.suggestLayer(firstAnimation);
    }

    console.log('%c🎯 [AnimationSelection] Suggested timing:', 'color: #9b59b6; font-weight: bold;', suggestedTiming);
    console.log('%c🎯 [AnimationSelection] Suggested layer:', 'color: #9b59b6; font-weight: bold;', suggestedLayer);

    return {
      ...baseJudgment,
      suggestedTiming,
      suggestedLayer,
      interruptible: true
    };
  }

  /**
   * Validate that an animation name is in the available animations list
   * @param animationName - Name of the animation to validate
   * @returns True if animation is valid
   */
  isValidAnimation(animationName: string): boolean {
    return AVAILABLE_ANIMATIONS.includes(animationName as typeof AVAILABLE_ANIMATIONS[number]);
  }

  /**
   * Filter animations to only include valid ones
   * @param animations - Array of animations to filter
   * @returns Array of valid animations
   */
  filterValidAnimations(animations: AnimationTrigger[]): AnimationTrigger[] {
    return animations
      .filter((a: AnimationTrigger) => this.isValidAnimation(a.name))
      .map((a: AnimationTrigger) => ({
        name: a.name,
        delay: a.delay || 0
      }));
  }
}
