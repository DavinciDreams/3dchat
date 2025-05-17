import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../store/chatStore';
import { getAIResponse } from '../services/aiService';
import { startListening, stopListening } from '../services/speechService';
import { ChatMessageProps, Message, ServiceError } from '../types';

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => (
  <div className={`mb-4 ${message.role === 'user' ? 'text-right' : ''}`}>
    <div 
      className={`inline-block px-4 py-2 rounded-lg max-w-[80%] ${
        message.role === 'user' 
          ? 'bg-teal-500 text-white rounded-tr-none'
          : 'bg-gray-700 text-white rounded-tl-none'
      }`}
    >
      {message.content}
    </div>
  </div>
);

const ChatInterface: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { 
    messages, 
    isProcessing, 
    isSpeaking, 
    isListening,
    addMessage 
  } = useChatStore();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!input.trim() || isProcessing) return;
    
    try {
      addMessage({
        role: 'user',
        content: input.trim()
      });
      
      setInput('');
      
      const response = await getAIResponse(input);
      if (response) {
        addMessage({
          role: 'assistant',
          content: response.content // assuming AIResponse has a 'content' field of type string
        });
      }
    } catch (error) {
      console.error('Error processing message:', error);
      // Add error handling UI feedback here
    }
  };

  const handleMicToggle = async () => {
    try {
      if (isListening) {
        await stopListening();
      } else {
        await startListening();
      }
    } catch (error) {
      console.error('Error toggling microphone:', error);
      // Add error handling UI feedback here
    }
  };

  // Focus input when listening stops
  useEffect(() => {
    if (!isListening && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isListening]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="absolute bottom-0 left-0 right-0 max-h-[50vh] overflow-hidden flex flex-col px-4 pb-4 z-10">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-md rounded-t-xl overflow-hidden border border-white/20 shadow-lg"
      >
        {/* Messages */}
        <div className="h-[30vh] overflow-y-auto py-4 px-6 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
          <AnimatePresence>
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full items-center justify-center text-white/70 text-center px-4"
              >
                <p>Ask me anything! I'm a 3D AI assistant ready to help you.</p>
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
        
        {/* Input form */}
        <form 
          onSubmit={handleSubmit}
          className="flex items-center p-3 border-t border-white/10 bg-white/5"
        >
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={handleMicToggle}
            disabled={isProcessing}
            className={`p-2 rounded-full mr-2 transition-colors ${
              isListening 
                ? 'bg-red-500 text-white' 
                : 'bg-gray-700 text-white hover:bg-gray-600'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isListening ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </motion.button>
          
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing || isListening}
            placeholder={isListening ? "Listening..." : "Type your message..."}
            className="flex-1 bg-transparent border border-white/20 rounded-md px-4 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-teal-500/50 disabled:opacity-50"
          />
          
          <motion.button
            type="submit"
            whileTap={{ scale: 0.9 }}
            disabled={!input.trim() || isProcessing}
            className={`p-2 rounded-full ml-2 bg-teal-500 text-white transition-opacity hover:bg-teal-400 ${
              !input.trim() || isProcessing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </motion.button>
        </form>
      </motion.div>
      
      {/* Processing indicators */}
      <AnimatePresence>
        {(isProcessing || isSpeaking) && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-0 right-0 flex justify-center"
          >
            <div className="bg-black/40 text-white text-sm px-3 py-1 rounded-b-md">
              {isProcessing ? 'Thinking...' : 'Speaking...'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatInterface;