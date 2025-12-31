import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Loader2, Copy, Download, StopCircle, Plus, Play, ChevronDown, ChevronRight, PanelRight, PanelBottom, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore, MAX_MESSAGES } from '../store/chatStore';
import { getAIResponse } from '../services/aiService';
import { startListening, stopListening } from '../services/speechService';
import { judgeAnimations, processAnimationQueue } from '../services/animationJudgeService';
import { textToSpeech, playAudio } from '../services/speechSynthesisService';
import { supabase } from '../lib/supabaseClient';
import AnimationIndicator from './AnimationIndicator';
import {
  ChatMessageProps,
  ServiceError,
  AVAILABLE_ANIMATIONS
} from '../types';

type ChatPosition = 'right' | 'bottom';

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(message.content);
  };

  const downloadText = () => {
    const blob = new Blob([message.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-message-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`mb-4 ${message.role === 'user' ? 'text-right' : ''}`}>
      <div className="flex items-start gap-2">
        {message.role === 'assistant' && (
          <div className="flex flex-col gap-1">
            <button
              onClick={copyToClipboard}
              className="p-1 hover:bg-gray-800 rounded"
              title="Copy message"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={downloadText}
              className="p-1 hover:bg-gray-800 rounded"
              title="Download message"
            >
              <Download size={14} />
            </button>
          </div>
        )}
        <div
          className={`inline-block px-4 py-2 rounded-lg max-w-[80%] ${
            message.role === 'user'
              ? 'bg-teal-500 text-white rounded-tr-none'
              : 'bg-gray-800 text-white rounded-tl-none'
          }`}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
};

// Custom hook for mobile detection
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

const ChatInterface = (): JSX.Element => {
  const [input, setInput] = useState<string>('');
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [selectedTestAnimation, setSelectedTestAnimation] = useState<string>('');

  // Position and collapse state
  const [position, setPosition] = useState<ChatPosition>(() => {
    const saved = localStorage.getItem('chatPosition');
    return (saved as ChatPosition) || 'right';
  });
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('chatCollapsed');
    return saved === 'true';
  });

  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    isProcessing,
    isSpeaking,
    isListening,
    addMessage,
    clearMessages,
    setCurrentAnimation,
    setAnimationQueue,
    currentAnimation
  } = useChatStore();

  // Save position preference
  useEffect(() => {
    localStorage.setItem('chatPosition', position);
  }, [position]);

  // Save collapsed preference
  useEffect(() => {
    localStorage.setItem('chatCollapsed', String(isCollapsed));
  }, [isCollapsed]);

  // On mobile, force bottom position
  useEffect(() => {
    if (isMobile && position !== 'bottom') {
      setPosition('bottom');
    }
  }, [isMobile]);

  // Direct animation trigger for testing
  const triggerTestAnimation = (animationName: string) => {
    if (!animationName) return;

    console.log('%c🧪 [TEST] Triggering animation directly: ' + animationName, 'background: #e91e63; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 14px;');

    // Set the animation
    setCurrentAnimation(animationName);
    setAnimationQueue([{ name: animationName, delay: 0 }]);

    // Reset after animation duration
    const durations: Record<string, number> = {
      'spin': 4000,
      'squat': 3000,
      'shoot': 2500,
      'greeting': 3000,
      'peace': 2500,
      'modelPose': 2000,
    };

    const duration = durations[animationName] || 3000;

    setTimeout(() => {
      console.log('%c🧪 [TEST] Animation complete, resetting', 'background: #4caf50; color: white; padding: 4px 8px; border-radius: 4px;');
      setCurrentAnimation(null);
      setAnimationQueue([]);
    }, duration + 500);

    // Reset dropdown
    setSelectedTestAnimation('');
  };

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);

      if (user) {
        const { data, error } = await supabase
          .from('chats')
          .insert([{
            created_at: new Date().toISOString(),
            user_id: user.id
          }])
          .select();

        if (error) {
          console.error('Error creating new chat:', error);
          return;
        }

        if (data && data[0]) {
          setCurrentChatId(data[0].id);
        }
      }
    };

    checkAuth();
  }, []);

  const handleMessage = async (content: string) => {
    if (!isAuthenticated) return;

    console.log('📤 [handleMessage] Processing new message:', content);
    console.log('📤 [handleMessage] Current isSpeaking state:', isSpeaking);

    try {
      const response = await getAIResponse(content);
      if (response) {
        const text = typeof response === 'string' ? response : response.content;

        // Get animation judgment using the judge system
        const animationJudgment = await judgeAnimations(input, text);

        // Log animation judgment result
        console.log('%c🎬 ANIMATION JUDGMENT RESULT (Text)', 'background: #4ecdc4; color: black; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
        console.log('%c🎬 Animations:', 'color: #4ecdc4; font-weight: bold;', animationJudgment.animations);
        console.log('%c🎬 Reasoning:', 'color: #4ecdc4; font-weight: bold;', animationJudgment.reasoning);

        // Add message directly without preprocessing
        useChatStore.setState((state) => ({
          messages: [
            ...state.messages,
            {
              id: crypto.randomUUID(),
              timestamp: Date.now(),
              role: 'assistant' as const,
              content: text
            }
          ].slice(-MAX_MESSAGES),
          isSpeaking: true
        }));

        // Insert message to database
        const dbResult = await Promise.resolve(
          currentChatId ? supabase
            .from('chat_messages')
            .insert([{
              chat_id: currentChatId,
              content: text,
              role: 'assistant'
            }]) : Promise.resolve(null)
        );
        
        // Handle database result
        if (dbResult && 'error' in dbResult && dbResult.error) {
          console.error('Error inserting message to database:', dbResult.error);
        }

        useChatStore.getState().setSpeaking(true);

        // Queue animations to play during speech
        if (animationJudgment.animations.length > 0) {
          console.log('%c🚀 QUEUEING ANIMATIONS (Text)', 'background: #f39c12; color: black; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
          console.log('%c🚀 Animation count:', 'color: #f39c12; font-weight: bold;', animationJudgment.animations.length);

          setAnimationQueue(animationJudgment.animations);

          // Process animation queue
          processAnimationQueue(
            animationJudgment.animations,
            (animationName) => {
              console.log('%c⚡ TRIGGERING ANIMATION: ' + animationName, 'background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 14px;');
              console.log('%c⚡ Calling setCurrentAnimation...', 'color: #e74c3c; font-weight: bold;');
              setCurrentAnimation(animationName);
              console.log('%c⚡ Store currentAnimation is now:', 'color: #e74c3c; font-weight: bold;', useChatStore.getState().currentAnimation);
            },
            () => {
              // Reset to idle when all animations complete
              console.log('%c✅ ANIMATION QUEUE COMPLETE (Text)', 'background: #27ae60; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
              setCurrentAnimation(null);
              setAnimationQueue([]);
              useChatStore.setState({ isSpeaking: false });
            }
          );
        } else {
          console.log('%c⚠️ NO ANIMATIONS TO QUEUE (Text)', 'background: #95a5a6; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
          // Reset speaking state if no animations
          useChatStore.setState({ isSpeaking: false });
        }

        // Use text directly for speech synthesis
        const audioResult = await textToSpeech(text);
        if (audioResult) {
          await playAudio(audioResult.audioBuffer);
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      useChatStore.setState({ isSpeaking: false });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isAuthenticated) {
      alert('Please log in to send messages');
      return;
    }

    const trimmedInput = input.trim();
    if (!trimmedInput || isProcessing) return;

    try {
      if (currentChatId) {
        await supabase
          .from('chat_messages')
          .insert([{
            chat_id: currentChatId,
            content: trimmedInput,
            role: 'user'
          }]);
      }

      addMessage({
        role: 'user',
        content: trimmedInput
      });

      setInput('');

      // Auto-expand when sending a message
      if (isCollapsed) {
        setIsCollapsed(false);
      }

      await handleMessage(trimmedInput);
    } catch (error) {
      console.error('Error processing message:', error);
    }
  };

  const handleNewChat = async () => {
    if (!isAuthenticated) {
      alert('Please log in to start a new chat');
      return;
    }

    clearMessages();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error('No authenticated user found');
      return;
    }

    const { data, error } = await supabase
      .from('chats')
      .insert([{
        created_at: new Date().toISOString(),
        user_id: user.id
      }])
      .select();

    if (error) {
      console.error('Error creating new chat:', error);
      return;
    }

    if (data && data[0]) {
      setCurrentChatId(data[0].id);
    }
  };

  const handleStopSpeaking = () => {
    console.log('🛑 [handleStopSpeaking] Stop speaking button clicked');
    console.log('🛑 [handleStopSpeaking] Current isSpeaking state:', isSpeaking);

    // Reset animation and speaking state
    useChatStore.getState().setCurrentAnimation(null);
    useChatStore.getState().setAnimationQueue([]);
    useChatStore.setState({ isSpeaking: false });
  };

  const handleMicToggle = async () => {
    if (!isAuthenticated) {
      alert('Please log in to use voice input');
      return;
    }

    try {
      if (isListening) {
        await stopListening();
      } else {
        await startListening();
      }
    } catch (error) {
      console.error('Error toggling microphone:', error);
      if ((error as ServiceError)?.type === 'auth') {
        alert('Please allow microphone access to use speech recognition');
      }
    }
  };

  useEffect(() => {
    if (!isListening && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isListening]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const togglePosition = () => {
    setPosition(prev => prev === 'right' ? 'bottom' : 'right');
  };

  const toggleCollapsed = () => {
    setIsCollapsed(prev => !prev);
  };

  // Position-based classes
  // Chat is within the main content area (below header), so use absolute positioning
  const containerClasses = position === 'right'
    ? `absolute top-0 right-0 bottom-0 z-20 flex transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-12' : 'w-96 max-w-[90vw]'
      }`
    : `absolute bottom-0 left-0 right-0 z-20 flex flex-col transition-all duration-300 ease-in-out ${
        isCollapsed ? 'h-12' : 'h-[50vh] max-h-[600px]'
      }`;

  // Collapsed button for when chat is collapsed
  const CollapsedButton = () => (
    <motion.button
      onClick={toggleCollapsed}
      className={`
        flex items-center justify-center gap-2 bg-gray-900/95 backdrop-blur-md border border-gray-700
        text-white hover:bg-gray-800 transition-all duration-300
        ${position === 'right'
          ? 'w-12 h-full rounded-l-xl border-r-0'
          : 'w-full h-12 rounded-t-xl border-b-0'
        }
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <MessageSquare size={20} className="text-teal-400" />
      {position === 'bottom' && (
        <span className="text-sm font-medium">Open Chat</span>
      )}
      {messages.length > 0 && (
        <span className="absolute top-2 right-2 bg-teal-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {messages.length}
        </span>
      )}
    </motion.button>
  );

  if (isCollapsed) {
    return (
      <div className={containerClasses}>
        <CollapsedButton />
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      {/* Collapse handle for right position */}
      {position === 'right' && (
        <button
          onClick={toggleCollapsed}
          className="w-6 h-24 self-center -ml-3 bg-gray-800/90 hover:bg-gray-700 border border-gray-600 rounded-l-lg flex items-center justify-center transition-colors"
          title="Collapse chat"
        >
          <ChevronRight size={16} />
        </button>
      )}

      <motion.div
        initial={{ opacity: 0, x: position === 'right' ? 20 : 0, y: position === 'bottom' ? 20 : 0 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        className={`
          flex-1 bg-gray-900/95 backdrop-blur-md overflow-hidden border border-gray-700 shadow-2xl
          flex flex-col
          ${position === 'right' ? 'rounded-l-xl border-r-0' : 'rounded-t-xl border-b-0'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b border-white/10 bg-gray-800/50">
          <div className="flex items-center gap-2">
            {/* Collapse button for bottom position */}
            {position === 'bottom' && (
              <button
                onClick={toggleCollapsed}
                className="p-1.5 hover:bg-gray-700 rounded-md transition-colors"
                title="Collapse chat"
              >
                <ChevronDown size={18} />
              </button>
            )}

            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-700 transition-colors text-sm"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">New</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            {/* Position toggle - hidden on mobile */}
            {!isMobile && (
              <button
                onClick={togglePosition}
                className="p-1.5 hover:bg-gray-700 rounded-md transition-colors"
                title={`Move to ${position === 'right' ? 'bottom' : 'right'}`}
              >
                {position === 'right' ? <PanelBottom size={16} /> : <PanelRight size={16} />}
              </button>
            )}

            {isSpeaking && (
              <button
                onClick={handleStopSpeaking}
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-700 transition-colors text-red-400 text-sm"
              >
                <StopCircle size={14} />
                <span className="hidden sm:inline">Stop</span>
              </button>
            )}
          </div>
        </div>

        {/* Animation Test - collapsible on mobile */}
        <div className="flex items-center gap-2 px-2 py-1.5 border-b border-white/5 bg-gray-800/30">
          <select
            value={selectedTestAnimation}
            onChange={(e) => setSelectedTestAnimation(e.target.value)}
            className="flex-1 bg-gray-800 text-white text-xs px-2 py-1 rounded border border-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="">Test Animation...</option>
            {AVAILABLE_ANIMATIONS.map((anim) => (
              <option key={anim} value={anim}>
                {anim}
              </option>
            ))}
          </select>
          <button
            onClick={() => triggerTestAnimation(selectedTestAnimation)}
            disabled={!selectedTestAnimation}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              selectedTestAnimation
                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Play size={12} />
          </button>
          {currentAnimation && (
            <span className="text-xs text-green-400 animate-pulse truncate max-w-20">
              {currentAnimation}
            </span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-3 px-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
          <AnimatePresence>
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full items-center justify-center text-white/50 text-center px-4"
              >
                <p className="text-sm">
                  {isAuthenticated
                    ? "Ask me anything!"
                    : "Please log in to chat"}
                </p>
              </motion.div>
            ) : (
              messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <ChatMessage message={message} />
                </motion.div>
              ))
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Animation Indicator */}
        <AnimationIndicator currentAnimation={currentAnimation} isSpeaking={isSpeaking} />

        {/* Input form */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 p-3 border-t border-gray-700 bg-gray-800/50"
        >
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={handleMicToggle}
            disabled={isProcessing || !isAuthenticated}
            className={`p-2 rounded-full transition-colors flex-shrink-0 ${
              isListening
                ? 'bg-red-500 text-white'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            } ${(isProcessing || !isAuthenticated) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isListening ? (
              <Mic className="h-4 w-4" />
            ) : (
              <MicOff className="h-4 w-4" />
            )}
          </motion.button>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing || isListening || !isAuthenticated}
            placeholder={
              !isAuthenticated
                ? "Log in to chat"
                : isListening
                  ? "Listening..."
                  : "Type a message..."
            }
            className="flex-1 min-w-0 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500/50 disabled:opacity-50"
          />

          <motion.button
            type="submit"
            whileTap={{ scale: 0.9 }}
            disabled={!input.trim() || isProcessing || !isAuthenticated}
            className={`p-2 rounded-full bg-teal-500 text-white transition-opacity hover:bg-teal-400 flex-shrink-0 ${
              !input.trim() || isProcessing || !isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </motion.button>
        </form>
      </motion.div>

      {/* Status indicator */}
      <AnimatePresence>
        {(isProcessing || isSpeaking) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`
              absolute bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm
              ${position === 'right' ? 'top-4 left-4' : 'top-2 left-1/2 -translate-x-1/2'}
            `}
          >
            {isProcessing ? 'Thinking...' : 'Speaking...'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatInterface;
