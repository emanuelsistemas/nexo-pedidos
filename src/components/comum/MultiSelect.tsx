import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, X, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Selecione opções',
  label,
  required = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<Option[]>(options);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Encontrar as opções selecionadas
  const selectedOptions = options.filter(option => value.includes(option.value));

  // Filtrar opções baseado no termo de busca
  useEffect(() => {
    const filtered = options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredOptions(filtered);
  }, [searchTerm, options]);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focar no input de busca quando abrir
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (option: Option) => {
    const newValue = value.includes(option.value)
      ? value.filter(v => v !== option.value)
      : [...value, option.value];
    onChange(newValue);
  };

  const handleRemove = (optionValue: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newValue = value.filter(v => v !== optionValue);
    onChange(newValue);
  };

  const handleClearAll = (event: React.MouseEvent) => {
    event.stopPropagation();
    onChange([]);
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-400 mb-2">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      
      <div ref={dropdownRef} className="relative">
        {/* Campo selecionado / trigger */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white cursor-pointer min-h-[40px] flex items-center justify-between"
        >
          <div className="flex-1 flex flex-wrap gap-1">
            {selectedOptions.length === 0 ? (
              <span className="text-gray-400">{placeholder}</span>
            ) : (
              selectedOptions.map((option) => (
                <span
                  key={option.value}
                  className="inline-flex items-center gap-1 bg-primary-500/20 text-primary-400 px-2 py-1 rounded text-xs"
                >
                  {option.label}
                  <button
                    type="button"
                    onClick={(e) => handleRemove(option.value, e)}
                    className="hover:text-primary-300"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))
            )}
          </div>
          <div className="flex items-center ml-2">
            {selectedOptions.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="mr-1 text-gray-400 hover:text-white"
                title="Limpar tudo"
              >
                <X size={16} />
              </button>
            )}
            <ChevronDown
              size={18}
              className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </div>

        {/* Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50"
            >
              {/* Campo de busca */}
              <div className="p-3 border-b border-gray-700">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-2 pl-10 pr-3 text-white text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                    placeholder="Buscar..."
                  />
                </div>
              </div>

              {/* Lista de opções */}
              <div className="max-h-60 overflow-y-auto">
                {filteredOptions.length === 0 ? (
                  <div className="p-4 text-center text-gray-400">
                    Nenhuma opção encontrada
                  </div>
                ) : (
                  filteredOptions.map((option) => {
                    const isSelected = value.includes(option.value);
                    return (
                      <div
                        key={option.value}
                        className={`px-3 py-2 cursor-pointer transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'bg-primary-500/20 text-primary-400'
                            : 'text-white hover:bg-gray-700'
                        }`}
                        onClick={() => handleSelect(option)}
                      >
                        <span>{option.label}</span>
                        {isSelected && <Check size={16} className="text-primary-400" />}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MultiSelect;
