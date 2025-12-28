#!/usr/bin/env node
/**
 * Mixamo Animation Downloader
 *
 * Automates downloading FBX animations from Mixamo using the API.
 * Usage: node download-mixamo.js --email YOUR_EMAIL --password YOUR_PASSWORD
 *
 * Environment variables:
 * - MIXAMO_EMAIL: Adobe account email
 * - MIXAMO_PASSWORD: Adobe account password
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import https from 'https';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Load animation list
const animationList = require('./animation-list.json');

// Configuration
const DOWNLOAD_DIR = path.join(__dirname, '..', 'animations-raw');
const MIXAMO_URL = 'https://www.mixamo.com/';
const DEFAULT_CHARACTER_ID = '103120902'; // Y-Bot character ID (simple humanoid)

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    email: process.env.MIXAMO_EMAIL,
    password: process.env.MIXAMO_PASSWORD,
    headless: true,
    specific: null,
    limit: 50
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      options.email = args[++i];
    } else if (args[i] === '--password' && args[i + 1]) {
      options.password = args[++i];
    } else if (args[i] === '--visible') {
      options.headless = false;
    } else if (args[i] === '--animation' && args[i + 1]) {
      options.specific = args[++i];
    } else if (args[i] === '--limit' && args[i + 1]) {
      options.limit = parseInt(args[++i], 10);
    } else if (args[i] === '--help') {
      console.log(`
Mixamo Animation Downloader

Usage: node download-mixamo.js [options]

Options:
  --email <email>       Adobe account email
  --password <password> Adobe account password
  --visible             Run browser in visible mode (not headless)
  --animation <name>    Download only a specific animation
  --limit <number>      Maximum animations to download (default: 50)
  --help                Show this help message

Environment Variables:
  MIXAMO_EMAIL          Adobe account email
  MIXAMO_PASSWORD       Adobe account password

Examples:
  node download-mixamo.js --email user@example.com --password secret
  MIXAMO_EMAIL=user@example.com MIXAMO_PASSWORD=secret node download-mixamo.js
  node download-mixamo.js --animation "Hip Hop Dancing" --visible
      `);
      process.exit(0);
    }
  }

  return options;
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete file on error
      reject(err);
    });
  });
}

async function getAnimationProducts(page, bearer, query = '', page_num = 1) {
  const result = await page.evaluate(async (bearer, query, page_num) => {
    const url = new URL('https://www.mixamo.com/api/v1/products');
    url.searchParams.set('page', page_num);
    url.searchParams.set('limit', '96');
    url.searchParams.set('order', '');
    url.searchParams.set('type', 'Motion,MotionPack');
    if (query) url.searchParams.set('query', query);

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${bearer}`,
        'X-Api-Key': 'mixamo2'
      }
    });
    return response.json();
  }, bearer, query, page_num);

  return result;
}

async function getProductDetails(page, bearer, animId, characterId) {
  const result = await page.evaluate(async (bearer, animId, characterId) => {
    const url = `https://www.mixamo.com/api/v1/products/${animId}?character_id=${characterId}&similar=0`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${bearer}`,
        'X-Api-Key': 'mixamo2'
      }
    });
    return response.json();
  }, bearer, animId, characterId);

  return result;
}

async function exportAnimation(page, bearer, characterId, productName, gmsHash) {
  const result = await page.evaluate(async (bearer, characterId, productName, gmsHash) => {
    const response = await fetch('https://www.mixamo.com/api/v1/animations/export', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearer}`,
        'X-Api-Key': 'mixamo2'
      },
      body: JSON.stringify({
        character_id: characterId,
        gms_hash: [{ gms_hash: gmsHash }],
        preferences: {
          format: 'fbx7',
          skin: 'false',
          fps: '30',
          reducekf: '0'
        },
        product_name: productName,
        type: 'Motion'
      })
    });
    return response.json();
  }, bearer, characterId, productName, gmsHash);

  return result;
}

async function monitorExport(page, bearer, characterId, maxWait = 60000) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const result = await page.evaluate(async (bearer, characterId) => {
      const response = await fetch(`https://www.mixamo.com/api/v1/characters/${characterId}/monitor`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${bearer}`,
          'X-Api-Key': 'mixamo2'
        }
      });
      return response.json();
    }, bearer, characterId);

    if (result.status === 'completed' && result.job_result) {
      return result.job_result;
    } else if (result.status === 'failed') {
      throw new Error('Export failed');
    }

    await delay(1000);
  }

  throw new Error('Export timeout');
}

async function downloadAnimation(page, bearer, characterId, animation, downloadDir) {
  const { name, mixamoName } = animation;
  console.log(`\n📥 Downloading: ${mixamoName} (${name})`);

  try {
    // Search for the animation
    const products = await getAnimationProducts(page, bearer, mixamoName);

    if (!products.results || products.results.length === 0) {
      console.log(`⚠️  Animation not found: ${mixamoName}`);
      return false;
    }

    // Find the best match
    const product = products.results.find(p =>
      p.description.toLowerCase().includes(mixamoName.toLowerCase()) ||
      mixamoName.toLowerCase().includes(p.description.toLowerCase())
    ) || products.results[0];

    console.log(`   Found: ${product.description} (ID: ${product.id})`);

    // Get product details including GMS hash
    const details = await getProductDetails(page, bearer, product.id, characterId);

    if (!details.details || !details.details.gms_hash) {
      console.log(`⚠️  No GMS hash for: ${mixamoName}`);
      return false;
    }

    // Export the animation
    await exportAnimation(page, bearer, characterId, product.description, details.details.gms_hash);

    // Wait for export to complete
    const result = await monitorExport(page, bearer, characterId);

    // Download the file
    const outputPath = path.join(downloadDir, `${name}.fbx`);
    await downloadFile(result, outputPath);

    console.log(`✅ Downloaded: ${name}.fbx`);
    return true;

  } catch (error) {
    console.error(`❌ Error downloading ${name}: ${error.message}`);
    return false;
  }
}

async function main() {
  const options = parseArgs();

  if (!options.email || !options.password) {
    console.error('Error: Adobe account credentials required.');
    console.error('Use --email and --password options, or set MIXAMO_EMAIL and MIXAMO_PASSWORD environment variables.');
    console.error('Run with --help for more information.');
    process.exit(1);
  }

  // Ensure download directory exists
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }

  console.log('🚀 Starting Mixamo Animation Downloader');
  console.log(`📁 Download directory: ${DOWNLOAD_DIR}`);
  console.log(`📝 Animations to download: ${Math.min(animationList.animations.length, options.limit)}`);

  const browser = await puppeteer.launch({
    headless: options.headless ? 'new' : false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });

  try {
    const page = await browser.newPage();

    // Go to Mixamo
    console.log('\n🌐 Navigating to Mixamo...');
    await page.goto(MIXAMO_URL, { waitUntil: 'networkidle2' });
    await delay(2000);

    // Click Sign In
    console.log('🔐 Signing in...');
    await page.waitForSelector('a[href*="signin"], button', { timeout: 10000 });
    const signInBtn = await page.$$eval('a, button', elements => {
      const btn = elements.find(el => el.textContent.includes('Sign In') || el.textContent.includes('Log In'));
      if (btn) btn.click();
      return !!btn;
    });

    if (signInBtn) {
      await delay(3000);
    }

    // Handle Adobe login
    try {
      // Wait for email input
      await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
      await page.type('input[type="email"], input[name="email"]', options.email);

      // Click continue
      const continueBtn = await page.$('button[type="submit"], button[data-id="EmailPage-ContinueButton"]');
      if (continueBtn) await continueBtn.click();
      await delay(2000);

      // Enter password
      await page.waitForSelector('input[type="password"]', { timeout: 10000 });
      await page.type('input[type="password"]', options.password);

      // Click sign in
      const loginBtn = await page.$('button[type="submit"], button[data-id="PasswordPage-ContinueButton"]');
      if (loginBtn) await loginBtn.click();
      await delay(5000);
    } catch (e) {
      console.log('Login form handling:', e.message);
    }

    // Wait for Mixamo to fully load after login
    console.log('⏳ Waiting for Mixamo to load...');
    await page.waitForFunction(() => {
      return window.localStorage && window.localStorage.access_token;
    }, { timeout: 60000 });

    // Get the bearer token
    const bearer = await page.evaluate(() => localStorage.access_token);

    if (!bearer) {
      throw new Error('Failed to get authentication token');
    }

    console.log('✅ Signed in successfully');

    // Select/verify character
    const characterId = DEFAULT_CHARACTER_ID;
    console.log(`🎭 Using character ID: ${characterId}`);

    // Download animations
    const animations = options.specific
      ? animationList.animations.filter(a => a.name === options.specific || a.mixamoName === options.specific)
      : animationList.animations.slice(0, options.limit);

    let successful = 0;
    let failed = 0;

    for (const animation of animations) {
      const result = await downloadAnimation(page, bearer, characterId, animation, DOWNLOAD_DIR);
      if (result) {
        successful++;
      } else {
        failed++;
      }

      // Delay between downloads to avoid rate limiting
      await delay(2000);
    }

    console.log('\n📊 Download Summary:');
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📁 Files saved to: ${DOWNLOAD_DIR}`);

    if (successful > 0) {
      console.log('\n📝 Next step: Convert FBX files to VRMA format:');
      console.log('   node scripts/convert-to-vrma.js');
    }

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await browser.close();
  }
}

main();
