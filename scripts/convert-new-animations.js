#!/usr/bin/env node
/**
 * FBX to VRMA Batch Converter for New Animations
 *
 * Recursively converts all FBX files in animations-raw/ to VRMA format in public/animations/vrma/
 * Skips files that already have corresponding VRMA files.
 * Uses the fbx2vrma-converter tool with Windows FBX2glTF binary.
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const INPUT_DIR = path.join(__dirname, '..', 'animations-raw');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'animations', 'vrma');
const CONVERTER_PATH = path.join(__dirname, '..', 'tools', 'fbx2vrma-converter', 'fbx2vrma-converter.js');
const FBX2GLTF_PATH = path.join(__dirname, '..', 'tools', 'fbx2vrma-converter', 'FBX2glTF-windows-x64.exe');

function normalizeFilename(filename) {
  // Remove extension and normalize
  const baseName = path.basename(filename, path.extname(filename));

  // Handle duplicate files with (1), (2), etc.
  let normalized = baseName;

  // Convert to camelCase
  normalized = baseName
    .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^./, c => c.toLowerCase());

  // Handle parentheses for duplicates
  normalized = normalized.replace(/\((\d+)\)/g, '_$1');

  return normalized;
}

function findFbxFilesRecursively(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      files.push(...findFbxFilesRecursively(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.fbx')) {
      files.push(fullPath);
    }
  }

  return files;
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
  console.log('🎬 FBX to VRMA Batch Converter for New Animations\n');

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

  // Find all FBX files recursively
  const fbxFiles = findFbxFilesRecursively(INPUT_DIR);

  if (fbxFiles.length === 0) {
    console.log('⚠️  No FBX files found in animations-raw/');
    return;
  }

  console.log(`📂 Input directory: ${INPUT_DIR}`);
  console.log(`📂 Output directory: ${OUTPUT_DIR}`);
  console.log(`📄 Total FBX files found: ${fbxFiles.length}\n`);

  // Get existing VRMA files
  const existingVrmaFiles = new Set(
    fs.readdirSync(OUTPUT_DIR)
      .filter(f => f.toLowerCase().endsWith('.vrma'))
      .map(f => f.replace(/\.vrma$/i, ''))
  );

  console.log(`📄 Existing VRMA files: ${existingVrmaFiles.size}\n`);

  let successful = 0;
  let failed = 0;
  let skipped = 0;
  const converted = [];

  for (const file of fbxFiles) {
    const outputName = normalizeFilename(file);
    const vrmaPath = path.join(OUTPUT_DIR, `${outputName}.vrma`);

    // Skip if VRMA already exists
    if (fs.existsSync(vrmaPath)) {
      skipped++;
      console.log(`  ⏭️  ${path.basename(file)} → ${outputName}.vrma (already exists)`);
      continue;
    }

    const result = convertFile(file, outputName);
    if (result) {
      successful++;
      converted.push(outputName);
    } else {
      failed++;
    }
  }

  console.log('\n📊 Conversion Summary:');
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ⏭️  Skipped (already exists): ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);

  // Generate code snippet for vrmaAnimationService.ts
  if (converted.length > 0) {
    console.log('\n📝 Add these to VRMA_EXTENDED_ANIMATIONS in vrmaAnimationService.ts:\n');
    console.log('  // New animations');
    converted.forEach(name => {
      console.log(`  { path: '/animations/vrma/${name}.vrma', name: '${name}', description: '${name} animation' },`);
    });

    console.log('\n📝 Add these to EXTENDED_ANIMATIONS in src/types/index.ts:\n');
    converted.forEach(name => {
      console.log(`  '${name}',`);
    });
  } else {
    console.log('\n✅ All animations already converted!');
  }
}

main();
