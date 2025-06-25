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
  const [loadingInicial, setLoadingInicial] = useState(true);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  // Estados para filtros
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [ambiente, setAmbiente] = useState(''); // 1=Produção, 2=Homologação
  const [tipoVenda, setTipoVenda] = useState(''); // 'nfce' ou 'vendas'
  const [incluirValor, setIncluirValor] = useState(true);
  const [incluirProdutos, setIncluirProdutos] = useState(true);
  const [incluirAdicionais, setIncluirAdicionais] = useState(true);

  // Estados específicos para comissões
  const [vendedorSelecionado, setVendedorSelecionado] = useState('');
  const [vendedores, setVendedores] = useState<any[]>([]);

  // Estados para dados dos relatórios
  const [dadosVendas, setDadosVendas] = useState<any[]>([]);
  const [dadosComissoes, setDadosComissoes] = useState<any[]>([]);
  const [ambienteAtual, setAmbienteAtual] = useState<string>('');

  useEffect(() => {
    const carregarDadosIniciais = async () => {
      try {
        console.log('=== CARREGANDO DADOS INICIAIS ===');

        // Usar abordagem direta do Supabase em vez do withSessionCheck
        const { data: session, error: sessionError } = await supabase.auth.getSession();

        console.log('Sessão obtida:', { session: session?.session, error: sessionError });

        if (sessionError) {
          console.error('Erro ao obter sessão:', sessionError);
          return;
        }

        if (!session?.session?.user) {
          console.error('Usuário não encontrado na sessão');
          return;
        }

        const user = session.session.user;
        console.log('Usuário da sessão:', user);
        console.log('Buscando dados do usuário ID:', user.id);

        // Buscar dados do usuário e empresa
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('empresa_id')
          .eq('id', user.id)
          .single();

        console.log('Resultado da consulta usuários:', { userData, userError });

        if (userError) {
          console.error('Erro ao buscar dados do usuário:', userError);
          return;
        }

        if (userData?.empresa_id) {
          console.log('✅ Empresa ID encontrado:', userData.empresa_id);
          setEmpresaId(userData.empresa_id);
          await carregarAmbienteAtual(userData.empresa_id);
        } else {
          console.error('❌ Empresa ID não encontrado para o usuário');
        }
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
      } finally {
        setLoadingInicial(false);
      }
    };

    carregarDadosIniciais();
  }, []);

  const carregarAmbienteAtual = async (empresaId: string) => {
    try {
      console.log('Carregando ambiente para empresa:', empresaId);

      const { data, error } = await supabase
        .from('nfe_config')
        .select('ambiente')
        .eq('empresa_id', empresaId)
        .single();

      console.log('Resultado da consulta nfe_config:', { data, error });

      if (error) {
        console.warn('Erro ao buscar configuração NFe:', error);
        setAmbienteAtual('2'); // Default para homologação
        return;
      }

      // Converter de 'homologacao'/'producao' para '2'/'1'
      const ambienteConvertido = data?.ambiente === 'producao' ? '1' : '2';
      console.log('Ambiente convertido:', ambienteConvertido);
      setAmbienteAtual(ambienteConvertido);
    } catch (error) {
      console.error('Erro ao carregar ambiente atual:', error);
      setAmbienteAtual('2'); // Default para homologação
    }
  };

  const carregarVendedores = async (empresaId: string) => {
    try {
      console.log('Carregando vendedores para empresa:', empresaId);

      const { data, error } = await supabase
        .from('vendedor_comissao')
        .select(`
          id,
          usuario_id,
          percentual_comissao,
          tipo_comissao,
          usuarios!inner(nome)
        `)
        .eq('empresa_id', empresaId)
        .eq('ativo', true);

      console.log('Resultado da consulta vendedores:', { data, error });

      if (data && !error) {
        setVendedores(data);
      }
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
    }
  };

  const handleSectionChange = (section: 'vendas' | 'comissoes') => {
    setActiveSection(section);

    // Carregar vendedores quando mudar para comissões
    if (section === 'comissoes' && empresaId && vendedores.length === 0) {
      carregarVendedores(empresaId);
    }
  };

  const testarAutenticacao = async () => {
    try {
      console.log('=== TESTE DE AUTENTICAÇÃO ===');

      // Testar sessão do Supabase
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      console.log('Sessão Supabase:', { session: session?.session, error: sessionError });

      if (session?.session?.user) {
        const user = session.session.user;
        console.log('Usuário da sessão:', user);

        // Testar consulta na tabela usuarios
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', user.id);

        console.log('Consulta tabela usuarios:', { userData, userError });

        if (userData && userData.length > 0) {
          console.log('✅ Usuário encontrado na tabela usuarios');
          console.log('Dados do usuário:', userData[0]);
        } else {
          console.log('❌ Usuário não encontrado na tabela usuarios');
        }
      } else {
        console.log('❌ Usuário não encontrado na sessão');
      }
    } catch (error) {
      console.error('Erro no teste de autenticação:', error);
    }
  };

  const gerarRelatorioVendas = async () => {
    console.log('=== INICIANDO GERAÇÃO DE RELATÓRIO ===');
    console.log('Empresa ID:', empresaId);
    console.log('Estado atual:', { empresaId, loading });

    if (!empresaId) {
      console.error('❌ Empresa ID não definido - não é possível gerar relatório');
      alert('Erro: Empresa não identificada. Tente recarregar a página.');
      return;
    }

    setLoading(true);
    try {
      console.log('Filtros aplicados:', { dataInicio, dataFim, ambiente, tipoVenda, incluirValor, incluirProdutos, incluirAdicionais });

      // Primeiro, vamos verificar se há dados na tabela PDV
      console.log('Testando conexão com tabela PDV...');
      const { data: testData, error: testError } = await supabase
        .from('pdv')
        .select('id, created_at, valor_total, nome_cliente, status_venda, modelo_documento, status_fiscal')
        .eq('empresa_id', empresaId)
        .limit(10);

      console.log('Resultado do teste PDV:', {
        totalRegistros: testData?.length || 0,
        dados: testData,
        erro: testError
      });

      if (testError) {
        console.error('Erro na consulta de teste:', testError);
        throw testError;
      }

      // Usar consulta simples primeiro para PDV
      console.log('Executando consulta principal do PDV...');

      let query = supabase
        .from('pdv')
        .select(`
          id,
          created_at,
          valor_total,
          nome_cliente,
          status_venda,
          status_fiscal,
          modelo_documento,
          numero_venda,
          data_venda
        `)
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false })
        .limit(50); // Limitar para teste

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

      // Buscar produtos e adicionais separadamente se necessário
      console.log('Verificando condições para buscar produtos/adicionais:');
      console.log('- dadosFiltrados.length:', dadosFiltrados.length);
      console.log('- incluirProdutos:', incluirProdutos);
      console.log('- incluirAdicionais:', incluirAdicionais);
      console.log('- Condição atendida:', dadosFiltrados.length > 0 && (incluirProdutos || incluirAdicionais));

      if (dadosFiltrados.length > 0 && (incluirProdutos || incluirAdicionais)) {
        console.log('✅ Buscando produtos e adicionais...');

        const pdvIds = dadosFiltrados.map(venda => venda.id);

        // Buscar produtos se solicitado
        let produtosPorPdv = {};
        if (incluirProdutos) {
          console.log('Buscando produtos para PDVs:', pdvIds);
          const { data: produtosData, error: produtosError } = await supabase
            .from('pdv_itens')
            .select(`
              id,
              pdv_id,
              nome_produto,
              quantidade,
              valor_unitario,
              valor_total_item,
              codigo_produto
            `)
            .in('pdv_id', pdvIds)
            .eq('empresa_id', empresaId);

          console.log('Produtos encontrados:', { produtosData, produtosError });
          console.log('Total de produtos encontrados:', produtosData?.length || 0);

          if (produtosData && !produtosError) {
            produtosPorPdv = produtosData.reduce((acc, produto) => {
              if (!acc[produto.pdv_id]) acc[produto.pdv_id] = [];
              acc[produto.pdv_id].push(produto);
              return acc;
            }, {});
            console.log('Produtos organizados por PDV:', produtosPorPdv);
          }
        }

        // Buscar adicionais se solicitado
        let adicionaisPorPdv = {};
        if (incluirAdicionais) {
          console.log('Buscando adicionais para PDVs:', pdvIds);
          const { data: adicionaisData, error: adicionaisError } = await supabase
            .from('pdv_itens_adicionais')
            .select(`
              id,
              pdv_item_id,
              nome_adicional,
              quantidade,
              valor_unitario,
              valor_total,
              pdv_itens!inner(pdv_id)
            `)
            .eq('empresa_id', empresaId);

          console.log('Adicionais encontrados:', { adicionaisData, adicionaisError });

          if (adicionaisData && !adicionaisError) {
            adicionaisPorPdv = adicionaisData.reduce((acc, adicional) => {
              const pdvId = adicional.pdv_itens?.pdv_id;
              if (pdvId) {
                if (!acc[pdvId]) acc[pdvId] = [];
                acc[pdvId].push(adicional);
              }
              return acc;
            }, {});
          }
        }

        // Combinar dados
        const vendasComDetalhes = dadosFiltrados.map(venda => ({
          ...venda,
          pdv_itens: produtosPorPdv[venda.id] || [],
          pdv_itens_adicionais: adicionaisPorPdv[venda.id] || []
        }));

        console.log('Vendas com detalhes:', vendasComDetalhes);
        setDadosVendas(vendasComDetalhes);
      } else {
        setDadosVendas(dadosFiltrados);
      }

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
      console.log('=== INICIANDO GERAÇÃO DE RELATÓRIO DE COMISSÕES ===');
      console.log('Filtros aplicados:', {
        dataInicio,
        dataFim,
        ambiente,
        tipoVenda,
        vendedorSelecionado
      });

      // Buscar itens de vendas com informações dos vendedores
      let query = supabase
        .from('pdv_itens')
        .select(`
          id,
          pdv_id,
          produto_id,
          nome_produto,
          quantidade,
          valor_unitario,
          valor_total_item,
          vendedor_id,
          vendedor_nome,
          pdv!inner(
            created_at,
            empresa_id,
            status_venda,
            status_fiscal,
            modelo_documento,
            nome_cliente
          )
        `)
        .eq('pdv.empresa_id', empresaId)
        .order('pdv.created_at', { ascending: false });

      // Aplicar filtro por vendedor se selecionado
      if (vendedorSelecionado) {
        query = query.eq('vendedor_id', vendedorSelecionado);
      }

      // Aplicar filtros de data
      if (dataInicio) {
        query = query.gte('pdv.created_at', `${dataInicio}T00:00:00`);
      }
      if (dataFim) {
        query = query.lte('pdv.created_at', `${dataFim}T23:59:59`);
      }

      // Filtro por tipo de venda
      if (tipoVenda === 'nfce') {
        query = query.eq('pdv.modelo_documento', 65);
      } else if (tipoVenda === 'vendas') {
        query = query.is('pdv.modelo_documento', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      let dadosFiltrados = data || [];

      // Filtrar por ambiente no frontend
      if (ambiente) {
        if (ambiente === '1') {
          dadosFiltrados = dadosFiltrados.filter(item => {
            if (item.pdv.modelo_documento === 65) {
              return ambienteAtual === '1';
            }
            return false;
          });
        } else if (ambiente === '2') {
          dadosFiltrados = dadosFiltrados.filter(item => {
            if (item.pdv.modelo_documento === 65) {
              return ambienteAtual === '2';
            }
            return true;
          });
        }
      }

      // Calcular comissões baseado na configuração dos vendedores
      // Mostrar apenas itens que têm vendedor configurado
      const comissoes = dadosFiltrados
        .map((item) => {
          // Buscar configuração de comissão do vendedor
          const vendedorConfig = vendedores.find(v => v.usuario_id === item.vendedor_id);

          if (!vendedorConfig) {
            return null; // Não incluir itens sem vendedor configurado
          }

          let percentualComissao = 0;
          let nomeVendedor = item.vendedor_nome || vendedorConfig.usuarios?.nome || 'Vendedor sem nome';

          if (vendedorConfig.tipo_comissao === 'grupos') {
            // Para comissão por grupos, usar 5% como exemplo
            percentualComissao = 5;
          } else {
            percentualComissao = parseFloat(vendedorConfig.percentual_comissao) || 0;
          }

          const valorComissao = (item.valor_total_item * percentualComissao) / 100;

          return {
            id: item.id,
            data_venda: item.pdv.created_at,
            tipo_venda: item.pdv.modelo_documento === 65 ? 'NFC-e' : 'Venda',
            cliente: item.pdv.nome_cliente || 'Consumidor Final',
            produto: item.nome_produto,
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario,
            valor_total: item.valor_total_item,
            nome_vendedor: nomeVendedor,
            percentual_comissao: percentualComissao,
            valor_comissao: valorComissao
          };
        })
        .filter(Boolean); // Remove valores null

      setDadosComissoes(comissoes);
      console.log('Comissões calculadas:', comissoes.length, 'registros');

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
        <div className={`grid grid-cols-1 gap-4 ${activeSection === 'comissoes' ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
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
          {/* Filtro de vendedor - apenas para comissões */}
          {activeSection === 'comissoes' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Vendedor
              </label>
              <select
                value={vendedorSelecionado}
                onChange={(e) => setVendedorSelecionado(e.target.value)}
                className="w-full px-3 py-2 bg-background-dark border border-gray-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
              >
                <option value="">Todos os vendedores</option>
                {vendedores.map((vendedor) => (
                  <option key={vendedor.usuario_id} value={vendedor.usuario_id}>
                    {vendedor.usuarios?.nome || 'Vendedor sem nome'}
                  </option>
                ))}
              </select>
            </div>
          )}
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
                        return 'Venda';
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
                          R$ {venda.valor_total?.toFixed(2) || '0,00'}
                        </td>
                      )}
                      {incluirProdutos && (
                        <td className="px-4 py-3 text-sm text-gray-300">
                          <div className="max-w-xs">
                            {venda.pdv_itens && venda.pdv_itens.length > 0 && (
                              venda.pdv_itens.map((item: any, itemIndex: number) => (
                                <div key={itemIndex} className="text-xs mb-1 p-1 bg-gray-800/30 rounded">
                                  <div className="font-medium text-white">{item.nome_produto || 'Produto sem nome'}</div>
                                  <div className="text-gray-400">
                                    Qtd: {item.quantidade || 0} |
                                    Unit: R$ {item.valor_unitario?.toFixed(2) || '0,00'} |
                                    Total: R$ {item.valor_total_item?.toFixed(2) || '0,00'}
                                  </div>
                                  {item.codigo_produto && (
                                    <div className="text-gray-500 text-xs">Cód: {item.codigo_produto}</div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </td>
                      )}
                      {incluirAdicionais && (
                        <td className="px-4 py-3 text-sm text-gray-300">
                          <div className="max-w-xs">
                            {venda.pdv_itens_adicionais && venda.pdv_itens_adicionais.length > 0 && (
                              venda.pdv_itens_adicionais.map((adicional: any, addIndex: number) => (
                                <div key={addIndex} className="text-xs mb-1 p-1 bg-blue-800/20 rounded">
                                  <div className="font-medium text-blue-300">{adicional.nome_adicional}</div>
                                  <div className="text-gray-400">
                                    Qtd: {adicional.quantidade || 0} |
                                    Unit: R$ {adicional.valor_unitario?.toFixed(2) || '0,00'} |
                                    Total: R$ {adicional.valor_total?.toFixed(2) || '0,00'}
                                  </div>
                                </div>
                              ))
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

              {/* Footer com totalizadores */}
              <tfoot className="bg-gray-800/50 border-t border-gray-700">
                <tr>
                  <td colSpan={incluirValor ? 4 : 3} className="px-4 py-3 text-sm font-semibold text-gray-300">
                    TOTAIS:
                  </td>
                  {incluirProdutos && (
                    <td className="px-4 py-3 text-sm text-gray-300">
                      <div className="text-xs">
                        {(() => {
                          const totalProdutos = dadosVendas.reduce((acc, venda) => {
                            const produtos = venda.pdv_itens || [];
                            return acc + produtos.length;
                          }, 0);

                          const totalQuantidadeProdutos = dadosVendas.reduce((acc, venda) => {
                            const produtos = venda.pdv_itens || [];
                            return acc + produtos.reduce((sum, item) => sum + (parseFloat(item.quantidade) || 0), 0);
                          }, 0);

                          const totalValorProdutos = dadosVendas.reduce((acc, venda) => {
                            const produtos = venda.pdv_itens || [];
                            return acc + produtos.reduce((sum, item) => sum + (parseFloat(item.valor_total_item) || 0), 0);
                          }, 0);

                          return (
                            <div className="space-y-1">
                              <div className="font-semibold text-white">
                                {totalProdutos} produto{totalProdutos !== 1 ? 's' : ''}
                              </div>
                              <div className="text-gray-400">
                                Qtd: {totalQuantidadeProdutos.toFixed(3)}
                              </div>
                              <div className="text-green-400 font-medium">
                                Total: R$ {totalValorProdutos.toFixed(2)}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                  )}
                  {incluirAdicionais && (
                    <td className="px-4 py-3 text-sm text-gray-300">
                      <div className="text-xs">
                        {(() => {
                          const totalAdicionais = dadosVendas.reduce((acc, venda) => {
                            const adicionais = venda.pdv_itens_adicionais || [];
                            return acc + adicionais.length;
                          }, 0);

                          const totalQuantidadeAdicionais = dadosVendas.reduce((acc, venda) => {
                            const adicionais = venda.pdv_itens_adicionais || [];
                            return acc + adicionais.reduce((sum, item) => sum + (parseFloat(item.quantidade) || 0), 0);
                          }, 0);

                          const totalValorAdicionais = dadosVendas.reduce((acc, venda) => {
                            const adicionais = venda.pdv_itens_adicionais || [];
                            return acc + adicionais.reduce((sum, item) => sum + (parseFloat(item.valor_total) || 0), 0);
                          }, 0);

                          return totalAdicionais > 0 ? (
                            <div className="space-y-1">
                              <div className="font-semibold text-blue-300">
                                {totalAdicionais} adicional{totalAdicionais !== 1 ? 'is' : ''}
                              </div>
                              <div className="text-gray-400">
                                Qtd: {totalQuantidadeAdicionais.toFixed(3)}
                              </div>
                              <div className="text-blue-400 font-medium">
                                Total: R$ {totalValorAdicionais.toFixed(2)}
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {/* Coluna Status Fiscal - vazia no footer */}
                  </td>
                </tr>
              </tfoot>
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
                    Produto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Qtd
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Valor Unit.
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Valor Total
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    % Comissão
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Valor Comissão
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {dadosComissoes.map((comissao, index) => {
                  return (
                    <tr key={index} className="hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {new Date(comissao.data_venda).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          comissao.tipo_venda === 'NFC-e' ? 'bg-primary-500/10 text-primary-400' : 'bg-gray-500/10 text-gray-400'
                        }`}>
                          {comissao.tipo_venda}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {comissao.produto}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {comissao.nome_vendedor}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 text-right">
                        {comissao.quantidade?.toFixed(3) || '0,000'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 text-right">
                        R$ {comissao.valor_unitario?.toFixed(2) || '0,00'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 text-right">
                        R$ {comissao.valor_total?.toFixed(2) || '0,00'}
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-400 text-right">
                        {comissao.percentual_comissao?.toFixed(1) || '0,0'}%
                      </td>
                      <td className="px-4 py-3 text-sm text-green-400 text-right font-semibold">
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

  // Mostrar loading inicial
  if (loadingInicial) {
    return (
      <div className="flex min-h-[calc(100vh-120px)] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando dados da empresa...</p>
        </div>
      </div>
    );
  }

  // Mostrar erro se não conseguiu carregar empresa
  if (!empresaId) {
    return (
      <div className="flex min-h-[calc(100vh-120px)] items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-white mb-2">Erro ao carregar dados</h2>
          <p className="text-gray-400 mb-4">Não foi possível identificar sua empresa.</p>

          <div className="bg-gray-800 rounded-lg p-4 mb-4 text-left">
            <h3 className="text-sm font-semibold text-white mb-2">Debug Info:</h3>
            <p className="text-xs text-gray-400">
              • Abra o Console (F12) para ver logs detalhados<br/>
              • Verifique se você está logado corretamente<br/>
              • Empresa ID: {empresaId || 'undefined'}
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={testarAutenticacao}
              className="w-full px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 font-semibold"
            >
              🔍 Testar Autenticação (Ver Console)
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              Recarregar Página
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-120px)] gap-6">
      {/* Sidebar de Relatórios */}
      <div className="w-40 bg-background-card rounded-lg border border-gray-800 p-4 flex flex-col overflow-hidden h-full">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">Relatórios</h2>
        </div>

        <nav className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
          {/* Seção Vendas */}
          <div className="mb-4">
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
