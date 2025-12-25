import React, { useEffect, Suspense, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Volume2, VolumeX, LogOut } from 'lucide-react';
import { initSpeechRecognition } from './services/speechService';
import { useChatStore } from './store/chatStore';
import { supabase } from './lib/supabaseClient';
import type { AppError } from './types';

// Use lazy loading for performance optimization
const ChatInterface = React.lazy(() => import('./components/ChatInterface'));
const AvatarModel = React.lazy(() => import('./components/AvatarModel'));
const LoginForm = React.lazy(() => import('./components/LoginForm'));

function App() {
  const [error, setError] = useState<AppError | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { setProcessing, isMuted, setIsMuted } = useChatStore();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Initialize speech recognition on component mount
  useEffect(() => {
    const initSpeech = async () => {
      try {
        setProcessing(true);
        await initSpeechRecognition();
      } catch (err) {
        console.error('Failed to initialize speech recognition:', err);
        setError({
          type: 'auth',
          message: 'Failed to initialize speech recognition'
        });
      } finally {
        setProcessing(false);
      }
    };

    initSpeech();

    return () => {
      setProcessing(false);
    };
  }, [setProcessing]);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white relative overflow-hidden">
      {/* Loading fallback */}
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Brain size={40} className="text-teal-500" />
          </motion.div>
        </div>
      }>
        {/* 3D Avatar Area */}
        <AvatarModel />
        
        {/* Overlay with gradient for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none" />
        
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center"
          >
            <Brain className="h-6 w-6 text-teal-500 mr-2" />
            <h1 className="text-xl font-bold">AI Assistant</h1>
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
              className="absolute top-20 left-0 right-0 flex justify-center z-20"
            >
              <div className="bg-red-500/90 text-white px-4 py-2 rounded-md shadow-lg">
                {error.message}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          {!isAuthenticated ? (
            <LoginForm onSuccess={() => setIsAuthenticated(true)} />
          ) : (
            <ChatInterface />
          )}
        </div>
      </Suspense>
    </div>
  );
}

export default App;