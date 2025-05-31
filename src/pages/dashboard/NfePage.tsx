import React, { useState, useEffect } from 'react';
import { Plus, Edit, Eye, FileText, Search, Filter, ArrowLeft, Save, Send, Download, Copy, Trash2, X, Ban, Mail } from 'lucide-react';
import Button from '../../components/comum/Button';
import ProdutoSeletorModal from '../../components/comum/ProdutoSeletorModal';
import { supabase } from '../../lib/supabase';

interface NFe {
  id: string;
  serie_documento: number;
  numero_documento: number;
  modelo_documento: number; // 55 = NFe, 65 = NFC-e
  status_nfe: 'pendente' | 'autorizada' | 'cancelada' | 'rejeitada' | 'rascunho' | 'inutilizada';
  natureza_operacao: string;
  nome_cliente: string;
  created_at: string;
  valor_total: number;
  numero_nfe?: string;
  chave_nfe?: string;
  dados_nfe?: string; // JSON com dados completos da NFe para rascunhos
  data_rascunho?: string;
  usuario_rascunho?: string;
  observacoes_rascunho?: string;
}

const NfePage: React.FC = () => {
  const [nfes, setNfes] = useState<NFe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Estados para filtro avançado
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [naturezaFilter, setNaturezaFilter] = useState('');
  const [dataInicioFilter, setDataInicioFilter] = useState(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return hoje.toISOString().slice(0, 16);
  });
  const [dataFimFilter, setDataFimFilter] = useState(() => {
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    return hoje.toISOString().slice(0, 16);
  });

  // Adicionar CSS customizado para as bordas
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .nfe-border-blue {
        border-left: 4px solid #3B82F6 !important;
      }
      .nfe-border-green {
        border-left: 4px solid #10B981 !important;
      }
      .nfe-border-red {
        border-left: 4px solid #EF4444 !important;
      }
      .nfe-border-yellow {
        border-left: 4px solid #D97706 !important;
      }
      .nfe-border-orange {
        border-left: 4px solid #F59E0B !important;
      }
      .nfe-border-gray {
        border-left: 4px solid #6B7280 !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    loadNfes();
  }, []);

  const loadNfes = async () => {
    try {
      setIsLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      const { data: nfesData, error } = await supabase
        .from('pdv')
        .select('*')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('modelo_documento', 55) // Apenas NFe (modelo 55)
        .not('numero_documento', 'is', null) // Apenas registros com número de documento
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNfes(nfesData || []);
    } catch (error) {
      // Erro ao carregar NFes
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'autorizada':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'pendente':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'rascunho':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'cancelada':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'rejeitada':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'inutilizada':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  // Função para obter a cor da barra lateral da linha
  const getRowBorderColor = (status: string) => {
    switch (status) {
      case 'autorizada':
        return 'nfe-border-green'; // Verde para Emitido
      case 'rascunho':
        return 'nfe-border-blue'; // Azul para Rascunho
      case 'cancelada':
        return 'nfe-border-red'; // Vermelho para Cancelado
      case 'inutilizada':
        return 'nfe-border-yellow'; // Mostarda para Inutilizada
      case 'pendente':
        return 'nfe-border-orange'; // Amarelo para Pendente
      case 'rejeitada':
        return 'nfe-border-red'; // Vermelho para Rejeitada
      default:
        return 'nfe-border-gray'; // Cinza para outros
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'autorizada':
        return 'Emitido';
      case 'pendente':
        return 'Pendente';
      case 'rascunho':
        return 'Rascunho';
      case 'cancelada':
        return 'Cancelado';
      case 'rejeitada':
        return 'Rejeitada';
      case 'inutilizada':
        return 'Inutilizada';
      default:
        return status;
    }
  };

  // Funções para ações da NFe
  const handleInutilizar = (nfe: NFe) => {
    const confirmacao = confirm(
      `⚠️ ATENÇÃO: INUTILIZAÇÃO DE NFe\n\n` +
      `Você está prestes a INUTILIZAR a NFe nº ${nfe.numero_documento}.\n` +
      `Esta ação é IRREVERSÍVEL e deve ser usada apenas quando:\n\n` +
      `• A numeração foi pulada por erro\n` +
      `• Houve falha na emissão\n` +
      `• Necessário corrigir sequência numérica\n\n` +
      `Deseja continuar com a inutilização?`
    );

    if (confirmacao) {
      // TODO: Implementar chamada para API de inutilização
      showToast(`Funcionalidade de inutilização em desenvolvimento`, 'info');
    }
  };

  const handleCancelar = (nfe: NFe) => {
    if (nfe.status_nfe !== 'autorizada') {
      showToast('Apenas NFe autorizadas podem ser canceladas', 'error');
      return;
    }

    const justificativa = prompt(
      `CANCELAMENTO DE NFe\n\n` +
      `NFe nº ${nfe.numero_documento}\n` +
      `Cliente: ${nfe.nome_cliente}\n\n` +
      `Digite a justificativa do cancelamento (mínimo 15 caracteres):`
    );

    if (justificativa && justificativa.length >= 15) {
      const confirmacao = confirm(
        `⚠️ CONFIRMAR CANCELAMENTO\n\n` +
        `NFe: ${nfe.numero_documento}\n` +
        `Justificativa: ${justificativa}\n\n` +
        `Esta ação é IRREVERSÍVEL. Deseja continuar?`
      );

      if (confirmacao) {
        // TODO: Implementar chamada para API de cancelamento
        showToast(`Funcionalidade de cancelamento em desenvolvimento`, 'info');
      }
    } else if (justificativa !== null) {
      showToast('Justificativa deve ter pelo menos 15 caracteres', 'error');
    }
  };

  const handleReenviarEmail = (nfe: NFe) => {
    if (nfe.status_nfe !== 'autorizada') {
      showToast('Apenas NFe autorizadas podem ter email reenviado', 'error');
      return;
    }

    const email = prompt(
      `REENVIAR EMAIL DA NFe\n\n` +
      `NFe nº ${nfe.numero_documento}\n` +
      `Cliente: ${nfe.nome_cliente}\n\n` +
      `Digite o email de destino:`
    );

    if (email && email.includes('@')) {
      const confirmacao = confirm(
        `📧 CONFIRMAR REENVIO\n\n` +
        `NFe: ${nfe.numero_documento}\n` +
        `Email: ${email}\n\n` +
        `Deseja reenviar o XML e DANFE por email?`
      );

      if (confirmacao) {
        // TODO: Implementar chamada para API de reenvio de email
        showToast(`Funcionalidade de reenvio de email em desenvolvimento`, 'info');
        console.log('Reenviar email NFe:', nfe.id, 'Email:', email);
      }
    } else if (email !== null) {
      showToast('Digite um email válido', 'error');
    }
  };

  // Função para criar toasts
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success', duration: number = 4000) => {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    const icon = type === 'success'
      ? '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>'
      : type === 'error'
      ? '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>'
      : '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>';

    toast.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 transform transition-all duration-300 translate-x-0`;
    toast.innerHTML = `
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        ${icon}
      </svg>
      <span>${message}</span>
    `;

    document.body.appendChild(toast);

    // Animação de entrada
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 10);

    // Remover toast
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, duration);
  };

  // Função para criar nova NFe
  const handleNovaNFe = () => {
    setShowForm(true);

    // Disparar evento para resetar flag de edição no formulário
    setTimeout(() => {
      const event = new CustomEvent('resetEditingFlag');
      window.dispatchEvent(event);
    }, 100);
  };

  // Função para carregar e editar rascunho
  const handleEditarRascunho = async (rascunho: NFe) => {
    try {
      showToast(`Carregando rascunho NFe nº ${rascunho.numero_documento || 'S/N'}...`, 'info', 2000);

      // Criar um novo formulário com os dados do rascunho
      setShowForm(true);

      // Aguardar um pouco para o formulário ser montado
      setTimeout(async () => {
        // Disparar evento customizado para carregar o rascunho
        const event = new CustomEvent('loadRascunho', {
          detail: rascunho
        });
        window.dispatchEvent(event);

        showToast(`Rascunho NFe nº ${rascunho.numero_documento || 'S/N'} carregado! Continue editando...`, 'success', 3000);
      }, 500); // Aumentei o tempo para garantir que o formulário seja montado

    } catch (error) {
      showToast('Erro ao carregar rascunho para edição', 'error', 5000);
    }
  };

  const filteredNfes = nfes.filter(nfe => {
    const matchesSearch = (nfe.nome_cliente || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (nfe.numero_documento || 0).toString().includes(searchTerm) ||
                         (nfe.natureza_operacao || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'todos' || nfe.status_nfe === statusFilter;

    // Filtro por natureza da operação
    const matchesNatureza = !naturezaFilter ||
                           (nfe.natureza_operacao || '').toLowerCase().includes(naturezaFilter.toLowerCase());

    // Filtro por data
    const nfeDate = new Date(nfe.created_at);
    const dataInicio = new Date(dataInicioFilter);
    const dataFim = new Date(dataFimFilter);
    const matchesData = nfeDate >= dataInicio && nfeDate <= dataFim;

    return matchesSearch && matchesStatus && matchesNatureza && matchesData;
  });

  if (showForm) {
    return <NfeForm onBack={() => setShowForm(false)} onSave={loadNfes} />;
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Notas Fiscais Eletrônicas</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Botão de Filtro Avançado */}
          <button
            onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showAdvancedFilter
                ? 'bg-primary-600 border-primary-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
            }`}
            title="Filtros Avançados"
          >
            <Filter size={18} />
            Filtros

          </button>

          {/* Botão Nova NFe */}
          <Button
            variant="primary"
            onClick={() => {
              // Resetar flag de edição ao criar nova NFe
              setShowForm(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus size={20} />
            Nova NFe
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-background-card rounded-lg border border-gray-800 p-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por destinatário, número ou natureza..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            >
              <option value="todos">Todos os Status</option>
              <option value="rascunho">Rascunhos</option>
              <option value="pendente">Pendente</option>
              <option value="autorizada">Autorizada</option>
              <option value="cancelada">Cancelada</option>
              <option value="rejeitada">Rejeitada</option>
              <option value="inutilizada">Inutilizada</option>
            </select>
          </div>
        </div>

        {/* Filtros Avançados */}
        {showAdvancedFilter && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Filtro por Natureza da Operação */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Natureza da Operação
                </label>
                <select
                  value={naturezaFilter}
                  onChange={(e) => setNaturezaFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="">Todas as Naturezas</option>
                  <option value="VENDA">VENDA</option>
                  <option value="Venda de mercadoria">Venda de mercadoria</option>
                  <option value="VENDA DE MERCADORIA">VENDA DE MERCADORIA</option>
                  <option value="VENDA DE PRODUTOS">VENDA DE PRODUTOS</option>
                  <option value="VENDA DE SERVIÇOS">VENDA DE SERVIÇOS</option>
                  <option value="DEVOLUÇÃO">DEVOLUÇÃO</option>
                  <option value="DEVOLUÇÃO DE VENDA">DEVOLUÇÃO DE VENDA</option>
                  <option value="DEVOLUÇÃO DE COMPRA">DEVOLUÇÃO DE COMPRA</option>
                  <option value="REMESSA">REMESSA</option>
                  <option value="REMESSA PARA CONSERTO">REMESSA PARA CONSERTO</option>
                  <option value="REMESSA PARA DEMONSTRAÇÃO">REMESSA PARA DEMONSTRAÇÃO</option>
                  <option value="REMESSA PARA INDUSTRIALIZAÇÃO">REMESSA PARA INDUSTRIALIZAÇÃO</option>
                  <option value="RETORNO">RETORNO</option>
                  <option value="RETORNO DE CONSERTO">RETORNO DE CONSERTO</option>
                  <option value="RETORNO DE DEMONSTRAÇÃO">RETORNO DE DEMONSTRAÇÃO</option>
                  <option value="RETORNO DE INDUSTRIALIZAÇÃO">RETORNO DE INDUSTRIALIZAÇÃO</option>
                  <option value="TRANSFERÊNCIA">TRANSFERÊNCIA</option>
                  <option value="TRANSFERÊNCIA ENTRE FILIAIS">TRANSFERÊNCIA ENTRE FILIAIS</option>
                  <option value="CONSIGNAÇÃO">CONSIGNAÇÃO</option>
                  <option value="REMESSA EM CONSIGNAÇÃO">REMESSA EM CONSIGNAÇÃO</option>
                  <option value="RETORNO DE CONSIGNAÇÃO">RETORNO DE CONSIGNAÇÃO</option>
                  <option value="DEMONSTRAÇÃO">DEMONSTRAÇÃO</option>
                  <option value="BRINDE">BRINDE</option>
                  <option value="DOAÇÃO">DOAÇÃO</option>
                  <option value="AMOSTRA GRÁTIS">AMOSTRA GRÁTIS</option>
                  <option value="BONIFICAÇÃO">BONIFICAÇÃO</option>
                  <option value="TROCA">TROCA</option>
                  <option value="GARANTIA">GARANTIA</option>
                  <option value="OUTRAS">OUTRAS</option>
                </select>
              </div>

              {/* Filtro por Data Início */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Data/Hora Início
                </label>
                <input
                  type="datetime-local"
                  value={dataInicioFilter}
                  onChange={(e) => setDataInicioFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              {/* Filtro por Data Fim */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Data/Hora Fim
                </label>
                <input
                  type="datetime-local"
                  value={dataFimFilter}
                  onChange={(e) => setDataFimFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            {/* Botões de ação do filtro */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-400">
                {(naturezaFilter || dataInicioFilter || dataFimFilter) && (
                  <span>Filtros ativos: {[
                    naturezaFilter && 'Natureza',
                    (dataInicioFilter || dataFimFilter) && 'Data'
                  ].filter(Boolean).join(', ')}</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setNaturezaFilter('');
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    setDataInicioFilter(hoje.toISOString().slice(0, 16));
                    hoje.setHours(23, 59, 59, 999);
                    setDataFimFilter(hoje.toISOString().slice(0, 16));
                  }}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Limpar Filtros
                </button>

                <button
                  onClick={() => {
                    // Aplicar filtros (os filtros já são aplicados automaticamente)
                    setShowAdvancedFilter(false);
                  }}
                  className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  Aplicar Filtros
                </button>

                <button
                  onClick={() => setShowAdvancedFilter(false)}
                  className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid de NFes */}
      <div className="bg-background-card rounded-lg border border-gray-800 overflow-hidden h-[calc(100vh-180px)]">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
            <p className="text-gray-400 mt-2">Carregando NFes...</p>
          </div>
        ) : filteredNfes.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Nenhuma NFe encontrada</h3>
            <p className="text-gray-400 mb-4">
              {searchTerm || statusFilter !== 'todos'
                ? 'Nenhuma NFe corresponde aos filtros aplicados.'
                : 'Comece criando sua primeira NFe.'
              }
            </p>
            {!searchTerm && statusFilter === 'todos' && (
              <Button
                variant="primary"
                onClick={() => {
                  // Resetar flag de edição ao criar nova NFe
                  setShowForm(true);
                }}
                className="flex items-center gap-2 mx-auto"
              >
                <Plus size={20} />
                Nova NFe
              </Button>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Header fixo da tabela */}
            <div className="bg-gray-800/50 border-b border-gray-800">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-[8%] whitespace-nowrap">
                      Série
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-[10%] whitespace-nowrap">
                      Número
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-[12%] whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-[15%] whitespace-nowrap">
                      Natureza Op.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-[25%] whitespace-nowrap">
                      Destinatário
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-[12%] whitespace-nowrap">
                      Criado em
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-[10%] whitespace-nowrap">
                      R$ Total
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider w-[8%] whitespace-nowrap">
                      Ações
                    </th>
                  </tr>
                </thead>
              </table>
            </div>

            {/* Corpo da tabela com scroll */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full">
                <tbody className="divide-y divide-gray-800">
                  {filteredNfes.map((nfe) => {
                    const borderClass = getRowBorderColor(nfe.status_nfe);
                    return (
                    <tr key={nfe.id} className={`hover:bg-gray-800/30 transition-colors ${borderClass}`}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-white w-[8%]">
                        {nfe.serie_documento || 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-white w-[10%]">
                        {nfe.numero_documento || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap w-[12%]">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(nfe.status_nfe)}`}>
                          {getStatusLabel(nfe.status_nfe)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-white w-[15%]">
                        {nfe.natureza_operacao || 'VENDA'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-white w-[25%]">
                        {nfe.nome_cliente || 'Consumidor Final'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400 w-[12%]">
                        {new Date(nfe.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-white w-[10%]">
                        R$ {(nfe.valor_total || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium w-[8%]">
                        <div className="flex items-center justify-end gap-2">
                          {/* Botão Editar/Visualizar */}
                          <button
                            onClick={() => {
                              if (nfe.status_nfe === 'rascunho') {
                                handleEditarRascunho(nfe);
                              } else {
                                alert('Funcionalidade de visualização em desenvolvimento');
                              }
                            }}
                            className="text-blue-400 hover:text-blue-300 p-1"
                            title={nfe.status_nfe === 'rascunho' ? 'Continuar editando' : 'Visualizar'}
                          >
                            {nfe.status_nfe === 'rascunho' ? <Edit size={16} /> : <Eye size={16} />}
                          </button>

                          {/* Botão Inutilizar - apenas para NFe não autorizadas, não canceladas e não inutilizadas */}
                          {nfe.status_nfe !== 'autorizada' && nfe.status_nfe !== 'cancelada' && nfe.status_nfe !== 'inutilizada' && (
                            <button
                              onClick={() => handleInutilizar(nfe)}
                              className="text-orange-400 hover:text-orange-300 p-1"
                              title="Inutilizar NFe"
                            >
                              <Ban size={16} />
                            </button>
                          )}

                          {/* Botão Cancelar - apenas para NFe autorizadas */}
                          {nfe.status_nfe === 'autorizada' && (
                            <button
                              onClick={() => handleCancelar(nfe)}
                              className="text-red-400 hover:text-red-300 p-1"
                              title="Cancelar NFe"
                            >
                              <X size={16} />
                            </button>
                          )}

                          {/* Botão Reenviar Email - apenas para NFe autorizadas */}
                          {nfe.status_nfe === 'autorizada' && (
                            <button
                              onClick={() => handleReenviarEmail(nfe)}
                              className="text-green-400 hover:text-green-300 p-1"
                              title="Reenviar Email"
                            >
                              <Mail size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente do formulário de NFe com abas laterais
const NfeForm: React.FC<{ onBack: () => void; onSave: () => void }> = ({ onBack, onSave }) => {
  const [activeSection, setActiveSection] = useState('identificacao');
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingRascunho, setIsSavingRascunho] = useState(false);
  const [nfeEmitida, setNfeEmitida] = useState(false);
  const [ambienteNFe, setAmbienteNFe] = useState<'homologacao' | 'producao'>('homologacao');
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressSteps, setProgressSteps] = useState([
    { id: 'validacao', label: 'Validando dados da NFe', status: 'pending', message: '' },
    { id: 'geracao', label: 'Gerando XML da NFe', status: 'pending', message: '' },
    { id: 'sefaz', label: 'Enviando para SEFAZ', status: 'pending', message: '' },
    { id: 'banco', label: 'Salvando no banco de dados', status: 'pending', message: '' },
    { id: 'finalizacao', label: 'Finalizando processo', status: 'pending', message: '' }
  ]);
  const [logs, setLogs] = useState<string[]>([]);
  const [dadosAutorizacao, setDadosAutorizacao] = useState({
    chave_acesso: '',
    protocolo_uso: '',
    data_autorizacao: '',
    status: ''
  });
  const [isEditingRascunho, setIsEditingRascunho] = useState(false);
  const [rascunhoId, setRascunhoId] = useState<string | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [nfeData, setNfeData] = useState({
    identificacao: {
      modelo: 55,
      serie: 1,
      numero: '',
      data_emissao: new Date().toISOString().slice(0, 16),
      tipo_documento: '1',
      finalidade: '1',
      presenca: '9',
      natureza_operacao: 'VENDA'
    },
    destinatario: {
      documento: '',
      nome: '',
      endereco: '',
      numero: '',
      bairro: '',
      cidade: '',
      uf: '',
      cep: '',
      emails: [],
      ie_destinatario: '9',
      operacao: '1',
      consumidor_final: '1'
    },
    produtos: [],
    totais: {
      valor_produtos: 0,
      valor_desconto: 0,
      valor_total: 0,
      valor_pis: 0,
      valor_cofins: 0,
      valor_ipi: 0,
      valor_icms_bc: 0,
      valor_icms: 0,
      valor_fcp: 0,
      valor_icms_bc_st: 0,
      valor_icms_st: 0,
      valor_fcp_st: 0,
      valor_frete: 0,
      valor_seguro: 0,
      valor_outros: 0,
      valor_credito_sn: 0
    },
    pagamentos: [],
    chaves_ref: [],
    transportadora: {
      transportadora_id: '',
      transportadora_nome: '',
      transportadora_documento: '',
      transportadora_endereco: '',
      modalidade_frete: '9'
    },
    empresa: null
  });

  // Função para buscar próximo número NFe baseado na empresa
  const buscarProximoNumeroNFe = async (empresaId: string, modelo: number = 55, serie: number = 1) => {
    try {
      const { data, error } = await supabase
        .from('pdv')
        .select('numero_documento')
        .eq('empresa_id', empresaId)
        .eq('modelo_documento', modelo)
        .eq('serie_documento', serie)
        .order('numero_documento', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Erro ao buscar último número:', error);
        return 1;
      }

      // Se não encontrou nenhum registro, começar do 1
      if (!data || data.length === 0) {
        return 1;
      }

      const proximoNumero = (data[0].numero_documento || 0) + 1;
      return proximoNumero;
    } catch (error) {
      return 1;
    }
  };



  // Funções auxiliares para gerenciar progresso
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const updateStep = (stepId: string, status: 'pending' | 'loading' | 'success' | 'error', message: string = '') => {
    setProgressSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, status, message } : step
    ));
  };

  const resetProgress = () => {
    setProgressSteps([
      { id: 'validacao', label: 'Validando dados da NFe', status: 'pending', message: '' },
      { id: 'geracao', label: 'Gerando XML da NFe', status: 'pending', message: '' },
      { id: 'sefaz', label: 'Enviando para SEFAZ', status: 'pending', message: '' },
      { id: 'banco', label: 'Salvando no banco de dados', status: 'pending', message: '' },
      { id: 'finalizacao', label: 'Finalizando processo', status: 'pending', message: '' }
    ]);
    setLogs([]);
  };

  const copyLogsToClipboard = () => {
    const logsText = logs.join('\n');
    navigator.clipboard.writeText(logsText).then(() => {
      alert('Logs copiados para a área de transferência!');
    }).catch(() => {
      alert('Erro ao copiar logs. Tente selecionar e copiar manualmente.');
    });
  };

  // Função para verificar se há dados não salvos
  const hasUnsavedData = () => {
    // Verificar se há dados preenchidos que indicam trabalho em progresso
    const hasIdentificacao = nfeData.identificacao.natureza_operacao !== 'VENDA' ||
                             nfeData.identificacao.numero !== '';
    const hasDestinatario = nfeData.destinatario.nome !== '' ||
                            nfeData.destinatario.documento !== '';
    const hasProdutos = nfeData.produtos.length > 0;
    const hasPagamentos = nfeData.pagamentos.length > 0;

    return hasIdentificacao || hasDestinatario || hasProdutos || hasPagamentos;
  };

  // Função para lidar com tentativa de sair
  const handleTryExit = () => {
    if (hasUnsavedData() && !nfeEmitida) {
      setShowExitModal(true);
    } else {
      // Se não há dados não salvos ou NFe já foi emitida, pode sair
      onBack();
    }
  };

  // Função para confirmar saída sem salvar
  const handleConfirmExit = () => {
    setShowExitModal(false);
    onBack();
  };

  // Função para cancelar saída
  const handleCancelExit = () => {
    setShowExitModal(false);
  };

  // Função para resetar estado de edição (para nova NFe)
  const resetEditingState = () => {
    setIsEditingRascunho(false);
    setRascunhoId(null);
    console.log('🔄 Estado de edição resetado para nova NFe');
  };

  // Função para salvar rascunho da NFe

  const handleSalvarRascunho = async () => {
    try {
      setIsSavingRascunho(true);

      // Validações básicas para rascunho (menos rigorosas)
      if (!nfeData.empresa) {
        alert('Dados da empresa não carregados');
        return;
      }

      if (!nfeData.identificacao.natureza_operacao) {
        alert('Natureza da operação é obrigatória');
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        alert('Usuário não autenticado');
        return;
      }

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        alert('Empresa não encontrada');
        return;
      }

      // Preparar dados do rascunho
      const rascunhoData = {
        empresa_id: usuarioData.empresa_id,
        usuario_id: userData.user.id, // Campo obrigatório que estava faltando
        modelo_documento: 55,
        serie_documento: parseInt(nfeData.identificacao.serie) || 1,
        numero_documento: parseInt(nfeData.identificacao.numero) || 0,
        status_nfe: 'rascunho',
        natureza_operacao: nfeData.identificacao.natureza_operacao,
        nome_cliente: nfeData.destinatario.nome || 'Cliente não informado',
        valor_total: nfeData.totais.valor_total || 0,
        data_rascunho: new Date().toISOString(),
        usuario_rascunho: userData.user.id,
        observacoes_rascunho: 'Rascunho salvo automaticamente',
        // Salvar dados completos da NFe em JSON
        dados_nfe: JSON.stringify(nfeData)
      };

      let rascunhoSalvo;

      if (isEditingRascunho && rascunhoId) {
        // Atualizar rascunho existente
        console.log('🔄 Atualizando rascunho existente ID:', rascunhoId);
        const { data, error } = await supabase
          .from('pdv')
          .update(rascunhoData)
          .eq('id', rascunhoId)
          .select()
          .single();

        if (error) {
          console.error('Erro ao atualizar rascunho:', error);
          alert('Erro ao atualizar rascunho: ' + error.message);
          return;
        }
        rascunhoSalvo = data;

        // Remover itens antigos antes de inserir os novos
        await supabase
          .from('pdv_itens')
          .delete()
          .eq('pdv_id', rascunhoId);

      } else {
        // Criar novo rascunho
        console.log('➕ Criando novo rascunho');
        const { data, error } = await supabase
          .from('pdv')
          .insert(rascunhoData)
          .select()
          .single();

        if (error) {
          console.error('Erro ao criar rascunho:', error);
          alert('Erro ao criar rascunho: ' + error.message);
          return;
        }
        rascunhoSalvo = data;

        // Marcar como editando rascunho para próximas operações
        setIsEditingRascunho(true);
        setRascunhoId(data.id);
      }

      // Salvar itens se existirem
      if (nfeData.produtos.length > 0) {
        const itensRascunho = nfeData.produtos.map((produto, index) => ({
          empresa_id: usuarioData.empresa_id, // Campo obrigatório
          usuario_id: userData.user.id, // Campo obrigatório
          pdv_id: rascunhoSalvo.id,
          produto_id: produto.produto_id || null,
          codigo_produto: produto.codigo,
          nome_produto: produto.descricao,
          quantidade: produto.quantidade,
          valor_unitario: produto.valor_unitario,
          valor_total_item: produto.valor_total // Corrigido: campo é valor_total_item
        }));

        const { error: itensError } = await supabase
          .from('pdv_itens')
          .insert(itensRascunho);

        if (itensError) {
          console.error('Erro ao salvar itens do rascunho:', itensError);
          // Não bloqueia o salvamento, apenas avisa
          alert('Rascunho salvo, mas houve erro ao salvar alguns itens');
        }
      }

      // Fechar modal de saída se estiver aberto
      setShowExitModal(false);

      // Voltar para a grid silenciosamente
      onSave(); // Isso vai recarregar a lista
      onBack(); // Isso vai voltar para a grid

    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
      alert(`Erro ao salvar rascunho: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsSavingRascunho(false);
    }
  };

  // Resetar estado ao montar componente (nova NFe)
  useEffect(() => {
    resetEditingState();
  }, []);

  // Listener para carregar rascunho
  useEffect(() => {
    const handleLoadRascunho = async (event: CustomEvent) => {
      const rascunho = event.detail;
      console.log('🎯 Evento loadRascunho recebido:', rascunho);

      // Marcar que estamos editando um rascunho e armazenar o ID
      setIsEditingRascunho(true);
      setRascunhoId(rascunho.id);

      try {
        // Se tem dados_nfe salvos, carregar eles
        if (rascunho.dados_nfe) {
          console.log('📦 Carregando dados completos do JSON...');
          const dadosCarregados = JSON.parse(rascunho.dados_nfe);

          // Aguardar um pouco para garantir que os dados da empresa foram carregados primeiro
          setTimeout(() => {
            setNfeData(prev => ({
              ...dadosCarregados,
              empresa: prev.empresa || dadosCarregados.empresa // Preservar empresa se já carregada
            }));
            console.log('✅ Dados carregados do JSON:', dadosCarregados);
          }, 100);
        } else {
          console.log('📋 Carregando dados básicos e buscando itens...');
          // Carregar dados básicos do rascunho e buscar itens
          const { data: itens } = await supabase
            .from('pdv_itens')
            .select('*')
            .eq('pdv_id', rascunho.id);

          console.log('📦 Itens encontrados:', itens);

          // Aguardar um pouco para garantir que os dados da empresa foram carregados primeiro
          setTimeout(() => {
            setNfeData(prev => ({
              ...prev,
              identificacao: {
                ...prev.identificacao,
                numero: rascunho.numero_documento?.toString() || '',
                serie: rascunho.serie_documento || 1,
                natureza_operacao: rascunho.natureza_operacao || 'VENDA'
              },
              destinatario: {
                ...prev.destinatario,
                nome: rascunho.nome_cliente || ''
              },
              totais: {
                ...prev.totais,
                valor_total: rascunho.valor_total || 0
              },
              produtos: itens ? itens.map(item => ({
                produto_id: item.produto_id,
                codigo: item.codigo_produto,
                descricao: item.nome_produto,
                quantidade: item.quantidade,
                valor_unitario: item.valor_unitario,
                valor_total: item.valor_total_item
              })) : []
            }));
            console.log('✅ Dados básicos carregados');
          }, 100);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar dados do rascunho:', error);
      }
    };

    console.log('🔗 Adicionando listener loadRascunho...');
    // Adicionar listener
    window.addEventListener('loadRascunho', handleLoadRascunho as EventListener);

    // Cleanup
    return () => {
      console.log('🗑️ Removendo listener loadRascunho...');
      window.removeEventListener('loadRascunho', handleLoadRascunho as EventListener);
    };
  }, []);

  // Buscar dados da empresa e próximo número
  useEffect(() => {
    const loadEmpresaData = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('empresa_id')
          .eq('id', userData.user.id)
          .single();

        if (!usuarioData?.empresa_id) return;

        // Carregar dados da empresa
        const { data: empresaData } = await supabase
          .from('empresas')
          .select('*')
          .eq('id', usuarioData.empresa_id)
          .single();

        // Carregar configuração NFe da nova tabela
        const { data: nfeConfigData } = await supabase
          .from('nfe_config')
          .select('ambiente')
          .eq('empresa_id', usuarioData.empresa_id)
          .single();

        if (nfeConfigData) {
          setAmbienteNFe(nfeConfigData.ambiente);
        } else {
          // Se não encontrou configuração, criar uma nova com padrão homologação
          const { error: insertError } = await supabase
            .from('nfe_config')
            .insert({
              empresa_id: usuarioData.empresa_id,
              ambiente: 'homologacao'
            });

          if (!insertError) {
            setAmbienteNFe('homologacao');
          }
        }

        if (empresaData) {
          // Só buscar próximo número NFe se NÃO for edição de rascunho
          let proximoNumero = '';
          if (!isEditingRascunho) {
            const numero = await buscarProximoNumeroNFe(usuarioData.empresa_id, 55, 1);
            proximoNumero = numero.toString();
            console.log('🔢 Número automático gerado para nova NFe:', proximoNumero);
          } else {
            console.log('✏️ Editando rascunho - número não será alterado automaticamente');
          }

          setNfeData(prev => ({
            ...prev,
            empresa: {
              id: empresaData.id,
              cnpj: empresaData.cnpj,
              name: empresaData.razao_social,
              nome_fantasia: empresaData.nome_fantasia,
              inscricao_estadual: empresaData.inscricao_estadual,
              regime_tributario: empresaData.regime_tributario || 1,
              address: empresaData.endereco,
              numero_endereco: empresaData.numero,
              bairro: empresaData.bairro,
              city: empresaData.cidade,
              state: empresaData.uf,
              zip_code: empresaData.cep,
              codigo_municipio: empresaData.codigo_municipio,
              phone: empresaData.telefone
            },
            identificacao: {
              ...prev.identificacao,
              // Só atualizar o número se não for edição de rascunho E se o número atual estiver vazio
              ...(isEditingRascunho || prev.identificacao.numero ? {} : { numero: proximoNumero })
            }
          }));
        }
      } catch (error) {
        console.error('Erro ao carregar dados da empresa:', error);
      }
    };

    loadEmpresaData();
  }, [isEditingRascunho]); // Reagir à mudança da flag de edição

  // Função para emitir NFe
  const handleEmitirNFe = async () => {
    try {
      setIsLoading(true);
      setShowProgressModal(true);
      resetProgress();

      // ETAPA 1: VALIDAÇÃO
      updateStep('validacao', 'loading');
      addLog('Iniciando processo de emissão da NFe');
      addLog(`Ambiente selecionado: ${ambienteNFe.toUpperCase()}`);

      // Validações robustas
      const validationErrors = [];

      if (!nfeData.empresa) {
        validationErrors.push('Dados da empresa não carregados');
      }

      if (!nfeData.empresa?.certificado_digital) {
        validationErrors.push('Certificado digital não configurado para a empresa');
      }

      // Validação específica para ambiente de produção
      if (ambienteNFe === 'producao') {
        if (!nfeData.empresa?.certificado_digital) {
          validationErrors.push('Certificado digital REAL é obrigatório para ambiente de produção');
        }
        // Adicionar outras validações específicas de produção se necessário
      }

      if (!nfeData.destinatario.documento || !nfeData.destinatario.nome) {
        validationErrors.push('Destinatário é obrigatório (CNPJ/CPF e Nome)');
      }

      if (nfeData.produtos.length === 0) {
        validationErrors.push('Adicione pelo menos um produto');
      }

      if (nfeData.pagamentos.length === 0) {
        validationErrors.push('Adicione pelo menos uma forma de pagamento');
      }

      // Validar soma dos pagamentos
      const totalPagamentos = nfeData.pagamentos.reduce((sum, p) => sum + p.valor, 0);
      if (Math.abs(totalPagamentos - nfeData.totais.valor_total) > 0.01) {
        validationErrors.push(`Valor dos pagamentos (R$ ${totalPagamentos.toFixed(2)}) deve ser igual ao total (R$ ${nfeData.totais.valor_total.toFixed(2)})`);
      }

      // Validar campos obrigatórios da identificação
      if (!nfeData.identificacao.natureza_operacao) {
        validationErrors.push('Natureza da operação é obrigatória');
      }

      if (validationErrors.length > 0) {
        updateStep('validacao', 'error', 'Erros de validação encontrados');
        addLog('ERRO: Validação falhou');
        validationErrors.forEach(error => addLog(`- ${error}`));
        return;
      }

      addLog('Validação concluída com sucesso');
      updateStep('validacao', 'success', 'Dados validados');

      // Confirmação para ambiente de produção
      if (ambienteNFe === 'producao') {
        setShowProgressModal(false); // Fechar modal para mostrar confirmação
        const confirmacao = confirm(
          '⚠️ ATENÇÃO: AMBIENTE DE PRODUÇÃO\n\n' +
          'Você está prestes a emitir uma NFe REAL no ambiente de PRODUÇÃO.\n' +
          'Esta NFe terá valor fiscal e será enviada para a SEFAZ oficial.\n\n' +
          '📄 Valor: R$ ' + nfeData.totais.valor_total.toFixed(2) + '\n' +
          '👤 Cliente: ' + nfeData.destinatario.nome + '\n\n' +
          'Deseja continuar?'
        );

        if (!confirmacao) {
          setShowProgressModal(false);
          setIsLoading(false);
          return;
        }
        setShowProgressModal(true); // Reabrir modal
      }

      // Preparar payload conforme documentação da API
      const payload = {
        ambiente: ambienteNFe === 'producao' ? 1 : 2, // 1=Produção, 2=Homologação
        empresa: nfeData.empresa,
        cliente: {
          documento: nfeData.destinatario.documento,
          name: nfeData.destinatario.nome,
          address: nfeData.destinatario.endereco,
          numero_endereco: nfeData.destinatario.numero,
          bairro: nfeData.destinatario.bairro,
          city: nfeData.destinatario.cidade,
          state: nfeData.destinatario.uf,
          zip_code: nfeData.destinatario.cep,
          codigo_municipio: nfeData.destinatario.codigo_municipio || 3550308,
          emails: nfeData.destinatario.emails || []
        },
        produtos: nfeData.produtos,
        totais: {
          valor_produtos: nfeData.totais.valor_produtos,
          valor_desconto: nfeData.totais.valor_desconto,
          valor_total: nfeData.totais.valor_total,
          natureza_operacao: nfeData.identificacao.natureza_operacao
        },
        pagamentos: nfeData.pagamentos
      };

      // ETAPA 2: GERAÇÃO DO XML
      updateStep('geracao', 'loading');
      addLog('Preparando dados para geração do XML');
      addLog(`Valor total: R$ ${nfeData.totais.valor_total.toFixed(2)}`);
      addLog(`Cliente: ${nfeData.destinatario.nome}`);

      // Chamar API para gerar NFe
      addLog('Enviando dados para API de geração...');
      const response = await fetch('https://apinfe.nexopdv.com/api/gerar-nfe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        updateStep('geracao', 'error', `Erro HTTP ${response.status}`);
        addLog(`ERRO: Falha na geração do XML - HTTP ${response.status}`);
        addLog(`Detalhes: ${errorText}`);
        throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        updateStep('geracao', 'error', 'Falha na geração do XML');
        addLog('ERRO: API retornou falha na geração');
        addLog(`Detalhes: ${result.error || 'Erro desconhecido'}`);
        throw new Error(result.error || 'Erro na geração do XML');
      }

      addLog('XML gerado com sucesso');
      addLog(`Chave NFe: ${result.data.chave}`);
      updateStep('geracao', 'success', 'XML gerado');

      // ETAPA 3: ENVIO PARA SEFAZ
      updateStep('sefaz', 'loading');
      addLog('Iniciando envio para SEFAZ...');
      addLog(`Ambiente SEFAZ: ${ambienteNFe === 'producao' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'}`);

      const sefazResponse = await fetch('https://apinfe.nexopdv.com/api/enviar-sefaz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ambiente: ambienteNFe === 'producao' ? 1 : 2, // 1=Produção, 2=Homologação
          xml: result.data.xml,
          chave: result.data.chave,
          empresa_id: nfeData.empresa.id
        })
      });

      if (!sefazResponse.ok) {
        const errorText = await sefazResponse.text();
        updateStep('sefaz', 'error', `Erro HTTP ${sefazResponse.status}`);
        addLog(`ERRO: Falha na comunicação com SEFAZ - HTTP ${sefazResponse.status}`);
        addLog(`Detalhes: ${errorText}`);
        throw new Error(`Erro SEFAZ HTTP ${sefazResponse.status}: ${errorText}`);
      }

      const sefazResult = await sefazResponse.json();

      if (!sefazResult.success) {
        updateStep('sefaz', 'error', 'SEFAZ rejeitou a NFe');
        addLog('ERRO: SEFAZ rejeitou a NFe');
        addLog(`Detalhes: ${sefazResult.error || 'Erro desconhecido'}`);
        throw new Error(sefazResult.error || 'Erro no envio para SEFAZ');
      }

      addLog('NFe autorizada pela SEFAZ');
      addLog(`Protocolo: ${sefazResult.data.protocolo || 'N/A'}`);
      updateStep('sefaz', 'success', 'Autorizada pela SEFAZ');

      // ETAPA 4: SALVAMENTO NO BANCO
      updateStep('banco', 'loading');
      addLog('Salvando NFe no banco de dados...');

      try {
        await salvarNFeNoBanco(result.data, sefazResult.data);
        addLog('NFe salva no banco com sucesso');
        updateStep('banco', 'success', 'Salva no banco');
      } catch (dbError) {
        updateStep('banco', 'error', 'Erro ao salvar no banco');
        addLog('AVISO: Erro ao salvar no banco local');
        addLog(`Detalhes: ${dbError.message || 'Erro desconhecido'}`);
        addLog('NFe foi autorizada pela SEFAZ, mas pode não aparecer na listagem');
      }

      // ETAPA 5: FINALIZAÇÃO
      updateStep('finalizacao', 'loading');
      addLog('Finalizando processo...');

      // Atualizar dados de autorização
      setDadosAutorizacao({
        chave_acesso: result.data.chave,
        protocolo_uso: sefazResult.data.protocolo || '',
        data_autorizacao: new Date().toISOString(),
        status: 'autorizada'
      });

      // Marcar NFe como emitida
      setNfeEmitida(true);

      addLog('✅ NFe emitida com sucesso!');
      addLog(`Chave: ${result.data.chave}`);
      addLog(`Protocolo: ${sefazResult.data.protocolo || 'N/A'}`);
      addLog(`Valor: R$ ${nfeData.totais.valor_total.toFixed(2)}`);
      updateStep('finalizacao', 'success', 'Processo concluído');

      // Aguardar 2 segundos para mostrar o sucesso
      setTimeout(() => {
        setShowProgressModal(false);
        onBack(); // Voltar para a grid de NFe
      }, 2000);
    } catch (error) {
      // Adicionar erro aos logs
      addLog('❌ ERRO CRÍTICO NO PROCESSO');
      addLog(`Detalhes: ${error.message || 'Erro desconhecido'}`);

      // Determinar qual etapa falhou e marcar como erro
      const currentStep = progressSteps.find(step => step.status === 'loading');
      if (currentStep) {
        updateStep(currentStep.id, 'error', 'Falha na execução');
      }

      // Categorizar o erro para logs mais detalhados
      if (error.message.includes('Failed to fetch')) {
        addLog('Tipo: Erro de conexão com a API');
        addLog('Solução: Verifique sua conexão e se a API está funcionando');
      } else if (error.message.includes('HTTP 404')) {
        addLog('Tipo: Endpoint não encontrado');
        addLog('Solução: Verifique se a API está configurada corretamente');
      } else if (error.message.includes('HTTP 500')) {
        addLog('Tipo: Erro interno do servidor');
        addLog('Solução: Tente novamente em alguns minutos');
      } else if (error.message.includes('timeout')) {
        addLog('Tipo: Timeout na requisição');
        addLog('Solução: A operação demorou muito para responder');
      } else {
        addLog('Tipo: Erro não categorizado');
      }

      addLog('');
      addLog('📋 Use o botão "Copiar Logs" para enviar os detalhes para suporte');
    } finally {
      setIsLoading(false);
    }
  };

  // Função para salvar NFe no banco de dados
  const salvarNFeNoBanco = async (nfeApiData: any, sefazData: any) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      const { error } = await supabase
        .from('pdv')
        .insert({
          empresa_id: usuarioData.empresa_id,
          usuario_id: userData.user.id, // Campo obrigatório que estava faltando
          modelo_documento: 55,
          serie_documento: parseInt(nfeData.identificacao.serie) || 1,
          numero_documento: parseInt(nfeApiData.numero_nfe) || parseInt(nfeData.identificacao.numero),
          chave_nfe: nfeApiData.chave,
          status_nfe: 'autorizada',
          protocolo_nfe: sefazData.protocolo, // Corrigido: era protocolo_uso, mas o campo é protocolo_nfe
          nome_cliente: nfeData.destinatario.nome || 'Cliente',
          valor_total: nfeData.totais.valor_total || 0,
          natureza_operacao: nfeData.identificacao.natureza_operacao || 'VENDA',
          xml_nfe: nfeApiData.xml,
          data_emissao_nfe: nfeData.identificacao.data_emissao || new Date().toISOString() // Corrigido: campo é data_emissao_nfe
        });

      if (error) {
        console.error('Erro ao salvar NFe no banco:', error);
        throw error;
      }

      console.log('NFe salva no banco com sucesso');
    } catch (error) {
      console.error('Erro ao salvar NFe no banco:', error);
      throw error;
    }
  };

  const sections = [
    { id: 'identificacao', label: 'Identificação', icon: FileText },
    { id: 'destinatario', label: 'Destinatário', icon: FileText },
    { id: 'produtos', label: 'Produtos', icon: FileText },
    { id: 'totais', label: 'Totais', icon: FileText },
    { id: 'pagamentos', label: 'Pagamentos', icon: FileText },
    { id: 'chaves_ref', label: 'Chaves Ref.', icon: FileText },
    { id: 'transportadora', label: 'Transportadora', icon: FileText },
    { id: 'intermediador', label: 'Intermediador', icon: FileText },
    // Só mostrar a aba de Autorização após a NFe ser emitida
    ...(nfeEmitida ? [{ id: 'autorizacao', label: 'Autorização', icon: FileText }] : []),
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'identificacao':
        return (
          <IdentificacaoSection
            data={nfeData.identificacao}
            onChange={(data) => setNfeData(prev => ({ ...prev, identificacao: data }))}
          />
        );
      case 'destinatario':
        return (
          <DestinatarioSection
            data={nfeData.destinatario}
            onChange={(data) => setNfeData(prev => ({ ...prev, destinatario: data }))}
          />
        );
      case 'produtos':
        return (
          <ProdutosSection
            produtos={nfeData.produtos}
            empresaId={nfeData.empresa?.id}
            onChange={(produtos) => {
              const valorProdutos = produtos.reduce((sum, p) => sum + (p.valor_total || 0), 0);
              setNfeData(prev => ({
                ...prev,
                produtos,
                totais: {
                  ...prev.totais,
                  valor_produtos: valorProdutos,
                  valor_total: valorProdutos - prev.totais.valor_desconto
                }
              }));
            }}
          />
        );
      case 'totais':
        return (
          <TotaisSection
            data={nfeData.totais}
            onChange={(data) => setNfeData(prev => ({ ...prev, totais: data }))}
          />
        );
      case 'pagamentos':
        return (
          <PagamentosSection
            data={nfeData.pagamentos}
            onChange={(data) => setNfeData(prev => ({ ...prev, pagamentos: data }))}
            totalNota={nfeData.totais.valor_total || 0}
          />
        );
      case 'chaves_ref':
        return (
          <ChavesRefSection
            data={nfeData.chaves_ref}
            onChange={(data) => setNfeData(prev => ({ ...prev, chaves_ref: data }))}
          />
        );
      case 'transportadora':
        return (
          <TransportadoraSection
            data={nfeData.transportadora}
            onChange={(data) => setNfeData(prev => ({ ...prev, transportadora: data }))}
          />
        );
      case 'intermediador':
        return <IntermediadorSection />;
      case 'autorizacao':
        return (
          <AutorizacaoSection
            dados={dadosAutorizacao}
            onChange={setDadosAutorizacao}
          />
        );
      default:
        return (
          <IdentificacaoSection
            data={nfeData.identificacao}
            onChange={(data) => setNfeData(prev => ({ ...prev, identificacao: data }))}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex z-50">
      {/* Sidebar com abas */}
      <div className="w-72 bg-background-card border-r border-gray-800 flex flex-col h-full">
        <div className="px-4 py-3 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleTryExit}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-lg font-bold text-white">Nova NFe</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={ambienteNFe}
                onChange={async (e) => {
                  const novoAmbiente = e.target.value as 'homologacao' | 'producao';

                  // Confirmação para mudança para produção
                  if (novoAmbiente === 'producao') {
                    const confirmacao = confirm(
                      '⚠️ MUDANÇA PARA AMBIENTE DE PRODUÇÃO\n\n' +
                      'Você está alterando para o ambiente de PRODUÇÃO.\n' +
                      'As próximas NFe emitidas serão REAIS e terão valor fiscal.\n\n' +
                      'Certifique-se de que:\n' +
                      '✅ Possui certificado digital REAL\n' +
                      '✅ Os dados estão corretos\n' +
                      '✅ Está autorizado a emitir NFe real\n\n' +
                      'Confirma a mudança?'
                    );

                    if (!confirmacao) {
                      return; // Cancela a mudança
                    }
                  }

                  setAmbienteNFe(novoAmbiente);

                  // Salvar no banco de dados
                  try {
                    const { data: userData } = await supabase.auth.getUser();
                    if (userData.user) {
                      const { data: usuarioData } = await supabase
                        .from('usuarios')
                        .select('empresa_id')
                        .eq('id', userData.user.id)
                        .single();

                      if (usuarioData?.empresa_id) {
                        const { error } = await supabase
                          .from('nfe_config')
                          .upsert({
                            empresa_id: usuarioData.empresa_id,
                            ambiente: novoAmbiente
                          });

                        if (error) {
                          console.error('Erro ao salvar configuração:', error);
                          alert('Erro ao salvar configuração de ambiente');
                        } else {
                          console.log(`Ambiente alterado para: ${novoAmbiente}`);
                        }
                      }
                    }
                  } catch (error) {
                    console.error('Erro ao salvar ambiente:', error);
                  }
                }}
                className={`px-2 py-1 rounded text-xs font-medium border ${
                  ambienteNFe === 'producao'
                    ? 'bg-green-500/15 text-green-400 border-green-500/30'
                    : 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                } focus:outline-none focus:ring-1 focus:ring-primary-500`}
                title="Selecionar ambiente de emissão"
              >
                <option value="homologacao">HOMOLOGAÇÃO</option>
                <option value="producao">PRODUÇÃO</option>
              </select>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto">
          <div className="space-y-0">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-800/50 ${
                  activeSection === section.id
                    ? 'bg-primary-500/10 text-primary-400 border-l-2 border-l-primary-500'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <section.icon size={18} />
                <span className="font-medium text-sm">{section.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Botões de ação */}
        <div className="p-3 border-t border-gray-800 space-y-2 flex-shrink-0">
          <Button
            variant="primary"
            className="w-full flex items-center justify-center gap-2 text-sm py-2"
            onClick={handleEmitirNFe}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Emitindo...
              </>
            ) : (
              <>
                <Send size={14} />
                Emitir NFe
              </>
            )}
          </Button>
          <Button
            variant="success"
            className="w-full flex items-center justify-center gap-2 text-sm py-2"
            onClick={handleSalvarRascunho}
            disabled={isSavingRascunho}
          >
            {isSavingRascunho ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Salvando...
              </>
            ) : (
              <>
                <Save size={14} />
                Salvar Rascunho
              </>
            )}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className={`${nfeEmitida ? 'flex-1' : 'w-full'} flex items-center justify-center gap-1 text-xs py-1.5`}
            >
              <Download size={12} />
              Espelho
            </Button>
            {nfeEmitida && (
              <Button variant="secondary" className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5">
                <Copy size={12} />
                Duplicar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 overflow-auto">
        <div className="h-full">
          {renderContent()}
        </div>
      </div>

      {/* Modal de Progresso */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
          <div className="bg-background-card rounded-lg border border-gray-800 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Emitindo NFe</h3>
                <div className={`px-3 py-1 rounded text-sm font-medium ${
                  ambienteNFe === 'producao'
                    ? 'bg-green-500/15 text-green-400'
                    : 'bg-orange-500/15 text-orange-400'
                }`}>
                  {ambienteNFe === 'producao' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'}
                </div>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="p-6 border-b border-gray-800">
              <div className="space-y-4">
                {progressSteps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-4">
                    {/* Step Icon */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      step.status === 'success'
                        ? 'bg-green-500 text-white'
                        : step.status === 'error'
                        ? 'bg-red-500 text-white'
                        : step.status === 'loading'
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {step.status === 'success' ? '✓' :
                       step.status === 'error' ? '✗' :
                       step.status === 'loading' ? (
                         <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                       ) : index + 1}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${
                          step.status === 'success' ? 'text-green-400' :
                          step.status === 'error' ? 'text-red-400' :
                          step.status === 'loading' ? 'text-primary-400' :
                          'text-gray-400'
                        }`}>
                          {step.label}
                        </span>
                        {step.message && (
                          <span className="text-sm text-gray-500">{step.message}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Logs Area */}
            <div className="flex-1 p-6 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-white">Logs do Processo</h4>
                <button
                  onClick={copyLogsToClipboard}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm flex items-center gap-2 transition-colors"
                >
                  <Copy size={14} />
                  Copiar Logs
                </button>
              </div>

              <div className="flex-1 bg-gray-900 rounded border border-gray-700 p-4 overflow-y-auto">
                <div className="space-y-1 font-mono text-sm">
                  {logs.map((log, index) => (
                    <div key={index} className={`${
                      log.includes('ERRO') || log.includes('❌') ? 'text-red-400' :
                      log.includes('✅') || log.includes('sucesso') ? 'text-green-400' :
                      log.includes('AVISO') ? 'text-yellow-400' :
                      'text-gray-300'
                    }`}>
                      {log}
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <div className="text-gray-500 italic">Aguardando início do processo...</div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-800">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-400">
                  {progressSteps.filter(s => s.status === 'success').length} de {progressSteps.length} etapas concluídas
                </div>
                <button
                  onClick={() => setShowProgressModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                  disabled={isLoading && !progressSteps.some(s => s.status === 'error')}
                >
                  {isLoading && !progressSteps.some(s => s.status === 'error') ? 'Processando...' : 'Fechar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Saída */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70]">
          <div className="bg-background-card rounded-lg border border-gray-800 w-full max-w-md mx-4">
            {/* Header */}
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/15 rounded-full flex items-center justify-center">
                  <ArrowLeft className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Sair da Emissão</h3>
                  <p className="text-sm text-gray-400">Confirme sua ação</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-300 mb-3">
                  ⚠️ <strong>Atenção!</strong> Você está prestes a sair da emissão da NFe.
                </p>
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-4">
                  <p className="text-orange-300 text-sm">
                    <strong>Dados que serão perdidos:</strong>
                  </p>
                  <ul className="text-orange-300 text-sm mt-2 space-y-1">
                    <li>• Informações de identificação preenchidas</li>
                    <li>• Dados do destinatário</li>
                    <li>• Produtos adicionados</li>
                    <li>• Configurações de pagamento</li>
                    <li>• Outras informações não salvas</li>
                  </ul>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-blue-300 text-sm">
                    💡 <strong>Dica:</strong> Use o botão <strong>"Salvar Rascunho"</strong> para preservar seu trabalho e continuar depois.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-800">
              <div className="flex gap-3">
                <button
                  onClick={handleCancelExit}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvarRascunho}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                  disabled={isSavingRascunho}
                >
                  {isSavingRascunho ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Salvar Rascunho
                    </>
                  )}
                </button>
                <button
                  onClick={handleConfirmExit}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                >
                  Sair sem Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Seção de Identificação
const IdentificacaoSection: React.FC<{ data: any; onChange: (data: any) => void }> = ({ data, onChange }) => {
  const updateField = (field: string, value: any) => {
    onChange({
      ...data,
      [field]: value
    });
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold text-white mb-4">Identificação da NFe</h2>

      <div className="bg-background-card rounded-lg border border-gray-800 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          {/* Primeira linha - Layout otimizado */}
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Número *
            </label>
            <div className="relative">
              <input
                type="number"
                value={data.numero}
                onChange={(e) => updateField('numero', e.target.value)}
                placeholder="Próximo número disponível"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
              />
              {data.numero && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded" title="Número carregado automaticamente">
                    Auto
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Modelo *
            </label>
            <input
              type="text"
              value="55"
              readOnly
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Série *
            </label>
            <input
              type="number"
              value={data.serie}
              onChange={(e) => updateField('serie', parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Código
            </label>
            <input
              type="text"
              value="Gerado pela API"
              readOnly
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
              title="Código Numérico que compõe a Chave de Acesso (8 dígitos)"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Emitida em
            </label>
            <input
              type="datetime-local"
              value={data.data_emissao}
              onChange={(e) => updateField('data_emissao', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tipo Documento
            </label>
            <select className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500">
              <option value="1">1 - Saída</option>
              <option value="0">0 - Entrada</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Finalidade Emissão
            </label>
            <select className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500">
              <option value="1">1 - NFe normal</option>
              <option value="2">2 - NFe complementar</option>
              <option value="3">3 - NFe de ajuste</option>
              <option value="4">4 - Devolução de mercadoria</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Presença
            </label>
            <select className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500">
              <option value="9">9 - Operação não presencial, outros</option>
              <option value="1">1 - Operação presencial</option>
              <option value="2">2 - Operação não presencial, pela Internet</option>
              <option value="3">3 - Operação não presencial, teleatendimento</option>
              <option value="4">4 - NFC-e em operação com entrega a domicílio</option>
              <option value="5">5 - Operação presencial, fora do estabelecimento</option>
            </select>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Natureza da Operação *
          </label>
          <input
            type="text"
            value={data.natureza_operacao}
            onChange={(e) => updateField('natureza_operacao', e.target.value)}
            placeholder="Ex: VENDA, DEVOLUÇÃO, etc."
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
          />
        </div>

        <div className="mt-6">
          <button className="flex items-center gap-2 text-primary-400 hover:text-primary-300 text-sm">
            <Plus size={16} />
            PREENCHER INFORMAÇÃO ADICIONAL
          </button>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Informação Adicional
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500 resize-none"
              placeholder="Informações adicionais da NFe..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Seção de Destinatário
const DestinatarioSection: React.FC<{ data: any; onChange: (data: any) => void }> = ({ data, onChange }) => {
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const updateField = (field: string, value: any) => {
    onChange({
      ...data,
      [field]: value
    });
  };

  // Buscar clientes
  const buscarClientes = async (termo: string = '') => {
    try {
      setIsLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      let query = supabase
        .from('clientes')
        .select('*')
        .eq('empresa_id', usuarioData.empresa_id)
        .order('nome');

      if (termo) {
        query = query.or(`nome.ilike.%${termo}%,documento.ilike.%${termo}%,razao_social.ilike.%${termo}%`);
      }

      const { data: clientesData, error } = await query.limit(50);

      if (error) throw error;

      setClientes(clientesData || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Selecionar cliente e preencher campos
  const selecionarCliente = (cliente: any) => {
    onChange({
      ...data,
      documento: cliente.documento || '',
      nome: cliente.nome || '',
      endereco: cliente.endereco || '',
      numero: cliente.numero || '',
      bairro: cliente.bairro || '',
      cidade: cliente.cidade || '',
      uf: cliente.estado || '',
      cep: cliente.cep || '',
      emails: cliente.emails || []
    });
    setShowClienteModal(false);
    setSearchTerm('');
  };

  // Carregar clientes ao abrir modal
  useEffect(() => {
    if (showClienteModal) {
      buscarClientes();
    }
  }, [showClienteModal]);

  // Buscar quando o termo mudar
  useEffect(() => {
    if (showClienteModal && searchTerm) {
      const timer = setTimeout(() => {
        buscarClientes(searchTerm);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchTerm, showClienteModal]);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Destinatário da NFe</h2>
        <button
          type="button"
          onClick={() => setShowClienteModal(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 flex items-center gap-2 text-sm"
        >
          <Search size={16} />
          BUSCAR CLIENTE
        </button>
      </div>

      <div className="bg-background-card rounded-lg border border-gray-800 p-4">
        {/* Primeira linha: CNPJ/CPF e Nome */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              CNPJ/CPF *
            </label>
            <input
              type="text"
              value={data.documento}
              onChange={(e) => updateField('documento', e.target.value)}
              placeholder="00.000.000/0000-00 ou 000.000.000-00"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="lg:col-span-3">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome/Razão Social *
            </label>
            <input
              type="text"
              value={data.nome}
              onChange={(e) => updateField('nome', e.target.value)}
              placeholder="Nome do destinatário"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        {/* Segunda linha: Endereço e Número */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <div className="lg:col-span-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Endereço
            </label>
            <input
              type="text"
              value={data.endereco}
              onChange={(e) => updateField('endereco', e.target.value)}
              placeholder="Rua, Avenida, etc."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Número
            </label>
            <input
              type="text"
              value={data.numero}
              onChange={(e) => updateField('numero', e.target.value)}
              placeholder="123"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        {/* Terceira linha: Bairro, Cidade, UF */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bairro
            </label>
            <input
              type="text"
              value={data.bairro}
              onChange={(e) => updateField('bairro', e.target.value)}
              placeholder="Centro"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cidade
            </label>
            <input
              type="text"
              value={data.cidade}
              onChange={(e) => updateField('cidade', e.target.value)}
              placeholder="São Paulo"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              UF
            </label>
            <select
              value={data.uf}
              onChange={(e) => updateField('uf', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            >
              <option value="">Selecione</option>
              <option value="SP">SP</option>
              <option value="RJ">RJ</option>
              <option value="MG">MG</option>
              <option value="RS">RS</option>
              <option value="PR">PR</option>
              <option value="SC">SC</option>
              {/* Adicionar outros estados conforme necessário */}
            </select>
          </div>
        </div>

        {/* Quarta linha: CEP */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              CEP
            </label>
            <input
              type="text"
              value={data.cep}
              onChange={(e) => updateField('cep', e.target.value)}
              placeholder="00000-000"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        {/* Seção de Emails do Cliente */}
        {data.emails && data.emails.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Emails do Cliente
            </label>
            <div className="bg-gray-800/30 rounded-lg border border-gray-700 p-3">
              <div className="space-y-2">
                {data.emails.map((email: string, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-sm"
                  >
                    <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0"></div>
                    <span className="text-white">{email}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-gray-700">
                <p className="text-xs text-gray-500">
                  Estes emails serão incluídos nos dados da NFe para envio automático
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quinta linha: Campos de identificação */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Identificador da IE
            </label>
            <select className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500">
              <option value="9">9 - Não Contribuinte, que pode ou não possuir Inscrição</option>
              <option value="1">1 - Contribuinte ICMS</option>
              <option value="2">2 - Contribuinte isento de Inscrição</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Identificador de Operação
            </label>
            <select className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500">
              <option value="1">1 - Operação Interna</option>
              <option value="2">2 - Operação Interestadual</option>
              <option value="3">3 - Operação com Exterior</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Consumidor
            </label>
            <select className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500">
              <option value="1">1 - Consumidor final</option>
              <option value="0">0 - Normal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Modal de Busca de Clientes */}
      {showClienteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-card rounded-lg border border-gray-800 p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Buscar Cliente</h3>
              <button
                onClick={() => setShowClienteModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Campo de busca */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Digite o nome, documento ou razão social..."
                  className="w-full px-3 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                  autoFocus
                />
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* Lista de clientes */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-400">Carregando clientes...</p>
                </div>
              ) : clientes.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-400">Nenhum cliente encontrado</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {searchTerm ? 'Tente buscar com outros termos' : 'Cadastre clientes para aparecerem aqui'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {clientes.map((cliente) => (
                    <div
                      key={cliente.id}
                      onClick={() => selecionarCliente(cliente)}
                      className="p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg cursor-pointer transition-colors border border-gray-700/50 hover:border-gray-600"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{cliente.nome}</h4>
                          {cliente.razao_social && cliente.razao_social !== cliente.nome && (
                            <p className="text-sm text-gray-400">{cliente.razao_social}</p>
                          )}
                          <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                            {cliente.documento && (
                              <span>📄 {cliente.documento}</span>
                            )}
                            {cliente.telefone && (
                              <span>📞 {cliente.telefone}</span>
                            )}
                            {cliente.emails && cliente.emails.length > 0 && (
                              <span>✉️ {cliente.emails[0]}{cliente.emails.length > 1 && ` +${cliente.emails.length - 1}`}</span>
                            )}
                          </div>
                          {(cliente.endereco || cliente.cidade) && (
                            <div className="text-xs text-gray-500 mt-1">
                              📍 {[cliente.endereco, cliente.numero, cliente.bairro, cliente.cidade, cliente.estado].filter(Boolean).join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="text-primary-400 ml-2">
                          <Search size={16} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rodapé */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-500 text-center">
                Clique em um cliente para preencher automaticamente os dados do destinatário
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Seção de Produtos
const ProdutosSection: React.FC<{ produtos: any[]; empresaId?: string; onChange: (produtos: any[]) => void }> = ({ produtos, empresaId, onChange }) => {
  const [showProdutoModal, setShowProdutoModal] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [produtoForm, setProdutoForm] = useState({
    quantidade: 1,
    valor_unitario: 0,
    valor_total: 0
  });

  // Função para selecionar produto do modal
  const handleSelecionarProduto = (produto: any) => {
    setProdutoSelecionado(produto);
    setProdutoForm({
      quantidade: 1,
      valor_unitario: produto.preco || 0,
      valor_total: produto.preco || 0
    });
    setShowProdutoModal(false);
  };

  // Função para adicionar produto à lista
  const handleAdicionarProduto = () => {
    if (!produtoSelecionado) {
      alert('Selecione um produto');
      return;
    }

    const novoProduto = {
      id: Date.now().toString(),
      codigo: produtoSelecionado.codigo,
      descricao: produtoSelecionado.nome,
      ncm: produtoSelecionado.ncm || '00000000',
      cfop: '5102', // CFOP padrão
      unidade: produtoSelecionado.unidade_medida?.sigla || 'UN',
      quantidade: produtoForm.quantidade,
      valor_unitario: produtoForm.valor_unitario,
      valor_total: produtoForm.valor_total,
      origem_produto: 0,
      csosn_icms: '102',
      cst_pis: '01',
      cst_cofins: '01'
    };

    onChange([...produtos, novoProduto]);

    // Limpar formulário
    setProdutoSelecionado(null);
    setProdutoForm({
      quantidade: 1,
      valor_unitario: 0,
      valor_total: 0
    });
  };

  // Função para remover produto
  const handleRemoverProduto = (id: string) => {
    onChange(produtos.filter(p => p.id !== id));
  };

  // Função para atualizar campos e calcular total
  const updateProdutoForm = (field: string, value: number) => {
    setProdutoForm(prev => {
      const newForm = { ...prev, [field]: value };
      newForm.valor_total = newForm.quantidade * newForm.valor_unitario;
      return newForm;
    });
  };

  return (
    <div className="p-4">
      {/* Formulário para adicionar produto */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white mb-4">Novo Produto</h3>
        <div className="bg-background-card rounded-lg border border-gray-800 p-4">
          {/* Campo Produto - linha completa */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Produto *
            </label>
            <div className="relative">
              <input
                type="text"
                value={produtoSelecionado ? produtoSelecionado.nome : ''}
                placeholder="Selecione ou digite o produto"
                className="w-full px-3 py-2 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                readOnly
              />
              <button
                type="button"
                onClick={() => setShowProdutoModal(true)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white transition-colors"
                title="Buscar produto"
              >
                <Search size={16} />
              </button>
            </div>
          </div>

          {/* Campos de valores - grid corrigido */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Valor Unitário */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Valor Unitário *
              </label>
              <div className="flex items-center">
                <span className="text-sm text-gray-400 mr-2">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={produtoForm.valor_unitario || ''}
                  onChange={(e) => updateProdutoForm('valor_unitario', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            {/* Quantidade */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Quantidade *
              </label>
              <input
                type="number"
                step="0.001"
                value={produtoForm.quantidade || ''}
                onChange={(e) => updateProdutoForm('quantidade', parseFloat(e.target.value) || 0)}
                placeholder="1"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
              />
            </div>

            {/* Total */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Total
              </label>
              <div className="flex items-center">
                <span className="text-sm text-gray-400 mr-2">R$</span>
                <input
                  type="text"
                  value={(produtoForm.valor_total || 0).toFixed(2)}
                  placeholder="0.00"
                  readOnly
                  className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none cursor-not-allowed"
                />
              </div>
            </div>

            {/* Botão Adicionar */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAdicionarProduto}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                ADICIONAR
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de produtos */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Lista de Produtos</h3>
        <div className="bg-background-card rounded-lg border border-gray-800 overflow-hidden">
          {produtos.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400">Nenhum produto adicionado</p>
              <p className="text-sm text-gray-500 mt-1">Use o formulário acima para adicionar produtos à NFe</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase">Item</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase">Código</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase">Descrição</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase">Valor Unit</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase">Quantidade</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase">Total</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase">NCM</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase">CFOP</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase">ICMS</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-300 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {produtos.map((produto, index) => (
                    <tr key={produto.id} className="hover:bg-gray-800/30">
                      <td className="px-3 py-2 text-sm text-white">{index + 1}</td>
                      <td className="px-3 py-2 text-sm text-white">{produto.codigo}</td>
                      <td className="px-3 py-2 text-sm text-white">{produto.descricao}</td>
                      <td className="px-3 py-2 text-sm text-white">R$ {produto.valor_unitario.toFixed(2)}</td>
                      <td className="px-3 py-2 text-sm text-white">{produto.quantidade}</td>
                      <td className="px-3 py-2 text-sm text-white">R$ {produto.valor_total.toFixed(2)}</td>
                      <td className="px-3 py-2 text-sm text-white">{produto.ncm}</td>
                      <td className="px-3 py-2 text-sm text-white">{produto.cfop}</td>
                      <td className="px-3 py-2 text-sm text-white">{produto.csosn_icms}</td>
                      <td className="px-3 py-2 text-sm text-white text-right">
                        <button
                          onClick={() => handleRemoverProduto(produto.id)}
                          className="text-red-400 hover:text-red-300 p-1"
                          title="Remover produto"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Produtos */}
      {showProdutoModal && (
        <ProdutoSeletorModal
          isOpen={showProdutoModal}
          onClose={() => setShowProdutoModal(false)}
          onSelect={handleSelecionarProduto}
          empresaId={empresaId}
        />
      )}
    </div>
  );
};

const TotaisSection: React.FC<{ data: any; onChange: (data: any) => void }> = ({ data, onChange }) => {
  const updateField = (field: string, value: number) => {
    const newData = {
      ...data,
      [field]: value
    };

    // Recalcular total da nota
    const valorTotal = newData.valor_produtos
      - newData.valor_desconto
      + (newData.valor_frete || 0)
      + (newData.valor_seguro || 0)
      + (newData.valor_outros || 0);

    newData.valor_total = valorTotal;

    onChange(newData);
  };

  return (
  <div className="p-4">
    <h2 className="text-xl font-bold text-white mb-4">Totais da NFe</h2>
    <div className="bg-background-card rounded-lg border border-gray-800 p-4">
      {/* Primeira linha - Total dos produtos e Crédito SN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Total dos produtos
          </label>
          <div className="flex items-center">
            <span className="text-sm text-gray-400 mr-2">R$</span>
            <input
              type="text"
              placeholder="0,00"
              value={(data.valor_produtos || 0).toFixed(2)}
              readOnly
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Total de Crédito SN
          </label>
          <div className="flex items-center">
            <span className="text-sm text-gray-400 mr-2">R$</span>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={data.valor_credito_sn || 0}
              onChange={(e) => updateField('valor_credito_sn', parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Segunda linha - PIS, COFINS, IPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Total PIS
          </label>
          <div className="flex items-center">
            <span className="text-sm text-gray-400 mr-2">R$</span>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={data.valor_pis || 0}
              onChange={(e) => updateField('valor_pis', parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Total COFINS
          </label>
          <div className="flex items-center">
            <span className="text-sm text-gray-400 mr-2">R$</span>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={data.valor_cofins || 0}
              onChange={(e) => updateField('valor_cofins', parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Total IPI
          </label>
          <div className="flex items-center">
            <span className="text-sm text-gray-400 mr-2">R$</span>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={data.valor_ipi || 0}
              onChange={(e) => updateField('valor_ipi', parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Terceira linha - ICMS BC, ICMS, FCP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Total ICMS BC
          </label>
          <div className="flex items-center">
            <span className="text-sm text-gray-400 mr-2">R$</span>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={data.valor_icms_bc || 0}
              onChange={(e) => updateField('valor_icms_bc', parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Total ICMS
          </label>
          <div className="flex items-center">
            <span className="text-sm text-gray-400 mr-2">R$</span>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={data.valor_icms || 0}
              onChange={(e) => updateField('valor_icms', parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Total FCP
          </label>
          <div className="flex items-center">
            <span className="text-sm text-gray-400 mr-2">R$</span>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={data.valor_fcp || 0}
              onChange={(e) => updateField('valor_fcp', parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Quarta linha - ICMS BC ST, ICMS ST, FCP ST */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Total ICMS BC ST
          </label>
          <div className="flex items-center">
            <span className="text-sm text-gray-400 mr-2">R$</span>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={data.valor_icms_bc_st || 0}
              onChange={(e) => updateField('valor_icms_bc_st', parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Total ICMS ST
          </label>
          <div className="flex items-center">
            <span className="text-sm text-gray-400 mr-2">R$</span>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={data.valor_icms_st || 0}
              onChange={(e) => updateField('valor_icms_st', parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Total FCP ST
          </label>
          <div className="flex items-center">
            <span className="text-sm text-gray-400 mr-2">R$</span>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={data.valor_fcp_st || 0}
              onChange={(e) => updateField('valor_fcp_st', parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Quinta linha - Desconto, Frete, Seguro, Outros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Desconto
          </label>
          <div className="flex items-center">
            <span className="text-sm text-gray-400 mr-2">R$</span>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={data.valor_desconto || 0}
              onChange={(e) => updateField('valor_desconto', parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Frete
          </label>
          <div className="flex items-center">
            <span className="text-sm text-gray-400 mr-2">R$</span>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={data.valor_frete || 0}
              onChange={(e) => updateField('valor_frete', parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Seguro
          </label>
          <div className="flex items-center">
            <span className="text-sm text-gray-400 mr-2">R$</span>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={data.valor_seguro || 0}
              onChange={(e) => updateField('valor_seguro', parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Outros
          </label>
          <div className="flex items-center">
            <span className="text-sm text-gray-400 mr-2">R$</span>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={data.valor_outros || 0}
              onChange={(e) => updateField('valor_outros', parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Total da Nota */}
      <div className="pt-4 border-t border-gray-700">
        <div className="w-64">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Total Nota
          </label>
          <div className="flex items-center">
            <span className="text-sm text-gray-400 mr-2">R$</span>
            <input
              type="text"
              placeholder="0,00"
              value={(data.valor_total || 0).toFixed(2)}
              readOnly
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none font-bold cursor-not-allowed"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

const PagamentosSection: React.FC<{ data: any[]; onChange: (data: any[]) => void; totalNota: number }> = ({ data: pagamentos, onChange, totalNota }) => {
  const [pagamentoForm, setPagamentoForm] = useState({
    tipo: '01',
    valor: totalNota || 0
  });

  // Atualizar valor do pagamento quando o total da nota mudar
  useEffect(() => {
    if (totalNota > 0 && pagamentoForm.valor === 0) {
      setPagamentoForm(prev => ({ ...prev, valor: totalNota }));
    }
  }, [totalNota]);

  const tiposPagamento = {
    '01': 'Dinheiro',
    '02': 'Cheque',
    '03': 'Cartão de Crédito',
    '04': 'Cartão de Débito',
    '05': 'Crédito Loja',
    '10': 'Vale Alimentação',
    '11': 'Vale Refeição',
    '12': 'Vale Presente',
    '13': 'Vale Combustível',
    '15': 'Boleto Bancário',
    '90': 'Sem pagamento',
    '99': 'Outros'
  };

  const handleAdicionarPagamento = () => {
    if (pagamentoForm.valor <= 0) {
      alert('Valor deve ser maior que zero');
      return;
    }

    const novoPagamento = {
      id: Date.now().toString(),
      tipo: pagamentoForm.tipo,
      tipo_descricao: tiposPagamento[pagamentoForm.tipo],
      valor: pagamentoForm.valor
    };

    onChange([...pagamentos, novoPagamento]);

    // Limpar formulário
    setPagamentoForm({
      tipo: '01',
      valor: 0
    });
  };

  const handleRemoverPagamento = (id: string) => {
    onChange(pagamentos.filter(p => p.id !== id));
  };

  return (
    <div className="p-4">
      {/* Formulário para adicionar pagamento */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Novo Pagamento</h3>
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg px-4 py-2">
            <div className="text-center">
              <p className="text-xs text-primary-400 font-medium">Total da Nota</p>
              <p className="text-lg font-bold text-primary-300">R$ {totalNota.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-background-card rounded-lg border border-gray-800 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tipo Pagamento
              </label>
              <select
                value={pagamentoForm.tipo}
                onChange={(e) => setPagamentoForm(prev => ({ ...prev, tipo: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
              >
                {Object.entries(tiposPagamento).map(([codigo, descricao]) => (
                  <option key={codigo} value={codigo}>{codigo} - {descricao}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Valor
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={pagamentoForm.valor}
                  onChange={(e) => setPagamentoForm(prev => ({ ...prev, valor: parseFloat(e.target.value) || 0 }))}
                  placeholder="0,00"
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setPagamentoForm(prev => ({ ...prev, valor: totalNota }))}
                  className="px-2 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 focus:outline-none text-xs"
                  title="Preencher com valor total da nota"
                >
                  Total
                </button>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handleAdicionarPagamento}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                ADICIONAR
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de pagamentos */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Lista de Pagamentos</h3>
        <div className="bg-background-card rounded-lg border border-gray-800 overflow-hidden">
          {pagamentos.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400">Nenhum pagamento adicionado</p>
              <p className="text-sm text-gray-500 mt-1">Use o formulário acima para adicionar formas de pagamento</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase">Tipo</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-300 uppercase">Valor</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-300 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {pagamentos.map((pagamento, index) => (
                    <tr key={pagamento.id} className="hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-sm text-white">{pagamento.tipo_descricao}</td>
                      <td className="px-4 py-3 text-sm text-white text-right">R$ {pagamento.valor.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-white text-right">
                        <button
                          onClick={() => handleRemoverPagamento(pagamento.id)}
                          className="text-red-400 hover:text-red-300 p-1"
                          title="Remover pagamento"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ChavesRefSection: React.FC<{ data: any[]; onChange: (data: any[]) => void }> = ({ data: chaves = [], onChange }) => {
  const [chaveForm, setChaveForm] = useState('');

  const handleAdicionarChave = () => {
    if (!chaveForm.trim()) {
      alert('Digite uma chave de acesso válida');
      return;
    }

    // Validar formato da chave (44 dígitos)
    const chaveNumeros = chaveForm.replace(/\D/g, '');
    if (chaveNumeros.length !== 44) {
      alert('Chave de acesso deve ter 44 dígitos');
      return;
    }

    // Verificar se a chave já existe
    if (chaves && chaves.some(c => c.chave === chaveNumeros)) {
      alert('Esta chave já foi adicionada');
      return;
    }

    const novaChave = {
      id: Date.now().toString(),
      chave: chaveNumeros,
      chave_formatada: formatarChave(chaveNumeros)
    };

    onChange([...(chaves || []), novaChave]);
    setChaveForm('');
  };

  const handleRemoverChave = (id: string) => {
    onChange((chaves || []).filter(c => c.id !== id));
  };

  const formatarChave = (chave: string) => {
    // Formatar chave: 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000
    return chave.replace(/(\d{4})/g, '$1 ').trim();
  };

  const handleChaveChange = (value: string) => {
    // Permitir apenas números e limitar a 44 dígitos
    const numeros = value.replace(/\D/g, '').slice(0, 44);
    setChaveForm(numeros);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold text-white mb-4">Lista de Chaves Referenciadas</h2>

      {/* Formulário para adicionar chave */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white mb-4">Nova Chave Referenciada</h3>
        <div className="bg-background-card rounded-lg border border-gray-800 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Chave
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chaveForm}
                  onChange={(e) => handleChaveChange(e.target.value)}
                  placeholder="Digite a chave de acesso (44 dígitos)"
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 font-mono text-sm"
                  maxLength={44}
                />
                <button
                  type="button"
                  onClick={handleAdicionarChave}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 flex items-center gap-2 whitespace-nowrap"
                >
                  <Plus size={16} />
                  ADICIONAR
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {chaveForm.length}/44 dígitos
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de chaves */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Chaves Adicionadas</h3>
        <div className="bg-background-card rounded-lg border border-gray-800 overflow-hidden">
          {(chaves || []).length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400">Nenhuma chave referenciada</p>
              <p className="text-sm text-gray-500 mt-1">Use o formulário acima para adicionar chaves de acesso</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase">Chave de Acesso</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-300 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {(chaves || []).map((chave) => (
                    <tr key={chave.id} className="hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-sm text-white font-mono">
                        {chave.chave_formatada}
                      </td>
                      <td className="px-4 py-3 text-sm text-white text-right">
                        <button
                          onClick={() => handleRemoverChave(chave.id)}
                          className="text-red-400 hover:text-red-300 p-1"
                          title="Remover chave"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TransportadoraSection: React.FC<{ data: any; onChange: (data: any) => void }> = ({ data, onChange }) => {
  const [showTransportadoraModal, setShowTransportadoraModal] = useState(false);
  const [transportadoraSelecionada, setTransportadoraSelecionada] = useState<any>(null);

  const handleSelecionarTransportadora = (transportadora: any) => {
    setTransportadoraSelecionada(transportadora);
    onChange({
      ...data,
      transportadora_id: transportadora.id,
      transportadora_nome: transportadora.nome,
      transportadora_documento: transportadora.documento,
      transportadora_endereco: transportadora.endereco_completo
    });
    setShowTransportadoraModal(false);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold text-white mb-4">Transportadora dos Produtos</h2>
      <div className="bg-background-card rounded-lg border border-gray-800 p-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Transportadora
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={transportadoraSelecionada ? transportadoraSelecionada.nome : ''}
                placeholder="Selecione uma transportadora"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                readOnly
              />
              <button
                type="button"
                onClick={() => setShowTransportadoraModal(true)}
                className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <Search size={16} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Identificação do Frete
            </label>
            <select
              value={data.modalidade_frete || '9'}
              onChange={(e) => onChange({ ...data, modalidade_frete: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            >
              <option value="1">1 - Contratação do Frete por conta do Destinatário (FOB)</option>
              <option value="0">0 - Contratação do Frete por conta do Remetente (CIF)</option>
              <option value="2">2 - Contratação do Frete por conta de Terceiros</option>
              <option value="3">3 - Transporte Próprio por conta do Remetente</option>
              <option value="4">4 - Transporte Próprio por conta do Destinatário</option>
              <option value="9">9 - Sem Ocorrência de Transporte</option>
            </select>
          </div>
        </div>
      </div>

      {/* Modal de Transportadoras */}
      {showTransportadoraModal && (
        <TransportadoraSeletorModal
          isOpen={showTransportadoraModal}
          onClose={() => setShowTransportadoraModal(false)}
          onSelect={handleSelecionarTransportadora}
        />
      )}
    </div>
  );
};

const IntermediadorSection: React.FC = () => (
  <div className="p-4">
    <h2 className="text-xl font-bold text-white mb-4">Intermediador da Venda</h2>
    <div className="bg-background-card rounded-lg border border-gray-800 p-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Intermediador da venda
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Selecione ou digite o intermediador"
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
          />
          <button className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
            +
          </button>
        </div>
      </div>
    </div>
  </div>
);

const AutorizacaoSection: React.FC<{ dados: any; onChange: (dados: any) => void }> = ({ dados, onChange }) => {
  const formatarData = (dataISO: string) => {
    if (!dataISO) return '';
    const data = new Date(dataISO);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatarChave = (chave: string) => {
    if (!chave) return '';
    // Formatar chave: 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000
    return chave.replace(/(\d{4})/g, '$1 ').trim();
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold text-white mb-4">Autorização da NFe</h2>

      {/* Status da NFe */}
      <div className="bg-background-card rounded-lg border border-gray-800 p-4 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
            <FileText size={24} className="text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white">NFe Autorizada com Sucesso</h3>
            <p className="text-sm text-gray-400">
              {dados.data_autorizacao && `Autorizada em ${formatarData(dados.data_autorizacao)}`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Chave de Acesso
            </label>
            <div className="relative">
              <input
                type="text"
                value={formatarChave(dados.chave_acesso)}
                readOnly
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none font-mono text-sm"
              />
              <button
                onClick={() => navigator.clipboard.writeText(dados.chave_acesso)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
                title="Copiar chave"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Protocolo de Uso
            </label>
            <div className="relative">
              <input
                type="text"
                value={dados.protocolo_uso}
                readOnly
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none"
              />
              <button
                onClick={() => navigator.clipboard.writeText(dados.protocolo_uso)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
                title="Copiar protocolo"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Status
          </label>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
              ✓ {dados.status?.toUpperCase() || 'AUTORIZADA'}
            </span>
          </div>
        </div>
      </div>

      {/* Ações Pós-Autorização */}
      <div className="bg-background-card rounded-lg border border-gray-800 p-4">
        <h3 className="text-lg font-medium text-white mb-4">Ações Pós-Autorização</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sequência CCe
            </label>
            <input
              type="number"
              value={dados.sequencia_cce || ''}
              onChange={(e) => onChange({ ...dados, sequencia_cce: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
              placeholder="Sequência para Carta de Correção"
            />
            <p className="text-xs text-gray-500 mt-1">
              Número sequencial para Carta de Correção Eletrônica
            </p>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Carta de Correção
          </label>
          <textarea
            rows={3}
            value={dados.carta_correcao || ''}
            onChange={(e) => onChange({ ...dados, carta_correcao: e.target.value })}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500 resize-none"
            placeholder="Digite a correção que deseja fazer na NFe..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Use para corrigir dados que não alterem o valor do documento
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Motivo do Cancelamento
          </label>
          <textarea
            rows={3}
            value={dados.motivo_cancelamento || ''}
            onChange={(e) => onChange({ ...dados, motivo_cancelamento: e.target.value })}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500 resize-none"
            placeholder="Digite o motivo do cancelamento (mínimo 15 caracteres)..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Motivo deve ter no mínimo 15 caracteres
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2">
            <Download size={16} />
            Baixar XML
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center gap-2">
            <Download size={16} />
            Baixar PDF
          </button>
          <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 flex items-center gap-2">
            <Send size={16} />
            Enviar CCe
          </button>
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center gap-2">
            <X size={16} />
            Cancelar NFe
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal de seleção de transportadoras
const TransportadoraSeletorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelect: (transportadora: any) => void;
}> = ({ isOpen, onClose, onSelect }) => {
  const [transportadoras, setTransportadoras] = useState<any[]>([]);
  const [filteredTransportadoras, setFilteredTransportadoras] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTransportadoras();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = transportadoras.filter(transportadora =>
        transportadora.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transportadora.documento && transportadora.documento.includes(searchTerm))
      );
      setFilteredTransportadoras(filtered);
    } else {
      setFilteredTransportadoras(transportadoras);
    }
  }, [searchTerm, transportadoras]);

  const loadTransportadoras = async () => {
    try {
      setIsLoading(true);

      // Obter o usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Obter a empresa do usuário
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Buscar clientes que são transportadoras
      const { data: clientesData, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('is_transportadora', true)
        .or('deletado.is.null,deletado.eq.false')
        .order('nome');

      if (error) throw error;

      // Formatar dados das transportadoras
      const transportadorasFormatadas = (clientesData || []).map(cliente => ({
        id: cliente.id,
        nome: cliente.nome,
        documento: cliente.documento,
        telefone: cliente.telefone,
        email: cliente.email,
        endereco_completo: [
          cliente.endereco,
          cliente.numero,
          cliente.bairro,
          cliente.cidade,
          cliente.estado
        ].filter(Boolean).join(', ')
      }));

      setTransportadoras(transportadorasFormatadas);
      setFilteredTransportadoras(transportadorasFormatadas);
    } catch (error) {
      console.error('Erro ao carregar transportadoras:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatarDocumento = (documento: string) => {
    if (!documento) return '';
    const limpo = documento.replace(/\D/g, '');
    if (limpo.length === 14) {
      return limpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    } else if (limpo.length === 11) {
      return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return documento;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background-card rounded-lg border border-gray-800 w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Selecionar Transportadora</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mt-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por nome ou documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
              />
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </div>

        <div className="p-4 overflow-y-auto max-h-96">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-400">Carregando transportadoras...</p>
            </div>
          ) : filteredTransportadoras.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">
                {searchTerm ? 'Nenhuma transportadora encontrada' : 'Nenhuma transportadora cadastrada'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {!searchTerm && 'Cadastre clientes marcados como "Transportadora" para aparecerem aqui'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransportadoras.map((transportadora) => (
                <div
                  key={transportadora.id}
                  onClick={() => onSelect(transportadora)}
                  className="p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-primary-500 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{transportadora.nome}</h4>
                      {transportadora.documento && (
                        <p className="text-sm text-gray-400 mt-1">
                          {formatarDocumento(transportadora.documento)}
                        </p>
                      )}
                      {transportadora.telefone && (
                        <p className="text-sm text-gray-400">
                          📞 {transportadora.telefone}
                        </p>
                      )}
                      {transportadora.endereco_completo && (
                        <p className="text-sm text-gray-400">
                          📍 {transportadora.endereco_completo}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NfePage;
