import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface FotoGaleriaProps {
  fotos: { id: string; url: string; principal?: boolean }[];
  isOpen: boolean;
  onClose: () => void;
  initialFotoIndex?: number;
}

const FotoGaleria: React.FC<FotoGaleriaProps> = ({
  fotos,
  isOpen,
  onClose,
  initialFotoIndex = 0
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialFotoIndex);
  
  // Reset index when fotos change
  useEffect(() => {
    setCurrentIndex(initialFotoIndex);
  }, [fotos, initialFotoIndex]);
  
  if (!isOpen || fotos.length === 0) return null;
  
  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prevIndex) => (prevIndex + 1) % fotos.length);
  };
  
  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prevIndex) => (prevIndex - 1 + fotos.length) % fotos.length);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % fotos.length);
    } else if (e.key === 'ArrowLeft') {
      setCurrentIndex((prevIndex) => (prevIndex - 1 + fotos.length) % fotos.length);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
        onClick={onClose}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <button
          className="absolute top-4 right-4 text-white p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
          onClick={onClose}
        >
          <X size={24} />
        </button>
        
        <div className="relative w-full max-w-4xl max-h-[80vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          {/* Foto atual */}
          <motion.div
            key={fotos[currentIndex].id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative"
          >
            <img
              src={fotos[currentIndex].url}
              alt="Foto do produto"
              className="max-h-[80vh] max-w-full object-contain"
            />
            
            {fotos[currentIndex].principal && (
              <div className="absolute top-2 right-2 bg-primary-500 text-white text-sm px-2 py-1 rounded">
                Principal
              </div>
            )}
          </motion.div>
          
          {/* Botões de navegação */}
          {fotos.length > 1 && (
            <>
              <button
                className="absolute left-4 p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors text-white"
                onClick={handlePrev}
              >
                <ChevronLeft size={24} />
              </button>
              <button
                className="absolute right-4 p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors text-white"
                onClick={handleNext}
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
          
          {/* Indicador de posição */}
          {fotos.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
              {fotos.map((_, index) => (
                <button
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentIndex ? 'bg-white' : 'bg-gray-500'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FotoGaleria;
