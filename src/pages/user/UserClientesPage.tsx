import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Phone, Mail, MapPin, AlertCircle, X, Building } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  endereco?: string;
  empresa_id: string;
  empresa_nome?: string;
  created_at: string;
}

const UserClientesPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [empresaFilter, setEmpresaFilter] = useState<string>('todas');
  const [empresas, setEmpresas] = useState<{id: string, nome: string}[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    // Simular tempo de carregamento inicial com animação
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 2000);

    loadClientes();
    loadEmpresas();

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [clientes, searchTerm, empresaFilter]);

  const loadEmpresas = async () => {
    try {
      // Obter o usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Obter empresas
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

  const loadClientes = async () => {
    try {
      setIsLoading(true);

      // Obter o usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Obter clientes
      const { data: clientesData, error } = await supabase
        .from('clientes')
        .select(`
          *,
          empresa:empresas(nome)
        `)
        .eq('usuario_id', userData.user.id)
        .order('nome');

      if (error) throw error;

      // Formatar dados dos clientes
      const formattedClientes = clientesData?.map(cliente => ({
        ...cliente,
        empresa_nome: cliente.empresa?.nome
      })) || [];

      setClientes(formattedClientes);
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
        {[1, 2, 3, 4].map((item) => (
          <motion.div
            key={item}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: item * 0.1 }}
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
          </motion.div>
        ))}
      </div>
    );
  }

  return (
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
        <div className="space-y-3">
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

                  {cliente.endereco && (
                    <div className="flex items-center gap-1 text-gray-400 text-sm mt-1">
                      <MapPin size={14} />
                      <span>{cliente.endereco}</span>
                    </div>
                  )}

                  {cliente.empresa_nome && (
                    <div className="flex items-center gap-1 text-gray-500 text-xs mt-2">
                      <Building size={12} />
                      <span>{cliente.empresa_nome}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">
                    Cadastrado em: {formatarData(cliente.created_at)}
                  </div>
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
