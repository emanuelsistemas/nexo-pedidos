import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Download, FileText, Calendar, User, AlertCircle, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../../components/comum/Button';
import { showMessage } from '../../utils/toast';

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
      
      // Simular busca no banco - aqui você implementaria a consulta real
      // Por enquanto, vamos usar dados mockados
      const mockData: ImportacaoHistorico[] = [
        {
          id: '1',
          nome_arquivo: 'produtos_janeiro_2025.xlsx',
          data_importacao: '2025-01-15T10:30:00Z',
          usuario_nome: usuarioNome,
          status: 'concluida',
          total_produtos: 150,
          produtos_importados: 145,
          produtos_com_erro: 5,
          observacoes: 'Importação concluída com sucesso. 5 produtos com código duplicado.',
          empresa_id: empresaId
        },
        {
          id: '2',
          nome_arquivo: 'produtos_dezembro_2024.csv',
          data_importacao: '2024-12-20T14:15:00Z',
          usuario_nome: usuarioNome,
          status: 'erro',
          total_produtos: 200,
          produtos_importados: 0,
          produtos_com_erro: 200,
          observacoes: 'Erro no formato do arquivo. Verifique as colunas obrigatórias.',
          empresa_id: empresaId
        }
      ];

      setImportacoes(mockData);
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

      // Validar tamanho (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        showMessage('Arquivo muito grande. Tamanho máximo: 10MB', 'error');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleImportarProdutos = async () => {
    if (!selectedFile || !empresaId) return;

    try {
      setIsUploading(true);

      // Aqui você implementaria o upload e processamento do arquivo
      // Por enquanto, vamos simular o processo
      
      showMessage('Arquivo enviado com sucesso! Processamento iniciado.', 'success');
      
      // Simular adição de nova importação
      const novaImportacao: ImportacaoHistorico = {
        id: Date.now().toString(),
        nome_arquivo: selectedFile.name,
        data_importacao: new Date().toISOString(),
        usuario_nome: usuarioNome,
        status: 'processando',
        total_produtos: 0,
        produtos_importados: 0,
        produtos_com_erro: 0,
        observacoes: 'Processamento em andamento...',
        empresa_id: empresaId
      };

      setImportacoes(prev => [novaImportacao, ...prev]);
      setSelectedFile(null);
      setShowSidebar(false);

      // Simular conclusão após 3 segundos
      setTimeout(() => {
        setImportacoes(prev => prev.map(imp => 
          imp.id === novaImportacao.id 
            ? { ...imp, status: 'concluida', total_produtos: 50, produtos_importados: 48, produtos_com_erro: 2, observacoes: 'Importação concluída com sucesso!' }
            : imp
        ));
        showMessage('Importação concluída com sucesso!', 'success');
      }, 3000);

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
                      <li>• Tamanho máximo: 10MB</li>
                      <li>• Colunas obrigatórias: nome, preco, codigo</li>
                      <li>• Colunas opcionais: descricao, grupo, ativo</li>
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
                          .xlsx, .xls ou .csv (máx. 10MB)
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
