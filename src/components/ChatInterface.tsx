import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useChatStore } from '../store/chatStore';
import { getAIResponse, textToSpeech } from '../services/aiService';
import { startListening, stopListening } from '../services/speechService';

const ChatInterface: React.FC = () => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { 
    messages, 
    isProcessing, 
    isSpeaking, 
    isListening, 
    addMessage 
  } = useChatStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isProcessing) return;
    
    // Add user message
    addMessage({
      role: 'user',
      content: input
    });
    
    setInput('');
    
    // Get AI response
    const response = await getAIResponse(input);
    
    // Add AI response
    addMessage({
      role: 'assistant',
      content: response
    });
    
    // Convert to speech
    await textToSpeech(response);
  };

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="absolute bottom-0 left-0 right-0 max-h-[50vh] overflow-hidden flex flex-col px-4 pb-4 z-10">
      {/* Chat bubble container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-md rounded-t-xl overflow-hidden border border-white/20 shadow-lg"
      >
        {/* Messages */}
        <div className="h-[30vh] overflow-y-auto py-4 px-6 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-white/70 text-center px-4">
              <p>Ask me anything! I'm a 3D AI assistant ready to help you.</p>
            </div>
          ) : (
            messages.map((message) => (
              <div 
                key={message.id}
                className={`mb-4 ${message.role === 'user' ? 'text-right' : ''}`}
              >
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
            ))
          )}
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
            className={`p-2 rounded-full mr-2 ${
              isListening ? 'bg-red-500 text-white' : 'bg-gray-700 text-white'
            }`}
          >
            {isListening ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </motion.button>
          
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing || isListening}
            placeholder={isListening ? "Listening..." : "Type your message..."}
            className="flex-1 bg-transparent border border-white/20 rounded-md px-4 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
          />
          
          <motion.button
            type="submit"
            whileTap={{ scale: 0.9 }}
            disabled={!input.trim() || isProcessing}
            className={`p-2 rounded-full ml-2 bg-teal-500 text-white ${
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
      {(isProcessing || isSpeaking) && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-0 left-0 right-0 flex justify-center"
        >
          <div className="bg-black/40 text-white text-sm px-3 py-1 rounded-b-md">
            {isProcessing ? 'Thinking...' : 'Speaking...'}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ChatInterface;