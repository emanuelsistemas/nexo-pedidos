import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, RotateCcw, Search } from 'lucide-react';
import { showMessage } from '../../utils/toast';
import { supabase } from '../../lib/supabase';

interface Insumo {
  produto_id: string;
  nome: string;
  quantidade: number;
  unidade_medida: string;
  quantidade_minima?: number;
  quantidade_maxima?: number;
  codigo?: string; // ✅ NOVO: Código do produto para busca
  selecionar_manualmente_insumo?: boolean; // ✅ NOVO: Habilitar/desabilitar manual por insumo
  adicionar_valor_insumo?: boolean; // ✅ NOVO: Incluir preço do insumo no total
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
  const [precosInsumos, setPrecosInsumos] = useState<Record<string, number>>({});
  const [editandoQuantidade, setEditandoQuantidade] = useState<string | null>(null);
  const [quantidadeTemp, setQuantidadeTemp] = useState<string>('');
  const [filtroInsumos, setFiltroInsumos] = useState<string>(''); // ✅ NOVO: Estado para filtro de busca

  // Limpar seleções quando o modal fechar
  useEffect(() => {
    if (!isOpen) {
      setInsumosSelecionados([]);
      setFiltroInsumos(''); // ✅ NOVO: Limpar filtro ao fechar modal
    }
  }, [isOpen]);

  // ✅ NOVO: Função para filtrar insumos por nome ou código
  const insumosFiltrados = produto.insumos?.filter(insumo => {
    if (!filtroInsumos.trim()) return true;

    const termoBusca = filtroInsumos.toLowerCase().trim();
    const nomeMatch = insumo.nome.toLowerCase().includes(termoBusca);
    const codigoMatch = insumo.codigo?.toLowerCase().includes(termoBusca);

    return nomeMatch || codigoMatch;
  }) || [];

  // Inicializar com quantidades padrão dos insumos e buscar preços quando necessário
  useEffect(() => {
    const carregar = async () => {
      if (isOpen && produto.insumos) {
        const insumosIniciais = produto.insumos.map(insumo => ({
          insumo,
          // Se o insumo exigir seleção manual, iniciar desabilitado (quantidade 0, removido)
          quantidade: insumo.selecionar_manualmente_insumo ? 0 : insumo.quantidade,
          removido: !!insumo.selecionar_manualmente_insumo
        }));
        setInsumosSelecionados(insumosIniciais);

        // Buscar preços dos insumos que podem incluir valor
        const idsArray = produto.insumos
          .filter(i => i.adicionar_valor_insumo)
          .map(i => i.produto_id);

        if (idsArray.length > 0) {
          try {
            // Descobrir empresa_id do usuário logado (RLS multi-tenant)
            const { data: authData } = await supabase.auth.getUser();
            const userId = authData.user?.id;
            let empresaId: string | null = null;
            if (userId) {
              const { data: usuarioRow } = await supabase
                .from('usuarios')
                .select('empresa_id')
                .eq('id', userId)
                .single();
              empresaId = usuarioRow?.empresa_id || null;
            }

            let query = supabase
              .from('produtos')
              .select('id, preco, promocao, valor_desconto');

            if (empresaId) query = query.eq('empresa_id', empresaId);

            const { data, error } = await query.in('id', idsArray);

            if (error) {
              console.error('Erro ao buscar preços dos insumos:', error);
              setPrecosInsumos({});
            } else if (data) {
              const mapa: Record<string, number> = {};
              data.forEach((p: any) => {
                let preco = p.preco || 0;
                if (p.promocao && p.valor_desconto) {
                  preco = Math.max(0, (p.preco || 0) - (p.valor_desconto || 0));
                }
                mapa[p.id] = preco;
              });
              setPrecosInsumos(mapa);
            }
          } catch (e) {
            console.error('Exceção ao carregar preços de insumos', e);
            setPrecosInsumos({});
          }
        } else {
          setPrecosInsumos({});
        }
      }
    };
    carregar();
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
    const ativos = insumosSelecionados.filter(i => (i.quantidade || 0) > 0)
      .map(i => ({
        ...i,
        // Propagar flags por insumo para o PDV calcular preço
        insumo: {
          ...i.insumo,
          selecionar_manualmente_insumo: i.insumo.selecionar_manualmente_insumo,
          adicionar_valor_insumo: i.insumo.adicionar_valor_insumo
        }
      }));
    onConfirm(ativos);
    onClose();
  };



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-900 rounded-lg flex flex-col h-[95vh]">
        {/* Cabeçalho */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-white whitespace-nowrap">Selecionar Insumos</h2>
            <div className="bg-primary-600/20 border border-primary-500/30 rounded-full px-3 py-1 flex-shrink-0">
              <span className="text-sm font-medium text-primary-300 truncate">{produto.nome}</span>
            </div>
            {/* Tag com o valor do produto (considerando promoção) + acréscimos habilitados */}
            <div className="bg-green-600/20 border border-green-500/30 rounded-full px-3 py-1 flex items-center gap-2 flex-shrink-0">
              {(() => {
                // Preço base do produto (com promoção, se houver)
                const precoBase = (produto as any).valor_promocional !== undefined
                  ? (produto as any).valor_promocional
                  : produto.preco;
                const emPromocao = (produto as any).valor_promocional !== undefined && (produto as any).valor_promocional < produto.preco;

                // Somar valores dos insumos habilitados e com adicionar_valor_insumo
                const acrescimo = insumosSelecionados.reduce((acc, sel) => {
                  const i = sel.insumo;
                  if (i.adicionar_valor_insumo && sel.quantidade > 0) {
                    const precoInsumo = precosInsumos[i.produto_id] || 0;
                    const unidade = (i.unidade_medida || '').toUpperCase();
                    const fator = unidade === 'UN' ? sel.quantidade : 1;
                    return acc + (precoInsumo * fator);
                  }
                  return acc;
                }, 0);

                const total = (precoBase || 0) + acrescimo;

                return (
                  <span className="text-sm">
                    {emPromocao ? (
                      <>
                        <span className="line-through text-gray-400 mr-2">{(produto.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        <span className="text-green-400 font-semibold">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </>
                    ) : (
                      <span className="text-green-400 font-semibold">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    )}
                  </span>
                );
              })()}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-gray-800 text-gray-400 hover:text-white transition-colors flex-shrink-0 ml-3"
          >
            <X size={20} />
          </button>
        </div>

        {/* ✅ NOVO: Campo de busca */}
        <div className="px-4 py-3 border-b border-gray-800 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar insumo por nome ou código..."
              value={filtroInsumos}
              onChange={(e) => setFiltroInsumos(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {filtroInsumos && (
              <button
                onClick={() => setFiltroInsumos('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Conteúdo com scroll interno */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
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
          ) : insumosFiltrados.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center text-gray-400">
                <Search className="mx-auto mb-3 text-gray-500" size={48} />
                <p className="text-lg font-medium mb-2">Nenhum insumo encontrado</p>
                <p className="text-sm">Tente buscar por outro nome ou código</p>
                {filtroInsumos && (
                  <button
                    onClick={() => setFiltroInsumos('')}
                    className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Limpar filtro
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {insumosFiltrados.map(insumo => {
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
                        {/* Mostrar preço do insumo quando a flag de incluir estiver ativa */}
                        {insumo.adicionar_valor_insumo && (
                          <span className="ml-2 text-green-400">
                            {(() => {
                              const preco = precosInsumos[insumo.produto_id] || 0;
                              return `+ ${preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
                            })()}
                          </span>
                        )}
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
                      {/* Checkbox para habilitar/desabilitar quando exigir seleção manual */}
                      {insumo.selecionar_manualmente_insumo && (
                        <label className="flex items-center gap-2 mr-2">
                          <input
                            type="checkbox"
                            checked={!removido}
                            onChange={(e) => {
                              const habilitar = e.target.checked;
                              setInsumosSelecionados(prev => {
                                const existente = prev.find(i => i.insumo.produto_id === insumo.produto_id);
                                if (!existente) {
                                  return [...prev, { insumo, quantidade: habilitar ? insumo.quantidade : 0, removido: !habilitar }];
                                }
                                return prev.map(i => i.insumo.produto_id === insumo.produto_id
                                  ? { ...i, quantidade: habilitar ? (i.quantidade > 0 ? i.quantidade : insumo.quantidade) : 0, removido: !habilitar }
                                  : i
                                );
                              });
                            }}
                            className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                          />
                          <span className="text-xs text-gray-300 whitespace-nowrap">Habilitar</span>
                        </label>
                      )}

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

        {/* Rodapé fixo */}
        <div className="p-4 border-t border-gray-800 flex gap-3 flex-shrink-0">
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
