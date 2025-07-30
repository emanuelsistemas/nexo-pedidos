import React, { useState, useEffect } from 'react';
import { Plus, Edit, Eye, Search, Filter, ArrowLeft, Save, Trash2, X, MoreVertical, Package, Calendar, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/comum/Button';
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
  const [showForm, setShowForm] = useState(false);
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
    setShowForm(true);
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

  if (showForm) {
    return <EntradaMercadoriaForm onBack={() => setShowForm(false)} onSave={loadEntradas} />;
  }

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
          {!searchTerm && statusFilter === 'todos' && (
            <Button variant="primary" onClick={handleNovaEntrada}>
              <Plus size={20} className="mr-2" />
              Nova Entrada
            </Button>
          )}
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
    </div>
  );
};

// Componente do formulário de entrada de mercadoria (placeholder)
const EntradaMercadoriaForm: React.FC<{ onBack: () => void; onSave: () => void }> = ({ onBack, onSave }) => {
  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-white">Nova Entrada de Mercadoria</h1>
      </div>
      
      <div className="bg-background-card border border-gray-700 rounded-lg p-6">
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">Formulário em Desenvolvimento</h3>
          <p className="text-gray-400 mb-4">
            O formulário de entrada de mercadoria será implementado em breve.
          </p>
          <Button variant="secondary" onClick={onBack}>
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EntradaMercadoriaPage;
