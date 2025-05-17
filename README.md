# 3D AI Chat Application

A real-time 3D AI chat application with voice capabilities, lip sync animation, and a responsive interface.

## Features

- 3D character visualization with Three.js
- Real-time chat interface with message history
- Voice input using Web Speech API
- Text-to-speech output using Microsoft Edge TTS
- AI responses via OpenRouter API
- Viseme-based lip sync for natural character animation
- Responsive design for all devices

## Technical Stack

- React with TypeScript
- Three.js with React Three Fiber
- Framer Motion for animations
- Tailwind CSS for styling
- Zustand for state management

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with your API keys:
   ```
   VITE_OPENROUTER_API_KEY=your_openrouter_api_key
   VITE_EDGE_TTS_API_KEY=your_edge_tts_api_key
   ```
4. Start the development server:
   ```
   npm run dev
   ```

## API Integration

This application uses the following external APIs:

1. **OpenRouter API** for AI responses
   - Sign up at [OpenRouter](https://openrouter.ai/)
   - Get your API key from the dashboard
   - Implement rate limiting according to your plan

2. **Microsoft Edge TTS** for voice output
   - Sign up for Azure Cognitive Services
   - Get your API key from the Azure portal
   - Implement SSML for better voice control

## 3D Model Setup

1. Place your GLB/GLTF model in the `public` folder
2. Update the `MODEL_PATH` constant in `AvatarModel.tsx`
3. Ensure your model has the following:
   - Blendshapes/morph targets for visemes (A, B, C, etc.)
   - Facial expressions for different emotions
   - Skeleton for idle animations

## Performance Optimization

- 3D assets are lazy-loaded
- Model textures should be compressed
- The application implements conversation memory with a 10-message context window

## Browser Compatibility

- WebGL support required for 3D rendering
- Web Speech API support required for voice input
- Modern browser recommended (Chrome, Edge, Firefox)

## Known Limitations

- Web Speech API has varying support across browsers
- Voice input may require HTTPS in production
- 3D rendering performance depends on device capabilities