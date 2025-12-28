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
   VITE_OPENROUTER_API_KEY=your_openrouter_api_key
   VITE_OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free  # optional
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Start the development server:
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
- Sign up at [OpenRouter](https://openrouter.ai/)
- Get your API key from the dashboard
- Free tier available with usage limits
- Default model: Gemini 2.0 Flash (free tier)

### Edge TTS
- Uses `edge-tts-universal` package
- No API key required
- Accesses Microsoft Edge TTS service directly

### Supabase
- Create a project at [Supabase](https://supabase.com/)
- Set up email/password authentication
- Get your project URL and anonymous key

## VRM Model Setup

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