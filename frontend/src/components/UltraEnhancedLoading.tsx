'use client'

import { motion } from 'framer-motion'
import { Cpu, Zap, TrendingUp, DollarSign, Sparkles, Target, Lightbulb } from 'lucide-react'

export default function UltraEnhancedLoading() {
  const particles = Array.from({ length: 30 }, (_, i) => i)
  const icons = [Cpu, Zap, TrendingUp, DollarSign, Sparkles, Target, Lightbulb]

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Animated Background Gradient */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50"
        animate={{
          background: [
            "linear-gradient(135deg, #EBF8FF 0%, #FFFFFF 50%, #F3E8FF 100%)",
            "linear-gradient(135deg, #F3E8FF 0%, #FFFFFF 50%, #EBF8FF 100%)",
            "linear-gradient(135deg, #EBF8FF 0%, #FFFFFF 50%, #F3E8FF 100%)"
          ]
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      {/* Floating Particles */}
      <div className="absolute inset-0">
        {particles.map((i) => {
          // Use deterministic values based on index to avoid hydration mismatch
          const left = ((i * 7) % 100) + (i % 20);
          const top = ((i * 11) % 100) + (i % 15);
          const xOffset = ((i * 13) % 30) - 15;
          const duration = 4 + (i % 3);
          const delay = (i % 3);
          
          return (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"
              style={{
                left: `${left}%`,
                top: `${top}%`,
              }}
              animate={{
                y: [0, -50, 0],
                x: [0, xOffset, 0],
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: duration,
                repeat: Infinity,
                delay: delay,
              }}
            />
          );
        })}
      </div>

      {/* Geometric Shapes */}
      <div className="absolute inset-0">
        {Array.from({ length: 6 }, (_, i) => (
          <motion.div
            key={i}
            className="absolute border-2 border-blue-200 rounded-full opacity-20"
            style={{
              width: `${100 + i * 50}px`,
              height: `${100 + i * 50}px`,
              left: `${20 + i * 10}%`,
              top: `${10 + i * 15}%`,
            }}
            animate={{
              rotate: [0, 360],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* Main Loading Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="text-center">


          {/* Loading Text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mb-8"
          >
            <motion.h2
              className="text-3xl font-bold text-gray-800 mb-3"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              style={{
                background: "linear-gradient(90deg, #1E40AF, #7C3AED, #1E40AF)",
                backgroundSize: "200% 200%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              Loading AI Dashboard
            </motion.h2>
            <motion.p
              className="text-gray-600 text-lg"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Preparing intelligent insights for your business
            </motion.p>
          </motion.div>

          {/* Animated Progress Dots */}
          <motion.div className="flex justify-center space-x-3 mb-10">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </motion.div>

          {/* Feature Icons Grid */}
          <motion.div
            className="grid grid-cols-4 gap-6 max-w-2xl mx-auto mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
          >
            {icons.map((Icon, index) => (
              <motion.div
                key={index}
                className="flex flex-col items-center"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 + index * 0.1, duration: 0.6 }}
              >
                <motion.div
                  className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl mb-3 relative overflow-hidden"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  animate={{
                    y: [0, -8, 0],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: index * 0.3,
                  }}
                >
                  {/* Icon Background Glow */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-500/20 rounded-2xl"
                    animate={{
                      opacity: [0.3, 0.8, 0.3],
                    }}
                    transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                  />
                  <Icon className="w-8 h-8 text-blue-600 relative z-10" />
                </motion.div>
                <span className="text-xs text-gray-500 font-medium text-center">
                  {Icon.name}
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* Enhanced Progress Bar */}
          <motion.div
            className="max-w-md mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 0.8 }}
          >
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden relative">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 rounded-full relative"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 4, ease: "easeInOut" }}
              >
                {/* Progress Bar Shimmer */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{
                    x: ["-100%", "100%"],
                  }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                />
              </motion.div>
            </div>
            <motion.p
              className="text-sm text-gray-500 mt-3"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Initializing AI agents and loading financial data...
            </motion.p>
          </motion.div>

          {/* Floating Sparkles */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 12 }, (_, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: `${15 + (i * 6)}%`,
                  top: `${25 + (i * 5)}%`,
                }}
                animate={{
                  y: [0, -30, 0],
                  x: [0, Math.random() * 20 - 10, 0],
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.4,
                }}
              >
                <Sparkles className="w-4 h-4 text-blue-400" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Wave Effect */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-blue-100/50 via-purple-100/30 to-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1.5 }}
      />
    </div>
  )
} 