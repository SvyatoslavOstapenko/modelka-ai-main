'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Wand2, Image as ImageIcon, Zap } from 'lucide-react';

interface GenerationLoadingStateProps {
  progress: number;
}

const loadingMessages = [
  { min: 0, max: 20, text: 'Анализируем ваше фото...', icon: ImageIcon },
  { min: 20, max: 40, text: 'Подбираем идеальный образ...', icon: Sparkles },
  { min: 40, max: 60, text: 'Создаем композицию...', icon: Wand2 },
  { min: 60, max: 80, text: 'Добавляем детали...', icon: Sparkles },
  { min: 80, max: 100, text: 'Финальные штрихи...', icon: Zap },
];

// Static particles configuration generated once at module load time
const particlesConfig = Array.from({ length: 6 }, (_, i) => {
  // Use deterministic pseudo-random values based on index for consistency
  const seed = i * 137.5; // Golden angle approximation for better distribution
  const randomX1 = Math.sin(seed) * 200;
  const randomY1 = Math.cos(seed) * 200;
  const randomX2 = Math.sin(seed + 1.5) * 200;
  const randomY2 = Math.cos(seed + 1.5) * 200;

  return {
    id: i,
    initialX: randomX1,
    initialY: randomY1,
    animateX: randomX2,
    animateY: randomY2,
    duration: 3 + (i % 3) * 0.7,
    delay: i * 0.5,
  };
});

export function GenerationLoadingState({ progress }: GenerationLoadingStateProps) {
  const currentMessage = loadingMessages.find(
    (msg) => progress >= msg.min && progress < msg.max
  ) || loadingMessages[loadingMessages.length - 1];

  const IconComponent = currentMessage.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center justify-center p-8 space-y-8"
    >
      {/* Animated Circle Progress */}
      <div className="relative w-32 h-32">
        {/* Background Circle */}
        <svg className="w-32 h-32 transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress Circle */}
          <motion.circle
            cx="64"
            cy="64"
            r="56"
            stroke="url(#gradient)"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            initial={{ strokeDashoffset: 352 }}
            animate={{ strokeDashoffset: 352 - (352 * progress) / 100 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            style={{
              strokeDasharray: 352,
            }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="50%" stopColor="#EC4899" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            key={currentMessage.text}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <IconComponent className="w-8 h-8 text-primary mb-1" />
          </motion.div>
          <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-amber-600 bg-clip-text text-transparent">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Animated Message */}
      <motion.div
        key={currentMessage.text}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-3"
      >
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          Создаем магию...
        </h3>
        <p className="text-base text-gray-600 dark:text-gray-400 max-w-md">
          {currentMessage.text}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Это займет примерно 15-20 секунд
        </p>
      </motion.div>

      {/* Floating Particles Animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particlesConfig.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
            initial={{
              x: particle.initialX,
              y: particle.initialY,
              opacity: 0,
            }}
            animate={{
              x: particle.animateX,
              y: particle.animateY,
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
            }}
          />
        ))}
      </div>

      {/* Progress Bar (Alternative/Additional) */}
      <div className="w-full max-w-md">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-600 via-pink-600 to-amber-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>
    </motion.div>
  );
}
