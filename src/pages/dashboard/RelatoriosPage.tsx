import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, DollarSign, Users, Calendar, FileText, Download, Filter } from 'lucide-react';
import { useAuthSession } from '../../hooks/useAuthSession';
import { supabase } from '../../lib/supabase';
import Button from '../../components/comum/Button';

const RelatoriosPage: React.FC = () => {
  const { withSessionCheck } = useAuthSession();
  const [activeSection, setActiveSection] = useState<'vendas' | 'comissoes'>('vendas');
  const [loading, setLoading] = useState(false);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  // Estados para filtros
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [ambiente, setAmbiente] = useState(''); // 1=Produção, 2=Homologação
  const [tipoVenda, setTipoVenda] = useState(''); // 'nfce' ou 'vendas'
  const [incluirValor, setIncluirValor] = useState(true);
  const [incluirProdutos, setIncluirProdutos] = useState(false);
  const [incluirAdicionais, setIncluirAdicionais] = useState(false);

  // Estados para dados dos relatórios
  const [dadosVendas, setDadosVendas] = useState<any[]>([]);
  const [dadosComissoes, setDadosComissoes] = useState<any[]>([]);
  const [ambienteAtual, setAmbienteAtual] = useState<string>('');

  useEffect(() => {
    withSessionCheck(async (user) => {
      try {
        // Buscar dados do usuário e empresa
        const { data: userData } = await supabase
          .from('usuarios')
          .select('empresa_id')
          .eq('id', user.id)
          .single();

        if (userData?.empresa_id) {
          setEmpresaId(userData.empresa_id);
          await carregarAmbienteAtual(userData.empresa_id);
        }
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
      }
    });
  }, []);

  const carregarAmbienteAtual = async (empresaId: string) => {
    try {
      const { data, error } = await supabase
        .from('nfe_config')
        .select('ambiente')
        .eq('empresa_id', empresaId)
        .single();

      if (error) throw error;

      // Converter de 'homologacao'/'producao' para '2'/'1'
      setAmbienteAtual(data?.ambiente === 'producao' ? '1' : '2');
    } catch (error) {
      console.error('Erro ao carregar ambiente atual:', error);
      setAmbienteAtual('2'); // Default para homologação
    }
  };

  const handleSectionChange = (section: 'vendas' | 'comissoes') => {
    setActiveSection(section);
  };

  const gerarRelatorioVendas = async () => {
    if (!empresaId) return;

    setLoading(true);
    try {
      console.log('Gerando relatório para empresa:', empresaId);
      console.log('Filtros:', { dataInicio, dataFim, ambiente, tipoVenda, incluirValor, incluirProdutos, incluirAdicionais });

      // Primeiro, vamos verificar se há dados na tabela PDV
      const { data: testData, error: testError } = await supabase
        .from('pdv')
        .select('id, status_venda, created_at, total')
        .eq('empresa_id', empresaId)
        .limit(5);

      console.log('Dados de teste na tabela PDV:', { testData, testError });

      // Começar com consulta simples para testar
      let selectFields = `*`;

      console.log('Select fields:', selectFields);

      let query = supabase
        .from('pdv')
        .select(selectFields)
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (dataInicio) {
        query = query.gte('created_at', `${dataInicio}T00:00:00`);
      }
      if (dataFim) {
        query = query.lte('created_at', `${dataFim}T23:59:59`);
      }

      // Filtro por tipo de venda
      if (tipoVenda === 'nfce') {
        // Apenas vendas com NFC-e (modelo_documento = 65)
        query = query.eq('modelo_documento', 65);
      } else if (tipoVenda === 'vendas') {
        // Apenas vendas sem NFC-e (modelo_documento is null)
        query = query.is('modelo_documento', null);
      }

      console.log('Executando query...');
      const { data, error } = await query;

      console.log('Resultado da query:', { data, error });

      if (error) {
        console.error('Erro na query:', error);
        throw error;
      }

      let dadosFiltrados = data || [];

      // Filtrar por ambiente no frontend
      if (ambiente) {
        if (ambiente === '1') {
          // Produção - filtrar apenas vendas com NFC-e que foram emitidas em produção
          // Para simplificar, vamos considerar que vendas recentes com NFC-e são de produção
          // e vendas mais antigas ou sem NFC-e são de homologação
          dadosFiltrados = dadosFiltrados.filter(venda => {
            if (venda.modelo_documento === 65) {
              // Para NFC-e, verificar se foi emitida em produção (ambiente atual)
              return ambienteAtual === '1';
            }
            return false; // Vendas sem NFC-e não têm ambiente
          });
        } else if (ambiente === '2') {
          // Homologação - filtrar vendas de teste
          dadosFiltrados = dadosFiltrados.filter(venda => {
            if (venda.modelo_documento === 65) {
              // Para NFC-e, verificar se foi emitida em homologação
              return ambienteAtual === '2';
            }
            return true; // Vendas sem NFC-e podem ser consideradas de homologação
          });
        }
      }

      setDadosVendas(dadosFiltrados);
      console.log('Dados carregados:', dadosFiltrados.length, 'registros');

      if (dadosFiltrados.length === 0) {
        console.log('Nenhuma venda encontrada para os filtros selecionados');
      } else {
        console.log(`${dadosFiltrados.length} vendas encontradas`);
      }
    } catch (error) {
      console.error('Erro ao gerar relatório de vendas:', error);
      console.error('Detalhes do erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const gerarRelatorioComissoes = async () => {
    if (!empresaId) return;

    setLoading(true);
    try {
      // Por enquanto, vamos manter uma estrutura básica para comissões
      // que pode ser expandida futuramente quando o sistema de vendedores for implementado
      let query = supabase
        .from('pdv')
        .select(`
          *,
          usuarios(nome)
        `)
        .eq('empresa_id', empresaId)
        .eq('status', 'finalizada')
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (dataInicio) {
        query = query.gte('created_at', `${dataInicio}T00:00:00`);
      }
      if (dataFim) {
        query = query.lte('created_at', `${dataFim}T23:59:59`);
      }

      // Filtro por tipo de venda
      if (tipoVenda === 'nfce') {
        query = query.eq('modelo_documento', 65);
      } else if (tipoVenda === 'vendas') {
        query = query.is('modelo_documento', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      let dadosFiltrados = data || [];

      // Filtrar por ambiente no frontend
      if (ambiente) {
        if (ambiente === '1') {
          // Produção
          dadosFiltrados = dadosFiltrados.filter(venda => {
            if (venda.modelo_documento === 65) {
              return ambienteAtual === '1';
            }
            return false;
          });
        } else if (ambiente === '2') {
          // Homologação
          dadosFiltrados = dadosFiltrados.filter(venda => {
            if (venda.modelo_documento === 65) {
              return ambienteAtual === '2';
            }
            return true;
          });
        }
      }

      // Por enquanto, comissões serão 0 até implementarmos o sistema de vendedores
      const comissoes = dadosFiltrados.map(venda => ({
        ...venda,
        valor_comissao: 0
      }));

      setDadosComissoes(comissoes);
    } catch (error) {
      console.error('Erro ao gerar relatório de comissões:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportarCSV = (dados: any[], nomeArquivo: string) => {
    if (dados.length === 0) return;

    const headers = Object.keys(dados[0]).join(',');
    const rows = dados.map(item => Object.values(item).join(','));
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nomeArquivo}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderFiltros = () => (
    <div className="bg-background-card rounded-lg border border-gray-800 p-4 mb-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Filter size={20} />
        Filtros
      </h3>
      <div className="space-y-4">
        {/* Primeira linha de filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Data Início
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-3 py-2 bg-background-dark border border-gray-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Data Fim
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full px-3 py-2 bg-background-dark border border-gray-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Ambiente
            </label>
            <select
              value={ambiente}
              onChange={(e) => setAmbiente(e.target.value)}
              className="w-full px-3 py-2 bg-background-dark border border-gray-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
            >
              <option value="">Todos os ambientes</option>
              <option value="1">Produção</option>
              <option value="2">Homologação</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tipo de Venda
            </label>
            <select
              value={tipoVenda}
              onChange={(e) => setTipoVenda(e.target.value)}
              className="w-full px-3 py-2 bg-background-dark border border-gray-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
            >
              <option value="">Todas as vendas</option>
              <option value="nfce">NFC-e</option>
              <option value="vendas">Vendas (sem NFC-e)</option>
            </select>
          </div>
        </div>

        {/* Segunda linha - Filtros de dados e botão */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Dados a Incluir
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={incluirValor}
                  onChange={(e) => setIncluirValor(e.target.checked)}
                  className="mr-2 rounded border-gray-600 bg-background-dark text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-300">Valor</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={incluirProdutos}
                  onChange={(e) => setIncluirProdutos(e.target.checked)}
                  className="mr-2 rounded border-gray-600 bg-background-dark text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-300">Produtos</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={incluirAdicionais}
                  onChange={(e) => setIncluirAdicionais(e.target.checked)}
                  className="mr-2 rounded border-gray-600 bg-background-dark text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-300">Adicionais</span>
              </label>
            </div>
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="primary"
              onClick={activeSection === 'vendas' ? gerarRelatorioVendas : gerarRelatorioComissoes}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Gerando...' : 'Gerar Relatório'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRelatorioVendas = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Relatório de Vendas</h2>
          <p className="text-gray-400 mt-1">Visualize e analise suas vendas por período</p>
        </div>
        {dadosVendas.length > 0 && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => exportarCSV(dadosVendas, 'relatorio-vendas')}
          >
            <Download size={16} className="mr-2" />
            Exportar CSV
          </Button>
        )}
      </div>

      {renderFiltros()}

      {dadosVendas.length > 0 && (
        <div className="bg-background-card rounded-lg border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Cliente
                  </th>
                  {incluirValor && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Total
                    </th>
                  )}
                  {incluirProdutos && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Produtos
                    </th>
                  )}
                  {incluirAdicionais && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Adicionais
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status Fiscal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {dadosVendas.map((venda, index) => {
                  const tipoVenda = venda.modelo_documento === 65 ? 'NFC-e' : 'Venda';
                  const statusFiscal = venda.status_fiscal || 'nao_fiscal';

                  const getStatusColor = (status: string) => {
                    switch (status) {
                      case 'autorizada':
                        return 'bg-green-500/10 text-green-400';
                      case 'pendente':
                        return 'bg-yellow-500/10 text-yellow-400';
                      case 'cancelada':
                        return 'bg-red-500/10 text-red-400';
                      case 'nao_fiscal':
                        return 'bg-blue-500/10 text-blue-400';
                      default:
                        return 'bg-gray-500/10 text-gray-400';
                    }
                  };

                  const getStatusText = (status: string) => {
                    switch (status) {
                      case 'autorizada':
                        return 'Autorizada';
                      case 'pendente':
                        return 'Pendente';
                      case 'cancelada':
                        return 'Cancelada';
                      case 'nao_fiscal':
                        return 'Não Fiscal';
                      default:
                        return status;
                    }
                  };

                  return (
                    <tr key={index} className="hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {new Date(venda.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          tipoVenda === 'NFC-e' ? 'bg-primary-500/10 text-primary-400' : 'bg-gray-500/10 text-gray-400'
                        }`}>
                          {tipoVenda}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {venda.nome_cliente || 'Consumidor Final'}
                      </td>
                      {incluirValor && (
                        <td className="px-4 py-3 text-sm text-gray-300 text-right">
                          R$ {venda.total?.toFixed(2) || '0,00'}
                        </td>
                      )}
                      {incluirProdutos && (
                        <td className="px-4 py-3 text-sm text-gray-300">
                          <div className="max-w-xs">
                            {venda.pdv_itens?.map((item: any, itemIndex: number) => (
                              <div key={itemIndex} className="text-xs mb-1">
                                <span className="font-medium">{item.nome_produto}</span>
                                <span className="text-gray-400 ml-1">
                                  (Qtd: {item.quantidade} - R$ {item.valor_total_item?.toFixed(2)})
                                </span>
                              </div>
                            )) || <span className="text-gray-500">Nenhum produto</span>}
                          </div>
                        </td>
                      )}
                      {incluirAdicionais && (
                        <td className="px-4 py-3 text-sm text-gray-300">
                          <div className="max-w-xs">
                            {venda.pdv_itens?.flatMap((item: any) =>
                              item.pdv_itens_adicionais?.map((adicional: any, addIndex: number) => (
                                <div key={addIndex} className="text-xs mb-1">
                                  <span className="font-medium">{adicional.nome_adicional}</span>
                                  <span className="text-gray-400 ml-1">
                                    (Qtd: {adicional.quantidade} - R$ {adicional.valor_total?.toFixed(2)})
                                  </span>
                                </div>
                              )) || []
                            ).length > 0 ? (
                              venda.pdv_itens?.flatMap((item: any) =>
                                item.pdv_itens_adicionais?.map((adicional: any, addIndex: number) => (
                                  <div key={addIndex} className="text-xs mb-1">
                                    <span className="font-medium">{adicional.nome_adicional}</span>
                                    <span className="text-gray-400 ml-1">
                                      (Qtd: {adicional.quantidade} - R$ {adicional.valor_total?.toFixed(2)})
                                    </span>
                                  </div>
                                )) || []
                              )
                            ) : (
                              <span className="text-gray-500">Nenhum adicional</span>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(statusFiscal)}`}>
                          {getStatusText(statusFiscal)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dadosVendas.length === 0 && !loading && (
        <div className="bg-background-card rounded-lg border border-gray-800 p-8 text-center">
          <BarChart3 size={48} className="mx-auto text-gray-500 mb-4" />
          <p className="text-gray-400">Nenhuma venda encontrada para os filtros selecionados</p>
        </div>
      )}
    </div>
  );

  const renderRelatorioComissoes = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Relatório de Comissões</h2>
          <p className="text-gray-400 mt-1">Acompanhe as comissões dos vendedores</p>
        </div>
        {dadosComissoes.length > 0 && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => exportarCSV(dadosComissoes, 'relatorio-comissoes')}
          >
            <Download size={16} className="mr-2" />
            Exportar CSV
          </Button>
        )}
      </div>

      {renderFiltros()}

      {dadosComissoes.length > 0 && (
        <div className="bg-background-card rounded-lg border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Valor Venda
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Valor Comissão
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {dadosComissoes.map((comissao, index) => {
                  const tipoVenda = comissao.modelo_documento === 65 ? 'NFC-e' : 'Venda';

                  return (
                    <tr key={index} className="hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {new Date(comissao.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          tipoVenda === 'NFC-e' ? 'bg-primary-500/10 text-primary-400' : 'bg-gray-500/10 text-gray-400'
                        }`}>
                          {tipoVenda}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {comissao.nome_cliente || 'Consumidor Final'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 text-right">
                        R$ {comissao.total?.toFixed(2) || '0,00'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400 text-right font-semibold">
                        R$ {comissao.valor_comissao?.toFixed(2) || '0,00'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dadosComissoes.length === 0 && !loading && (
        <div className="bg-background-card rounded-lg border border-gray-800 p-8 text-center">
          <DollarSign size={48} className="mx-auto text-gray-500 mb-4" />
          <p className="text-gray-400">Nenhuma comissão encontrada para os filtros selecionados</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-120px)] gap-6">
      {/* Sidebar de Relatórios */}
      <div className="w-80 bg-background-card rounded-lg border border-gray-800 p-4 flex flex-col overflow-hidden h-full">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">Relatórios</h2>
          <p className="text-gray-400 text-sm">Analise o desempenho do seu negócio</p>
        </div>

        <nav className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
          {/* Seção Vendas */}
          <div className="mb-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Análises</h3>
            <button
              onClick={() => handleSectionChange('vendas')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                activeSection === 'vendas'
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <BarChart3 size={18} />
              <span className="text-sm">Vendas</span>
            </button>
            <button
              onClick={() => handleSectionChange('comissoes')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                activeSection === 'comissoes'
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <DollarSign size={18} />
              <span className="text-sm">Comissões</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Área de Conteúdo */}
      <div className="flex-1 bg-background-card rounded-lg border border-gray-800 p-6 overflow-y-auto custom-scrollbar">
        {activeSection === 'vendas' && renderRelatorioVendas()}
        {activeSection === 'comissoes' && renderRelatorioComissoes()}
      </div>
    </div>
  );
};

export default RelatoriosPage;
