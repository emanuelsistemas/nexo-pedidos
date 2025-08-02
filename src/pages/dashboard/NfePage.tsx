import React, { useState, useEffect } from 'react';
import { Plus, Edit, Eye, FileText, Search, Filter, ArrowLeft, Save, Send, Download, Copy, Trash2, X, Ban, Mail, MoreVertical, ImageIcon, AlertTriangle, Calculator, Truck, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/comum/Button';
import ProdutoSeletorModal from '../../components/comum/ProdutoSeletorModal';
import ClienteFormCompleto from '../../components/comum/ClienteFormCompleto';
import { supabase } from '../../lib/supabase';
import { useApiLogs } from '../../hooks/useApiLogs';
import { showMessage } from '../../utils/toast';
import { traduzirErroSefaz, extrairCodigoSefaz, gerarMensagemAmigavel, categorizarErro } from '../../utils/sefazErrorTranslator';

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
  ambiente?: 'homologacao' | 'producao'; // Ambiente da NFe
}

const NfePage: React.FC = () => {
  const [nfes, setNfes] = useState<NFe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Estados para modal de reenvio de email
  const [showReenvioModal, setShowReenvioModal] = useState(false);
  const [nfeParaReenvio, setNfeParaReenvio] = useState<NFe | null>(null);
  const [emailsParaReenvio, setEmailsParaReenvio] = useState<string[]>([]);
  const [isEnviandoEmail, setIsEnviandoEmail] = useState(false);

  // Ref para forçar re-renderização
  const [forceRender, setForceRender] = useState(0);

  // Monitorar mudanças no estado do modal
  useEffect(() => {
    if (showReenvioModal) {
      console.log('📧 Modal de reenvio de email aberto');
    }
  }, [showReenvioModal]);

  // Função para carregar CCe da nova tabela cce_nfe
  const carregarCCesDaTabela = async (chaveNfe: string, empresaId: string) => {
    try {
      console.log('📋 Carregando CCe da tabela cce_nfe:', { chaveNfe, empresaId });

      const response = await fetch(`/backend/public/listar-cce.php?chave_nfe=${encodeURIComponent(chaveNfe)}&empresa_id=${encodeURIComponent(empresaId)}`);

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        console.warn('⚠️ Erro ao carregar CCe:', result.error);
        return [];
      }

      console.log('✅ CCe carregadas da tabela:', result.data);
      return result.data || [];

    } catch (error) {
      console.error('❌ Erro ao carregar CCe da tabela:', error);
      return [];
    }
  };

  // Função showToast para compatibilidade
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success', duration?: number) => {
    showMessage(type, message);
  };

  // Estados para filtro avançado
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [naturezaFilter, setNaturezaFilter] = useState('');
  const [naturezasOperacao, setNaturezasOperacao] = useState<Array<{id: number, descricao: string}>>([]);
  const [dataInicioFilter, setDataInicioFilter] = useState(() => {
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
    trintaDiasAtras.setHours(0, 0, 0, 0);
    return trintaDiasAtras.toISOString().slice(0, 16);
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
    loadNaturezasOperacao();

    // Verificar se há dados de devolução no localStorage
    const dadosDevolucao = localStorage.getItem('dadosDevolucao');
    if (dadosDevolucao) {
      console.log('💾 Dados de devolução encontrados no localStorage');
      try {
        const dados = JSON.parse(dadosDevolucao);
        console.log('📦 Carregando dados de devolução:', dados);

        // Limpar localStorage
        localStorage.removeItem('dadosDevolucao');

        // Abrir modal de NF-e com dados da devolução
        handleNFeDevolucao(dados);
      } catch (error) {
        console.error('❌ Erro ao carregar dados de devolução:', error);
        localStorage.removeItem('dadosDevolucao');
      }
    }

    // Listener para abrir NF-e de devolução (mantido para compatibilidade)
    const handleAbrirNFeDevolucao = (event: CustomEvent) => {
      console.log('🎯 Evento abrirNFeDevolucao recebido:', event.detail);
      handleNFeDevolucao(event.detail);
    };

    window.addEventListener('abrirNFeDevolucao', handleAbrirNFeDevolucao as EventListener);

    return () => {
      window.removeEventListener('abrirNFeDevolucao', handleAbrirNFeDevolucao as EventListener);
    };
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
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNfes(nfesData || []);
    } catch (error) {
      // Erro ao carregar NFes
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar naturezas de operação
  const loadNaturezasOperacao = async () => {
    try {
      const { data, error } = await supabase
        .from('nfe_natureza_op')
        .select('id, descricao')
        .eq('ativo', true)
        .order('descricao');

      if (error) {
        console.error('Erro ao carregar naturezas de operação:', error);
        return;
      }

      setNaturezasOperacao(data || []);
    } catch (error) {
      console.error('Erro ao carregar naturezas de operação:', error);
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

  // Estados para modal de inutilização
  const [showInutilizacaoModal, setShowInutilizacaoModal] = useState(false);
  const [nfeParaInutilizar, setNfeParaInutilizar] = useState<NFe | null>(null);
  const [motivoInutilizacao, setMotivoInutilizacao] = useState('');
  const [inutilizandoNFe, setInutilizandoNFe] = useState(false);

  // ✅ NOVO: Estados para clonagem de NFe
  const [showClonagemModal, setShowClonagemModal] = useState(false);
  const [nfeParaClonar, setNfeParaClonar] = useState<NFe | null>(null);
  const [clonandoNFe, setClonandoNFe] = useState(false);
  const [proximoNumeroNFe, setProximoNumeroNFe] = useState<number | null>(null);

  // ✅ NOVO: Função para clonar NFe
  const handleClonarNFe = async (nfe: NFe) => {
    try {
      // Obter dados do usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        showToast('Usuário não autenticado', 'error');
        return;
      }

      // Obter empresa_id do usuário
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData) {
        showToast('Dados do usuário não encontrados', 'error');
        return;
      }

      // Buscar próximo número disponível
      const { data: ultimaNFe, error } = await supabase
        .from('pdv')
        .select('numero_documento')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('modelo_documento', 55)
        .not('numero_documento', 'is', null)
        .order('numero_documento', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Erro ao buscar último número:', error);
        setProximoNumeroNFe(null);
      } else {
        const ultimoNumero = ultimaNFe?.[0]?.numero_documento || 0;
        setProximoNumeroNFe(ultimoNumero + 1);
      }

      setNfeParaClonar(nfe);
      setShowClonagemModal(true);
    } catch (error) {
      console.error('Erro ao preparar clonagem:', error);
      showToast('Erro ao preparar clonagem. Tente novamente.', 'error');
    }
  };

  // ✅ NOVO: Função para confirmar clonagem
  const handleConfirmarClonagem = async () => {
    if (!nfeParaClonar) return;

    try {
      setClonandoNFe(true);

      // Buscar dados completos da NFe original
      const { data: nfeOriginal, error: nfeError } = await supabase
        .from('pdv')
        .select('*')
        .eq('id', nfeParaClonar.id)
        .single();

      if (nfeError) throw nfeError;

      // Buscar produtos da NFe original
      const { data: produtosOriginais, error: produtosError } = await supabase
        .from('pdv_itens')
        .select('*')
        .eq('pdv_id', nfeParaClonar.id);

      if (produtosError) throw produtosError;

      // Os pagamentos estão incluídos nos dados da própria NFe

      // As chaves de referência estão no campo chaves_referenciadas da própria NFe

      // Preparar dados da NFe clonada (removendo campos que serão gerados automaticamente)
      const {
        id,
        created_at,
        updated_at,
        numero_documento,  // ✅ REMOVER: Para gerar próximo número automaticamente
        numero_nfe,        // ✅ REMOVER: Para gerar próximo número automaticamente
        ...nfeOriginalSemIds
      } = nfeOriginal;

      const nfeClonada = {
        ...nfeOriginalSemIds,
        numero_documento: proximoNumeroNFe, // ✅ Usar número calculado
        status_nfe: 'rascunho', // Sempre criar como rascunho
        chave_nfe: null, // Será gerada na emissão
        protocolo_nfe: null, // Limpar protocolo
        data_emissao_nfe: null, // Limpar data de emissão
        xml_nfe: null, // Limpar XML
        // ✅ CORREÇÃO CRÍTICA: Atualizar dados_nfe com número correto
        dados_nfe: nfeOriginal.dados_nfe ? (() => {
          try {
            let dadosNfe = typeof nfeOriginal.dados_nfe === 'string'
              ? JSON.parse(nfeOriginal.dados_nfe)
              : nfeOriginal.dados_nfe;

            // Atualizar número nos dados_nfe
            if (dadosNfe.identificacao) {
              dadosNfe.identificacao.numero = proximoNumeroNFe?.toString() || '';
            }

            return JSON.stringify(dadosNfe);
          } catch (error) {
            console.error('Erro ao atualizar dados_nfe:', error);
            return nfeOriginal.dados_nfe;
          }
        })() : null
      };

      // Criar NFe clonada
      const { data: nfeCriada, error: criarError } = await supabase
        .from('pdv')
        .insert(nfeClonada)
        .select()
        .single();

      if (criarError) throw criarError;

      // Clonar produtos
      if (produtosOriginais && produtosOriginais.length > 0) {
        const produtosClonados = produtosOriginais.map(produto => {
          const { id, created_at, updated_at, ...produtoSemIds } = produto;
          return {
            ...produtoSemIds,
            pdv_id: nfeCriada.id
          };
        });

        const { error: produtosCloneError } = await supabase
          .from('pdv_itens')
          .insert(produtosClonados);

        if (produtosCloneError) throw produtosCloneError;
      }

      // Pagamentos já estão incluídos na NFe clonada (campo JSON)

      // Fechar modal
      setShowClonagemModal(false);
      setNfeParaClonar(null);
      setProximoNumeroNFe(null);

      // Recarregar lista
      await loadNfes();

      // Abrir NFe clonada para edição
      const nfeParaEdicao = {
        ...nfeCriada,
        produtos: produtosOriginais || []
      };

      console.log('🔍 NFe clonada criada:', nfeCriada);
      console.log('🔍 Número da NFe clonada:', nfeCriada.numero_documento);
      console.log('🔍 NFe para edição:', nfeParaEdicao);

      handleEditarRascunho(nfeParaEdicao);

      showToast('NFe clonada com sucesso!', 'success');

    } catch (error) {
      console.error('Erro ao clonar NFe:', error);
      showToast('Erro ao clonar NFe. Tente novamente.', 'error');
    } finally {
      setClonandoNFe(false);
    }
  };

  // Funções para ações da NFe
  const handleInutilizar = (nfe: NFe) => {
    setNfeParaInutilizar(nfe);
    setMotivoInutilizacao('');
    setShowInutilizacaoModal(true);
  };

  // Função para confirmar inutilização
  const handleConfirmarInutilizacao = async () => {
    if (!nfeParaInutilizar || !motivoInutilizacao.trim()) {
      showToast('Motivo da inutilização é obrigatório', 'error');
      return;
    }

    if (motivoInutilizacao.trim().length < 15) {
      showToast('Motivo deve ter pelo menos 15 caracteres', 'error');
      return;
    }

    try {
      setInutilizandoNFe(true);

      // Obter dados do usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Usuário não autenticado');
      }

      // Obter empresa_id do usuário
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        throw new Error('Empresa não encontrada para o usuário');
      }

      // Preparar dados para inutilização
      const inutilizacaoData = {
        empresa_id: usuarioData.empresa_id,
        serie: nfeParaInutilizar.serie_documento || 1,
        numero_inicial: nfeParaInutilizar.numero_documento,
        numero_final: nfeParaInutilizar.numero_documento,
        motivo: motivoInutilizacao.trim(),
        nfe_id: nfeParaInutilizar.id
      };

      console.log('📤 Enviando dados para inutilização:', inutilizacaoData);

      // Chamar API de inutilização
      const response = await fetch('/backend/public/inutilizar-nfe-v2.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inutilizacaoData)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao inutilizar NFe');
      }

      console.log('✅ NFe inutilizada com sucesso:', result);

      showToast('NFe inutilizada com sucesso!', 'success');

      // Fechar modal e recarregar lista
      setShowInutilizacaoModal(false);
      setNfeParaInutilizar(null);
      setMotivoInutilizacao('');

      // Recarregar NFes
      window.location.reload();

    } catch (error) {
      console.error('❌ Erro ao inutilizar NFe:', error);
      showToast(error instanceof Error ? error.message : 'Erro ao inutilizar NFe', 'error');
    } finally {
      setInutilizandoNFe(false);
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



  const handleReenviarEmail = async (nfe: NFe) => {
    console.log('📧 Iniciando reenvio de email para NFe:', nfe.numero_documento);

    if (nfe.status_nfe !== 'autorizada') {
      showToast('Apenas NFe autorizadas podem ter email reenviado', 'error');
      return;
    }

    try {
      // Obter empresa_id do usuário logado
      const { data: userData } = await supabase.auth.getUser();
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user?.id)
        .single();

      if (!usuarioData?.empresa_id) {
        showToast('Empresa não identificada', 'error');
        return;
      }

      // ✅ MELHORADO: Buscar emails do destinatário usando múltiplas estratégias
      let emailsDestinatario = [];
      let dadosNFeCompletos = null;

      // Estratégia 1: Buscar dados completos da NFe se disponível
      if (nfe.dados_nfe) {
        try {
          dadosNFeCompletos = typeof nfe.dados_nfe === 'string'
            ? JSON.parse(nfe.dados_nfe)
            : nfe.dados_nfe;

          emailsDestinatario = dadosNFeCompletos?.destinatario?.emails || [];
        } catch (parseError) {
          console.warn('Erro ao fazer parse dos dados da NFe:', parseError);
        }
      }

      // Estratégia 2: Buscar documento do cliente na tabela pdv
      if (emailsDestinatario.length === 0) {
        const { data: nfeCompleta } = await supabase
          .from('pdv')
          .select('documento_cliente')
          .eq('id', nfe.id)
          .single();

        const documentoCliente = nfeCompleta?.documento_cliente;

        if (documentoCliente) {
          const { data: clienteData } = await supabase
            .from('clientes')
            .select('emails, nome')
            .eq('empresa_id', usuarioData.empresa_id)
            .eq('documento', documentoCliente)
            .single();

          emailsDestinatario = clienteData?.emails || [];
        }
      }

      // Estratégia 3: Buscar por nome do cliente se ainda não encontrou
      if (emailsDestinatario.length === 0 && nfe.nome_cliente) {
        const { data: clienteData } = await supabase
          .from('clientes')
          .select('emails, nome')
          .eq('empresa_id', usuarioData.empresa_id)
          .ilike('nome', `%${nfe.nome_cliente}%`)
          .limit(1)
          .single();

        emailsDestinatario = clienteData?.emails || [];
      }

      if (emailsDestinatario.length === 0) {
        showToast('Nenhum email cadastrado para este destinatário', 'error');
        return;
      }

      // ✅ TEMPORÁRIO: Usar dados básicos para evitar erro na consulta
      // TODO: Investigar estrutura da tabela empresas
      const empresaData = {
        nome_fantasia: 'Sistema Nexo',
        razao_social: 'Sistema Nexo',
        cnpj: '',
        endereco: '',
        telefone: '',
        email: '',
        website: ''
      };

      // Abrir modal de confirmação
      console.log('📧 Abrindo modal de reenvio para:', emailsDestinatario.length, 'email(s)');

      setNfeParaReenvio(nfe);
      setEmailsParaReenvio(emailsDestinatario);
      setShowReenvioModal(true);

    } catch (error) {
      console.error('Erro ao preparar reenvio de email:', error);
      showToast(`❌ Erro ao preparar reenvio: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
    }
  };

  // ✅ NOVA FUNÇÃO: Executar reenvio de email após confirmação no modal
  const executarReenvioEmail = async () => {
    if (!nfeParaReenvio || emailsParaReenvio.length === 0) return;

    try {
      setIsEnviandoEmail(true);

      // Obter dados do usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        showToast('Usuário não autenticado', 'error');
        return;
      }

      // Obter empresa_id do usuário
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user?.id)
        .single();

      if (!usuarioData?.empresa_id) {
        showToast('Empresa não identificada', 'error');
        return;
      }

      // Dados da empresa (usando dados básicos por enquanto)
      const empresaData = {
        nome_fantasia: 'Sistema Nexo',
        razao_social: 'Sistema Nexo',
        cnpj: '',
        endereco: '',
        telefone: '',
        email: '',
        website: ''
      };

      showToast('Enviando email...', 'info');
      showToast('Enviando email...', 'info');

      // ✅ USAR MESMAS CONFIGURAÇÕES DA EMISSÃO
      const response = await fetch('/backend/public/enviar-nfe-email.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          empresa_id: usuarioData.empresa_id,
          chave_nfe: nfeParaReenvio.chave_nfe,
          emails: emailsParaReenvio,
          nfe_data: {
            numero: nfeParaReenvio.numero_documento,
            serie: nfeParaReenvio.serie_documento || 1,
            valor_total: nfeParaReenvio.valor_total || 0,
            cliente_nome: nfeParaReenvio.nome_cliente,
            empresa_nome: empresaData?.nome_fantasia || empresaData?.razao_social || 'Sistema Nexo',
            empresa_endereco: empresaData?.endereco || '',
            empresa_cnpj: empresaData?.cnpj || '',
            empresa_telefone: empresaData?.telefone || '',
            empresa_email: empresaData?.email || '',
            empresa_website: empresaData?.website || ''
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          showToast(`✅ Email reenviado com sucesso para: ${emailsParaReenvio.join(', ')}`, 'success');
          setShowReenvioModal(false); // Fechar modal após sucesso
        } else {
          // ✅ MELHORADO: Mostrar detalhes específicos do erro
          let errorMessage = result.error || 'Erro desconhecido';

          // Tentar extrair erro específico se for JSON
          try {
            const errorData = JSON.parse(result.error);
            if (errorData.titulo && errorData.descricao) {
              errorMessage = `${errorData.titulo}: ${errorData.descricao}`;
            }
          } catch (parseError) {
            // Usar erro original se não conseguir fazer parse
          }

          showToast(`❌ ${errorMessage}`, 'error');

          // Mostrar informações sobre arquivos se disponível
          if (result.arquivos) {
            console.log('📁 Informações dos arquivos:', result.arquivos);
            if (!result.arquivos.xml_existe) {
              showToast('⚠️ Arquivo XML não encontrado', 'error');
            }
            if (!result.arquivos.pdf_existe) {
              showToast('⚠️ Arquivo PDF não encontrado', 'error');
            }
          }
        }
      } else {
        // ✅ MELHORADO: Tentar obter detalhes do erro HTTP
        const errorText = await response.text();
        let errorDetails = 'Erro na comunicação com o servidor';
        try {
          const errorData = JSON.parse(errorText);
          errorDetails = errorData.error || errorDetails;
        } catch (parseError) {
          errorDetails = errorText || errorDetails;
        }
        showToast(`❌ ${errorDetails}`, 'error');
      }

    } catch (error) {
      console.error('Erro ao reenviar email:', error);
      showToast(`❌ Erro ao reenviar email: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
    } finally {
      setIsEnviandoEmail(false);
    }
  };

  // ✅ FUNÇÃO: Baixar XML da NFe
  const handleBaixarXML = async (nfe: NFe) => {
    if (nfe.status_nfe !== 'autorizada') {
      showToast('Apenas NFe autorizadas possuem XML disponível', 'error');
      return;
    }

    if (!nfe.chave_nfe) {
      showToast('Chave da NFe não encontrada', 'error');
      return;
    }

    try {
      // Obter empresa_id do usuário logado
      const { data: userData } = await supabase.auth.getUser();
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        showToast('Empresa não identificada', 'error');
        return;
      }

      // Usar endpoint local para download
      const xmlUrl = `/backend/public/download-arquivo.php?type=xml&chave=${nfe.chave_nfe}&empresa_id=${usuarioData.empresa_id}`;

      // Criar link temporário para download
      const link = document.createElement('a');
      link.href = xmlUrl;
      link.download = `NFe_${nfe.chave_nfe}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Download do XML iniciado', 'success');
    } catch (error) {
      console.error('Erro ao baixar XML:', error);
      showToast(`Erro ao baixar XML: ${error.message}`, 'error');
    }
  };

  // ✅ FUNÇÃO: Visualizar PDF da NFe
  const handleVisualizarPDF = async (nfe: NFe) => {
    if (nfe.status_nfe !== 'autorizada') {
      showToast('Apenas NFe autorizadas possuem PDF disponível', 'error');
      return;
    }

    if (!nfe.chave_nfe) {
      showToast('Chave da NFe não encontrada', 'error');
      return;
    }

    try {
      showToast('Gerando PDF da NFe...', 'info');

      // Obter empresa_id do usuário logado
      const { data: userData } = await supabase.auth.getUser();
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        showToast('Empresa não identificada', 'error');
        return;
      }

      // PRIMEIRO: Tentar gerar o PDF via endpoint local
      const gerarPdfUrl = `/backend/public/gerar-danfe.php`;

      const response = await fetch(gerarPdfUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chave: nfe.chave_nfe,
          empresa_id: usuarioData.empresa_id
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const result = await response.json();

      if (!result.sucesso) {
        throw new Error(result.erro || 'Erro ao gerar PDF');
      }

      // SEGUNDO: Abrir o PDF gerado
      const pdfUrl = `/backend/public/download-arquivo.php?type=pdf&chave=${nfe.chave_nfe}&empresa_id=${usuarioData.empresa_id}&action=view`;

      // Aguardar um pouco para o arquivo ser salvo
      setTimeout(() => {
        window.open(pdfUrl, '_blank');
        showToast('PDF gerado e aberto em nova aba', 'success');
      }, 1000);

    } catch (error) {
      console.error('Erro ao visualizar PDF:', error);

      // FALLBACK: Tentar abrir diretamente (caso já exista)
      try {
        // Obter empresa_id novamente para fallback
        const { data: userData } = await supabase.auth.getUser();
        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('empresa_id')
          .eq('id', userData.user.id)
          .single();

        if (usuarioData?.empresa_id) {
          const pdfUrl = `/backend/public/download-arquivo.php?type=pdf&chave=${nfe.chave_nfe}&empresa_id=${usuarioData.empresa_id}&action=view`;
          window.open(pdfUrl, '_blank');
          showToast('PDF aberto em nova aba', 'success');
        } else {
          throw new Error('Empresa não identificada');
        }
      } catch (fallbackError) {
        showToast(`Erro ao gerar/visualizar PDF: ${error.message}`, 'error');
      }
    }
  };



  // Função para visualizar PDF da CCe
  const handleVisualizarPDFCCe = async (chave: string, sequencia: number) => {
    console.log('📄 Iniciando visualização do PDF da CCe:', chave, 'sequência:', sequencia);

    try {
      showToast('Gerando PDF da CCe...', 'info');

      // Obter empresa_id do usuário logado
      const { data: userData } = await supabase.auth.getUser();
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        showToast('Empresa não identificada', 'error');
        return;
      }

      // Tentar gerar o PDF da CCe
      const response = await fetch('/backend/public/gerar-pdf-cce.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chave: chave,
          empresa_id: usuarioData.empresa_id,
          sequencia: sequencia
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Erro ao gerar PDF da CCe');
      }

      // Abrir o PDF gerado em nova aba
      const pdfUrl = `/backend/public/download-arquivo.php?type=pdf_cce&chave=${chave}&empresa_id=${usuarioData.empresa_id}&sequencia=${sequencia}&action=view`;

      // Aguardar um pouco para o arquivo ser salvo
      setTimeout(() => {
        window.open(pdfUrl, '_blank');
        showToast('PDF da CCe aberto em nova aba', 'success');
      }, 1000);

    } catch (error) {
      console.error('Erro ao visualizar PDF da CCe:', error);
      showToast(`Erro ao gerar/visualizar PDF da CCe: ${error.message}`, 'error');
    }
  };

  // ✅ FUNÇÃO: Copiar Chave da NFe
  const handleCopiarChave = async (nfe: NFe) => {
    if (nfe.status_nfe !== 'autorizada') {
      showToast('Apenas NFe autorizadas possuem chave disponível', 'error');
      return;
    }

    if (!nfe.chave_nfe) {
      showToast('Chave da NFe não encontrada', 'error');
      return;
    }

    try {
      // Copiar chave para a área de transferência
      await navigator.clipboard.writeText(nfe.chave_nfe);

      showToast(
        `Chave NFe copiada!\n\n${nfe.chave_nfe}\n\nA chave foi copiada para a área de transferência.`,
        'success',
        6000
      );
    } catch (error) {
      // Fallback para navegadores que não suportam clipboard API
      try {
        const textArea = document.createElement('textarea');
        textArea.value = nfe.chave_nfe;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);

        showToast(
          `Chave NFe copiada!\n\n${nfe.chave_nfe}\n\nA chave foi copiada para a área de transferência.`,
          'success',
          6000
        );
      } catch (fallbackError) {
        console.error('Erro ao copiar chave:', fallbackError);

        // Mostrar a chave em um prompt para o usuário copiar manualmente
        prompt(
          'Chave da NFe (Ctrl+C para copiar):',
          nfe.chave_nfe
        );

        showToast('Chave exibida para cópia manual', 'info');
      }
    }
  };

  // ✅ COMPONENTE: Menu Dropdown de Ações
  const ActionDropdown: React.FC<{ nfe: NFe }> = ({ nfe }) => {
    const dropdownId = `dropdown-${nfe.id}`;
    const isOpen = openDropdown === dropdownId;

    const toggleDropdown = (e: React.MouseEvent) => {
      e.stopPropagation();
      setOpenDropdown(isOpen ? null : dropdownId);
    };

    const closeDropdown = () => {
      setOpenDropdown(null);
    };

    // Fechar dropdown quando clicar fora
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (isOpen && !(event.target as Element).closest(`#${dropdownId}`)) {
          closeDropdown();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, dropdownId]);

    const handleAction = (action: () => void) => {
      action();
      closeDropdown();
    };

    return (
      <div className="relative" id={dropdownId}>
        <button
          onClick={toggleDropdown}
          className="text-gray-400 hover:text-gray-300 p-1 rounded-lg hover:bg-gray-800 transition-colors"
          title="Ações"
        >
          <MoreVertical size={16} />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-8 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 min-w-[180px]">
            <div className="py-1">
              {/* Editar/Visualizar */}
              <button
                onClick={() => handleAction(() => {
                  if (nfe.status_nfe === 'rascunho') {
                    handleEditarRascunho(nfe);
                  } else {
                    handleVisualizarNFe(nfe);
                  }
                })}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
              >
                {nfe.status_nfe === 'rascunho' ? <Edit size={14} /> : <Eye size={14} />}
                {nfe.status_nfe === 'rascunho' ? 'Continuar Editando' : 'Visualizar'}
              </button>

              {/* Separador */}
              <div className="border-t border-gray-700 my-1"></div>

              {/* ✅ NOVO: Clonar NFe */}
              <button
                onClick={() => handleAction(() => handleClonarNFe(nfe))}
                className="w-full px-4 py-2 text-left text-sm text-cyan-400 hover:bg-gray-700 flex items-center gap-2"
              >
                <Copy size={14} />
                Clonar NFe
              </button>

              {/* Separador */}
              <div className="border-t border-gray-700 my-1"></div>

              {/* Ações para NFe Autorizadas */}
              {nfe.status_nfe === 'autorizada' && (
                <>
                  <button
                    onClick={() => handleAction(() => handleBaixarXML(nfe))}
                    className="w-full px-4 py-2 text-left text-sm text-blue-400 hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Download size={14} />
                    Baixar XML
                  </button>

                  <button
                    onClick={() => handleAction(() => handleVisualizarPDF(nfe))}
                    className="w-full px-4 py-2 text-left text-sm text-purple-400 hover:bg-gray-700 flex items-center gap-2"
                  >
                    <FileText size={14} />
                    Visualizar PDF
                  </button>

                  <button
                    onClick={() => handleAction(() => handleCopiarChave(nfe))}
                    className="w-full px-4 py-2 text-left text-sm text-yellow-400 hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Copy size={14} />
                    Chave NFe
                  </button>

                  <button
                    onClick={() => handleAction(() => handleReenviarEmail(nfe))}
                    className="w-full px-4 py-2 text-left text-sm text-green-400 hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Mail size={14} />
                    Reenviar Email
                  </button>

                  {/* ✅ CANCELAMENTO REMOVIDO DA GRID - Agora é feito dentro da própria NFe */}
                  {/* Cancelamento está disponível na seção "Autorização" da NFe */}
                </>
              )}

              {/* Inutilizar - para NFe não autorizadas */}
              {nfe.status_nfe !== 'autorizada' && nfe.status_nfe !== 'cancelada' && nfe.status_nfe !== 'inutilizada' && (
                <button
                  onClick={() => handleAction(() => handleInutilizar(nfe))}
                  className="w-full px-4 py-2 text-left text-sm text-orange-400 hover:bg-gray-700 flex items-center gap-2"
                >
                  <Ban size={14} />
                  Inutilizar NFe
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };







  // Função para criar nova NFe
  const handleNovaNFe = () => {
    console.log('🆕 handleNovaNFe chamada - Criando nova NFe');
    setIsViewMode(false); // Resetar modo de visualização
    setShowForm(true);

    // Disparar evento para resetar flag de edição no formulário
    setTimeout(() => {
      console.log('🔄 Disparando evento resetEditingFlag para NOVA NFe');
      const event = new CustomEvent('resetEditingFlag', {
        detail: { isNewNfe: true } // ✅ Indicar que é uma nova NFe
      });
      window.dispatchEvent(event);
    }, 100);
  };

  // Função para abrir NF-e de devolução
  const handleNFeDevolucao = (dadosDevolucao: any) => {
    console.log('🔄 handleNFeDevolucao chamada - Abrindo NF-e para devolução:', dadosDevolucao);
    console.log('🔄 Estado atual - showForm:', showForm, 'isViewMode:', isViewMode);

    setIsViewMode(false);
    setShowForm(true);

    console.log('🔄 Estados alterados - showForm: true, isViewMode: false');

    // Disparar evento para carregar dados da devolução no formulário
    setTimeout(() => {
      console.log('🔄 Disparando evento loadDevolucaoData');
      const event = new CustomEvent('loadDevolucaoData', {
        detail: dadosDevolucao
      });
      window.dispatchEvent(event);
    }, 100);
  };

  // Função para carregar e editar rascunho
  const handleEditarRascunho = async (rascunho: NFe) => {
    try {
      showToast(`Carregando rascunho NFe nº ${rascunho.numero_documento || 'S/N'}...`, 'info', 2000);

      // Resetar modo de visualização e criar um novo formulário com os dados do rascunho
      setIsViewMode(false);
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

  // Função para visualizar NFe em modo somente leitura
  const handleVisualizarNFe = async (nfe: NFe) => {
    try {
      console.log('🔍 INICIANDO VISUALIZAÇÃO DA NFe:', nfe);
      showToast(`Carregando NFe nº ${nfe.numero_documento || 'S/N'} para visualização...`, 'info', 2000);

      // Ativar modo de visualização
      setIsViewMode(true);
      setShowForm(true);

      // Aguardar um pouco para o formulário ser montado
      setTimeout(async () => {
        console.log('📤 Disparando evento loadNfeView com dados:', nfe);

        // Disparar evento customizado para carregar a NFe em modo visualização
        const event = new CustomEvent('loadNfeView', {
          detail: nfe
        });
        window.dispatchEvent(event);

        showToast(`NFe nº ${nfe.numero_documento || 'S/N'} carregada em modo visualização`, 'success', 3000);
      }, 500);

    } catch (error) {
      console.error('Erro ao carregar NFe para visualização:', error);
      showToast(`Erro ao carregar NFe: ${error.message}`, 'error');
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

    // Filtros aplicados (debug removido para performance)

    return matchesSearch && matchesStatus && matchesNatureza && matchesData;
  });

  // Filtros aplicados com sucesso

  if (showForm) {
    return <NfeForm
      onBack={() => {
        setShowForm(false);
        setIsViewMode(false); // Resetar modo de visualização ao voltar

        // ✅ CORREÇÃO: Disparar evento de reset SEM buscar próximo número
        setTimeout(() => {
          console.log('🔙 Voltando do formulário - Resetando SEM buscar número');
          const event = new CustomEvent('resetEditingFlag', {
            detail: { isNewNfe: false } // ✅ NÃO é nova NFe, apenas saindo
          });
          window.dispatchEvent(event);
        }, 100);
      }}
      onSave={loadNfes}
      isViewMode={isViewMode}
    />;
  }

  return (
    <div className="p-4">
      {/* 📧 MODAL DE REENVIO DE EMAIL */}
      {showReenvioModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center"
          style={{ zIndex: 999999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="bg-background-card rounded-lg shadow-xl max-w-md w-full mx-4 p-6 border border-gray-800">
            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-4">
                📧 Reenviar Email da NFe
              </h2>

              {nfeParaReenvio && (
                <div className="bg-gray-800/50 rounded-lg p-4 mb-4 text-left border border-gray-700">
                  <p className="text-sm text-gray-300">
                    <strong className="text-white">NFe:</strong> {nfeParaReenvio.numero_documento}
                  </p>
                  <p className="text-sm text-gray-300">
                    <strong className="text-white">Cliente:</strong> {nfeParaReenvio.nome_cliente}
                  </p>
                  <p className="text-sm text-gray-300">
                    <strong className="text-white">Valor:</strong> R$ {nfeParaReenvio.valor_total?.toFixed(2) || '0,00'}
                  </p>
                  <p className="text-sm text-gray-300">
                    <strong className="text-white">Emails:</strong> {emailsParaReenvio.join(', ')}
                  </p>
                </div>
              )}

              <p className="text-gray-400 mb-6">
                Deseja reenviar o XML e DANFE para os emails cadastrados?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowReenvioModal(false);
                    setNfeParaReenvio(null);
                    setEmailsParaReenvio([]);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg border border-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={executarReenvioEmail}
                  disabled={isEnviandoEmail}
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {isEnviandoEmail ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Enviando...
                    </>
                  ) : (
                    'Reenviar'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
            onClick={handleNovaNFe}
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
                  {naturezasOperacao.map((natureza) => (
                    <option key={natureza.id} value={natureza.descricao}>
                      {natureza.descricao}
                    </option>
                  ))}
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
                onClick={handleNovaNFe}
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-[10%] whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-[10%] whitespace-nowrap">
                      Ambiente
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
                      <td className="px-4 py-3 whitespace-nowrap w-[10%]">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(nfe.status_nfe)}`}>
                          {getStatusLabel(nfe.status_nfe)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap w-[10%]">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${
                          (nfe.ambiente || 'homologacao') === 'producao'
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                        }`}>
                          {(nfe.ambiente || 'homologacao') === 'producao' ? 'PRODUÇÃO' : 'HOMOLOG.'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-white w-[15%]">
                        {nfe.natureza_operacao || 'VENDA'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-white w-[25%]">
                        {nfe.nome_cliente || 'Consumidor Final'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400 w-[12%]">
                        {new Date(nfe.created_at).toLocaleDateString('pt-BR', {
                          timeZone: 'America/Sao_Paulo' // ✅ FORÇAR TIMEZONE BRASILEIRO
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-white w-[10%]">
                        R$ {(nfe.valor_total || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium w-[8%]">
                        <div className="flex items-center justify-end">
                          <ActionDropdown nfe={nfe} />
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
      {/* Modal de Inutilização */}
      {showInutilizacaoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-orange-400 mb-4">
              ⚠️ Inutilizar NFe
            </h3>

            <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4 mb-4">
              <p className="text-orange-300 text-sm mb-2">
                <strong>ATENÇÃO:</strong> Esta ação é IRREVERSÍVEL!
              </p>
              <p className="text-gray-300 text-sm">
                NFe nº <strong>{nfeParaInutilizar?.numero_documento}</strong> será inutilizada na SEFAZ.
                Use apenas quando:
              </p>
              <ul className="text-gray-300 text-sm mt-2 ml-4 list-disc">
                <li>A numeração foi pulada por erro</li>
                <li>Houve falha na emissão</li>
                <li>Necessário corrigir sequência numérica</li>
              </ul>
            </div>

            <p className="text-gray-300 mb-4">
              Digite o motivo da inutilização (mínimo 15 caracteres):
            </p>
            <textarea
              value={motivoInutilizacao}
              onChange={(e) => setMotivoInutilizacao(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 resize-none"
              rows={3}
              placeholder="Ex: Numeração pulada por erro no sistema - necessário corrigir sequência"
            />
            <div className="text-sm text-gray-400 mb-4">
              {motivoInutilizacao.length}/15 caracteres mínimos
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowInutilizacaoModal(false);
                  setNfeParaInutilizar(null);
                  setMotivoInutilizacao('');
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                disabled={inutilizandoNFe}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarInutilizacao}
                disabled={motivoInutilizacao.length < 15 || inutilizandoNFe}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {inutilizandoNFe ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Inutilizando...
                  </>
                ) : (
                  'Confirmar Inutilização'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NOVO: Modal de Clonagem */}
      {showClonagemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-cyan-400 mb-4">
              📋 Clonar NFe
            </h3>

            <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4 mb-4">
              <p className="text-cyan-300 text-sm mb-2">
                <strong>CLONAGEM DE NFe:</strong> Uma cópia será criada
              </p>
              <p className="text-gray-300 text-sm">
                NFe nº <strong>{nfeParaClonar?.numero_documento}</strong> será clonada como:
              </p>
              <p className="text-green-300 text-sm font-semibold mt-1">
                ➜ Nova NFe nº <strong>{proximoNumeroNFe || '(calculando...)'}</strong>
              </p>
              <ul className="text-gray-300 text-sm mt-2 ml-4 list-disc">
                <li>Todos os produtos e quantidades</li>
                <li>Dados do destinatário</li>
                <li>Formas de pagamento</li>
                <li>Chaves de referência (se houver)</li>
              </ul>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
              <p className="text-blue-300 text-sm">
                <strong>💡 A NFe clonada será criada como:</strong>
              </p>
              <ul className="text-gray-300 text-sm mt-1 ml-4 list-disc">
                <li>Status: <strong>Rascunho</strong></li>
                <li>Número: <strong>Será gerado automaticamente</strong></li>
                <li>Data: <strong>Data atual</strong></li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowClonagemModal(false);
                  setNfeParaClonar(null);
                  setProximoNumeroNFe(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                disabled={clonandoNFe}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarClonagem}
                disabled={clonandoNFe}
                className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {clonandoNFe ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Clonando...
                  </>
                ) : (
                  'Confirmar Clonagem'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente do formulário de NFe com abas laterais
const NfeForm: React.FC<{ onBack: () => void; onSave: () => void; isViewMode?: boolean }> = ({ onBack, onSave, isViewMode = false }) => {
  const [activeSection, setActiveSection] = useState('identificacao');
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingRascunho, setIsSavingRascunho] = useState(false);
  const [nfeEmitida, setNfeEmitida] = useState(false);
  const [ambienteNFe, setAmbienteNFe] = useState<'homologacao' | 'producao'>('homologacao');
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null); // Estado para erro de email
  const [showCloseButton, setShowCloseButton] = useState(false); // Estado para mostrar botão fechar
  const [emailProcessCompleted, setEmailProcessCompleted] = useState(false); // Flag para indicar que processo de email terminou
  const [naturezasOperacao, setNaturezasOperacao] = useState<Array<{id: number, descricao: string}>>([]);
  const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [sefazStatus, setSefazStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [progressSteps, setProgressSteps] = useState([
    { id: 'validacao', label: 'Validando dados da NFe', status: 'pending', message: '' },
    { id: 'geracao', label: 'Gerando XML da NFe', status: 'pending', message: '' },
    { id: 'sefaz', label: 'Enviando para SEFAZ', status: 'pending', message: '' },
    { id: 'validacao_xml', label: 'Validando geração do XML', status: 'pending', message: '' },
    { id: 'validacao_pdf', label: 'Validando geração do PDF', status: 'pending', message: '' },
    { id: 'banco', label: 'Salvando no banco de dados', status: 'pending', message: '' },
    { id: 'finalizacao', label: 'Finalizando processo', status: 'pending', message: '' }
  ]);
  const [logs, setLogs] = useState<string[]>([]);
  const [showCCeModal, setShowCCeModal] = useState(false);
  const [cceStatus, setCceStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [cceMessage, setCceMessage] = useState('');
  const [dadosAutorizacao, setDadosAutorizacao] = useState<{
    chave: string;
    protocolo: string;
    dataAutorizacao: string;
    status: string;
    ambiente: string;
    sequencia_cce: number;
    carta_correcao: string;
    cartas_correcao: any[];
    motivo_cancelamento?: string;
    data_cancelamento?: string;
    [key: string]: any;
  }>({
    chave: '',
    protocolo: '',
    dataAutorizacao: '',
    status: '',
    ambiente: 'homologacao',
    sequencia_cce: 1, // Campo para controlar a sequência da CCe
    carta_correcao: '', // Campo para o texto da carta de correção
    cartas_correcao: [] // Array para histórico de CCe enviadas
  });

  // Hook para logs da API
  const {
    apiLogs,
    isLoadingApiLogs,
    apiLogsError,
    fetchApiLogs,
    formatApiLog,
    copyApiLogsToClipboard,
    clearApiLogs
  } = useApiLogs();

  // Função para limpar todos os logs
  const clearAllLogs = () => {
    setLogs([]); // Limpar logs do frontend
    clearApiLogs(); // Limpar logs da API
  };

  // ✅ Função para fechar modal manualmente (quando há erro de email)
  const handleCloseModal = () => {
    setShowProgressModal(false);
    setEmailError(null);
    setShowCloseButton(false);
    setEmailProcessCompleted(false);
    clearAllLogs();
    onSave(); // Recarregar a lista de NFe
    onBack(); // Voltar para a grid de NFe
  };

  // ✅ useEffect para verificar se deve fechar automaticamente após processo de email
  useEffect(() => {
    if (emailProcessCompleted && showProgressModal) {
      // Aguardar um pouco para garantir que todos os estados foram atualizados
      setTimeout(() => {
        if (emailError) {
          addLog('⚠️ NFe emitida com sucesso, mas houve erro no envio de email');
          addLog('📧 Clique em "Fechar" para continuar');
          // Não fechar automaticamente - aguardar usuário clicar em "Fechar"
        } else {
          // Fechar automaticamente apenas se não houver erro de email
          setTimeout(() => {
            setShowProgressModal(false);
            setEmailProcessCompleted(false);
            clearAllLogs();
            onSave();
            onBack();
          }, 2000); // Aguardar 2 segundos para mostrar sucesso
        }
      }, 500); // Pequeno delay para garantir que estados foram atualizados
    }
  }, [emailProcessCompleted, emailError, showProgressModal]);
  const [isEditingRascunho, setIsEditingRascunho] = useState(false);
  const [rascunhoId, setRascunhoId] = useState<string | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [nfeData, setNfeData] = useState({
    identificacao: {
      modelo: 55,
      serie: 1,
      numero: '',
      codigo_numerico: '', // Campo para armazenar o código gerado
      data_emissao: (() => {
        // ✅ GERAR DATA BRASILEIRA CORRETA (UTC-3)
        const agora = new Date();
        const offsetBrasil = -3 * 60; // UTC-3 em minutos
        const dataBrasil = new Date(agora.getTime() + (offsetBrasil * 60 * 1000));
        return dataBrasil.toISOString().slice(0, 16);
      })(),
      tipo_documento: '1',
      finalidade: '1',
      presenca: '9',
      natureza_operacao: 'Venda de Mercadoria',
      informacao_adicional: ''
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
      // ✅ ADICIONADO: Campos obrigatórios para NFe
      transportadora_cidade: '',
      transportadora_uf: '',
      transportadora_ie: '',
      modalidade_frete: '9',
      // ✅ ADICIONADO: Campos de veículo
      veiculo_placa: '',
      veiculo_uf: '',
      veiculo_rntc: '',
      // ✅ ADICIONADO: Campos de volumes
      volumes_quantidade: '',
      volumes_especie: '',
      volumes_marca: '',
      volumes_numeracao: '',
      volumes_peso_bruto: '',
      volumes_peso_liquido: ''
    },
    intermediador: {
      nome: '',
      cnpj: '',
      cnpj_formatado: ''
    },
    empresa: null
  });

  // Função para buscar próximo número NFe (apenas para Nova NFe)
  const buscarProximoNumero = async () => {
    console.log('🔍 Iniciando busca do próximo número...');
    console.log('🔍 Estado atual - isEditingRascunho:', isEditingRascunho);
    console.log('🔍 Estado atual - numero atual:', nfeData.identificacao.numero);
    console.log('🔍 Estado atual - ambiente:', ambienteNFe);

    // ✅ VALIDAÇÃO EXTRA: Só buscar se não estiver editando rascunho
    if (isEditingRascunho) {
      console.log('🚫 Editando rascunho - Pulando busca de próximo número');
      return;
    }

    // ✅ VALIDAÇÃO EXTRA: Só buscar se número atual estiver vazio
    if (nfeData.identificacao.numero && nfeData.identificacao.numero !== '') {
      console.log('🚫 Número já preenchido - Pulando busca:', nfeData.identificacao.numero);
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        console.log('❌ Usuário não autenticado');
        return;
      }

      console.log('✅ Usuário autenticado:', userData.user.id);

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        console.log('❌ Empresa não encontrada para o usuário');
        return;
      }

      console.log('✅ Empresa encontrada:', usuarioData.empresa_id);

      // ✅ BUSCAR ÚLTIMO NÚMERO: empresa + modelo 55 + qualquer status
      const { data, error } = await supabase
        .from('pdv')
        .select('numero_documento')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('modelo_documento', 55) // NFe modelo 55
        .not('numero_documento', 'is', null) // Ignorar registros sem número
        .order('numero_documento', { ascending: false })
        .limit(1);

      if (error) {
        console.error('❌ Erro ao buscar último número:', error);
        return;
      }

      console.log('📋 Dados encontrados na tabela PDV (dados reais):', data);

      // Se não encontrou nenhum registro, começar do 1
      let proximoNumero = 1;
      if (data && data.length > 0 && data[0].numero_documento) {
        proximoNumero = data[0].numero_documento + 1;
        console.log(`📊 Último número encontrado: ${data[0].numero_documento}`);
      } else {
        console.log('📊 Nenhum registro encontrado, iniciando do número 1');
      }

      console.log(`🎯 Próximo número NFe: ${proximoNumero}`);

      // ✅ SIMPLIFICADO: Gerar código numérico simples (8 dígitos aleatórios)
      console.log('🔢 Gerando código numérico simples para nova NFe...');
      const codigoGerado = Math.floor(10000000 + Math.random() * 90000000).toString();
      console.log(`✅ Código numérico gerado: ${codigoGerado}`);

      // Atualizar número e código no formulário
      setNfeData(prev => {
        console.log('🔄 Atualizando estado do formulário...');
        const novoEstado = {
          ...prev,
          identificacao: {
            ...prev.identificacao,
            numero: proximoNumero.toString(),
            codigo_numerico: codigoGerado
          }
        };
        console.log('✅ Novo estado - Número:', novoEstado.identificacao.numero, 'Código:', novoEstado.identificacao.codigo_numerico);
        return novoEstado;
      });

    } catch (error) {
      console.error('❌ Erro geral ao buscar próximo número:', error);
    }
  };



  // Função para calcular dígito verificador do código numérico
  const calcularDigitoVerificador = (codigo: string): string => {
    // Algoritmo módulo 11 conforme especificação SEFAZ
    const sequencia = '4329876543298765432987654329876543298765432987654329';
    let soma = 0;

    for (let i = 0; i < codigo.length; i++) {
      soma += parseInt(codigo[i]) * parseInt(sequencia[i]);
    }

    const resto = soma % 11;
    const dv = resto < 2 ? 0 : 11 - resto;
    return dv.toString();
  };

  // ✅ REMOVIDAS: Funções complexas da tabela nfe_numero_controle
  // Agora usamos apenas: Math.floor(10000000 + Math.random() * 90000000)



  // Funções auxiliares para gerenciar progresso
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo' // ✅ FORÇAR TIMEZONE BRASILEIRO
    });
    const logMessage = `[${timestamp}] ${message}`;

    // Adicionar ao modal
    setLogs(prev => [...prev, logMessage]);

    // ✅ Verificar se é erro de email e parar o modal
    if (message.includes('⚠️') && message.includes('Erro ao enviar email')) {
      const errorMessage = message.replace(/^\[.*?\]\s*⚠️\s*/, ''); // Remove timestamp e emoji
      setEmailError(errorMessage);
      setShowCloseButton(true);
    }

    // Adicionar ao console também
    if (message.includes('❌') || message.includes('ERRO')) {
      console.error('🔴 NFe Error:', message);
    } else if (message.includes('✅') || message.includes('sucesso')) {
      console.log('🟢 NFe Success:', message);
    } else if (message.includes('⚠️') || message.includes('AVISO')) {
      console.warn('🟡 NFe Warning:', message);
    } else {
      console.log('🔵 NFe Info:', message);
    }
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
      { id: 'email', label: 'Enviando por email', status: 'pending', message: '' },
      { id: 'finalizacao', label: 'Finalizando processo', status: 'pending', message: '' }
    ]);
    setLogs([]);
  };

  // Função para criar toasts dentro do NfeForm
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

  const copyLogsToClipboard = () => {
    const logsText = logs.join('\n');
    navigator.clipboard.writeText(logsText).then(() => {
      showToast('Logs copiados para a área de transferência!', 'success');
    }).catch(() => {
      showToast('Erro ao copiar logs. Tente selecionar e copiar manualmente.', 'error');
    });
  };

  // Função para verificar se há dados não salvos
  const hasUnsavedData = () => {
    // Verificar se há dados preenchidos que indicam trabalho em progresso
    const hasIdentificacao = nfeData.identificacao.natureza_operacao !== '' ||
                             nfeData.identificacao.numero !== '';
    const hasDestinatario = nfeData.destinatario.nome !== '' ||
                            nfeData.destinatario.documento !== '';
    const hasProdutos = nfeData.produtos.length > 0;
    const hasPagamentos = nfeData.pagamentos.length > 0;

    return hasIdentificacao || hasDestinatario || hasProdutos || hasPagamentos;
  };

  // Função para lidar com tentativa de sair
  const handleTryExit = () => {
    // ✅ Se estiver em modo visualização, sair diretamente sem modal
    if (isViewMode) {
      onBack();
      return;
    }

    // Para modo de edição/criação, verificar se há dados não salvos
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
  };

  // ✅ FUNÇÃO PARA GERAR ESPELHO DANFE DA NFE - SEM FALLBACKS
  const handleGerarEspelho = async () => {
    try {
      showToast('Gerando espelho DANFE...', 'info');

      // Obter empresa_id do usuário logado
      const { data: userData } = await supabase.auth.getUser();
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        showToast('Empresa não identificada', 'error');
        return;
      }

      let dadosReaisNfe;

      // ✅ BUSCAR DADOS REAIS DA NFE SALVA (SEM FALLBACKS)
      // Tentar buscar dados reais se há qualquer indicação de NFe salva
      const nfeId = rascunhoId || nfeData.id || nfeData.nfe_id;

      console.log('🔍 VERIFICANDO CONDIÇÕES:');
      console.log('- isEditingRascunho:', isEditingRascunho);
      console.log('- rascunhoId:', rascunhoId);
      console.log('- nfeData.id:', nfeData.id);
      console.log('- nfeId final:', nfeId);

      if (nfeId) {
        console.log('🔍 Buscando dados reais da NFe salva (ID:', nfeId, ')');

        // Buscar dados completos da NFe salva
        const { data: nfeSalva, error: nfeError } = await supabase
          .from('pdv')
          .select('*')
          .eq('id', nfeId)
          .single();

        if (nfeError || !nfeSalva) {
          throw new Error('NFe salva não encontrada');
        }

        console.log('📋 DADOS NFE SALVA:', nfeSalva);

        // Buscar itens reais da NFe salva
        const { data: itensReais, error: itensError } = await supabase
          .from('pdv_itens')
          .select('*')
          .eq('pdv_id', nfeId);

        if (itensError) {
          throw new Error('Erro ao buscar itens da NFe salva');
        }

        console.log('📦 ITENS REAIS:', itensReais);

        // ✅ USAR DADOS REAIS DA TABELA PDV (SEM FALLBACKS)
        // ✅ CORREÇÃO: Carregar informações adicionais do JSON dados_nfe quando disponível
        let informacaoAdicionalReal = '';

        // 1. Primeiro tentar do JSON dados_nfe (dados completos salvos)
        if (nfeSalva.dados_nfe) {
          try {
            const dadosNfeJson = typeof nfeSalva.dados_nfe === 'string'
              ? JSON.parse(nfeSalva.dados_nfe)
              : nfeSalva.dados_nfe;
            informacaoAdicionalReal = dadosNfeJson?.identificacao?.informacao_adicional || '';
          } catch (error) {
            console.error('Erro ao fazer parse do dados_nfe:', error);
          }
        }

        // 2. Se não tiver no JSON, usar campo direto da tabela
        if (!informacaoAdicionalReal) {
          informacaoAdicionalReal = nfeSalva.informacoes_adicionais || '';
        }

        // ✅ CORREÇÃO: Carregar chaves de referência, intermediador e transportadora do JSON dados_nfe
        let chavesRefReais = [];
        let intermediadorReal = {};
        let transportadoraReal = {};
        if (nfeSalva.dados_nfe) {
          try {
            const dadosNfeJson = typeof nfeSalva.dados_nfe === 'string'
              ? JSON.parse(nfeSalva.dados_nfe)
              : nfeSalva.dados_nfe;
            chavesRefReais = dadosNfeJson?.chaves_ref || [];
            intermediadorReal = dadosNfeJson?.intermediador || {};
            transportadoraReal = dadosNfeJson?.transportadora || {};
          } catch (error) {
            console.error('Erro ao carregar dados do JSON:', error);
          }
        }

        dadosReaisNfe = {
          // Dados da identificação REAIS
          identificacao: {
            modelo: nfeSalva.modelo_documento || 55,
            serie: nfeSalva.serie_documento,
            numero: nfeSalva.numero_documento,
            natureza_operacao: nfeSalva.natureza_operacao,
            data_emissao: nfeSalva.data_emissao_nfe || nfeSalva.created_at,
            chave_nfe: nfeSalva.chave_nfe,
            protocolo: nfeSalva.protocolo_nfe,
            informacao_adicional: informacaoAdicionalReal
          },
          // Dados do destinatário REAIS
          destinatario: {
            nome: nfeSalva.nome_cliente,
            documento: nfeSalva.documento_cliente,
            tipo_documento: nfeSalva.tipo_documento_cliente,
            // ✅ ADICIONAR ENDEREÇO REAL SE EXISTIR
            endereco: nfeSalva.endereco_cliente,
            telefone: nfeSalva.telefone_cliente,
            email: nfeSalva.email_cliente
          },
          // Produtos REAIS da tabela pdv_itens
          produtos: itensReais?.map(item => ({
            codigo: item.codigo_produto,
            descricao: item.nome_produto,
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario,
            valor_total: item.valor_total_item,
            ncm: item.ncm,
            cfop: item.cfop,
            unidade: item.unidade,
            ean: item.ean || 'SEM GTIN',
            cst: item.cst,
            csosn: item.csosn,
            origem: item.origem,
            aliquota_icms: item.aliquota_icms,
            valor_icms: item.valor_icms,
            base_calculo_icms: item.base_calculo_icms
          })) || [],
          // Totais REAIS
          totais: {
            valor_produtos: nfeSalva.valor_subtotal || nfeSalva.valor_total,
            valor_total: nfeSalva.valor_total,
            valor_desconto: nfeSalva.valor_desconto || 0
          },
          // ✅ NOVO: Chaves de referência REAIS
          chaves_ref: chavesRefReais,
          // ✅ NOVO: Intermediador REAL
          intermediador: intermediadorReal,
          // ✅ NOVO: Transportadora REAL
          transportadora: transportadoraReal,
          // Dados da empresa (já carregados)
          empresa: nfeData.empresa
        };

        console.log('✅ Dados reais da NFe carregados:', dadosReaisNfe);
      } else {
        // Se não é rascunho salvo, usar dados do formulário
        dadosReaisNfe = nfeData;
        console.log('⚠️ Usando dados do formulário (não é rascunho):', dadosReaisNfe);
      }

      // Preparar dados para o espelho DANFE
      const dadosEspelho = {
        empresa_id: usuarioData.empresa_id,
        dados_nfe: dadosReaisNfe
      };

      console.log('🚀 ENVIANDO PARA BACKEND:', dadosEspelho);

      // Chamar endpoint inteligente para gerar DANFE real ou espelho simples
      const response = await fetch('/backend/public/gerar-espelho-danfe-real.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosEspelho)
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const result = await response.json();

      if (!result.sucesso) {
        throw new Error(result.erro || 'Erro ao gerar espelho HTML');
      }

      console.log('✅ Espelho gerado:', result);

      // Extrair nome do arquivo do caminho retornado
      const nomeArquivo = result.arquivo;

      // Usar endpoint seguro para visualizar o espelho
      const espelhoUrl = `/backend/public/visualizar-espelho.php?empresa_id=${usuarioData.empresa_id}&arquivo=${nomeArquivo}`;

      setTimeout(() => {
        window.open(espelhoUrl, '_blank');
        showToast('Espelho HTML gerado e aberto em nova aba', 'success');
      }, 500);

    } catch (error) {
      console.error('Erro ao gerar espelho DANFE:', error);
      showToast(`Erro ao gerar espelho DANFE: ${error.message}`, 'error');
    }
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

      // Garantir que o rascunho tenha número e código numérico
      let numeroFinal = nfeData.identificacao.numero;
      let codigoFinal = nfeData.identificacao.codigo_numerico;

      // REMOVIDO: Não gerar números automaticamente
      console.log(`📋 Usando número do formulário: ${numeroFinal || 'vazio'}`);

      // Se não tem número, deixar vazio (usuário deve preencher manualmente)
      if (!numeroFinal) {
        numeroFinal = '';
        console.log('⚠️ Número vazio - usuário deve preencher manualmente');
      }

      // Se não tem código, gerar um simples
      if (!codigoFinal) {
        codigoFinal = Math.floor(10000000 + Math.random() * 90000000).toString();
        console.log(`🔢 Código gerado para rascunho: ${codigoFinal}`);
      }

      // Atualizar os dados da NFe com número e código
      const nfeDataAtualizada = {
        ...nfeData,
        identificacao: {
          ...nfeData.identificacao,
          numero: numeroFinal,
          codigo_numerico: codigoFinal
        }
      };

      // Preparar dados do rascunho
      const rascunhoData = {
        empresa_id: usuarioData.empresa_id,
        usuario_id: userData.user.id, // Campo obrigatório que estava faltando
        modelo_documento: 55,
        serie_documento: parseInt(nfeDataAtualizada.identificacao.serie) || 1,
        numero_documento: parseInt(numeroFinal) || 0,
        status_nfe: 'rascunho',
        natureza_operacao: nfeDataAtualizada.identificacao.natureza_operacao,
        nome_cliente: nfeDataAtualizada.destinatario.nome || 'Cliente não informado',
        valor_total: nfeDataAtualizada.totais.valor_total || 0,
        data_rascunho: new Date().toISOString(),
        usuario_rascunho: userData.user.id,
        observacoes_rascunho: 'Rascunho salvo automaticamente',
        // Salvar dados completos da NFe em JSON (com número e código atualizados)
        dados_nfe: JSON.stringify(nfeDataAtualizada)
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

      // Atualizar estado da NFe com os dados atualizados
      setNfeData(nfeDataAtualizada);

      // Salvar itens se existirem
      if (nfeDataAtualizada.produtos.length > 0) {
        const itensRascunho = nfeDataAtualizada.produtos.map((produto, index) => ({
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
      console.log('🔄 ATIVANDO modo de edição - Geração automática será DESABILITADA');
      setIsEditingRascunho(true);
      setRascunhoId(rascunho.id);

      try {
        // Se tem dados_nfe salvos, carregar eles
        if (rascunho.dados_nfe) {
          let dadosCarregados;

          try {
            // ✅ CORREÇÃO: Lidar com dados_nfe como string ou array
            if (Array.isArray(rascunho.dados_nfe)) {
              // Se for array, pegar o primeiro elemento (string JSON) e mesclar com segundo elemento
              dadosCarregados = JSON.parse(rascunho.dados_nfe[0]);

              // ✅ MESCLAR com segundo elemento se existir (contém codigo_numerico)
              if (rascunho.dados_nfe[1] && typeof rascunho.dados_nfe[1] === 'object') {
                const dadosAdicionais = rascunho.dados_nfe[1];
                if (dadosAdicionais.identificacao?.codigo_numerico) {
                  dadosCarregados.identificacao = {
                    ...dadosCarregados.identificacao,
                    codigo_numerico: dadosAdicionais.identificacao.codigo_numerico
                  };
                }
              }
            } else {
              // Se for string, fazer parse direto
              dadosCarregados = JSON.parse(rascunho.dados_nfe);
            }

            // Aguardar um pouco para garantir que os dados da empresa foram carregados primeiro
            setTimeout(() => {
              console.log('🔄 Carregando rascunho - Número:', dadosCarregados.identificacao?.numero, 'Código:', dadosCarregados.identificacao?.codigo_numerico);
              setNfeData(prev => ({
                ...dadosCarregados,
                empresa: prev.empresa || dadosCarregados.empresa // Preservar empresa se já carregada
              }));

            }, 100);
          } catch (error) {
            console.error('Erro ao fazer parse dos dados_nfe:', error);
            // Se falhar, usar o caminho alternativo
            setTimeout(() => {
              console.log('🔄 Carregando rascunho básico (fallback) - Número:', rascunho.numero_documento);
              setNfeData(prev => ({
                ...prev,
                identificacao: {
                  ...prev.identificacao,
                  numero: rascunho.numero_documento?.toString() || '',
                  serie: rascunho.serie_documento || 1,
                  natureza_operacao: rascunho.natureza_operacao || '',
                  informacao_adicional: rascunho.informacao_adicional || ''
                }
              }));
            }, 100);
          }
        } else {

          // Carregar dados básicos do rascunho e buscar itens
          const { data: itens } = await supabase
            .from('pdv_itens')
            .select('*')
            .eq('pdv_id', rascunho.id);

          console.log('📦 Itens encontrados:', itens);

          // Aguardar um pouco para garantir que os dados da empresa foram carregados primeiro
          setTimeout(() => {
            console.log('🔄 Carregando rascunho básico - Número:', rascunho.numero_documento);
            setNfeData(prev => ({
              ...prev,
              identificacao: {
                ...prev.identificacao,
                numero: rascunho.numero_documento?.toString() || '',
                serie: rascunho.serie_documento || 1,
                natureza_operacao: rascunho.natureza_operacao || '',
                informacao_adicional: rascunho.informacao_adicional || ''
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

          }, 100);
        }
      } catch (error) {
        // Erro ao carregar dados do rascunho
      }
    };

    // Listener para resetar flag de edição (nova NFe)
    const handleResetEditingFlag = (event: CustomEvent) => {
      const isNewNfe = event.detail?.isNewNfe || false;

      console.log('🆕 Evento resetEditingFlag recebido - Resetando estado de edição');
      console.log('🔍 É nova NFe?', isNewNfe);
      console.log('✅ DESATIVANDO modo de edição - Geração automática será HABILITADA');

      setIsEditingRascunho(false);
      setRascunhoId(null);

      // Limpar dados do formulário para nova NFe
      setNfeData(prev => ({
        ...prev,
        identificacao: {
          ...prev.identificacao,
          numero: '', // Limpar número para permitir nova geração
          codigo_numerico: '', // Limpar código para permitir nova geração
          natureza_operacao: 'Venda de Mercadoria',
          informacao_adicional: ''
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
        pagamentos: [],
        totais: {
          valor_produtos: 0,
          valor_desconto: 0,
          valor_total: 0
        }
      }));

      // ✅ CORREÇÃO: Buscar próximo número APENAS se for uma nova NFe
      if (isNewNfe) {
        setTimeout(() => {
          console.log('🔍 É NOVA NFe - Chamando buscarProximoNumero...');
          buscarProximoNumero();
        }, 200);
      } else {
        console.log('🚫 NÃO é nova NFe - Pulando buscarProximoNumero');
      }
    };

    // Listener para carregar NFe em modo visualização
    const handleLoadNfeView = async (event: CustomEvent) => {
      const nfe = event.detail;
      console.log('👁️ Evento loadNfeView recebido:', nfe);
      console.log('📊 Campos disponíveis na NFe:', Object.keys(nfe));
      console.log('📄 dados_nfe presente?', !!nfe.dados_nfe);
      console.log('📄 dados_nfe tipo:', typeof nfe.dados_nfe);
      console.log('📄 dados_nfe conteúdo:', nfe.dados_nfe);

      try {
        // Carregar dados da NFe para visualização
        if (nfe.dados_nfe) {
          console.log('✅ Encontrou dados_nfe, tentando fazer parse...');
          let dadosCarregados;

          try {
            if (Array.isArray(nfe.dados_nfe)) {
              console.log('📋 dados_nfe é array, fazendo parse do primeiro elemento');
              dadosCarregados = JSON.parse(nfe.dados_nfe[0]);
              if (nfe.dados_nfe[1] && typeof nfe.dados_nfe[1] === 'object') {
                const dadosAdicionais = nfe.dados_nfe[1];
                if (dadosAdicionais.identificacao?.codigo_numerico) {
                  dadosCarregados.identificacao = {
                    ...dadosCarregados.identificacao,
                    codigo_numerico: dadosAdicionais.identificacao.codigo_numerico
                  };
                }
              }
            } else {
              console.log('📄 dados_nfe é string, fazendo parse direto');
              dadosCarregados = JSON.parse(nfe.dados_nfe);
            }

            console.log('✅ Parse bem-sucedido, dados carregados:', dadosCarregados);

            setTimeout(() => {
              console.log('👁️ Aplicando dados completos da NFe para visualização');
              setNfeData(dadosCarregados);

              // Carregar CCe existentes do banco de dados
              if (nfe.cartas_correcao) {
                try {
                  const ccesExistentes = typeof nfe.cartas_correcao === 'string'
                    ? JSON.parse(nfe.cartas_correcao)
                    : nfe.cartas_correcao;

                  if (Array.isArray(ccesExistentes) && ccesExistentes.length > 0) {
                    console.log('📝 Carregando CCe existentes:', ccesExistentes);
                    setDadosAutorizacao(prev => ({
                      ...prev,
                      cartas_correcao: ccesExistentes
                    }));
                  }
                } catch (error) {
                  console.error('❌ Erro ao carregar CCe existentes:', error);
                }
              }
            }, 100);
          } catch (error) {
            console.error('❌ Erro ao fazer parse dos dados_nfe:', error);
            // Fallback para dados básicos
            carregarDadosBasicos(nfe);
          }
        } else {
          // Se não há dados_nfe, carregar dados básicos + itens do banco
          console.log('⚠️ Sem dados_nfe salvos, carregando dados básicos + itens');
          await carregarDadosBasicosComItens(nfe);
        }

        // ✅ SEMPRE carregar dados de autorização para NFes autorizadas
        console.log('🔍 VERIFICANDO DADOS DE AUTORIZAÇÃO:');
        console.log('  - status_nfe:', nfe.status_nfe);
        console.log('  - chave_nfe:', nfe.chave_nfe);
        console.log('  - protocolo_nfe:', nfe.protocolo_nfe);
        console.log('  - data_emissao_nfe:', nfe.data_emissao_nfe);

        if ((nfe.status_nfe === 'autorizada' || nfe.status_nfe === 'cancelada') && (nfe.chave_nfe || nfe.protocolo_nfe)) {
          console.log('🔐 ✅ CONDIÇÕES ATENDIDAS - Carregando dados de autorização da NFe');



          // Carregar CCe existentes da nova tabela cce_nfe
          let ccesExistentes = [];
          try {
            // Obter empresa_id do usuário logado
            const { data: userData } = await supabase.auth.getUser();
            const { data: usuarioData } = await supabase
              .from('usuarios')
              .select('empresa_id')
              .eq('id', userData.user.id)
              .single();

            // ✅ BUSCAR CCe DIRETAMENTE PELA CHAVE_NFE (SEM JOIN)
            if (nfe.chave_nfe && usuarioData?.empresa_id) {
              console.log('📋 Carregando CCe da tabela cce_nfe:', { chaveNfe: nfe.chave_nfe, empresaId: usuarioData.empresa_id });

              const response = await fetch(`/backend/public/listar-cce.php?chave_nfe=${encodeURIComponent(nfe.chave_nfe)}&empresa_id=${encodeURIComponent(usuarioData.empresa_id)}`);

              if (response.ok) {
                const result = await response.json();
                if (result.success) {
                  ccesExistentes = result.data || [];
                  console.log('✅ CCe carregadas da tabela:', ccesExistentes);
                } else {
                  console.warn('⚠️ Erro ao carregar CCe:', result.error);
                  ccesExistentes = [];
                }
              } else {
                console.error('❌ Erro na API ao carregar CCe:', response.status);
                ccesExistentes = [];
              }
            } else {
              console.log('📝 Nenhuma chave NFe ou empresa_id encontrada');
              ccesExistentes = [];
            }
          } catch (error) {
            console.error('❌ Erro ao carregar CCe da tabela cce_nfe:', error);
            ccesExistentes = [];
          }

          // ✅ CALCULAR PRÓXIMA SEQUÊNCIA BASEADA NAS CCe EXISTENTES
          let proximaSequenciaCorreta = 1;
          if (ccesExistentes.length > 0) {
            // Encontrar a maior sequência existente e adicionar 1
            const sequenciasExistentes = ccesExistentes.map(cce => parseInt(cce.sequencia) || 0);
            const maiorSequencia = Math.max(...sequenciasExistentes);
            proximaSequenciaCorreta = maiorSequencia + 1;
            console.log('🔢 Sequências existentes:', sequenciasExistentes);
            console.log('🔢 Maior sequência encontrada:', maiorSequencia);
            console.log('🔢 Próxima sequência calculada:', proximaSequenciaCorreta);
          }

          const dadosAuth = {
            chave: nfe.chave_nfe || '',
            protocolo: nfe.protocolo_nfe || '',
            status: nfe.status_nfe, // Usar o status real da NFe (autorizada ou cancelada)
            dataAutorizacao: nfe.data_emissao_nfe || nfe.created_at || '',
            ambiente: 'homologacao', // Pode ser determinado pela chave ou configuração
            motivo_cancelamento: nfe.motivo_cancelamento || '',
            data_cancelamento: nfe.cancelada_em || '',
            sequencia_cce: proximaSequenciaCorreta, // ✅ Usar sequência correta baseada nas CCe existentes
            carta_correcao: '', // Campo para o texto da carta de correção
            cartas_correcao: ccesExistentes // Array com CCe carregadas do banco
          };
          console.log('🔐 Dados de autorização preparados:', dadosAuth);

          setTimeout(() => {
            console.log('🔐 APLICANDO dados de autorização...');
            setDadosAutorizacao(dadosAuth);
          }, 200);
        } else {
          console.log('❌ CONDIÇÕES NÃO ATENDIDAS para carregar dados de autorização');
          console.log('  - É autorizada ou cancelada?', nfe.status_nfe === 'autorizada' || nfe.status_nfe === 'cancelada');
          console.log('  - Tem chave ou protocolo?', !!(nfe.chave_nfe || nfe.protocolo_nfe));
        }
      } catch (error) {
        console.error('❌ Erro geral ao carregar NFe para visualização:', error);
        // Fallback final
        carregarDadosBasicos(nfe);
      }
    };

    // Função auxiliar para carregar dados básicos
    const carregarDadosBasicos = (nfe: any) => {
      setTimeout(() => {
        console.log('👁️ Carregando dados básicos da NFe');
        console.log('🔍 TODOS OS DADOS DA NFe:', nfe);
        console.log('🔍 CAMPOS ESPECÍFICOS:');
        console.log('  - documento_cliente:', nfe.documento_cliente);
        console.log('  - tipo_documento_cliente:', nfe.tipo_documento_cliente);
        console.log('  - rua_entrega:', nfe.rua_entrega);
        console.log('  - numero_entrega:', nfe.numero_entrega);
        console.log('  - bairro_entrega:', nfe.bairro_entrega);
        console.log('  - cidade_entrega:', nfe.cidade_entrega);
        console.log('  - estado_entrega:', nfe.estado_entrega);
        console.log('  - cep_entrega:', nfe.cep_entrega);

        // Converter data para formato datetime-local (YYYY-MM-DDTHH:mm)
        let dataEmissaoFormatada = new Date().toISOString().slice(0, 16);
        if (nfe.data_emissao_nfe) {
          try {
            dataEmissaoFormatada = new Date(nfe.data_emissao_nfe).toISOString().slice(0, 16);
          } catch (error) {
            console.warn('Erro ao converter data_emissao_nfe:', error);
          }
        } else if (nfe.created_at) {
          try {
            dataEmissaoFormatada = new Date(nfe.created_at).toISOString().slice(0, 16);
          } catch (error) {
            console.warn('Erro ao converter created_at:', error);
          }
        }

        console.log('📅 Data formatada para datetime-local:', dataEmissaoFormatada);

        setNfeData(prev => ({
          ...prev,
          identificacao: {
            ...prev.identificacao,
            numero: nfe.numero_documento?.toString() || '',
            serie: nfe.serie_documento || 1,
            natureza_operacao: nfe.natureza_operacao || '',
            informacao_adicional: nfe.informacoes_adicionais || nfe.observacoes_nfe || '',
            data_emissao: dataEmissaoFormatada
          },
          destinatario: {
            ...prev.destinatario,
            nome: nfe.nome_cliente || '',
            documento: nfe.documento_cliente || '',
            endereco: nfe.rua_entrega || '',
            numero: nfe.numero_entrega || '',
            bairro: nfe.bairro_entrega || '',
            cidade: nfe.cidade_entrega || '',
            uf: nfe.estado_entrega || '',
            cep: nfe.cep_entrega || ''
          },
          totais: {
            ...prev.totais,
            valor_total: nfe.valor_total || 0,
            valor_produtos: nfe.valor_subtotal || nfe.valor_total || 0,
            valor_desconto: nfe.valor_desconto || 0
          }
        }));
      }, 100);
    };

    // Função auxiliar para carregar dados básicos + itens
    const carregarDadosBasicosComItens = async (nfe: any) => {
      try {
        // Buscar itens da NFe
        const { data: itens } = await supabase
          .from('pdv_itens')
          .select('*')
          .eq('pdv_id', nfe.id);

        console.log('📦 Itens encontrados para visualização:', itens);

        // Converter data para formato datetime-local (YYYY-MM-DDTHH:mm)
        let dataEmissaoFormatada = new Date().toISOString().slice(0, 16);
        if (nfe.data_emissao_nfe) {
          try {
            dataEmissaoFormatada = new Date(nfe.data_emissao_nfe).toISOString().slice(0, 16);
          } catch (error) {
            console.warn('Erro ao converter data_emissao_nfe:', error);
          }
        } else if (nfe.created_at) {
          try {
            dataEmissaoFormatada = new Date(nfe.created_at).toISOString().slice(0, 16);
          } catch (error) {
            console.warn('Erro ao converter created_at:', error);
          }
        }

        setTimeout(() => {
          setNfeData(prev => ({
            ...prev,
            identificacao: {
              ...prev.identificacao,
              numero: nfe.numero_documento?.toString() || '',
              serie: nfe.serie_documento || 1,
              natureza_operacao: nfe.natureza_operacao || '',
              informacao_adicional: nfe.informacoes_adicionais || nfe.observacoes_nfe || '',
              data_emissao: dataEmissaoFormatada
            },
            destinatario: {
              ...prev.destinatario,
              nome: nfe.nome_cliente || '',
              documento: nfe.documento_cliente || '',
              endereco: nfe.rua_entrega || '',
              numero: nfe.numero_entrega || '',
              bairro: nfe.bairro_entrega || '',
              cidade: nfe.cidade_entrega || '',
              uf: nfe.estado_entrega || '',
              cep: nfe.cep_entrega || ''
            },
            produtos: itens ? itens.map(item => ({
              produto_id: item.produto_id,
              codigo: item.codigo_produto,
              descricao: item.nome_produto,
              quantidade: item.quantidade,
              valor_unitario: item.valor_unitario,
              valor_total: item.valor_total_item
            })) : [],
            totais: {
              ...prev.totais,
              valor_total: nfe.valor_total || 0,
              valor_produtos: nfe.valor_subtotal || nfe.valor_total || 0,
              valor_desconto: nfe.valor_desconto || 0
            }
          }));
        }, 100);
      } catch (error) {
        console.error('Erro ao carregar itens da NFe:', error);
        carregarDadosBasicos(nfe);
      }
    };

    // Listener para carregar dados de devolução
    const handleLoadDevolucaoData = async (event: CustomEvent) => {
      const dadosDevolucao = event.detail;
      console.log('🎯 Evento loadDevolucaoData recebido:', dadosDevolucao);

      // Gerar número da NF-e automaticamente (como faz em Nova NFe)
      console.log('🔍 Gerando número automático para devolução...');
      buscarProximoNumero();

      // Carregar produtos da devolução
      if (dadosDevolucao.produtos && dadosDevolucao.produtos.length > 0) {
        console.log('📦 Carregando produtos da devolução:', dadosDevolucao.produtos);

        // Estruturar produtos com todos os campos obrigatórios
        const produtosFormatados = dadosDevolucao.produtos.map((produto: any, index: number) => ({
          id: `devolucao_${index + 1}`,
          produto_id: produto.produto_id || produto.id,
          codigo: produto.codigo || produto.dadosFiscais?.codigo || '999999',
          descricao: produto.descricao || `DEVOLUÇÃO - ${produto.nome_produto}`,
          quantidade: produto.quantidade || 1,
          valor_unitario: produto.valor_unitario || 0,
          valor_total: produto.valor_total || produto.valor_total_item || 0,

          // Dados fiscais obrigatórios
          ncm: produto.ncm || produto.dadosFiscais?.ncm || '99999999',
          cfop: produto.cfop || '5202', // CFOP automático para devolução
          unidade: produto.unidade || produto.dadosFiscais?.unidade_medida?.sigla || 'UN',
          ean: produto.ean || produto.dadosFiscais?.codigo_barras || 'SEM GTIN',
          origem_produto: produto.origem_produto || produto.dadosFiscais?.origem || '0',

          // CST/CSOSN
          cst_icms: produto.cst_icms || produto.dadosFiscais?.cst_icms || '102',
          csosn_icms: produto.csosn_icms || produto.dadosFiscais?.csosn_icms || '102',
          cst_pis: produto.cst_pis || '07',
          cst_cofins: produto.cst_cofins || '07',
          cst_ipi: produto.cst_ipi || '99',

          // Alíquotas (zeradas para devolução)
          aliquota_icms: produto.aliquota_icms || 0,
          aliquota_pis: produto.aliquota_pis || 0,
          aliquota_cofins: produto.aliquota_cofins || 0,
          aliquota_ipi: produto.aliquota_ipi || 0,

          // Valores de impostos (zerados para devolução)
          valor_icms: produto.valor_icms || 0,
          valor_pis: produto.valor_pis || 0,
          valor_cofins: produto.valor_cofins || 0,
          valor_ipi: produto.valor_ipi || 0,
          base_calculo_icms: produto.base_calculo_icms || 0
        }));

        setNfeData(prev => ({
          ...prev,
          produtos: produtosFormatados,
          identificacao: {
            ...prev.identificacao,
            natureza_operacao: dadosDevolucao.natureza_operacao || 'DEVOLUÇÃO DE VENDA',
            finalidade: dadosDevolucao.finalidade || '4'
          },
          totais: {
            ...prev.totais,
            valor_produtos: dadosDevolucao.valorTotal || 0,
            valor_total: dadosDevolucao.valorTotal || 0
          }
        }));
        console.log('✅ Produtos da devolução carregados no formulário com estrutura completa');
      }
    };

    // Adicionar listeners
    window.addEventListener('loadRascunho', handleLoadRascunho as EventListener);
    window.addEventListener('loadNfeView', handleLoadNfeView as EventListener);
    window.addEventListener('resetEditingFlag', handleResetEditingFlag as EventListener);
    window.addEventListener('loadDevolucaoData', handleLoadDevolucaoData as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('loadRascunho', handleLoadRascunho as EventListener);
      window.removeEventListener('loadNfeView', handleLoadNfeView as EventListener);
      window.removeEventListener('resetEditingFlag', handleResetEditingFlag as EventListener);
      window.removeEventListener('loadDevolucaoData', handleLoadDevolucaoData as EventListener);
    };
  }, []);

  // Buscar dados da empresa (executar apenas uma vez)
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

        // Carregar dados da empresa incluindo certificado digital
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
          setNfeData(prev => ({
            ...prev,
            empresa: {
              id: empresaData.id,
              cnpj: empresaData.documento, // Corrigido: campo correto é 'documento'
              name: empresaData.razao_social,
              nome_fantasia: empresaData.nome_fantasia,
              inscricao_estadual: empresaData.inscricao_estadual,
              regime_tributario: empresaData.regime_tributario || 1,
              address: empresaData.endereco,
              numero_endereco: empresaData.numero,
              bairro: empresaData.bairro,
              city: empresaData.cidade,
              state: empresaData.estado, // Corrigido: campo correto é 'estado'
              uf: empresaData.estado, // Adicionar também como 'uf' para compatibilidade
              zip_code: empresaData.cep,
              codigo_municipio: empresaData.codigo_municipio,
              phone: empresaData.telefone,
              // Campos do certificado digital
              certificado_digital_path: empresaData.certificado_digital_path,
              certificado_digital_status: empresaData.certificado_digital_status
            }
          }));
        }
      } catch (error) {
        // Erro ao carregar dados da empresa
      }
    };

    loadEmpresaData();
  }, []); // Executar apenas uma vez

  // REMOVIDO: useEffect de geração automática de números
  // Agora os números devem ser preenchidos manualmente pelo usuário

  // Monitor do estado de edição para logs de debugging
  useEffect(() => {
    if (isEditingRascunho) {
      console.log('🔒 ESTADO DE EDIÇÃO ATIVADO - Todas as gerações automáticas estão BLOQUEADAS');
    } else {
      console.log('🔓 ESTADO DE EDIÇÃO DESATIVADO - Geração automática pode ser executada');
    }
  }, [isEditingRascunho]);

  // Função para verificar status da API NFe (BACKEND LOCAL)
  const checkApiStatus = async () => {
    try {
      setApiStatus('checking');
      const response = await fetch('/backend/public/status-nfe.php', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Timeout de 5 segundos
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.status && result.status.includes('Online')) {
          setApiStatus('online');
        } else {
          setApiStatus('offline');
        }
      } else {
        setApiStatus('offline');
      }
    } catch (error) {
      console.error('Erro ao verificar status da API NFe:', error);
      setApiStatus('offline');
    }
  };

  // Função para verificar status da SEFAZ (BACKEND LOCAL)
  const checkSefazStatus = async () => {
    try {
      setSefazStatus('checking');

      // Obter empresa_id do usuário logado
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setSefazStatus('offline');
        return;
      }

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        setSefazStatus('offline');
        return;
      }

      const response = await fetch(`/backend/public/status-sefaz.php?empresa_id=${usuarioData.empresa_id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Timeout de 10 segundos (SEFAZ pode ser mais lenta)
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.status === 'online') {
          setSefazStatus('online');
        } else {
          setSefazStatus('offline');
        }
      } else {
        setSefazStatus('offline');
      }
    } catch (error) {
      console.error('Erro ao verificar status da SEFAZ:', error);
      setSefazStatus('offline');
    }
  };

  // Carregar naturezas de operação
  useEffect(() => {
    const loadNaturezasOperacao = async () => {
      try {
        const { data, error } = await supabase
          .from('nfe_natureza_op')
          .select('id, descricao')
          .eq('ativo', true)
          .order('descricao');

        if (error) {
          console.error('Erro ao carregar naturezas de operação:', error);
          return;
        }

        setNaturezasOperacao(data || []);
      } catch (error) {
        console.error('Erro ao carregar naturezas de operação:', error);
      }
    };

    loadNaturezasOperacao();
  }, []);

  // Verificar status da API e SEFAZ ao carregar a página
  useEffect(() => {
    checkApiStatus();
    checkSefazStatus();
  }, []);

  // ✅ NOVA FUNÇÃO: Validação prévia ANTES de abrir o modal
  const validarAntesDeEmitir = () => {
    const erros = [];

    // 1. Validação básica de dados obrigatórios
    if (!nfeData.empresa) {
      erros.push('Dados da empresa não carregados');
    }

    if (!nfeData.destinatario.documento || !nfeData.destinatario.nome) {
      erros.push('Destinatário é obrigatório (CNPJ/CPF e Nome)');
    }

    if (!nfeData.destinatario.endereco?.trim()) {
      erros.push('Endereço do destinatário é obrigatório');
    }

    if (nfeData.produtos.length === 0) {
      erros.push('Adicione pelo menos um produto');
    }

    // ✅ TEMPORÁRIO: Validar pagamentos para todas as finalidades (para debug)
    const finalidadeNFe = nfeData.identificacao.finalidade || '1';
    if (nfeData.pagamentos.length === 0) {
      erros.push('Adicione pelo menos uma forma de pagamento');
    }

    if (!nfeData.identificacao.natureza_operacao) {
      erros.push('Natureza da operação é obrigatória');
    }

    // ✅ VALIDAÇÃO CRÍTICA: Chaves de referência para finalidade 4
    if (finalidadeNFe === '4') {
      if (!nfeData.chaves_ref || nfeData.chaves_ref.length === 0) {
        erros.push('Para NFe de devolução (finalidade 4), pelo menos uma chave de referência é obrigatória');
      }
    }

    return erros;
  };

  // Função para emitir NFe
  const handleEmitirNFe = async () => {
    try {
      // ✅ VALIDAÇÃO PRÉVIA: Verificar dados obrigatórios ANTES de abrir modal
      const errosValidacao = validarAntesDeEmitir();

      if (errosValidacao.length > 0) {
        // Mostrar erros em alert simples
        const mensagemErro = '❌ ERROS DE VALIDAÇÃO:\n\n' +
          errosValidacao.map((erro, index) => `${index + 1}. ${erro}`).join('\n') +
          '\n\n📝 Corrija os erros acima antes de emitir a NFe.';

        alert(mensagemErro);
        return; // Não abrir modal
      }

      // Se passou na validação prévia, abrir modal e iniciar processo
      setIsLoading(true);
      setShowProgressModal(true);
      clearAllLogs(); // ✅ Limpar logs ao iniciar nova emissão
      resetProgress();

      // ETAPA 1: VALIDAÇÃO
      updateStep('validacao', 'loading');
      addLog('Iniciando processo de emissão da NFe');
      addLog(`Ambiente selecionado: ${ambienteNFe.toUpperCase()}`);

      // Validações robustas
      const validationErrors = [];

      // Debug: Log dos dados da empresa
      addLog('🔍 Verificando dados da empresa...');
      addLog(`Empresa carregada: ${nfeData.empresa ? 'SIM' : 'NÃO'}`);
      if (nfeData.empresa) {
        addLog(`Nome empresa: ${nfeData.empresa.name || 'N/A'}`);
        addLog(`CNPJ: ${nfeData.empresa.cnpj || 'N/A'}`);
        addLog(`UF: ${nfeData.empresa.state || nfeData.empresa.uf || 'N/A'}`);
        addLog(`Inscrição Estadual: ${nfeData.empresa.inscricao_estadual || 'N/A'}`);
        addLog(`Regime Tributário: ${nfeData.empresa.regime_tributario || 'N/A'}`);
        addLog(`Código Município: ${nfeData.empresa.codigo_municipio || 'N/A'}`);

        // Verificar certificado no backend local
        addLog('🔍 Verificando certificado digital no backend...');
        try {
          const { data: userData } = await supabase.auth.getUser();
          const { data: usuarioData } = await supabase
            .from('usuarios')
            .select('empresa_id')
            .eq('id', userData.user.id)
            .single();

          if (usuarioData?.empresa_id) {
            const certificadoStatus = await fetch(`/backend/public/check-certificado.php?empresa_id=${usuarioData.empresa_id}`);
            const certificadoResult = await certificadoStatus.json();

            if (certificadoResult.success && certificadoResult.exists) {
              addLog(`✅ Certificado digital: CONFIGURADO`);
              addLog(`   Nome: ${certificadoResult.data.nome_certificado || 'N/A'}`);
              addLog(`   Status: ${certificadoResult.data.status || 'N/A'}`);
              addLog(`   Validade: ${certificadoResult.data.validade || 'N/A'}`);

              // Marcar como configurado para validação
              nfeData.empresa.certificado_configurado = true;
              nfeData.empresa.certificado_status = certificadoResult.data.status;
            } else {
              addLog(`❌ Certificado digital: NÃO CONFIGURADO`);
              nfeData.empresa.certificado_configurado = false;
            }
          }
        } catch (certError) {
          addLog(`⚠️ Erro ao verificar certificado: ${certError.message}`);
          nfeData.empresa.certificado_configurado = false;
        }
      }

      if (!nfeData.empresa) {
        validationErrors.push('Dados da empresa não carregados');
      }

      // Validação do certificado digital (usando verificação local)
      const certificadoConfigurado = nfeData.empresa?.certificado_configurado === true;

      if (!certificadoConfigurado) {
        validationErrors.push('Certificado digital não configurado para a empresa');
        addLog('❌ Certificado digital é obrigatório para emissão de NFe');
      }

      // Validação específica para ambiente de produção
      if (ambienteNFe === 'producao') {
        if (!certificadoConfigurado) {
          validationErrors.push('Certificado digital REAL é obrigatório para ambiente de produção');
          addLog('❌ Ambiente de produção requer certificado digital válido');
        }
        // Verificar se certificado não está vencido
        if (nfeData.empresa?.certificado_status === 'vencido') {
          validationErrors.push('Certificado digital está vencido');
          addLog('❌ Certificado digital vencido não pode ser usado em produção');
        }
      }

      // 4. Validação do destinatário
      addLog('👤 Validando destinatário...');
      if (!nfeData.destinatario.documento || !nfeData.destinatario.nome) {
        const erro = 'Destinatário é obrigatório (CNPJ/CPF e Nome)';
        validationErrors.push(erro);
        addLog(`❌ ${erro}`);
        addLog(`   Documento: ${nfeData.destinatario.documento || 'NÃO INFORMADO'}`);
        addLog(`   Nome: ${nfeData.destinatario.nome || 'NÃO INFORMADO'}`);
      } else {
        addLog(`✅ Destinatário: ${nfeData.destinatario.nome}`);
        addLog(`✅ Documento: ${nfeData.destinatario.documento}`);
      }

      // 4.1. Validação do endereço do destinatário (obrigatório para NFe)
      if (!nfeData.destinatario.endereco || !nfeData.destinatario.endereco.trim()) {
        const erro = 'Endereço do destinatário é obrigatório';
        validationErrors.push(erro);
        addLog(`❌ ${erro}`);
        addLog(`   Endereço: ${nfeData.destinatario.endereco || 'NÃO INFORMADO'}`);
      } else {
        addLog(`✅ Endereço: ${nfeData.destinatario.endereco}`);
      }

      // 4.2. Validação de outros campos obrigatórios do endereço
      const camposEndereco = [
        { campo: 'bairro', nome: 'Bairro' },
        { campo: 'cidade', nome: 'Cidade' },
        { campo: 'uf', nome: 'UF' },
        { campo: 'cep', nome: 'CEP' }
      ];

      camposEndereco.forEach(({ campo, nome }) => {
        if (!nfeData.destinatario[campo] || !nfeData.destinatario[campo].trim()) {
          const erro = `${nome} do destinatário é obrigatório`;
          validationErrors.push(erro);
          addLog(`❌ ${erro}`);
        } else {
          addLog(`✅ ${nome}: ${nfeData.destinatario[campo]}`);
        }
      });

      // 5. Validação dos produtos
      addLog('📦 Validando produtos...');
      if (nfeData.produtos.length === 0) {
        const erro = 'Adicione pelo menos um produto';
        validationErrors.push(erro);
        addLog(`❌ ${erro}`);
      } else {
        addLog(`✅ ${nfeData.produtos.length} produto(s) adicionado(s)`);
        nfeData.produtos.forEach((produto, index) => {
          addLog(`   ${index + 1}. ${produto.descricao} - R$ ${produto.valor_total?.toFixed(2) || '0.00'}`);
        });
      }

      // 6. Validação dos pagamentos
      addLog('💳 Validando pagamentos...');
      if (nfeData.pagamentos.length === 0) {
        const erro = 'Adicione pelo menos uma forma de pagamento';
        validationErrors.push(erro);
        addLog(`❌ ${erro}`);
      } else {
        addLog(`✅ ${nfeData.pagamentos.length} forma(s) de pagamento`);

        // Validar soma dos pagamentos
        const totalPagamentos = nfeData.pagamentos.reduce((sum, p) => sum + (p.valor || 0), 0);
        const totalNota = nfeData.totais.valor_total || 0;

        addLog(`   Total pagamentos: R$ ${totalPagamentos.toFixed(2)}`);
        addLog(`   Total da nota: R$ ${totalNota.toFixed(2)}`);

        if (Math.abs(totalPagamentos - totalNota) > 0.01) {
          // ✅ CORREÇÃO AUTOMÁTICA: Ajustar pagamentos para o total da nota
          addLog(`⚠️ Ajustando pagamentos de R$ ${totalPagamentos.toFixed(2)} para R$ ${totalNota.toFixed(2)}`);

          if (nfeData.pagamentos.length === 1) {
            // Se há apenas um pagamento, ajustar o valor
            nfeData.pagamentos[0].valor = totalNota;
            addLog('✅ Pagamento único ajustado automaticamente');
          } else if (nfeData.pagamentos.length > 1) {
            // Se há múltiplos pagamentos, ajustar o primeiro
            const diferenca = totalNota - totalPagamentos;
            nfeData.pagamentos[0].valor += diferenca;
            addLog('✅ Primeiro pagamento ajustado automaticamente');
          } else {
            // Se não há pagamentos, criar um
            nfeData.pagamentos = [{ tipo: '01', valor: totalNota }];
            addLog('✅ Pagamento criado automaticamente');
          }

          addLog('✅ Valores dos pagamentos ajustados e conferem');
        } else {
          addLog('✅ Valores dos pagamentos conferem');
        }
      }

      // 7. Validação da identificação
      addLog('🆔 Validando identificação...');
      if (!nfeData.identificacao.natureza_operacao) {
        const erro = 'Natureza da operação é obrigatória';
        validationErrors.push(erro);
        addLog(`❌ ${erro}`);
      } else {
        addLog(`✅ Natureza da operação: ${nfeData.identificacao.natureza_operacao}`);
      }

      // ✅ NOVA VALIDAÇÃO: Chaves de referência obrigatórias para finalidade 4 (devolução)
      const finalidadeNFe = nfeData.identificacao.finalidade || '1';
      addLog(`🔗 Validando chaves de referência (finalidade ${finalidadeNFe})...`);

      if (finalidadeNFe === '4') {
        // Para finalidade 4 (devolução), chaves de referência são OBRIGATÓRIAS
        if (!nfeData.chaves_ref || nfeData.chaves_ref.length === 0) {
          const erro = 'Para NFe de devolução (finalidade 4), pelo menos uma chave de referência é obrigatória';
          validationErrors.push(erro);
          addLog(`❌ ${erro}`);
          addLog(`   Finalidade: ${finalidadeNFe} (Devolução)`);
          addLog(`   Chaves informadas: ${nfeData.chaves_ref?.length || 0}`);
        } else {
          addLog(`✅ ${nfeData.chaves_ref.length} chave(s) de referência informada(s)`);
          nfeData.chaves_ref.forEach((chave, index) => {
            addLog(`   ${index + 1}. ${chave.chave || chave.chave_formatada || 'Chave inválida'}`);
          });
        }
      } else {
        // Para outras finalidades, chaves são opcionais
        const qtdChaves = nfeData.chaves_ref?.length || 0;
        addLog(`✅ Chaves de referência opcionais: ${qtdChaves} informada(s)`);
      }

      addLog(`📊 Resumo da validação: ${validationErrors.length} erro(s) encontrado(s)`);

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
          clearAllLogs(); // ✅ Limpar logs ao cancelar
          setIsLoading(false);
          return;
        }
        setShowProgressModal(true); // Reabrir modal
      }

      // Usar código numérico já gerado ou gerar novo se necessário
      const numeroNFe = parseInt(nfeData.identificacao.numero) || 1;
      const serieNFe = parseInt(nfeData.identificacao.serie) || 1;
      const ambiente = ambienteNFe;

      // ✅ VALIDAÇÃO DE NUMERAÇÃO DUPLICADA
      if (!isEditingRascunho) {
        // Só verificar duplicatas para novas NFe, não para edição de rascunho
        addLog('🔍 Verificando numeração duplicada...');
        const { data: nfeExistente } = await supabase
          .from('pdv')
          .select('id, numero_documento, status_nfe')
          .eq('empresa_id', nfeData.empresa.id)
          .eq('modelo_documento', 55)
          .eq('serie_documento', serieNFe)
          .eq('numero_documento', numeroNFe)
          .neq('status_nfe', 'rascunho') // Ignorar rascunhos
          .single();

        if (nfeExistente) {
          const erro = `NFe número ${numeroNFe} série ${serieNFe} já existe (Status: ${nfeExistente.status_nfe})`;
          validationErrors.push(erro);
          addLog(`❌ ${erro}`);
          updateStep('validacao', 'error', 'Numeração duplicada');
          return;
        }
        addLog('✅ Numeração disponível');
      } else {
        addLog(`✅ Editando rascunho - usando número ${numeroNFe} série ${serieNFe}`);
      }

      let codigoNumerico = nfeData.identificacao.codigo_numerico;

      // Verificar se há código gerado
      if (!codigoNumerico) {
        if (isEditingRascunho) {
          // Se está editando um rascunho e não tem código, é um erro
          const erro = 'Rascunho sem código numérico válido. Salve como rascunho novamente para gerar um código.';
          validationErrors.push(erro);
          addLog(`❌ ${erro}`);
          updateStep('validacao', 'error', 'Código numérico ausente');
          return;
        } else {
          // Se é uma nova NFe, gerar código simples
          addLog('🔢 Gerando código numérico simples...');
          codigoNumerico = Math.floor(10000000 + Math.random() * 90000000).toString();
          addLog(`✅ Código numérico gerado: ${codigoNumerico}`);
        }
      } else {
        addLog(`✅ Usando código pré-gerado: ${codigoNumerico}`);
      }

      // Preparar payload conforme documentação da API
      const payload = {
        ambiente: ambienteNFe === 'producao' ? 1 : 2, // 1=Produção, 2=Homologação
        empresa: {
          ...nfeData.empresa
          // ✅ CORREÇÃO: Usar IE real da empresa (sem fallback de teste)
        },
        cliente: {
          documento: nfeData.destinatario.documento,
          name: nfeData.destinatario.nome,
          ie_destinatario: nfeData.destinatario.ie_destinatario || 9,
          inscricao_estadual: nfeData.destinatario.inscricao_estadual || '',
          emails: nfeData.destinatario.emails || [],
          // ✅ CORREÇÃO: Backend espera sub-array 'endereco'
          endereco: {
            logradouro: nfeData.destinatario.endereco,
            numero: nfeData.destinatario.numero,
            bairro: nfeData.destinatario.bairro,
            cidade: nfeData.destinatario.cidade,
            uf: nfeData.destinatario.uf,
            cep: nfeData.destinatario.cep,
            codigo_municipio: nfeData.destinatario.codigo_municipio || 3550308
          }
        },
        produtos: nfeData.produtos.map(produto => ({
          ...produto,
          // ✅ ENVIAR DADOS REAIS SEM FALLBACKS (backend validará se estão completos)
          cfop: produto.cfop,
          ncm: produto.ncm,
          ean: produto.ean,
          unidade: produto.unidade,
          origem_produto: produto.origem_produto,
          cst_icms: produto.cst_icms,
          csosn_icms: produto.csosn_icms,
          aliquota_icms: produto.aliquota_icms,
          cst_pis: produto.cst_pis,
          cst_cofins: produto.cst_cofins,
          aliquota_pis: produto.aliquota_pis,
          aliquota_cofins: produto.aliquota_cofins,
          cst_ipi: produto.cst_ipi,
          aliquota_ipi: produto.aliquota_ipi,
          cest: produto.cest,
          margem_st: produto.margem_st // ✅ CORREÇÃO CRÍTICA: Incluir margem ST no payload
        })),
        totais: {
          valor_produtos: parseFloat(nfeData.totais.valor_produtos?.toString() || '0'),
          valor_desconto: parseFloat(nfeData.totais.valor_desconto?.toString() || '0'),
          valor_total: parseFloat(nfeData.totais.valor_total?.toString() || '0'),
          natureza_operacao: nfeData.identificacao.natureza_operacao
        },
        pagamentos: nfeData.pagamentos.map(pagamento => ({
          ...pagamento,
          // ✅ CORREÇÃO PRINCIPAL: Garantir que valor seja float
          valor: parseFloat(pagamento.valor?.toString() || '0')
        })),
        informacao_adicional: nfeData.identificacao.informacao_adicional || '',
        // Incluir dados de identificação da NFe
        identificacao: {
          numero: numeroNFe,
          serie: parseInt(nfeData.identificacao.serie) || 1,
          codigo_numerico: codigoNumerico,
          natureza_operacao: nfeData.identificacao.natureza_operacao,
          // ✅ CORREÇÃO CRÍTICA: Adicionar finalidade que estava faltando
          finalidade: nfeData.identificacao.finalidade || '1'
        }
      };

      // ETAPA 2: PROCESSAMENTO COMPLETO (XML + ASSINATURA + SEFAZ)
      updateStep('geracao', 'loading');
      addLog('Iniciando processamento completo da NFe...');
      addLog(`Valor total: R$ ${nfeData.totais.valor_total.toFixed(2)}`);
      addLog(`Cliente: ${nfeData.destinatario.nome}`);
      addLog(`Ambiente: ${ambienteNFe === 'producao' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'}`);

      // Chamar endpoint local de emissão NFe
      addLog('🚀 Usando endpoint local NFe (XML + Assinatura + SEFAZ)...');

      // Obter empresa_id do usuário logado
      const { data: userData } = await supabase.auth.getUser();
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        throw new Error('Empresa não identificada para o usuário');
      }

      // Preparar payload para backend local - SEM FALLBACKS
      // Validar dados obrigatórios da empresa antes de enviar
      if (!nfeData.empresa.name && !nfeData.empresa.razao_social) {
        throw new Error('Razão social da empresa não foi carregada');
      }
      if (!nfeData.empresa.cnpj && !nfeData.empresa.documento) {
        throw new Error('CNPJ da empresa não foi carregado');
      }
      if (!nfeData.empresa.state && !nfeData.empresa.uf) {
        throw new Error('UF da empresa não foi carregada');
      }
      if (!nfeData.empresa.inscricao_estadual) {
        throw new Error('Inscrição Estadual da empresa não foi carregada');
      }
      if (!nfeData.empresa.regime_tributario) {
        throw new Error('Regime tributário da empresa não foi carregado');
      }
      if (!nfeData.empresa.codigo_municipio) {
        throw new Error('Código do município da empresa não foi carregado');
      }

      const localPayload = {
        empresa_id: usuarioData.empresa_id,
        nfe_data: {
          empresa: {
            razao_social: nfeData.empresa.name || nfeData.empresa.razao_social,
            cnpj: nfeData.empresa.cnpj || nfeData.empresa.documento,
            nome_fantasia: nfeData.empresa.nome_fantasia,
            inscricao_estadual: nfeData.empresa.inscricao_estadual,
            regime_tributario: nfeData.empresa.regime_tributario,
            uf: nfeData.empresa.state || nfeData.empresa.uf,
            codigo_municipio: nfeData.empresa.codigo_municipio,
            endereco: {
              logradouro: nfeData.empresa.address || nfeData.empresa.endereco,
              numero: nfeData.empresa.numero_endereco || nfeData.empresa.numero,
              bairro: nfeData.empresa.bairro,
              cidade: nfeData.empresa.city || nfeData.empresa.cidade,
              cep: nfeData.empresa.zip_code || nfeData.empresa.cep
            }
          },
          destinatario: payload.cliente,
          produtos: payload.produtos,
          totais: payload.totais,
          pagamentos: payload.pagamentos,
          identificacao: payload.identificacao,
          // ✅ CORREÇÃO: Adicionar dados da transportadora
          transportadora: {
            modalidade_frete: nfeData.transportadora.modalidade_frete,
            transportadora_id: nfeData.transportadora.transportadora_id || '',
            transportadora_nome: nfeData.transportadora.transportadora_nome || '',
            transportadora_documento: nfeData.transportadora.transportadora_documento || '',
            transportadora_endereco: nfeData.transportadora.transportadora_endereco || '',
            // ✅ ADICIONADO: Campos obrigatórios
            transportadora_cidade: nfeData.transportadora.transportadora_cidade || '',
            transportadora_uf: nfeData.transportadora.transportadora_uf || '',
            transportadora_ie: nfeData.transportadora.transportadora_ie || '',
            // ✅ ADICIONADO: Campos de veículo
            veiculo_placa: nfeData.transportadora.veiculo_placa || '',
            veiculo_uf: nfeData.transportadora.veiculo_uf || '',
            veiculo_rntc: nfeData.transportadora.veiculo_rntc || '',
            // ✅ ADICIONADO: Campos de volumes
            volumes_quantidade: nfeData.transportadora.volumes_quantidade || '',
            volumes_especie: nfeData.transportadora.volumes_especie || '',
            volumes_marca: nfeData.transportadora.volumes_marca || '',
            volumes_numeracao: nfeData.transportadora.volumes_numeracao || '',
            volumes_peso_bruto: nfeData.transportadora.volumes_peso_bruto || '',
            volumes_peso_liquido: nfeData.transportadora.volumes_peso_liquido || ''
          },
          // ✅ ADICIONADO: Chaves de referência (obrigatórias para finalidades 2, 3 e 4)
          chaves_ref: nfeData.chaves_ref || [],
          // ✅ ADICIONADO: Intermediador da transação (YB01, YB02, YB03)
          intermediador: nfeData.intermediador && nfeData.intermediador.nome && nfeData.intermediador.cnpj ? {
            nome: nfeData.intermediador.nome,
            cnpj: nfeData.intermediador.cnpj
          } : null,
          // ✅ CORREÇÃO: Adicionar informação adicional que estava faltando
          informacao_adicional: nfeData.identificacao.informacao_adicional || '',
          ambiente: ambienteNFe
        }
      };

      // 🔍 DEBUG: Primeiro enviar para debug para ver estrutura
      addLog('🔍 Analisando estrutura dos dados...');

      try {
        const debugResponse = await fetch('/backend/public/debug-nfe.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(localPayload)
        });

        const debugResult = await debugResponse.json();
        addLog('📊 Estrutura dos dados analisada:');
        addLog(`   Total produtos: ${debugResult.analise?.total_produtos || 0}`);
        addLog(`   Campos encontrados: ${debugResult.analise?.campos_encontrados?.join(', ') || 'nenhum'}`);

        if (debugResult.analise?.estrutura_produtos?.length > 0) {
          debugResult.analise.estrutura_produtos.forEach((prod, index) => {
            addLog(`   Produto ${index + 1}: ${prod.campos_disponiveis?.join(', ') || 'sem campos'}`);
          });
        }
      } catch (debugError) {
        addLog(`⚠️ Erro no debug: ${debugError.message}`);
      }

      // 🚀 ENVIAR PARA API LOCAL
      addLog('🚀 Enviando NFe para emissão...');

      // 🔍 DEBUG: Log dos dados do destinatário sendo enviados
      addLog('🔍 DEBUG - Dados do destinatário sendo enviados:');
      addLog(`   Nome: ${localPayload.nfe_data.destinatario.name || 'VAZIO'}`);
      addLog(`   Documento: ${localPayload.nfe_data.destinatario.documento || 'VAZIO'}`);
      addLog(`   IE Destinatário: ${localPayload.nfe_data.destinatario.ie_destinatario || 'VAZIO'}`);
      addLog(`   Endereço presente: ${localPayload.nfe_data.destinatario.endereco ? 'SIM' : 'NÃO'}`);
      if (localPayload.nfe_data.destinatario.endereco) {
        addLog(`   Logradouro: ${localPayload.nfe_data.destinatario.endereco.logradouro || 'VAZIO'}`);
        addLog(`   Número: ${localPayload.nfe_data.destinatario.endereco.numero || 'VAZIO'}`);
        addLog(`   Bairro: ${localPayload.nfe_data.destinatario.endereco.bairro || 'VAZIO'}`);
        addLog(`   Cidade: ${localPayload.nfe_data.destinatario.endereco.cidade || 'VAZIO'}`);
        addLog(`   UF: ${localPayload.nfe_data.destinatario.endereco.uf || 'VAZIO'}`);
        addLog(`   CEP: ${localPayload.nfe_data.destinatario.endereco.cep || 'VAZIO'}`);
        addLog(`   Código Município: ${localPayload.nfe_data.destinatario.endereco.codigo_municipio || 'VAZIO'}`);
      }

      // 🔍 DEBUG: Log da informação adicional
      addLog('🔍 DEBUG - Informação Adicional:');
      addLog(`   Valor: "${localPayload.nfe_data.informacao_adicional || 'VAZIO'}"`);
      addLog(`   Tamanho: ${(localPayload.nfe_data.informacao_adicional || '').length} caracteres`);

      // 🔍 DEBUG: Log dos dados da transportadora sendo enviados
      addLog('🔍 DEBUG - Dados da transportadora sendo enviados:');
      addLog(`   Modalidade: ${localPayload.nfe_data.transportadora.modalidade_frete || 'VAZIO'}`);
      addLog(`   ID: ${localPayload.nfe_data.transportadora.transportadora_id || 'VAZIO'}`);
      addLog(`   Nome: ${localPayload.nfe_data.transportadora.transportadora_nome || 'VAZIO'}`);
      addLog(`   Documento: ${localPayload.nfe_data.transportadora.transportadora_documento || 'VAZIO'}`);
      addLog(`   Endereço: ${localPayload.nfe_data.transportadora.transportadora_endereco || 'VAZIO'}`);
      addLog(`   Cidade: ${localPayload.nfe_data.transportadora.transportadora_cidade || 'VAZIO'}`);
      addLog(`   UF: ${localPayload.nfe_data.transportadora.transportadora_uf || 'VAZIO'}`);
      addLog(`   IE: ${localPayload.nfe_data.transportadora.transportadora_ie || 'VAZIO'}`);
      addLog(`   Veículo - Placa: ${localPayload.nfe_data.transportadora.veiculo_placa || 'VAZIO'}`);
      addLog(`   Veículo - UF: ${localPayload.nfe_data.transportadora.veiculo_uf || 'VAZIO'}`);
      addLog(`   Volumes - Qtd: ${localPayload.nfe_data.transportadora.volumes_quantidade || 'VAZIO'}`);
      addLog(`   Volumes - Espécie: ${localPayload.nfe_data.transportadora.volumes_especie || 'VAZIO'}`);
      addLog(`   Volumes - Marca: ${localPayload.nfe_data.transportadora.volumes_marca || 'VAZIO'}`);
      addLog(`   Volumes - Numeração: ${localPayload.nfe_data.transportadora.volumes_numeracao || 'VAZIO'}`);
      addLog(`   Volumes - Peso Bruto: ${localPayload.nfe_data.transportadora.volumes_peso_bruto || 'VAZIO'}`);
      addLog(`   Volumes - Peso Líquido: ${localPayload.nfe_data.transportadora.volumes_peso_liquido || 'VAZIO'}`);

      // 🔍 DEBUG: Log das chaves de referência sendo enviadas
      addLog('🔍 DEBUG - Chaves de referência sendo enviadas:');
      addLog(`   Finalidade NFe: ${localPayload.nfe_data.identificacao.finalidade || 'VAZIO'}`);
      addLog(`   Quantidade de chaves: ${(localPayload.nfe_data.chaves_ref || []).length}`);
      if ((localPayload.nfe_data.chaves_ref || []).length > 0) {
        localPayload.nfe_data.chaves_ref.forEach((chave, index) => {
          addLog(`   Chave ${index + 1}: ${chave.chave || 'VAZIO'}`);
        });
      } else {
        addLog('   Nenhuma chave de referência informada');
      }

      // 🔍 DEBUG: Log do intermediador sendo enviado
      addLog('🔍 DEBUG - Intermediador da transação sendo enviado:');
      if (localPayload.nfe_data.intermediador) {
        addLog(`   Nome: ${localPayload.nfe_data.intermediador.nome || 'VAZIO'}`);
        addLog(`   CNPJ: ${localPayload.nfe_data.intermediador.cnpj || 'VAZIO'}`);
        addLog('   Status: SERÁ INCLUÍDO NO XML (YB01, YB02, YB03)');
      } else {
        addLog('   Status: NÃO INFORMADO - XML sem intermediador');
      }

      const response = await fetch('/backend/public/emitir-nfe.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(localPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Tentar extrair erro específico da SEFAZ do response
        let erroEspecifico = null;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            // Tentar fazer parse do erro interno (pode ser JSON da SEFAZ)
            try {
              const erroSefaz = JSON.parse(errorData.error);
              if (erroSefaz.tipo === 'erro_sefaz') {
                erroEspecifico = erroSefaz;
              }
            } catch (parseError) {
              // Se não conseguir fazer parse, usar erro original
            }
          }
        } catch (parseError) {
          // Response não é JSON válido
        }

        if (erroEspecifico) {
          // Mostrar erro específico da SEFAZ
          updateStep('geracao', 'error', erroEspecifico.titulo);
          addLog(`❌ ${erroEspecifico.titulo}`);
          addLog(`📋 ${erroEspecifico.descricao}`);
          addLog(`💡 ${erroEspecifico.solucao}`);
          addLog('');
          addLog('🔧 Detalhes técnicos:');
          addLog(`   Status SEFAZ: ${erroEspecifico.detalhes_tecnicos?.status || 'N/A'}`);
          addLog(`   Motivo: ${erroEspecifico.detalhes_tecnicos?.motivo || 'N/A'}`);
          throw new Error(`${erroEspecifico.titulo}: ${erroEspecifico.descricao}`);
        } else {
          // Fallback para erro HTTP genérico
          updateStep('geracao', 'error', `Erro HTTP ${response.status}`);
          addLog(`ERRO: Falha no processamento completo - HTTP ${response.status}`);
          addLog(`Detalhes: ${errorText}`);
          throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
        }
      }

      const result = await response.json();

      // Debug: Log da resposta completa da API
      addLog('📄 Resposta da API NFe Completa:');
      addLog(`   Success: ${result.success}`);
      addLog(`   Message: ${result.message || 'N/A'}`);
      addLog(`   Data presente: ${result.data ? 'SIM' : 'NÃO'}`);

      if (result.data) {
        addLog(`   XML presente: ${result.data.xml ? 'SIM' : 'NÃO'}`);
        addLog(`   Chave presente: ${result.data.chave ? 'SIM' : 'NÃO'}`);
        addLog(`   Protocolo presente: ${result.data.protocolo ? 'SIM' : 'NÃO'}`);
        addLog(`   Status SEFAZ: ${result.data.status || 'N/A'}`);
        addLog(`   Motivo: ${result.data.motivo || 'N/A'}`);

        if (result.data.xml) {
          addLog(`   Tamanho XML: ${result.data.xml.length} caracteres`);
        }
        if (result.data.chave) {
          addLog(`   Chave: ${result.data.chave}`);
        }
        if (result.data.protocolo) {
          addLog(`   Protocolo: ${result.data.protocolo}`);
        }
      }

      if (!result.success) {
        updateStep('geracao', 'error', 'Falha no processamento');
        addLog('ERRO: API retornou falha no processamento');

        // Tentar fazer parse do erro para ver se é um erro traduzido da SEFAZ
        let erroDetalhado = result.error || result.message || 'Erro desconhecido';

        try {
          const erroJson = JSON.parse(erroDetalhado);
          if (erroJson.tipo === 'erro_sefaz') {
            // Exibir erro traduzido de forma amigável
            addLog(`❌ ${erroJson.titulo}`);
            addLog(`📋 ${erroJson.descricao}`);
            addLog(`💡 ${erroJson.solucao}`);
            addLog('');
            addLog('🔧 Detalhes técnicos:');
            addLog(`   Status SEFAZ: ${erroJson.detalhes_tecnicos.status}`);
            addLog(`   Motivo: ${erroJson.detalhes_tecnicos.motivo}`);

            throw new Error(`${erroJson.titulo}: ${erroJson.descricao}`);
          }
        } catch (parseError) {
          // Se não conseguir fazer parse, usar erro original
        }

        addLog(`Detalhes: ${erroDetalhado}`);
        throw new Error(erroDetalhado);
      }

      // Verificar se os dados essenciais estão presentes
      if (!result.data || !result.data.xml || !result.data.chave || !result.data.protocolo) {
        updateStep('geracao', 'error', 'Dados incompletos da API');
        addLog('ERRO: API retornou dados incompletos');
        addLog(`   XML: ${result.data?.xml ? 'OK' : 'FALTANDO'}`);
        addLog(`   Chave: ${result.data?.chave ? 'OK' : 'FALTANDO'}`);
        addLog(`   Protocolo: ${result.data?.protocolo ? 'OK' : 'FALTANDO'}`);
        throw new Error('API retornou dados incompletos (XML, chave ou protocolo faltando)');
      }

      // ✅ ETAPA 4: VERIFICAÇÃO SEFAZ
      updateStep('sefaz', 'loading');
      addLog('🔍 Verificando autorização da SEFAZ...');

      // SEGUINDO AS 4 LEIS NFe - APENAS STATUS 100 É AUTORIZADA
      const statusSefaz = result.data.status;
      if (statusSefaz === '100') {
        // NFe realmente autorizada pela SEFAZ
        updateStep('sefaz', 'success', 'NFe autorizada pela SEFAZ');
        addLog('✅ NFe autorizada pela SEFAZ (Status 100)');
        addLog(`✅ Protocolo real: ${result.data.protocolo}`);
      } else {
        // Qualquer status diferente de 100 = NFe NÃO autorizada
        updateStep('sefaz', 'error', `NFe não autorizada (Status ${statusSefaz})`);
        addLog(`❌ NFe NÃO autorizada - Status: ${statusSefaz}`);
        addLog(`❌ Motivo: ${result.data.motivo || 'Sem detalhes'}`);
        throw new Error(`NFe não foi autorizada pela SEFAZ. Status: ${statusSefaz} - ${result.data.motivo}`);
      }

      addLog('✅ XML gerado com sucesso');
      addLog('✅ Certificado digital aplicado');
      addLog(`Chave NFe: ${result.data.chave}`);
      addLog(`Protocolo: ${result.data.protocolo}`);
      updateStep('geracao', 'success', 'XML gerado');
      updateStep('sefaz', 'success', 'Autorizada pela SEFAZ');

      // ETAPA 4: VALIDAÇÃO DO XML
      updateStep('validacao_xml', 'loading');
      addLog('🔍 Validando se o XML foi gerado corretamente...');
      await validarArquivoXML(result.data.chave);
      updateStep('validacao_xml', 'success', 'XML validado com sucesso');

      // ETAPA 5: VALIDAÇÃO DO PDF (CONDICIONAL)
      updateStep('validacao_pdf', 'loading');
      addLog('🔍 Validando se o PDF foi gerado corretamente...');

      if (result.data.pdf_path && result.data.pdf_path !== null) {
        // PDF foi gerado - validar
        try {
          await validarArquivoPDF(result.data.chave);
          updateStep('validacao_pdf', 'success', 'PDF validado com sucesso');
          addLog('✅ PDF validado com sucesso');
        } catch (pdfError) {
          updateStep('validacao_pdf', 'error', 'Erro na validação do PDF');
          addLog(`❌ Erro na validação do PDF: ${pdfError.message}`);
          throw new Error(`Falha na validação do PDF: ${pdfError.message}`);
        }
      } else {
        // PDF não foi gerado (normal para status 103)
        updateStep('validacao_pdf', 'warning', 'PDF será gerado após autorização');
        addLog('ℹ️ PDF não foi gerado - será criado após autorização da SEFAZ');
        addLog('📋 Para status 103, o PDF é gerado apenas após autorização final');
      }

      // ETAPA 6: SALVAMENTO NO BANCO
      updateStep('banco', 'loading');
      addLog('Salvando NFe no banco de dados...');

      try {
        await salvarNFeNoBanco(result.data);
        addLog('NFe salva no banco com sucesso');
        updateStep('banco', 'success', 'Salva no banco');
      } catch (dbError) {
        updateStep('banco', 'error', 'Erro ao salvar no banco');
        addLog('AVISO: Erro ao salvar no banco local');
        addLog(`Detalhes: ${dbError.message || 'Erro desconhecido'}`);
        addLog('NFe foi autorizada pela SEFAZ, mas pode não aparecer na listagem');
      }

      // ETAPA 7: FINALIZAÇÃO
      updateStep('finalizacao', 'loading');
      addLog('Finalizando processo...');

      // SEGUINDO AS 4 LEIS NFe - DADOS DE AUTORIZAÇÃO REAIS
      setDadosAutorizacao({
        chave: result.data.chave,
        protocolo: result.data.protocolo, // ✅ PROTOCOLO REAL (15 dígitos)
        dataAutorizacao: result.data.data_autorizacao || new Date().toISOString(),
        status: result.data.status === '100' ? 'autorizada' : 'rejeitada', // ✅ STATUS REAL
        ambiente: ambienteNFe
      });

      // ✅ REMOVIDO: Não precisamos mais marcar código como usado
      addLog('✅ Código numérico utilizado com sucesso');

      // Marcar NFe como emitida
      setNfeEmitida(true);

      // ETAPA 5: ENVIO POR EMAIL
      updateStep('email', 'loading');
      addLog('📧 Iniciando envio por email...');

      const emailsDestinatario = nfeData.destinatario.emails || [];
      if (emailsDestinatario.length > 0) {
        addLog(`📧 Emails encontrados: ${emailsDestinatario.join(', ')}`);

        try {
          // Enviar email com XML e PDF
          const emailResponse = await fetch('/backend/public/enviar-nfe-email.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              empresa_id: usuarioData.empresa_id,
              chave_nfe: result.data.chave,
              emails: emailsDestinatario,
              nfe_data: {
                numero: result.data.numero_nfe || nfeData.identificacao.numero,
                serie: nfeData.identificacao.serie,
                valor_total: nfeData.totais.valor_total,
                cliente_nome: nfeData.destinatario.nome,
                empresa_nome: nfeData.empresa?.nome_fantasia || nfeData.empresa?.name || 'Sistema Nexo',
                empresa_endereco: nfeData.empresa?.address || '',
                empresa_cnpj: nfeData.empresa?.cnpj || '',
                empresa_telefone: nfeData.empresa?.phone || '',
                empresa_email: nfeData.empresa?.email || '',
                empresa_website: nfeData.empresa?.website || ''
              }
            })
          });

          if (emailResponse.ok) {
            const emailResult = await emailResponse.json();
            if (emailResult.success) {
              addLog(`✅ Email enviado com sucesso para: ${emailsDestinatario.join(', ')}`);
              updateStep('email', 'success', `Enviado para ${emailsDestinatario.length} email(s)`);
            } else {
              addLog(`⚠️ Falha no envio de email: ${emailResult.error}`);
              // ✅ Armazenar erro para parar o modal
              setEmailError(`Erro ao enviar email: ${emailResult.error}`);
              setShowCloseButton(true);
              // ✅ Mostrar detalhes específicos do erro de email
              if (emailResult.arquivos) {
                addLog(`📁 XML existe: ${emailResult.arquivos.xml_existe ? 'SIM' : 'NÃO'}`);
                addLog(`📁 PDF existe: ${emailResult.arquivos.pdf_existe ? 'SIM' : 'NÃO'}`);
                if (!emailResult.arquivos.xml_existe) {
                  addLog(`📁 Caminho XML: ${emailResult.arquivos.xml_path}`);
                }
                if (!emailResult.arquivos.pdf_existe) {
                  addLog(`📁 Caminho PDF: ${emailResult.arquivos.pdf_path}`);
                }
              }
              updateStep('email', 'error', 'Falha no envio');
            }
          } else {
            // ✅ Tentar obter detalhes do erro HTTP
            const errorText = await emailResponse.text();
            let errorDetails = 'Erro na comunicação com serviço de email';
            try {
              const errorData = JSON.parse(errorText);
              errorDetails = errorData.error || errorDetails;
            } catch (parseError) {
              // Se não conseguir fazer parse, usar texto original
              errorDetails = errorText || errorDetails;
            }
            addLog(`⚠️ ${errorDetails}`);
            // ✅ Armazenar erro para parar o modal
            setEmailError(errorDetails);
            setShowCloseButton(true);
            updateStep('email', 'error', 'Erro na comunicação');
          }
        } catch (emailError) {
          addLog(`⚠️ Erro ao enviar email: ${emailError.message}`);
          // ✅ Armazenar erro para parar o modal
          setEmailError(`Erro ao enviar email: ${emailError.message}`);
          setShowCloseButton(true);
          updateStep('email', 'error', 'Erro no envio');
        }
        // ✅ Marcar que processo de email terminou
        setEmailProcessCompleted(true);
      } else {
        addLog('ℹ️ Nenhum email cadastrado para o destinatário');
        updateStep('email', 'success', 'Nenhum email cadastrado');
        // ✅ Marcar que processo de email terminou
        setEmailProcessCompleted(true);
      }

      addLog('✅ NFe emitida com sucesso!');
      addLog(`Chave: ${result.data.chave}`);
      addLog(`Protocolo: ${result.data.protocolo || 'N/A'}`);
      addLog(`Número NFe: ${result.data.numero_nfe || 'N/A'}`);
      addLog(`Valor: R$ ${nfeData.totais.valor_total.toFixed(2)}`);
      updateStep('finalizacao', 'success', 'Processo concluído');

      // ✅ A verificação de erro de email será feita via useEffect quando emailProcessCompleted for true
    } catch (error) {
      // ✅ REMOVIDO: Não precisamos mais liberar código reservado
      if (typeof codigoNumerico !== 'undefined') {
        addLog('ℹ️ Código numérico não será reutilizado');
      }

      // Adicionar erro aos logs
      addLog('❌ ERRO CRÍTICO NO PROCESSO');
      addLog(`Detalhes: ${error.message || 'Erro desconhecido'}`);

      // Determinar qual etapa falhou e marcar como erro
      const currentStep = progressSteps.find(step => step.status === 'loading');
      if (currentStep) {
        updateStep(currentStep.id, 'error', 'Falha na execução');
      }

      // Buscar logs da API automaticamente quando houver erro
      addLog('🔍 Buscando logs detalhados da API...');
      try {
        await fetchApiLogs('error', 10);
        addLog('✅ Logs da API carregados - verifique a seção "API Server Logs"');
      } catch (logError) {
        addLog('⚠️ Não foi possível carregar logs da API');
      }

      // ✅ MELHORADO: Usar utilitário de tradução de erros SEFAZ
      const errorMessage = error.message || 'Erro desconhecido';

      // Extrair código de status SEFAZ da mensagem
      const statusCode = extrairCodigoSefaz(errorMessage);

      if (statusCode) {
        // Traduzir erro usando o utilitário
        const erroTraduzido = traduzirErroSefaz(statusCode, errorMessage);
        const categoria = categorizarErro(statusCode);

        addLog(`Tipo: ${categoria} - ${erroTraduzido.titulo}`);
        addLog(`📋 ${erroTraduzido.descricao}`);
        addLog(`💡 ${erroTraduzido.solucao}`);

      } else if (errorMessage.includes('Failed to fetch')) {
        addLog('Tipo: ❌ Erro de Conexão com a API');
        addLog('Solução: Verifique sua conexão e se a API está funcionando');
      } else if (errorMessage.includes('HTTP 404')) {
        addLog('Tipo: ❌ Endpoint Não Encontrado');
        addLog('Solução: Verifique se a API está configurada corretamente');
      } else if (errorMessage.includes('HTTP 500')) {
        addLog('Tipo: ❌ Erro Interno do Servidor');
        addLog('Solução: Verifique os logs da API para detalhes específicos');
      } else if (error.message.includes('timeout')) {
        addLog('Tipo: Timeout na requisição');
        addLog('Solução: A operação demorou muito para responder');
      } else if (error.message.includes('Erro na Validação da NFe')) {
        addLog('Tipo: ❌ Erro de Validação SEFAZ');
        addLog('Solução: Verifique os dados da NFe e corrija os problemas indicados');
      } else {
        addLog('Tipo: ❌ Erro de Validação SEFAZ');
        addLog('Solução: Verifique os dados da NFe e corrija os problemas indicados');
      }

      addLog('');
      addLog('📋 Use o botão "Copiar Logs" para enviar os detalhes para suporte');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ FUNÇÃO: Validar se o arquivo XML foi gerado corretamente
  const validarArquivoXML = async (chave: string) => {
    try {
      addLog('📄 Verificando se o arquivo XML existe no servidor...');

      // Obter empresa_id do usuário logado
      const { data: userData } = await supabase.auth.getUser();
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        throw new Error('Empresa não identificada para validação');
      }

      const xmlUrl = `/backend/public/download-arquivo.php?type=xml&chave=${chave}&empresa_id=${usuarioData.empresa_id}`;

      // Primeiro, verificar se o arquivo existe
      const headResponse = await fetch(xmlUrl, { method: 'HEAD' });

      if (!headResponse.ok) {
        throw new Error(`XML não encontrado no servidor (Status: ${headResponse.status})`);
      }

      // Verificar se o Content-Type é XML
      const contentType = headResponse.headers.get('Content-Type');
      if (!contentType || !contentType.includes('xml')) {
        throw new Error('Arquivo encontrado mas não é um XML válido');
      }

      addLog('📄 Baixando XML para validação de conteúdo...');

      // Baixar o XML para validar o conteúdo
      const getResponse = await fetch(xmlUrl);

      if (!getResponse.ok) {
        throw new Error(`Erro ao baixar XML (Status: ${getResponse.status})`);
      }

      const xmlContent = await getResponse.text();

      // Validações básicas do XML
      if (!xmlContent || xmlContent.trim().length === 0) {
        throw new Error('XML está vazio');
      }

      if (!xmlContent.includes('<?xml')) {
        throw new Error('XML não possui declaração XML válida');
      }

      if (!xmlContent.includes('<NFe') || !xmlContent.includes('</NFe>')) {
        throw new Error('XML não contém estrutura NFe válida');
      }

      if (!xmlContent.includes('<infNFe') || !xmlContent.includes('</infNFe>')) {
        throw new Error('XML não contém informações da NFe (infNFe)');
      }

      // Verificar se contém a chave
      if (!xmlContent.includes(chave)) {
        throw new Error('XML não contém a chave de acesso esperada');
      }

      addLog('✅ XML validado: arquivo existe, é válido e contém dados corretos');

    } catch (error) {
      addLog(`❌ ERRO na validação do XML: ${error.message}`);
      throw new Error(`Falha na validação do XML: ${error.message}`);
    }
  };

  // ✅ FUNÇÃO: Validar se o arquivo PDF foi gerado corretamente
  const validarArquivoPDF = async (chave: string) => {
    try {
      addLog('📄 Verificando se o arquivo PDF existe no servidor...');

      // Obter empresa_id do usuário logado
      const { data: userData } = await supabase.auth.getUser();
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        throw new Error('Empresa não identificada para validação');
      }

      const pdfUrl = `/backend/public/download-arquivo.php?type=pdf&chave=${chave}&empresa_id=${usuarioData.empresa_id}`;

      // Primeiro, verificar se o arquivo existe
      const headResponse = await fetch(pdfUrl, { method: 'HEAD' });

      if (!headResponse.ok) {
        throw new Error(`PDF não encontrado no servidor (Status: ${headResponse.status})`);
      }

      // Verificar se o Content-Type é PDF
      const contentType = headResponse.headers.get('Content-Type');
      if (!contentType || !contentType.includes('pdf')) {
        throw new Error('Arquivo encontrado mas não é um PDF válido');
      }

      // Verificar o tamanho do arquivo
      const contentLength = headResponse.headers.get('Content-Length');
      if (contentLength && parseInt(contentLength) < 1000) {
        throw new Error('PDF muito pequeno, pode estar corrompido ou vazio');
      }

      addLog('📄 Fazendo download parcial do PDF para validação...');

      // Fazer um download parcial para verificar se é um PDF válido
      const getResponse = await fetch(pdfUrl, {
        headers: {
          'Range': 'bytes=0-1023' // Primeiros 1KB
        }
      });

      if (getResponse.ok || getResponse.status === 206) { // 206 = Partial Content
        const pdfHeader = await getResponse.arrayBuffer();
        const headerBytes = new Uint8Array(pdfHeader);

        // Verificar se começa com %PDF
        const pdfSignature = String.fromCharCode(...headerBytes.slice(0, 4));
        if (pdfSignature !== '%PDF') {
          throw new Error('Arquivo não é um PDF válido (assinatura incorreta)');
        }

        addLog('✅ PDF validado: arquivo existe, é válido e tem estrutura correta');
      } else {
        throw new Error(`Erro ao validar conteúdo do PDF (Status: ${getResponse.status})`);
      }

    } catch (error) {
      addLog(`❌ ERRO na validação do PDF: ${error.message}`);
      throw new Error(`Falha na validação do PDF: ${error.message}`);
    }
  };

  // Função para salvar NFe no banco de dados
  const salvarNFeNoBanco = async (nfeApiData: any) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // SEGUINDO AS 4 LEIS NFe - STATUS BASEADO NA SEFAZ REAL
      const statusReal = nfeApiData.status === '100' ? 'autorizada' : 'rejeitada';

      const dadosNFe = {
        empresa_id: usuarioData.empresa_id,
        usuario_id: userData.user.id,
        modelo_documento: 55,
        serie_documento: parseInt(nfeData.identificacao.serie) || 1,
        numero_documento: parseInt(nfeData.identificacao.numero), // ✅ USAR número do frontend
        chave_nfe: nfeApiData.chave,
        status_nfe: statusReal, // ✅ STATUS REAL DA SEFAZ
        protocolo_nfe: nfeApiData.protocolo, // ✅ PROTOCOLO REAL (15 dígitos)
        nome_cliente: nfeData.destinatario.nome || 'Cliente',
        valor_total: nfeData.totais.valor_total || 0,
        natureza_operacao: nfeData.identificacao.natureza_operacao || 'VENDA',
        xml_nfe: nfeApiData.xml,
        data_emissao_nfe: nfeApiData.data_autorizacao || nfeData.identificacao.data_emissao || (() => {
          const agora = new Date();
          const offsetBrasil = -3 * 60; // UTC-3 em minutos
          const dataBrasil = new Date(agora.getTime() + (offsetBrasil * 60 * 1000));
          return dataBrasil.toISOString();
        })(),
        // ✅ ADICIONAR: Salvar dados completos da NFe para visualização
        dados_nfe: JSON.stringify(nfeData),
        // ✅ CORRIGIDO: Campo correto é informacoes_adicionais (plural)
        informacoes_adicionais: nfeData.identificacao.informacao_adicional || '',
        // ✅ NOVO: Salvar ambiente da NFe
        ambiente: ambienteNFe
      };

      let error;

      if (isEditingRascunho && rascunhoId) {
        // ✅ ATUALIZAR rascunho existente
        addLog(`🔄 Atualizando rascunho existente (ID: ${rascunhoId}) para status autorizada`);
        const result = await supabase
          .from('pdv')
          .update(dadosNFe)
          .eq('id', rascunhoId);
        error = result.error;
      } else {
        // ✅ CRIAR novo registro
        addLog('📝 Criando novo registro de NFe autorizada');
        const result = await supabase
          .from('pdv')
          .insert(dadosNFe);
        error = result.error;
      }

      if (error) {
        throw error;
      }

      // ✅ Salvar itens da NFe se não for atualização de rascunho
      if (!isEditingRascunho && nfeData.produtos.length > 0) {
        addLog('📦 Salvando itens da NFe...');

        // Buscar o ID da NFe recém-criada
        const { data: nfeRecemCriada } = await supabase
          .from('pdv')
          .select('id')
          .eq('chave_nfe', nfeApiData.chave)
          .single();

        if (nfeRecemCriada) {
          const itensNFe = nfeData.produtos.map((produto) => ({
            empresa_id: usuarioData.empresa_id,
            usuario_id: userData.user.id,
            pdv_id: nfeRecemCriada.id,
            produto_id: produto.produto_id || null,
            codigo_produto: produto.codigo,
            nome_produto: produto.descricao,
            descricao_produto: produto.descricao,
            quantidade: produto.quantidade,
            valor_unitario: produto.valor_unitario,
            valor_total_item: produto.valor_total,

            // ✅ TODOS OS CAMPOS FISCAIS SALVOS NA TABELA PDV_ITENS:
            ncm: produto.ncm,
            cfop: produto.cfop,
            origem_produto: produto.origem_produto,
            cst_icms: produto.cst_icms,
            csosn_icms: produto.csosn_icms,
            cst_pis: produto.cst_pis,
            cst_cofins: produto.cst_cofins,
            cst_ipi: produto.cst_ipi,
            aliquota_icms: produto.aliquota_icms || 0,
            aliquota_pis: produto.aliquota_pis || 0,
            aliquota_cofins: produto.aliquota_cofins || 0,
            aliquota_ipi: produto.aliquota_ipi || 0,
            valor_icms: produto.valor_icms || 0,
            valor_pis: produto.valor_pis || 0,
            valor_cofins: produto.valor_cofins || 0,
            valor_ipi: produto.valor_ipi || 0,

            // CAMPOS ADICIONAIS:
            unidade: produto.unidade,
            ean: produto.ean,
            cest: produto.cest,
            codigo_beneficio_fiscal: produto.codigo_beneficio_fiscal,
            valor_frete: produto.valor_frete || 0,
            valor_seguro: produto.valor_seguro || 0,
            valor_outras_despesas: produto.valor_outras_despesas || 0,
            informacoes_adicionais_item: produto.informacoes_adicionais_item,
            base_calculo_icms: produto.base_calculo_icms || 0,
            base_calculo_icms_st: produto.base_calculo_icms_st || 0,
            valor_icms_st: produto.valor_icms_st || 0,
            aliquota_icms_st: produto.aliquota_icms_st || 0,
            margem_valor_agregado: produto.margem_valor_agregado || 0,
            reducao_base_calculo: produto.reducao_base_calculo || 0
          }));

          const { error: itensError } = await supabase
            .from('pdv_itens')
            .insert(itensNFe);

          if (itensError) {
            addLog('⚠️ Erro ao salvar itens da NFe: ' + itensError.message);
          } else {
            addLog('✅ Itens da NFe salvos com sucesso');
          }
        }
      }

      // ✅ Resetar estado de edição após salvar
      if (isEditingRascunho) {
        addLog('✅ Rascunho convertido para NFe autorizada com sucesso');
        setIsEditingRascunho(false);
        setRascunhoId(null);
      }

    } catch (error) {
      throw error;
    }
  };

  // ✅ FUNÇÃO PARA SALVAR CANCELAMENTO NO BANCO (MESMO PADRÃO DA EMISSÃO)
  const salvarCancelamentoNoBanco = async (cancelamentoData: any) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // ✅ ATUALIZAR STATUS NO BANCO (MESMO PADRÃO DA EMISSÃO)
      const { error } = await supabase
        .from('pdv')
        .update({
          status_nfe: 'cancelada',
          motivo_cancelamento: cancelamentoData.motivo || 'Cancelamento via sistema',
          cancelada_em: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('chave_nfe', cancelamentoData.chave_nfe)
        .eq('empresa_id', usuarioData.empresa_id);

      if (error) {
        throw error;
      }

      console.log('✅ Status de cancelamento atualizado no banco via frontend');

    } catch (error) {
      console.error('❌ Erro ao salvar cancelamento no banco:', error);
      throw error;
    }
  };

  // ✅ CORREÇÃO: Regras oficiais de chaves de referência
  // Finalidade 1 (Normal) = OPCIONAL (se informada, aparece no XML/DANFE)
  // Finalidade 2 (Complementar) = OBRIGATÓRIA
  // Finalidade 3 (Ajuste) = OBRIGATÓRIA
  // Finalidade 4 (Devolução) = OBRIGATÓRIA
  const finalidade = nfeData.identificacao?.finalidade || '1';
  const finalidadeExigeChaveRef = true; // Sempre mostrar aba (mas com avisos sobre obrigatoriedade)

  // ✅ TEMPORÁRIO: Redirecionamento removido para debug

  const sections = [
    { id: 'identificacao', label: 'Identificação', number: 1 },
    { id: 'destinatario', label: 'Destinatário', number: 2 },
    { id: 'produtos', label: 'Produtos', number: 3 },
    // ✅ TEMPORÁRIO: Mostrar aba Pagamentos para debug (depois remover para finalidade 4)
    { id: 'pagamentos', label: 'Pagamentos', number: 4 },
    // ✅ CORREÇÃO: Para finalidade 4, Chaves Ref vira passo 4 (obrigatório). Para outras, fica como ícone opcional
    ...(finalidadeExigeChaveRef ? [{
      id: 'chaves_ref',
      label: 'Chaves Ref.',
      ...(finalidade === '4' ? { number: 4 } : { icon: FileText })
    }] : []),
    // ✅ CORREÇÃO: Totais movido para baixo e sem número (só ícone)
    { id: 'totais', label: 'Totais', icon: Calculator },
    { id: 'transportadora', label: 'Transportadora', icon: Truck },
    { id: 'intermediador', label: 'Intermediador', icon: Users },
    // Só mostrar a aba de Autorização após a NFe ser emitida OU em modo visualização de NFe autorizada
    ...(nfeEmitida || isViewMode ? [{ id: 'autorizacao', label: 'Autorização', icon: FileText }] : []),
  ];

  // Função para cancelar NFe a partir da seção de Autorização
  const handleCancelarNFeFromAutorizacao = async (motivo: string) => {
    try {
      // Obter dados do usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Usuário não autenticado');
      }

      // Obter empresa_id do usuário
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        throw new Error('Empresa não encontrada para o usuário');
      }

      // Preparar dados para cancelamento
      const cancelData = {
        empresa_id: usuarioData.empresa_id,
        chave_nfe: dadosAutorizacao?.chave,
        motivo: motivo.trim(),
        nfe_id: nfeEmitida?.id // ID da NFe no banco local
      };

      console.log('🚫 Enviando dados para cancelamento:', cancelData);

      // Chamar API de cancelamento
      const response = await fetch('/backend/public/cancelar-nfe.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cancelData)
      });

      const result = await response.json();
      console.log('🚫 Resposta do cancelamento:', result);

      if (!result.success) {
        throw new Error(result.error || 'Erro ao cancelar NFe');
      }

      // Atualizar dados de autorização localmente
      setDadosAutorizacao(prev => ({
        ...prev,
        status: 'cancelada',
        motivo_cancelamento: motivo,
        data_cancelamento: new Date().toISOString()
      }));

      // ✅ SEGUIR EXATAMENTE O PADRÃO DA EMISSÃO: SALVAR NO BANCO VIA FRONTEND
      console.log('✅ NFe cancelada com sucesso - Salvando no banco...');

      try {
        await salvarCancelamentoNoBanco(result.data);
        console.log('✅ Cancelamento salvo no banco com sucesso');
      } catch (dbError) {
        console.error('❌ Erro ao salvar cancelamento no banco:', dbError);
        // Não falhar o processo - cancelamento já foi feito na SEFAZ
      }

      showMessage('success', 'NFe cancelada com sucesso!');

      // ✅ MESMO PADRÃO DA EMISSÃO: Aguardar 1 segundo e voltar para a grid
      setTimeout(() => {
        onSave(); // ✅ Recarregar a lista de NFe (mesmo que emissão)
        onBack(); // ✅ Voltar para a grid de NFe (mesmo que emissão)
      }, 1000);

    } catch (error: any) {
      console.error('❌ Erro ao cancelar NFe:', error);
      throw error;
    }
  };

  // Função para visualizar PDF da CCe
  const handleVisualizarPDFCCe = async (chave: string, sequencia: number) => {
    console.log('📄 Iniciando visualização do PDF da CCe:', chave, 'sequência:', sequencia);

    try {
      showMessage('info', 'Gerando PDF da CCe...');

      // Obter empresa_id do usuário logado
      const { data: userData } = await supabase.auth.getUser();
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        showMessage('error', 'Empresa não identificada');
        return;
      }

      // Tentar gerar o PDF da CCe
      const response = await fetch('/backend/public/gerar-pdf-cce.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chave: chave,
          empresa_id: usuarioData.empresa_id,
          sequencia: sequencia
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Erro ao gerar PDF da CCe');
      }

      // Abrir o PDF gerado em nova aba
      const pdfUrl = `/backend/public/download-arquivo.php?type=pdf_cce&chave=${chave}&empresa_id=${usuarioData.empresa_id}&sequencia=${sequencia}&action=view`;

      // Aguardar um pouco para o arquivo ser salvo
      setTimeout(() => {
        window.open(pdfUrl, '_blank');
        showMessage('success', 'PDF da CCe aberto em nova aba');
      }, 1000);

    } catch (error) {
      console.error('Erro ao visualizar PDF da CCe:', error);
      showMessage('error', `Erro ao gerar/visualizar PDF da CCe: ${error.message}`);
    }
  };

  // Função para enviar Carta de Correção (CCe)
  const handleEnviarCCe = async () => {
    try {
      // Validações iniciais
      if (!dadosAutorizacao?.chave) {
        showToast('Chave da NFe não encontrada', 'error');
        return;
      }

      if (!dadosAutorizacao?.carta_correcao || dadosAutorizacao.carta_correcao.length < 15) {
        showToast('Carta de Correção deve ter pelo menos 15 caracteres', 'error');
        return;
      }

      // Abrir modal de loading
      setShowCCeModal(true);
      setCceStatus('loading');
      setCceMessage('Enviando Carta de Correção para a SEFAZ...');

      // Sequência será calculada automaticamente pelo backend se não informada

      // Obter dados do usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Usuário não autenticado');
      }

      // Obter empresa_id do usuário
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        throw new Error('Empresa não encontrada para o usuário');
      }

      // Preparar dados para CCe usando a sequência do campo editável
      const cceData = {
        empresa_id: usuarioData.empresa_id,
        chave_nfe: dadosAutorizacao.chave,
        correcao: dadosAutorizacao.carta_correcao?.trim() || '',
        sequencia: dadosAutorizacao.sequencia_cce || 1 // Usar sequência do campo editável
      };

      console.log('📝 Enviando CCe:', cceData);

      // Enviar CCe para o backend
      const response = await fetch('/backend/public/carta-correcao.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cceData)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao enviar Carta de Correção');
      }

      console.log('✅ CCe enviada com sucesso:', result);

      // Atualizar modal para sucesso
      setCceStatus('success');
      setCceMessage('Carta de Correção enviada com sucesso!');

      // Gerar PDF da CCe automaticamente
      try {
        const pdfResponse = await fetch('/backend/public/gerar-pdf-cce.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chave: dadosAutorizacao.chave,
            empresa_id: usuarioData.empresa_id,
            sequencia: result.data.sequencia // Usar sequência retornada pelo backend
          })
        });

        const pdfResult = await pdfResponse.json();

        if (pdfResult.success) {
          console.log('✅ PDF da CCe gerado:', pdfResult);
          showToast('PDF da Carta de Correção gerado com sucesso!', 'success');
        } else {
          console.warn('⚠️ Erro ao gerar PDF da CCe:', pdfResult.error);
          showToast('CCe enviada, mas houve erro ao gerar PDF', 'info');
        }
      } catch (pdfError) {
        console.warn('⚠️ Erro ao gerar PDF da CCe:', pdfError);
        showToast('CCe enviada, mas houve erro ao gerar PDF', 'info');
      }

      // Atualizar dados da NFe com informações da CCe
      setDadosAutorizacao(prev => ({
        ...prev,
        cce_enviada: true,
        cce_protocolo: result.data.protocolo_cce,
        cce_data: result.data.data_cce,
        cce_sequencia: result.data.sequencia,
        // Adicionar nova CCe ao histórico
        cartas_correcao: [
          ...(prev.cartas_correcao || []),
          {
            sequencia: result.data.sequencia,
            data_envio: result.data.data_cce,
            protocolo: result.data.protocolo_cce,
            correcao: result.data.correcao || dadosAutorizacao.carta_correcao,
            status: 'aceita',
            codigo_status: result.data.codigo_status,
            ambiente: result.data.ambiente
          }
        ],
        // Limpar campo de texto da correção
        carta_correcao: '',
        // Atualizar próxima sequência
        sequencia_cce: (prev.cartas_correcao?.length || 0) + 1
      }));

      console.log('✅ CCe adicionada ao histórico local');

    } catch (error: any) {
      console.error('❌ Erro ao enviar CCe:', error);

      // Atualizar modal para erro
      setCceStatus('error');
      setCceMessage(`Erro ao enviar Carta de Correção: ${error.message}`);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'identificacao':
        return (
          <IdentificacaoSection
            data={nfeData.identificacao}
            onChange={(data) => setNfeData(prev => ({ ...prev, identificacao: data }))}
            naturezasOperacao={naturezasOperacao}
            isEditingRascunho={isEditingRascunho}
            isViewMode={isViewMode}
          />
        );
      case 'destinatario':
        return (
          <DestinatarioSection
            data={nfeData.destinatario}
            onChange={(data) => setNfeData(prev => ({ ...prev, destinatario: data }))}
            onClienteSelected={(observacaoNfe) => {
              if (observacaoNfe && observacaoNfe.trim()) {
                setNfeData(prev => ({
                  ...prev,
                  identificacao: {
                    ...prev.identificacao,
                    informacao_adicional: observacaoNfe.trim()
                  }
                }));
              }
            }}
          />
        );
      case 'produtos':
        return (
          <ProdutosSection
            produtos={nfeData.produtos}
            empresaId={nfeData.empresa?.id}
            finalidade={nfeData.identificacao.finalidade}
            nfeData={nfeData}
            showToast={showToast}
            onChange={(produtos) => {
              const valorProdutos = produtos.reduce((sum, p) => sum + (p.valor_total || 0), 0);

              // ✅ CALCULAR TOTAIS DE ICMS PARA DEVOLUÇÕES COM DESTAQUE
              let totalIcmsBC = 0;
              let totalIcms = 0;

              if (nfeData.identificacao?.finalidade === '4') {
                produtos.forEach(produto => {
                  if (produto.destaque_icms_devolucao) {
                    const baseCalculo = produto.base_calculo_icms || produto.valor_total || 0;
                    const aliquota = produto.aliquota_icms || 0;
                    const valorIcms = (baseCalculo * aliquota) / 100;

                    totalIcmsBC += baseCalculo;
                    totalIcms += valorIcms;
                  }
                });
              }

              setNfeData(prev => ({
                ...prev,
                produtos,
                totais: {
                  ...prev.totais,
                  valor_produtos: valorProdutos,
                  valor_total: valorProdutos - prev.totais.valor_desconto,
                  valor_icms_bc: totalIcmsBC,
                  valor_icms: totalIcms
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
            finalidade={finalidade}
          />
        );
      case 'chaves_ref':
        return (
          <ChavesRefSection
            data={nfeData.chaves_ref}
            onChange={(data) => setNfeData(prev => ({ ...prev, chaves_ref: data }))}
            finalidade={finalidade}
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
        return (
          <IntermediadorSection
            data={nfeData.intermediador}
            onChange={(data) => setNfeData(prev => ({ ...prev, intermediador: data }))}
          />
        );
      case 'autorizacao':
        return (
          <AutorizacaoSection
            dados={dadosAutorizacao}
            onChange={setDadosAutorizacao}
            isViewMode={isViewMode}
            onCancelarNFe={handleCancelarNFeFromAutorizacao}
            onEnviarCCe={handleEnviarCCe}
            onVisualizarPDFCCe={handleVisualizarPDFCCe}
          />
        );
      default:
        return (
          <IdentificacaoSection
            data={nfeData.identificacao}
            onChange={(data) => setNfeData(prev => ({ ...prev, identificacao: data }))}
            naturezasOperacao={naturezasOperacao}
            isEditingRascunho={isEditingRascunho}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col z-50">
      {/* Cabeçalho de ponta a ponta */}
      <div className="bg-background-card border-b border-gray-800 px-6 py-2 flex-shrink-0">
        {/* Linha única - Título, Status API/SEFAZ e Ambiente */}
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button
                onClick={handleTryExit}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-bold text-white">
                {isViewMode ? 'Visualizar NFe' : 'Nova NFe'}
              </h1>
            </div>

            {/* Status da API e SEFAZ */}
            <div className="flex items-center gap-3">
              {/* Status da API */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${
                apiStatus === 'online'
                  ? 'bg-green-500/15 text-green-400 border-green-500/30'
                  : apiStatus === 'offline'
                  ? 'bg-red-500/15 text-red-400 border-red-500/30'
                  : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  apiStatus === 'online'
                    ? 'bg-green-400'
                    : apiStatus === 'offline'
                    ? 'bg-red-400'
                    : 'bg-yellow-400 animate-pulse'
                }`}></div>
                <span>
                  {apiStatus === 'online' ? 'API Online' :
                   apiStatus === 'offline' ? 'API Offline' :
                   'Verificando API...'}
                </span>
                {apiStatus !== 'checking' && (
                  <button
                    onClick={checkApiStatus}
                    className="ml-1 hover:opacity-70 transition-opacity"
                    title="Verificar status da API novamente"
                  >
                    🔄
                  </button>
                )}
              </div>

              {/* Status da SEFAZ */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${
                sefazStatus === 'online'
                  ? 'bg-green-500/15 text-green-400 border-green-500/30'
                  : sefazStatus === 'offline'
                  ? 'bg-red-500/15 text-red-400 border-red-500/30'
                  : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  sefazStatus === 'online'
                    ? 'bg-green-400'
                    : sefazStatus === 'offline'
                    ? 'bg-red-400'
                    : 'bg-yellow-400 animate-pulse'
                }`}></div>
                <span>
                  {sefazStatus === 'online' ? 'Sefaz Online' :
                   sefazStatus === 'offline' ? 'Sefaz Offline' :
                   'Verificando Sefaz...'}
                </span>
                {sefazStatus !== 'checking' && (
                  <button
                    onClick={checkSefazStatus}
                    className="ml-1 hover:opacity-70 transition-opacity"
                    title="Verificar status da SEFAZ novamente"
                  >
                    🔄
                  </button>
                )}
              </div>
            </div>
          </div>

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
            className={`px-3 py-2 rounded text-sm font-medium border ${
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

      {/* Área principal com sidebar e conteúdo */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar com abas */}
        <div className="w-56 bg-background-card border-r border-gray-800 flex flex-col h-full">
          <nav className="flex-1 overflow-y-auto">
            <div className="space-y-0">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-gray-800/50 ${
                    activeSection === section.id
                      ? 'bg-primary-500/10 text-primary-400 border-l-2 border-l-primary-500'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  {/* Número com borda redonda para seções principais ou ícone para seções opcionais */}
                  {section.number ? (
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                      activeSection === section.id
                        ? 'border-primary-400 text-primary-400 bg-primary-500/10'
                        : 'border-gray-500 text-gray-400'
                    }`}>
                      {section.number}
                    </div>
                  ) : (
                    <section.icon size={18} className={
                      activeSection === section.id ? 'text-primary-400' : 'text-gray-400'
                    } />
                  )}
                  <span className="font-medium text-sm">{section.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Botões de ação - Ocultos em modo visualização */}
          {!isViewMode && (
            <div className="p-2 border-t border-gray-800 space-y-2 flex-shrink-0">
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
                {/* Botão ESPELHO - Só aparece se a NFe estiver salva (rascunho ou emitida) */}
                {(isEditingRascunho || rascunhoId || nfeEmitida) && (
                  <Button
                    variant="secondary"
                    className={`${nfeEmitida ? 'flex-1' : 'w-full'} flex items-center justify-center gap-1 text-xs py-1.5`}
                    onClick={handleGerarEspelho}
                  >
                    <Download size={12} />
                    Espelho
                  </Button>
                )}
                {nfeEmitida && (
                  <Button variant="secondary" className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5">
                    <Copy size={12} />
                    Duplicar
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Indicador de modo visualização */}
          {isViewMode && (
            <div className="p-3 border-t border-gray-800 bg-blue-500/10 border-blue-500/20">
              <div className="flex items-center justify-center gap-2 text-blue-400">
                <Eye size={16} />
                <span className="text-sm font-medium">Modo Visualização - Somente Leitura</span>
              </div>
            </div>
          )}
        </div>

        {/* Conteúdo principal */}
        <div className="flex-1 overflow-auto">
          {renderContent()}
        </div>
      </div>

      {/* Modal de Progresso */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-background-card rounded-lg border border-gray-800 w-full max-w-4xl h-[95vh] overflow-hidden flex flex-col">
            {/* Header - Compacto */}
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-white">Emitindo NFe</h3>
                  <div className="text-xs text-gray-400">
                    {progressSteps.filter(s => s.status === 'success').length}/{progressSteps.length} concluídas
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded text-sm font-medium ${
                    ambienteNFe === 'producao'
                      ? 'bg-green-500/15 text-green-400'
                      : 'bg-orange-500/15 text-orange-400'
                  }`}>
                    {ambienteNFe === 'producao' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'}
                  </div>
                  <button
                    onClick={() => {
                      if (emailError || showCloseButton) {
                        // Se há erro de email, usar função específica
                        handleCloseModal();
                      } else {
                        // Comportamento normal
                        setShowProgressModal(false);
                        clearAllLogs();
                      }
                    }}
                    className={`px-3 py-1 text-white rounded transition-colors text-sm ${
                      emailError || showCloseButton
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                    disabled={isLoading && !progressSteps.some(s => s.status === 'error') && !emailError && !showCloseButton}
                  >
                    {emailError || showCloseButton
                      ? 'Fechar'
                      : (isLoading && !progressSteps.some(s => s.status === 'error') ? 'Processando...' : 'Fechar')
                    }
                  </button>
                </div>
              </div>
            </div>

            {/* Progress Steps - Compacto */}
            <div className="p-4 border-b border-gray-800 flex-shrink-0">
              <div className="space-y-2">
                {progressSteps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-3">
                    {/* Step Icon */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
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
                         <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                       ) : index + 1}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <span className={`text-sm font-medium ${
                          step.status === 'success' ? 'text-green-400' :
                          step.status === 'error' ? 'text-red-400' :
                          step.status === 'loading' ? 'text-primary-400' :
                          'text-gray-400'
                        }`}>
                          {step.label}
                        </span>
                        {step.message && (
                          <span className="text-xs text-gray-500">{step.message}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Área de logs removida - oculta por solicitação do usuário */}
            </div>

            {/* Seção de Emails - Só aparece quando há emails */}
            {nfeData.destinatario.emails && nfeData.destinatario.emails.length > 0 && (
              <div className="p-4 border-b border-gray-800 bg-gray-800/30">
                <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                  <Mail size={16} className="text-blue-400" />
                  Emails para Envio
                </h4>
                <div className="space-y-1">
                  {nfeData.destinatario.emails.map((email, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></div>
                      <span className="text-gray-300">{email}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  📧 XML e DANFE serão enviados automaticamente para estes emails após a emissão
                </p>
              </div>
            )}

            {/* ✅ Seção de Erro de Email */}
            {emailError && (
              <div className="p-4 border-b border-gray-800 bg-red-900/20">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-red-400 mb-1">
                      ⚠️ Erro no Envio de Email
                    </h4>
                    <p className="text-sm text-red-300 mb-2">
                      {emailError}
                    </p>
                    <div className="bg-red-800/30 border border-red-700/50 rounded-lg p-3">
                      <p className="text-xs text-red-200">
                        <strong>NFe foi emitida com sucesso!</strong> Apenas o envio de email falhou.
                        Você pode reenviar o email posteriormente através da grid de NFes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Área de logs removida - oculta por solicitação do usuário */}


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

      {/* Modal de CCe */}
      {showCCeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4 border border-gray-700 relative">
            {/* Botão de fechar */}
            <button
              onClick={() => setShowCCeModal(false)}
              className="absolute top-4 right-4 w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition-colors"
              title="Fechar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center">
              {/* Ícone baseado no status */}
              <div className="mb-4">
                {cceStatus === 'loading' && (
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
                )}
                {cceStatus === 'success' && (
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {cceStatus === 'error' && (
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Título */}
              <h3 className="text-lg font-semibold text-white mb-2">
                {cceStatus === 'loading' && 'Enviando CCe'}
                {cceStatus === 'success' && 'CCe Enviada'}
                {cceStatus === 'error' && 'Erro no Envio'}
              </h3>

              {/* Mensagem */}
              <p className="text-gray-300 mb-6">
                {cceMessage}
              </p>

              {/* Botões */}
              <div className="flex gap-3 justify-center">
                {cceStatus !== 'loading' && (
                  <button
                    onClick={() => {
                      setShowCCeModal(false);
                      if (cceStatus === 'success') {
                        // Recarregar dados da NFe para mostrar a nova CCe
                        window.location.reload();
                      }
                    }}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                  >
                    {cceStatus === 'success' ? 'Fechar' : 'Tentar Novamente'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REMOVIDO - AGORA ESTÁ NO TOPO DO COMPONENTE */}



    </div>
  );
};

// Seção de Identificação
const IdentificacaoSection: React.FC<{
  data: any;
  onChange: (data: any) => void;
  naturezasOperacao?: Array<{id: number, descricao: string}>;
  isEditingRascunho?: boolean;
  isViewMode?: boolean;
}> = ({ data, onChange, naturezasOperacao = [], isEditingRascunho = false, isViewMode = false }) => {
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
                onChange={(e) => !isViewMode && updateField('numero', e.target.value)}
                placeholder="Digite o número da NFe"
                disabled={isViewMode}
                className={`w-full px-3 py-2 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500 ${
                  isViewMode ? 'bg-gray-900 cursor-not-allowed' : 'bg-gray-800'
                }`}
              />
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
              onChange={(e) => !isViewMode && updateField('serie', parseInt(e.target.value) || 1)}
              disabled={isViewMode}
              className={`w-full px-3 py-2 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500 ${
                isViewMode ? 'bg-gray-900 cursor-not-allowed' : 'bg-gray-800'
              }`}
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Código
            </label>
            <input
              type="text"
              value={data.codigo_numerico || "Gerando..."}
              readOnly
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
              title="Código Numérico que compõe a Chave de Acesso (8 dígitos) - Gerado automaticamente"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Emitida em
            </label>
            <input
              type="datetime-local"
              value={data.data_emissao}
              onChange={(e) => !isViewMode && updateField('data_emissao', e.target.value)}
              disabled={isViewMode}
              className={`w-full px-3 py-2 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500 ${
                isViewMode ? 'bg-gray-900 cursor-not-allowed' : 'bg-gray-800'
              }`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tipo Documento
            </label>
            <select
              value={data.tipo_documento}
              onChange={(e) => !isViewMode && updateField('tipo_documento', e.target.value)}
              disabled={isViewMode}
              className={`w-full px-3 py-2 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500 ${
                isViewMode ? 'bg-gray-900 cursor-not-allowed' : 'bg-gray-800'
              }`}
            >
              <option value="1">1 - Saída</option>
              <option value="0">0 - Entrada</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Finalidade Emissão
            </label>
            <select
              value={data.finalidade}
              onChange={(e) => !isViewMode && updateField('finalidade', e.target.value)}
              disabled={isViewMode}
              className={`w-full px-3 py-2 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500 ${
                isViewMode ? 'bg-gray-900 cursor-not-allowed' : 'bg-gray-800'
              }`}
            >
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
            <select
              value={data.presenca}
              onChange={(e) => !isViewMode && updateField('presenca', e.target.value)}
              disabled={isViewMode}
              className={`w-full px-3 py-2 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500 ${
                isViewMode ? 'bg-gray-900 cursor-not-allowed' : 'bg-gray-800'
              }`}
            >
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
          <select
            value={data.natureza_operacao}
            onChange={(e) => !isViewMode && updateField('natureza_operacao', e.target.value)}
            disabled={isViewMode}
            className={`w-full px-3 py-2 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500 ${
              isViewMode ? 'bg-gray-900 cursor-not-allowed' : 'bg-gray-800'
            }`}
          >
            <option value="">Selecione a natureza da operação</option>
            {naturezasOperacao.map((natureza) => (
              <option key={natureza.id} value={natureza.descricao}>
                {natureza.descricao}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Informação Adicional
            </label>
            <textarea
              rows={3}
              value={data.informacao_adicional || ''}
              onChange={(e) => !isViewMode && updateField('informacao_adicional', e.target.value)}
              disabled={isViewMode}
              className={`w-full px-3 py-2 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500 resize-none ${
                isViewMode ? 'bg-gray-900 cursor-not-allowed' : 'bg-gray-800'
              }`}
              placeholder="Informações adicionais da NFe... (preenchido automaticamente com observação do cliente)"
            />
            {data.informacao_adicional && (
              <p className="text-xs text-green-400 mt-1">
                ✓ Observação do cliente incluída automaticamente
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Seção de Destinatário
const DestinatarioSection: React.FC<{
  data: any;
  onChange: (data: any) => void;
  onClienteSelected?: (observacaoNfe: string) => void;
}> = ({ data, onChange, onClienteSelected }) => {
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showNovoClienteModal, setShowNovoClienteModal] = useState(false);
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
        .select('*, observacao_nfe')
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
    console.log('🎯 Selecionando cliente:', cliente.nome);

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
      emails: cliente.emails || [],
      // ✅ CORREÇÃO: Adicionar campos fiscais faltantes
      codigo_municipio: cliente.codigo_municipio || '',
      ie_destinatario: cliente.indicador_ie || 9, // 9 = Não Contribuinte (padrão)
      inscricao_estadual: cliente.inscricao_estadual || ''
    });

    // Se o cliente tem observação NFe, chamar callback para incluir no campo de informação adicional
    if (cliente.observacao_nfe && cliente.observacao_nfe.trim() && onClienteSelected) {
      console.log('📝 Incluindo observação NFe:', cliente.observacao_nfe);
      onClienteSelected(cliente.observacao_nfe);
    }

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

        {/* Quarta linha: CEP e Código do Município */}
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
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Código do Município
            </label>
            <input
              type="text"
              value={data.codigo_municipio || ''}
              onChange={(e) => updateField('codigo_municipio', e.target.value)}
              placeholder="3550308"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Identificador da IE
            </label>
            <select
              value={data.ie_destinatario || 9}
              onChange={(e) => updateField('ie_destinatario', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            >
              <option value="9">9 - Não Contribuinte, que pode ou não possuir Inscrição</option>
              <option value="1">1 - Contribuinte ICMS</option>
              <option value="2">2 - Contribuinte isento de Inscrição</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Inscrição Estadual
            </label>
            <input
              type="text"
              value={data.inscricao_estadual || ''}
              onChange={(e) => updateField('inscricao_estadual', e.target.value)}
              placeholder="123123123"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        {/* Sexta linha: Outros campos de identificação */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Identificador de Operação
            </label>
            <select
              value={data.operacao || 1}
              onChange={(e) => updateField('operacao', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            >
              <option value="1">1 - Operação Interna</option>
              <option value="2">2 - Operação Interestadual</option>
              <option value="3">3 - Operação com Exterior</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Consumidor
            </label>
            <select
              value={data.consumidor_final || 1}
              onChange={(e) => updateField('consumidor_final', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            >
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
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowClienteModal(false);
                    setShowNovoClienteModal(true);
                  }}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors text-sm"
                >
                  Cadastrar Cliente
                </button>
                <button
                  onClick={() => setShowClienteModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
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

      {/* Modal de Cadastro de Cliente */}
      {showNovoClienteModal && (
        <ClienteFormCompleto
          isOpen={showNovoClienteModal}
          onClose={() => setShowNovoClienteModal(false)}
          onClienteAdicionado={(novoCliente) => {
            console.log('✅ Cliente cadastrado com sucesso:', novoCliente);
            setShowNovoClienteModal(false);
            // Opcional: Selecionar automaticamente o cliente recém-cadastrado
            if (novoCliente) {
              selecionarCliente(novoCliente);
            }
          }}
        />
      )}
    </div>
  );
};

// Seção de Produtos
const ProdutosSection: React.FC<{
  produtos: any[];
  empresaId?: string;
  finalidade?: string;
  nfeData?: any;
  onChange: (produtos: any[]) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info', duration?: number) => void;
}> = ({ produtos, empresaId, finalidade, nfeData, onChange, showToast }) => {
  const [showProdutoModal, setShowProdutoModal] = useState(false);
  const [showDetalhesFiscaisModal, setShowDetalhesFiscaisModal] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [produtoDetalhesFiscais, setProdutoDetalhesFiscais] = useState(null);

  // ✅ ADICIONADO: Estados para edição de CFOP
  const [showEditarCFOPModal, setShowEditarCFOPModal] = useState(false);
  const [produtoEditandoCFOP, setProdutoEditandoCFOP] = useState<any>(null);
  const [novoCFOP, setNovoCFOP] = useState('');

  // ✅ ADICIONADO: Estados para controlar modos de CFOP no formulário
  const [modoDevolucao, setModoDevolucao] = useState(false);
  const [modoEntrada, setModoEntrada] = useState(false);

  // ✅ ADICIONADO: Estado para busca por código/EAN
  const [codigoProdutoBusca, setCodigoProdutoBusca] = useState('');

  // ✅ CORREÇÃO: CFOPs baseados na finalidade da NFe

  // CFOPs para FINALIDADE 4 (Devolução) - Apenas CFOPs de devolução
  const cfopsFinalidade4 = [
    { codigo: '5202', descricao: '5202 - Devolução de compra para comercialização (dentro do estado)' },
    { codigo: '6202', descricao: '6202 - Devolução de compra para comercialização (fora do estado)' },
    { codigo: '5411', descricao: '5411 - Devolução de compra para industrialização (dentro do estado)' },
    { codigo: '6411', descricao: '6411 - Devolução de compra para industrialização (fora do estado)' },
    { codigo: '5903', descricao: '5903 - Devolução de mercadoria recebida com fim específico de exportação' },
    { codigo: '6903', descricao: '6903 - Devolução de mercadoria recebida com fim específico de exportação' }
  ];

  // CFOPs para FINALIDADE 1 (Normal) - Saída normal (NÃO são CFOPs de devolução)
  const cfopsSaidaNormal = [
    { codigo: '5102', descricao: '5102 - Venda de mercadoria adquirida ou recebida de terceiros (dentro do estado)' },
    { codigo: '6102', descricao: '6102 - Venda de mercadoria adquirida ou recebida de terceiros (fora do estado)' },
    { codigo: '5101', descricao: '5101 - Venda de produção do estabelecimento (dentro do estado)' },
    { codigo: '6101', descricao: '6101 - Venda de produção do estabelecimento (fora do estado)' },
    { codigo: '5403', descricao: '5403 - Venda de mercadoria sujeita ao regime de substituição tributária (dentro do estado)' },
    { codigo: '6403', descricao: '6403 - Venda de mercadoria sujeita ao regime de substituição tributária (fora do estado)' }
  ];

  // CFOPs para FINALIDADE 1 (Normal) - Entrada (série 1000/2000)
  const cfopsEntrada = [
    { codigo: '1202', descricao: '1202 - Devolução de venda de mercadoria de terceiros (dentro do estado)' },
    { codigo: '2202', descricao: '2202 - Devolução de venda de mercadoria de terceiros (fora do estado)' },
    { codigo: '1411', descricao: '1411 - Devolução de venda de produção do estabelecimento (dentro do estado)' },
    { codigo: '2411', descricao: '2411 - Devolução de venda de produção do estabelecimento (fora do estado)' },
    { codigo: '1102', descricao: '1102 - Compra para comercialização (dentro do estado)' },
    { codigo: '2102', descricao: '2102 - Compra para comercialização (fora do estado)' }
  ];

  // ✅ FUNÇÃO: Obter CFOPs baseados na finalidade
  const obterCfopsDisponiveis = (tipo: 'devolucao' | 'entrada') => {
    if (finalidade === '4') {
      // Finalidade 4: Apenas CFOPs específicos de devolução (não permitir entrada)
      return tipo === 'devolucao' ? cfopsFinalidade4 : [];
    } else {
      // Finalidade 1,2,3: CFOPs normais (não específicos de devolução)
      return tipo === 'devolucao' ? cfopsSaidaNormal : cfopsEntrada;
    }
  };

  // ✅ FUNÇÃO: Buscar produto por código ou EAN
  const buscarProdutoPorCodigo = async (codigo: string) => {
    try {
      showToast('Buscando produto...', 'info');

      // Obter dados do usuário
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        showToast('Usuário não autenticado', 'error');
        return;
      }

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        showToast('Empresa não encontrada', 'error');
        return;
      }

      // Buscar produto por código ou código de barras
      const { data: produtoEncontrado, error } = await supabase
        .from('produtos')
        .select(`
          id,
          nome,
          preco,
          codigo,
          codigo_barras,
          descricao,
          grupo_id,
          promocao,
          tipo_desconto,
          valor_desconto,
          desconto_quantidade,
          quantidade_minima,
          tipo_desconto_quantidade,
          valor_desconto_quantidade,
          percentual_desconto_quantidade,
          ncm,
          cfop,
          origem_produto,
          situacao_tributaria,
          cst_icms,
          csosn_icms,
          cst_pis,
          cst_cofins,
          cst_ipi,
          aliquota_icms,
          aliquota_pis,
          aliquota_cofins,
          aliquota_ipi,
          valor_ipi,
          cest,
          margem_st,
          peso_liquido,
          unidade_medida:unidade_medida_id (
            id,
            sigla,
            nome
          )
        `)
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('ativo', true)
        .eq('deletado', false)
        .or(`codigo.eq.${codigo},codigo_barras.eq.${codigo}`)
        .limit(1)
        .single();

      if (error || !produtoEncontrado) {
        showToast(`Produto não encontrado com código/EAN: ${codigo}`, 'error');
        return;
      }

      // Selecionar o produto encontrado
      handleSelecionarProduto(produtoEncontrado);
      setCodigoProdutoBusca('');
      showToast(`Produto "${produtoEncontrado.nome}" adicionado!`, 'success');

    } catch (error: any) {
      console.error('Erro ao buscar produto por código:', error);
      showToast(`Erro ao buscar produto: ${error.message}`, 'error');
    }
  };
  const [produtoForm, setProdutoForm] = useState({
    quantidade: 1,
    valor_unitario: 0,
    valor_total: 0,
    cfop_devolucao: '', // Campo para CFOP de devolução (SAÍDA)
    cfop_entrada: '', // Campo para CFOP de entrada
    cfop_geral: '' // Campo para CFOP geral (editável)
  });

  // ✅ FUNÇÃO PARA RECALCULAR TOTAIS DE ICMS
  const recalcularTotaisICMS = (produtosAtualizados: any[]) => {
    if (nfeData?.identificacao?.finalidade === '4') {
      let totalIcmsBC = 0;
      let totalIcms = 0;

      produtosAtualizados.forEach(produto => {
        if (produto.destaque_icms_devolucao) {
          const baseCalculo = produto.base_calculo_icms || produto.valor_total || 0;
          const aliquota = produto.aliquota_icms || 0;
          const valorIcms = (baseCalculo * aliquota) / 100;

          totalIcmsBC += baseCalculo;
          totalIcms += valorIcms;
        }
      });

      console.log('🧮 Recalculando totais ICMS:', {
        totalIcmsBC,
        totalIcms,
        produtosComDestaque: produtosAtualizados.filter(p => p.destaque_icms_devolucao)
      });
    }
  };

  // Função para selecionar produto do modal
  const handleSelecionarProduto = (produto: any) => {
    setProdutoSelecionado(produto);

    // ✅ CALCULAR PREÇO COM TODOS OS DESCONTOS APLICÁVEIS
    let precoFinal = produto.preco || 0;
    let temDesconto = false;
    let tipoDesconto = '';

    // 1. VERIFICAR DESCONTO DE PROMOÇÃO
    if (produto.promocao && produto.valor_desconto) {
      temDesconto = true;
      tipoDesconto = 'promoção';

      if (produto.tipo_desconto === 'percentual') {
        // Desconto percentual
        const desconto = (precoFinal * produto.valor_desconto) / 100;
        precoFinal = precoFinal - desconto;
      } else if (produto.tipo_desconto === 'valor') {
        // Desconto em valor fixo
        precoFinal = precoFinal - produto.valor_desconto;
      }
    }

    // 2. VERIFICAR DESCONTO POR QUANTIDADE MÍNIMA (quantidade inicial = 1)
    const quantidadeInicial = 1;
    if (produto.desconto_quantidade &&
        produto.quantidade_minima &&
        quantidadeInicial >= produto.quantidade_minima &&
        ((produto.tipo_desconto_quantidade === 'percentual' && produto.percentual_desconto_quantidade) ||
         (produto.tipo_desconto_quantidade === 'valor' && produto.valor_desconto_quantidade))) {

      let precoComDescontoQuantidade = produto.preco || 0;

      if (produto.tipo_desconto_quantidade === 'percentual') {
        precoComDescontoQuantidade = (produto.preco || 0) * (1 - produto.percentual_desconto_quantidade / 100);
      } else {
        precoComDescontoQuantidade = (produto.preco || 0) - produto.valor_desconto_quantidade;
      }

      // Se já tem desconto de promoção, usar o menor preço entre os dois
      if (temDesconto) {
        if (precoComDescontoQuantidade < precoFinal) {
          precoFinal = precoComDescontoQuantidade;
          tipoDesconto = 'quantidade mínima';
        }
      } else {
        precoFinal = precoComDescontoQuantidade;
        temDesconto = true;
        tipoDesconto = 'quantidade mínima';
      }
    }

    console.log('🏷️ Produto selecionado para NFe:', {
      nome: produto.nome,
      precoOriginal: produto.preco,
      precoFinal,
      temDesconto,
      tipoDesconto,
      promocao: produto.promocao,
      descontoQuantidade: produto.desconto_quantidade,
      quantidadeMinima: produto.quantidade_minima
    });

    setProdutoForm({
      quantidade: quantidadeInicial,
      valor_unitario: precoFinal,
      valor_total: precoFinal,
      cfop_devolucao: '',
      cfop_entrada: '',
      cfop_geral: produto.cfop || '' // Preencher com CFOP do produto
    });
    setShowProdutoModal(false);
  };

  // Função para adicionar produto à lista
  const handleAdicionarProduto = () => {
    if (!produtoSelecionado) {
      return;
    }

    const novoProduto = {
      id: Date.now().toString(),
      produto_id: produtoSelecionado.id, // ✅ ID do produto
      codigo: produtoSelecionado.codigo,
      descricao: produtoSelecionado.nome,
      quantidade: produtoForm.quantidade,
      valor_unitario: produtoForm.valor_unitario,
      valor_total: produtoForm.valor_total,

      // ✅ TODOS OS DADOS FISCAIS DO CADASTRO DO PRODUTO (SEM FALLBACKS):
      ncm: produtoSelecionado.ncm,
      // ✅ ATUALIZADO: Lógica de CFOP considerando todos os modos
      cfop: finalidade === '4' && produtoForm.cfop_devolucao
        ? produtoForm.cfop_devolucao
        : modoDevolucao && produtoForm.cfop_devolucao
        ? produtoForm.cfop_devolucao
        : modoEntrada && produtoForm.cfop_entrada
        ? produtoForm.cfop_entrada
        : (produtoForm.cfop_geral || produtoSelecionado.cfop),
      unidade: produtoSelecionado.unidade_medida?.sigla,
      ean: produtoSelecionado.codigo_barras, // ✅ EAN vem do codigo_barras
      origem_produto: produtoSelecionado.origem_produto,
      situacao_tributaria: produtoSelecionado.situacao_tributaria,

      // ICMS
      cst_icms: produtoSelecionado.cst_icms,
      csosn_icms: produtoSelecionado.csosn_icms,
      aliquota_icms: produtoSelecionado.aliquota_icms,

      // PIS/COFINS
      cst_pis: produtoSelecionado.cst_pis,
      cst_cofins: produtoSelecionado.cst_cofins,
      aliquota_pis: produtoSelecionado.aliquota_pis,
      aliquota_cofins: produtoSelecionado.aliquota_cofins,

      // IPI
      cst_ipi: produtoSelecionado.cst_ipi,
      aliquota_ipi: produtoSelecionado.aliquota_ipi,

      // OUTROS
      cest: produtoSelecionado.cest,
      margem_st: produtoSelecionado.margem_st, // ✅ CORREÇÃO CRÍTICA: Incluir margem ST
      peso_liquido: produtoSelecionado.peso_liquido
    };

    onChange([...produtos, novoProduto]);

    // Limpar formulário
    setProdutoSelecionado(null);
    setProdutoForm({
      quantidade: 1,
      valor_unitario: 0,
      valor_total: 0,
      cfop_devolucao: '',
      cfop_entrada: '',
      cfop_geral: ''
    });
    // ✅ ADICIONADO: Reset dos modos
    setModoDevolucao(false);
    setModoEntrada(false);
  };

  // Função para remover produto
  const handleRemoverProduto = (id: string) => {
    onChange(produtos.filter(p => p.id !== id));
  };

  // ✅ ADICIONADO: Função para abrir modal de edição de CFOP
  const handleEditarCFOP = (produto: any) => {
    setProdutoEditandoCFOP(produto);
    setNovoCFOP(produto.cfop || '');
    setShowEditarCFOPModal(true);
  };

  // ✅ ADICIONADO: Função para salvar novo CFOP
  const handleSalvarCFOP = () => {
    if (!novoCFOP.trim()) {
      showToast('CFOP é obrigatório', 'error');
      return;
    }

    if (novoCFOP.length !== 4 || !/^\d{4}$/.test(novoCFOP)) {
      showToast('CFOP deve ter exatamente 4 dígitos', 'error');
      return;
    }

    // Atualizar o produto na lista
    const produtosAtualizados = produtos.map(p =>
      p.id === produtoEditandoCFOP.id
        ? { ...p, cfop: novoCFOP }
        : p
    );

    onChange(produtosAtualizados);
    setShowEditarCFOPModal(false);
    setProdutoEditandoCFOP(null);
    setNovoCFOP('');

    showToast(`CFOP do produto "${produtoEditandoCFOP.descricao}" atualizado para ${novoCFOP}`, 'success');
  };

  // Função para abrir modal de detalhes fiscais
  const handleAbrirDetalhesFiscais = async (produto: any) => {
    try {
      // Buscar foto principal do produto
      const { data: userData } = await supabase.auth.getUser();
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (usuarioData?.empresa_id) {
        const { data: fotosData } = await supabase
          .from('produto_fotos')
          .select('id, produto_id, url, principal')
          .eq('empresa_id', usuarioData.empresa_id)
          .eq('produto_id', produto.produto_id);

        // Encontrar foto principal ou primeira foto
        let fotoUrl = null;
        if (fotosData && fotosData.length > 0) {
          const fotoPrincipal = fotosData.find(foto => foto.principal);
          fotoUrl = fotoPrincipal ? fotoPrincipal.url : fotosData[0].url;
        }

        // Adicionar foto ao produto
        const produtoComFoto = {
          ...produto,
          foto_url: fotoUrl
        };

        setProdutoDetalhesFiscais(produtoComFoto);
      } else {
        setProdutoDetalhesFiscais(produto);
      }
    } catch (error) {
      console.error('Erro ao buscar foto do produto:', error);
      setProdutoDetalhesFiscais(produto);
    }

    setShowDetalhesFiscaisModal(true);
  };

  // Função para atualizar dados fiscais dos produtos com informações do cadastro
  const handleAtualizarDadosProdutos = async () => {
    if (produtos.length === 0) {
      showToast('Nenhum produto para atualizar', 'warning');
      return;
    }

    try {
      showToast('Atualizando dados dos produtos...', 'info');

      // Obter dados do usuário
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

      // Buscar dados atualizados dos produtos no cadastro
      const produtoIds = produtos
        .filter(p => p.produto_id) // Apenas produtos que têm ID (vieram do cadastro)
        .map(p => p.produto_id);

      if (produtoIds.length === 0) {
        showToast('Nenhum produto vinculado ao cadastro para atualizar', 'warning');
        return;
      }

      const { data: produtosCadastro, error } = await supabase
        .from('produtos')
        .select(`
          id,
          codigo,
          codigo_barras,
          nome,
          preco,
          ncm,
          cfop,
          origem_produto,
          situacao_tributaria,
          cst_icms,
          csosn_icms,
          cst_pis,
          cst_cofins,
          cst_ipi,
          aliquota_icms,
          aliquota_pis,
          aliquota_cofins,
          aliquota_ipi,
          cest,
          margem_st,
          peso_liquido,
          unidade_medida:unidade_medida_id (
            id,
            sigla,
            nome
          )
        `)
        .in('id', produtoIds)
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('ativo', true)
        .eq('deletado', false);

      if (error) throw error;

      if (!produtosCadastro || produtosCadastro.length === 0) {
        showToast('Nenhum produto encontrado no cadastro', 'warning');
        return;
      }

      // Atualizar produtos na NFe com dados do cadastro
      const produtosAtualizados = produtos.map(produtoNfe => {
        const produtoCadastro = produtosCadastro.find(p => p.id === produtoNfe.produto_id);

        if (produtoCadastro) {
          return {
            ...produtoNfe,
            // ✅ ATUALIZAR TODOS OS DADOS FISCAIS DO CADASTRO:
            ncm: produtoCadastro.ncm || produtoNfe.ncm,
            cfop: produtoCadastro.cfop || produtoNfe.cfop,
            ean: produtoCadastro.codigo_barras || produtoNfe.ean,
            unidade: produtoCadastro.unidade_medida?.sigla || produtoNfe.unidade,
            origem_produto: produtoCadastro.origem_produto ?? produtoNfe.origem_produto,
            situacao_tributaria: produtoCadastro.situacao_tributaria || produtoNfe.situacao_tributaria,

            // ICMS
            cst_icms: produtoCadastro.cst_icms || produtoNfe.cst_icms,
            csosn_icms: produtoCadastro.csosn_icms || produtoNfe.csosn_icms,
            aliquota_icms: produtoCadastro.aliquota_icms ?? produtoNfe.aliquota_icms,

            // PIS/COFINS
            cst_pis: produtoCadastro.cst_pis || produtoNfe.cst_pis,
            cst_cofins: produtoCadastro.cst_cofins || produtoNfe.cst_cofins,
            aliquota_pis: produtoCadastro.aliquota_pis ?? produtoNfe.aliquota_pis,
            aliquota_cofins: produtoCadastro.aliquota_cofins ?? produtoNfe.aliquota_cofins,

            // IPI
            cst_ipi: produtoCadastro.cst_ipi || produtoNfe.cst_ipi,
            aliquota_ipi: produtoCadastro.aliquota_ipi ?? produtoNfe.aliquota_ipi,

            // OUTROS
            cest: produtoCadastro.cest || produtoNfe.cest,
            peso_liquido: produtoCadastro.peso_liquido ?? produtoNfe.peso_liquido,

            // Atualizar também preço se necessário
            valor_unitario: produtoCadastro.preco || produtoNfe.valor_unitario,
            valor_total: (produtoCadastro.preco || produtoNfe.valor_unitario) * produtoNfe.quantidade
          };
        }

        return produtoNfe; // Manter produto inalterado se não encontrado no cadastro
      });

      // Aplicar atualizações
      onChange(produtosAtualizados);

      const produtosAtualizadosCount = produtosCadastro.length;
      showToast(`${produtosAtualizadosCount} produto(s) atualizado(s) com dados do cadastro`, 'success');

      console.log('✅ Produtos atualizados:', {
        total: produtos.length,
        atualizados: produtosAtualizadosCount,
        produtosCadastro
      });

    } catch (error: any) {
      console.error('Erro ao atualizar dados dos produtos:', error);
      showToast(`Erro ao atualizar produtos: ${error.message}`, 'error');
    }
  };

  // Função para atualizar campos e calcular total
  const updateProdutoForm = (field: string, value: number | string) => {
    setProdutoForm(prev => {
      const newForm = { ...prev, [field]: value };

      // ✅ RECALCULAR PREÇO QUANDO QUANTIDADE MUDAR (para aplicar desconto por quantidade)
      if (field === 'quantidade' && produtoSelecionado) {
        const novaQuantidade = typeof value === 'number' ? value : parseFloat(value as string) || 0;

        // Recalcular preço com base na nova quantidade
        let precoFinal = produtoSelecionado.preco || 0;
        let temDesconto = false;
        let tipoDesconto = '';

        // 1. VERIFICAR DESCONTO DE PROMOÇÃO
        if (produtoSelecionado.promocao && produtoSelecionado.valor_desconto) {
          temDesconto = true;
          tipoDesconto = 'promoção';

          if (produtoSelecionado.tipo_desconto === 'percentual') {
            const desconto = (precoFinal * produtoSelecionado.valor_desconto) / 100;
            precoFinal = precoFinal - desconto;
          } else if (produtoSelecionado.tipo_desconto === 'valor') {
            precoFinal = precoFinal - produtoSelecionado.valor_desconto;
          }
        }

        // 2. VERIFICAR DESCONTO POR QUANTIDADE MÍNIMA
        if (produtoSelecionado.desconto_quantidade &&
            produtoSelecionado.quantidade_minima &&
            novaQuantidade >= produtoSelecionado.quantidade_minima &&
            ((produtoSelecionado.tipo_desconto_quantidade === 'percentual' && produtoSelecionado.percentual_desconto_quantidade) ||
             (produtoSelecionado.tipo_desconto_quantidade === 'valor' && produtoSelecionado.valor_desconto_quantidade))) {

          let precoComDescontoQuantidade = produtoSelecionado.preco || 0;

          if (produtoSelecionado.tipo_desconto_quantidade === 'percentual') {
            precoComDescontoQuantidade = (produtoSelecionado.preco || 0) * (1 - produtoSelecionado.percentual_desconto_quantidade / 100);
          } else {
            precoComDescontoQuantidade = (produtoSelecionado.preco || 0) - produtoSelecionado.valor_desconto_quantidade;
          }

          // Se já tem desconto de promoção, usar o menor preço entre os dois
          if (temDesconto) {
            if (precoComDescontoQuantidade < precoFinal) {
              precoFinal = precoComDescontoQuantidade;
              tipoDesconto = 'quantidade mínima';
            }
          } else {
            precoFinal = precoComDescontoQuantidade;
            temDesconto = true;
            tipoDesconto = 'quantidade mínima';
          }
        }

        console.log('🔄 Recalculando preço por quantidade:', {
          produto: produtoSelecionado.nome,
          quantidade: novaQuantidade,
          precoOriginal: produtoSelecionado.preco,
          precoFinal,
          temDesconto,
          tipoDesconto
        });

        newForm.valor_unitario = precoFinal;
        newForm.valor_total = novaQuantidade * precoFinal;
      } else if (field === 'valor_unitario') {
        // Recalcular total quando valor unitário mudar
        newForm.valor_total = newForm.quantidade * newForm.valor_unitario;
      } else if (field === 'quantidade' || field === 'valor_unitario') {
        // Fallback para outros casos
        newForm.valor_total = newForm.quantidade * newForm.valor_unitario;
      }

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
                value={produtoSelecionado ? produtoSelecionado.nome : codigoProdutoBusca}
                onChange={(e) => {
                  if (!produtoSelecionado) {
                    setCodigoProdutoBusca(e.target.value);
                  }
                }}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && codigoProdutoBusca.trim()) {
                    e.preventDefault();
                    await buscarProdutoPorCodigo(codigoProdutoBusca.trim());
                  }
                }}
                placeholder={produtoSelecionado ? produtoSelecionado.nome : "Digite código/EAN e pressione Enter ou clique na lupa"}
                className="w-full px-3 py-2 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                readOnly={!!produtoSelecionado}
              />
              <button
                type="button"
                onClick={() => {
                  if (produtoSelecionado) {
                    // Limpar produto selecionado
                    setProdutoSelecionado(null);
                    setCodigoProdutoBusca('');
                    setProdutoForm({
                      valor_unitario: 0,
                      quantidade: 1,
                      valor_total: 0,
                      cfop_geral: '',
                      cfop_devolucao: '',
                      cfop_entrada: ''
                    });
                  } else {
                    setShowProdutoModal(true);
                  }
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white transition-colors"
                title={produtoSelecionado ? "Limpar produto" : "Buscar produto"}
              >
                {produtoSelecionado ? <X size={16} /> : <Search size={16} />}
              </button>
            </div>
            {!produtoSelecionado && (
              <p className="text-xs text-gray-400 mt-1">
                💡 Digite o código do produto ou código de barras e pressione Enter
              </p>
            )}
          </div>

          {/* Campos de valores - grid 2 colunas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          {/* ✅ ÁREA DE EXIBIÇÃO DOS DESCONTOS - Similar ao sistema de pedidos */}
          {produtoSelecionado && (
            <div className="mt-4 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium text-sm">{produtoSelecionado.nome}</h4>
                  <div className="flex items-center gap-4 mt-1">
                    {/* Preço Original */}
                    <div className="text-sm">
                      <span className="text-gray-400">Preço original: </span>
                      <span className={`${
                        (produtoSelecionado.promocao && produtoSelecionado.valor_desconto) ||
                        (produtoSelecionado.desconto_quantidade &&
                         produtoSelecionado.quantidade_minima &&
                         produtoForm.quantidade >= produtoSelecionado.quantidade_minima)
                          ? 'line-through text-gray-500'
                          : 'text-white'
                      }`}>
                        R$ {(produtoSelecionado.preco || 0).toFixed(2)}
                      </span>
                    </div>

                    {/* Preço Final */}
                    {((produtoSelecionado.promocao && produtoSelecionado.valor_desconto) ||
                      (produtoSelecionado.desconto_quantidade &&
                       produtoSelecionado.quantidade_minima &&
                       produtoForm.quantidade >= produtoSelecionado.quantidade_minima)) && (
                      <div className="text-sm">
                        <span className="text-gray-400">→ </span>
                        <span className="text-green-400 font-medium">
                          R$ {produtoForm.valor_unitario.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Detalhes dos Descontos */}
                  <div className="mt-2 space-y-1">
                    {/* Desconto de Promoção */}
                    {produtoSelecionado.promocao && produtoSelecionado.valor_desconto && (
                      <div className="text-xs text-orange-400">
                        🏷️ Promoção:
                        {produtoSelecionado.tipo_desconto === 'percentual'
                          ? ` -${produtoSelecionado.valor_desconto}%`
                          : ` -R$ ${produtoSelecionado.valor_desconto.toFixed(2)}`
                        }
                      </div>
                    )}

                    {/* Desconto por Quantidade */}
                    {produtoSelecionado.desconto_quantidade &&
                     produtoSelecionado.quantidade_minima && (
                      <div className={`text-xs ${
                        produtoForm.quantidade >= produtoSelecionado.quantidade_minima
                          ? 'text-green-400'
                          : 'text-gray-500'
                      }`}>
                        📦 Desconto por quantidade: {produtoSelecionado.quantidade_minima}+ unid
                        {produtoSelecionado.tipo_desconto_quantidade === 'percentual'
                          ? ` -${produtoSelecionado.percentual_desconto_quantidade}%`
                          : ` -R$ ${(produtoSelecionado.valor_desconto_quantidade || 0).toFixed(2)}`
                        }
                        {produtoForm.quantidade >= produtoSelecionado.quantidade_minima && (
                          <span className="ml-2 font-medium">✅ APLICADO</span>
                        )}
                        {produtoForm.quantidade < produtoSelecionado.quantidade_minima && (
                          <span className="ml-2">
                            (faltam {(produtoSelecionado.quantidade_minima - produtoForm.quantidade).toFixed(0)} unid)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Economia Total */}
                    {((produtoSelecionado.promocao && produtoSelecionado.valor_desconto) ||
                      (produtoSelecionado.desconto_quantidade &&
                       produtoSelecionado.quantidade_minima &&
                       produtoForm.quantidade >= produtoSelecionado.quantidade_minima)) && (
                      <div className="text-xs text-green-300 font-medium">
                        💰 Economia: R$ {((produtoSelecionado.preco || 0) - produtoForm.valor_unitario).toFixed(2)} por unidade
                      </div>
                    )}
                  </div>
                </div>

                {/* Total da Linha */}
                <div className="text-right">
                  <div className="text-lg font-bold text-white">
                    R$ {produtoForm.valor_total.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {produtoForm.quantidade.toFixed(3)} × R$ {produtoForm.valor_unitario.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CFOP */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">
                CFOP *
              </label>
              {/* Checkboxes de devolução e entrada */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modoDevolucao}
                    onChange={(e) => {
                      setModoDevolucao(e.target.checked);
                      if (e.target.checked) {
                        setModoEntrada(false);
                        updateProdutoForm('cfop_devolucao', '');
                        updateProdutoForm('cfop_entrada', '');
                        updateProdutoForm('cfop', '');
                      } else {
                        updateProdutoForm('cfop_devolucao', '');
                      }
                    }}
                    className="w-4 h-4 text-orange-600 bg-gray-800 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                  />
                  <span className="text-orange-300">Devolução</span>
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modoEntrada}
                    onChange={(e) => {
                      setModoEntrada(e.target.checked);
                      if (e.target.checked) {
                        setModoDevolucao(false);
                        updateProdutoForm('cfop_entrada', '');
                        updateProdutoForm('cfop_devolucao', '');
                        updateProdutoForm('cfop', '');
                      } else {
                        updateProdutoForm('cfop_entrada', '');
                      }
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-blue-300">Entrada</span>
                </label>
              </div>
            </div>

            {/* Campo CFOP condicional */}
            {modoDevolucao ? (
              // Dropdown de CFOPs de devolução
              <div>
                <select
                  value={produtoForm.cfop_devolucao || ''}
                  onChange={(e) => updateProdutoForm('cfop_devolucao', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-orange-500 rounded-lg text-white focus:outline-none focus:border-orange-400"
                >
                  <option value="">Selecione o CFOP de devolução</option>
                  {obterCfopsDisponiveis('devolucao').map((cfop) => (
                    <option key={cfop.codigo} value={cfop.codigo}>
                      {cfop.descricao}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-orange-300 mt-1">
                  📤 CFOPs específicos de devolução (série 5000/6000)
                </p>
              </div>
            ) : modoEntrada ? (
              // Dropdown de CFOPs de entrada
              <div>
                <select
                  value={produtoForm.cfop_entrada || ''}
                  onChange={(e) => updateProdutoForm('cfop_entrada', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-blue-500 rounded-lg text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="">Selecione o CFOP de entrada</option>
                  {obterCfopsDisponiveis('entrada').map((cfop) => (
                    <option key={cfop.codigo} value={cfop.codigo}>
                      {cfop.descricao}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-blue-300 mt-1">
                  📥 CFOPs de entrada (série 1000/2000)
                </p>
              </div>
            ) : (
              // Campo de texto normal
              <div>
                <input
                  type="text"
                  value={produtoForm.cfop_geral || ''}
                  onChange={(e) => updateProdutoForm('cfop_geral', e.target.value)}
                  placeholder="Ex: 5102"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  💡 Vem do cadastro do produto, mas pode ser editado
                </p>
              </div>
            )}
          </div>



          {/* Botão Adicionar */}
          <div className="mt-6">
            <button
                type="button"
                onClick={handleAdicionarProduto}
                disabled={!produtoSelecionado}
                className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 flex items-center justify-center gap-2 transition-colors ${
                  produtoSelecionado
                    ? 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
                title={!produtoSelecionado ? 'Selecione um produto para adicionar' : 'Adicionar produto à NFe'}
              >
              <Plus size={16} />
              ADICIONAR
            </button>
          </div>
        </div>
      </div>

      {/* Lista de produtos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Lista de Produtos</h3>
          {produtos.length > 0 && (
            <button
              onClick={handleAtualizarDadosProdutos}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              title="Atualizar dados fiscais dos produtos com informações do cadastro"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M3 21v-5h5"/>
              </svg>
              Atualizar dados dos produtos
            </button>
          )}
        </div>
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
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase">Cód. Barras</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase">Descrição</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase">Valor Unit</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase">Unidade</th>
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
                      <td className="px-3 py-2 text-sm text-white">
                        <span className="text-xs text-gray-400">
                          {produto.ean || 'SEM EAN'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-white">{produto.descricao}</td>
                      <td className="px-3 py-2 text-sm text-white">R$ {produto.valor_unitario.toFixed(2)}</td>
                      <td className="px-3 py-2 text-sm text-white">
                        <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                          {produto.unidade || 'UN'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-white">{produto.quantidade}</td>
                      <td className="px-3 py-2 text-sm text-white">R$ {produto.valor_total.toFixed(2)}</td>
                      <td className="px-3 py-2 text-sm text-white">{produto.ncm}</td>
                      <td className="px-3 py-2 text-sm text-white">
                        <div className="flex items-center gap-2">
                          <span>{produto.cfop}</span>
                          <button
                            onClick={() => handleEditarCFOP(produto)}
                            className="text-yellow-400 hover:text-yellow-300 p-1"
                            title="Editar CFOP"
                          >
                            <Edit size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm text-white">{produto.csosn_icms}</td>
                      <td className="px-3 py-2 text-sm text-white text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleAbrirDetalhesFiscais(produto)}
                            className="text-blue-400 hover:text-blue-300 p-1"
                            title="Ver detalhes fiscais"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={() => handleRemoverProduto(produto.id)}
                            className="text-red-400 hover:text-red-300 p-1"
                            title="Remover produto"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
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

      {/* Modal de Detalhes Fiscais */}
      {showDetalhesFiscaisModal && produtoDetalhesFiscais && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background-card rounded-lg border border-gray-800 p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                Detalhes Fiscais - {(produtoDetalhesFiscais as any).descricao}
              </h3>
              <button
                onClick={() => setShowDetalhesFiscaisModal(false)}
                className="text-gray-400 hover:text-white p-1"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Informações do Produto com Foto */}
            <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
              <div className="flex gap-4">
                {/* Foto do Produto */}
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                    {(produtoDetalhesFiscais as any).foto_url ? (
                      <img
                        src={(produtoDetalhesFiscais as any).foto_url}
                        alt={(produtoDetalhesFiscais as any).descricao}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon size={32} className="text-gray-600" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Informações Básicas */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Código:</span>
                    <span className="text-white ml-2">{(produtoDetalhesFiscais as any).codigo}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">EAN:</span>
                    <span className="text-white ml-2">{(produtoDetalhesFiscais as any).ean || 'SEM EAN'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">NCM:</span>
                    <span className="text-white ml-2">{(produtoDetalhesFiscais as any).ncm}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">CFOP:</span>
                    <span className="text-white ml-2">{(produtoDetalhesFiscais as any).cfop}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">CEST:</span>
                    <span className="text-white ml-2">
                      {(produtoDetalhesFiscais as any).cest || (
                        <span className="text-yellow-400">Não informado</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Peso Líquido:</span>
                    <span className="text-white ml-2">
                      {(produtoDetalhesFiscais as any).peso_liquido ?
                        `${(produtoDetalhesFiscais as any).peso_liquido} kg` :
                        'Não informado'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detalhes Fiscais */}
            <div className="space-y-6">
              {/* Toggle Destaque ICMS para Devoluções */}
              {(nfeData as any).identificacao?.finalidade === '4' && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-lg font-semibold text-yellow-300">Destaque de ICMS em Devolução</h4>
                      <p className="text-sm text-yellow-200/80">
                        Configure se esta devolução deve destacar ICMS
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(produtoDetalhesFiscais as any).destaque_icms_devolucao || false}
                        onChange={(e) => {
                          const novosProdutos = produtos.map((p: any) =>
                            p.id === (produtoDetalhesFiscais as any).id
                              ? { ...p, destaque_icms_devolucao: e.target.checked }
                              : p
                          );
                          onChange(novosProdutos);
                          setProdutoDetalhesFiscais((prev: any) => ({
                            ...prev,
                            destaque_icms_devolucao: e.target.checked
                          }));

                          // ✅ RECALCULAR TOTAIS DE ICMS AUTOMATICAMENTE
                          recalcularTotaisICMS(novosProdutos);
                        }}
                        className="sr-only peer"
                      />
                      <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${
                        (produtoDetalhesFiscais as any).destaque_icms_devolucao
                          ? 'bg-yellow-600'
                          : 'bg-gray-700'
                      }`}>
                        <div className={`absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform duration-200 ease-in-out ${
                          (produtoDetalhesFiscais as any).destaque_icms_devolucao
                            ? 'translate-x-5'
                            : 'translate-x-0'
                        }`}></div>
                      </div>
                    </label>
                  </div>
                  <div className="text-xs text-yellow-200/70">
                    <p>• <strong>Habilitado:</strong> Permite editar alíquota e base de cálculo do ICMS</p>
                    <p>• <strong>Desabilitado:</strong> Devolução sem destaque de ICMS (CST 40/41)</p>
                  </div>
                </div>
              )}

              {/* ICMS */}
              <div className="bg-gray-800/30 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-4">ICMS</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Alíquota de ICMS (%)
                    </label>
                    {(nfeData as any).identificacao?.finalidade === '4' && (produtoDetalhesFiscais as any).destaque_icms_devolucao ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={(produtoDetalhesFiscais as any).aliquota_icms || 0}
                        onChange={(e) => {
                          const novosProdutos = produtos.map((p: any) =>
                            p.id === (produtoDetalhesFiscais as any).id
                              ? { ...p, aliquota_icms: parseFloat(e.target.value) || 0 }
                              : p
                          );
                          onChange(novosProdutos);
                          setProdutoDetalhesFiscais((prev: any) => ({
                            ...prev,
                            aliquota_icms: parseFloat(e.target.value) || 0
                          }));

                          // ✅ RECALCULAR TOTAIS DE ICMS AUTOMATICAMENTE
                          recalcularTotaisICMS(novosProdutos);
                        }}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                        placeholder="18.00"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                        {(produtoDetalhesFiscais as any).aliquota_icms || '0,00'}%
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Base de Cálculo de ICMS
                    </label>
                    {(nfeData as any).identificacao?.finalidade === '4' && (produtoDetalhesFiscais as any).destaque_icms_devolucao ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={(produtoDetalhesFiscais as any).base_calculo_icms || 0}
                        onChange={(e) => {
                          const novosProdutos = produtos.map((p: any) =>
                            p.id === (produtoDetalhesFiscais as any).id
                              ? { ...p, base_calculo_icms: parseFloat(e.target.value) || 0 }
                              : p
                          );
                          onChange(novosProdutos);
                          setProdutoDetalhesFiscais((prev: any) => ({
                            ...prev,
                            base_calculo_icms: parseFloat(e.target.value) || 0
                          }));

                          // ✅ RECALCULAR TOTAIS DE ICMS AUTOMATICAMENTE
                          recalcularTotaisICMS(novosProdutos);
                        }}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                        placeholder="0.00"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                        R$ {((produtoDetalhesFiscais as any).base_calculo_icms || 0).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* PIS */}
              <div className="bg-gray-800/30 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-4">PIS</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      PIS CST
                    </label>
                    <div className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                      {(produtoDetalhesFiscais as any).cst_pis || 'Não informado'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      PIS Alíquota (%)
                    </label>
                    <div className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                      {(produtoDetalhesFiscais as any).aliquota_pis || '0,00'}%
                    </div>
                  </div>
                </div>
              </div>

              {/* COFINS */}
              <div className="bg-gray-800/30 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-4">COFINS</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      COFINS CST
                    </label>
                    <div className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                      {(produtoDetalhesFiscais as any).cst_cofins || 'Não informado'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      COFINS Alíquota (%)
                    </label>
                    <div className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                      {(produtoDetalhesFiscais as any).aliquota_cofins || '0,00'}%
                    </div>
                  </div>
                </div>
              </div>

              {/* ✅ SUBSTITUIÇÃO TRIBUTÁRIA (ST) */}
              {(() => {
                const cstICMS = (produtoDetalhesFiscais as any).cst_icms;
                const csosnICMS = (produtoDetalhesFiscais as any).csosn_icms;
                const temST = ['10', '30', '60', '70', '90'].includes(cstICMS) ||
                             ['201', '202', '203', '500', '900'].includes(csosnICMS);

                return temST ? (
                  <div className="bg-orange-900/20 border border-orange-700/50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-orange-300 mb-4 flex items-center gap-2">
                      ⚠️ Substituição Tributária (ST)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Margem ST (%) <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={(produtoDetalhesFiscais as any).margem_st || ''}
                          onChange={(e) => {
                            const valor = parseFloat(e.target.value) || null;
                            const novosProdutos = produtos.map((p: any) =>
                              p.id === (produtoDetalhesFiscais as any).id
                                ? { ...p, margem_st: valor }
                                : p
                            );
                            onChange(novosProdutos);
                            setProdutoDetalhesFiscais((prev: any) => ({
                              ...prev,
                              margem_st: valor
                            }));
                          }}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                          placeholder="Ex: 30.0"
                        />
                        <p className="text-xs text-orange-300 mt-1">
                          Margem de Valor Agregado para ST
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Alíquota ICMS (%) <span className="text-red-400">*</span>
                        </label>
                        <div className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                          {(produtoDetalhesFiscais as any).aliquota_icms || '0,00'}%
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Alíquota ICMS (usada também para ST)
                        </p>
                      </div>
                    </div>

                    {/* Informações sobre ST */}
                    <div className="mt-4 p-3 bg-orange-900/10 border border-orange-700/30 rounded-lg">
                      <div className="text-xs text-orange-200">
                        <p className="mb-1"><strong>Tipo ST:</strong> {cstICMS ? `CST ${cstICMS}` : `CSOSN ${csosnICMS}`}</p>
                        <p className="mb-1"><strong>CEST:</strong> {(produtoDetalhesFiscais as any).cest || 'Não informado'}</p>
                        <p><strong>💡 Dica:</strong> Configure a margem ST conforme legislação do seu estado. Consulte seu contador para os valores corretos.</p>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Rodapé */}
            <div className="mt-6 pt-4 border-t border-gray-700">
              <button
                onClick={() => setShowDetalhesFiscaisModal(false)}
                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ ADICIONADO: Modal de Edição de CFOP */}
      {showEditarCFOPModal && produtoEditandoCFOP && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background-card rounded-lg border border-gray-800 p-6 max-w-md w-full mx-4">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                Editar CFOP
              </h3>
              <button
                onClick={() => setShowEditarCFOPModal(false)}
                className="text-gray-400 hover:text-white p-1"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Informações do Produto */}
            <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
              <div className="text-sm">
                <div className="mb-2">
                  <span className="text-gray-400">Produto:</span>
                  <span className="text-white ml-2 font-medium">{produtoEditandoCFOP.descricao}</span>
                </div>
                <div className="mb-2">
                  <span className="text-gray-400">Código:</span>
                  <span className="text-white ml-2">{produtoEditandoCFOP.codigo}</span>
                </div>
                <div>
                  <span className="text-gray-400">CFOP Atual:</span>
                  <span className="text-white ml-2 font-mono bg-gray-700 px-2 py-1 rounded">
                    {produtoEditandoCFOP.cfop}
                  </span>
                </div>
              </div>
            </div>

            {/* Campo de Edição */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Novo CFOP *
              </label>
              <input
                type="text"
                value={novoCFOP}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setNovoCFOP(value);
                }}
                placeholder="Ex: 5102"
                maxLength={4}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 font-mono text-center text-lg"
              />
              <p className="text-xs text-gray-400 mt-1">
                💡 Digite apenas os 4 dígitos do CFOP
              </p>
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowEditarCFOPModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarCFOP}
                disabled={!novoCFOP.trim() || novoCFOP.length !== 4}
                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Salvar CFOP
              </button>
            </div>
          </div>
        </div>
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

const PagamentosSection: React.FC<{ data: any[]; onChange: (data: any[]) => void; totalNota: number; finalidade?: string }> = ({ data: pagamentos, onChange, totalNota, finalidade = '1' }) => {

  // 🔍 DEBUG COMPLETO - Vamos ver todos os valores
  console.log('🔍 PAGAMENTOS SECTION - Props recebidas:', {
    totalNota,
    finalidade,
    pagamentos,
    'typeof totalNota': typeof totalNota,
    'totalNota > 0': totalNota > 0
  });

  // ✅ CORREÇÃO: Estado inicial sempre com valor correto
  const [pagamentoForm, setPagamentoForm] = useState(() => {
    const valorInicial = finalidade === '4' ? 0 : (totalNota || 0);
    console.log('🔍 ESTADO INICIAL - Criando com valor:', valorInicial);
    return {
      tipo: finalidade === '4' ? '90' : '01',
      valor: valorInicial
    };
  });

  // 🔍 DEBUG - Monitorar mudanças no estado
  useEffect(() => {
    console.log('🔍 ESTADO ATUAL - pagamentoForm:', pagamentoForm);
  }, [pagamentoForm]);

  // ✅ CORREÇÃO: Atualizar valor automaticamente quando totalNota ou finalidade mudar
  useEffect(() => {
    console.log('🔍 USE EFFECT - Executando com:', { totalNota, finalidade, 'totalNota type': typeof totalNota, 'pagamentos.length': pagamentos.length });

    if (finalidade === '4') {
      console.log('🔍 FINALIDADE 4 - Definindo valor 0');
      // Para devolução: tipo 90 e valor 0
      setPagamentoForm(prev => {
        console.log('🔍 FINALIDADE 4 - Estado anterior:', prev);
        const novoEstado = {
          ...prev,
          tipo: '90',
          valor: 0
        };
        console.log('🔍 FINALIDADE 4 - Novo estado:', novoEstado);
        return novoEstado;
      });

      // ✅ CORREÇÃO: SEMPRE adicionar automaticamente pagamento tipo 90 para finalidade 4
      console.log('🔍 FINALIDADE 4 - Adicionando pagamento automático tipo 90');
      console.log('🔍 FINALIDADE 4 - Pagamentos antes:', pagamentos);

      const pagamentoAutomatico = [{
        id: 'auto-90',
        tipo: '90',
        tipo_descricao: 'Sem pagamento',
        valor: 0
      }];

      console.log('🔍 FINALIDADE 4 - Pagamento a ser adicionado:', pagamentoAutomatico);
      onChange(pagamentoAutomatico);

      // Verificar se foi adicionado
      setTimeout(() => {
        console.log('🔍 FINALIDADE 4 - Pagamentos depois (verificação):', pagamentos);
      }, 100);
    } else {
      console.log('🔍 FINALIDADE NORMAL - Definindo valor:', totalNota);
      // Para outras finalidades: preencher automaticamente com total da nota
      setPagamentoForm(prev => {
        console.log('🔍 FINALIDADE NORMAL - Estado anterior:', prev);
        const novoEstado = {
          ...prev,
          valor: totalNota || 0
        };
        console.log('🔍 FINALIDADE NORMAL - Novo estado:', novoEstado);
        return novoEstado;
      });

      // Se há apenas um pagamento, ajustar automaticamente
      if (pagamentos.length === 1) {
        const pagamentosAtualizados = pagamentos.map(p => ({
          ...p,
          valor: totalNota || 0
        }));
        onChange(pagamentosAtualizados);
      }
    }
  }, [totalNota, finalidade]); // Executar quando total ou finalidade mudar

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

  // ✅ CORREÇÃO: Para finalidade 4 (devolução), mostrar apenas "90 - Sem pagamento"
  const tiposPagamentoFiltrados = finalidade === '4'
    ? { '90': 'Sem pagamento' }
    : tiposPagamento;

  const handleAdicionarPagamento = () => {
    // ✅ CORREÇÃO: Para finalidade 4 (devolução), permitir valor 0
    if (finalidade !== '4' && pagamentoForm.valor <= 0) {
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

    // ✅ CORREÇÃO: Limpar formulário respeitando regras da finalidade
    setPagamentoForm({
      tipo: finalidade === '4' ? '90' : '01',
      valor: finalidade === '4' ? 0 : totalNota // Preencher automaticamente com total da nota
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
          {/* ✅ AVISO para finalidade 4 */}
          {finalidade === '4' && (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <p className="text-sm text-blue-300 font-medium">
                  🔒 NFe de Devolução - Apenas "Sem Pagamento" permitido
                </p>
              </div>
              <p className="text-xs text-blue-400 mt-1 ml-4">
                Para finalidade 4 (devolução), o SEFAZ exige que a forma de pagamento seja "90 - Sem pagamento"
              </p>
            </div>
          )}

          <div className="space-y-4">
            {/* Primeira linha: Tipo de Pagamento */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tipo Pagamento
              </label>
              <select
                value={pagamentoForm.tipo}
                onChange={(e) => setPagamentoForm(prev => ({ ...prev, tipo: e.target.value }))}
                disabled={finalidade === '4'} // Desabilitar para finalidade 4
                className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none ${
                  finalidade === '4'
                    ? 'border-gray-600 cursor-not-allowed opacity-75'
                    : 'border-gray-700 focus:border-primary-500'
                }`}
              >
                {Object.entries(tiposPagamentoFiltrados).map(([codigo, descricao]) => (
                  <option key={codigo} value={codigo}>{codigo} - {descricao}</option>
                ))}
              </select>
              {finalidade === '4' && (
                <p className="text-xs text-gray-400 mt-1">
                  🔒 Bloqueado para devolução - apenas "Sem pagamento" é permitido
                </p>
              )}
            </div>

            {/* Segunda linha: Valor e Botão */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
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
                    disabled={finalidade === '4'} // Desabilitar para finalidade 4
                    className={`flex-1 px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none ${
                      finalidade === '4'
                        ? 'border-gray-600 cursor-not-allowed opacity-75'
                        : 'border-gray-700 focus:border-primary-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setPagamentoForm(prev => ({ ...prev, valor: totalNota }))}
                    disabled={finalidade === '4'} // Desabilitar para finalidade 4
                    className={`px-3 py-2 rounded-lg focus:outline-none text-xs whitespace-nowrap ${
                      finalidade === '4'
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-75'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    title={finalidade === '4' ? 'Bloqueado para devolução' : 'Preencher com valor total da nota'}
                  >
                    Total
                  </button>
                </div>
                {finalidade === '4' && (
                  <p className="text-xs text-gray-400 mt-1">
                    🔒 Valor fixo R$ 0,00 para devolução (sem pagamento)
                  </p>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleAdicionarPagamento}
                  disabled={finalidade === '4'} // Desabilitar para finalidade 4
                  className={`w-full px-4 py-2 rounded-lg focus:outline-none flex items-center justify-center gap-2 ${
                    finalidade === '4'
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-75'
                      : 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-2 focus:ring-primary-500'
                  }`}
                  title={finalidade === '4' ? 'Pagamento automático para devolução' : 'Adicionar forma de pagamento'}
                >
                  <Plus size={16} />
                  {finalidade === '4' ? 'AUTOMÁTICO' : 'ADICIONAR'}
                </button>
              </div>
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
                        {finalidade === '4' ? (
                          <span className="text-xs text-gray-500 px-2 py-1 bg-gray-700 rounded">
                            🔒 Automático
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRemoverPagamento(pagamento.id)}
                            className="text-red-400 hover:text-red-300 p-1"
                            title="Remover pagamento"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
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

const ChavesRefSection: React.FC<{
  data: any[];
  onChange: (data: any[]) => void;
  finalidade?: string;
}> = ({ data: chaves = [], onChange, finalidade = '1' }) => {
  const [chaveForm, setChaveForm] = useState('');

  // Determinar se chave é obrigatória baseado na finalidade
  const isObrigatoria = ['2', '3', '4'].includes(finalidade);

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

      {/* ✅ ATUALIZADO: Aviso baseado na finalidade atual */}
      <div className={`mb-6 rounded-lg p-4 border ${
        isObrigatoria
          ? 'bg-red-900/20 border-red-700/50'
          : 'bg-blue-900/20 border-blue-700/50'
      }`}>
        <h3 className={`font-medium mb-2 flex items-center gap-2 ${
          isObrigatoria ? 'text-red-300' : 'text-blue-300'
        }`}>
          <FileText size={16} />
          {isObrigatoria ? 'Chave de Referência OBRIGATÓRIA' : 'Chave de Referência OPCIONAL'}
        </h3>

        {isObrigatoria ? (
          <div className="text-sm text-red-200 space-y-2">
            <p>
              <strong>⚠️ Para finalidade {finalidade}:</strong> Pelo menos uma chave de referência é obrigatória.
            </p>
            <p className="text-xs text-red-300">
              Esta NFe referencia documentos fiscais anteriores e deve conter a chave de acesso da NFe original.
            </p>
          </div>
        ) : (
          <div className="text-sm text-blue-200 space-y-2">
            <p>
              <strong>ℹ️ Para finalidade {finalidade} (Normal):</strong> Chaves de referência são opcionais.
            </p>
            <p className="text-xs text-blue-300">
              Se informadas, as chaves aparecerão no XML e na DANFE no campo "Documentos Fiscais Referenciados".
            </p>
          </div>
        )}

        <div className="border-t border-gray-700/30 pt-2 mt-3">
          <p className="text-xs text-gray-400">
            <strong>Regras Oficiais SEFAZ:</strong> Finalidades 2, 3 e 4 exigem chaves obrigatórias. Finalidade 1 permite chaves opcionais.
          </p>
        </div>
      </div>

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

  const handleSelecionarTransportadora = (transportadora: any) => {
    // ✅ CORREÇÃO: Salvar dados da transportadora diretamente no estado da NFe
    onChange({
      ...data,
      transportadora_id: transportadora.id,
      transportadora_nome: transportadora.nome,
      transportadora_documento: transportadora.documento,
      transportadora_endereco: transportadora.endereco_completo,
      // ✅ ADICIONADO: Campos obrigatórios para NFe
      transportadora_cidade: transportadora.cidade,
      transportadora_uf: transportadora.estado,
      transportadora_ie: transportadora.inscricao_estadual
    });
    setShowTransportadoraModal(false);
  };

  const limparTransportadora = () => {
    onChange({
      ...data,
      transportadora_id: '',
      transportadora_nome: '',
      transportadora_documento: '',
      transportadora_endereco: '',
      // ✅ ADICIONADO: Limpar campos obrigatórios
      transportadora_cidade: '',
      transportadora_uf: '',
      transportadora_ie: ''
    });
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

            {/* ✅ REGRA FISCAL: Modalidade 9 (Sem Ocorrência de Transporte) NÃO pode ter transportadora */}
            {data.modalidade_frete === '9' ? (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2 text-yellow-400 mb-2">
                  <AlertTriangle size={16} />
                  <span className="font-medium">Transportadora Não Permitida</span>
                </div>
                <p className="text-gray-300 text-sm">
                  <strong>Regra Fiscal:</strong> Para modalidade "9 - Sem Ocorrência de Transporte",
                  não é permitido informar dados da transportadora conforme regras da SEFAZ.
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Para informar transportadora, altere a modalidade de frete para 0, 1, 2, 3 ou 4.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={data.transportadora_nome || ''}
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
                  {data.transportadora_nome && (
                    <button
                      type="button"
                      onClick={limparTransportadora}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      title="Limpar transportadora"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Mostrar detalhes da transportadora selecionada */}
          {data.transportadora_nome && (
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <h4 className="text-white font-medium mb-2">Transportadora Selecionada:</h4>
              <div className="space-y-1 text-sm text-gray-300">
                <p><strong>Nome:</strong> {data.transportadora_nome}</p>
                {data.transportadora_documento && (
                  <p><strong>Documento:</strong> {data.transportadora_documento}</p>
                )}
                {data.transportadora_endereco && (
                  <p><strong>Endereço:</strong> {data.transportadora_endereco}</p>
                )}
                {data.transportadora_cidade && (
                  <p><strong>Cidade:</strong> {data.transportadora_cidade}</p>
                )}
                {data.transportadora_uf && (
                  <p><strong>UF:</strong> {data.transportadora_uf}</p>
                )}
                {data.transportadora_ie && (
                  <p><strong>IE:</strong> {data.transportadora_ie}</p>
                )}
              </div>
            </div>
          )}

          {/* ✅ ADICIONADO: Campos obrigatórios da transportadora */}
          {data.modalidade_frete !== '9' && data.transportadora_nome && (
            <div className="space-y-4">
              <h4 className="text-white font-medium">Dados Complementares da Transportadora</h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Município <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.transportadora_cidade || ''}
                    onChange={(e) => onChange({ ...data, transportadora_cidade: e.target.value })}
                    placeholder="Nome do município"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    UF <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.transportadora_uf || ''}
                    onChange={(e) => onChange({ ...data, transportadora_uf: e.target.value.toUpperCase() })}
                    placeholder="Ex: SP"
                    maxLength={2}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Inscrição Estadual
                  </label>
                  <input
                    type="text"
                    value={data.transportadora_ie || ''}
                    onChange={(e) => onChange({ ...data, transportadora_ie: e.target.value })}
                    placeholder="IE ou ISENTO"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Digite "ISENTO" para transportadoras isentas
                  </p>
                </div>

                {/* ✅ ADICIONADO: Campos de veículo (opcionais) */}
                <div className="space-y-4">
                  <h5 className="text-white font-medium">Dados do Veículo (Opcional)</h5>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Placa do Veículo
                      </label>
                      <input
                        type="text"
                        value={data.veiculo_placa || ''}
                        onChange={(e) => onChange({ ...data, veiculo_placa: e.target.value.toUpperCase() })}
                        placeholder="Ex: ABC1234"
                        maxLength={8}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        UF da Placa
                      </label>
                      <input
                        type="text"
                        value={data.veiculo_uf || ''}
                        onChange={(e) => onChange({ ...data, veiculo_uf: e.target.value.toUpperCase() })}
                        placeholder="Ex: SP"
                        maxLength={2}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        RNTC (ANTT)
                      </label>
                      <input
                        type="text"
                        value={data.veiculo_rntc || ''}
                        onChange={(e) => onChange({ ...data, veiculo_rntc: e.target.value })}
                        placeholder="Registro ANTT"
                        maxLength={20}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>

                {/* ✅ ADICIONADO: Campos de volumes (opcionais) */}
                <div className="space-y-4">
                  <h5 className="text-white font-medium">Dados dos Volumes (Opcional)</h5>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Quantidade de Volumes
                      </label>
                      <input
                        type="number"
                        value={data.volumes_quantidade || ''}
                        onChange={(e) => onChange({ ...data, volumes_quantidade: e.target.value })}
                        placeholder="Ex: 1"
                        min="1"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Espécie dos Volumes
                      </label>
                      <input
                        type="text"
                        value={data.volumes_especie || ''}
                        onChange={(e) => onChange({ ...data, volumes_especie: e.target.value })}
                        placeholder="Ex: caixa, pacote, unidade"
                        maxLength={60}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Marca dos Volumes
                      </label>
                      <input
                        type="text"
                        value={data.volumes_marca || ''}
                        onChange={(e) => onChange({ ...data, volumes_marca: e.target.value })}
                        placeholder="Ex: Samsung, Apple, etc"
                        maxLength={60}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Numeração dos Volumes
                      </label>
                      <input
                        type="text"
                        value={data.volumes_numeracao || ''}
                        onChange={(e) => onChange({ ...data, volumes_numeracao: e.target.value })}
                        placeholder="Ex: 001/010, A-001, etc"
                        maxLength={60}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Peso Bruto (kg)
                      </label>
                      <input
                        type="number"
                        value={data.volumes_peso_bruto || ''}
                        onChange={(e) => onChange({ ...data, volumes_peso_bruto: e.target.value })}
                        placeholder="Ex: 10.5"
                        step="0.001"
                        min="0"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Peso Líquido (kg)
                      </label>
                      <input
                        type="number"
                        value={data.volumes_peso_liquido || ''}
                        onChange={(e) => onChange({ ...data, volumes_peso_liquido: e.target.value })}
                        placeholder="Ex: 9.8"
                        step="0.001"
                        min="0"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Identificação do Frete
            </label>
            <select
              value={data.modalidade_frete || '9'}
              onChange={(e) => {
                const novaModalidade = e.target.value;
                // ✅ REGRA FISCAL NFe: Se modalidade = 9, limpar dados da transportadora
                if (novaModalidade === '9') {
                  onChange({
                    ...data,
                    modalidade_frete: novaModalidade,
                    transportadora_id: '',
                    transportadora_nome: '',
                    transportadora_documento: '',
                    transportadora_endereco: '',
                    // ✅ ADICIONADO: Limpar campos obrigatórios
                    transportadora_cidade: '',
                    transportadora_uf: '',
                    transportadora_ie: '',
                    // ✅ ADICIONADO: Limpar campos de veículo e volumes
                    veiculo_placa: '',
                    veiculo_uf: '',
                    veiculo_rntc: '',
                    volumes_quantidade: '',
                    volumes_especie: '',
                    volumes_marca: '',
                    volumes_numeracao: '',
                    volumes_peso_bruto: '',
                    volumes_peso_liquido: ''
                  });
                } else {
                  onChange({ ...data, modalidade_frete: novaModalidade });
                }
              }}
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

const IntermediadorSection: React.FC<{ data: any; onChange: (data: any) => void }> = ({ data, onChange }) => {
  const [intermediadorForm, setIntermediadorForm] = useState({
    nome: '',
    cnpj: ''
  });

  // Função para formatar CNPJ
  const formatarCNPJ = (valor: string) => {
    const numeros = valor.replace(/\D/g, '');
    return numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  // Função para validar CNPJ
  const validarCNPJ = (cnpj: string) => {
    const numeros = cnpj.replace(/\D/g, '');

    if (numeros.length !== 14) return false;
    if (/^(\d)\1+$/.test(numeros)) return false; // Todos os dígitos iguais

    // Validação dos dígitos verificadores
    let soma = 0;
    let peso = 2;

    // Primeiro dígito
    for (let i = 11; i >= 0; i--) {
      soma += parseInt(numeros[i]) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }

    let digito1 = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (parseInt(numeros[12]) !== digito1) return false;

    // Segundo dígito
    soma = 0;
    peso = 2;
    for (let i = 12; i >= 0; i--) {
      soma += parseInt(numeros[i]) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }

    let digito2 = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    return parseInt(numeros[13]) === digito2;
  };

  const handleCNPJChange = (valor: string) => {
    const numeros = valor.replace(/\D/g, '').slice(0, 14);
    setIntermediadorForm(prev => ({
      ...prev,
      cnpj: formatarCNPJ(numeros)
    }));
  };

  const handleAdicionarIntermediador = () => {
    if (!intermediadorForm.nome.trim()) {
      alert('Nome do intermediador é obrigatório');
      return;
    }

    if (!intermediadorForm.cnpj.trim()) {
      alert('CNPJ do intermediador é obrigatório');
      return;
    }

    const cnpjNumeros = intermediadorForm.cnpj.replace(/\D/g, '');
    if (!validarCNPJ(cnpjNumeros)) {
      alert('CNPJ inválido');
      return;
    }

    // Adicionar intermediador (único)
    onChange({
      ...data,
      nome: intermediadorForm.nome.trim(),
      cnpj: cnpjNumeros,
      cnpj_formatado: intermediadorForm.cnpj
    });

    // Limpar formulário
    setIntermediadorForm({ nome: '', cnpj: '' });
  };

  const handleRemoverIntermediador = () => {
    onChange({
      ...data,
      nome: '',
      cnpj: '',
      cnpj_formatado: ''
    });
  };

  const temIntermediador = data?.nome && data?.cnpj;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold text-white mb-4">Intermediador da Transação</h2>

      {/* Aviso explicativo */}
      <div className="mb-6 rounded-lg p-4 border bg-blue-900/20 border-blue-700/50">
        <h3 className="font-medium mb-2 flex items-center gap-2 text-blue-300">
          <Users size={16} />
          Quando Informar o Intermediador?
        </h3>
        <div className="text-sm text-blue-200 space-y-2">
          <p><strong>✅ OBRIGATÓRIO para:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1 text-xs text-blue-300">
            <li>Marketplaces (Mercado Livre, Amazon, Shopee)</li>
            <li>Delivery (iFood, Uber Eats, Rappi)</li>
            <li>Plataformas de E-commerce terceiras</li>
            <li>Agenciadores que processam a transação</li>
          </ul>
          <p><strong>❌ NÃO informar para:</strong> Vendas diretas, site próprio, loja física</p>
        </div>
      </div>

      {/* Formulário para adicionar intermediador */}
      {!temIntermediador && (
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-4">Novo Intermediador</h3>
          <div className="bg-background-card rounded-lg border border-gray-800 p-4">
            <div className="space-y-4">
              {/* Nome do Intermediador */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome do Intermediador <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={intermediadorForm.nome}
                  onChange={(e) => setIntermediadorForm(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: iFood, Mercado Livre, Amazon"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                  maxLength={60}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Nome da plataforma/marketplace que intermediou a venda
                </p>
              </div>

              {/* CNPJ do Intermediador */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  CNPJ do Intermediador <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={intermediadorForm.cnpj}
                  onChange={(e) => handleCNPJChange(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 font-mono"
                  maxLength={18}
                />
                <p className="text-xs text-gray-500 mt-1">
                  CNPJ da empresa intermediadora (com validação automática)
                </p>
              </div>

              {/* Botão Adicionar */}
              <div>
                <button
                  type="button"
                  onClick={handleAdicionarIntermediador}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  ADICIONAR INTERMEDIADOR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Intermediador Adicionado */}
      {temIntermediador && (
        <div>
          <h3 className="text-lg font-bold text-white mb-4">Intermediador Configurado</h3>
          <div className="bg-background-card rounded-lg border border-gray-800 overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-400">Nome:</p>
                      <p className="text-white font-medium">{data.nome}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">CNPJ:</p>
                      <p className="text-white font-mono">{data.cnpj_formatado}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIntermediadorForm({
                        nome: data.nome,
                        cnpj: data.cnpj_formatado
                      });
                      handleRemoverIntermediador();
                    }}
                    className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 focus:outline-none text-sm"
                    title="Alterar intermediador"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={handleRemoverIntermediador}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none text-sm"
                    title="Remover intermediador"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AutorizacaoSection: React.FC<{
  dados: any;
  onChange: (dados: any) => void;
  isViewMode?: boolean;
  onCancelarNFe?: (motivo: string) => void;
  onEnviarCCe?: () => void;
  onVisualizarPDFCCe?: (chave: string, sequencia: number) => void;
}> = ({ dados, onChange, isViewMode, onCancelarNFe, onEnviarCCe, onVisualizarPDFCCe }) => {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [cancelStatus, setCancelStatus] = useState<'normal' | 'extemporaneo' | 'expirado'>('normal');

  const formatarData = (dataISO: string) => {
    if (!dataISO) return '';
    const data = new Date(dataISO);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Sao_Paulo' // ✅ FORÇAR TIMEZONE BRASILEIRO
    });
  };

  const formatarChave = (chave: string) => {
    if (!chave) return '';
    // Formatar chave: 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000
    return chave.replace(/(\d{4})/g, '$1 ').trim();
  };

  // Função para calcular tempo restante e status do cancelamento
  const calculateCancelStatus = () => {
    // Para teste, usar data de autorização simulada se não houver uma real
    let dataAutorizacaoStr = dados?.dataAutorizacao;

    // Se não há data de autorização, simular uma NFe autorizada há 5 horas para teste
    if (!dataAutorizacaoStr && dados?.chave) {
      const agora = new Date();
      const dataSimulada = new Date(agora.getTime() - (5 * 60 * 60 * 1000)); // 5 horas atrás
      dataAutorizacaoStr = dataSimulada.toISOString();
      console.log('🧪 Usando data simulada para teste:', dataAutorizacaoStr);
    }

    if (!dataAutorizacaoStr) {
      console.log('🚫 Sem data de autorização:', dados);
      return;
    }

    const dataAutorizacao = new Date(dataAutorizacaoStr);
    const agora = new Date();
    const horasPassadas = (agora.getTime() - dataAutorizacao.getTime()) / (1000 * 60 * 60);

    console.log('⏰ Calculando status de cancelamento:', {
      dataAutorizacao: dataAutorizacaoStr,
      horasPassadas: horasPassadas.toFixed(2)
    });

    if (horasPassadas <= 24) {
      // Cancelamento normal (até 24h)
      const horasRestantes = 24 - horasPassadas;
      const horas = Math.floor(horasRestantes);
      const minutos = Math.floor((horasRestantes - horas) * 60);

      setTimeRemaining(`${horas}h ${minutos}m`);
      setCancelStatus('normal');
    } else if (horasPassadas <= 480) {
      // Cancelamento extemporâneo (24h até 20 dias)
      const horasRestantes = 480 - horasPassadas;
      const dias = Math.floor(horasRestantes / 24);
      const horas = Math.floor(horasRestantes % 24);

      setTimeRemaining(`${dias}d ${horas}h`);
      setCancelStatus('extemporaneo');
    } else {
      // Prazo expirado (após 20 dias)
      setTimeRemaining('Expirado');
      setCancelStatus('expirado');
    }
  };

  // Atualizar status do cancelamento a cada minuto (APENAS se não estiver cancelada)
  useEffect(() => {
    if (dados?.dataAutorizacao && dados?.status !== 'cancelada') {
      console.log('🔄 Iniciando cálculo de status de cancelamento');
      calculateCancelStatus();
      const interval = setInterval(calculateCancelStatus, 60000); // Atualizar a cada minuto
      return () => clearInterval(interval);
    } else {
      console.log('🚫 Não calculando status (NFe cancelada ou sem data):', {
        dataAutorizacao: dados?.dataAutorizacao,
        status: dados?.status
      });
      // Limpar tempo restante se NFe estiver cancelada
      if (dados?.status === 'cancelada') {
        setTimeRemaining('');
        setCancelStatus('normal');
      }
    }
  }, [dados?.dataAutorizacao, dados?.status]);

  const handleCancelarClick = () => {
    if (!dados?.chave) {
      showMessage('error', 'Chave da NFe não encontrada');
      return;
    }

    if (dados?.status === 'cancelada') {
      showMessage('error', 'Esta NFe já foi cancelada');
      return;
    }

    setShowCancelModal(true);
  };

  const handleConfirmarCancelamento = async () => {
    const motivo = dados.motivo_cancelamento?.trim() || '';

    if (!motivo || motivo.length < 15) {
      showMessage('error', 'Motivo deve ter pelo menos 15 caracteres');
      return;
    }

    setIsCancelling(true);

    try {
      if (onCancelarNFe) {
        await onCancelarNFe(motivo);
        setShowCancelModal(false);
        // ✅ Mensagem já é exibida no componente pai - não duplicar

        // ✅ Grid já foi atualizada no componente pai via state management
        console.log('✅ Cancelamento concluído - Grid atualizada automaticamente');
      }
    } catch (error: any) {
      showMessage('error', `Erro ao cancelar NFe: ${error.message}`);
    } finally {
      setIsCancelling(false);
    }
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
              {dados.dataAutorizacao && `Autorizada em ${formatarData(dados.dataAutorizacao)}`}
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
                value={formatarChave(dados.chave)}
                readOnly
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none font-mono text-sm"
              />
              <button
                onClick={() => navigator.clipboard.writeText(dados.chave)}
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
                value={dados.protocolo}
                readOnly
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none"
              />
              <button
                onClick={() => navigator.clipboard.writeText(dados.protocolo)}
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

        {/* ✅ REGRA OFICIAL SEFAZ GA01: NFe cancelada NÃO pode receber Carta de Correção */}
        {dados?.status !== 'cancelada' ? (
          <>
            {/* Campo para controlar a sequência da CCe */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sequência da Carta de Correção
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={dados.sequencia_cce || 1}
                onChange={(e) => onChange({ ...dados, sequencia_cce: parseInt(e.target.value) || 1 })}
                className="w-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                placeholder="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Número da sequência (1 a 20). Cada NFe pode ter até 20 cartas de correção.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Histórico de Cartas de Correção */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cartas de Correção Enviadas
                </label>
                <div className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white min-h-[80px]">
                  {dados.cartas_correcao && dados.cartas_correcao.length > 0 ? (
                    <div className="space-y-2">
                      {dados.cartas_correcao.map((cce: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded text-sm">
                          <div className="flex items-center gap-3">
                            <span className="bg-yellow-600 text-white px-2 py-1 rounded text-xs font-medium">
                              CCe #{cce.sequencia}
                            </span>
                            <span className="text-gray-300">
                              {new Date(cce.data_envio).toLocaleString('pt-BR')}
                            </span>
                            <span className="text-green-400 text-xs">
                              ✓ {cce.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">
                              Protocolo: {cce.protocolo}
                            </span>
                            <button
                              onClick={() => onVisualizarPDFCCe && onVisualizarPDFCCe(dados.chave, cce.sequencia)}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                              title="Visualizar PDF da CCe"
                            >
                              📄 PDF
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-16 text-gray-500">
                      <div className="text-center">
                        <p className="text-sm">Nenhuma Carta de Correção enviada</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Carta de Correção *
              </label>
              <div className="relative">
                <textarea
                  rows={3}
                  value={dados.carta_correcao || ''}
                  onChange={(e) => onChange({ ...dados, carta_correcao: e.target.value })}
                  className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-1 resize-none pr-16 ${
                    (dados.carta_correcao || '').length >= 15
                      ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                      : 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  }`}
                  placeholder="Digite a correção que deseja fazer na NFe (mínimo 15 caracteres)..."
                  maxLength={1000}
                />

                {/* Contador de caracteres */}
                <div className="absolute bottom-2 right-2 text-xs font-medium pointer-events-none">
                  <span className={`${
                    (dados.carta_correcao || '').length >= 15
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}>
                    {(dados.carta_correcao || '').length}
                  </span>
                  <span className="text-gray-500">/15</span>
                </div>
              </div>

              {/* Indicador visual do status */}
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center text-xs">
                  {(dados.carta_correcao || '').length >= 15 ? (
                    <div className="flex items-center text-green-400">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Texto válido para CCe
                    </div>
                  ) : (
                    <div className="flex items-center text-red-400">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Mínimo de 15 caracteres obrigatório (faltam {15 - (dados.carta_correcao || '').length})
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Use para corrigir dados que não alterem o valor do documento
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <X size={16} />
              <span className="font-medium">Carta de Correção Indisponível</span>
            </div>
            <p className="text-gray-300 text-sm">
              <strong>Regra SEFAZ GA01:</strong> NFe cancelada não pode receber Carta de Correção Eletrônica (CCe).
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Apenas NFe com status "autorizada" podem ser corrigidas via CCe.
            </p>
          </div>
        )}

        {/* Área de Cancelamento */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Cancelamento da NFe</h3>

          {dados?.status === 'cancelada' ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <X size={16} />
                <span className="font-medium">NFe Cancelada</span>
              </div>
              {dados.motivo_cancelamento && (
                <p className="text-gray-300 text-sm">
                  <strong>Motivo:</strong> {dados.motivo_cancelamento}
                </p>
              )}
              {dados.data_cancelamento && (
                <p className="text-gray-400 text-xs mt-1">
                  Cancelada em: {formatarData(dados.data_cancelamento)}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Alerta sobre prazo de cancelamento */}
              <div className={`border rounded-lg p-4 ${
                cancelStatus === 'normal'
                  ? 'bg-blue-500/10 border-blue-500/20'
                  : cancelStatus === 'extemporaneo'
                  ? 'bg-yellow-500/10 border-yellow-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              }`}>
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className={`mt-0.5 flex-shrink-0 ${
                    cancelStatus === 'normal'
                      ? 'text-blue-400'
                      : cancelStatus === 'extemporaneo'
                      ? 'text-yellow-400'
                      : 'text-red-400'
                  }`} />
                  <div className={`text-sm ${
                    cancelStatus === 'normal'
                      ? 'text-blue-300'
                      : cancelStatus === 'extemporaneo'
                      ? 'text-yellow-300'
                      : 'text-red-300'
                  }`}>
                    <p className="font-medium mb-1">
                      {cancelStatus === 'normal' && 'Cancelamento Normal'}
                      {cancelStatus === 'extemporaneo' && 'Cancelamento Extemporâneo'}
                      {cancelStatus === 'expirado' && 'Prazo de Cancelamento Expirado'}
                    </p>
                    <p className="mb-2">
                      {cancelStatus === 'normal' && dados?.status !== 'cancelada' &&
                        `Você pode cancelar esta NFe diretamente no sistema. Tempo restante: ${timeRemaining}`
                      }
                      {cancelStatus === 'extemporaneo' && dados?.status !== 'cancelada' && (
                        <span className="flex items-center gap-1">
                          Cancelamento extemporâneo (após 24h). Tempo restante: {timeRemaining}. Pode ser necessária manifestação do destinatário.
                          <button
                            onClick={() => setShowHelpModal(true)}
                            className="inline-flex items-center justify-center w-4 h-4 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-full text-yellow-300 hover:text-yellow-200 transition-colors ml-1"
                            title="O que é manifestação do destinatário?"
                          >
                            <span className="text-xs font-bold">?</span>
                          </button>
                        </span>
                      )}
                      {cancelStatus === 'expirado' && dados?.status !== 'cancelada' &&
                        'O prazo de 20 dias para cancelamento expirou. É necessário protocolar pedido específico na SEFAZ.'
                      }
                    </p>
                    {cancelStatus !== 'expirado' && (
                      <p className="text-xs opacity-75">
                        O cancelamento de NFe é uma ação irreversível e deve ser feita apenas em casos específicos previstos na legislação fiscal.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Motivo do Cancelamento *
                </label>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={dados.motivo_cancelamento || ''}
                    onChange={(e) => onChange({ ...dados, motivo_cancelamento: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg text-white focus:outline-none focus:ring-1 resize-none pr-16 ${
                      cancelStatus === 'expirado' || dados?.status === 'cancelada'
                        ? 'bg-gray-900 border-gray-600 cursor-not-allowed'
                        : (dados.motivo_cancelamento || '').length >= 15
                        ? 'bg-gray-800 border-green-500 focus:border-green-500 focus:ring-green-500/20'
                        : 'bg-gray-800 border-red-500 focus:border-red-500 focus:ring-red-500/20'
                    }`}
                    placeholder={
                      cancelStatus === 'expirado'
                        ? 'Prazo de cancelamento expirado - Entre em contato com a SEFAZ'
                        : 'Digite o motivo do cancelamento (mínimo 15 caracteres)...'
                    }
                    disabled={cancelStatus === 'expirado' || dados?.status === 'cancelada'}
                    maxLength={255}
                  />

                  {/* Contador de caracteres */}
                  {cancelStatus !== 'expirado' && dados?.status !== 'cancelada' && (
                    <div className="absolute bottom-2 right-2 text-xs font-medium pointer-events-none">
                      <span className={`${
                        (dados.motivo_cancelamento || '').length >= 15
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`}>
                        {(dados.motivo_cancelamento || '').length}
                      </span>
                      <span className="text-gray-500">/15</span>
                    </div>
                  )}
                </div>

                {/* Indicador visual do status */}
                <div className="mt-2 flex items-center text-xs">
                  {cancelStatus === 'expirado' ? (
                    <div className="flex items-center text-red-400">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Cancelamento não disponível - Prazo de 20 dias expirado
                    </div>
                  ) : dados?.status === 'cancelada' ? (
                    <div className="flex items-center text-gray-400">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      NFe já cancelada
                    </div>
                  ) : (dados.motivo_cancelamento || '').length >= 15 ? (
                    <div className="flex items-center text-green-400">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Motivo válido para cancelamento
                    </div>
                  ) : (
                    <div className="flex items-center text-red-400">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Mínimo de 15 caracteres obrigatório (faltam {15 - (dados.motivo_cancelamento || '').length})
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-wrap gap-3">
          {/* ✅ BOTÕES XML/PDF TEMPORARIAMENTE OCULTOS - Implementação em desenvolvimento */}
          {/*
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2">
            <Download size={16} />
            Baixar XML
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center gap-2">
            <Download size={16} />
            Baixar PDF
          </button>
          */}
          {/* ✅ REGRA SEFAZ GA01: Só mostrar botão CCe se NFe não estiver cancelada */}
          {dados?.status !== 'cancelada' && onEnviarCCe && (
            <button
              onClick={onEnviarCCe}
              disabled={
                !dados?.chave ||
                !dados?.carta_correcao ||
                dados.carta_correcao.length < 15
              }
              className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 flex items-center gap-2 transition-colors font-medium ${
                !dados?.chave ||
                !dados?.carta_correcao ||
                dados.carta_correcao.length < 15
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-500'
              }`}
            >
              <Send size={16} />
              {!dados?.chave
                ? 'Chave NFe não encontrada'
                : dados.carta_correcao?.length < 15
                ? `Faltam ${15 - (dados.carta_correcao?.length || 0)} caracteres`
                : 'Enviar CCe'
              }
            </button>
          )}
          {dados?.status !== 'cancelada' && (
            <button
              onClick={handleCancelarClick}
              disabled={
                cancelStatus === 'expirado' ||
                !dados?.chave ||
                (dados.motivo_cancelamento || '').length < 15
              }
              className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 flex items-center gap-2 transition-colors font-medium ${
                cancelStatus === 'expirado' ||
                !dados?.chave ||
                (dados.motivo_cancelamento || '').length < 15
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : cancelStatus === 'extemporaneo'
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-500'
                  : 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
              }`}
            >
              <X size={16} />
              {cancelStatus === 'expirado'
                ? 'Prazo expirado (20 dias)'
                : !dados?.chave
                ? 'Chave NFe não encontrada'
                : (dados.motivo_cancelamento || '').length < 15
                ? `Faltam ${15 - (dados.motivo_cancelamento || '').length} caracteres`
                : cancelStatus === 'extemporaneo'
                ? 'Cancelar NFe (Extemporâneo)'
                : 'Cancelar NFe'
              }
            </button>
          )}

          {cancelStatus === 'expirado' && dados?.status !== 'cancelada' && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-300">
                <strong>Prazo Expirado:</strong> Para cancelar esta NFe, é necessário protocolar pedido específico na SEFAZ conforme legislação vigente.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Ajuda - Manifestação do Destinatário */}
      <AnimatePresence>
        {showHelpModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowHelpModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-card rounded-lg border border-gray-800 p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                    <span className="text-yellow-400 font-bold">?</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Manifestação do Destinatário</h3>
                    <p className="text-sm text-gray-400">Entenda quando é necessária</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-300 mb-2">🎯 O que é?</h4>
                  <p className="text-gray-300">
                    A manifestação do destinatário é um <strong>evento oficial</strong> onde o destinatário da NFe declara à SEFAZ que não recebeu a mercadoria, desconhece a operação ou que a operação não ocorreu.
                  </p>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-300 mb-2">⚖️ Por que é necessária?</h4>
                  <p className="text-gray-300">
                    <strong>Proteção fiscal:</strong> Evita que empresas cancelem NFes após a mercadoria já ter sido entregue/recebida, o que seria uma fraude fiscal.
                  </p>
                </div>

                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <h4 className="font-semibold text-green-300 mb-3">⏰ Quando é obrigatória?</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-red-400">❌</span>
                      <span className="text-gray-300"><strong>Cancelamento Normal (0-24h):</strong> NÃO precisa</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400">⚠️</span>
                      <span className="text-gray-300"><strong>Cancelamento Extemporâneo (24h-20d):</strong> PODE precisar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">✅</span>
                      <span className="text-gray-300"><strong>Após 20 dias:</strong> SEMPRE precisa (via processo SEFAZ)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-300 mb-3">🔍 Casos que PRECISAM de manifestação:</h4>
                  <ul className="space-y-1 text-gray-300">
                    <li>• Destinatário é <strong>pessoa jurídica</strong> com certificado digital</li>
                    <li>• Destinatário é <strong>pessoa física</strong> com certificado digital</li>
                    <li>• NFe foi emitida mas a <strong>operação não ocorreu</strong></li>
                    <li>• Mercadoria <strong>não foi entregue/recebida</strong></li>
                  </ul>
                </div>

                <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-300 mb-3">❌ Casos que NÃO PRECISAM:</h4>
                  <ul className="space-y-1 text-gray-300">
                    <li>• Destinatário no <strong>exterior</strong></li>
                    <li>• Destinatário <strong>pessoa física sem certificado</strong></li>
                    <li>• Já passou <strong>180 dias</strong> da autorização</li>
                    <li>• Destinatário já fez <strong>manifestação de desconhecimento</strong></li>
                  </ul>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-300 mb-3">🔄 Como proceder:</h4>
                  <ol className="space-y-1 text-gray-300 list-decimal list-inside">
                    <li>Entre em contato com o destinatário</li>
                    <li>Solicite que ele acesse o Portal da NFe (www.nfe.fazenda.gov.br)</li>
                    <li>Peça para manifestar "Desconhecimento" ou "Operação não Realizada"</li>
                    <li>Após a manifestação, você poderá cancelar no sistema</li>
                    <li>Se o destinatário não tiver certificado digital, o cancelamento pode ser feito diretamente</li>
                  </ol>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  Entendi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Cancelamento */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => !isCancelling && setShowCancelModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-card rounded-lg border border-gray-800 p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <X size={20} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Cancelar NFe</h3>
                  <p className="text-sm text-gray-400">Esta ação é irreversível</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-yellow-300">
                      <p className="font-medium">Atenção!</p>
                      <p className="mt-1">O cancelamento será enviado para a SEFAZ e não poderá ser desfeito.</p>
                    </div>
                  </div>
                </div>

                {/* Mostrar o motivo já digitado */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Motivo do Cancelamento
                  </label>
                  <p className="text-white text-sm leading-relaxed">
                    {dados.motivo_cancelamento || 'Nenhum motivo informado'}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    {(dados.motivo_cancelamento || '').length} caracteres
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                  }}
                  disabled={isCancelling}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarCancelamento}
                  disabled={isCancelling || (dados.motivo_cancelamento || '').trim().length < 15}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isCancelling ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Cancelando...
                    </>
                  ) : (
                    <>
                      <X size={16} />
                      Confirmar Cancelamento
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
        // ✅ ADICIONADO: Campos obrigatórios para NFe
        cidade: cliente.cidade || '',
        estado: cliente.estado || '',
        inscricao_estadual: cliente.inscricao_estadual || '',
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
