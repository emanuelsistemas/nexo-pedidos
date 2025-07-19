import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Phone, Mail, MapPin, AlertCircle, X, Building, Plus, Edit, Trash2, Check, User, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';

interface Telefone {
  numero: string;
  tipo: 'Fixo' | 'Celular';
  whatsapp: boolean;
}

interface Vendedor {
  id: string;
  tipo_documento?: string;
  documento?: string;
  razao_social?: string;
  nome_fantasia?: string;
  nome: string;
  telefone: string;
  telefones?: Telefone[];
  emails?: string[];
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  empresa_id: string;
  empresa_nome?: string;
  created_at: string;
  comissao_percentual?: number;
  meta_mensal?: number;
  ativo?: boolean;
}

interface Empresa {
  id: string;
  nome: string;
}

const VendedoresPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [filteredVendedores, setFilteredVendedores] = useState<Vendedor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [empresaFilter, setEmpresaFilter] = useState<string>('todas');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingVendedor, setEditingVendedor] = useState<Vendedor | null>(null);

  const [formData, setFormData] = useState({
    tipo_documento: 'CPF',
    documento: '',
    razao_social: '',
    nome_fantasia: '',
    nome: '',
    telefones: [] as Telefone[],
    emails: [] as string[],
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    empresa_id: '',
    comissao_percentual: 0,
    meta_mensal: 0,
    ativo: true,
    // Tipos de pessoa
    is_cliente: false,
    is_funcionario: false,
    is_vendedor: true,
    is_fornecedor: false,
    is_transportadora: false,
    // Observações
    observacao_nfe: '',
    observacao_interna: ''
  });

  const [novoTelefone, setNovoTelefone] = useState({
    numero: '',
    tipo: 'Celular' as 'Fixo' | 'Celular',
    whatsapp: false
  });
  const [novoEmail, setNovoEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ NOVO: Estado para controlar loading do botão de edição
  const [loadingEditVendedor, setLoadingEditVendedor] = useState<string | null>(null);

  useEffect(() => {
    loadVendedores();
    loadEmpresas();
  }, []);

  // Selecionar automaticamente a primeira empresa quando elas forem carregadas
  useEffect(() => {
    if (empresas.length > 0 && !formData.empresa_id) {
      setFormData(prev => ({
        ...prev,
        empresa_id: empresas[0].id
      }));
    }
  }, [empresas]);

  useEffect(() => {
    applyFilters();
  }, [vendedores, searchTerm, empresaFilter, statusFilter]);

  const loadEmpresas = async () => {
    try {
      const { data: empresasData } = await supabase
        .from('empresas')
        .select('id, nome')
        .order('nome');

      if (empresasData) {
        setEmpresas(empresasData);
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  const loadVendedores = async () => {
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

      // Buscar apenas os vendedores da empresa do usuário
      const { data: vendedoresData, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('is_vendedor', true)
        .or('deletado.is.null,deletado.eq.false')
        .order('nome');

      console.log('Vendedores encontrados:', vendedoresData?.length);

      if (error) throw error;

      if (vendedoresData && vendedoresData.length > 0) {
        // Buscar todas as empresas para associar aos vendedores
        const { data: empresasData } = await supabase
          .from('empresas')
          .select('id, nome');

        // Criar um mapa de empresas para facilitar a busca
        const empresasMap = new Map();
        if (empresasData) {
          empresasData.forEach(empresa => {
            empresasMap.set(empresa.id, empresa.nome);
          });
        }

        // Formatar dados dos vendedores com os nomes das empresas
        const formattedVendedores = vendedoresData.map(vendedor => ({
          ...vendedor,
          empresa_nome: empresasMap.get(vendedor.empresa_id) || 'Empresa não encontrada'
        }));

        setVendedores(formattedVendedores);
        setFilteredVendedores(formattedVendedores);
      } else {
        setVendedores([]);
        setFilteredVendedores([]);
      }
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
      toast.error('Erro ao carregar vendedores');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...vendedores];

    // Aplicar filtro de busca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        vendedor =>
          vendedor.nome?.toLowerCase().includes(searchLower) ||
          vendedor.telefone?.toLowerCase().includes(searchLower) ||
          (vendedor.emails && vendedor.emails.some(email => email.toLowerCase().includes(searchLower))) ||
          vendedor.endereco?.toLowerCase().includes(searchLower)
      );
    }

    // Aplicar filtro de empresa
    if (empresaFilter !== 'todas') {
      filtered = filtered.filter(vendedor => vendedor.empresa_id === empresaFilter);
    }

    // Aplicar filtro de status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(vendedor => {
        if (statusFilter === 'ativo') {
          return vendedor.ativo !== false;
        } else if (statusFilter === 'inativo') {
          return vendedor.ativo === false;
        }
        return true;
      });
    }

    setFilteredVendedores(filtered);
  };

  const formatarTelefone = (telefone: string, tipo?: 'Fixo' | 'Celular') => {
    if (!telefone) return '';

    // Remove todos os caracteres não numéricos
    const numeroLimpo = telefone.replace(/\D/g, '');

    // Se o tipo for especificado, usa o formato correspondente
    if (tipo === 'Fixo') {
      // Formato (XX) XXXX-XXXX para telefones fixos
      return numeroLimpo.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, ddd, parte1, parte2) => {
        let resultado = '';
        if (ddd) resultado += `(${ddd}`;
        if (ddd && (parte1 || parte2)) resultado += ') ';
        if (parte1) resultado += parte1;
        if (parte1 && parte2) resultado += '-';
        if (parte2) resultado += parte2;
        return resultado;
      });
    } else if (tipo === 'Celular') {
      // Formato (XX) X XXXX-XXXX para celulares
      return numeroLimpo.replace(/^(\d{0,2})(\d{0,1})(\d{0,4})(\d{0,4}).*/, (_, ddd, digito9, parte1, parte2) => {
        let resultado = '';
        if (ddd) resultado += `(${ddd}`;
        if (ddd && (digito9 || parte1 || parte2)) resultado += ') ';
        if (digito9) resultado += `${digito9} `;
        if (parte1) resultado += parte1;
        if (parte1 && parte2) resultado += '-';
        if (parte2) resultado += parte2;
        return resultado;
      });
    } else {
      // Se o tipo não for especificado, determina pelo tamanho
      if (numeroLimpo.length <= 10) {
        // Formato (XX) XXXX-XXXX para telefones fixos
        return numeroLimpo.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      } else {
        // Formato (XX) X XXXX-XXXX para celulares
        return numeroLimpo.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, '($1) $2 $3-$4');
      }
    }
  };

  const formatarCPF = (cpf: string) => {
    if (!cpf) return '';

    // Remove todos os caracteres não numéricos
    const numeroLimpo = cpf.replace(/\D/g, '');

    // Aplica a máscara de CPF (XXX.XXX.XXX-XX)
    return numeroLimpo
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .substring(0, 14);
  };

  const formatarCNPJ = (cnpj: string) => {
    if (!cnpj) return '';

    // Remove todos os caracteres não numéricos
    const numeroLimpo = cnpj.replace(/\D/g, '');

    // Aplica a máscara de CNPJ (XX.XXX.XXX/XXXX-XX)
    return numeroLimpo
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
  };

  const resetForm = () => {
    setFormData({
      tipo_documento: 'CPF',
      documento: '',
      razao_social: '',
      nome_fantasia: '',
      nome: '',
      telefones: [],
      emails: [],
      cep: '',
      endereco: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      empresa_id: empresas.length > 0 ? empresas[0].id : '',
      comissao_percentual: 0,
      meta_mensal: 0,
      ativo: true,
      is_cliente: false,
      is_funcionario: false,
      is_vendedor: true,
      is_fornecedor: false,
      is_transportadora: false,
      observacao_nfe: '',
      observacao_interna: ''
    });
    setEditingVendedor(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (formData.telefones.length === 0) {
      toast.error('Adicione pelo menos um telefone');
      return;
    }

    setIsSubmitting(true);

    try {
      const vendedorData = {
        ...formData,
        telefone: formData.telefones[0]?.numero || '',
        is_vendedor: true
      };

      if (editingVendedor) {
        // Atualizar vendedor existente
        const { error } = await supabase
          .from('clientes')
          .update(vendedorData)
          .eq('id', editingVendedor.id);

        if (error) throw error;
        toast.success('Vendedor atualizado com sucesso!');
      } else {
        // Criar novo vendedor
        const { error } = await supabase
          .from('clientes')
          .insert([vendedorData]);

        if (error) throw error;
        toast.success('Vendedor criado com sucesso!');
      }

      setShowSidebar(false);
      resetForm();
      loadVendedores();
    } catch (error) {
      console.error('Erro ao salvar vendedor:', error);
      toast.error('Erro ao salvar vendedor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (vendedor: Vendedor) => {
    try {
      // ✅ NOVO: Ativar loading para este vendedor específico
      setLoadingEditVendedor(vendedor.id);

      setEditingVendedor(vendedor);
      setFormData({
        tipo_documento: vendedor.tipo_documento || 'CPF',
        documento: vendedor.documento || '',
        razao_social: vendedor.razao_social || '',
        nome_fantasia: vendedor.nome_fantasia || '',
        nome: vendedor.nome,
        telefones: vendedor.telefones || [],
        emails: vendedor.emails || [],
        cep: vendedor.cep || '',
        endereco: vendedor.endereco || '',
        numero: vendedor.numero || '',
        complemento: vendedor.complemento || '',
        bairro: vendedor.bairro || '',
        cidade: vendedor.cidade || '',
        estado: vendedor.estado || '',
        empresa_id: vendedor.empresa_id,
        comissao_percentual: vendedor.comissao_percentual || 0,
        meta_mensal: vendedor.meta_mensal || 0,
        ativo: vendedor.ativo !== false,
        is_cliente: false,
        is_funcionario: false,
        is_vendedor: true,
        is_fornecedor: false,
        is_transportadora: false,
        observacao_nfe: '',
        observacao_interna: ''
      });
      setShowSidebar(true);
    } catch (error) {
      console.error('Erro ao abrir vendedor para edição:', error);
      toast.error('Erro ao carregar dados do vendedor');
    } finally {
      // ✅ NOVO: Remover loading independente do resultado
      setLoadingEditVendedor(null);
    }
  };

  const handleDelete = async (vendedor: Vendedor) => {
    if (!confirm(`Tem certeza que deseja excluir o vendedor ${vendedor.nome}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('clientes')
        .update({ deletado: true })
        .eq('id', vendedor.id);

      if (error) throw error;

      toast.success('Vendedor excluído com sucesso!');
      loadVendedores();
    } catch (error) {
      console.error('Erro ao excluir vendedor:', error);
      toast.error('Erro ao excluir vendedor');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Vendedores</h1>
          <p className="text-gray-400">Gerencie os vendedores da empresa</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowSidebar(true);
          }}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={20} />
          Novo Vendedor
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-background-card rounded-lg p-4 border border-gray-800">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Busca */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar vendedores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
              />
            </div>
          </div>

          {/* Botão de filtros */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-background-secondary border border-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors"
          >
            <Filter size={20} />
            Filtros
          </button>
        </div>

        {/* Filtros expandidos */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-gray-700"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Filtro por empresa */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Empresa
                  </label>
                  <select
                    value={empresaFilter}
                    onChange={(e) => setEmpresaFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-background-secondary border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  >
                    <option value="todas">Todas as empresas</option>
                    {empresas.map(empresa => (
                      <option key={empresa.id} value={empresa.id}>
                        {empresa.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro por status */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-background-secondary border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  >
                    <option value="todos">Todos</option>
                    <option value="ativo">Ativos</option>
                    <option value="inativo">Inativos</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Grid de vendedores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVendedores.map((vendedor) => (
          <motion.div
            key={vendedor.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-background-card rounded-lg p-6 border border-gray-800 hover:border-gray-700 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
                  <User className="text-primary-400" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{vendedor.nome}</h3>
                  <p className="text-sm text-gray-400">{vendedor.empresa_nome}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (loadingEditVendedor === vendedor.id) return; // Evitar cliques múltiplos
                    handleEdit(vendedor);
                  }}
                  className={`p-2 transition-colors ${
                    loadingEditVendedor === vendedor.id
                      ? 'text-primary-400 cursor-wait'
                      : 'text-gray-400 hover:text-primary-400'
                  }`}
                  title={loadingEditVendedor === vendedor.id ? "Carregando..." : "Editar vendedor"}
                  disabled={loadingEditVendedor === vendedor.id}
                >
                  {loadingEditVendedor === vendedor.id ? (
                    <div className="w-4 h-4 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin"></div>
                  ) : (
                    <Edit size={16} />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(vendedor)}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {vendedor.telefone && (
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Phone size={16} className="text-gray-400" />
                  {vendedor.telefone}
                </div>
              )}

              {vendedor.emails && vendedor.emails.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Mail size={16} className="text-gray-400" />
                  {vendedor.emails[0]}
                </div>
              )}

              {vendedor.endereco && (
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <MapPin size={16} className="text-gray-400" />
                  {vendedor.endereco}
                </div>
              )}

              {vendedor.comissao_percentual && (
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-green-400">Comissão: {vendedor.comissao_percentual}%</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  vendedor.ativo !== false
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {vendedor.ativo !== false ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredVendedores.length === 0 && (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Nenhum vendedor encontrado</h3>
          <p className="text-gray-400 mb-4">
            {searchTerm || empresaFilter !== 'todas' || statusFilter !== 'todos'
              ? 'Tente ajustar os filtros de busca'
              : 'Comece adicionando seu primeiro vendedor'
            }
          </p>
          {!searchTerm && empresaFilter === 'todas' && statusFilter === 'todos' && (
            <button
              onClick={() => {
                resetForm();
                setShowSidebar(true);
              }}
              className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Adicionar Vendedor
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default VendedoresPage;
