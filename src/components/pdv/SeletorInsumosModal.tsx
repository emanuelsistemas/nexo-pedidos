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

interface InsumoSelecionado {
  insumo: Insumo;
  quantidade: number;
}

interface SeletorInsumosModalProps {
  isOpen: boolean;
  onClose: () => void;
  produto: {
    id: string;
    nome: string;
    preco: number;
    insumos?: Insumo[];
    controlar_quantidades_insumo?: boolean;
  };
  onConfirm: (insumosSelecionados: InsumoSelecionado[]) => void;
}

const SeletorInsumosModal: React.FC<SeletorInsumosModalProps> = ({
  isOpen,
  onClose,
  produto,
  onConfirm
}) => {
  const [insumosSelecionados, setInsumosSelecionados] = useState<InsumoSelecionado[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Limpar seleções quando o modal fechar
  useEffect(() => {
    if (!isOpen) {
      setInsumosSelecionados([]);
    }
  }, [isOpen]);

  // Inicializar com quantidades padrão dos insumos
  useEffect(() => {
    if (isOpen && produto.insumos) {
      const insumosIniciais = produto.insumos.map(insumo => ({
        insumo,
        quantidade: insumo.quantidade // Usar quantidade padrão do insumo
      }));
      setInsumosSelecionados(insumosIniciais);
    }
  }, [isOpen, produto.insumos]);

  const getQuantidadeInsumo = (insumoId: string): number => {
    const insumoSelecionado = insumosSelecionados.find(i => i.insumo.produto_id === insumoId);
    return insumoSelecionado?.quantidade || 0;
  };

  const podeIncrementarInsumo = (insumo: Insumo): boolean => {
    if (!produto.controlar_quantidades_insumo) return true;
    
    const quantidadeAtual = getQuantidadeInsumo(insumo.produto_id);
    if (insumo.quantidade_maxima && insumo.quantidade_maxima > 0) {
      return quantidadeAtual < insumo.quantidade_maxima;
    }
    return true;
  };

  const podeDecrementarInsumo = (insumo: Insumo): boolean => {
    if (!produto.controlar_quantidades_insumo) return true;
    
    const quantidadeAtual = getQuantidadeInsumo(insumo.produto_id);
    if (insumo.quantidade_minima && insumo.quantidade_minima > 0) {
      return quantidadeAtual > insumo.quantidade_minima;
    }
    return quantidadeAtual > 0;
  };

  const adicionarInsumo = (insumo: Insumo) => {
    if (!podeIncrementarInsumo(insumo)) {
      const quantidadeMaxima = insumo.quantidade_maxima || 0;
      showMessage('error', `Quantidade máxima de ${quantidadeMaxima} ${insumo.unidade_medida} atingida para ${insumo.nome}.`);
      return;
    }

    setInsumosSelecionados(prev => {
      const insumoExistente = prev.find(i => i.insumo.produto_id === insumo.produto_id);

      if (insumoExistente) {
        return prev.map(i =>
          i.insumo.produto_id === insumo.produto_id
            ? { ...i, quantidade: i.quantidade + 0.1 } // Incremento de 0.1
            : i
        );
      } else {
        return [...prev, { insumo, quantidade: insumo.quantidade + 0.1 }];
      }
    });
  };

  const removerInsumo = (insumoId: string) => {
    const insumo = produto.insumos?.find(i => i.produto_id === insumoId);
    if (!insumo || !podeDecrementarInsumo(insumo)) {
      const quantidadeMinima = insumo?.quantidade_minima || 0;
      showMessage('error', `Quantidade mínima de ${quantidadeMinima} ${insumo?.unidade_medida} para ${insumo?.nome}.`);
      return;
    }

    setInsumosSelecionados(prev => {
      const insumoExistente = prev.find(i => i.insumo.produto_id === insumoId);

      if (insumoExistente && insumoExistente.quantidade > 0.1) {
        return prev.map(i =>
          i.insumo.produto_id === insumoId
            ? { ...i, quantidade: Math.max(0, i.quantidade - 0.1) } // Decremento de 0.1
            : i
        );
      } else {
        return prev.filter(i => i.insumo.produto_id !== insumoId);
      }
    });
  };

  const verificarQuantidadesValidas = (): { valido: boolean; insumosInvalidos: string[] } => {
    if (!produto.controlar_quantidades_insumo) {
      return { valido: true, insumosInvalidos: [] };
    }

    const insumosInvalidos: string[] = [];

    produto.insumos?.forEach(insumo => {
      const quantidadeSelecionada = getQuantidadeInsumo(insumo.produto_id);
      
      // Verificar quantidade mínima
      if (insumo.quantidade_minima && quantidadeSelecionada < insumo.quantidade_minima) {
        insumosInvalidos.push(`${insumo.nome} (mín: ${insumo.quantidade_minima} ${insumo.unidade_medida})`);
      }
      
      // Verificar quantidade máxima
      if (insumo.quantidade_maxima && quantidadeSelecionada > insumo.quantidade_maxima) {
        insumosInvalidos.push(`${insumo.nome} (máx: ${insumo.quantidade_maxima} ${insumo.unidade_medida})`);
      }
    });

    return {
      valido: insumosInvalidos.length === 0,
      insumosInvalidos
    };
  };

  const handleConfirmar = () => {
    const validacao = verificarQuantidadesValidas();

    if (!validacao.valido) {
      const mensagem = `Quantidades inválidas para: ${validacao.insumosInvalidos.join(', ')}`;
      showMessage('error', mensagem);
      return;
    }

    onConfirm(insumosSelecionados);
    onClose();
  };

  const formatarQuantidade = (quantidade: number, unidade: string): string => {
    return `${quantidade.toFixed(3).replace(/\.?0+$/, '')} ${unidade}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-900 rounded-lg flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Selecionar Insumos</h2>
            <p className="text-sm text-gray-400">{produto.nome}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-400">Carregando insumos...</div>
            </div>
          ) : !produto.insumos || produto.insumos.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center text-gray-400">
                <p className="text-lg font-medium mb-2">Nenhum insumo configurado</p>
                <p className="text-sm">Este produto não possui insumos configurados</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {produto.insumos.map(insumo => {
                const quantidade = getQuantidadeInsumo(insumo.produto_id);
                return (
                  <div
                    key={insumo.produto_id}
                    className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-white font-medium">{insumo.nome}</p>
                      <p className="text-sm text-gray-400">
                        Padrão: {formatarQuantidade(insumo.quantidade, insumo.unidade_medida)}
                        {produto.controlar_quantidades_insumo && (insumo.quantidade_minima || insumo.quantidade_maxima) && (
                          <span className="ml-2">
                            ({insumo.quantidade_minima && `mín: ${formatarQuantidade(insumo.quantidade_minima, insumo.unidade_medida)}`}
                            {insumo.quantidade_minima && insumo.quantidade_maxima && ', '}
                            {insumo.quantidade_maxima && `máx: ${formatarQuantidade(insumo.quantidade_maxima, insumo.unidade_medida)}`})
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {quantidade > 0 && (
                        <>
                          <button
                            onClick={() => removerInsumo(insumo.produto_id)}
                            disabled={!podeDecrementarInsumo(insumo)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                              !podeDecrementarInsumo(insumo)
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                : 'bg-red-600 text-white hover:bg-red-700'
                            }`}
                          >
                            <Minus size={16} />
                          </button>
                          <span className="text-white font-medium w-20 text-center text-sm">
                            {formatarQuantidade(quantidade, insumo.unidade_medida)}
                          </span>
                        </>
                      )}
                      <button
                        onClick={() => adicionarInsumo(insumo)}
                        disabled={!podeIncrementarInsumo(insumo)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          !podeIncrementarInsumo(insumo)
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-primary-600 text-white hover:bg-primary-700'
                        }`}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-gray-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
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

export default SeletorInsumosModal;
