import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Download, FileText, Calendar, User, AlertCircle, CheckCircle, Clock, Trash2, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../../components/comum/Button';
import { showMessage } from '../../utils/toast';
import * as XLSX from 'xlsx';

interface ImportacaoHistorico {
  id: string;
  empresa_id: string;
  usuario_id: string;
  nome_arquivo: string;
  arquivo_storage_path: string;
  arquivo_url?: string;
  arquivo_download_url?: string;
  tamanho_arquivo?: number;
  status: 'iniciado' | 'processando' | 'concluida' | 'erro' | 'cancelada';
  total_linhas: number;
  linhas_processadas: number;
  linhas_sucesso: number;
  linhas_erro: number;
  linhas_ignoradas: number;
  grupos_criados: number;
  grupos_existentes: number;
  produtos_criados: number;
  produtos_atualizados: number;
  etapa_atual: string;
  progresso_percentual: number;
  mensagem_atual?: string;
  observacoes?: string;
  log_erros?: any[];
  log_alertas?: any[];
  dados_validacao?: any;
  iniciado_em: string;
  finalizado_em?: string;
  tempo_processamento?: string;
  configuracoes?: any;
  estatisticas?: any;
  created_at: string;
  updated_at: string;
  usuario_nome?: string; // Para JOIN com tabela usuarios
}

interface DeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-background-card p-6 rounded-lg shadow-xl max-w-sm mx-4 w-full"
      >
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-400 mb-6">{message}</p>
        <div className="flex gap-4">
          <Button
            type="button"
            variant="text"
            className="flex-1"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            className="flex-1 !bg-red-500 hover:!bg-red-600"
            onClick={onConfirm}
          >
            Excluir
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Modal de processamento com animações
interface ProcessingModalProps {
  isOpen: boolean;
  message: string;
}

const ProcessingModal: React.FC<ProcessingModalProps> = ({ isOpen, message }) => {
  const [currentLogo, setCurrentLogo] = useState(true);

  // Alternar entre logo e loading
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setCurrentLogo(prev => !prev);
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-background-card p-8 rounded-xl shadow-2xl max-w-md mx-4 w-full text-center"
      >
        {/* Logo/Loading alternado */}
        <div className="mb-6 h-20 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {currentLogo ? (
              <motion.div
                key="logo"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.5 }}
                className="text-4xl font-bold text-primary"
              >
                NEXO
              </motion.div>
            ) : (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.5 }}
                className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"
              />
            )}
          </AnimatePresence>
        </div>

        {/* Mensagem */}
        <motion.p
          key={message}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-white text-lg mb-4"
        >
          {message}
        </motion.p>

        {/* Barra de progresso animada */}
        <div className="w-full bg-gray-700 rounded-full h-2">
          <motion.div
            className="bg-primary h-2 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

const ImportarProdutosPage: React.FC = () => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const [importacoes, setImportacoes] = useState<ImportacaoHistorico[]>([]);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [usuarioNome, setUsuarioNome] = useState<string>('');
  const [regimeTributario, setRegimeTributario] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    itemId: string;
    title: string;
    message: string;
  }>({
    isOpen: false,
    itemId: '',
    title: '',
    message: '',
  });

  // Buscar dados do usuário e empresa
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (userData.user) {
          const { data: usuario, error: usuarioError } = await supabase
            .from('usuarios')
            .select('empresa_id, nome')
            .eq('id', userData.user.id)
            .single();

          if (usuarioError) throw usuarioError;

          setEmpresaId(usuario.empresa_id);
          setUsuarioNome(usuario.nome);

          // Buscar regime tributário da empresa
          if (usuario.empresa_id) {
            const { data: empresaData, error: empresaError } = await supabase
              .from('empresas')
              .select('regime_tributario')
              .eq('id', usuario.empresa_id)
              .single();

            if (!empresaError && empresaData) {
              setRegimeTributario(empresaData.regime_tributario);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        showMessage('Erro ao carregar dados do usuário', 'error');
      }
    };

    fetchUserData();
  }, []);

  // Buscar histórico de importações
  useEffect(() => {
    if (empresaId) {
      fetchImportacoes();
    }
  }, [empresaId]);

  const fetchImportacoes = async () => {
    if (!empresaId) return;

    try {
      setIsLoading(true);

      // Buscar importações da nova tabela
      const { data, error } = await supabase
        .from('importacao_produtos')
        .select(`
          *,
          usuarios!inner(nome)
        `)
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const importacoesFormatadas = data?.map(item => ({
        ...item,
        usuario_nome: (item as any).usuarios.nome
      })) || [];

      setImportacoes(importacoesFormatadas);
      setIsDataReady(true);
    } catch (error) {
      console.error('Erro ao buscar importações:', error);
      showMessage('Erro ao carregar histórico de importações', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv' // .csv
      ];

      if (!allowedTypes.includes(file.type)) {
        showMessage('Tipo de arquivo não suportado. Use apenas .xlsx, .xls ou .csv', 'error');
        return;
      }

      // Validar tamanho (máximo 25MB - otimizado para ~25.000 produtos)
      const maxSize = 25 * 1024 * 1024; // 25MB - limite técnico otimizado
      if (file.size > maxSize) {
        showMessage('Arquivo muito grande. Tamanho máximo: 25MB (~25.000 produtos)', 'error');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleImportarProdutos = async () => {
    if (!selectedFile || !empresaId) return;

    let importacaoId: string | null = null;

    try {
      setIsUploading(true);
      setShowSidebar(false);
      setShowProcessingModal(true);
      setProcessingMessage('Aguarde processando...');

      // 0. Obter dados do usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('id', userData.user.id)
        .single();

      if (usuarioError) throw usuarioError;

      // 1. Preparar dados para upload local
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${selectedFile.name}`;
      const localPath = `empresa_${empresaId}/${fileName}`;

      setProcessingMessage('Enviando planilha para o servidor...');

      // Converter arquivo para base64 para envio
      const arrayBuffer = await selectedFile.arrayBuffer();
      const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Enviar arquivo para backend salvar localmente
      const uploadResponse = await fetch('/backend/public/upload-planilha.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: fileName,
          empresaId: empresaId,
          fileData: base64Data,
          originalName: selectedFile.name
        })
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.message || 'Erro ao fazer upload do arquivo');
      }

      const uploadResult = await uploadResponse.json();

      // 2. Criar registro de importação
      const downloadUrl = `/backend/public/download-planilha.php?file=${encodeURIComponent(uploadResult.filePath)}&empresa=${empresaId}`;

      const { data: importacaoData, error: importacaoError } = await supabase
        .from('importacao_produtos')
        .insert({
          empresa_id: empresaId,
          usuario_id: usuarioData.id,
          nome_arquivo: selectedFile.name,
          arquivo_storage_path: uploadResult.filePath, // Caminho local retornado pelo backend
          arquivo_download_url: downloadUrl,
          tamanho_arquivo: selectedFile.size,
          status: 'processando',
          etapa_atual: 'iniciando',
          mensagem_atual: 'Processando arquivo...'
        })
        .select('id')
        .single();

      if (importacaoError) throw importacaoError;
      importacaoId = importacaoData.id;

      // 3. Atualizar progresso - lendo arquivo
      await supabase
        .from('importacao_produtos')
        .update({
          etapa_atual: 'lendo_arquivo',
          mensagem_atual: 'Estamos fazendo todo ajuste para que seus produtos sejam importados ao nexo, aguarde mais um momento...',
          progresso_percentual: 10
        })
        .eq('id', importacaoId);

      setProcessingMessage('Estamos fazendo todo ajuste para que seus produtos sejam importados ao nexo, aguarde mais um momento...');

      // Reutilizar o arrayBuffer já criado anteriormente
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Remover cabeçalho
      const rows = data.slice(1) as any[][];

      if (rows.length === 0) {
        throw new Error('Planilha está vazia ou não contém dados válidos');
      }

      // 4. Atualizar total de linhas
      await supabase
        .from('importacao_produtos')
        .update({
          total_linhas: rows.length,
          etapa_atual: 'processando_grupos',
          mensagem_atual: 'Analisando e criando grupos de produtos...',
          progresso_percentual: 20
        })
        .eq('id', importacaoId);

      // 5. Processar grupos únicos
      setProcessingMessage('Analisando e criando grupos de produtos...');

      const gruposUnicos = new Set<string>();
      rows.forEach(row => {
        if (row[0] && typeof row[0] === 'string') { // Coluna GRUPO*
          gruposUnicos.add(row[0].trim().toUpperCase());
        }
      });

      // 4. Verificar grupos existentes e criar novos
      const gruposArray = Array.from(gruposUnicos);
      const gruposExistentes = new Map<string, string>(); // nome -> id

      if (gruposArray.length > 0) {
        const { data: gruposData, error: gruposError } = await supabase
          .from('grupos')
          .select('id, nome')
          .eq('empresa_id', empresaId)
          .eq('deletado', false);

        if (gruposError) throw gruposError;

        // Mapear grupos existentes (case-insensitive)
        gruposData?.forEach(grupo => {
          gruposExistentes.set(grupo.nome.toUpperCase(), grupo.id);
        });

        // Criar grupos que não existem (verificação case-insensitive)
        const gruposParaCriar = gruposArray.filter(nome =>
          !gruposExistentes.has(nome.toUpperCase())
        );

        if (gruposParaCriar.length > 0) {
          setProcessingMessage(`Criando ${gruposParaCriar.length} novos grupos...`);

          // Atualizar progresso
          await supabase
            .from('importacao_produtos')
            .update({
              mensagem_atual: `Criando ${gruposParaCriar.length} novos grupos...`,
              progresso_percentual: 40
            })
            .eq('id', importacaoId);

          const novosGrupos = gruposParaCriar.map(nome => ({
            nome: nome,
            empresa_id: empresaId
          }));

          let gruposCriados: any[] = [];

          const { data: gruposCriadosData, error: criarGruposError } = await supabase
            .from('grupos')
            .insert(novosGrupos)
            .select('id, nome');

          if (criarGruposError) {
            // Se for erro de duplicação, tentar criar grupos individualmente
            if (criarGruposError.code === '23505') { // Unique constraint violation
              console.warn('Detectada tentativa de criação de grupo duplicado, criando individualmente...');

              for (const grupo of novosGrupos) {
                try {
                  const { data: grupoIndividual, error: erroIndividual } = await supabase
                    .from('grupos')
                    .insert(grupo)
                    .select('id, nome')
                    .single();

                  if (!erroIndividual && grupoIndividual) {
                    gruposCriados.push(grupoIndividual);
                  }
                } catch (erroGrupoIndividual) {
                  // Ignorar erros de duplicação individual
                  console.warn(`Grupo "${grupo.nome}" já existe, ignorando...`);
                }
              }
            } else {
              throw criarGruposError;
            }
          } else {
            gruposCriados = gruposCriadosData || [];
          }

          // Adicionar novos grupos ao mapa
          gruposCriados?.forEach(grupo => {
            gruposExistentes.set(grupo.nome.toUpperCase(), grupo.id);
          });

          // Calcular contadores reais
          const gruposRealmenteCriados = gruposCriados?.length || 0;
          const gruposJaExistentes = gruposArray.length - gruposRealmenteCriados;

          // Atualizar contadores
          await supabase
            .from('importacao_produtos')
            .update({
              grupos_criados: gruposRealmenteCriados,
              grupos_existentes: gruposJaExistentes
            })
            .eq('id', importacaoId);
        } else {
          // Atualizar apenas grupos existentes
          await supabase
            .from('importacao_produtos')
            .update({
              grupos_criados: 0,
              grupos_existentes: gruposArray.length
            })
            .eq('id', importacaoId);
        }
      }

      // Finalizar com sucesso
      setProcessingMessage('Grupos processados com sucesso! Preparando para importar produtos...');

      await supabase
        .from('importacao_produtos')
        .update({
          status: 'concluida',
          etapa_atual: 'finalizado',
          mensagem_atual: 'Importação concluída com sucesso!',
          progresso_percentual: 100,
          finalizado_em: new Date().toISOString(),
          observacoes: `Processados ${gruposArray.length} grupos únicos. ${gruposCriados?.length || 0} grupos criados, ${gruposArray.length - (gruposCriados?.length || 0)} já existiam.`
        })
        .eq('id', importacaoId);

      // Simular tempo de processamento
      await new Promise(resolve => setTimeout(resolve, 2000));

      setProcessingMessage('Importação concluída com sucesso!');

      // Aguardar um pouco antes de fechar
      await new Promise(resolve => setTimeout(resolve, 1500));

      setSelectedFile(null);
      showMessage('Planilha enviada e grupos processados com sucesso!', 'success');

      // Recarregar histórico
      await fetchImportacoes();

    } catch (error: any) {
      console.error('Erro ao importar produtos:', error);

      // Registrar erro na tabela se o registro foi criado
      if (importacaoId) {
        try {
          await supabase
            .from('importacao_produtos')
            .update({
              status: 'erro',
              etapa_atual: 'erro',
              mensagem_atual: `Erro: ${error.message}`,
              finalizado_em: new Date().toISOString(),
              log_erros: [
                {
                  timestamp: new Date().toISOString(),
                  erro: error.message,
                  stack: error.stack
                }
              ],
              observacoes: `Importação interrompida devido a erro: ${error.message}`
            })
            .eq('id', importacaoId);
        } catch (updateError) {
          console.error('Erro ao atualizar status de erro:', updateError);
        }
      }

      showMessage(`Erro ao processar arquivo: ${error.message}`, 'error');
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
      setShowProcessingModal(false);
    }
  };

  const handleDeleteImportacao = async (id: string) => {
    try {
      // Buscar dados da importação para remover arquivo local
      const { data: importacao, error: fetchError } = await supabase
        .from('importacao_produtos')
        .select('arquivo_storage_path')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Remover arquivo local via backend
      if (importacao?.arquivo_storage_path) {
        try {
          await fetch('/backend/public/delete-planilha.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filePath: importacao.arquivo_storage_path
            })
          });
        } catch (deleteFileError) {
          console.warn('Erro ao deletar arquivo local:', deleteFileError);
          // Não falhar aqui, continuar com a exclusão do registro
        }
      }

      // Excluir registro da tabela
      const { error: deleteError } = await supabase
        .from('importacao_produtos')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Atualizar lista local
      setImportacoes(prev => prev.filter(imp => imp.id !== id));
      showMessage('Importação excluída com sucesso', 'success');
    } catch (error) {
      console.error('Erro ao excluir importação:', error);
      showMessage('Erro ao excluir importação', 'error');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'concluida':
        return <CheckCircle className="text-green-400" size={20} />;
      case 'erro':
        return <AlertCircle className="text-red-400" size={20} />;
      case 'processando':
        return <Clock className="text-yellow-400" size={20} />;
      case 'iniciado':
        return <Clock className="text-blue-400" size={20} />;
      case 'cancelada':
        return <X className="text-gray-400" size={20} />;
      default:
        return <FileText className="text-gray-400" size={20} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'concluida':
        return 'Concluída';
      case 'erro':
        return 'Erro';
      case 'processando':
        return 'Processando';
      case 'iniciado':
        return 'Iniciado';
      case 'cancelada':
        return 'Cancelada';
      default:
        return 'Desconhecido';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getRegimeTributarioText = (regime: number | null) => {
    switch (regime) {
      case 1:
        return 'Simples Nacional';
      case 2:
        return 'Simples Nacional - Excesso';
      case 3:
        return 'Lucro Real';
      case 4:
        return 'Lucro Presumido';
      default:
        return 'Não informado';
    }
  };

  const getRegimeTributarioColor = (regime: number | null) => {
    switch (regime) {
      case 1:
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 2:
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 3:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 4:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const gerarPlanilhaExemplo = () => {
    // Definir colunas baseadas no regime tributário
    const colunasGerais = [
      'GRUPO*',
      'Código do Produto*',
      'Código de Barras',
      'Nome do Produto* (Evite: @#$%&*()+=[]{}|\\:";\'<>?,./)',
      'Unidade de Medida*',
      'Preço de Custo',
      'Preço Padrão*',
      'Descrição Adicional',
      'Estoque Inicial',
      'Produto Alcoólico',
      'Este produto é Pizza?',
      'Matéria prima',
      'Produção'
    ];

    const colunasImpostos = [
      'NCM*',
      'CFOP*',
      regimeTributario === 1 ? 'CSOSN* (Simples Nacional)' : 'CST* (Regime Normal)',
      'CEST (Obrigatório se CFOP = 5405)',
      'Origem do Produto',
      'Alíquota ICMS (%)',
      'Alíquota PIS (%)',
      'Alíquota COFINS (%)',
      'Peso Líquido (kg)'
    ];

    const todasColunas = [...colunasGerais, ...colunasImpostos];

    // Dados de exemplo - Linha 1 (Coca Cola)
    const exemploGeral1 = [
      'BEBIDAS',
      '1',
      '7891234567890',
      'Coca Cola Lata',
      'UN',
      '15.50',
      '35.90',
      '350ml',
      '0',
      'false',
      'false',
      'false',
      'false'
    ];

    const exemploImpostos1 = [
      '19059090',
      '5102',
      regimeTributario === 1 ? '102' : '00',
      '',
      '0',
      '18',
      '1.65',
      '7.6',
      '0.5'
    ];

    // Dados de exemplo - Linha 2 (Banana por KG)
    const exemploGeral2 = [
      'FRUTAS',
      '2',
      '7891234567891',
      'Banana prata',
      'KG',
      '3.20',
      '6.50',
      'Banana prata fresca',
      '0',
      'false',
      'false',
      'false',
      'false'
    ];

    const exemploImpostos2 = [
      '08030019',
      '5102',
      regimeTributario === 1 ? '102' : '00',
      '',
      '0',
      '18',
      '1.65',
      '7.6',
      '0.2'
    ];

    const exemploCompleto1 = [...exemploGeral1, ...exemploImpostos1];
    const exemploCompleto2 = [...exemploGeral2, ...exemploImpostos2];

    // Criar dados para Excel
    const dadosExcel = [
      todasColunas,
      exemploCompleto1,
      exemploCompleto2
    ];

    // Criar workbook e worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(dadosExcel);

    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos');

    // Gerar e baixar arquivo Excel
    XLSX.writeFile(workbook, 'planilha_exemplo_produtos_nexo.xlsx');

    showMessage('Planilha de exemplo baixada com sucesso!', 'success');
  };

  const renderSkeletonCards = () => {
    return Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="bg-background-card rounded-lg border border-gray-800 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-3"></div>
          <div className="h-3 bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    ));
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Importar Produtos</h1>
          <p className="text-gray-400 mt-1">Gerencie as importações de produtos em lote</p>
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={() => setShowSidebar(true)}
        >
          <Upload size={16} className="mr-2" />
          Importar Produtos
        </Button>
      </div>

      {/* Área de Informações e Download */}
      <div className="bg-background-card rounded-lg border border-gray-800 p-6 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Tag do Regime Tributário */}
          <div className="flex items-center gap-3">
            <Tag size={20} className="text-gray-400" />
            <span className="text-gray-300 font-medium">Regime Tributário:</span>
            <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getRegimeTributarioColor(regimeTributario)}`}>
              {getRegimeTributarioText(regimeTributario)}
            </div>
          </div>

          {/* Botão de Download da Planilha */}
          <Button
            type="button"
            variant="text"
            onClick={gerarPlanilhaExemplo}
            className="text-primary-400 hover:text-primary-300 border border-primary-500/20 hover:border-primary-500/40"
          >
            <Download size={16} className="mr-2" />
            Baixar Planilha de Exemplo
          </Button>
        </div>

        {/* Informações sobre a planilha */}
        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h4 className="text-blue-400 font-medium mb-2">📋 Sobre a Planilha de Exemplo</h4>
          <div className="text-sm text-blue-300 space-y-1">
            <p>• A planilha contém todas as colunas necessárias para importação</p>
            <p>• Campos marcados com * são obrigatórios</p>
            <p>• A primeira linha contém um exemplo preenchido</p>
            <p>• Os campos de impostos são ajustados para o regime tributário da empresa</p>
            {regimeTributario === 1 && (
              <p>• <strong>Simples Nacional:</strong> Utiliza CSOSN ao invés de CST</p>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Importações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {!isDataReady ? (
          renderSkeletonCards()
        ) : importacoes.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <FileText size={48} className="text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">Nenhuma importação encontrada</h3>
            <p className="text-gray-500">Clique em "Importar Produtos" para começar</p>
          </div>
        ) : (
          importacoes.map(importacao => (
            <div
              key={importacao.id}
              className="bg-background-card rounded-lg border border-gray-800"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(importacao.status)}
                    <div>
                      <h3 className="text-lg font-medium text-white">{importacao.nome_arquivo}</h3>
                      <p className="text-sm text-gray-400">{getStatusText(importacao.status)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteConfirmation({
                      isOpen: true,
                      itemId: importacao.id,
                      title: 'Excluir Importação',
                      message: `Tem certeza que deseja excluir a importação "${importacao.nome_arquivo}"?`
                    })}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar size={14} />
                    <span>{formatDate(importacao.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <User size={14} />
                    <span>{importacao.usuario_nome}</span>
                  </div>
                  {importacao.etapa_atual && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Tag size={14} />
                      <span>Etapa: {importacao.etapa_atual}</span>
                    </div>
                  )}
                </div>

                {importacao.status === 'processando' && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-400 mb-2">
                      <span>Progresso</span>
                      <span>{importacao.progresso_percentual}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${importacao.progresso_percentual}%` }}
                      />
                    </div>
                    {importacao.mensagem_atual && (
                      <p className="text-sm text-gray-300 mt-2">{importacao.mensagem_atual}</p>
                    )}
                  </div>
                )}

                {importacao.status !== 'processando' && importacao.status !== 'iniciado' && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-white">{importacao.total_linhas}</div>
                      <div className="text-xs text-gray-400">Total Linhas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-400">{importacao.linhas_sucesso}</div>
                      <div className="text-xs text-gray-400">Sucesso</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-blue-400">{importacao.grupos_criados}</div>
                      <div className="text-xs text-gray-400">Grupos Criados</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-400">{importacao.linhas_erro}</div>
                      <div className="text-xs text-gray-400">Erros</div>
                    </div>
                  </div>
                )}

                {importacao.observacoes && (
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-sm text-gray-300">{importacao.observacoes}</p>
                  </div>
                )}

                {importacao.arquivo_download_url && (
                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="text"
                      className="text-primary-400 hover:text-primary-300"
                      onClick={() => window.open(importacao.arquivo_download_url, '_blank')}
                    >
                      <Download size={14} className="mr-2" />
                      Baixar Planilha
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sidebar de Importação */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowSidebar(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed right-0 top-0 h-screen w-full max-w-md bg-background-card border-l border-gray-800 z-50 overflow-y-auto custom-scrollbar"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">Importar Produtos</h2>
                  <button
                    onClick={() => {
                      setShowSidebar(false);
                      setSelectedFile(null);
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Instruções */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <h3 className="text-blue-400 font-medium mb-2">Instruções para Importação</h3>
                    <ul className="text-sm text-blue-300 space-y-1">
                      <li>• Formatos aceitos: .xlsx, .xls, .csv</li>
                      <li>• Tamanho máximo: 25MB (~25.000 produtos)</li>
                      <li>• Processamento em lotes para otimização</li>
                    </ul>
                  </div>

                  {/* Upload de Arquivo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Selecionar Arquivo
                    </label>
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <Upload size={32} className="text-gray-400 mb-2" />
                        <span className="text-gray-400">
                          {selectedFile ? selectedFile.name : 'Clique para selecionar um arquivo'}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          .xlsx, .xls ou .csv (máx. 25MB)
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Botões */}
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="text"
                      className="flex-1"
                      onClick={() => {
                        setShowSidebar(false);
                        setSelectedFile(null);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      className="flex-1"
                      onClick={handleImportarProdutos}
                      disabled={!selectedFile || isUploading}
                    >
                      {isUploading ? 'Processando...' : 'Importar'}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Exclusão */}
      <AnimatePresence>
        <DeleteConfirmation
          isOpen={deleteConfirmation.isOpen}
          onClose={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
          onConfirm={() => {
            handleDeleteImportacao(deleteConfirmation.itemId);
            setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
          }}
          title={deleteConfirmation.title}
          message={deleteConfirmation.message}
        />
      </AnimatePresence>

      {/* Modal de Processamento */}
      <AnimatePresence>
        <ProcessingModal
          isOpen={showProcessingModal}
          message={processingMessage}
        />
      </AnimatePresence>
    </div>
  );
};

export default ImportarProdutosPage;
