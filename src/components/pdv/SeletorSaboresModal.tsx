import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Check, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Produto {
  id: string;
  nome: string;
  preco: number;
  codigo: string;
  grupo_id: string;
  produto_fotos?: Array<{
    id: string;
    url: string;
    principal: boolean;
  }>;
}

interface TabelaPreco {
  id: string;
  nome: string;
  quantidade_sabores: number;
  permite_meio_a_meio: boolean;
}

interface SaborSelecionado {
  produto: Produto;
  porcentagem: number;
}

interface SeletorSaboresModalProps {
  isOpen: boolean;
  onClose: () => void;
  tabelaPreco: TabelaPreco;
  onConfirmar: (sabores: SaborSelecionado[], precoCalculado: number) => void;
  tipoPreco: 'sabor_mais_caro' | 'preco_medio';
  produtoAtual?: Produto; // ✅ NOVO: Produto que está sendo configurado (para excluir da lista)
}

export default function SeletorSaboresModal({
  isOpen,
  onClose,
  tabelaPreco,
  onConfirmar,
  tipoPreco,
  produtoAtual
}: SeletorSaboresModalProps) {
  const [saboresDisponiveis, setSaboresDisponiveis] = useState<Produto[]>([]);
  const [saboresSelecionados, setSaboresSelecionados] = useState<SaborSelecionado[]>([]);
  const [loading, setLoading] = useState(false);
  const [precoCalculado, setPrecoCalculado] = useState(0);

  // Carregar sabores disponíveis
  useEffect(() => {
    if (isOpen) {
      carregarSaboresDisponiveis();
    }
  }, [isOpen]);

  // Calcular preço quando sabores mudam
  useEffect(() => {
    calcularPreco();
  }, [saboresSelecionados, tipoPreco]);

  const carregarSaboresDisponiveis = async () => {
    try {
      setLoading(true);
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // ✅ BUSCAR TODOS OS PRODUTOS PIZZA DA EMPRESA (não apenas os com preço na tabela)
      const { data: produtosPizza, error } = await supabase
        .from('produtos')
        .select(`
          id,
          nome,
          codigo,
          grupo_id,
          deletado,
          ativo,
          pizza,
          preco
        `)
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('ativo', true)
        .or('deletado.is.null,deletado.eq.false')  // ✅ ACEITAR null OU false
        .eq('pizza', true);

      if (error) {
        console.error('Erro ao carregar sabores:', error);
        return;
      }

      // ✅ BUSCAR PREÇOS DA TABELA DE PREÇOS ESPECÍFICA
      const produtosIds = produtosPizza?.map(p => p.id) || [];
      let precosTabela: {[produtoId: string]: number} = {};

      if (produtosIds.length > 0 && tabelaPreco?.id) {
        const { data: precosData, error: precosError } = await supabase
          .from('produto_precos')
          .select('produto_id, preco')
          .eq('empresa_id', usuarioData.empresa_id)
          .eq('tabela_preco_id', tabelaPreco.id)
          .in('produto_id', produtosIds)
          .gt('preco', 0); // Apenas preços maiores que 0

        if (!precosError && precosData) {
          precosData.forEach(item => {
            precosTabela[item.produto_id] = item.preco;
          });
        }
      }

      // ✅ BUSCAR FOTOS DOS PRODUTOS PIZZA
      let fotosData: any[] = [];

      if (produtosIds.length > 0) {
        const { data: fotosResult, error: fotosError } = await supabase
          .from('produto_fotos')
          .select('produto_id, url, principal')
          .in('produto_id', produtosIds)
          .eq('principal', true); // Buscar apenas a foto principal

        if (!fotosError && fotosResult) {
          fotosData = fotosResult;
        }
      }

      // ✅ PROCESSAR PRODUTOS COM FOTOS E PREÇOS DA TABELA
      const produtosComFotos = (produtosPizza || []).map(produto => {
        const foto = fotosData.find(f => f.produto_id === produto.id);
        const precoTabela = precosTabela[produto.id];

        return {
          ...produto,
          preco: precoTabela || produto.preco, // Usar preço da tabela se disponível, senão preço padrão
          produto_fotos: foto ? [{
            id: foto.produto_id,
            url: foto.url,
            principal: true
          }] : []
        };
      });

      // ✅ PROCESSAR PRODUTOS (filtrar apenas os que têm preço > 0)
      let sabores = produtosComFotos.filter(produto => produto.preco > 0);

      // ✅ FILTRAR O PRODUTO ATUAL DA LISTA DE SABORES
      if (produtoAtual) {
        const saboresAntes = sabores.length;
        sabores = sabores.filter(sabor => sabor.id !== produtoAtual.id);
        console.log(`🍕 SABORES: Produto atual "${produtoAtual.nome}" (ID: ${produtoAtual.id}) removido da lista`);
        console.log(`🍕 SABORES: ${saboresAntes} → ${sabores.length} sabores após filtrar produto atual`);
      }

      console.log('🍕 SABORES PDV - TODOS OS PRODUTOS PIZZA:', {
        empresaId: usuarioData.empresa_id,
        tabelaId: tabelaPreco.id,
        totalProdutosPizza: produtosPizza?.length || 0,
        produtosPizza: produtosPizza?.map(produto => ({
          id: produto.id,
          nome: produto.nome,
          preco: produto.preco,
          pizza: produto.pizza,
          ativo: produto.ativo,
          deletado: produto.deletado
        })),
        saboresFinais: sabores.length,
        saboresFiltrados: sabores.map(s => ({
          id: s.id,
          nome: s.nome,
          preco: s.preco
        }))
      });

      setSaboresDisponiveis(sabores);
    } catch (error) {
      console.error('Erro ao carregar sabores:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularPreco = () => {
    if (saboresSelecionados.length === 0) {
      setPrecoCalculado(0);
      return;
    }

    let preco = 0;

    if (tipoPreco === 'sabor_mais_caro') {
      // Usar preço do sabor mais caro
      preco = Math.max(...saboresSelecionados.map(s => s.produto.preco));
    } else {
      // Calcular preço médio ponderado pela porcentagem
      const precoTotal = saboresSelecionados.reduce((total, sabor) => {
        return total + (sabor.produto.preco * sabor.porcentagem / 100);
      }, 0);
      preco = precoTotal;
    }

    setPrecoCalculado(preco);
  };

  const adicionarSabor = (produto: Produto) => {
    const saboresAtual = saboresSelecionados.length;
    
    if (saboresAtual >= tabelaPreco.quantidade_sabores) {
      return; // Máximo de sabores atingido
    }

    // Calcular porcentagem automática
    let porcentagem = 100;
    if (tabelaPreco.permite_meio_a_meio) {
      if (saboresAtual === 0) {
        porcentagem = tabelaPreco.quantidade_sabores === 2 ? 50 : Math.floor(100 / tabelaPreco.quantidade_sabores);
      } else {
        // Redistribuir porcentagens igualmente
        porcentagem = Math.floor(100 / (saboresAtual + 1));
      }
    }

    const novoSabor: SaborSelecionado = {
      produto,
      porcentagem
    };

    let novosSabores = [...saboresSelecionados, novoSabor];

    // Redistribuir porcentagens se meio a meio
    if (tabelaPreco.permite_meio_a_meio && novosSabores.length > 1) {
      const porcentagemIgual = Math.floor(100 / novosSabores.length);
      const resto = 100 - (porcentagemIgual * novosSabores.length);

      novosSabores = novosSabores.map((sabor, index) => ({
        ...sabor,
        porcentagem: porcentagemIgual + (index === 0 ? resto : 0)
      }));

      console.log(`🍕 SABORES: ${novosSabores.length} sabores selecionados`);
      console.log('🍕 SABORES: Porcentagens redistribuídas:', novosSabores.map(s => `${s.produto.nome}: ${s.porcentagem}%`));
    }

    setSaboresSelecionados(novosSabores);
  };

  const removerSabor = (index: number) => {
    const novosSabores = saboresSelecionados.filter((_, i) => i !== index);
    
    // Redistribuir porcentagens
    if (tabelaPreco.permite_meio_a_meio && novosSabores.length > 1) {
      const porcentagemIgual = Math.floor(100 / novosSabores.length);
      const resto = 100 - (porcentagemIgual * novosSabores.length);
      
      novosSabores.forEach((sabor, i) => {
        sabor.porcentagem = porcentagemIgual + (i === 0 ? resto : 0);
      });
    } else if (novosSabores.length === 1) {
      novosSabores[0].porcentagem = 100;
    }

    setSaboresSelecionados(novosSabores);
  };

  const confirmarSelecao = () => {
    if (saboresSelecionados.length === 0) return;
    
    onConfirmar(saboresSelecionados, precoCalculado);
    onClose();
    
    // Limpar seleção
    setSaboresSelecionados([]);
    setPrecoCalculado(0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para obter a foto principal do produto (similar ao carrinho)
  const getFotoPrincipal = (produto: Produto) => {
    if (!produto?.produto_fotos || produto.produto_fotos.length === 0) {
      return null;
    }

    // Buscar foto marcada como principal
    const fotoPrincipal = produto.produto_fotos.find((foto: any) => foto.principal);

    // Se não encontrar foto principal, retornar a primeira
    return fotoPrincipal || produto.produto_fotos[0];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">
              🍕 Selecionar Sabores - {tabelaPreco.nome}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {tabelaPreco.permite_meio_a_meio ? 'Meio a meio permitido' : 'Sabor único'} • 
              Máximo {tabelaPreco.quantidade_sabores} sabor{tabelaPreco.quantidade_sabores > 1 ? 'es' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex h-[calc(90vh-200px)]">
          {/* Lista de Sabores Disponíveis */}
          <div className="flex-1 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Sabores Disponíveis</h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
                <p className="text-gray-400 mt-2">Carregando sabores...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {saboresDisponiveis.map((produto) => {
                  const jaSelecionado = saboresSelecionados.some(s => s.produto.id === produto.id);
                  const podeAdicionar = saboresSelecionados.length < tabelaPreco.quantidade_sabores;
                  
                  return (
                    <div
                      key={produto.id}
                      className={`p-4 rounded-lg border transition-all cursor-pointer ${
                        jaSelecionado
                          ? 'border-green-500 bg-green-500/10'
                          : podeAdicionar
                          ? 'border-gray-600 bg-gray-700/50 hover:border-primary-500'
                          : 'border-gray-700 bg-gray-800/50 opacity-50 cursor-not-allowed'
                      }`}
                      onClick={() => !jaSelecionado && podeAdicionar && adicionarSabor(produto)}
                    >
                      <div className="flex items-center gap-3">
                        {/* Foto do sabor */}
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                          {(() => {
                            const fotoItem = getFotoPrincipal(produto);
                            return fotoItem ? (
                              <img
                                src={fotoItem.url}
                                alt={produto.nome}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package size={16} className="text-gray-500" />
                              </div>
                            );
                          })()}
                        </div>

                        {/* Informações do sabor */}
                        <div className="flex-1">
                          <h4 className="text-white font-medium">{produto.nome}</h4>
                          <p className="text-gray-400 text-sm">{formatCurrency(produto.preco)}</p>
                        </div>

                        {/* Indicador de selecionado */}
                        {jaSelecionado && (
                          <Check size={20} className="text-green-500" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sabores Selecionados */}
          <div className="w-80 bg-gray-900 p-6 border-l border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              Sabores Selecionados ({saboresSelecionados.length}/{tabelaPreco.quantidade_sabores})
            </h3>

            <div className="space-y-3 mb-6">
              {saboresSelecionados.map((sabor, index) => (
                <div key={index} className="p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    {/* Foto do sabor selecionado */}
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                      {(() => {
                        const fotoItem = getFotoPrincipal(sabor.produto);
                        return fotoItem ? (
                          <img
                            src={fotoItem.url}
                            alt={sabor.produto.nome}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package size={12} className="text-gray-500" />
                          </div>
                        );
                      })()}
                    </div>

                    {/* Nome do sabor */}
                    <span className="text-white font-medium text-sm flex-1">{sabor.produto.nome}</span>

                    {/* Botão remover */}
                    <button
                      onClick={() => removerSabor(index)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-sm ml-13">
                    <span className="text-gray-400">{formatCurrency(sabor.produto.preco)}</span>
                    {tabelaPreco.permite_meio_a_meio && (
                      <span className="text-primary-400 font-medium">{sabor.porcentagem}%</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Resumo do Preço */}
            {saboresSelecionados.length > 0 && (
              <div className="bg-gray-800 p-4 rounded-lg mb-6">
                <div className="text-center">
                  <p className="text-gray-400 text-sm mb-1">
                    Preço {tipoPreco === 'sabor_mais_caro' ? 'do sabor mais caro' : 'médio'}
                  </p>
                  <p className="text-2xl font-bold text-primary-400">
                    {formatCurrency(precoCalculado)}
                  </p>
                </div>
              </div>
            )}

            {/* Botão Confirmar */}
            <button
              onClick={confirmarSelecao}
              disabled={saboresSelecionados.length === 0}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Confirmar Seleção
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
