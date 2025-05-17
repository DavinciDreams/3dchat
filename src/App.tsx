import React, { useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Brain, Volume2 } from 'lucide-react';
import { initSpeechRecognition } from './services/speechService';

// Use lazy loading for performance optimization
const ChatInterface = React.lazy(() => import('./components/ChatInterface'));
const AvatarModel = React.lazy(() => import('./components/AvatarModel'));

function App() {
  // Initialize speech recognition on component mount
  useEffect(() => {
    initSpeechRecognition();
  }, []);

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
              className="p-2 bg-gray-800/50 rounded-full text-white/80 hover:text-white hover:bg-gray-700/50 transition-all"
              title="Volume"
            >
              <Volume2 className="h-5 w-5" />
            </button>
          </motion.div>
        </header>
        
        {/* Chat Interface */}
        <ChatInterface />
      </Suspense>
    </div>
  );
}

export default App;