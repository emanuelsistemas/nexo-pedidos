import React from 'react';
import { motion } from 'framer-motion';
import Logo from '../comum/Logo';

const LoadingScreen: React.FC = () => {
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
          className="mt-6 text-gray-400"
        >
          Carregando...
        </motion.div>
      </div>
    </div>
  );
}

export default LoadingScreen;