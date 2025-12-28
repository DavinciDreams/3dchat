# Animation Scripts

Tools for downloading Mixamo animations and converting them to VRMA format for use with VRM avatars.

## Overview

This project uses VRMA (VRM Animation) files for avatar animations. The scripts in this directory help you:

1. **Download** animations from Adobe Mixamo
2. **Convert** FBX files to VRMA format

## Prerequisites

- Node.js 18+
- Adobe account (free, for Mixamo access)
- Puppeteer (installed as dev dependency)

## Quick Start

### 1. Download Animations from Mixamo

```bash
# Using environment variables
export MIXAMO_EMAIL="your-adobe-email@example.com"
export MIXAMO_PASSWORD="your-password"
node scripts/download-mixamo.js

# Or using command line arguments
node scripts/download-mixamo.js --email your@email.com --password secret

# Download specific animation only
node scripts/download-mixamo.js --animation "Hip Hop Dancing" --visible

# Limit number of animations
node scripts/download-mixamo.js --limit 10
```

**Options:**
- `--email`: Adobe account email
- `--password`: Adobe account password
- `--visible`: Run browser in visible mode (for debugging)
- `--animation <name>`: Download only a specific animation
- `--limit <n>`: Maximum animations to download (default: 50)

Downloaded FBX files will be saved to `animations-raw/`.

### 2. Convert FBX to VRMA

After downloading, convert the FBX files to VRMA format:

```bash
node scripts/convert-to-vrma.js
```

This will:
- Convert all FBX files in `animations-raw/`
- Output VRMA files to `public/animations/`
- Print code snippets to add to `vrmaAnimationService.ts`

## Manual Download (Alternative)

If automated download doesn't work, you can manually download from Mixamo:

1. Go to [mixamo.com](https://www.mixamo.com)
2. Sign in with your Adobe account
3. Select any character (or upload the Y-Bot)
4. Search for animations from `animation-list.json`
5. Click Download with settings:
   - Format: **FBX Binary (.fbx)**
   - Skin: **Without Skin**
   - Frames per Second: **30**
6. Save to `animations-raw/` directory
7. Run `node scripts/convert-to-vrma.js`

## File Structure

```
scripts/
├── README.md              # This file
├── animation-list.json    # List of 50 animations to download
├── download-mixamo.js     # Automated Mixamo downloader
└── convert-to-vrma.js     # FBX to VRMA converter

animations-raw/            # Downloaded FBX files (gitignored)
public/animations/         # Converted VRMA files
tools/fbx2vrma-converter/  # FBX2VRMA converter tool
```

## Animation Categories

The `animation-list.json` includes 50+ animations across categories:

| Category | Count | Examples |
|----------|-------|----------|
| Idle & Standing | 7 | idle, breathingIdle, happyIdle |
| Greetings & Social | 9 | waving, bowing, clapping |
| Dance & Celebration | 8 | hipHopDance, victoryDance |
| Gestures & Reactions | 12 | thinking, thumbsUp, facePalm |
| Combat & Action | 8 | punch, kick, magicCast |
| Movement | 8 | walking, running, jumping |

## Troubleshooting

### "Login failed"
- Check your Adobe credentials
- Try running with `--visible` to see the browser
- Adobe may require 2FA - complete it in the visible browser

### "Animation not found"
- Check spelling in `animation-list.json`
- Some animations may have different names on Mixamo
- Use `--visible` and search manually to find correct name

### "FBX2glTF binary not found"
```bash
cd tools/fbx2vrma-converter
./setup.sh  # Downloads the binary
```

### ARM Mac (M1/M2/M3)
The FBX2glTF binary runs via Rosetta. No additional setup needed.

## Licensing

Mixamo animations are free for commercial and non-commercial use when embedded in a final product (not redistributable as raw files).
