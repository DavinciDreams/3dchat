#!/usr/bin/env tsx
/**
 * Animation Configuration Generator
 *
 * Reads scripts/animation-list.json and generates:
 * - src/generated/animationConfig.generated.ts
 * - src/generated/animationTypes.generated.ts
 * - src/generated/animationPrompt.generated.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AnimationDefinition {
  name: string;
  mixamoName: string;
  category: string;
  description: string;
}

interface AnimationList {
  animations: AnimationDefinition[];
}

// Core animations from VRM Motion Pack (not in animation-list.json)
const CORE_ANIMATIONS: AnimationDefinition[] = [
  { name: 'greeting', mixamoName: 'Greeting', category: 'core', description: 'Greeting animation' },
  { name: 'peace', mixamoName: 'Peace', category: 'core', description: 'Peace sign animation' },
  { name: 'shoot', mixamoName: 'Shoot', category: 'core', description: 'Shoot animation' },
  { name: 'spin', mixamoName: 'Spin', category: 'core', description: 'Spin animation' },
  { name: 'modelPose', mixamoName: 'Model Pose', category: 'core', description: 'Model pose animation' },
  { name: 'squat', mixamoName: 'Squat', category: 'core', description: 'Squat animation' },
];

// Breakdance animations (not in animation-list.json)
const BREAKDANCE_ANIMATIONS: AnimationDefinition[] = [
  { name: 'breakdance1990', mixamoName: 'Breakdance 1990', category: 'breakdance', description: '1990 spin' },
  { name: 'breakdance1990_2', mixamoName: 'Breakdance 1990 2', category: 'breakdance', description: '1990 spin variation 2' },
  { name: 'breakdance1990_2_alt', mixamoName: 'Breakdance 1990 2 Alt', category: 'breakdance', description: '1990 spin variation 2 alt' },
  { name: 'breakdance1990_3', mixamoName: 'Breakdance 1990 3', category: 'breakdance', description: '1990 spin variation 3' },
  { name: 'breakdanceEnding1', mixamoName: 'Breakdance Ending 1', category: 'breakdance', description: 'Breakdance ending pose 1' },
  { name: 'breakdanceEnding2', mixamoName: 'Breakdance Ending 2', category: 'breakdance', description: 'Breakdance ending pose 2' },
  { name: 'breakdanceEnding3', mixamoName: 'Breakdance Ending 3', category: 'breakdance', description: 'Breakdance ending pose 3' },
  { name: 'breakdanceFootwork1', mixamoName: 'Breakdance Footwork 1', category: 'breakdance', description: 'Breakdance footwork pattern 1' },
  { name: 'breakdanceFootwork2', mixamoName: 'Breakdance Footwork 2', category: 'breakdance', description: 'Breakdance footwork pattern 2' },
  { name: 'breakdanceFootwork3', mixamoName: 'Breakdance Footwork 3', category: 'breakdance', description: 'Breakdance footwork pattern 3' },
  { name: 'breakdanceFootworkToFreeze', mixamoName: 'Breakdance Footwork to Freeze', category: 'breakdance', description: 'Footwork transitioning to freeze' },
  { name: 'breakdanceFreezes', mixamoName: 'Breakdance Freezes', category: 'breakdance', description: 'Breakdance freeze poses' },
  { name: 'breakdanceFreezeVar1', mixamoName: 'Breakdance Freeze Var 1', category: 'breakdance', description: 'Freeze variation 1' },
  { name: 'breakdanceFreezeVar2', mixamoName: 'Breakdance Freeze Var 2', category: 'breakdance', description: 'Freeze variation 2' },
  { name: 'breakdanceFreezeVar3', mixamoName: 'Breakdance Freeze Var 3', category: 'breakdance', description: 'Freeze variation 3' },
  { name: 'breakdanceFreezeVar4', mixamoName: 'Breakdance Freeze Var 4', category: 'breakdance', description: 'Freeze variation 4' },
  { name: 'breakdanceReady', mixamoName: 'Breakdance Ready', category: 'breakdance', description: 'Breakdance ready stance' },
  { name: 'breakdanceReady_2', mixamoName: 'Breakdance Ready 2', category: 'breakdance', description: 'Alternative ready stance' },
  { name: 'breakdanceReady_3', mixamoName: 'Breakdance Ready 3', category: 'breakdance', description: 'Alternative ready stance 3' },
  { name: 'breakdanceSwipes', mixamoName: 'Breakdance Swipes', category: 'breakdance', description: 'Breakdance swipes' },
  { name: 'breakdanceUprock', mixamoName: 'Breakdance Uprock', category: 'breakdance', description: 'Breakdance uprock' },
  { name: 'breakdanceUprock_2', mixamoName: 'Breakdance Uprock 2', category: 'breakdance', description: 'Alternative uprock' },
  { name: 'breakdanceUprockToGround', mixamoName: 'Breakdance Uprock to Ground', category: 'breakdance', description: 'Uprock to ground transition' },
  { name: 'breakdanceUprockToGround_2', mixamoName: 'Breakdance Uprock to Ground 2', category: 'breakdance', description: 'Uprock to ground transition 2' },
  { name: 'breakdanceUprockVar1', mixamoName: 'Breakdance Uprock Var 1', category: 'breakdance', description: 'Uprock variation 1' },
  { name: 'breakdanceUprockVar1End', mixamoName: 'Breakdance Uprock Var 1 End', category: 'breakdance', description: 'Uprock variation 1 ending' },
  { name: 'breakdanceUprockVar1Start', mixamoName: 'Breakdance Uprock Var 1 Start', category: 'breakdance', description: 'Uprock variation 1 start' },
  { name: 'breakdanceUprockVar2', mixamoName: 'Breakdance Uprock Var 2', category: 'breakdance', description: 'Uprock variation 2' },
  { name: 'brooklynUprock', mixamoName: 'Brooklyn Uprock', category: 'breakdance', description: 'Brooklyn uprock style' },
  { name: 'crosslegFreeze', mixamoName: 'Crossleg Freeze', category: 'breakdance', description: 'Crossleg freeze pose' },
  { name: 'flair', mixamoName: 'Flair', category: 'breakdance', description: 'Breakdance flair move' },
  { name: 'flair_2', mixamoName: 'Flair 2', category: 'breakdance', description: 'Alternative flair move' },
  { name: 'flair_3', mixamoName: 'Flair 3', category: 'breakdance', description: 'Another flair variation' },
];

// Gesture animations that are in current VRMA_GESTURE_ANIMATIONS but not in animation-list.json
const ADDITIONAL_GESTURE_ANIMATIONS: AnimationDefinition[] = [
  { name: 'hardHeadNod', mixamoName: 'Hard Head Nod', category: 'gesture', description: 'Strong head nod' },
  { name: 'lengthyHeadNod', mixamoName: 'Lengthy Head Nod', category: 'gesture', description: 'Extended head nod' },
  { name: 'sarcasticHeadNod', mixamoName: 'Sarcastic Head Nod', category: 'gesture', description: 'Sarcastic nod' },
  { name: 'shakingHeadNo', mixamoName: 'Shaking Head No', category: 'gesture', description: 'Shake head no' },
  { name: 'annoyedHeadShake', mixamoName: 'Annoyed Head Shake', category: 'gesture', description: 'Annoyed head shake' },
  { name: 'thoughtfulHeadShake', mixamoName: 'Thoughtful Head Shake', category: 'gesture', description: 'Thoughtful head shake' },
  { name: 'happyHandGesture', mixamoName: 'Happy Hand Gesture', category: 'gesture', description: 'Happy hand gesture' },
  { name: 'dismissingGesture', mixamoName: 'Dismissing Gesture', category: 'gesture', description: 'Dismissing wave' },
  { name: 'angryGesture', mixamoName: 'Angry Gesture', category: 'gesture', description: 'Angry gesture' },
  { name: 'beingCocky', mixamoName: 'Being Cocky', category: 'gesture', description: 'Cocky pose' },
  { name: 'relievedSigh', mixamoName: 'Relieved Sigh', category: 'gesture', description: 'Relieved sigh' },
  { name: 'lookAwayGesture', mixamoName: 'Look Away Gesture', category: 'gesture', description: 'Look away gesture' },
];

function readAnimationList(): AnimationList {
  const jsonPath = path.join(__dirname, 'animation-list.json');
  const content = fs.readFileSync(jsonPath, 'utf-8');
  return JSON.parse(content);
}

function categorizeAnimations(animations: AnimationDefinition[]) {
  const categories: Record<string, AnimationDefinition[]> = {};
  animations.forEach(anim => {
    if (!categories[anim.category]) {
      categories[anim.category] = [];
    }
    categories[anim.category].push(anim);
  });
  return categories;
}

function getVRMAPath(anim: AnimationDefinition): string {
  // Core animations use VRMA_XX.vrma naming
  const corePaths: Record<string, string> = {
    'greeting': 'animations/vrma/VRMA_02.vrma',
    'peace': 'animations/vrma/VRMA_03.vrma',
    'shoot': 'animations/vrma/VRMA_04.vrma',
    'spin': 'animations/vrma/VRMA_05.vrma',
    'modelPose': 'animations/vrma/VRMA_06.vrma',
    'squat': 'animations/vrma/VRMA_07.vrma',
  };

  // Breakdance animations use special naming
  const breakdancePaths: Record<string, string> = {
    'breakdance1990_2_alt': 'animations/vrma/breakdance1990(2).vrma',
    'breakdance1990_3': 'animations/vrma/breakdance1990(3).vrma',
    'breakdanceReady_2': 'animations/vrma/breakdanceReady(2).vrma',
    'breakdanceReady_3': 'animations/vrma/breakdanceReady(3).vrma',
    'breakdanceUprock_2': 'animations/vrma/breakdanceUprock(2).vrma',
    'breakdanceUprockToGround_2': 'animations/vrma/breakdanceUprockToGround(2).vrma',
    'flair_2': 'animations/vrma/flair(2).vrma',
    'flair_3': 'animations/vrma/flair(3).vrma',
  };

  // Special path mappings
  const specialPaths: Record<string, string> = {
    'plank': 'animations/vrma/startPlank.vrma',
    'openDoor': 'animations/vrma/openingDoorInwards.vrma',
    'flyingKnee': 'animations/vrma/flyingKneePunchCombo.vrma',
    'daggerStab': 'animations/vrma/doubleDaggerStab.vrma',
    'jogBackwards': 'animations/vrma/slowJogBackwards.vrma',
    'climbing': 'animations/vrma/climbingToTop.vrma',
    'turnRight': 'animations/vrma/rightTurnWBriefcase.vrma',
    'blowKiss': 'animations/vrma/blowAKiss.vrma',
    'clapping': 'animations/vrma/standingClap.vrma',
    'headShake': 'animations/vrma/shakingHeadNo.vrma',
    'running': 'animations/vrma/standardRun.vrma',
    'sittingDown': 'animations/vrma/standToSit.vrma',
    'standingUp': 'animations/vrma/sitToStand.vrma',
    'crouching': 'animations/vrma/crouchToStand.vrma',
    'sillyDance': 'animations/vrma/sillyDancing.vrma',
    'victoryDance': 'animations/vrma/victory.vrma',
    'thrillerPart2': 'animations/vrma/Thriller Part2.vrma',
    'thrillerPart3': 'animations/vrma/Thriller Part3 (1).vrma',
    'catwalk': 'animations/vrma/catwalkWalking.vrma',
    'hipHopDancing': 'animations/vrma/hipHopDance.vrma',
  };

  if (corePaths[anim.name]) return corePaths[anim.name];
  if (breakdancePaths[anim.name]) return breakdancePaths[anim.name];
  if (specialPaths[anim.name]) return specialPaths[anim.name];

  // Default: use name.vrma (matches actual file names on disk)
  const filename = `${anim.name}.vrma`;
  return `animations/vrma/${filename}`;
}

function generateRuntimeConfig(animations: AnimationDefinition[]): string {
  const categories = categorizeAnimations(animations);

  // Track used paths to prevent duplicates - shared across all categories
  const usedPaths = new Set<string>();

  // Generate VRMA_CORE_ANIMATIONS
  const coreAnimations = CORE_ANIMATIONS.map(anim => {
    const path = getVRMAPath(anim);
    usedPaths.add(path);
    return `  { path: '${path}', name: '${anim.name}', description: '${anim.description}' }`;
  }).join(',\n');

  // Generate VRMA_EXTENDED_ANIMATIONS (all non-core, non-gesture, non-breakdance from JSON)
  const extendedCategories = ['idle', 'action', 'social', 'movement', 'dance', 'thriller'];
  const extendedAnimations = extendedCategories.flatMap(cat => {
    return (categories[cat] || [])
      .filter(anim => {
        const path = getVRMAPath(anim);
        // Skip if this path is already used
        if (usedPaths.has(path)) {
          return false;
        }
        usedPaths.add(path);
        return true;
      })
      .map(anim => {
        const path = getVRMAPath(anim);
        return `  { path: '${path}', name: '${anim.name}', description: '${anim.description}' }`;
      });
  }).join(',\n');

  // Generate VRMA_GESTURE_ANIMATIONS (gesture from JSON + additional gestures)
  const gestureFromJson = (categories['gesture'] || [])
    .filter(anim => {
      const path = getVRMAPath(anim);
      // Skip if this path is already used
      if (usedPaths.has(path)) {
        return false;
      }
      usedPaths.add(path);
      return true;
    })
    .map(anim => {
      const path = getVRMAPath(anim);
      return `  { path: '${path}', name: '${anim.name}', description: '${anim.description}' }`;
    });
  const additionalGestures = ADDITIONAL_GESTURE_ANIMATIONS
    .filter(anim => {
      const path = getVRMAPath(anim);
      // Skip if this path is already used
      if (usedPaths.has(path)) {
        return false;
      }
      usedPaths.add(path);
      return true;
    })
    .map(anim => {
      const path = getVRMAPath(anim);
      return `  { path: '${path}', name: '${anim.name}', description: '${anim.description}' }`;
    });
  const gestureAnimations = [...gestureFromJson, ...additionalGestures].join(',\n');

  // Generate VRMA_BREAKDANCE_ANIMATIONS
  const breakdanceAnimations = BREAKDANCE_ANIMATIONS
    .filter(anim => {
      const path = getVRMAPath(anim);
      // Skip if this path is already used
      if (usedPaths.has(path)) {
        return false;
      }
      usedPaths.add(path);
      return true;
    })
    .map(anim => {
      const path = getVRMAPath(anim);
      return `  { path: '${path}', name: '${anim.name}' }`;
    }).join(',\n');

  return `/**
 * AUTO-GENERATED - DO NOT EDIT
 * Generated from scripts/animation-list.json
 * Run: npm run generate:animation-config
 */

import type { VRMAAnimationConfig } from '../services/vrmaAnimationService';

// Core animations from VRM Motion Pack
export const VRMA_CORE_ANIMATIONS: VRMAAnimationConfig[] = [
${coreAnimations},
];

// Extended animations from Mixamo (converted from FBX)
export const VRMA_EXTENDED_ANIMATIONS: VRMAAnimationConfig[] = [
${extendedAnimations},
];

// Gesture animations
export const VRMA_GESTURE_ANIMATIONS: VRMAAnimationConfig[] = [
${gestureAnimations},
];

// Breakdance animations
export const VRMA_BREAKDANCE_ANIMATIONS: VRMAAnimationConfig[] = [
${breakdanceAnimations},
];

// Combined list of all animations
export const VRMA_ANIMATIONS: VRMAAnimationConfig[] = [
  ...VRMA_CORE_ANIMATIONS,
  ...VRMA_EXTENDED_ANIMATIONS,
  ...VRMA_GESTURE_ANIMATIONS,
  ...VRMA_BREAKDANCE_ANIMATIONS,
];
`;
}

function generateTypeDefinitions(animations: AnimationDefinition[]): string {
  const categories = categorizeAnimations(animations);

  // Core animations
  const coreAnimations = CORE_ANIMATIONS.map(anim => `  '${anim.name}'`).join(',\n');

  // Extended animations (all non-core, non-gesture, non-breakdance)
  const extendedCategories = ['idle', 'action', 'social', 'movement', 'dance', 'thriller'];
  const extendedAnimations = extendedCategories.flatMap(cat => {
    return (categories[cat] || []).map(anim => `  '${anim.name}'`);
  }).join(',\n');

  // Gesture animations
  const gestureFromJson = (categories['gesture'] || []).map(anim => `  '${anim.name}'`);
  const additionalGestures = ADDITIONAL_GESTURE_ANIMATIONS.map(anim => `  '${anim.name}'`);
  const gestureAnimations = [...gestureFromJson, ...additionalGestures].join(',\n');

  // Breakdance animations
  const breakdanceAnimations = BREAKDANCE_ANIMATIONS.map(anim => `  '${anim.name}'`).join(',\n');

  return `/**
 * AUTO-GENERATED - DO NOT EDIT
 * Generated from scripts/animation-list.json
 * Run: npm run generate:animation-config
 */

// Core animations
export const CORE_ANIMATIONS = [
${coreAnimations}
] as const;

// Extended animations
export const EXTENDED_ANIMATIONS = [
${extendedAnimations}
] as const;

// Gesture animations
export const GESTURE_ANIMATIONS = [
${gestureAnimations}
] as const;

// Breakdance animations
export const BREAKDANCE_ANIMATIONS = [
${breakdanceAnimations}
] as const;

// All available animations
export const AVAILABLE_ANIMATIONS = [
  ...CORE_ANIMATIONS,
  ...EXTENDED_ANIMATIONS,
  ...GESTURE_ANIMATIONS,
  ...BREAKDANCE_ANIMATIONS,
] as const;

// Type union of all animation names
export type AnimationName = typeof AVAILABLE_ANIMATIONS[number];
`;
}

function generateLLMPrompt(animations: AnimationDefinition[]): string {
  const categories = categorizeAnimations(animations);

  // Helper to format animation entries
  const formatAnimations = (anims: AnimationDefinition[]) => {
    return anims.map(anim => `- ${anim.name}: ${anim.description}`).join('\n');
  };

  // Core animations
  const coreSection = CORE_ANIMATIONS.map(anim => `- ${anim.name}: ${anim.description}`).join('\n');

  // Extended animations by category
  const extendedCategories = ['idle', 'action', 'social', 'movement', 'dance', 'thriller'];
  const extendedSections = extendedCategories.map(cat => {
    const catAnims = categories[cat] || [];
    if (catAnims.length === 0) return '';
    const catName = cat.toUpperCase();
    return `${catName}:\n${formatAnimations(catAnims)}`;
  }).filter(Boolean).join('\n\n');

  // Gesture animations
  const gestureFromJson = (categories['gesture'] || []);
  const additionalGestures = ADDITIONAL_GESTURE_ANIMATIONS;
  const allGestures = [...gestureFromJson, ...additionalGestures];
  const headGestures = allGestures.filter(a => a.name.includes('head') || a.name.includes('Head'))
    .map(a => `- ${a.name}: ${a.description}`).join('\n');
  const handGestures = allGestures.filter(a => a.name.includes('Hand') || a.name.includes('hand') || a.name.includes('thumb') || a.name.includes('Thumb') || a.name.includes('pointing') || a.name.includes('beckon'))
    .map(a => `- ${a.name}: ${a.description}`).join('\n');
  const gestureSection = `GESTURE ANIMATIONS (subtle expressions):\nHEAD GESTURES:\n${headGestures}\n\nHAND GESTURES:\n${handGestures}`;

  // Breakdance animations
  const breakdanceSection = `BREAKDANCE:\n${BREAKDANCE_ANIMATIONS.map(anim => `- ${anim.name}: ${anim.description}`).join('\n')}`;

  // Build the full prompt string
  const promptString = [
    'You are an animation director for a 3D avatar. Given a conversation exchange, decide which animations avatar should perform to accompany speaking its response.',
    '',
    'Available animations by category:',
    '',
    'CORE ANIMATIONS:',
    coreSection,
    '',
    extendedSections,
    '',
    gestureSection,
    '',
    breakdanceSection,
    '',
    'Rules:',
    '1. Only trigger animations that naturally match what is avatar is saying',
    '2. Can return multiple animations to be played in sequence with delays',
    '3. Return empty array if no animation fits context',
    '4. Consider the user\'s request AND the AI\'s response',
    '5. Be selective - not every response needs an animation',
    '6. If the user explicitly asks for an action (spin, wave, dance, etc), definitely include it',
    '7. Prefer core animations for basic interactions, extended for more specific scenarios',
  ].join('\n');

  const header = `/**
 * AUTO-GENERATED - DO NOT EDIT
 * Generated from scripts/animation-list.json
 * Run: npm run generate:animation-config
 */

export const ANIMATION_JUDGE_SYSTEM_PROMPT = \``;
  return header + promptString + '`;';
}

function main() {
  const animationList = readAnimationList();

  // Generate files
  const runtimeConfig = generateRuntimeConfig(animationList.animations);
  const typeDefinitions = generateTypeDefinitions(animationList.animations);
  const llmPrompt = generateLLMPrompt(animationList.animations);

  // Write generated files
  const generatedDir = path.join(__dirname, '..', 'src', 'generated');
  fs.mkdirSync(generatedDir, { recursive: true });

  fs.writeFileSync(
    path.join(generatedDir, 'animationConfig.generated.ts'),
    runtimeConfig
  );

  fs.writeFileSync(
    path.join(generatedDir, 'animationTypes.generated.ts'),
    typeDefinitions
  );

  fs.writeFileSync(
    path.join(generatedDir, 'animationPrompt.generated.ts'),
    llmPrompt
  );

  console.log('✅ Animation configuration files generated successfully');
}

main();
