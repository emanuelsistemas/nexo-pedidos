import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Download, FileText, Calendar, User, AlertCircle, CheckCircle, Clock, Trash2, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../../components/comum/Button';
import { showMessage } from '../../utils/toast';
import * as XLSX from 'xlsx';

interface ImportacaoHistorico {
  id: string;
  nome_arquivo: string;
  data_importacao: string;
  usuario_nome: string;
  status: 'processando' | 'concluida' | 'erro';
  total_produtos: number;
  produtos_importados: number;
  produtos_com_erro: number;
  observacoes?: string;
  arquivo_url?: string;
  empresa_id: string;
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

      // Buscar importações reais do banco de dados
      // Por enquanto, como a tabela ainda não existe, vamos retornar array vazio
      // Quando a tabela for criada, substituir por:
      // const { data, error } = await supabase
      //   .from('importacoes_produtos')
      //   .select(`
      //     id,
      //     nome_arquivo,
      //     data_importacao,
      //     status,
      //     total_produtos,
      //     produtos_importados,
      //     produtos_com_erro,
      //     observacoes,
      //     arquivo_url,
      //     usuarios!inner(nome)
      //   `)
      //   .eq('empresa_id', empresaId)
      //   .order('data_importacao', { ascending: false });

      // if (error) throw error;

      // const importacoesFormatadas = data?.map(item => ({
      //   ...item,
      //   usuario_nome: item.usuarios.nome,
      //   empresa_id: empresaId
      // })) || [];

      // setImportacoes(importacoesFormatadas);

      // Por enquanto, retornar array vazio até a tabela ser criada
      setImportacoes([]);
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

    try {
      setIsUploading(true);

      // Aqui será implementado o upload e processamento real do arquivo
      // Por enquanto, apenas mostrar mensagem informativa

      showMessage('Funcionalidade de importação será implementada em breve. Backend em desenvolvimento.', 'info');

      setSelectedFile(null);
      setShowSidebar(false);

    } catch (error) {
      console.error('Erro ao importar produtos:', error);
      showMessage('Erro ao processar arquivo', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImportacao = async (id: string) => {
    try {
      // Aqui você implementaria a exclusão no banco
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
                    <span>{formatDate(importacao.data_importacao)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <User size={14} />
                    <span>{importacao.usuario_nome}</span>
                  </div>
                </div>

                {importacao.status !== 'processando' && (
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-white">{importacao.total_produtos}</div>
                      <div className="text-xs text-gray-400">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-400">{importacao.produtos_importados}</div>
                      <div className="text-xs text-gray-400">Importados</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-400">{importacao.produtos_com_erro}</div>
                      <div className="text-xs text-gray-400">Erros</div>
                    </div>
                  </div>
                )}

                {importacao.observacoes && (
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-sm text-gray-300">{importacao.observacoes}</p>
                  </div>
                )}

                {importacao.arquivo_url && (
                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="text"
                      className="text-primary-400 hover:text-primary-300"
                      onClick={() => window.open(importacao.arquivo_url, '_blank')}
                    >
                      <Download size={14} className="mr-2" />
                      Baixar Arquivo
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
    </div>
  );
};

export default ImportarProdutosPage;
