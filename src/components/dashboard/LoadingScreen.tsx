import React from 'react';
import { motion } from 'framer-motion';
import Logo from '../comum/Logo';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
  showSubLoading?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Carregando...",
  subMessage,
  showSubLoading = false
}) => {
  return (
    <div className="fixed inset-0 bg-background-dark flex items-center justify-center z-50">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Logo size="lg" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-6 text-gray-400 text-lg"
        >
          {message}
        </motion.div>
        {subMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-3 text-gray-500 text-sm flex items-center justify-center gap-2"
          >
            {showSubLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
            )}
            {subMessage}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default LoadingScreen;