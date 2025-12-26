import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Loader2, Copy, Download, StopCircle, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../store/chatStore';
import { getAIResponse } from '../services/aiService';
import { startListening, stopListening } from '../services/speechService';
import { textToSpeech, playAudio } from '../services/speechSynthesisService';
import { preprocessingPipeline } from '../services/textPreprocessing';
import { supabase } from '../lib/supabaseClient';
import { ChatMessageProps, ServiceError, PreprocessedText, Emotion } from '../types';

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

  const store = useChatStore.getState();
  
  // Get processed message if available
  const processedMessage = store.processedMessages.find(
    pm => pm.id === message.id
  );
  
  const contentToRender = processedMessage?.content || message.content;
  const metadata = processedMessage?.metadata;

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
          {renderMessageContent(contentToRender, metadata)}
        </div>
      </div>
    </div>
  );
};

// Helper function to render message content with links
const renderMessageContent = (content: string, metadata?: { links?: Array<{ url: string; displayText: string; startIndex: number; endIndex: number }> }) => {
  if (!metadata || !metadata.links || metadata.links.length === 0) {
    return content;
  }
  
  let lastIndex = 0;
  const parts: React.ReactNode[] = [];
  
  // Sort links by position
  const sortedLinks = [...metadata.links].sort((a, b) => a.startIndex - b.startIndex);
  
  for (const link of sortedLinks) {
    // Add text before the link
    if (link.startIndex > lastIndex) {
      parts.push(content.substring(lastIndex, link.startIndex));
    }
    
    // Add the link
    parts.push(
      <a
        key={`${link.url}-${link.startIndex}`}
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 underline hover:text-blue-700"
      >
        {link.displayText}
      </a>
    );
    
    lastIndex = link.endIndex;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }
  
  return parts;
};

const ChatInterface = (): JSX.Element => {
  const [input, setInput] = useState<string>('');
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { 
    messages, 
    isProcessing, 
    isSpeaking, 
    isListening,
    addMessage,
    clearMessages
  } = useChatStore();

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

    try {
      const response = await getAIResponse(content);
      if (response) {
        const text = typeof response === 'string' ? response : response.content;
        
        // Preprocess the text before sending to TTS
        const processed: PreprocessedText = preprocessingPipeline.process(text);
        
        // Log preprocessing results for debugging
        console.group('📝 Text Preprocessing');
        console.log('🤖 Model Output (original):', text);
        console.log('🎤 Speech Output (cleanText):', processed.cleanText);
        console.log('🖥️  Display Output (displayText):', processed.displayText);
        console.log('📊 Metadata:', processed.metadata);
        if (processed.metadata.emphasis.length > 0) {
          console.log('✨ Emphasis detected:', processed.metadata.emphasis);
        }
        if (processed.metadata.emojis.length > 0) {
          console.log('😀 Emojis detected:', processed.metadata.emojis);
        }
        if (processed.metadata.links.length > 0) {
          console.log('🔗 Links detected:', processed.metadata.links);
        }
        console.groupEnd();
        
        // Store the processed message with metadata
        const processedMessageId = crypto.randomUUID();
        useChatStore.getState().setProcessedMessage({
          id: processedMessageId,
          role: 'assistant',
          content: processed.displayText,
          timestamp: Date.now(),
          metadata: processed.metadata
        });
        
        // Also add to regular messages for backward compatibility
        useChatStore.getState().addMessage({
          role: 'assistant',
          content: processed.displayText
        });
        
        if (currentChatId) {
          await supabase
            .from('chat_messages')
            .insert([{
              chat_id: currentChatId,
              content: processed.displayText,
              role: 'assistant'
            }]);
        }

        useChatStore.getState().setSpeaking(true);
        try {
          // Use cleanText for speech synthesis (no emojis, links, asterisks)
          const audioBuffer = await textToSpeech(processed.cleanText);
          console.log('TTS result received from textToSpeech:', audioBuffer);
          console.log('TTS result keys:', audioBuffer ? Object.keys(audioBuffer) : 'null/undefined');
          if (!audioBuffer) {
            console.warn('TTS returned null or empty audioBuffer');
          } else {
            console.log('TTS audioBuffer.audioBuffer:', audioBuffer.audioBuffer);
            console.log('TTS audioBuffer.audioBuffer type:', typeof audioBuffer.audioBuffer);
            console.log('TTS audioBuffer.audioBuffer byteLength:', audioBuffer.audioBuffer?.byteLength);
            try {
              await playAudio(audioBuffer.audioBuffer);
              console.log('Audio playback finished');
              
              // Trigger gestures from emoji metadata
              if (processed.metadata.emojis.length > 0) {
                const store = useChatStore.getState();
                processed.metadata.emojis.forEach((emojiData) => {
                  if (emojiData.gesture) {
                    // Cast to Emotion type if it's a valid emotion
                    if (['neutral', 'happy', 'thinking', 'sad'].includes(emojiData.gesture)) {
                      store.setEmotion(emojiData.gesture as Emotion);
                    }
                  }
                });
              }
            } catch (playError) {
              console.error('Error during audio playback:', playError);
            }
          }
        } catch (ttsError) {
          console.error('Error during TTS:', ttsError);
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    } finally {
      useChatStore.getState().setSpeaking(false);
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
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    useChatStore.getState().setSpeaking(false);
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

  return (
    <div className="absolute bottom-0 left-0 right-0 max-h-[50vh] overflow-hidden flex flex-col px-4 pb-4 z-10">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/90 backdrop-blur-md rounded-t-xl overflow-hidden border border-gray-700 shadow-lg"
      >
        <div className="flex items-center justify-between p-2 border-b border-white/10">
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-gray-800 transition-colors"
          >
            <Plus size={16} />
            <span>New Chat</span>
          </button>
          {isSpeaking && (
            <button
              onClick={handleStopSpeaking}
              className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-gray-800 transition-colors text-red-400"
            >
              <StopCircle size={16} />
              <span>Stop Speaking</span>
            </button>
          )}
        </div>

        <div className="h-[30vh] overflow-y-auto py-4 px-6 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
          <AnimatePresence>
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full items-center justify-center text-white/70 text-center px-4"
              >
                <p>
                  {isAuthenticated 
                    ? "Ask me anything! I'm a 3D AI assistant ready to help you."
                    : "Please log in to start chatting with the AI assistant."}
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
        
        <form 
          onSubmit={handleSubmit}
          className="flex items-center p-3 border-t border-gray-700 bg-gray-800/50"
        >
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={handleMicToggle}
            disabled={isProcessing || !isAuthenticated}
            className={`p-2 rounded-full mr-2 transition-colors ${
              isListening 
                ? 'bg-red-500 text-white' 
                : 'bg-gray-800 text-white hover:bg-gray-700'
            } ${(isProcessing || !isAuthenticated) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isListening ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
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
                ? "Please log in to chat" 
                : isListening 
                  ? "Listening..." 
                  : "Type your message..."
            }
            className="flex-1 bg-gray-800/90 border border-gray-600 rounded-md px-4 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-teal-500/50 disabled:opacity-50"
          />
          
          <motion.button
            type="submit"
            whileTap={{ scale: 0.9 }}
            disabled={!input.trim() || isProcessing || !isAuthenticated}
            className={`p-2 rounded-full ml-2 bg-teal-500 text-white  transition-opacity hover:bg-teal-400 ${
              !input.trim() || isProcessing || !isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''
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