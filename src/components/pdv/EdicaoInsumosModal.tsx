import React, { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { showMessage } from '../../utils/toast';

interface InsumoSelecionado {
  insumo: {
    produto_id: string;
    nome: string;
    quantidade: number;
    unidade_medida: string;
    quantidade_minima?: number;
    quantidade_maxima?: number;
  };
  quantidade: number;
}

interface Insumo {
  produto_id: string;
  nome: string;
  quantidade: number;
  unidade_medida: string;
  quantidade_minima?: number;
  quantidade_maxima?: number;
}

interface EdicaoInsumosModalProps {
  isOpen: boolean;
  onClose: () => void;
  insumosSelecionados: InsumoSelecionado[];
  insumosDisponiveis: Insumo[]; // ✅ NOVO: Todos os insumos disponíveis do produto
  controlarQuantidades: boolean;
  onConfirm: (insumos: InsumoSelecionado[]) => void;
}

const EdicaoInsumosModal: React.FC<EdicaoInsumosModalProps> = ({
  isOpen,
  onClose,
  insumosSelecionados,
  insumosDisponiveis,
  controlarQuantidades,
  onConfirm
}) => {
  const [insumosEditados, setInsumosEditados] = useState<InsumoSelecionado[]>([]);
  const [editandoQuantidade, setEditandoQuantidade] = useState<string | null>(null);
  const [quantidadeTemp, setQuantidadeTemp] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setInsumosEditados([...insumosSelecionados]);
    }
  }, [isOpen, insumosSelecionados]);

  // ✅ Determinar incremento baseado na unidade de medida (3 casas decimais para fracionados)
  const getIncremento = (unidadeMedida: string): number => {
    const unidadesFracionadas = ['KG', 'G', 'L', 'LT', 'ML', 'M', 'CM', 'MM'];
    const unidadeUpper = (unidadeMedida || '').toUpperCase();
    return unidadesFracionadas.includes(unidadeUpper) ? 0.001 : 1;
  };

  // ✅ Formatar quantidade baseado na unidade
  const formatarQuantidadeDisplay = (quantidade: number, unidade: string): string => {
    const incremento = getIncremento(unidade);
    if (incremento === 1) {
      return `${Math.round(quantidade)} ${unidade}`;
    } else {
      return `${quantidade.toFixed(3)} ${unidade}`;
    }
  };

  // ✅ Verificar se pode incrementar
  const podeIncrementar = (insumo: InsumoSelecionado): boolean => {
    if (!controlarQuantidades) return true;
    if (!insumo.insumo.quantidade_maxima) return true;
    return insumo.quantidade < insumo.insumo.quantidade_maxima;
  };

  // ✅ Verificar se pode decrementar
  const podeDecrementar = (insumo: InsumoSelecionado): boolean => {
    if (!controlarQuantidades) return insumo.quantidade > 0;
    if (!insumo.insumo.quantidade_minima) return insumo.quantidade > 0;
    return insumo.quantidade > insumo.insumo.quantidade_minima;
  };

  // ✅ Incrementar quantidade
  const incrementarQuantidade = (insumoId: string) => {
    const insumo = insumosEditados.find(i => i.insumo.produto_id === insumoId);
    if (!insumo || !podeIncrementar(insumo)) {
      showMessage('error', 'Quantidade máxima atingida');
      return;
    }

    const incremento = getIncremento(insumo.insumo.unidade_medida);
    setInsumosEditados(prev =>
      prev.map(i =>
        i.insumo.produto_id === insumoId
          ? { ...i, quantidade: i.quantidade + incremento }
          : i
      )
    );
  };

  // ✅ Decrementar quantidade
  const decrementarQuantidade = (insumoId: string) => {
    const insumo = insumosEditados.find(i => i.insumo.produto_id === insumoId);
    if (!insumo || !podeDecrementar(insumo)) {
      showMessage('error', 'Quantidade mínima atingida');
      return;
    }

    const incremento = getIncremento(insumo.insumo.unidade_medida);
    setInsumosEditados(prev =>
      prev.map(i =>
        i.insumo.produto_id === insumoId
          ? { ...i, quantidade: Math.max(0, i.quantidade - incremento) }
          : i
      )
    );
  };

  // ✅ Edição manual da quantidade
  const iniciarEdicaoQuantidade = (insumoId: string) => {
    const insumo = insumosEditados.find(i => i.insumo.produto_id === insumoId);
    if (!insumo) return;

    setEditandoQuantidade(insumoId);
    setQuantidadeTemp(insumo.quantidade.toString());
  };

  const confirmarEdicaoQuantidade = (insumoId: string) => {
    const novaQuantidade = parseFloat(quantidadeTemp);

    if (isNaN(novaQuantidade) || novaQuantidade < 0) {
      showMessage('error', 'Quantidade inválida');
      cancelarEdicaoQuantidade();
      return;
    }

    const insumo = insumosEditados.find(i => i.insumo.produto_id === insumoId);
    if (!insumo) return;

    // Verificar limites se controle estiver ativo
    if (controlarQuantidades) {
      if (insumo.insumo.quantidade_minima && novaQuantidade < insumo.insumo.quantidade_minima) {
        showMessage('error', `Quantidade mínima: ${insumo.insumo.quantidade_minima} ${insumo.insumo.unidade_medida}`);
        cancelarEdicaoQuantidade();
        return;
      }
      if (insumo.insumo.quantidade_maxima && novaQuantidade > insumo.insumo.quantidade_maxima) {
        showMessage('error', `Quantidade máxima: ${insumo.insumo.quantidade_maxima} ${insumo.insumo.unidade_medida}`);
        cancelarEdicaoQuantidade();
        return;
      }
    }

    setInsumosEditados(prev =>
      prev.map(i =>
        i.insumo.produto_id === insumoId
          ? { ...i, quantidade: novaQuantidade }
          : i
      )
    );

    cancelarEdicaoQuantidade();
  };

  const cancelarEdicaoQuantidade = () => {
    setEditandoQuantidade(null);
    setQuantidadeTemp('');
  };

  // ✅ Verificar se insumo está selecionado
  const getInsumoSelecionado = (insumoId: string): InsumoSelecionado | null => {
    return insumosEditados.find(i => i.insumo.produto_id === insumoId) || null;
  };

  // ✅ Adicionar novo insumo
  const adicionarNovoInsumo = (insumo: Insumo) => {
    const incremento = getIncremento(insumo.unidade_medida);
    const novoInsumoSelecionado: InsumoSelecionado = {
      insumo,
      quantidade: insumo.quantidade + incremento
    };

    setInsumosEditados(prev => [...prev, novoInsumoSelecionado]);
  };

  // ✅ Remover insumo
  const handleRemoverInsumo = (insumoId: string) => {
    setInsumosEditados(prev => prev.filter(i => i.insumo.produto_id !== insumoId));
  };

  // ✅ Confirmar alterações
  const handleConfirmar = () => {
    onConfirm(insumosEditados);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Editar Insumos</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {insumosDisponiveis.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Nenhum insumo disponível</p>
          ) : (
            <div className="space-y-3">
              {insumosDisponiveis.map((insumo) => {
                const insumoSelecionado = getInsumoSelecionado(insumo.produto_id);
                const estaSelecionado = !!insumoSelecionado;

                return (
                  <div key={insumo.produto_id} className={`rounded-lg p-3 ${estaSelecionado ? 'bg-gray-700/50 border border-orange-500/30' : 'bg-gray-800/30'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-white font-medium">{insumo.nome}</p>
                        <p className="text-sm text-gray-400">
                          Padrão: {formatarQuantidadeDisplay(insumo.quantidade, insumo.unidade_medida)}
                          {controlarQuantidades && (insumo.quantidade_minima || insumo.quantidade_maxima) && (
                            <span className="ml-2">
                              ({insumo.quantidade_minima && `mín: ${formatarQuantidadeDisplay(insumo.quantidade_minima, insumo.unidade_medida)}`}
                              {insumo.quantidade_minima && insumo.quantidade_maxima && ', '}
                              {insumo.quantidade_maxima && `máx: ${formatarQuantidadeDisplay(insumo.quantidade_maxima, insumo.unidade_medida)}`})
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {estaSelecionado ? (
                          <>
                            {/* Botão de remover */}
                            <button
                              onClick={() => handleRemoverInsumo(insumo.produto_id)}
                              className="w-6 h-6 rounded-full bg-red-600 text-white hover:bg-red-700 flex items-center justify-center transition-colors"
                              title="Remover insumo"
                            >
                              <X size={12} />
                            </button>

                            {/* Controles de quantidade */}
                            <button
                              onClick={() => decrementarQuantidade(insumo.produto_id)}
                              disabled={!podeDecrementar(insumoSelecionado!)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                !podeDecrementar(insumoSelecionado!)
                                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                  : 'bg-red-600 text-white hover:bg-red-700'
                              }`}
                            >
                              <Minus size={16} />
                            </button>

                            {/* Campo de quantidade editável */}
                            {editandoQuantidade === insumo.produto_id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={quantidadeTemp}
                                  onChange={(e) => setQuantidadeTemp(e.target.value)}
                                  onBlur={() => confirmarEdicaoQuantidade(insumo.produto_id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      confirmarEdicaoQuantidade(insumo.produto_id);
                                    } else if (e.key === 'Escape') {
                                      cancelarEdicaoQuantidade();
                                    }
                                  }}
                                  className="w-16 px-2 py-1 text-center text-sm bg-gray-700 text-white border border-gray-600 rounded focus:outline-none focus:border-primary-500"
                                  step={getIncremento(insumo.unidade_medida)}
                                  min="0"
                                  autoFocus
                                />
                                <span className="text-xs text-gray-400">{insumo.unidade_medida}</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => iniciarEdicaoQuantidade(insumo.produto_id)}
                                className="text-white font-medium w-20 text-center text-sm hover:bg-gray-700 rounded px-2 py-1 transition-colors"
                              >
                                {formatarQuantidadeDisplay(insumoSelecionado!.quantidade, insumo.unidade_medida)}
                              </button>
                            )}

                            <button
                              onClick={() => incrementarQuantidade(insumo.produto_id)}
                              disabled={!podeIncrementar(insumoSelecionado!)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                !podeIncrementar(insumoSelecionado!)
                                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                  : 'bg-primary-600 text-white hover:bg-primary-700'
                              }`}
                            >
                              <Plus size={16} />
                            </button>
                          </>
                        ) : (
                          /* Botão para adicionar insumo não selecionado */
                          <button
                            onClick={() => adicionarNovoInsumo(insumo)}
                            className="w-8 h-8 rounded-full bg-primary-600 text-white hover:bg-primary-700 flex items-center justify-center transition-colors"
                            title="Adicionar insumo"
                          >
                            <Plus size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EdicaoInsumosModal;