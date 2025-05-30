import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Phone, Mail, MapPin, AlertCircle, X, Building, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
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
  // Tipos de cliente
  is_cliente?: boolean;
  is_funcionario?: boolean;
  is_vendedor?: boolean;
  is_fornecedor?: boolean;
  is_transportadora?: boolean;
}

const UserClientesPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [empresaFilter, setEmpresaFilter] = useState<string>('todas');
  const [tipoClienteFilter, setTipoClienteFilter] = useState<string>('todos');
  const [empresas, setEmpresas] = useState<{id: string, nome: string}[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(false);

  useEffect(() => {
    // Tentar carregar dados do localStorage primeiro
    const loadFromLocalStorage = () => {
      try {
        // Verificar se há dados em cache e se não estão expirados (30 minutos)
        const cachedClientes = localStorage.getItem('clientes_cache');
        const cachedEmpresas = localStorage.getItem('empresas_cache');
        const cachedTimestamp = localStorage.getItem('clientes_cache_timestamp');

        if (cachedClientes && cachedEmpresas && cachedTimestamp) {
          const timestamp = parseInt(cachedTimestamp);
          const now = new Date().getTime();
          const thirtyMinutesInMs = 30 * 60 * 1000;

          // Se o cache for válido (menos de 30 minutos)
          if (now - timestamp < thirtyMinutesInMs) {
            console.log('Carregando dados de clientes do cache local');
            setClientes(JSON.parse(cachedClientes));
            setEmpresas(JSON.parse(cachedEmpresas));
            setIsInitialLoading(false);

            // Ainda carregamos os dados do servidor, mas não mostramos o loading
            loadClientes(false);
            loadEmpresas();
            return true;
          } else {
            console.log('Cache de clientes expirado, carregando do servidor');
            // Limpar cache expirado
            localStorage.removeItem('clientes_cache');
            localStorage.removeItem('empresas_cache');
            localStorage.removeItem('clientes_cache_timestamp');
          }
        }
        return false;
      } catch (error) {
        console.error('Erro ao carregar dados do localStorage:', error);
        return false;
      }
    };

    // Se não conseguir carregar do localStorage, carregar do servidor com loading
    if (!loadFromLocalStorage()) {
      loadClientes(true);
      loadEmpresas();

      // Definir um timeout para remover o loading inicial após 2 segundos
      // mesmo se os dados ainda não tiverem sido carregados
      const timer = setTimeout(() => {
        setIsInitialLoading(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    applyFilters();
  }, [clientes, searchTerm, empresaFilter, tipoClienteFilter]);

  const loadEmpresas = async () => {
    try {
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

      // Obter apenas a empresa do usuário
      const { data: empresasData } = await supabase
        .from('empresas')
        .select('id, nome')
        .eq('id', usuarioData.empresa_id)
        .single();

      if (empresasData) {
        setEmpresas([empresasData]);

        // Salvar dados no localStorage
        try {
          localStorage.setItem('empresas_cache', JSON.stringify([empresasData]));
        } catch (cacheError) {
          console.error('Erro ao salvar empresas no localStorage:', cacheError);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  const loadClientes = async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }

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

      // Obter clientes da empresa
      const { data: clientesData, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('empresa_id', usuarioData.empresa_id)
        .or('deletado.is.null,deletado.eq.false')
        .order('nome');

      console.log('Clientes encontrados (mobile):', clientesData?.length);

      if (error) throw error;

      if (clientesData && clientesData.length > 0) {
        // Buscar apenas a empresa do usuário para associar aos clientes
        const { data: empresaData } = await supabase
          .from('empresas')
          .select('id, nome')
          .eq('id', usuarioData.empresa_id)
          .single();

        // Formatar dados dos clientes com o nome da empresa
        const formattedClientes = clientesData.map(cliente => ({
          ...cliente,
          empresa_nome: empresaData?.nome || 'Empresa não encontrada'
        }));

        setClientes(formattedClientes);

        // Salvar dados no localStorage
        try {
          localStorage.setItem('clientes_cache', JSON.stringify(formattedClientes));
          localStorage.setItem('clientes_cache_timestamp', new Date().getTime().toString());
          console.log('Dados de clientes salvos no cache local');
        } catch (cacheError) {
          console.error('Erro ao salvar clientes no localStorage:', cacheError);
        }
      } else {
        setClientes([]);
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...clientes];

    // Aplicar filtro de busca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        cliente =>
          cliente.nome?.toLowerCase().includes(searchLower) ||
          cliente.telefone?.toLowerCase().includes(searchLower) ||
          cliente.email?.toLowerCase().includes(searchLower) ||
          cliente.endereco?.toLowerCase().includes(searchLower)
      );
    }

    // Aplicar filtro de empresa
    if (empresaFilter !== 'todas') {
      filtered = filtered.filter(cliente => cliente.empresa_id === empresaFilter);
    }

    // Aplicar filtro de tipo de cliente
    if (tipoClienteFilter !== 'todos') {
      filtered = filtered.filter(cliente => {
        switch (tipoClienteFilter) {
          case 'cliente':
            return cliente.is_cliente === true;
          case 'funcionario':
            return cliente.is_funcionario === true;
          case 'vendedor':
            return cliente.is_vendedor === true;
          case 'fornecedor':
            return cliente.is_fornecedor === true;
          case 'transportadora':
            return cliente.is_transportadora === true;
          default:
            return true;
        }
      });
    }

    setFilteredClientes(filtered);
  };

  const formatarTelefone = (telefone: string) => {
    if (!telefone) return '';

    // Remove todos os caracteres não numéricos
    const numeroLimpo = telefone.replace(/\D/g, '');

    // Aplica a máscara de telefone
    if (numeroLimpo.length <= 10) {
      // Formato (XX) XXXX-XXXX para telefones fixos
      return numeroLimpo.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
      // Formato (XX) XXXXX-XXXX para celulares
      return numeroLimpo.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  };

  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  // Animação de carregamento de cards
  if (isInitialLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-800 rounded-lg animate-pulse"></div>
          <div className="h-10 w-10 bg-gray-800 rounded-lg animate-pulse"></div>
        </div>

        {/* Barra de busca skeleton */}
        <div className="h-10 w-full bg-gray-800 rounded-lg animate-pulse"></div>

        {/* Cards skeleton */}
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="p-4 bg-background-card rounded-lg border border-gray-800"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-2 w-2/3">
                <div className="h-5 w-32 bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 w-40 bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 w-24 bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 w-36 bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div className="space-y-2 w-1/3 flex flex-col items-end">
                <div className="h-4 w-20 bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Meus Clientes</h1>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <Filter size={18} />
          </button>
        </div>

        {/* Tags de Filtro por Tipo de Cliente */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTipoClienteFilter('todos')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
              tipoClienteFilter === 'todos'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
            }`}
          >
            <User size={14} />
            Todos
          </button>
          <button
            onClick={() => setTipoClienteFilter('cliente')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
              tipoClienteFilter === 'cliente'
                ? 'bg-blue-500 text-white'
                : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30'
            }`}
          >
            <User size={14} />
            Cliente
          </button>
          <button
            onClick={() => setTipoClienteFilter('funcionario')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
              tipoClienteFilter === 'funcionario'
                ? 'bg-green-500 text-white'
                : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30'
            }`}
          >
            <User size={14} />
            Funcionário
          </button>
          <button
            onClick={() => setTipoClienteFilter('vendedor')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
              tipoClienteFilter === 'vendedor'
                ? 'bg-purple-500 text-white'
                : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30'
            }`}
          >
            <User size={14} />
            Vendedor
          </button>
          <button
            onClick={() => setTipoClienteFilter('fornecedor')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
              tipoClienteFilter === 'fornecedor'
                ? 'bg-orange-500 text-white'
                : 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/30'
            }`}
          >
            <User size={14} />
            Fornecedor
          </button>
          <button
            onClick={() => setTipoClienteFilter('transportadora')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
              tipoClienteFilter === 'transportadora'
                ? 'bg-red-500 text-white'
                : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30'
            }`}
          >
            <User size={14} />
            Transportadora
          </button>
        </div>
      </div>

      {/* Barra de busca */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar por nome, telefone ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
        />
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      </div>

      {/* Filtros */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Empresa
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setEmpresaFilter('todas')}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      empresaFilter === 'todas'
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Todas
                  </button>
                  {empresas.map((empresa) => (
                    <button
                      key={empresa.id}
                      onClick={() => setEmpresaFilter(empresa.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        empresaFilter === empresa.id
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {empresa.nome}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de clientes */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="p-4 bg-background-card rounded-lg border border-gray-800">
              <div className="flex justify-between items-start">
                <div className="space-y-2 w-2/3">
                  <div className="h-5 w-32 bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-40 bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-36 bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-48 bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="space-y-2 w-1/3 flex flex-col items-end">
                  <div className="h-4 w-24 bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredClientes.length === 0 ? (
        <div className="bg-background-card rounded-lg border border-gray-800 p-8 text-center">
          <AlertCircle size={32} className="text-gray-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-2">
            Nenhum cliente encontrado
          </h3>
          <p className="text-gray-400 mb-4">
            {searchTerm || empresaFilter !== 'todas'
              ? 'Tente ajustar os filtros de busca'
              : 'Você ainda não possui clientes registrados'}
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar pr-2">
          {filteredClientes.map((cliente, index) => (
            <motion.div
              key={cliente.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 bg-background-card rounded-lg border border-gray-800"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-white font-medium">{cliente.nome}</h3>

                  <div className="flex items-center gap-1 text-gray-400 text-sm mt-1">
                    <Phone size={14} />
                    <span>{formatarTelefone(cliente.telefone)}</span>
                  </div>

                  {cliente.email && (
                    <div className="flex items-center gap-1 text-gray-400 text-sm mt-1">
                      <Mail size={14} />
                      <span>{cliente.email}</span>
                    </div>
                  )}

                  {(cliente.endereco || cliente.bairro || cliente.cidade) && (
                    <div className="flex items-center gap-1 text-gray-400 text-sm mt-1">
                      <MapPin size={14} />
                      <span>
                        {cliente.endereco && `${cliente.endereco}${cliente.numero ? `, ${cliente.numero}` : ''}`}
                        {cliente.bairro && (cliente.endereco ? `, ${cliente.bairro}` : cliente.bairro)}
                        {cliente.cidade && (cliente.endereco || cliente.bairro ? `, ${cliente.cidade}` : cliente.cidade)}
                        {cliente.estado && `/${cliente.estado}`}
                      </span>
                    </div>
                  )}

                  {cliente.empresa_nome && (
                    <div className="flex items-center gap-1 text-gray-500 text-xs mt-2">
                      <Building size={12} />
                      <span>{cliente.empresa_nome}</span>
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Botão flutuante para adicionar cliente */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed right-4 bottom-20 w-14 h-14 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg z-20"
        onClick={() => navigate('/user/clientes/novo')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <line x1="19" y1="8" x2="19" y2="14"></line>
          <line x1="16" y1="11" x2="22" y2="11"></line>
        </svg>
      </motion.button>
    </div>
  );
};

export default UserClientesPage;
