import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, PauseCircle } from 'lucide-react';

interface AnimationIndicatorProps {
  currentAnimation: string | null;
  isSpeaking?: boolean;
}

/**
 * AnimationIndicator Component
 * 
 * Displays the currently playing animation with visual cues.
 * Positioned below the chat interface to provide clear feedback
 * about what animation the avatar is performing.
 */
const AnimationIndicator: React.FC<AnimationIndicatorProps> = ({
  currentAnimation,
  isSpeaking = false
}) => {
  // Format animation name for display (camelCase to readable text)
  const formatAnimationName = (name: string): string => {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  // Get display text
  const displayText = currentAnimation
    ? formatAnimationName(currentAnimation)
    : 'Idle';

  // Determine if animation is active
  const isActive = currentAnimation !== null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border-t border-gray-700/50">
      {/* Status Icon */}
      <motion.div
        animate={{
          scale: isActive ? [1, 1.1, 1] : 1,
          opacity: isActive ? 1 : 0.5
        }}
        transition={{
          duration: 1.5,
          repeat: isActive ? Infinity : 0,
          ease: "easeInOut"
        }}
        className="flex-shrink-0"
      >
        {isActive ? (
          <Activity
            size={16}
            className={`${
              isSpeaking ? 'text-teal-400' : 'text-purple-400'
            }`}
          />
        ) : (
          <PauseCircle size={16} className="text-gray-500" />
        )}
      </motion.div>

      {/* Animation Name */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={displayText}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2"
          >
            <span className="text-xs text-gray-400 font-medium">
              Animation:
            </span>
            <span
              className={`text-xs font-semibold truncate ${
                isActive
                  ? isSpeaking
                    ? 'text-teal-400'
                    : 'text-purple-400'
                  : 'text-gray-500'
              }`}
            >
              {displayText}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Active Indicator Dot */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="flex-shrink-0"
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.5, 1]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className={`w-2 h-2 rounded-full ${
                isSpeaking ? 'bg-teal-400' : 'bg-purple-400'
              }`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnimationIndicator;
