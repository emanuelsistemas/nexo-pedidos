import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface VerificacaoHumanoProps {
  onVerify: () => void;
}

const VerificacaoHumano: React.FC<VerificacaoHumanoProps> = ({ onVerify }) => {
  const [checked, setChecked] = useState(false);
  
  const handleCheck = () => {
    setChecked(true);
    // Espera um momento antes de chamar onVerify para simular verificação
    setTimeout(() => {
      onVerify();
    }, 700);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="bg-white rounded-md p-6 max-w-md w-full shadow-xl border-2 border-gray-300 relative"
      >
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-1 text-xs font-bold rounded-full">
          VERIFICAÇÃO DE SEGURANÇA
        </div>
        <div className="flex items-center space-x-3 cursor-pointer" onClick={handleCheck}>
          <div className="w-6 h-6 border border-gray-400 rounded flex items-center justify-center bg-white">
            {checked ? (
              <motion.svg
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-5 h-5 text-green-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </motion.svg>
            ) : null}
          </div>
          <div className="flex-1">
            <span className="text-gray-700 text-base">Não sou um robô</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 mb-1">
              <svg viewBox="0 0 24 24" className="w-full h-full text-blue-400">
                <g transform="matrix(1,0,0,1,0,0)">
                  <path d="M12,8.5 L12,3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2"></path>
                  <path d="M19.259,12 L15,12" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2"></path>
                  <path d="M12,19.5 L12,15.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2"></path>
                  <path d="M8.741,12 L3.5,12" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2"></path>
                  <path d="M17.804,17.177 L14.891,14.264" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2"></path>
                  <path d="M17.804,6.823 L14.891,9.736" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2"></path>
                  <path d="M6.196,17.177 L9.109,14.264" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2"></path>
                  <path d="M6.196,6.823 L9.109,9.736" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2"></path>
                </g>
              </svg>
            </div>
            <span className="text-gray-500 text-xs">reCAPTCHA</span>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <p className="text-xs text-gray-500">Verificação de segurança</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default VerificacaoHumano;
