import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { ValidationResult } from '../../utils/nfeValidation';

interface NFeValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  campo: string;
  valor: string;
  validationResult: ValidationResult;
  onCorrect?: (newValue: string) => void;
}

const NFeValidationModal: React.FC<NFeValidationModalProps> = ({
  isOpen,
  onClose,
  campo,
  valor,
  validationResult,
  onCorrect
}) => {
  const [corrigindo, setCorrigindo] = React.useState(false);
  const [valorCorrigido, setValorCorrigido] = React.useState(valor);

  React.useEffect(() => {
    setValorCorrigido(valor);
  }, [valor]);

  const handleCorrect = () => {
    if (onCorrect) {
      onCorrect(valorCorrigido);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-gray-900 rounded-xl border border-gray-800 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Validação NFe - Campo "{campo}"
                </h2>
                <p className="text-sm text-gray-400">
                  Problemas encontrados que podem causar rejeição da SEFAZ
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
            {/* Valor atual */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Valor Atual (com problemas):
              </label>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <code className="text-red-300 text-sm break-all">
                  "{valor}"
                </code>
              </div>
            </div>

            {/* Lista de erros */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Problemas Encontrados:
              </label>
              <div className="space-y-2">
                {validationResult.errors.map((error, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <span className="text-red-300 text-sm">{error}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Regras da SEFAZ */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-5 h-5 text-blue-400" />
                <h3 className="font-medium text-blue-300">Regras da SEFAZ para NFe</h3>
              </div>
              <ul className="space-y-2 text-sm text-blue-200">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Não pode ter espaços no início ou fim</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Não pode ter espaços duplicados</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Não pode ter quebras de linha</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Não pode ter caracteres especiais como &lt; &gt; &amp; " '</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Deve respeitar o tamanho máximo do campo</span>
                </li>
              </ul>
            </div>

            {/* Campo de correção */}
            {onCorrect && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Corrija o texto abaixo:
                </label>
                <textarea
                  value={valorCorrigido}
                  onChange={(e) => setValorCorrigido(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 resize-none"
                  rows={4}
                  placeholder="Digite o texto corrigido aqui..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Dica: Remova espaços extras, quebras de linha e caracteres especiais
                </p>
              </div>
            )}

            {/* Exemplos */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <h3 className="font-medium text-green-300 mb-3">Exemplos Corretos:</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">Nome do produto:</span>
                  <code className="ml-2 text-green-300">"Notebook Dell Inspiron 15 3000"</code>
                </div>
                <div>
                  <span className="text-gray-400">Descrição:</span>
                  <code className="ml-2 text-green-300">"Produto de alta qualidade, cor azul, tamanho M"</code>
                </div>
                <div>
                  <span className="text-gray-400">Endereço:</span>
                  <code className="ml-2 text-green-300">"Rua das Flores, 123"</code>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-gray-800">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Fechar
            </button>
            {onCorrect && (
              <button
                onClick={handleCorrect}
                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                Aplicar Correção
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default NFeValidationModal;
