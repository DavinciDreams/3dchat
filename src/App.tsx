import React, { useEffect, Suspense, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Volume2, VolumeX, LogOut, User, Mic, Sparkles, Gauge } from 'lucide-react';
import { initSpeechRecognition } from './services/speechService';
import { useChatStore } from './store/chatStore';
import { supabase } from './lib/supabaseClient';
import type { AppError } from './types';
import { AVAILABLE_VRM_MODELS, AVAILABLE_VOICES, AVAILABLE_ANIMATIONS } from './types';
import { TypeaheadSelect, SelectOption } from './components/TypeaheadSelect';

type ChatPosition = 'right' | 'bottom';

// Use lazy loading for performance optimization
const ChatInterface = React.lazy(() => import('./components/ChatInterface'));
const AvatarModel = React.lazy(() => import('./components/AvatarModel'));
const LoginForm = React.lazy(() => import('./components/LoginForm'));

function App() {
  const [error, setError] = useState<AppError | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const { setProcessing, isMuted, setIsMuted, selectedModelId, setSelectedModelId, selectedVoiceId, setSelectedVoiceId, setCurrentAnimation, animationSpeed, setAnimationSpeed } = useChatStore();

  // Track chat position and collapsed state for layout calculations
  const [chatPosition, setChatPosition] = useState<ChatPosition>(() => {
    const saved = localStorage.getItem('chatPosition');
    return (saved as ChatPosition) || 'right';
  });
  const [chatCollapsed, setChatCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('chatCollapsed');
    return saved === 'true';
  });

  // Listen for chat position/collapsed changes from localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const pos = localStorage.getItem('chatPosition') as ChatPosition;
      const collapsed = localStorage.getItem('chatCollapsed') === 'true';
      // Only update state if values actually changed to prevent unnecessary re-renders
      if (pos && pos !== chatPosition) setChatPosition(pos);
      if (collapsed !== chatCollapsed) setChatCollapsed(collapsed);
    };

    // Poll for changes since storage events don't fire in same window
    const interval = setInterval(handleStorageChange, 100);
    return () => clearInterval(interval);
  }, [chatPosition, chatCollapsed]);

  // Transform models to SelectOption format
  const modelOptions: SelectOption[] = useMemo(() =>
    AVAILABLE_VRM_MODELS.map(model => ({
      id: model.id,
      label: model.name,
      description: 'VRM Character',
      group: 'Characters',
    })), []
  );

  // Transform voices to SelectOption format with grouping
  const voiceOptions: SelectOption[] = useMemo(() =>
    AVAILABLE_VOICES.map(voice => {
      const langMap: Record<string, string> = {
        'en-US': 'US English',
        'en-GB': 'UK English',
        'en-AU': 'Australian',
        'en-IE': 'Irish',
        'en-IN': 'Indian',
      };
      return {
        id: voice.id,
        label: voice.displayName,
        description: voice.gender === 'female' ? '♀ Female' : '♂ Male',
        group: langMap[voice.language] || voice.language,
      };
    }), []
  );

  // Transform animations to SelectOption format
  const animationOptions: SelectOption[] = useMemo(() =>
    AVAILABLE_ANIMATIONS.map(anim => ({
      id: anim,
      label: anim.charAt(0).toUpperCase() + anim.slice(1).replace(/([A-Z])/g, ' $1'),
      description: 'Play animation',
    })), []
  );

  // Transform speed options to SelectOption format
  const speedOptions: SelectOption[] = useMemo(() => [
    { id: '0.5', label: '0.5x', description: 'Slow motion' },
    { id: '0.75', label: '0.75x', description: 'Slower' },
    { id: '1.0', label: '1.0x', description: 'Normal speed' },
    { id: '1.25', label: '1.25x', description: 'Faster' },
    { id: '1.5', label: '1.5x', description: 'Fast' },
    { id: '2.0', label: '2.0x', description: 'Very fast' },
  ], []);

  // Trigger loading state when model changes
  useEffect(() => {
    setIsModelLoading(true);
    const timer = setTimeout(() => {
      setIsModelLoading(false);
    }, 1000); // Show loading for 1 second
    return () => clearTimeout(timer);
  }, [selectedModelId]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Initialize speech recognition on component mount
  // Speech recognition initialization moved to user-triggered action (mic button click)
  // to ensure permission request is within a user gesture context

  useEffect(() => {
    // Initialize voices
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Some browsers need a kick to load voices
      speechSynthesis.addEventListener('voiceschanged', () => {
        const voices = speechSynthesis.getVoices();
        console.log('Available voices:', voices.map(v => v.name));
      });
    }
  }, []);

  const handleVolumeToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Calculate avatar pane dimensions based on chat position and collapsed state
  const getAvatarPaneClasses = () => {
    const baseClasses = 'relative transition-all duration-300 ease-in-out';

    if (chatPosition === 'right') {
      // Chat on right: avatar takes full height, reduced width
      const width = chatCollapsed ? 'calc(100% - 48px)' : 'calc(100% - 384px)';
      return { className: baseClasses, style: { width, height: '100%' } };
    } else {
      // Chat on bottom: avatar takes full width, reduced height
      const height = chatCollapsed ? 'calc(100% - 48px)' : 'calc(100% - 50vh)';
      return { className: baseClasses, style: { width: '100%', height } };
    }
  };

  const avatarPaneProps = getAvatarPaneClasses();

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-gray-900 to-gray-800 text-white overflow-hidden">
      {/* Model loading indicator */}
      <AnimatePresence>
        {isModelLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Brain size={40} className="text-teal-500" />
              </motion.div>
              <p className="mt-4 text-white">Loading model...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading fallback */}
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Brain size={40} className="text-teal-500" />
          </motion.div>
        </div>
      }>
        {/* Header - fixed height */}
        <header className="h-16 shrink-0 px-4 flex justify-between items-center z-30 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3"
          >
            <Brain className="h-6 w-6 text-teal-500" />
            <h1 className="text-xl font-bold hidden sm:block">AI Assistant</h1>

            {/* Character Selection */}
            <TypeaheadSelect
              options={modelOptions}
              value={selectedModelId}
              onChange={(id) => {
                console.log('🎭 [App.tsx] Model changed from', selectedModelId, 'to', id);
                setSelectedModelId(id);
              }}
              label="Character"
              icon={<User className="h-4 w-4" />}
            />

            {/* Voice Selection */}
            <TypeaheadSelect
              options={voiceOptions}
              value={selectedVoiceId}
              onChange={(id) => {
                console.log('🎤 [App.tsx] Voice changed from', selectedVoiceId, 'to', id);
                setSelectedVoiceId(id);
              }}
              label="Voice"
              icon={<Mic className="h-4 w-4" />}
            />

            {/* Animation Trigger */}
            <TypeaheadSelect
              options={animationOptions}
              value=""
              onChange={(id) => {
                console.log('✨ [App.tsx] Playing animation:', id);
                setCurrentAnimation(id);
              }}
              placeholder="Play animation..."
              label="Animate"
              icon={<Sparkles className="h-4 w-4" />}
            />

            {/* Animation Speed */}
            <TypeaheadSelect
              options={speedOptions}
              value={String(animationSpeed)}
              onChange={(id) => setAnimationSpeed(parseFloat(id))}
              label="Speed"
              icon={<Gauge className="h-4 w-4" />}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex gap-2"
          >
            <button
              onClick={handleVolumeToggle}
              className="p-2 bg-gray-800 rounded-full text-white/80 hover:text-white hover:bg-gray-700 transition-all"
              title={isMuted ? "Unmute" : "Mute"}
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="p-2 bg-gray-800 rounded-full text-white/80 hover:text-white hover:bg-gray-700 transition-all"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            )}
          </motion.div>
        </header>

        {/* Error Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-20 left-0 right-0 flex justify-center z-40"
            >
              <div className="bg-red-500/90 text-white px-4 py-2 rounded-md shadow-lg">
                {error.message}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area - takes remaining height */}
        <main className="flex-1 relative overflow-hidden">
          {!isAuthenticated ? (
            <div className="h-full flex items-center justify-center">
              <LoginForm onSuccess={() => setIsAuthenticated(true)} />
            </div>
          ) : (
            <>
              {/* Avatar Pane - dedicated space that adjusts for chat position */}
              <div
                className={avatarPaneProps.className}
                style={avatarPaneProps.style}
              >
                <AvatarModel />
                {/* Subtle gradient overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/30 to-transparent pointer-events-none" />
              </div>

              {/* Chat Interface - uses fixed positioning to overlay */}
              <ChatInterface />
            </>
          )}
        </main>
      </Suspense>
    </div>
  );
}

export default App;