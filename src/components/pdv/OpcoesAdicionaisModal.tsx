import React, { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showMessage } from '../../utils/toast';

interface OpcaoAdicional {
  id: string;
  nome: string;
  quantidade_minima?: number;
  quantidade_maxima?: number;
  itens: OpcaoAdicionalItem[];
}

interface OpcaoAdicionalItem {
  id: string;
  nome: string;
  preco: number;
  opcao_id: string;
}

interface ItemSelecionado {
  item: OpcaoAdicionalItem;
  quantidade: number;
}

interface OpcoesAdicionaisModalProps {
  isOpen: boolean;
  onClose: () => void;
  produto: {
    id: string;
    nome: string;
    preco: number;
  };
  onConfirm: (itensSelecionados: ItemSelecionado[]) => void;
  // ✅ NOVO: Props para tabela de preços
  trabalhaComTabelaPrecos?: boolean;
  tabelaPrecoSelecionada?: string;
}

const OpcoesAdicionaisModal: React.FC<OpcoesAdicionaisModalProps> = ({
  isOpen,
  onClose,
  produto,
  onConfirm,
  trabalhaComTabelaPrecos = false,
  tabelaPrecoSelecionada = 'padrao'
}) => {
  const [opcoes, setOpcoes] = useState<OpcaoAdicional[]>([]);
  const [itensSelecionados, setItensSelecionados] = useState<ItemSelecionado[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [opcaoExpandida, setOpcaoExpandida] = useState<string | null>(null);
  // ✅ NOVO: Estado para preços dos adicionais por tabela
  const [adicionaisPrecos, setAdicionaisPrecos] = useState<{[itemId: string]: {[tabelaId: string]: number}}>({});

  // Carregar opções adicionais do produto quando o modal abrir
  useEffect(() => {
    if (isOpen && produto.id) {
      loadOpcoesAdicionais();
    }
  }, [isOpen, produto.id]);

  // Limpar seleções quando o modal fechar
  useEffect(() => {
    if (!isOpen) {
      setItensSelecionados([]);
      setOpcaoExpandida(null);
    }
  }, [isOpen]);

  // ✅ NOVA FUNÇÃO: Carregar preços dos adicionais por tabela
  const carregarPrecosAdicionais = async (itensAdicionais: OpcaoAdicionalItem[]): Promise<{[itemId: string]: {[tabelaId: string]: number}}> => {
    if (!trabalhaComTabelaPrecos || tabelaPrecoSelecionada === 'padrao') {
      return {};
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return {};

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return {};

      // Buscar preços dos adicionais para a tabela selecionada
      const idsItens = itensAdicionais.map(item => item.id);

      const { data: precosData, error } = await supabase
        .from('adicionais_precos')
        .select('adicional_item_id, tabela_preco_id, preco')
        .eq('empresa_id', usuarioData.empresa_id)
        .in('adicional_item_id', idsItens);

      if (error) {
        return {};
      }

      // Organizar preços por item e tabela
      const precosMap: {[itemId: string]: {[tabelaId: string]: number}} = {};

      precosData?.forEach(preco => {
        if (!precosMap[preco.adicional_item_id]) {
          precosMap[preco.adicional_item_id] = {};
        }
        precosMap[preco.adicional_item_id][preco.tabela_preco_id] = preco.preco;
      });

      setAdicionaisPrecos(precosMap);
      return precosMap;
    } catch (error) {
      console.error('Erro ao carregar preços dos adicionais:', error);
      return {};
    }
  };

  const loadOpcoesAdicionais = async () => {
    try {
      setIsLoading(true);

      // Buscar opções adicionais vinculadas ao produto
      const { data: produtoOpcoesData, error: produtoOpcoesError } = await supabase
        .from('produtos_opcoes_adicionais')
        .select(`
          opcao:opcoes_adicionais (
            id,
            nome,
            quantidade_minima,
            quantidade_maxima,
            itens:opcoes_adicionais_itens (
              id,
              nome,
              preco,
              opcao_id
            )
          )
        `)
        .eq('produto_id', produto.id)
        .eq('deletado', false);

      if (produtoOpcoesError) {
        showMessage('error', 'Erro ao carregar opções adicionais');
        return;
      }

      // Filtrar e organizar as opções
      let opcoesFormatadas = (produtoOpcoesData || [])
        .map(item => item.opcao)
        .filter(opcao => opcao && opcao.itens && opcao.itens.length > 0)
        .map(opcao => ({
          ...opcao,
          itens: opcao.itens.filter(item => item && item.nome && item.preco !== undefined)
        }));

      // ✅ NOVO: Se trabalha com tabelas de preços, carregar preços e filtrar itens
      if (trabalhaComTabelaPrecos && tabelaPrecoSelecionada !== 'padrao') {
        // Coletar todos os itens adicionais
        const todosItens = opcoesFormatadas.flatMap(opcao => opcao.itens);

        // Carregar preços dos adicionais e obter o mapa de preços
        const precosCarregados = await carregarPrecosAdicionais(todosItens);

        // Filtrar opções para mostrar apenas itens que têm preço na tabela selecionada
        opcoesFormatadas = opcoesFormatadas
          .map(opcao => ({
            ...opcao,
            itens: opcao.itens.filter(item => {
              const temPrecoNaTabela = precosCarregados[item.id]?.[tabelaPrecoSelecionada] > 0;
              return temPrecoNaTabela;
            })
          }))
          .filter(opcao => opcao.itens.length > 0); // Remover opções sem itens válidos
      }

      setOpcoes(opcoesFormatadas);

      // Se houver apenas uma opção, expandir automaticamente
      if (opcoesFormatadas.length === 1) {
        setOpcaoExpandida(opcoesFormatadas[0].id);
      }

    } catch (error) {
      showMessage('error', 'Erro ao carregar opções adicionais');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleOpcao = (opcaoId: string) => {
    setOpcaoExpandida(opcaoExpandida === opcaoId ? null : opcaoId);
  };

  // ✅ NOVA FUNÇÃO: Obter preço correto do adicional conforme tabela selecionada
  const obterPrecoAdicional = (item: OpcaoAdicionalItem): number => {
    if (!trabalhaComTabelaPrecos || tabelaPrecoSelecionada === 'padrao') {
      return item.preco; // Usar preço padrão
    }

    // Usar preço da tabela selecionada se disponível
    const precoTabela = adicionaisPrecos[item.id]?.[tabelaPrecoSelecionada];
    return precoTabela > 0 ? precoTabela : item.preco;
  };

  const adicionarItem = (item: OpcaoAdicionalItem) => {
    // ✅ VERIFICAR SE PODE INCREMENTAR (QUANTIDADE MÁXIMA)
    if (!podeIncrementarItem(item.id)) {
      // Encontrar o nome da opção para mostrar mensagem mais clara
      const opcaoDoItem = opcoes.find(opcao =>
        opcao.itens.some(opcaoItem => opcaoItem.id === item.id)
      );

      const nomeOpcao = opcaoDoItem?.nome || 'esta opção';
      const quantidadeMaxima = opcaoDoItem?.quantidade_maxima || 0;

      showMessage('error', `Quantidade máxima de ${quantidadeMaxima} ${quantidadeMaxima === 1 ? 'item' : 'itens'} atingida para ${nomeOpcao}.`);
      return;
    }

    setItensSelecionados(prev => {
      const itemExistente = prev.find(i => i.item.id === item.id);

      if (itemExistente) {
        return prev.map(i =>
          i.item.id === item.id
            ? { ...i, quantidade: i.quantidade + 1 }
            : i
        );
      } else {
        // ✅ NOVO: Usar preço correto conforme tabela selecionada
        const itemComPrecoCorreto = {
          ...item,
          preco: obterPrecoAdicional(item)
        };
        return [...prev, { item: itemComPrecoCorreto, quantidade: 1 }];
      }
    });
  };

  const removerItem = (itemId: string) => {
    setItensSelecionados(prev => {
      const itemExistente = prev.find(i => i.item.id === itemId);

      if (itemExistente && itemExistente.quantidade > 1) {
        return prev.map(i =>
          i.item.id === itemId
            ? { ...i, quantidade: i.quantidade - 1 }
            : i
        );
      } else {
        return prev.filter(i => i.item.id !== itemId);
      }
    });
  };

  const getQuantidadeItem = (itemId: string): number => {
    const item = itensSelecionados.find(i => i.item.id === itemId);
    return item ? item.quantidade : 0;
  };

  const calcularTotal = (): number => {
    return itensSelecionados.reduce((total, item) => {
      // ✅ NOVO: Usar preço correto (já está correto no item.item.preco após seleção)
      return total + (item.item.preco * item.quantidade);
    }, 0);
  };

  const verificarQuantidadeMinima = (): { valido: boolean; opcoesInvalidas: Array<{ nome: string; selecionada: number; minima: number }> } => {
    const opcoesInvalidas: Array<{ nome: string; selecionada: number; minima: number }> = [];

    // Só validar opções que têm itens selecionados
    // Se o usuário não selecionou nada de uma opção, não precisa validar quantidade mínima
    for (const opcao of opcoes) {
      if (!opcao.quantidade_minima || opcao.quantidade_minima <= 0) continue;

      const quantidadeSelecionada = itensSelecionados
        .filter(item => opcao.itens.some(opcaoItem => opcaoItem.id === item.item.id))
        .reduce((total, item) => total + item.quantidade, 0);

      // Só validar se o usuário selecionou pelo menos um item desta opção
      // Isso significa que ele "entrou" nesta opção e precisa cumprir a quantidade mínima
      if (quantidadeSelecionada > 0 && quantidadeSelecionada < opcao.quantidade_minima) {
        opcoesInvalidas.push({
          nome: opcao.nome,
          selecionada: quantidadeSelecionada,
          minima: opcao.quantidade_minima
        });
      }
    }

    return {
      valido: opcoesInvalidas.length === 0,
      opcoesInvalidas
    };
  };

  const verificarQuantidadeMaxima = (): { valido: boolean; opcoesInvalidas: Array<{ nome: string; selecionada: number; maxima: number }> } => {
    const opcoesInvalidas: Array<{ nome: string; selecionada: number; maxima: number }> = [];

    // Validar opções que têm quantidade máxima definida e itens selecionados
    for (const opcao of opcoes) {
      if (!opcao.quantidade_maxima || opcao.quantidade_maxima <= 0) continue;

      const quantidadeSelecionada = itensSelecionados
        .filter(item => opcao.itens.some(opcaoItem => opcaoItem.id === item.item.id))
        .reduce((total, item) => total + item.quantidade, 0);

      // Verificar se excedeu a quantidade máxima
      if (quantidadeSelecionada > opcao.quantidade_maxima) {
        opcoesInvalidas.push({
          nome: opcao.nome,
          selecionada: quantidadeSelecionada,
          maxima: opcao.quantidade_maxima
        });
      }
    }

    return {
      valido: opcoesInvalidas.length === 0,
      opcoesInvalidas
    };
  };

  const getQuantidadeSelecionadaPorOpcao = (opcaoId: string): number => {
    const opcao = opcoes.find(o => o.id === opcaoId);
    if (!opcao) return 0;

    return itensSelecionados
      .filter(item => opcao.itens.some(opcaoItem => opcaoItem.id === item.item.id))
      .reduce((total, item) => total + item.quantidade, 0);
  };

  const podeIncrementarItem = (itemId: string): boolean => {
    // Encontrar a opção que contém este item
    const opcaoDoItem = opcoes.find(opcao =>
      opcao.itens.some(item => item.id === itemId)
    );

    if (!opcaoDoItem) return true;

    // Se não tem quantidade máxima definida, pode incrementar
    if (!opcaoDoItem.quantidade_maxima || opcaoDoItem.quantidade_maxima <= 0) return true;

    // Verificar se incrementar este item faria a opção exceder o máximo
    const quantidadeAtualOpcao = getQuantidadeSelecionadaPorOpcao(opcaoDoItem.id);
    return quantidadeAtualOpcao < opcaoDoItem.quantidade_maxima;
  };

  const handleConfirmar = () => {
    const validacaoMinima = verificarQuantidadeMinima();
    const validacaoMaxima = verificarQuantidadeMaxima();

    if (!validacaoMinima.valido) {
      const mensagem = `Quantidade mínima não atingida para: ${validacaoMinima.opcoesInvalidas.map(opcao =>
        `${opcao.nome} (${opcao.selecionada}/${opcao.minima})`
      ).join(', ')}`;
      showMessage('error', mensagem);
      return;
    }

    if (!validacaoMaxima.valido) {
      const mensagem = `Quantidade máxima excedida para: ${validacaoMaxima.opcoesInvalidas.map(opcao =>
        `${opcao.nome} (${opcao.selecionada}/${opcao.maxima})`
      ).join(', ')}`;
      showMessage('error', mensagem);
      return;
    }

    onConfirm(itensSelecionados);
    onClose();
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-900 rounded-lg flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Opções Adicionais</h2>
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
              <div className="text-gray-400">Carregando opções...</div>
            </div>
          ) : opcoes.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center text-gray-400">
                <p className="text-lg font-medium mb-2">Nenhuma opção adicional</p>
                <p className="text-sm">Este produto não possui opções adicionais configuradas</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {opcoes.map(opcao => (
                <div key={opcao.id} className="bg-gray-800/50 rounded-lg overflow-hidden">
                  {/* Cabeçalho da Opção */}
                  <button
                    onClick={() => toggleOpcao(opcao.id)}
                    className="w-full p-3 text-left flex items-center justify-between hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-medium">{opcao.nome}</h3>
                        {/* Indicadores de quantidade mínima e máxima */}
                        <div className="flex items-center gap-2">
                          {/* Indicador de quantidade mínima */}
                          {opcao.quantidade_minima && opcao.quantidade_minima > 0 && (
                            <div className="flex items-center gap-1">
                              {(() => {
                                const quantidadeSelecionada = getQuantidadeSelecionadaPorOpcao(opcao.id);
                                const atingiuMinimo = quantidadeSelecionada >= opcao.quantidade_minima;
                                return (
                                  <>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                      atingiuMinimo
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                      Mín: {quantidadeSelecionada}/{opcao.quantidade_minima}
                                    </span>
                                    {atingiuMinimo && (
                                      <span className="text-green-400 text-sm">✓</span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          )}

                          {/* Indicador de quantidade máxima */}
                          {opcao.quantidade_maxima && opcao.quantidade_maxima > 0 && (
                            <div className="flex items-center gap-1">
                              {(() => {
                                const quantidadeSelecionada = getQuantidadeSelecionadaPorOpcao(opcao.id);
                                const excedeuMaximo = quantidadeSelecionada > opcao.quantidade_maxima;
                                return (
                                  <>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                      excedeuMaximo
                                        ? 'bg-red-500/20 text-red-400'
                                        : 'bg-blue-500/20 text-blue-400'
                                    }`}>
                                      Máx: {quantidadeSelecionada}/{opcao.quantidade_maxima}
                                    </span>
                                    {excedeuMaximo && (
                                      <span className="text-red-400 text-sm">⚠️</span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-400">
                        {opcao.itens.length} {opcao.itens.length === 1 ? 'opção' : 'opções'}
                        {opcao.quantidade_minima && opcao.quantidade_minima > 0 && (
                          <span className="ml-2 text-yellow-400">
                            (Mín: {opcao.quantidade_minima})
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-gray-400">
                      {opcaoExpandida === opcao.id ? '−' : '+'}
                    </div>
                  </button>

                  {/* Itens da Opção */}
                  {opcaoExpandida === opcao.id && (
                    <div className="border-t border-gray-700 p-3 space-y-2">
                      {opcao.itens.map(item => {
                        const quantidade = getQuantidadeItem(item.id);
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2 bg-gray-700/30 rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="text-white font-medium">{item.nome}</p>
                              <p className="text-sm text-gray-400">
                                {/* ✅ NOVO: Usar preço correto conforme tabela selecionada */}
                                {obterPrecoAdicional(item) > 0 ? `+ ${formatCurrency(obterPrecoAdicional(item))}` : 'Grátis'}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {quantidade > 0 && (
                                <>
                                  <button
                                    onClick={() => removerItem(item.id)}
                                    className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors"
                                  >
                                    <Minus size={16} />
                                  </button>
                                  <span className="text-white font-medium w-8 text-center">
                                    {quantidade}
                                  </span>
                                </>
                              )}
                              <button
                                onClick={() => adicionarItem(item)}
                                disabled={!podeIncrementarItem(item.id)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                  !podeIncrementarItem(item.id)
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
              ))}
            </div>
          )}
        </div>

        {/* Rodapé */}
        {opcoes.length > 0 && (
          <div className="p-4 border-t border-gray-800">
            {itensSelecionados.length > 0 && (
              <div className="mb-3 p-3 bg-gray-800/50 rounded-lg">
                <p className="text-sm text-gray-400 mb-2">Itens selecionados:</p>
                <div className="space-y-1">
                  {itensSelecionados.map(item => (
                    <div key={item.item.id} className="flex justify-between text-sm">
                      <span className="text-white">
                        {item.quantidade}x {item.item.nome}
                      </span>
                      <span className="text-primary-400">
                        {formatCurrency(item.item.preco * item.quantidade)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-700 mt-2 pt-2 flex justify-between font-medium">
                  <span className="text-white">Total dos adicionais:</span>
                  <span className="text-primary-400">{formatCurrency(calcularTotal())}</span>
                </div>
              </div>
            )}

            {/* Avisos de validação */}
            {(() => {
              const validacaoMinima = verificarQuantidadeMinima();
              const validacaoMaxima = verificarQuantidadeMaxima();

              return (
                <>
                  {/* Aviso de quantidade mínima não atingida */}
                  {!validacaoMinima.valido && (
                    <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-400">
                        <span className="text-sm">⚠️</span>
                        <span className="text-sm font-medium">Quantidade mínima não atingida</span>
                      </div>
                      <p className="text-xs text-yellow-300 mt-1">
                        {validacaoMinima.opcoesInvalidas.map(opcao =>
                          `${opcao.nome}: ${opcao.selecionada}/${opcao.minima}`
                        ).join(' • ')}
                      </p>
                    </div>
                  )}

                  {/* Aviso de quantidade máxima excedida */}
                  {!validacaoMaxima.valido && (
                    <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-center gap-2 text-red-400">
                        <span className="text-sm">🚫</span>
                        <span className="text-sm font-medium">Quantidade máxima excedida</span>
                      </div>
                      <p className="text-xs text-red-300 mt-1">
                        {validacaoMaxima.opcoesInvalidas.map(opcao =>
                          `${opcao.nome}: ${opcao.selecionada}/${opcao.maxima}`
                        ).join(' • ')}
                      </p>
                    </div>
                  )}
                </>
              );
            })()}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              {(() => {
                const validacaoMinima = verificarQuantidadeMinima();
                const validacaoMaxima = verificarQuantidadeMaxima();
                const podeConfirmar = validacaoMinima.valido && validacaoMaxima.valido;

                let titleMessage = '';
                if (!validacaoMinima.valido) {
                  titleMessage += `Quantidade mínima não atingida para: ${validacaoMinima.opcoesInvalidas.map(opcao => `${opcao.nome} (${opcao.selecionada}/${opcao.minima})`).join(', ')}`;
                }
                if (!validacaoMaxima.valido) {
                  if (titleMessage) titleMessage += ' | ';
                  titleMessage += `Quantidade máxima excedida para: ${validacaoMaxima.opcoesInvalidas.map(opcao => `${opcao.nome} (${opcao.selecionada}/${opcao.maxima})`).join(', ')}`;
                }

                return (
                  <button
                    onClick={handleConfirmar}
                    disabled={!podeConfirmar}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                      podeConfirmar
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                    title={!podeConfirmar ? titleMessage : ''}
                  >
                    Confirmar
                  </button>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpcoesAdicionaisModal;
