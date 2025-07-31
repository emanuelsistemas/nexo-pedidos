import React, { useState, useEffect } from 'react';
import { Plus, Edit, Eye, Search, Filter, ArrowLeft, Save, Trash2, X, MoreVertical, Package, Calendar, FileText, Upload, FileInput } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/comum/Button';
import FornecedorDropdown from '../../components/comum/FornecedorDropdown';
import ClienteFormCompleto from '../../components/comum/ClienteFormCompleto';
import ProdutoSeletorModal from '../../components/comum/ProdutoSeletorModal';
import { supabase } from '../../lib/supabase';
import { showMessage } from '../../utils/toast';

interface EntradaMercadoria {
  id: string;
  numero_documento: string;
  fornecedor_nome: string;
  fornecedor_cnpj: string;
  data_entrada: string;
  valor_total: number;
  status: 'rascunho' | 'pendente' | 'processada' | 'cancelada';
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

      // Buscar entradas de mercadoria da empresa
      const { data: entradasData, error } = await supabase
        .from('entrada_mercadoria')
        .select(`
          id,
          numero,
          fornecedor_nome,
          fornecedor_documento,
          data_entrada,
          valor_total,
          status,
          observacoes,
          created_at,
          updated_at
        `)
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('deletado', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar entradas:', error);
        showMessage('error', 'Erro ao carregar entradas de mercadoria');
        return;
      }

      // Mapear dados para o formato esperado pela interface
      const entradasFormatadas: EntradaMercadoria[] = (entradasData || []).map(entrada => ({
        id: entrada.id,
        numero_documento: entrada.numero,
        fornecedor_nome: entrada.fornecedor_nome || 'Fornecedor não informado',
        fornecedor_cnpj: entrada.fornecedor_documento || '',
        data_entrada: entrada.data_entrada,
        valor_total: entrada.valor_total || 0,
        status: entrada.status as 'pendente' | 'processada' | 'cancelada',
        observacoes: entrada.observacoes || '',
        created_at: entrada.created_at,
        updated_at: entrada.updated_at
      }));

      setEntradas(entradasFormatadas);
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
      rascunho: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', label: 'Rascunho' },
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
                  <option value="rascunho">Rascunho</option>
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
  const [usuarioId, setUsuarioId] = useState('');
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
  const [isLoading, setIsLoading] = useState(false);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [showProdutoModal, setShowProdutoModal] = useState(false);

  // Carregar empresa e usuário
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('empresa_id, id')
          .eq('id', userData.user.id)
          .single();

        if (usuarioData?.empresa_id) {
          setEmpresaId(usuarioData.empresa_id);
          setUsuarioId(usuarioData.id);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
      }
    };

    loadUserData();
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

  // Função para gerar próximo número
  const gerarProximoNumero = async (): Promise<string> => {
    try {
      const { data, error } = await supabase.rpc('get_proximo_numero_entrada_mercadoria', {
        p_empresa_id: empresaId
      });

      if (error) {
        console.error('Erro ao gerar próximo número:', error);
        return '000001';
      }

      return data || '000001';
    } catch (error) {
      console.error('Erro ao gerar próximo número:', error);
      return '000001';
    }
  };

  // Função para salvar rascunho
  const handleSalvarRascunho = async () => {
    if (!empresaId || !usuarioId) {
      showMessage('error', 'Dados do usuário não encontrados');
      return;
    }

    if (!fornecedorId) {
      showMessage('error', 'Selecione um fornecedor');
      return;
    }

    try {
      setIsLoading(true);

      // Gerar próximo número
      const proximoNumero = await gerarProximoNumero();

      // Inserir entrada de mercadoria
      const { data: entradaData, error: entradaError } = await supabase
        .from('entrada_mercadoria')
        .insert({
          numero: proximoNumero,
          empresa_id: empresaId,
          usuario_id: usuarioId,
          fornecedor_id: fornecedorId,
          fornecedor_nome: fornecedorNome,
          fornecedor_documento: fornecedorDocumento,
          tipo_entrada: 'manual',
          numero_documento: numeroDocumento,
          data_entrada: dataEntrada,
          status: 'rascunho',
          observacoes: observacoes,
          valor_total: 0
        })
        .select()
        .single();

      if (entradaError) {
        console.error('Erro ao salvar entrada:', entradaError);
        showMessage('error', 'Erro ao salvar entrada de mercadoria');
        return;
      }

      showMessage('success', `Rascunho salvo com sucesso! Número: ${proximoNumero}`);
      onSave();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
      showMessage('error', 'Erro ao salvar rascunho');
    } finally {
      setIsLoading(false);
    }
  };

  // Função para processar entrada
  const handleProcessarEntrada = async () => {
    if (!empresaId || !usuarioId) {
      showMessage('error', 'Dados do usuário não encontrados');
      return;
    }

    if (!fornecedorId) {
      showMessage('error', 'Selecione um fornecedor');
      return;
    }

    if (produtos.length === 0) {
      showMessage('error', 'Adicione pelo menos um produto à entrada');
      return;
    }

    try {
      setIsLoading(true);

      // Gerar próximo número
      const proximoNumero = await gerarProximoNumero();

      // Calcular valor total dos produtos
      const valorTotalProdutos = produtos.reduce((total, produto) => total + produto.preco_total, 0);

      // Inserir entrada de mercadoria
      const { data: entradaData, error: entradaError } = await supabase
        .from('entrada_mercadoria')
        .insert({
          numero: proximoNumero,
          empresa_id: empresaId,
          usuario_id: usuarioId,
          fornecedor_id: fornecedorId,
          fornecedor_nome: fornecedorNome,
          fornecedor_documento: fornecedorDocumento,
          tipo_entrada: 'manual',
          numero_documento: numeroDocumento,
          data_entrada: dataEntrada,
          status: 'processada',
          observacoes: observacoes,
          valor_produtos: valorTotalProdutos,
          valor_total: valorTotalProdutos,
          processada_em: new Date().toISOString(),
          processada_por_usuario_id: usuarioId
        })
        .select()
        .single();

      if (entradaError) {
        console.error('Erro ao processar entrada:', entradaError);
        showMessage('error', 'Erro ao processar entrada de mercadoria');
        return;
      }

      // Inserir itens da entrada
      if (produtos.length > 0) {
        const itensParaInserir = produtos.map(produto => ({
          entrada_mercadoria_id: entradaData.id,
          empresa_id: empresaId,
          produto_id: produto.produto_id,
          codigo_produto: produto.codigo,
          nome_produto: produto.nome,
          unidade_medida: produto.unidade_medida || 'UN',
          quantidade: produto.quantidade,
          preco_unitario: produto.preco_unitario,
          preco_total: produto.preco_total,
          atualizar_estoque: true,
          estoque_atualizado: false
        }));

        const { error: itensError } = await supabase
          .from('entrada_mercadoria_itens')
          .insert(itensParaInserir);

        if (itensError) {
          console.error('Erro ao inserir itens:', itensError);
          showMessage('error', 'Erro ao inserir itens da entrada');
          return;
        }
      }

      showMessage('success', `Entrada processada com sucesso! Número: ${proximoNumero}`);
      onSave();
      onClose();
    } catch (error) {
      console.error('Erro ao processar entrada:', error);
      showMessage('error', 'Erro ao processar entrada');
    } finally {
      setIsLoading(false);
    }
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
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowProdutoModal(true)}
            >
              <Plus size={16} className="mr-2" />
              Adicionar Produto
            </Button>
          </div>

          {/* Lista de produtos ou estado vazio */}
          {produtos.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Package className="mx-auto h-12 w-12 mb-2" />
              <p>Nenhum produto adicionado</p>
              <p className="text-sm">Clique em "Adicionar Produto" para começar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {produtos.map((produto, index) => (
                <div key={produto.id || index} className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-400 font-mono">#{index + 1}</span>
                      <div>
                        <h4 className="text-white font-medium">{produto.nome}</h4>
                        <p className="text-sm text-gray-400">Código: {produto.codigo}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-white">Qtd: {produto.quantidade}</p>
                      <p className="text-sm text-gray-400">Unit: R$ {produto.preco_unitario.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">R$ {produto.preco_total.toFixed(2)}</p>
                    </div>
                    <button
                      onClick={() => {
                        const novosProdutos = produtos.filter((_, i) => i !== index);
                        setProdutos(novosProdutos);
                      }}
                      className="text-red-400 hover:text-red-300 p-1"
                      title="Remover produto"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Total */}
              <div className="flex justify-end pt-3 border-t border-gray-700">
                <div className="text-right">
                  <p className="text-gray-400">Total dos Produtos:</p>
                  <p className="text-xl font-bold text-white">
                    R$ {produtos.reduce((total, produto) => total + produto.preco_total, 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}
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
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={handleSalvarRascunho}
            disabled={isLoading || !fornecedorId}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save size={16} className="mr-2" />
            )}
            Salvar Rascunho
          </Button>
          <Button
            variant="primary"
            onClick={handleProcessarEntrada}
            disabled={isLoading || !fornecedorId || produtos.length === 0}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Package size={16} className="mr-2" />
            )}
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

      {/* Modal de Produtos */}
      {showProdutoModal && (
        <ProdutoEntradaModal
          isOpen={showProdutoModal}
          onClose={() => setShowProdutoModal(false)}
          onSave={(novosProdutos) => {
            setProdutos(novosProdutos);
            setShowProdutoModal(false);
          }}
          produtosExistentes={produtos}
          empresaId={empresaId}
        />
      )}
    </div>
  );
};

// Modal de Produtos para Entrada de Mercadoria
const ProdutoEntradaModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (produtos: any[]) => void;
  produtosExistentes: any[];
  empresaId: string;
}> = ({ isOpen, onClose, onSave, produtosExistentes, empresaId }) => {
  const [produtos, setProdutos] = useState<any[]>(produtosExistentes);
  const [showProdutoSeletor, setShowProdutoSeletor] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any>(null);
  const [codigoBusca, setCodigoBusca] = useState('');
  const [produtoForm, setProdutoForm] = useState({
    quantidade: 1,
    preco_unitario: 0,
    preco_total: 0
  });

  // Resetar form quando produto é selecionado
  useEffect(() => {
    if (produtoSelecionado) {
      setProdutoForm({
        quantidade: 1,
        preco_unitario: produtoSelecionado.preco_venda || 0,
        preco_total: produtoSelecionado.preco_venda || 0
      });
    }
  }, [produtoSelecionado]);

  // Calcular preço total quando quantidade ou preço unitário mudam
  useEffect(() => {
    const total = produtoForm.quantidade * produtoForm.preco_unitario;
    setProdutoForm(prev => ({ ...prev, preco_total: total }));
  }, [produtoForm.quantidade, produtoForm.preco_unitario]);

  // Buscar produto por código
  const buscarProdutoPorCodigo = async (codigo: string) => {
    if (!codigo.trim() || !empresaId) return;

    try {
      const { data: produto, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('empresa_id', empresaId)
        .or(`codigo.eq.${codigo},ean.eq.${codigo}`)
        .eq('deletado', false)
        .single();

      if (error || !produto) {
        showMessage('error', 'Produto não encontrado');
        return;
      }

      setProdutoSelecionado(produto);
      setCodigoBusca(produto.nome);
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      showMessage('error', 'Erro ao buscar produto');
    }
  };

  // Adicionar produto à lista
  const adicionarProduto = () => {
    if (!produtoSelecionado) {
      showMessage('error', 'Selecione um produto');
      return;
    }

    if (produtoForm.quantidade <= 0) {
      showMessage('error', 'Quantidade deve ser maior que zero');
      return;
    }

    if (produtoForm.preco_unitario < 0) {
      showMessage('error', 'Preço unitário não pode ser negativo');
      return;
    }

    const novoProduto = {
      id: Date.now().toString(), // ID temporário
      produto_id: produtoSelecionado.id,
      codigo: produtoSelecionado.codigo,
      nome: produtoSelecionado.nome,
      unidade_medida: produtoSelecionado.unidade_medida || 'UN',
      quantidade: produtoForm.quantidade,
      preco_unitario: produtoForm.preco_unitario,
      preco_total: produtoForm.preco_total
    };

    setProdutos(prev => [...prev, novoProduto]);

    // Limpar formulário
    setProdutoSelecionado(null);
    setCodigoBusca('');
    setProdutoForm({
      quantidade: 1,
      preco_unitario: 0,
      preco_total: 0
    });

    showMessage('success', 'Produto adicionado com sucesso');
  };

  // Remover produto da lista
  const removerProduto = (index: number) => {
    setProdutos(prev => prev.filter((_, i) => i !== index));
  };

  // Salvar e fechar
  const handleSalvar = () => {
    onSave(produtos);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="w-full h-full bg-gray-900 flex flex-col">
        {/* Cabeçalho */}
        <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Produtos da Entrada</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-gray-800 text-gray-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 flex flex-col p-3 gap-3">
          {/* Área de Busca de Produtos */}
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 px-3 py-2">
            <h3 className="text-sm font-medium text-white mb-2">Adicionar Produto</h3>

            {/* Layout compacto em uma linha */}
            <div className="flex flex-wrap gap-2 items-end">
              {/* Busca de Produto - Flexível */}
              <div className="flex-1 min-w-[300px]">
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Buscar Produto
                </label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={codigoBusca}
                    onChange={(e) => setCodigoBusca(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        if (produtoSelecionado) {
                          // Limpar produto selecionado
                          setProdutoSelecionado(null);
                          setCodigoBusca('');
                        } else {
                          buscarProdutoPorCodigo(codigoBusca);
                        }
                      }
                    }}
                    placeholder={produtoSelecionado ? produtoSelecionado.nome : "Digite código/EAN e pressione Enter"}
                    className="flex-1 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    readOnly={!!produtoSelecionado}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (produtoSelecionado) {
                        setProdutoSelecionado(null);
                        setCodigoBusca('');
                      } else {
                        setShowProdutoSeletor(true);
                      }
                    }}
                    className="px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-gray-300 hover:text-white hover:bg-gray-600 transition-colors"
                  >
                    {produtoSelecionado ? <X size={14} /> : <Search size={14} />}
                  </button>
                </div>
              </div>

              {/* Quantidade - Compacto */}
              <div className="w-20">
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Qtd
                </label>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={produtoForm.quantidade}
                  onChange={(e) => setProdutoForm(prev => ({ ...prev, quantidade: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  disabled={!produtoSelecionado}
                />
              </div>

              {/* Preço Unitário - Compacto */}
              <div className="w-24">
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Preço Unit. (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={produtoForm.preco_unitario}
                  onChange={(e) => setProdutoForm(prev => ({ ...prev, preco_unitario: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  disabled={!produtoSelecionado}
                />
              </div>

              {/* Preço Total - Compacto */}
              <div className="w-24">
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Total (R$)
                </label>
                <input
                  type="text"
                  value={produtoForm.preco_total.toFixed(2)}
                  className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  readOnly
                />
              </div>

              {/* Botão Adicionar - Compacto */}
              <div>
                <button
                  type="button"
                  onClick={adicionarProduto}
                  disabled={!produtoSelecionado}
                  className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors flex items-center gap-1"
                >
                  <Plus size={14} />
                  Adicionar
                </button>
              </div>
            </div>
          </div>

          {/* Lista de Produtos Adicionados */}
          <div className="flex-1 bg-gray-800/50 rounded-lg border border-gray-700 p-3">
            <h3 className="text-base font-medium text-white mb-3">
              Produtos Adicionados ({produtos.length})
            </h3>

            {produtos.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Package className="mx-auto h-12 w-12 mb-2 opacity-50" />
                <p>Nenhum produto adicionado</p>
                <p className="text-sm">Use a área acima para adicionar produtos</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {produtos.map((produto, index) => (
                  <div
                    key={produto.id || index}
                    className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-700"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400 font-mono">#{index + 1}</span>
                        <div>
                          <h4 className="text-white font-medium">{produto.nome}</h4>
                          <p className="text-sm text-gray-400">
                            Código: {produto.codigo} | Qtd: {produto.quantidade} | Unit: R$ {produto.preco_unitario.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-white font-semibold">R$ {produto.preco_total.toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => removerProduto(index)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Remover produto"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Total Geral */}
                {produtos.length > 0 && (
                  <div className="pt-3 border-t border-gray-700">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Total Geral:</span>
                      <span className="text-xl font-bold text-white">
                        R$ {produtos.reduce((total, produto) => total + produto.preco_total, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé com Botões */}
        <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {produtos.length} produto(s) adicionado(s)
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSalvar}>
              <Save size={16} className="mr-2" />
              Salvar Produtos
            </Button>
          </div>
        </div>

        {/* Modal de Seleção de Produto */}
        {showProdutoSeletor && (
          <ProdutoSeletorModal
            isOpen={showProdutoSeletor}
            onClose={() => setShowProdutoSeletor(false)}
            onSelect={(produto) => {
              setProdutoSelecionado(produto);
              setCodigoBusca(produto.nome);
              setShowProdutoSeletor(false);
            }}
            empresaId={empresaId}
          />
        )}
      </div>
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
