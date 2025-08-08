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
  unidade_fracionada?: boolean; // Nova propriedade para indicar se a unidade é fracionada
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

  // ✅ Verificar se a unidade é fracionada
  const isUnidadeFracionada = (): boolean => {
    if (insumo?.unidade_fracionada !== undefined) {
      return insumo.unidade_fracionada;
    }

    // Fallback: baseado na sigla da unidade
    const unidadeUpper = insumo?.unidade_medida?.toUpperCase() || '';
    return ['KG', 'L', 'ML', 'G', 'M', 'CM', 'MM', 'LT'].includes(unidadeUpper);
  };

  useEffect(() => {
    if (isOpen && insumo) {
      console.log('🔍 Modal Debug:', {
        nome: insumo.nome,
        unidade_medida: insumo.unidade_medida,
        unidade_fracionada: insumo.unidade_fracionada,
        isFracionado: isUnidadeFracionada(),
        quantidade: insumo.quantidade
      });

      setQuantidade(insumo.quantidade);
      // Inicializar com formatação adequada
      const valorFormatado = isUnidadeFracionada() ?
        insumo.quantidade.toFixed(3).replace('.', ',') :
        insumo.quantidade.toString();
      setQuantidadeTemp(valorFormatado);

      console.log('📝 Valor formatado inicial:', valorFormatado);
    }
  }, [isOpen, insumo]);

  // ✅ Determinar incremento baseado na unidade de medida
  const getIncremento = (): number => {
    return isUnidadeFracionada() ? 0.001 : 1;
  };

  // ✅ Formatar quantidade para exibição
  const formatarQuantidade = (valor: number): string => {
    if (isUnidadeFracionada()) {
      // Para unidades fracionadas, mostrar sempre 3 casas decimais com vírgula
      return valor.toFixed(3).replace('.', ',');
    }

    // Para unidades inteiras
    return valor.toString();
  };

  // ✅ Incrementar quantidade
  const incrementarQuantidade = () => {
    if (!insumo) return;

    const incremento = getIncremento();
    const novaQuantidade = quantidade + incremento;

    // Verificar quantidade máxima se definida
    if (insumo.quantidade_maxima && novaQuantidade > insumo.quantidade_maxima) {
      showMessage('error', `Quantidade máxima: ${formatarQuantidade(insumo.quantidade_maxima)} ${insumo.unidade_medida}`);
      return;
    }

    setQuantidade(novaQuantidade);
    setQuantidadeTemp(formatarQuantidade(novaQuantidade));
  };

  // ✅ Decrementar quantidade
  const decrementarQuantidade = () => {
    if (!insumo) return;

    const incremento = getIncremento();
    const novaQuantidade = Math.max(0, quantidade - incremento);

    // Não permitir valores negativos
    if (novaQuantidade < 0) {
      showMessage('error', 'Quantidade não pode ser negativa');
      return;
    }

    setQuantidade(novaQuantidade);
    setQuantidadeTemp(formatarQuantidade(novaQuantidade));
  };

  // ✅ Iniciar edição manual
  const iniciarEdicaoManual = () => {
    setEditandoManualmente(true);
    setQuantidadeTemp(formatarQuantidade(quantidade));
  };

  // ✅ Confirmar edição manual
  const confirmarEdicaoManual = () => {
    if (!insumo) return;

    // Converter vírgula para ponto antes de fazer parseFloat
    const valorLimpo = quantidadeTemp.replace(',', '.');
    const novaQuantidade = parseFloat(valorLimpo) || 0;

    // Validar apenas se não é negativo
    if (novaQuantidade < 0) {
      showMessage('error', 'Quantidade não pode ser negativa');
      return;
    }

    // Validar quantidade máxima (se definida e não for 0)
    if (insumo.quantidade_maxima && insumo.quantidade_maxima > 0 && novaQuantidade > insumo.quantidade_maxima) {
      showMessage('error', `Quantidade máxima: ${formatarQuantidade(insumo.quantidade_maxima)} ${insumo.unidade_medida}`);
      return;
    }

    setQuantidade(novaQuantidade);
    setEditandoManualmente(false);
  };

  // ✅ Cancelar edição manual
  const cancelarEdicaoManual = () => {
    setEditandoManualmente(false);
    setQuantidadeTemp(formatarQuantidade(quantidade));
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
              Quantidade padrão: {formatarQuantidade(insumo.quantidade)} {insumo.unidade_medida}
            </p>
            {(insumo.quantidade_maxima && insumo.quantidade_maxima > 0) && (
              <p className="text-orange-400 text-xs mt-1">
                <strong>Máximo:</strong> {formatarQuantidade(insumo.quantidade_maxima)} {insumo.unidade_medida}
              </p>
            )}
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
                  type="text"
                  inputMode={isUnidadeFracionada() ? 'decimal' : 'numeric'}
                  value={quantidadeTemp}
                  onChange={(e) => {
                    const isFracionado = isUnidadeFracionada();
                    let valor = e.target.value;

                    if (isFracionado) {
                      // Para fracionados: permite números, vírgula e ponto
                      valor = valor.replace(/[^0-9.,]/g, '');
                      valor = valor.replace(',', '.');

                      // Permitir apenas um ponto decimal
                      const pontos = valor.split('.');
                      if (pontos.length > 2) {
                        valor = pontos[0] + '.' + pontos.slice(1).join('');
                      }

                      // Limitar casas decimais a 3
                      const parts = valor.split('.');
                      if (parts.length === 2 && parts[1].length > 3) {
                        parts[1] = parts[1].slice(0, 3);
                        valor = parts.join('.');
                      }

                      // Retornar com vírgula para exibição
                      valor = valor.replace('.', ',');
                    } else {
                      // Para unitários: apenas números inteiros
                      valor = valor.replace(/[^0-9]/g, '');
                    }

                    setQuantidadeTemp(valor);
                  }}
                  onBlur={confirmarEdicaoManual}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      confirmarEdicaoManual();
                    } else if (e.key === 'Escape') {
                      cancelarEdicaoManual();
                    }
                  }}
                  className="w-24 px-3 py-2 text-center text-lg bg-gray-700 text-white border border-gray-600 rounded focus:outline-none focus:border-primary-500"
                  autoFocus
                />
                <span className="text-gray-400 text-sm">{insumo.unidade_medida}</span>
              </div>
            ) : (
              <button
                onClick={iniciarEdicaoManual}
                className="text-white font-bold text-xl bg-gray-700 hover:bg-gray-600 rounded px-4 py-2 transition-colors min-w-[120px]"
              >
                {formatarQuantidade(quantidade)} {insumo.unidade_medida}
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
