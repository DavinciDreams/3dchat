#!/usr/bin/env node
/**
 * FBX to VRMA Batch Converter for raw subdirectory (Windows)
 *
 * Converts all FBX files in animations-raw/raw/ to VRMA format in public/animations/vrma/
 * Uses the fbx2vrma-converter tool with Windows FBX2glTF binary.
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Configuration
const INPUT_DIR = path.join(__dirname, '..', 'animations-raw', 'raw');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'animations', 'vrma');
const CONVERTER_PATH = path.join(__dirname, '..', 'tools', 'fbx2vrma-converter', 'fbx2vrma-converter.js');
const FBX2GLTF_PATH = path.join(__dirname, '..', 'tools', 'fbx2vrma-converter', 'FBX2glTF-windows-x64.exe');

// Load animation list for name mapping
let animationList = { animations: [] };
try {
  animationList = require('./animation-list.json');
} catch (e) {
  console.log('⚠️  animation-list.json not found, will use original filenames');
}

// Create a map from mixamoName to our internal name
const nameMap = {};
animationList.animations.forEach(anim => {
  // Multiple possible variations of the filename
  const mixamoNameVariants = [
    anim.mixamoName.toLowerCase().replace(/\s+/g, ''),
    anim.mixamoName.toLowerCase().replace(/\s+/g, '-'),
    anim.mixamoName.toLowerCase().replace(/\s+/g, '_'),
    anim.mixamoName.toLowerCase()
  ];
  mixamoNameVariants.forEach(variant => {
    nameMap[variant] = anim.name;
  });
});

function normalizeFilename(filename) {
  // Remove extension and normalize
  const baseName = path.basename(filename, path.extname(filename));
  const normalized = baseName.toLowerCase().replace(/\s+/g, '').replace(/-/g, '').replace(/_/g, '');

  // Check if we have a mapping for this name
  if (nameMap[normalized]) {
    return nameMap[normalized];
  }

  // Try other variations
  for (const [key, value] of Object.entries(nameMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  // Fall back to camelCase version of filename
  return baseName
    .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^./, c => c.toLowerCase());
}

function convertFile(inputPath, outputName) {
  const outputPath = path.join(OUTPUT_DIR, `${outputName}.vrma`);

  console.log(`  📄 ${path.basename(inputPath)} → ${outputName}.vrma`);

  try {
    execSync(
      `node "${CONVERTER_PATH}" -i "${inputPath}" -o "${outputPath}" --fbx2gltf "${FBX2GLTF_PATH}"`,
      { stdio: 'pipe' }
    );
    return true;
  } catch (error) {
    console.error(`     ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🎬 FBX to VRMA Batch Converter for raw subdirectory (Windows)\n');

  // Check if input directory exists
  if (!fs.existsSync(INPUT_DIR)) {
    console.log(`📁 Input directory not found: ${INPUT_DIR}`);
    return;
  }

  // Check if converter exists
  if (!fs.existsSync(CONVERTER_PATH)) {
    console.error('❌ Error: fbx2vrma-converter not found.');
    console.error(`   Expected at: ${CONVERTER_PATH}`);
    process.exit(1);
  }

  // Check if FBX2glTF binary exists
  if (!fs.existsSync(FBX2GLTF_PATH)) {
    console.error('❌ Error: FBX2glTF binary not found.');
    console.error(`   Expected at: ${FBX2GLTF_PATH}`);
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Find all FBX files
  const fbxFiles = fs.readdirSync(INPUT_DIR).filter(f =>
    f.toLowerCase().endsWith('.fbx')
  );

  if (fbxFiles.length === 0) {
    console.log('⚠️  No FBX files found in animations-raw/raw/');
    return;
  }

  console.log(`📂 Input directory: ${INPUT_DIR}`);
  console.log(`📂 Output directory: ${OUTPUT_DIR}`);
  console.log(`📄 Files to convert: ${fbxFiles.length}\n`);

  let successful = 0;
  let failed = 0;
  const converted = [];

  for (const file of fbxFiles) {
    const inputPath = path.join(INPUT_DIR, file);
    const outputName = normalizeFilename(file);

    const result = convertFile(inputPath, outputName);
    if (result) {
      successful++;
      converted.push(outputName);
    } else {
      failed++;
    }
  }

  console.log('\n📊 Conversion Summary:');
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);

  // Generate code snippet for vrmaAnimationService.ts
  if (converted.length > 0) {
    console.log('\n📝 Add these to vrmaAnimationService.ts:\n');
    console.log('export const VRMA_ANIMATIONS: Record<string, string> = {');
    converted.forEach(name => {
      console.log(`  '${name}': '/animations/vrma/${name}.vrma',`);
    });
    console.log('};');
  }
}

main();
