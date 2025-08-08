import React, { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { showMessage } from '../../utils/toast';

interface Insumo {
  produto_id: string;
  nome: string;
  quantidade: number;
  unidade_medida: string;
  quantidade_minima?: number;
  quantidade_maxima?: number;
}

interface EdicaoQuantidadeInsumoModalProps {
  isOpen: boolean;
  onClose: () => void;
  insumo: Insumo | null;
  onConfirm: (novaQuantidade: number) => void;
}

const EdicaoQuantidadeInsumoModal: React.FC<EdicaoQuantidadeInsumoModalProps> = ({
  isOpen,
  onClose,
  insumo,
  onConfirm
}) => {
  const [quantidade, setQuantidade] = useState<number>(0);
  const [quantidadeTemp, setQuantidadeTemp] = useState<string>('');
  const [editandoManualmente, setEditandoManualmente] = useState(false);

  useEffect(() => {
    if (isOpen && insumo) {
      setQuantidade(insumo.quantidade);
      setQuantidadeTemp(insumo.quantidade.toString());
    }
  }, [isOpen, insumo]);

  // ✅ Determinar incremento baseado na unidade de medida
  const getIncremento = (unidadeMedida: string): number => {
    const unidadeUpper = unidadeMedida?.toUpperCase() || '';
    
    // Unidades fracionadas (3 casas decimais)
    if (['KG', 'L', 'ML', 'G', 'M', 'CM', 'MM'].includes(unidadeUpper)) {
      return 0.001; // 3 casas decimais
    }
    
    // Unidades inteiras
    return 1;
  };

  // ✅ Formatar quantidade para exibição
  const formatarQuantidade = (valor: number, unidadeMedida: string): string => {
    const incremento = getIncremento(unidadeMedida);
    
    if (incremento < 1) {
      // Para unidades fracionadas, mostrar até 3 casas decimais, removendo zeros desnecessários
      return valor.toFixed(3).replace(/\.?0+$/, '');
    }
    
    // Para unidades inteiras
    return valor.toString();
  };

  // ✅ Incrementar quantidade
  const incrementarQuantidade = () => {
    if (!insumo) return;
    
    const incremento = getIncremento(insumo.unidade_medida);
    const novaQuantidade = quantidade + incremento;
    
    // Verificar quantidade máxima se definida
    if (insumo.quantidade_maxima && novaQuantidade > insumo.quantidade_maxima) {
      showMessage('error', `Quantidade máxima: ${formatarQuantidade(insumo.quantidade_maxima, insumo.unidade_medida)} ${insumo.unidade_medida}`);
      return;
    }
    
    setQuantidade(novaQuantidade);
    setQuantidadeTemp(formatarQuantidade(novaQuantidade, insumo.unidade_medida));
  };

  // ✅ Decrementar quantidade
  const decrementarQuantidade = () => {
    if (!insumo) return;

    const incremento = getIncremento(insumo.unidade_medida);
    const quantidadeMinima = insumo.quantidade_minima || insumo.quantidade;
    const novaQuantidade = Math.max(quantidadeMinima, quantidade - incremento);

    // Verificar quantidade mínima
    if (novaQuantidade < quantidadeMinima) {
      showMessage('error', `Quantidade mínima: ${formatarQuantidade(quantidadeMinima, insumo.unidade_medida)} ${insumo.unidade_medida}`);
      return;
    }

    setQuantidade(novaQuantidade);
    setQuantidadeTemp(formatarQuantidade(novaQuantidade, insumo.unidade_medida));
  };

  // ✅ Iniciar edição manual
  const iniciarEdicaoManual = () => {
    setEditandoManualmente(true);
    setQuantidadeTemp(formatarQuantidade(quantidade, insumo?.unidade_medida || ''));
  };

  // ✅ Confirmar edição manual
  const confirmarEdicaoManual = () => {
    if (!insumo) return;

    const novaQuantidade = parseFloat(quantidadeTemp) || 0;
    const quantidadeMinima = insumo.quantidade_minima || insumo.quantidade;

    // Validar quantidade mínima
    if (novaQuantidade < quantidadeMinima) {
      showMessage('error', `Quantidade mínima: ${formatarQuantidade(quantidadeMinima, insumo.unidade_medida)} ${insumo.unidade_medida}`);
      return;
    }

    // Validar quantidade máxima (se definida e não for 0)
    if (insumo.quantidade_maxima && insumo.quantidade_maxima > 0 && novaQuantidade > insumo.quantidade_maxima) {
      showMessage('error', `Quantidade máxima: ${formatarQuantidade(insumo.quantidade_maxima, insumo.unidade_medida)} ${insumo.unidade_medida}`);
      return;
    }

    setQuantidade(novaQuantidade);
    setEditandoManualmente(false);
  };

  // ✅ Cancelar edição manual
  const cancelarEdicaoManual = () => {
    setEditandoManualmente(false);
    setQuantidadeTemp(formatarQuantidade(quantidade, insumo?.unidade_medida || ''));
  };

  // ✅ Confirmar alterações
  const handleConfirmar = () => {
    onConfirm(quantidade);
    onClose();
  };

  if (!isOpen || !insumo) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Editar Quantidade</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <h4 className="text-white font-medium text-lg mb-2">{insumo.nome}</h4>
            <p className="text-gray-400 text-sm">
              Quantidade padrão: {formatarQuantidade(insumo.quantidade, insumo.unidade_medida)} {insumo.unidade_medida}
            </p>
            <p className="text-orange-400 text-xs mt-1">
              <strong>Mínimo:</strong> {formatarQuantidade(insumo.quantidade_minima || insumo.quantidade, insumo.unidade_medida)} {insumo.unidade_medida}
              {insumo.quantidade_maxima && insumo.quantidade_maxima > 0 && (
                <span className="ml-2">
                  <strong>Máximo:</strong> {formatarQuantidade(insumo.quantidade_maxima, insumo.unidade_medida)} {insumo.unidade_medida}
                </span>
              )}
              {(!insumo.quantidade_maxima || insumo.quantidade_maxima === 0) && (
                <span className="ml-2 text-gray-500">
                  <strong>Máximo:</strong> ilimitado
                </span>
              )}
            </p>
          </div>

          {/* Controles de quantidade */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={decrementarQuantidade}
              className="w-12 h-12 rounded-full bg-red-600 text-white hover:bg-red-700 flex items-center justify-center transition-colors"
            >
              <Minus size={20} />
            </button>

            {/* Campo de quantidade */}
            {editandoManualmente ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={quantidadeTemp}
                  onChange={(e) => setQuantidadeTemp(e.target.value)}
                  onBlur={confirmarEdicaoManual}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      confirmarEdicaoManual();
                    } else if (e.key === 'Escape') {
                      cancelarEdicaoManual();
                    }
                  }}
                  className="w-24 px-3 py-2 text-center text-lg bg-gray-700 text-white border border-gray-600 rounded focus:outline-none focus:border-primary-500"
                  step={getIncremento(insumo.unidade_medida)}
                  min={insumo.quantidade_minima || insumo.quantidade}
                  autoFocus
                />
                <span className="text-gray-400 text-sm">{insumo.unidade_medida}</span>
              </div>
            ) : (
              <button
                onClick={iniciarEdicaoManual}
                className="text-white font-bold text-xl bg-gray-700 hover:bg-gray-600 rounded px-4 py-2 transition-colors min-w-[120px]"
              >
                {formatarQuantidade(quantidade, insumo.unidade_medida)} {insumo.unidade_medida}
              </button>
            )}

            <button
              onClick={incrementarQuantidade}
              className="w-12 h-12 rounded-full bg-primary-600 text-white hover:bg-primary-700 flex items-center justify-center transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EdicaoQuantidadeInsumoModal;
