# 3D AI Chat Application

A real-time 3D AI chat application featuring animated VRM avatars with voice capabilities, lip sync animation, and VRMA gesture animations.

## Features

- **3D Avatar System** - Multiple VRM character models (Billy, Glenda, Mega, Peach) with interactive camera controls
- **Real-time Chat** - AI-powered chat interface with 10-message conversation memory
- **Voice Input** - Speech recognition using Web Speech API
- **Text-to-Speech** - Natural voice output via Edge TTS with multiple voice options (Libby, Jenny, Ryan, Guy)
- **Lip Sync Animation** - Phoneme-to-viseme mapping for realistic lip movements
- **VRMA Animations** - Motion capture animations (greeting, peace, pose, etc.)
- **Emotion System** - Avatar expressions that change based on conversation (neutral, happy, thinking, sad)
- **Text Preprocessing** - Smart text processing for emphasis, emoji gestures, and link detection
- **Authentication** - User login/signup via Supabase
- **Responsive Design** - Works on desktop and mobile devices

## Branding

The application features a cohesive branding identity with a brain icon motif and teal color scheme:

- **Custom Favicon** - Brain icon available in SVG and PNG formats (192×192px, 512×512px)
- **Social Preview** - Optimized Open Graph and Twitter Card images for sharing
- **Theme Color** - Teal-500 (#14b8a6) as the primary brand color
- **Apple Touch Icon** - Dedicated icon for iOS home screen bookmarks

For detailed information about branding assets, color scheme, and how to regenerate favicons, see [`docs/BRANDING.md`](docs/BRANDING.md).

## Technical Stack

- **React 18** with TypeScript
- **Three.js** with React Three Fiber and @react-three/drei
- **@pixiv/three-vrm** for VRM model loading and animation
- **Framer Motion** for UI animations
- **Tailwind CSS 4** for styling
- **Zustand** for state management
- **Supabase** for authentication
- **Vite** for build tooling

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your configuration:
   ```bash
   VITE_OPENROUTER_MODEL=openrouter/free  # optional, for the OpenRouter provider
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Configure server-side provider credentials below. Use `vercel dev` when testing
   model requests locally; the Vite-only development server does not run API functions.
   Start the UI development server:
   ```bash
   npm run dev
   ```
   Server runs at http://localhost:3000

5. Build for production:
   ```bash
   npm run build
   ```

## API Integration

### OpenRouter API

The browser sends dialogue and animation requests through `/api/openrouter`.
For Z.ai GLM-5.3-Flash, configure these **server-side Vercel environment variables**:

```env
LLM_PROVIDER=zai
ZAI_API_KEY=your_zai_coding_api_key
ZAI_MODEL=glm-5.3-flash
```

This uses `https://api.z.ai/api/coding/paas/v4/chat/completions` for both dialogue
and animation selection. The proxy selects the GLM model even for cached clients,
adapts animation tool calls to Z.ai's format, and streams only the model's dialogue
to the chat. Never use a `VITE_` prefix for provider API keys.

To use OpenRouter instead, set `LLM_PROVIDER=openrouter` and
`OPENROUTER_API_KEY` on the server. The client model variables are optional and
default to `openrouter/free` so a retired individual free model is not required.

- Sign up at [OpenRouter](https://openrouter.ai/)
- Get your API key from the dashboard
- Free tier available with usage limits
- Default model: OpenRouter's free-model router

### Edge TTS
- Uses `edge-tts-universal` package
- No API key required
- Accesses Microsoft Edge TTS service directly

### ElevenLabs voices

Add `ELEVENLABS_API_KEY` as a **sensitive server-side variable** in the Vercel
project's Preview and Production environments, then redeploy. The key needs Text
to Speech access and Voices read permission. Never prefix this key with `VITE_`
or put it in chat, source code, or a browser setting.

Signed-in users will see their account's first 100 voices in the existing Voice
dropdown, grouped under ElevenLabs. Choose a voice there; the choice survives
reloads. Existing browser voices remain available. Optional server settings:

```env
ELEVENLABS_MODEL_ID=eleven_flash_v2_5
ELEVENLABS_VOICE_ID=your_preferred_voice_id
```

The preferred voice is used if a saved ElevenLabs selection becomes unavailable.
`/api/elevenlabs` verifies the Supabase session before listing voices or generating
audio. Chat text is buffered into sentences and played sequentially; Stop and
mute cancel synthesis and playback. Without a key, existing speech is unchanged.
Standard and library/custom voices are labeled in the picker. If a voice requires
a paid plan or credits, the app explains this instead of silently switching voices.
Use `vercel dev` to run the API route locally.

### Supabase
- Create a project at [Supabase](https://supabase.com/)
- Set up email/password authentication
- Get your project URL and anonymous key

## VRM Model Setup

### VRoid lip-sync test characters

The Character picker includes **Goldie** (VRM 1.0, by lisa) and **Red Peach**
(VRM 0.x, by lisa watts), shared by their author for this app. Their original VRM
metadata is preserved; in-app credits link to the source models:

- [Goldie](https://3d.flobots.xyz/model/6a212bd6cf0cffae65faf4a6)
- [Red Peach](https://3d.flobots.xyz/model/6a212b9290ef2a93f06a2a59)

Select a character and an ElevenLabs voice, then send a short spoken reply to
check the mouth shapes. Text-derived visemes are fitted to each decoded audio
segment's duration and sampled against the audio clock. This is approximate
lip sync, not calibrated audio phoneme recognition. Silence, Stop, and mute close
the mouth, and changing characters clears the previous model's mouth weights.
Browser-native speech does not expose decoded audio to this playback path.

VRM models are located in `public/model/`. The application includes:
- Billy.vrm
- Glenda.vrm
- Mega.vrm
- peach.vrm

Models should have:
- Viseme blend shapes (sil, PP, FF, TH, DD, kk, CH, SS, nn, RR, aa, E, ih, oh, ou)
- Expression blend shapes for emotions
- Humanoid skeleton for animations

VRMA animations are in `public/animations/vrma/`.

## Adding More Animations

This project supports 50+ animations from Mixamo. To add new animations:

1. **Automated Download** (requires Adobe account):
   ```bash
   node scripts/download-mixamo.js --email your@email.com --password secret
   node scripts/convert-to-vrma.js
   ```

2. **Manual Download**:
   - Go to [mixamo.com](https://www.mixamo.com)
   - Download animations as FBX (Without Skin)
   - Save to `animations-raw/`
   - Run `node scripts/convert-to-vrma.js`

See `scripts/README.md` for detailed instructions.

## Project Structure

```
src/
├── components/
│   ├── App.tsx              # Main application
│   ├── ChatInterface.tsx    # Chat UI
│   ├── AvatarModel.tsx      # 3D character rendering
│   └── LoginForm.tsx        # Authentication
├── services/
│   ├── aiService.ts         # OpenRouter API
│   ├── speechService.ts     # Web Speech Recognition
│   ├── speechSynthesisService.ts  # Edge TTS
│   ├── visemePreprocessor.ts      # Phoneme to viseme
│   ├── visemeApplicationService.ts # Apply visemes to model
│   └── vrmaAnimationService.ts    # VRMA animation loading
├── store/
│   └── chatStore.ts         # Zustand state management
└── types/
    └── index.ts             # TypeScript definitions
```

## Browser Compatibility

**Required:**
- WebGL support for 3D rendering
- Web Speech API for voice input (best in Chrome/Edge)
- Modern browser (ES2020+)
- HTTPS in production (required for microphone access)

**Tested browsers:** Chrome, Edge, Safari, Firefox (with limitations)

## Known Limitations

- Web Speech API has varying support across browsers
- Voice input requires HTTPS in production
- 3D rendering performance depends on device GPU capabilities
- Speech recognition currently limited to en-US
