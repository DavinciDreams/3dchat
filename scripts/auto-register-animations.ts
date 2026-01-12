#!/usr/bin/env tsx
/**
 * Auto-Detection Script for VRMA Animations
 *
 * Scans the vrma folder and automatically identifies unregistered animations.
 * Generates registration code snippets for new animations.
 *
 * Usage:
 *   npm run register:animations              # Show unregistered animations
 *   npm run register:animations -- --update  # Auto-update configuration files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Interfaces
interface AnimationDefinition {
  name: string;
  mixamoName: string;
  category: string;
  description: string;
}

interface AnimationList {
  animations: AnimationDefinition[];
}

interface UnregisteredAnimation {
  filename: string;
  suggestedName: string;
  suggestedCategory: string;
  suggestedMixamoName: string;
  suggestedDescription: string;
}

interface RegistrationReport {
  totalVrmaFiles: number;
  registeredAnimations: number;
  unregisteredAnimations: UnregisteredAnimation[];
  duplicateFiles: string[];
}

// Configuration paths
const VRMA_FOLDER = path.join(__dirname, '..', 'public', 'animations', 'vrma');
const ANIMATION_LIST_JSON = path.join(__dirname, 'animation-list.json');
const GENERATE_CONFIG_TS = path.join(__dirname, 'generate-animation-config.ts');

// Special path mappings from generate-animation-config.ts
const CORE_ANIMATION_PATHS: Record<string, string> = {
  'VRMA_02.vrma': 'greeting',
  'VRMA_03.vrma': 'peace',
  'VRMA_04.vrma': 'shoot',
  'VRMA_05.vrma': 'spin',
  'VRMA_06.vrma': 'modelPose',
  'VRMA_07.vrma': 'squat',
};

const SPECIAL_PATH_MAPPINGS: Record<string, string> = {
  'breakdance1990(2).vrma': 'breakdance1990_2_alt',
  'breakdance1990(3).vrma': 'breakdance1990_3',
  'breakdanceReady(2).vrma': 'breakdanceReady_2',
  'breakdanceReady(3).vrma': 'breakdanceReady_3',
  'breakdanceUprock(2).vrma': 'breakdanceUprock_2',
  'breakdanceUprockToGround(2).vrma': 'breakdanceUprockToGround_2',
  'flair(2).vrma': 'flair_2',
  'flair(3).vrma': 'flair_3',
  'startPlank.vrma': 'plank',
  'openingDoorInwards.vrma': 'openDoor',
};

// Category suggestions based on filename patterns
const CATEGORY_PATTERNS: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /breakdance|flair|uprock|freeze/i, category: 'breakdance' },
  { pattern: /thriller/i, category: 'thriller' },
  { pattern: /dance|twerk|rumba|samba|twist|macarena|fistpump|jumpingjoy|victory|excited|silly/i, category: 'dance' },
  { pattern: /idle|standing|sitting|laying|defeat|ninja|bored|melancholy|victory|weightshift|lookingaround/i, category: 'idle' },
  { pattern: /walk|run|jump|crouch|kneel|crawl|swim|float|sneak|pacing|skate|texting|turn|climb|sit|stand|fall|land|catwalk/i, category: 'movement' },
  { pattern: /gesture|nod|shake|head|hand|thumb|point|beckon|wave|shrug|palm|face|cry|laugh|surprise|scared|confused|agree|disagree|cocky|dismissing|relieved|lookaway|annoyed|thoughtful|sarcastic|bashful|disappointed|pat|pet|plot|roar|yawn|yell|sing|talk/i, category: 'gesture' },
  { pattern: /clap|cheer|greeting|salute|bow|kiss|blowkiss|shakehand|pray|argue|social/i, category: 'social' },
  { pattern: /punch|kick|dodge|block|magic|throw|catch|push|vault|kip|cartwheel|backflip|aim|gun|button|fish|golf|guitar|piano|drum|violin|paddle|rummage|situp|jumpingjack|plank|open|door|staff|swing|reload|stab|snatch|bodyblock|centerblock|dropkick|flyingknee|climb|magicattack|standtocover|zombie/i, category: 'action' },
];

/**
 * Get all VRMA files from the vrma folder
 */
function getVrmaFiles(): string[] {
  if (!fs.existsSync(VRMA_FOLDER)) {
    console.error(`❌ VRMA folder not found: ${VRMA_FOLDER}`);
    process.exit(1);
  }

  const files = fs.readdirSync(VRMA_FOLDER);
  return files.filter(file => file.endsWith('.vrma')).sort();
}

/**
 * Read and parse animation-list.json
 */
function readAnimationList(): AnimationList {
  if (!fs.existsSync(ANIMATION_LIST_JSON)) {
    console.warn(`⚠️  animation-list.json not found: ${ANIMATION_LIST_JSON}`);
    return { animations: [] };
  }

  const content = fs.readFileSync(ANIMATION_LIST_JSON, 'utf-8');
  return JSON.parse(content);
}

/**
 * Parse hardcoded animations from generate-animation-config.ts
 */
function parseGenerateConfigAnimations(): {
  core: AnimationDefinition[];
  breakdance: AnimationDefinition[];
  gesture: AnimationDefinition[];
} {
  if (!fs.existsSync(GENERATE_CONFIG_TS)) {
    console.warn(`⚠️  generate-animation-config.ts not found: ${GENERATE_CONFIG_TS}`);
    return { core: [], breakdance: [], gesture: [] };
  }

  const content = fs.readFileSync(GENERATE_CONFIG_TS, 'utf-8');

  // Parse CORE_ANIMATIONS array
  const coreMatch = content.match(/const CORE_ANIMATIONS: AnimationDefinition\[\] = \[([\s\S]*?)\];/);
  const core = coreMatch ? parseAnimationArray(coreMatch[1]) : [];

  // Parse BREAKDANCE_ANIMATIONS array
  const breakdanceMatch = content.match(/const BREAKDANCE_ANIMATIONS: AnimationDefinition\[\] = \[([\s\S]*?)\];/);
  const breakdance = breakdanceMatch ? parseAnimationArray(breakdanceMatch[1]) : [];

  // Parse ADDITIONAL_GESTURE_ANIMATIONS array
  const gestureMatch = content.match(/const ADDITIONAL_GESTURE_ANIMATIONS: AnimationDefinition\[\] = \[([\s\S]*?)\];/);
  const gesture = gestureMatch ? parseAnimationArray(gestureMatch[1]) : [];

  return { core, breakdance, gesture };
}

/**
 * Parse animation array from TypeScript code
 */
function parseAnimationArray(arrayContent: string): AnimationDefinition[] {
  const animations: AnimationDefinition[] = [];
  const objectPattern = /\{\s*name:\s*['"]([^'"]+)['"],\s*mixamoName:\s*['"]([^'"]+)['"],\s*category:\s*['"]([^'"]+)['"],\s*description:\s*['"]([^'"]+)['"]\s*\}/g;

  let match;
  while ((match = objectPattern.exec(arrayContent)) !== null) {
    animations.push({
      name: match[1],
      mixamoName: match[2],
      category: match[3],
      description: match[4],
    });
  }

  return animations;
}

/**
 * Get the animation name from a VRMA filename
 */
function getAnimationNameFromFilename(filename: string): string | null {
  // Check core animation paths
  if (CORE_ANIMATION_PATHS[filename]) {
    return CORE_ANIMATION_PATHS[filename];
  }

  // Check special path mappings
  if (SPECIAL_PATH_MAPPINGS[filename]) {
    return SPECIAL_PATH_MAPPINGS[filename];
  }

  // Default: remove .vrma extension
  return filename.replace('.vrma', '');
}


/**
 * Suggest a category for an animation based on its filename
 */
function suggestCategory(filename: string): string {
  for (const { pattern, category } of CATEGORY_PATTERNS) {
    if (pattern.test(filename)) {
      return category;
    }
  }
  return 'action'; // Default category
}

/**
 * Suggest a mixamo name from the filename
 */
function suggestMixamoName(filename: string): string {
  const name = filename.replace('.vrma', '');

  // Handle special cases
  const specialCases: Record<string, string> = {
    'breakdance1990(2)': 'Breakdance 1990 2 Alt',
    'breakdance1990(3)': 'Breakdance 1990 3',
    'breakdanceReady(2)': 'Breakdance Ready 2',
    'breakdanceReady(3)': 'Breakdance Ready 3',
    'breakdanceUprock(2)': 'Breakdance Uprock 2',
    'breakdanceUprockToGround(2)': 'Breakdance Uprock to Ground 2',
    'flair(2)': 'Flair 2',
    'flair(3)': 'Flair 3',
    'startPlank': 'Plank',
    'openingDoorInwards': 'Open Door',
  };

  if (specialCases[name]) {
    return specialCases[name];
  }

  // Convert camelCase to Title Case
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Suggest a description for an animation
 */
function suggestDescription(filename: string, category: string): string {
  const mixamoName = suggestMixamoName(filename);

  const descriptions: Record<string, string> = {
    breakdance: `Breakdance ${mixamoName.toLowerCase()}`,
    dance: `${mixamoName} dance moves`,
    idle: `${mixamoName} idle pose`,
    movement: `${mixamoName} animation`,
    gesture: `${mixamoName} gesture`,
    social: `${mixamoName} gesture`,
    action: `${mixamoName} action`,
  };

  return descriptions[category] || `${mixamoName} animation`;
}

/**
 * Find unregistered animations
 */
function findUnregisteredAnimations(vrmaFiles: string[]): {
  unregistered: UnregisteredAnimation[];
  duplicates: string[];
} {
  const registeredNames = new Set<string>();
  const seenFiles = new Map<string, string[]>();
  const unregistered: UnregisteredAnimation[] = [];
  const duplicates: string[] = [];

  // Add animations from animation-list.json
  const animationList = readAnimationList();
  animationList.animations.forEach(anim => registeredNames.add(anim.name));

  // Add animations from generate-animation-config.ts
  const configAnimations = parseGenerateConfigAnimations();
  configAnimations.core.forEach(anim => registeredNames.add(anim.name));
  configAnimations.breakdance.forEach(anim => registeredNames.add(anim.name));
  configAnimations.gesture.forEach(anim => registeredNames.add(anim.name));

  // Check each VRMA file
  vrmaFiles.forEach(filename => {
    const animName = getAnimationNameFromFilename(filename);

    if (!animName) {
      return; // Skip files that don't map to an animation name
    }

    // Track potential duplicates
    if (!seenFiles.has(animName)) {
      seenFiles.set(animName, []);
    }
    seenFiles.get(animName)!.push(filename);

    // Check if registered
    if (!registeredNames.has(animName)) {
      const category = suggestCategory(filename);
      unregistered.push({
        filename,
        suggestedName: animName,
        suggestedCategory: category,
        suggestedMixamoName: suggestMixamoName(filename),
        suggestedDescription: suggestDescription(filename, category),
      });
    }
  });

  // Find duplicates (same animation name from different files)
  seenFiles.forEach((files) => {
    if (files.length > 1) {
      duplicates.push(...files);
    }
  });

  return { unregistered, duplicates };
}

/**
 * Generate registration code snippet for animation-list.json
 */
function generateJsonSnippet(animation: UnregisteredAnimation): string {
  return `  {
    "name": "${animation.suggestedName}",
    "mixamoName": "${animation.suggestedMixamoName}",
    "category": "${animation.suggestedCategory}",
    "description": "${animation.suggestedDescription}"
  }`;
}

/**
 * Generate registration code snippet for generate-animation-config.ts
 */
function generateTypeScriptSnippet(animation: UnregisteredAnimation): string {
  return `  { name: '${animation.suggestedName}', mixamoName: '${animation.suggestedMixamoName}', category: '${animation.suggestedCategory}', description: '${animation.suggestedDescription}' }`;
}

/**
 * Print the registration report
 */
function printReport(report: RegistrationReport): void {
  console.log('\n' + '='.repeat(80));
  console.log('📊 ANIMATION REGISTRATION REPORT');
  console.log('='.repeat(80));

  console.log(`\n📁 Total VRMA files found: ${report.totalVrmaFiles}`);
  console.log(`✅ Registered animations: ${report.registeredAnimations}`);
  console.log(`❌ Unregistered animations: ${report.unregisteredAnimations.length}`);

  if (report.duplicateFiles.length > 0) {
    console.log(`\n⚠️  Duplicate files detected (${report.duplicateFiles.length}):`);
    report.duplicateFiles.forEach(file => console.log(`   - ${file}`));
  }

  if (report.unregisteredAnimations.length > 0) {
    console.log('\n' + '-'.repeat(80));
    console.log('📝 UNREGISTERED ANIMATIONS');
    console.log('-'.repeat(80));

    report.unregisteredAnimations.forEach((anim, index) => {
      console.log(`\n${index + 1}. ${anim.filename}`);
      console.log(`   Suggested name: ${anim.suggestedName}`);
      console.log(`   Category: ${anim.suggestedCategory}`);
      console.log(`   Mixamo name: ${anim.suggestedMixamoName}`);
      console.log(`   Description: ${anim.suggestedDescription}`);
    });

    console.log('\n' + '-'.repeat(80));
    console.log('💡 REGISTRATION CODE SNIPPETS');
    console.log('-'.repeat(80));

    // Group by category
    const byCategory = new Map<string, UnregisteredAnimation[]>();
    report.unregisteredAnimations.forEach(anim => {
      if (!byCategory.has(anim.suggestedCategory)) {
        byCategory.set(anim.suggestedCategory, []);
      }
      byCategory.get(anim.suggestedCategory)!.push(anim);
    });

    // JSON snippets for animation-list.json
    console.log('\n📄 For animation-list.json:');
    byCategory.forEach((anims, category) => {
      if (category !== 'breakdance') { // Skip breakdance - goes to TypeScript
        console.log(`\n// ${category.toUpperCase()} ANIMATIONS`);
        anims.forEach(anim => {
          console.log(generateJsonSnippet(anim) + ',');
        });
      }
    });

    // TypeScript snippets for generate-animation-config.ts
    console.log('\n\n📄 For generate-animation-config.ts:');
    byCategory.forEach((anims, category) => {
      console.log(`\n// ${category.toUpperCase()} ANIMATIONS`);
      anims.forEach(anim => {
        console.log(generateTypeScriptSnippet(anim) + ',');
      });
    });

    console.log('\n' + '-'.repeat(80));
    console.log('🔧 TO REGISTER ANIMATIONS:');
    console.log('-'.repeat(80));
    console.log('\nOption 1: Manual Registration');
    console.log('  1. Copy the snippets above');
    console.log('  2. Add to the appropriate array in scripts/generate-animation-config.ts');
    console.log('  3. Or add to scripts/animation-list.json');
    console.log('  4. Run: npm run generate:animation-config');

    console.log('\nOption 2: Automatic Registration');
    console.log('  Run: npm run register:animations -- --update');
    console.log('  (This will automatically update the configuration files)');
  } else {
    console.log('\n✅ All animations are registered!');
  }

  console.log('\n' + '='.repeat(80));
}

/**
 * Auto-update configuration files with unregistered animations
 */
function autoUpdateConfigFiles(report: RegistrationReport): void {
  if (report.unregisteredAnimations.length === 0) {
    console.log('✅ No animations to register.');
    return;
  }

  console.log('\n🔧 Auto-updating configuration files...');

  // Update animation-list.json
  const animationList = readAnimationList();
  const addedToJson: string[] = [];

  report.unregisteredAnimations.forEach(anim => {
    // Skip breakdance animations (they go in TypeScript)
    if (anim.suggestedCategory !== 'breakdance') {
      animationList.animations.push({
        name: anim.suggestedName,
        mixamoName: anim.suggestedMixamoName,
        category: anim.suggestedCategory,
        description: anim.suggestedDescription,
      });
      addedToJson.push(anim.suggestedName);
    }
  });

  if (addedToJson.length > 0) {
    fs.writeFileSync(
      ANIMATION_LIST_JSON,
      JSON.stringify(animationList, null, 2) + '\n'
    );
    console.log(`✅ Added ${addedToJson.length} animations to animation-list.json`);
    addedToJson.forEach(name => console.log(`   - ${name}`));
  }

  // Update generate-animation-config.ts for breakdance animations
  if (report.unregisteredAnimations.some(a => a.suggestedCategory === 'breakdance')) {
    let configContent = fs.readFileSync(GENERATE_CONFIG_TS, 'utf-8');

    // Find BREAKDANCE_ANIMATIONS array and add new animations
    const breakdanceAnims = report.unregisteredAnimations.filter(a => a.suggestedCategory === 'breakdance');
    const newEntries = breakdanceAnims.map(anim => {
      return `  { name: '${anim.suggestedName}', mixamoName: '${anim.suggestedMixamoName}', category: '${anim.suggestedCategory}', description: '${anim.suggestedDescription}' }`;
    }).join(',\n');

    // Insert before the closing bracket of BREAKDANCE_ANIMATIONS
    const breakdanceArrayPattern = /(const BREAKDANCE_ANIMATIONS: AnimationDefinition\[\] = \[)([\s\S]*?)(\];)/;
    const match = configContent.match(breakdanceArrayPattern);

    if (match) {
      const beforeArray = match[1];
      const arrayContent = match[2];
      const afterArray = match[3];

      // Add new entries before the closing bracket
      const updatedArrayContent = arrayContent.trimEnd();
      const newContent = configContent.replace(
        breakdanceArrayPattern,
        `${beforeArray}\n${updatedArrayContent},\n${newEntries}\n${afterArray}`
      );

      fs.writeFileSync(GENERATE_CONFIG_TS, newContent);
      console.log(`✅ Added ${breakdanceAnims.length} breakdance animations to generate-animation-config.ts`);
      breakdanceAnims.forEach(anim => console.log(`   - ${anim.suggestedName}`));
    }
  }

  console.log('\n🔄 Run: npm run generate:animation-config');
  console.log('   to regenerate the generated files with the new animations.');
}

/**
 * Main function
 */
function main(): void {
  const args = process.argv.slice(2);
  const autoUpdate = args.includes('--update');

  console.log('🔍 Scanning VRMA folder for unregistered animations...\n');

  // Get all VRMA files
  const vrmaFiles = getVrmaFiles();

  // Find unregistered animations
  const { unregistered, duplicates } = findUnregisteredAnimations(vrmaFiles);

  // Create report
  const report: RegistrationReport = {
    totalVrmaFiles: vrmaFiles.length,
    registeredAnimations: vrmaFiles.length - unregistered.length,
    unregisteredAnimations: unregistered,
    duplicateFiles: duplicates,
  };

  // Print report
  printReport(report);

  // Auto-update if requested
  if (autoUpdate) {
    autoUpdateConfigFiles(report);
  }
}

main();
