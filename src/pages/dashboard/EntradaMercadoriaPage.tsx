import React, { useState, useEffect } from 'react';
import { Plus, Edit, Eye, Search, Filter, ArrowLeft, Save, Trash2, X, MoreVertical, Package, Calendar, FileText, Upload, FileInput } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/comum/Button';
import FornecedorDropdown from '../../components/comum/FornecedorDropdown';
import ClienteFormCompleto from '../../components/comum/ClienteFormCompleto';
import { supabase } from '../../lib/supabase';
import { showMessage } from '../../utils/toast';

interface EntradaMercadoria {
  id: string;
  numero_documento: string;
  fornecedor_nome: string;
  fornecedor_cnpj: string;
  data_entrada: string;
  valor_total: number;
  status: 'pendente' | 'processada' | 'cancelada';
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

const EntradaMercadoriaPage: React.FC = () => {
  const [entradas, setEntradas] = useState<EntradaMercadoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
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

  // Função para carregar entradas de mercadoria
  const loadEntradas = async () => {
    try {
      setIsLoading(true);
      
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

      // Por enquanto, vamos simular dados até implementar a tabela no banco
      const mockData: EntradaMercadoria[] = [
        {
          id: '1',
          numero_documento: 'ENT-001',
          fornecedor_nome: 'Fornecedor ABC Ltda',
          fornecedor_cnpj: '12.345.678/0001-90',
          data_entrada: '2025-01-28',
          valor_total: 1500.00,
          status: 'processada',
          observacoes: 'Entrada de produtos diversos',
          created_at: '2025-01-28T10:00:00',
          updated_at: '2025-01-28T10:00:00'
        },
        {
          id: '2',
          numero_documento: 'ENT-002',
          fornecedor_nome: 'Distribuidora XYZ S.A.',
          fornecedor_cnpj: '98.765.432/0001-10',
          data_entrada: '2025-01-29',
          valor_total: 2800.50,
          status: 'pendente',
          observacoes: 'Aguardando conferência',
          created_at: '2025-01-29T14:30:00',
          updated_at: '2025-01-29T14:30:00'
        }
      ];

      setEntradas(mockData);
    } catch (error) {
      console.error('Erro ao carregar entradas:', error);
      showMessage('error', 'Erro ao carregar entradas de mercadoria');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEntradas();
  }, []);

  // Função para filtrar entradas
  const filteredEntradas = entradas.filter(entrada => {
    const matchesSearch = 
      entrada.numero_documento.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entrada.fornecedor_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entrada.fornecedor_cnpj.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'todos' || entrada.status === statusFilter;
    
    const dataEntrada = new Date(entrada.data_entrada);
    const dataInicio = new Date(dataInicioFilter);
    const dataFim = new Date(dataFimFilter);
    
    const matchesData = dataEntrada >= dataInicio && dataEntrada <= dataFim;
    
    return matchesSearch && matchesStatus && matchesData;
  });

  // Função para formatar status
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendente: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Pendente' },
      processada: { color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Processada' },
      cancelada: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Cancelada' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Função para nova entrada
  const handleNovaEntrada = () => {
    setShowModal(true);
  };

  // Função para limpar filtros
  const limparFiltros = () => {
    setSearchTerm('');
    setStatusFilter('todos');
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
    trintaDiasAtras.setHours(0, 0, 0, 0);
    setDataInicioFilter(trintaDiasAtras.toISOString().slice(0, 16));
    
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    setDataFimFilter(hoje.toISOString().slice(0, 16));
  };



  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Entrada de Mercadoria</h1>
          <p className="text-gray-400">Gerencie as entradas de mercadorias no estoque</p>
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

          {/* Botão Nova Entrada */}
          <Button
            variant="primary"
            onClick={handleNovaEntrada}
            className="flex items-center gap-2"
          >
            <Plus size={20} />
            Nova Entrada
          </Button>
        </div>
      </div>

      {/* Filtros Avançados */}
      <AnimatePresence>
        {showAdvancedFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-background-card rounded-lg border border-gray-700 p-4 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Filtro por Status */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="pendente">Pendente</option>
                  <option value="processada">Processada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>

              {/* Data Início */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Data Início</label>
                <input
                  type="datetime-local"
                  value={dataInicioFilter}
                  onChange={(e) => setDataInicioFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Data Fim */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Data Fim</label>
                <input
                  type="datetime-local"
                  value={dataFimFilter}
                  onChange={(e) => setDataFimFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Botão Limpar */}
              <div className="flex items-end">
                <Button
                  variant="secondary"
                  onClick={limparFiltros}
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barra de Pesquisa */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Pesquisar por número, fornecedor ou CNPJ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-background-card border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Lista de Entradas */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : filteredEntradas.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">Nenhuma entrada encontrada</h3>
          <p className="text-gray-400 mb-4">
            {searchTerm || statusFilter !== 'todos' ? 'Tente ajustar os filtros de pesquisa' : 'Comece criando sua primeira entrada de mercadoria'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredEntradas.map((entrada) => (
            <motion.div
              key={entrada.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-background-card border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{entrada.numero_documento}</h3>
                    {getStatusBadge(entrada.status)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Fornecedor:</span>
                      <p className="text-white font-medium">{entrada.fornecedor_nome}</p>
                      <p className="text-gray-300">{entrada.fornecedor_cnpj}</p>
                    </div>
                    
                    <div>
                      <span className="text-gray-400">Data de Entrada:</span>
                      <p className="text-white">{new Date(entrada.data_entrada).toLocaleDateString('pt-BR')}</p>
                    </div>
                    
                    <div>
                      <span className="text-gray-400">Valor Total:</span>
                      <p className="text-white font-medium">
                        R$ {entrada.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  
                  {entrada.observacoes && (
                    <div className="mt-2">
                      <span className="text-gray-400 text-sm">Observações:</span>
                      <p className="text-gray-300 text-sm">{entrada.observacoes}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <button
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    title="Visualizar"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal de Nova Entrada */}
      <AnimatePresence>
        {showModal && (
          <EntradaMercadoriaModal
            onClose={() => setShowModal(false)}
            onSave={loadEntradas}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Modal de Nova Entrada de Mercadoria com abas
const EntradaMercadoriaModal: React.FC<{ onClose: () => void; onSave: () => void }> = ({ onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'xml'>('manual');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 backdrop-blur-sm z-[9999]"
      onClick={onClose}
      style={{ margin: 0, padding: 0 }}
    >
      <motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.98, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full h-full bg-background-card flex flex-col"
        style={{ margin: 0, padding: 0, minHeight: '100vh', minWidth: '100vw' }}
      >
        {/* Header do Modal */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-700">
          <h1 className="text-xl font-bold text-white">Nova Entrada de Mercadoria</h1>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-4 py-2.5 font-medium transition-colors border-b-2 ${
              activeTab === 'manual'
                ? 'text-primary-400 border-primary-500 bg-primary-500/10'
                : 'text-gray-400 border-transparent hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <Package size={18} />
            Entrada Manual
          </button>
          <button
            onClick={() => setActiveTab('xml')}
            className={`flex items-center gap-2 px-4 py-2.5 font-medium transition-colors border-b-2 ${
              activeTab === 'xml'
                ? 'text-primary-400 border-primary-500 bg-primary-500/10'
                : 'text-gray-400 border-transparent hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <FileInput size={18} />
            Entrada por XML
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'manual' && <EntradaManualTab onClose={onClose} onSave={onSave} />}
          {activeTab === 'xml' && <EntradaXMLTab onClose={onClose} onSave={onSave} />}
        </div>
      </motion.div>
    </motion.div>
  );
};

// Aba de Entrada Manual
const EntradaManualTab: React.FC<{ onClose: () => void; onSave: () => void }> = ({ onClose, onSave }) => {
  // Estados do formulário
  const [empresaId, setEmpresaId] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [fornecedorNome, setFornecedorNome] = useState('');
  const [fornecedorDocumento, setFornecedorDocumento] = useState('');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [dataEntrada, setDataEntrada] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().slice(0, 10);
  });
  const [observacoes, setObservacoes] = useState('');
  const [showNovoFornecedorModal, setShowNovoFornecedorModal] = useState(false);

  // Carregar empresa do usuário
  useEffect(() => {
    const loadEmpresaId = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('empresa_id')
          .eq('id', userData.user.id)
          .single();

        if (usuarioData?.empresa_id) {
          setEmpresaId(usuarioData.empresa_id);
        }
      } catch (error) {
        console.error('Erro ao carregar empresa:', error);
      }
    };

    loadEmpresaId();
  }, []);

  const handleFornecedorChange = (
    id: string,
    nome: string,
    documento?: string,
    dadosCompletos?: any
  ) => {
    setFornecedorId(id);
    setFornecedorNome(nome);
    setFornecedorDocumento(documento || '');
  };

  const handleNovoFornecedor = () => {
    setShowNovoFornecedorModal(true);
  };

  const handleFornecedorCreated = (fornecedorId: string, fornecedorNome: string, fornecedorDocumento?: string) => {
    setFornecedorId(fornecedorId);
    setFornecedorNome(fornecedorNome);
    setFornecedorDocumento(fornecedorDocumento || '');
    setShowNovoFornecedorModal(false);
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Dados do Fornecedor */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Package size={18} />
            Dados do Fornecedor
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nome/Razão Social *
              </label>
              <FornecedorDropdown
                value={fornecedorId}
                onChange={handleFornecedorChange}
                empresaId={empresaId}
                placeholder="Selecione um fornecedor"
                required
                onNovoFornecedor={handleNovoFornecedor}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                CNPJ/CPF
              </label>
              <input
                type="text"
                value={fornecedorDocumento}
                readOnly
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 cursor-not-allowed"
                placeholder="Será preenchido automaticamente"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Número do Documento *
              </label>
              <input
                type="text"
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Número da nota fiscal"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Data de Entrada *
              </label>
              <input
                type="date"
                value={dataEntrada}
                onChange={(e) => setDataEntrada(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        </div>

        {/* Produtos */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Package size={18} />
              Produtos
            </h3>
            <Button variant="primary" size="sm">
              <Plus size={16} className="mr-2" />
              Adicionar Produto
            </Button>
          </div>

          <div className="text-center py-8 text-gray-400">
            <Package className="mx-auto h-12 w-12 mb-2" />
            <p>Nenhum produto adicionado</p>
            <p className="text-sm">Clique em "Adicionar Produto" para começar</p>
          </div>
        </div>

        {/* Observações */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Observações</h3>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            rows={4}
            placeholder="Observações sobre a entrada de mercadoria..."
          />
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="outline">
            <Save size={16} className="mr-2" />
            Salvar Rascunho
          </Button>
          <Button variant="primary">
            <Package size={16} className="mr-2" />
            Processar Entrada
          </Button>
        </div>
      </div>

      {/* Formulário Completo de Novo Fornecedor */}
      <ClienteFormCompleto
        isOpen={showNovoFornecedorModal}
        onClose={() => setShowNovoFornecedorModal(false)}
        empresaId={empresaId}
        onClienteCreated={(fornecedorId) => {
          // Buscar dados do fornecedor criado para obter nome e documento
          supabase
            .from('clientes')
            .select('nome, documento')
            .eq('id', fornecedorId)
            .single()
            .then(({ data }) => {
              if (data) {
                handleFornecedorCreated(fornecedorId, data.nome, data.documento);
              }
            });
        }}
        fornecedorMode={true}
      />
    </div>
  );
};

// Aba de Entrada por XML
const EntradaXMLTab: React.FC<{ onClose: () => void; onSave: () => void }> = ({ onClose, onSave }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // Mostrar mensagem de funcionalidade em desenvolvimento
      showMessage('info', 'Funcionalidade em desenvolvimento! Utilize a "Entrada Manual" por enquanto.');
    }
  };

  const handleFileSelect = () => {
    // Mostrar mensagem de funcionalidade em desenvolvimento
    showMessage('info', 'Funcionalidade em desenvolvimento! Utilize a "Entrada Manual" por enquanto.');
  };

  const handleProcessXML = () => {
    // Mostrar mensagem de funcionalidade em desenvolvimento
    showMessage('info', 'Funcionalidade em desenvolvimento! Utilize a "Entrada Manual" por enquanto.');
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Upload de XML */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <FileInput size={18} />
            Upload do XML da Nota Fiscal
          </h3>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-gray-600 hover:border-gray-500'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h4 className="text-lg font-medium text-white mb-2">
              Arraste o arquivo XML aqui
            </h4>
            <p className="text-gray-400 mb-4">
              ou clique para selecionar o arquivo
            </p>
            <Button variant="outline" onClick={handleFileSelect}>
              <FileInput size={16} className="mr-2" />
              Selecionar Arquivo XML
            </Button>

            <div className="mt-4 text-sm text-gray-500">
              <p>Formatos aceitos: .xml</p>
              <p>Tamanho máximo: 10MB</p>
            </div>
          </div>
        </div>

        {/* Informações do XML */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Informações do XML</h3>

          <div className="text-center py-8 text-gray-400">
            <FileText className="mx-auto h-12 w-12 mb-2" />
            <p>Nenhum arquivo XML carregado</p>
            <p className="text-sm">Faça upload do XML para visualizar as informações</p>
          </div>
        </div>

        {/* Configurações de Importação */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Configurações de Importação</h3>

          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="w-4 h-4 text-primary-600 bg-gray-800 border-gray-600 rounded focus:ring-primary-500"
                defaultChecked
              />
              <span className="text-gray-300">Atualizar estoque automaticamente</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="w-4 h-4 text-primary-600 bg-gray-800 border-gray-600 rounded focus:ring-primary-500"
                defaultChecked
              />
              <span className="text-gray-300">Criar produtos não cadastrados</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="w-4 h-4 text-primary-600 bg-gray-800 border-gray-600 rounded focus:ring-primary-500"
              />
              <span className="text-gray-300">Validar CNPJ do fornecedor</span>
            </label>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleProcessXML}>
            <Upload size={16} className="mr-2" />
            Processar XML
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EntradaMercadoriaPage;
