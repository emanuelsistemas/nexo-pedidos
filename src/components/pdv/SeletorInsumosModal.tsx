import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, RotateCcw } from 'lucide-react';
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
  removido?: boolean; // quando true, exibe riscado e mantém quantidade 0
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
  const [editandoQuantidade, setEditandoQuantidade] = useState<string | null>(null);
  const [quantidadeTemp, setQuantidadeTemp] = useState<string>('');

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
        quantidade: insumo.quantidade, // Usar quantidade padrão do insumo
        removido: false
      }));
      setInsumosSelecionados(insumosIniciais);
    }
  }, [isOpen, produto.insumos]);

  const getQuantidadeInsumo = (insumoId: string): number => {
    const insumoSelecionado = insumosSelecionados.find(i => i.insumo.produto_id === insumoId);
    return insumoSelecionado ? (insumoSelecionado.quantidade || 0) : 0;
  };

  // ✅ Determinar incremento baseado na unidade de medida (fracionados com 3 casas decimais)
  const getIncremento = (unidadeMedida: string): number => {
    const unidadesFracionadas = ['KG', 'L', 'LT', 'ML', 'G', 'M', 'CM', 'MM'];
    const unidadeUpper = (unidadeMedida || '').toUpperCase();
    return unidadesFracionadas.includes(unidadeUpper) ? 0.001 : 1;
  };

  // ✅ Utilitários de quantidade para fracionados (vírgula, 3 casas)
  const sanitizeQuantidadeInput = (valor: string, fracionado: boolean): string => {
    if (!valor) return '';
    if (!fracionado) {
      return valor.replace(/[^0-9]/g, '');
    }
    let v = valor.replace(/[^0-9.,]/g, '');
    v = v.replace(',', '.');
    const partes = v.split('.');
    if (partes.length > 2) {
      v = partes[0] + '.' + partes.slice(1).join('');
    }
    if (partes.length === 2) {
      partes[1] = partes[1].slice(0, 3);
      v = partes[0] + '.' + partes[1];
    }
    return v.replace('.', ',');
  };

  const padQuantidadeFracionada = (valor: string): string => {
    if (!valor) return '';
    const num = parseFloat(valor.replace(',', '.'));
    if (isNaN(num)) return '';
    return num.toFixed(3).replace('.', ',');
  };

  // ✅ NOVO: Formatar quantidade baseado na unidade (vírgula e 3 casas em fracionados)
  const formatarQuantidadeDisplay = (quantidade: number, unidade: string): string => {
    const incremento = getIncremento(unidade);
    if (incremento === 1) {
      return `${Math.round(quantidade)} ${unidade}`;
    } else {
      return `${quantidade.toFixed(3).replace('.', ',')} ${unidade}`;
    }
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

    const incremento = getIncremento(insumo.unidade_medida);

    setInsumosSelecionados(prev => {
      const insumoExistente = prev.find(i => i.insumo.produto_id === insumo.produto_id);

      if (insumoExistente) {
        const novaQtd = insumoExistente.removido ? incremento : insumoExistente.quantidade + incremento;
        return prev.map(i =>
          i.insumo.produto_id === insumo.produto_id
            ? { ...i, quantidade: novaQtd, removido: false }
            : i
        );
      } else {
        return [...prev, { insumo, quantidade: insumo.quantidade + incremento, removido: false }];
      }
    });
  };

  const removerInsumo = (insumoId: string) => {
    const insumo = produto.insumos?.find(i => i.produto_id === insumoId);
    if (!insumo) return;

    const incremento = getIncremento(insumo.unidade_medida);

    setInsumosSelecionados(prev => {
      const insumoExistente = prev.find(i => i.insumo.produto_id === insumoId);

      if (!insumoExistente) {
        // Se não existe ainda na lista, adiciona como removido
        return [...prev, { insumo, quantidade: 0, removido: true }];
      }

      // Se quantidade maior que 0 e diminuir, respeitar decremento normal até zero
      if (insumoExistente.quantidade > incremento) {
        const novaQtd = Math.max(0, insumoExistente.quantidade - incremento);
        return prev.map(i =>
          i.insumo.produto_id === insumoId
            ? { ...i, quantidade: novaQtd, removido: novaQtd === 0 }
            : i
        );
      }

      // Chegando a zero: marcar como removido e manter item na lista (riscado)
      return prev.map(i =>
        i.insumo.produto_id === insumoId
          ? { ...i, quantidade: 0, removido: true }
          : i
      );
    });
  };

  const verificarQuantidadesValidas = (): { valido: boolean; insumosInvalidos: string[] } => {
    if (!produto.controlar_quantidades_insumo) {
      return { valido: true, insumosInvalidos: [] };
    }

    const insumosInvalidos: string[] = [];

    produto.insumos?.forEach(insumo => {
      const quantidadeSelecionada = getQuantidadeInsumo(insumo.produto_id);

      // Itens com quantidade 0 são considerados desabilitados (podem ser removidos)
      if (quantidadeSelecionada === 0) {
        return;
      }

      // Verificar quantidade mínima
      if (insumo.quantidade_minima && quantidadeSelecionada < insumo.quantidade_minima) {
        insumosInvalidos.push(`${insumo.nome} (mín: ${formatarQuantidadeDisplay(insumo.quantidade_minima, insumo.unidade_medida)})`);
      }

      // Verificar quantidade máxima
      if (insumo.quantidade_maxima && quantidadeSelecionada > insumo.quantidade_maxima) {
        insumosInvalidos.push(`${insumo.nome} (máx: ${formatarQuantidadeDisplay(insumo.quantidade_maxima, insumo.unidade_medida)})`);
      }
    });

    return {
      valido: insumosInvalidos.length === 0,
      insumosInvalidos
    };
  };

  // ✅ NOVO: Funções para edição manual da quantidade
  const iniciarEdicaoQuantidade = (insumoId: string) => {
    const quantidade = getQuantidadeInsumo(insumoId);
    setEditandoQuantidade(insumoId);
    setQuantidadeTemp(quantidade.toString());
  };

  const confirmarEdicaoQuantidade = (insumoId: string) => {
    // Converter vírgula para ponto para calcular
    const novaQuantidade = parseFloat(quantidadeTemp.replace(',', '.'));

    if (isNaN(novaQuantidade) || novaQuantidade < 0) {
      showMessage('error', 'Quantidade inválida');
      cancelarEdicaoQuantidade();
      return;
    }

    const insumo = produto.insumos?.find(i => i.produto_id === insumoId);
    if (!insumo) return;

    // Verificar limites se controle estiver ativo (exceto quando definindo 0 para "remover")
    if (produto.controlar_quantidades_insumo && novaQuantidade > 0) {
      if (insumo.quantidade_minima && novaQuantidade < insumo.quantidade_minima) {
        showMessage('error', `Quantidade mínima: ${insumo.quantidade_minima} ${insumo.unidade_medida}`);
        cancelarEdicaoQuantidade();
        return;
      }
      if (insumo.quantidade_maxima && novaQuantidade > insumo.quantidade_maxima) {
        showMessage('error', `Quantidade máxima: ${insumo.quantidade_maxima} ${insumo.unidade_medida}`);
        cancelarEdicaoQuantidade();
        return;
      }
    }

    // Atualizar quantidade e estado de removido quando 0
    setInsumosSelecionados(prev => {
      const insumoExistente = prev.find(i => i.insumo.produto_id === insumoId);

      if (insumoExistente) {
        return prev.map(i =>
          i.insumo.produto_id === insumoId
            ? { ...i, quantidade: novaQuantidade, removido: novaQuantidade === 0 }
            : i
        );
      } else {
        return [...prev, { insumo, quantidade: novaQuantidade, removido: novaQuantidade === 0 }];
      }
    });

    cancelarEdicaoQuantidade();
  };

  const cancelarEdicaoQuantidade = () => {
    setEditandoQuantidade(null);
    setQuantidadeTemp('');
  };

  const handleConfirmar = () => {
    const validacao = verificarQuantidadesValidas();

    if (!validacao.valido) {
      const mensagem = `Quantidades inválidas para: ${validacao.insumosInvalidos.join(', ')}`;
      showMessage('error', mensagem);
      return;
    }

    // Enviar apenas os insumos com quantidade > 0
    const ativos = insumosSelecionados.filter(i => (i.quantidade || 0) > 0);
    onConfirm(ativos);
    onClose();
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
                const selecionado = insumosSelecionados.find(i => i.insumo.produto_id === insumo.produto_id);
                const quantidade = selecionado ? selecionado.quantidade : getQuantidadeInsumo(insumo.produto_id);
                const removido = selecionado?.removido || quantidade === 0;
                return (
                  <div
                    key={insumo.produto_id}
                    className={`flex items-center justify-between p-3 rounded-lg ${removido ? 'bg-gray-800/30' : 'bg-gray-800/50'}`}
                  >
                    <div className="flex-1">
                      <p className={`font-medium ${removido ? 'text-gray-400 line-through' : 'text-white'}`}>{insumo.nome} {removido && <span className="ml-2 text-xs text-red-400">(removido)</span>}</p>
                      <p className={`text-sm ${removido ? 'text-gray-500 line-through' : 'text-gray-400'}`}>
                        Padrão: {formatarQuantidadeDisplay(insumo.quantidade, insumo.unidade_medida)}
                        {produto.controlar_quantidades_insumo && (insumo.quantidade_minima || insumo.quantidade_maxima) && (
                          <span className="ml-2">
                            ({insumo.quantidade_minima && `mín: ${formatarQuantidadeDisplay(insumo.quantidade_minima, insumo.unidade_medida)}`}
                            {insumo.quantidade_minima && insumo.quantidade_maxima && ', '}
                            {insumo.quantidade_maxima && `máx: ${formatarQuantidadeDisplay(insumo.quantidade_maxima, insumo.unidade_medida)}`})
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Botão X para remover/restaurar */}
                      <button
                        onClick={() => {
                          setInsumosSelecionados(prev => {
                            const existente = prev.find(i => i.insumo.produto_id === insumo.produto_id);
                            if (!existente) {
                              return [...prev, { insumo, quantidade: 0, removido: true }];
                            }
                            if (existente.removido || existente.quantidade === 0) {
                              // restaurar para quantidade padrão
                              return prev.map(i => i.insumo.produto_id === insumo.produto_id ? { ...i, quantidade: insumo.quantidade, removido: false } : i);
                            }
                            // marcar como removido
                            return prev.map(i => i.insumo.produto_id === insumo.produto_id ? { ...i, quantidade: 0, removido: true } : i);
                          });
                        }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${removido ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
                        title={removido ? 'Reativar insumo' : 'Remover insumo'}
                      >
                        {removido ? <RotateCcw size={16} /> : <X size={16} />}
                      </button>

                      {/* Controles de quantidade */}
                      <>
                          <button
                            onClick={() => removerInsumo(insumo.produto_id)}
                            disabled={removido || !podeDecrementarInsumo(insumo)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                              removido || !podeDecrementarInsumo(insumo)
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                : 'bg-red-600 text-white hover:bg-red-700'
                            }`}
                          >
                            <Minus size={16} />
                          </button>

                          {/* Campo editável para quantidade */}
                          {editandoQuantidade === insumo.produto_id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                inputMode={getIncremento(insumo.unidade_medida) === 1 ? 'numeric' : 'decimal'}
                                value={quantidadeTemp}
                                onChange={(e) => {
                                  const fracionado = getIncremento(insumo.unidade_medida) !== 1;
                                  setQuantidadeTemp(sanitizeQuantidadeInput(e.target.value, fracionado));
                                }}
                                onBlur={() => {
                                  if (getIncremento(insumo.unidade_medida) !== 1) {
                                    setQuantidadeTemp(padQuantidadeFracionada(quantidadeTemp));
                                  }
                                  confirmarEdicaoQuantidade(insumo.produto_id);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    confirmarEdicaoQuantidade(insumo.produto_id);
                                  } else if (e.key === 'Escape') {
                                    cancelarEdicaoQuantidade();
                                  }
                                }}
                                className={`w-20 px-2 py-1 text-center text-sm ${removido ? 'bg-gray-800 text-gray-500' : 'bg-gray-700 text-white'} border border-gray-600 rounded focus:outline-none focus:border-primary-500`}
                                autoFocus
                                disabled={removido}
                              />
                              <span className="text-xs text-gray-400">{insumo.unidade_medida}</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => !removido && iniciarEdicaoQuantidade(insumo.produto_id)}
                              className={`font-medium w-20 text-center text-sm rounded px-2 py-1 transition-colors ${removido ? 'text-gray-500 bg-gray-800 line-through' : 'text-white hover:bg-gray-700'}`}
                              disabled={removido}
                            >
                              {formatarQuantidadeDisplay(quantidade, insumo.unidade_medida)}
                            </button>
                          )}
                        </>
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
