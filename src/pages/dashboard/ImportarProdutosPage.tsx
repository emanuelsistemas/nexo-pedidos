import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Download, FileText, Calendar, User, AlertCircle, CheckCircle, Clock, Trash2, Tag, AlertTriangle } from 'lucide-react';
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
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importacaoParaReprocessar, setImportacaoParaReprocessar] = useState<string | null>(null);

// Interface para erros de validação
interface ValidationError {
  linha: number;
  coluna: string;
  colunaNumero?: number; // número da coluna na planilha (1-based)
  valor: string;
  erro: string;
  tipo: 'obrigatorio' | 'formato' | 'tamanho' | 'invalido';
}
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
        showMessage('error', '🔐 Ops! Não conseguimos carregar seus dados. Tente fazer login novamente.');
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
      showMessage('error', '📋 Não conseguimos carregar o histórico de importações. Tente atualizar a página.');
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
        showMessage('error', '📄 Arquivo não suportado! Por favor, use apenas planilhas Excel (.xlsx, .xls) ou CSV (.csv)');
        return;
      }

      // Validar tamanho (máximo 25MB - otimizado para ~25.000 produtos)
      const maxSize = 25 * 1024 * 1024; // 25MB - limite técnico otimizado
      if (file.size > maxSize) {
        showMessage('error', '📦 Arquivo muito grande! O limite é 25MB (aproximadamente 25.000 produtos). Tente dividir em planilhas menores.');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleImportarProdutos = async () => {
    if (!selectedFile || !empresaId) return;

    let importacaoId: string | null = null;
    // Armazena os últimos erros de validação para exibir no modal e salvar no log
    let lastValidationErrors: ValidationError[] = [];

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

      // 1. Criar registro de importação ANTES do upload para garantir que sempre temos o registro
      const { data: importacaoData, error: importacaoError } = await supabase
        .from('importacao_produtos')
        .insert({
          empresa_id: empresaId,
          usuario_id: usuarioData.id,
          nome_arquivo: selectedFile.name,
          arquivo_storage_path: '', // Será preenchido após upload bem-sucedido
          arquivo_download_url: '',
          tamanho_arquivo: selectedFile.size,
          status: 'processando',
          etapa_atual: 'enviando_arquivo',
          mensagem_atual: 'Enviando planilha para o servidor...'
        })
        .select('id')
        .single();

      if (importacaoError) throw importacaoError;
      importacaoId = importacaoData.id;

      // Atualizar lista imediatamente para mostrar o novo registro
      await fetchImportacoes();

      // 2. Preparar dados para upload local
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

      // 3. Atualizar registro com informações do upload bem-sucedido
      const downloadUrl = `/backend/public/download-planilha.php?file=${encodeURIComponent(uploadResult.filePath)}&empresa=${empresaId}`;

      await supabase
        .from('importacao_produtos')
        .update({
          arquivo_storage_path: uploadResult.filePath,
          arquivo_download_url: downloadUrl,
          etapa_atual: 'arquivo_enviado',
          mensagem_atual: 'Arquivo enviado com sucesso, iniciando processamento...'
        })
        .eq('id', importacaoId);

      // 4. Atualizar progresso - lendo arquivo
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

      // 4. Validar dados da planilha
      setProcessingMessage('Validando dados da planilha...');

      await supabase
        .from('importacao_produtos')
        .update({
          total_linhas: rows.length,
          etapa_atual: 'validando_dados',
          mensagem_atual: 'Validando dados da planilha...',
          progresso_percentual: 15
        })
        .eq('id', importacaoId);

      const { linhasValidas, erros } = await validarDadosPlanilha(rows, empresaId);
      lastValidationErrors = erros;

      // Atualizar contadores de validação
      await supabase
        .from('importacao_produtos')
        .update({
          linhas_sucesso: linhasValidas.length,
          linhas_erro: erros.length,
          log_erros: erros.length > 0 ? erros : null,
          etapa_atual: 'processando_grupos',
          mensagem_atual: `Validação concluída. ${linhasValidas.length} linhas válidas, ${erros.length} com erro.`,
          progresso_percentual: 20
        })
        .eq('id', importacaoId);

      // Se não há linhas válidas, parar o processamento
      if (linhasValidas.length === 0) {
        // Disparar modal com lista de erros detalhada
        setValidationErrors(erros);
        setShowErrorModal(true);
        throw new Error(`Nenhuma linha válida encontrada. ${erros.length} erros de validação detectados.`);
      }

      // Usar apenas as linhas válidas para processamento
      const rowsParaProcessar = linhasValidas;

      // 5. Processar grupos únicos das linhas válidas
      setProcessingMessage('Analisando e criando grupos de produtos...');

      const gruposUnicos = new Set<string>();
      rowsParaProcessar.forEach(row => {
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
      showMessage('success', '🎉 Perfeito! Sua planilha foi importada e os grupos de produtos foram criados com sucesso!');

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
              log_erros: lastValidationErrors.length ? lastValidationErrors : [
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

        // Atualizar lista para mostrar o erro registrado
        await fetchImportacoes();
      }

      showMessage('error', `❌ Ops! Algo deu errado durante a importação: ${error.message}. Verifique sua planilha e tente novamente.`);
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
      showMessage('success', '🗑️ Importação removida com sucesso! O histórico foi atualizado.');
    } catch (error) {
      console.error('Erro ao excluir importação:', error);
      showMessage('error', '❌ Não conseguimos excluir esta importação. Tente novamente em alguns instantes.');
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

  // Função para validar dados da planilha
  const validarDadosPlanilha = async (rows: any[][], empresaId: string): Promise<{ linhasValidas: any[][], erros: ValidationError[] }> => {
    const erros: ValidationError[] = [];
    const linhasValidas: any[][] = [];

    // Definir campos obrigatórios e suas posições
    const camposObrigatorios = [
      { posicao: 0, nome: 'GRUPO', tipo: 'texto' },
      { posicao: 1, nome: 'Código do Produto', tipo: 'codigo' },
      { posicao: 3, nome: 'Nome do Produto', tipo: 'texto' },
      { posicao: 4, nome: 'Unidade de Medida', tipo: 'texto' },
      { posicao: 7, nome: 'Preço Padrão', tipo: 'preco_obrigatorio' },
      { posicao: 10, nome: 'Produto Alcoólico', tipo: 'boolean' },
      { posicao: 11, nome: 'Este produto é Pizza?', tipo: 'boolean' },
      { posicao: 12, nome: 'Matéria prima', tipo: 'boolean' },
      { posicao: 13, nome: 'Produção', tipo: 'boolean' },
      { posicao: 14, nome: 'NCM', tipo: 'texto' },
      { posicao: 15, nome: 'CFOP', tipo: 'cfop' },
      { posicao: 16, nome: 'CSOSN/CST', tipo: 'csosn_cst' },
      { posicao: 18, nome: 'Origem do Produto', tipo: 'numero' },
      { posicao: 19, nome: 'Alíquota ICMS (%)', tipo: 'numero' },
      { posicao: 20, nome: 'Alíquota PIS (%)', tipo: 'numero' },
      { posicao: 21, nome: 'Alíquota COFINS (%)', tipo: 'numero' },
      { posicao: 22, nome: 'Peso Líquido (kg)', tipo: 'numero' }
    ];

    // Buscar códigos de produtos e códigos de barras já existentes na empresa
    const { data: produtosExistentes, error: produtosError } = await supabase
      .from('produtos')
      .select('codigo, codigo_barras')
      .eq('empresa_id', empresaId)
      .eq('deletado', false);

    if (produtosError) {
      throw new Error(`Erro ao consultar produtos existentes: ${produtosError.message}`);
    }

    // Buscar unidades de medida cadastradas na empresa
    // COMENTADO: Tabela unidades_medida não existe ainda, aceitar qualquer unidade por enquanto
    // const { data: unidadesExistentes, error: unidadesError } = await supabase
    //   .from('unidades_medida')
    //   .select('sigla')
    //   .eq('empresa_id', empresaId)
    //   .eq('deletado', false);

    // if (unidadesError) {
    //   throw new Error(`Erro ao consultar unidades de medida: ${unidadesError.message}`);
    // }

    // Por enquanto, aceitar qualquer unidade de medida
    const unidadesExistentes: any[] = [];

    // Criar sets com códigos existentes para busca rápida
    const codigosExistentes = new Set(
      produtosExistentes?.map(p => p.codigo.toString()) || []
    );

    const codigosBarrasExistentes = new Set(
      produtosExistentes
        ?.filter(p => p.codigo_barras) // Filtrar apenas produtos que têm código de barras
        ?.map(p => p.codigo_barras.toString()) || []
    );

    // Criar set com unidades de medida existentes para busca rápida
    const unidadesMedidaExistentes = new Set(
      unidadesExistentes?.map(u => u.sigla.toUpperCase()) || []
    );

    // Criar sets para detectar duplicados dentro da própria planilha
    const codigosPlanilha = new Set<string>();
    const codigosBarrasPlanilha = new Set<string>();

    rows.forEach((row, index) => {
      const numeroLinha = index + 2; // +2 porque começamos da linha 2 (após cabeçalho)
      let linhaTemErro = false;

      // Verificar se a linha não está completamente vazia
      const linhaVazia = row.every(cell => !cell || cell.toString().trim() === '');
      if (linhaVazia) {
        return; // Ignorar linhas vazias
      }

      // Validar campos obrigatórios
      camposObrigatorios.forEach(campo => {
        const valor = row[campo.posicao];
        const valorString = valor ? valor.toString().trim() : '';
        const numeroColuna = campo.posicao + 1; // 1-based para o usuário

        // Verificar se campo obrigatório está vazio
        if (!valorString) {
          erros.push({
            linha: numeroLinha,
            coluna: campo.nome,
            colunaNumero: numeroColuna,
            valor: '',
            erro: `Campo obrigatório não preenchido (Coluna ${numeroColuna}, Linha ${numeroLinha})`,
            tipo: 'obrigatorio'
          });
          linhaTemErro = true;
          return;
        }

        // Validações específicas por tipo
        if (campo.tipo === 'numero') {
          const numero = parseFloat(valorString.replace(',', '.'));
          if (isNaN(numero) || numero < 0) {
            erros.push({
              linha: numeroLinha,
              coluna: campo.nome,
              colunaNumero: numeroColuna,
              valor: valorString,
              erro: `Deve ser um número válido maior ou igual a zero (Coluna ${numeroColuna}, Linha ${numeroLinha})`,
              tipo: 'formato'
            });
            linhaTemErro = true;
          }
        }

        if (campo.tipo === 'preco_obrigatorio') {
          // Preço Padrão é obrigatório como campo, mas pode ser 0,00
          const numero = parseFloat(valorString.replace(',', '.'));
          if (isNaN(numero) || numero < 0) {
            erros.push({
              linha: numeroLinha,
              coluna: campo.nome,
              colunaNumero: numeroColuna,
              valor: valorString,
              erro: `Deve ser um número válido maior ou igual a zero (pode ser 0,00) (Coluna ${numeroColuna}, Linha ${numeroLinha})`,
              tipo: 'formato'
            });
            linhaTemErro = true;
          }
        }

        if (campo.tipo === 'codigo') {
          // Validar se contém apenas números (sem caracteres especiais)
          if (!/^\d+$/.test(valorString)) {
            erros.push({
              linha: numeroLinha,
              coluna: campo.nome,
              colunaNumero: numeroColuna,
              valor: valorString,
              erro: `Código deve conter apenas números, sem caracteres especiais (Coluna ${numeroColuna}, Linha ${numeroLinha})`,
              tipo: 'formato'
            });
            linhaTemErro = true;
          } else {
            // Verificar se código já existe no banco de dados
            if (codigosExistentes.has(valorString)) {
              erros.push({
                linha: numeroLinha,
                coluna: campo.nome,
                colunaNumero: numeroColuna,
                valor: valorString,
                erro: `Código já existe na empresa. Use um código único (Coluna ${numeroColuna}, Linha ${numeroLinha})`,
                tipo: 'invalido'
              });
              linhaTemErro = true;
            }
            // Verificar se código está duplicado dentro da própria planilha
            else if (codigosPlanilha.has(valorString)) {
              erros.push({
                linha: numeroLinha,
                coluna: campo.nome,
                colunaNumero: numeroColuna,
                valor: valorString,
                erro: `Código duplicado na planilha. Cada código deve ser único (Coluna ${numeroColuna}, Linha ${numeroLinha})`,
                tipo: 'invalido'
              });
              linhaTemErro = true;
            } else {
              // Adicionar código ao set para detectar duplicatas futuras
              codigosPlanilha.add(valorString);
            }
          }
        }

        if (campo.tipo === 'texto') {
          // Validar tamanho mínimo
          if (valorString.length < 1) {
            erros.push({
              linha: numeroLinha,
              coluna: campo.nome,
              colunaNumero: numeroColuna,
              valor: valorString,
              erro: `Texto muito curto (Coluna ${numeroColuna}, Linha ${numeroLinha})`,
              tipo: 'tamanho'
            });
            linhaTemErro = true;
          }

          // Validar tamanho máximo
          if (valorString.length > 255) {
            erros.push({
              linha: numeroLinha,
              coluna: campo.nome,
              colunaNumero: numeroColuna,
              valor: valorString.substring(0, 50) + '...',
              erro: `Texto muito longo (máximo 255 caracteres) (Coluna ${numeroColuna}, Linha ${numeroLinha})`,
              tipo: 'tamanho'
            });
            linhaTemErro = true;
          }

          // Validações específicas para Unidade de Medida
          if (campo.nome === 'Unidade de Medida') {
            // Verificar se tem exatamente 2 dígitos
            if (valorString.length !== 2) {
              erros.push({
                linha: numeroLinha,
                coluna: campo.nome,
                colunaNumero: numeroColuna,
                valor: valorString,
                erro: `Unidade de medida deve ter exatamente 2 caracteres (Coluna ${numeroColuna}, Linha ${numeroLinha})`,
                tipo: 'tamanho'
              });
              linhaTemErro = true;
            } else {
              // Verificar se a unidade existe na empresa
              if (!unidadesMedidaExistentes.has(valorString.toUpperCase())) {
                const unidadesDisponiveis = Array.from(unidadesMedidaExistentes).sort().join(', ');
                erros.push({
                  linha: numeroLinha,
                  coluna: campo.nome,
                  colunaNumero: numeroColuna,
                  valor: valorString,
                  erro: `Unidade de medida não cadastrada na empresa. Unidades disponíveis: ${unidadesDisponiveis || 'Nenhuma cadastrada'} (Coluna ${numeroColuna}, Linha ${numeroLinha})`,
                  tipo: 'invalido'
                });
                linhaTemErro = true;
              }
            }
          }

          // Validações específicas para Nome do Produto
          if (campo.nome === 'Nome do Produto') {
            const valorOriginal = valor ? valor.toString() : '';

            // Verificar espaços no início ou fim
            if (valorOriginal !== valorOriginal.trim()) {
              erros.push({
                linha: numeroLinha,
                coluna: campo.nome,
                valor: `"${valorOriginal}"`,
                erro: 'Nome não pode ter espaços no início ou fim',
                tipo: 'formato'
              });
              linhaTemErro = true;
            }

            // Verificar espaços duplicados
            if (/\s{2,}/.test(valorString)) {
              erros.push({
                linha: numeroLinha,
                coluna: campo.nome,
                valor: valorString,
                erro: 'Nome não pode ter espaços duplicados',
                tipo: 'formato'
              });
              linhaTemErro = true;
            }

            // Verificar caracteres especiais proibidos
            const caracteresProibidos = /[@#$%&*()+=\[\]{}|\\:";'<>?,./]/;
            if (caracteresProibidos.test(valorString)) {
              const caracteresEncontrados = valorString.match(caracteresProibidos);
              erros.push({
                linha: numeroLinha,
                coluna: campo.nome,
                valor: valorString,
                erro: `Contém caracteres especiais não permitidos: ${caracteresEncontrados?.join(', ')}`,
                tipo: 'invalido'
              });
              linhaTemErro = true;
            }
          }
        }

        if (campo.tipo === 'boolean') {
          // Validar se é true ou false (aceitar variações)
          const valorLower = valorString.toLowerCase();
          if (!['true', 'false', '1', '0', 'sim', 'não', 'nao', 's', 'n'].includes(valorLower)) {
            erros.push({
              linha: numeroLinha,
              coluna: campo.nome,
              valor: valorString,
              erro: 'Deve ser: true/false, 1/0, sim/não, s/n',
              tipo: 'formato'
            });
            linhaTemErro = true;
          }
        }

        if (campo.tipo === 'cfop') {
          // Validar CFOP: deve ter 4 dígitos e ser 5102 ou 5405
          if (!/^\d{4}$/.test(valorString)) {
            erros.push({
              linha: numeroLinha,
              coluna: campo.nome,
              valor: valorString,
              erro: 'CFOP deve ter exatamente 4 dígitos',
              tipo: 'formato'
            });
            linhaTemErro = true;
          } else if (!['5102', '5405'].includes(valorString)) {
            erros.push({
              linha: numeroLinha,
              coluna: campo.nome,
              valor: valorString,
              erro: 'CFOP deve ser 5102 ou 5405',
              tipo: 'invalido'
            });
            linhaTemErro = true;
          }
        }

        if (campo.tipo === 'csosn_cst') {
          // Obter CFOP da linha atual (posição 15)
          const cfopAtual = row[15] ? row[15].toString().trim() : '';

          // Validar CSOSN/CST baseado no CFOP e regime tributário
          if (cfopAtual === '5102') {
            // CFOP 5102: CSOSN = 102 (Simples Nacional) ou CST = 00 (Regime Normal)
            const valorEsperado = regimeTributario === 1 ? '102' : '00';
            if (valorString !== valorEsperado) {
              const tipoTributo = regimeTributario === 1 ? 'CSOSN' : 'CST';
              erros.push({
                linha: numeroLinha,
                coluna: campo.nome,
                valor: valorString,
                erro: `Para CFOP 5102, ${tipoTributo} deve ser ${valorEsperado}`,
                tipo: 'invalido'
              });
              linhaTemErro = true;
            }
          } else if (cfopAtual === '5405') {
            // CFOP 5405: CSOSN = 500 (Simples Nacional) ou CST = 60 (Regime Normal)
            const valorEsperado = regimeTributario === 1 ? '500' : '60';
            if (valorString !== valorEsperado) {
              const tipoTributo = regimeTributario === 1 ? 'CSOSN' : 'CST';
              erros.push({
                linha: numeroLinha,
                coluna: campo.nome,
                valor: valorString,
                erro: `Para CFOP 5405, ${tipoTributo} deve ser ${valorEsperado}`,
                tipo: 'invalido'
              });
              linhaTemErro = true;
            }
          }
        }
      });

      // Validação específica para código de barras (posição 2) - campo opcional
      const codigoBarras = row[2] ? row[2].toString().trim() : '';
      if (codigoBarras) { // Só validar se foi preenchido
        // Verificar se contém apenas números
        if (!/^\d+$/.test(codigoBarras)) {
          erros.push({
            linha: numeroLinha,
            coluna: 'Código de Barras',
            valor: codigoBarras,
            erro: 'Código de barras deve conter apenas números',
            tipo: 'formato'
          });
          linhaTemErro = true;
        } else {
          // Verificar se código de barras já existe no banco de dados
          if (codigosBarrasExistentes.has(codigoBarras)) {
            erros.push({
              linha: numeroLinha,
              coluna: 'Código de Barras',
              valor: codigoBarras,
              erro: 'Código de barras já existe na empresa. Use um código único',
              tipo: 'invalido'
            });
            linhaTemErro = true;
          }
          // Verificar se código de barras está duplicado dentro da própria planilha
          else if (codigosBarrasPlanilha.has(codigoBarras)) {
            erros.push({
              linha: numeroLinha,
              coluna: 'Código de Barras',
              valor: codigoBarras,
              erro: 'Código de barras duplicado na planilha. Cada código deve ser único',
              tipo: 'invalido'
            });
            linhaTemErro = true;
          } else {
            // Adicionar código de barras ao set para detectar duplicatas futuras
            codigosBarrasPlanilha.add(codigoBarras);
          }
        }
      }

      // Validação específica para unidade fracionada (posição 5) - campo opcional
      const unidadeFracionada = row[5] ? row[5].toString().trim().toLowerCase() : '';
      if (unidadeFracionada && !['true', 'false', '1', '0', 'sim', 'não', 'nao', 's', 'n'].includes(unidadeFracionada)) {
        erros.push({
          linha: numeroLinha,
          coluna: 'Unidade fracionada',
          valor: row[5] ? row[5].toString() : '',
          erro: 'Deve ser: true/false, 1/0, sim/não, s/n',
          tipo: 'formato'
        });
        linhaTemErro = true;
      }

      // Validação específica para preço de custo (posição 6) - campo opcional
      const precoCusto = row[6] ? row[6].toString().trim() : '';
      if (precoCusto) { // Só validar se foi preenchido
        const numero = parseFloat(precoCusto.replace(',', '.'));
        if (isNaN(numero) || numero < 0) {
          erros.push({
            linha: numeroLinha,
            coluna: 'Preço de Custo',
            valor: precoCusto,
            erro: 'Deve ser um número válido maior ou igual a zero',
            tipo: 'formato'
          });
          linhaTemErro = true;
        }
      }

      // Descrição Adicional (posição 8) - campo opcional, não precisa de validação
      // Pode ficar vazio ou conter qualquer texto

      // Validação específica para estoque inicial (posição 9) - campo opcional
      const estoqueInicial = row[9] ? row[9].toString().trim() : '';
      if (estoqueInicial) { // Só validar se foi preenchido
        // Obter valor da unidade fracionada (posição 5)
        const unidadeFracionadaValor = row[5] ? row[5].toString().trim().toLowerCase() : '';
        const isUnidadeFracionada = ['true', '1', 'sim', 's'].includes(unidadeFracionadaValor);

        if (isUnidadeFracionada) {
          // Para unidades fracionadas: aceitar decimais com até 3 casas decimais
          const numeroFracionado = parseFloat(estoqueInicial.replace(',', '.'));
          if (isNaN(numeroFracionado) || numeroFracionado < 0) {
            erros.push({
              linha: numeroLinha,
              coluna: 'Estoque Inicial',
              valor: estoqueInicial,
              erro: 'Para unidade fracionada, deve ser um número válido maior ou igual a zero (ex: 2.500)',
              tipo: 'formato'
            });
            linhaTemErro = true;
          } else {
            // Verificar se tem mais de 3 casas decimais
            const parteDecimal = estoqueInicial.replace(',', '.').split('.')[1];
            if (parteDecimal && parteDecimal.length > 3) {
              erros.push({
                linha: numeroLinha,
                coluna: 'Estoque Inicial',
                valor: estoqueInicial,
                erro: 'Para unidade fracionada, máximo 3 casas decimais (ex: 2.500)',
                tipo: 'formato'
              });
              linhaTemErro = true;
            }
          }
        } else {
          // Para unidades não fracionadas: aceitar apenas números inteiros
          const numeroInteiro = parseInt(estoqueInicial);
          if (isNaN(numeroInteiro) || numeroInteiro < 0 || estoqueInicial.includes('.') || estoqueInicial.includes(',')) {
            erros.push({
              linha: numeroLinha,
              coluna: 'Estoque Inicial',
              valor: estoqueInicial,
              erro: 'Para unidade não fracionada, deve ser um número inteiro maior ou igual a zero (ex: 10)',
              tipo: 'formato'
            });
            linhaTemErro = true;
          }
        }
      }

      // Validação específica para CEST (posição 17) - obrigatório apenas se CFOP = 5405
      const cfopAtual = row[15] ? row[15].toString().trim() : '';
      const cest = row[17] ? row[17].toString().trim() : '';

      if (cfopAtual === '5405') {
        // CEST é obrigatório para CFOP 5405
        if (!cest) {
          erros.push({
            linha: numeroLinha,
            coluna: 'CEST',
            valor: '',
            erro: 'CEST é obrigatório quando CFOP = 5405',
            tipo: 'obrigatorio'
          });
          linhaTemErro = true;
        } else if (!/^\d{7}$/.test(cest)) {
          erros.push({
            linha: numeroLinha,
            coluna: 'CEST',
            valor: cest,
            erro: 'CEST deve ter exatamente 7 dígitos',
            tipo: 'formato'
          });
          linhaTemErro = true;
        }
      } else if (cest && !/^\d{7}$/.test(cest)) {
        // Se CEST foi preenchido mas CFOP não é 5405, ainda validar o formato
        erros.push({
          linha: numeroLinha,
          coluna: 'CEST',
          valor: cest,
          erro: 'CEST deve ter exatamente 7 dígitos',
          tipo: 'formato'
        });
        linhaTemErro = true;
      }

      // Se a linha não tem erros, adicionar às linhas válidas
      if (!linhaTemErro) {
        linhasValidas.push(row);
      }
    });

    return { linhasValidas, erros };
  };

  // Função para reprocessar uma importação existente
  const handleReprocessarImportacao = async (importacaoId: string) => {
    try {
      setIsUploading(true);
      setShowProcessingModal(true);
      setProcessingMessage('Reprocessando importação...');

      // Buscar dados da importação
      const { data: importacao, error: importacaoError } = await supabase
        .from('importacao_produtos')
        .select('arquivo_storage_path, nome_arquivo, empresa_id')
        .eq('id', importacaoId)
        .single();

      if (importacaoError) throw importacaoError;

      // Ler arquivo do storage local
      const downloadUrl = `/backend/public/download-planilha.php?file=${encodeURIComponent(importacao.arquivo_storage_path)}&empresa=${importacao.empresa_id}`;
      const response = await fetch(downloadUrl);

      if (!response.ok) {
        throw new Error('Erro ao acessar arquivo da importação');
      }

      // Converter resposta para ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();

      // Processar arquivo Excel
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Remover cabeçalho
      const rows = data.slice(1) as any[][];

      if (rows.length === 0) {
        throw new Error('Planilha está vazia ou não contém dados válidos');
      }

      // Atualizar status para reprocessando
      await supabase
        .from('importacao_produtos')
        .update({
          status: 'processando',
          etapa_atual: 'reprocessando',
          mensagem_atual: 'Reprocessando dados...',
          progresso_percentual: 10,
          log_erros: null,
          linhas_sucesso: 0,
          linhas_erro: 0
        })
        .eq('id', importacaoId);

      // Validar dados novamente
      setProcessingMessage('Validando dados da planilha...');

      const { linhasValidas, erros } = await validarDadosPlanilha(rows, importacao.empresa_id);

      // Atualizar contadores de validação
      await supabase
        .from('importacao_produtos')
        .update({
          linhas_sucesso: linhasValidas.length,
          linhas_erro: erros.length,
          log_erros: erros.length > 0 ? erros : null,
          etapa_atual: erros.length > 0 ? 'erro' : 'processando_grupos',
          mensagem_atual: erros.length > 0
            ? `Reprocessamento com ${erros.length} erros`
            : `Revalidação concluída. ${linhasValidas.length} linhas válidas.`,
          progresso_percentual: erros.length > 0 ? 100 : 20,
          status: erros.length > 0 ? 'erro' : 'processando'
        })
        .eq('id', importacaoId);

      if (erros.length > 0) {
        setValidationErrors(erros);
        setShowErrorModal(true);
        showMessage('error', `⚠️ Reprocessamento finalizado, mas encontramos ${erros.length} erro(s). Verifique os detalhes e corrija sua planilha.`);
      } else {
        // Continuar com processamento de grupos se não há erros
        setProcessingMessage('Processando grupos...');

        // Aqui continuaria o processamento normal dos grupos
        // Por enquanto, apenas marcar como concluído
        await supabase
          .from('importacao_produtos')
          .update({
            status: 'concluida',
            etapa_atual: 'finalizado',
            mensagem_atual: 'Reprocessamento concluído com sucesso!',
            progresso_percentual: 100,
            finalizado_em: new Date().toISOString()
          })
          .eq('id', importacaoId);

        showMessage('success', '✅ Excelente! O reprocessamento foi concluído com sucesso. Todos os dados estão corretos!');
      }

      // Recarregar lista
      await fetchImportacoes();

    } catch (error: any) {
      console.error('Erro ao reprocessar:', error);
      showMessage('error', `❌ Falha no reprocessamento: ${error.message}. Verifique sua conexão e tente novamente.`);
    } finally {
      setIsUploading(false);
      setShowProcessingModal(false);
      setImportacaoParaReprocessar(null);
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
      'Unidade fracionada',
      'Preço de Custo',
      'Preço Padrão*',
      'Descrição Adicional',
      'Estoque Inicial',
      'Produto Alcoólico*',
      'Este produto é Pizza?*',
      'Matéria prima*',
      'Produção*'
    ];

    const colunasImpostos = [
      'NCM*',
      'CFOP*',
      regimeTributario === 1 ? 'CSOSN* (Simples Nacional)' : 'CST* (Regime Normal)',
      'CEST (Obrigatório se CFOP = 5405)',
      'Origem do Produto*',
      'Alíquota ICMS (%)*',
      'Alíquota PIS (%)*',
      'Alíquota COFINS (%)*',
      'Peso Líquido (kg)*'
    ];

    const todasColunas = [...colunasGerais, ...colunasImpostos];

    // Dados de exemplo - Linha 1 (Coca Cola)
    const exemploGeral1 = [
      'BEBIDAS',
      '1',
      '7891234567890',
      'Coca Cola Lata',
      'UN',
      'false',
      '15.50',
      '35.90',
      '350ml',
      '10',
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
      'true',
      '3.20',
      '6.50',
      'Banana prata fresca',
      '2.500',
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

    // Dados de exemplo - Linha 3 (Produto com CFOP 5405 - CEST obrigatório)
    const exemploGeral3 = [
      'COMBUSTÍVEIS',
      '3',
      '7891234567892',
      'Gasolina Comum',
      'L',
      'true',
      '4.50',
      '5.80',
      'Gasolina comum tipo C',
      '100.000',
      'false',
      'false',
      'false',
      'false'
    ];

    const exemploImpostos3 = [
      '27101259',
      '5405',
      regimeTributario === 1 ? '500' : '60',
      '2800100', // CEST obrigatório para CFOP 5405
      '0',
      '25',
      '10.2',
      '47.04',
      '0.75'
    ];

    const exemploCompleto1 = [...exemploGeral1, ...exemploImpostos1];
    const exemploCompleto2 = [...exemploGeral2, ...exemploImpostos2];
    const exemploCompleto3 = [...exemploGeral3, ...exemploImpostos3];

    // Criar dados para Excel
    const dadosExcel = [
      todasColunas,
      exemploCompleto1,
      exemploCompleto2,
      exemploCompleto3
    ];

    // Criar workbook e worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(dadosExcel);

    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos');

    // Gerar e baixar arquivo Excel
    XLSX.writeFile(workbook, 'planilha_exemplo_produtos_nexo.xlsx');

    showMessage('success', '📥 Perfeito! Sua planilha de exemplo foi baixada. Use-a como modelo para importar seus produtos!');
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
                  <div className="flex items-center gap-2">
                    {/* Botão de Reprocessar - só aparece se há erros */}
                    {importacao.status === 'erro' && importacao.linhas_erro > 0 && (
                      <button
                        onClick={() => handleReprocessarImportacao(importacao.id)}
                        className="text-blue-400 hover:text-blue-300 transition-colors p-1 rounded"
                        title="Reprocessar importação"
                        disabled={isUploading}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                          <path d="M21 3v5h-5"/>
                          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                          <path d="M3 21v-5h5"/>
                        </svg>
                      </button>
                    )}

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
                      <button
                        onClick={() => {
                          if (importacao.log_erros && importacao.log_erros.length > 0) {
                            setValidationErrors(importacao.log_erros);
                            setShowErrorModal(true);
                          }
                        }}
                        className={`text-lg font-semibold transition-colors ${
                          importacao.linhas_erro > 0
                            ? 'text-red-400 hover:text-red-300 cursor-pointer'
                            : 'text-red-400 cursor-default'
                        }`}
                        disabled={!importacao.log_erros || importacao.log_erros.length === 0}
                      >
                        {importacao.linhas_erro}
                      </button>
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

      {/* Modal de Erros de Validação */}
      <AnimatePresence>
        {showErrorModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowErrorModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background-card rounded-lg border border-gray-800 w-full max-w-4xl max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="text-red-400" size={24} />
                    <div>
                      <h3 className="text-xl font-semibold text-white">Erros de Validação na Planilha</h3>
                      <p className="text-gray-400">
                        {validationErrors.length} erro{validationErrors.length !== 1 ? 's' : ''} encontrado{validationErrors.length !== 1 ? 's' : ''} - Verifique as colunas e linhas indicadas
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowErrorModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {/* Resumo dos tipos de erros */}
                <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(() => {
                    const tiposCount = validationErrors.reduce((acc, erro) => {
                      acc[erro.tipo] = (acc[erro.tipo] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);

                    return Object.entries(tiposCount).map(([tipo, count]) => (
                      <div key={tipo} className="bg-gray-800/30 rounded-lg p-3 text-center min-h-[90px]">
                        <div className={`inline-flex p-2 rounded-full mb-2 ${
                          tipo === 'obrigatorio' ? 'bg-red-500/20 text-red-400' :
                          tipo === 'formato' ? 'bg-yellow-500/20 text-yellow-400' :
                          tipo === 'tamanho' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-orange-500/20 text-orange-400'
                        }`}>
                          {tipo === 'obrigatorio' ? <AlertCircle size={16} /> :
                           tipo === 'formato' ? <AlertTriangle size={16} /> :
                           tipo === 'tamanho' ? <FileText size={16} /> :
                           <X size={16} />}
                        </div>
                        <div className="text-white font-semibold text-lg">{count}</div>
                        <div className="text-gray-400 text-xs">
                          {tipo === 'obrigatorio' ? 'Campos Vazios' :
                           tipo === 'formato' ? 'Formato Incorreto' :
                           tipo === 'tamanho' ? 'Tamanho Incorreto' :
                           'Valores Inválidos'}
                        </div>
                      </div>
                    ));
                  })()}
                </div>

                {/* Lista detalhada de erros */}
                <div className="space-y-4">
                  <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                    <FileText size={16} />
                    Localização Exata dos Erros na Planilha
                  </h4>
                  {validationErrors.map((erro, index) => (
                    <div
                      key={index}
                      className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-1 rounded ${
                          erro.tipo === 'obrigatorio' ? 'bg-red-500/20 text-red-400' :
                          erro.tipo === 'formato' ? 'bg-yellow-500/20 text-yellow-400' :
                          erro.tipo === 'tamanho' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-orange-500/20 text-orange-400'
                        }`}>
                          {erro.tipo === 'obrigatorio' ? <AlertCircle size={16} /> :
                           erro.tipo === 'formato' ? <AlertTriangle size={16} /> :
                           erro.tipo === 'tamanho' ? <FileText size={16} /> :
                           <X size={16} />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-sm font-mono">
                              Coluna {(() => {
                                // Mapear nome da coluna para número da posição
                                const colunaParaPosicao: Record<string, number> = {
                                  'GRUPO': 1,
                                  'Código do Produto': 2,
                                  'Código de Barras': 3,
                                  'Nome do Produto': 4,
                                  'Unidade de Medida': 5,
                                  'Unidade fracionada': 6,
                                  'Preço de Custo': 7,
                                  'Preço Padrão': 8,
                                  'Descrição Adicional': 9,
                                  'Estoque Inicial': 10,
                                  'Produto Alcoólico': 11,
                                  'Este produto é Pizza?': 12,
                                  'Matéria prima': 13,
                                  'Produção': 14,
                                  'NCM': 15,
                                  'CFOP': 16,
                                  'CSOSN/CST': 17,
                                  'CEST': 18,
                                  'Origem do Produto': 19,
                                  'Alíquota ICMS (%)': 20,
                                  'Alíquota PIS (%)': 21,
                                  'Alíquota COFINS (%)': 22,
                                  'Peso Líquido (kg)': 23
                                };
                                return colunaParaPosicao[erro.coluna] || '?';
                              })()}
                            </div>
                            <div className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-sm font-mono">
                              Linha {erro.linha}
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              erro.tipo === 'obrigatorio' ? 'bg-red-500/20 text-red-400' :
                              erro.tipo === 'formato' ? 'bg-yellow-500/20 text-yellow-400' :
                              erro.tipo === 'tamanho' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-orange-500/20 text-orange-400'
                            }`}>
                              {erro.tipo === 'obrigatorio' ? 'Campo Obrigatório' :
                               erro.tipo === 'formato' ? 'Formato Inválido' :
                               erro.tipo === 'tamanho' ? 'Tamanho Inválido' :
                               'Valor Inválido'}
                            </span>
                          </div>

                          <div className="mb-2">
                            <span className="text-gray-400 text-xs font-medium">CAMPO:</span>
                            <p className="text-white text-sm font-medium">{erro.coluna}</p>
                          </div>

                          <div className="mb-3">
                            <span className="text-gray-400 text-xs font-medium">PROBLEMA:</span>
                            <p className="text-red-400 text-sm">{erro.erro}</p>
                          </div>

                          {erro.valor && (
                            <div className="bg-gray-900/50 rounded px-3 py-2">
                              <span className="text-gray-400 text-xs font-medium">VALOR ENCONTRADO:</span>
                              <p className="text-gray-300 text-sm font-mono break-all mt-1">
                                {erro.valor || '[vazio]'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-gray-800">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="text-gray-400 text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle size={16} className="text-yellow-400" />
                      <span className="font-medium text-yellow-400">Como corrigir:</span>
                    </div>
                    <ul className="space-y-1 text-xs">
                      <li>• Baixe a planilha de exemplo para ver o formato correto</li>
                      <li>• Corrija os erros listados acima em sua planilha</li>
                      <li>• Salve o arquivo e tente importar novamente</li>
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setShowErrorModal(false);
                        gerarPlanilhaExemplo();
                      }}
                      className="text-sm"
                    >
                      Baixar Exemplo
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => setShowErrorModal(false)}
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImportarProdutosPage;
