import React, { useState, useEffect, useRef } from 'react';
import { User, Search, X, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  documento?: string;
  tipo_documento?: 'CNPJ' | 'CPF';
  razao_social?: string;
  nome_fantasia?: string;
  empresa_id: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  complemento?: string;
}

interface ClienteDropdownProps {
  value: string;
  onChange: (
    clienteId: string,
    clienteNome: string,
    clienteTelefone: string,
    clienteData?: {
      documento?: string;
      tipo_documento?: string;
      endereco?: string;
      numero?: string;
      bairro?: string;
      cidade?: string;
      estado?: string;
      cep?: string;
      complemento?: string;
    }
  ) => void;
  empresaId: string;
  placeholder?: string;
  required?: boolean;
}

const ClienteDropdown: React.FC<ClienteDropdownProps> = ({
  value,
  onChange,
  empresaId,
  placeholder = 'Selecione um cliente',
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'nome' | 'documento'>('nome');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Carregar clientes quando o componente montar ou quando a empresa mudar
  useEffect(() => {
    if (empresaId) {
      loadClientes();
    }
  }, [empresaId]);

  // Filtrar clientes quando o termo de busca mudar
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredClientes(clientes);
    } else {
      const searchLower = searchTerm.toLowerCase();

      if (searchType === 'nome') {
        // Buscar por nome, nome fantasia ou razão social
        setFilteredClientes(
          clientes.filter(
            cliente =>
              cliente.nome.toLowerCase().includes(searchLower) ||
              (cliente.nome_fantasia && cliente.nome_fantasia.toLowerCase().includes(searchLower)) ||
              (cliente.razao_social && cliente.razao_social.toLowerCase().includes(searchLower))
          )
        );
      } else {
        // Buscar por documento (CNPJ/CPF)
        // Remove caracteres não numéricos para comparação
        const searchNumeric = searchTerm.replace(/\D/g, '');
        setFilteredClientes(
          clientes.filter(
            cliente => cliente.documento && cliente.documento.includes(searchNumeric)
          )
        );
      }
    }
  }, [searchTerm, searchType, clientes]);

  // Encontrar o cliente selecionado quando o valor mudar
  useEffect(() => {
    if (value && clientes.length > 0) {
      const cliente = clientes.find(c => c.id === value);
      setSelectedCliente(cliente || null);
    } else {
      setSelectedCliente(null);
    }
  }, [value, clientes]);

  // Fechar o dropdown quando clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadClientes = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('clientes')
        .select(`
          id,
          nome,
          telefone,
          documento,
          tipo_documento,
          razao_social,
          nome_fantasia,
          empresa_id,
          endereco,
          numero,
          complemento,
          bairro,
          cidade,
          estado,
          cep
        `)
        .eq('empresa_id', empresaId)
        .eq('deletado', false)
        .order('nome');

      if (error) {
        console.error('Erro ao carregar clientes:', error);
        return;
      }

      setClientes(data || []);
      setFilteredClientes(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCliente = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    onChange(
      cliente.id,
      cliente.nome,
      cliente.telefone,
      {
        documento: cliente.documento,
        tipo_documento: cliente.tipo_documento,
        endereco: cliente.endereco,
        numero: cliente.numero,
        bairro: cliente.bairro,
        cidade: cliente.cidade,
        estado: cliente.estado,
        cep: cliente.cep,
        complemento: cliente.complemento
      }
    );
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    setSelectedCliente(null);
    onChange('', '', '', undefined);
    setSearchTerm('');
  };

  const formatarDocumento = (documento?: string, tipo?: 'CNPJ' | 'CPF') => {
    if (!documento) return '';

    if (tipo === 'CNPJ') {
      // Formato XX.XXX.XXX/XXXX-XX
      return documento.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    } else if (tipo === 'CPF') {
      // Formato XXX.XXX.XXX-XX
      return documento.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    }

    return documento;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Campo de entrada */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <User size={18} className="text-gray-500" />
        </div>

        {selectedCliente ? (
          <div
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-10 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 cursor-pointer flex items-center"
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="flex flex-col">
              <span className="text-white">{selectedCliente.nome}</span>
              {selectedCliente.documento && (
                <span className="text-xs text-gray-400">
                  {selectedCliente.tipo_documento}: {formatarDocumento(selectedCliente.documento, selectedCliente.tipo_documento)}
                </span>
              )}
            </div>

            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <div
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 cursor-pointer"
            onClick={() => setIsOpen(!isOpen)}
          >
            <span className="text-gray-400">{placeholder}</span>
            {required && <span className="text-red-500 ml-1">*</span>}
          </div>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden"
          >
            {/* Opções de busca */}
            <div className="flex border-b border-gray-700">
              <button
                type="button"
                className={`flex-1 py-2 px-3 text-sm ${searchType === 'nome' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}
                onClick={() => setSearchType('nome')}
              >
                Buscar por Nome
              </button>
              <button
                type="button"
                className={`flex-1 py-2 px-3 text-sm ${searchType === 'documento' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}
                onClick={() => setSearchType('documento')}
              >
                Buscar por {searchType === 'documento' ? 'CNPJ/CPF' : 'Documento'}
              </button>
            </div>

            {/* Campo de busca */}
            <div className="p-2 border-b border-gray-700">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {searchType === 'nome' ? (
                    <Search size={16} className="text-gray-500" />
                  ) : (
                    <FileText size={16} className="text-gray-500" />
                  )}
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-2 pl-10 pr-3 text-white text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                  placeholder={searchType === 'nome' ? "Digite o nome do cliente..." : "Digite o CNPJ/CPF..."}
                  autoFocus
                />
              </div>
            </div>

            {/* Lista de clientes */}
            <div className="max-h-60 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-400">
                  <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-2"></div>
                  Carregando clientes...
                </div>
              ) : filteredClientes.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  Nenhum cliente encontrado
                </div>
              ) : (
                filteredClientes.map((cliente) => (
                  <div
                    key={cliente.id}
                    className="px-3 py-2 hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => handleSelectCliente(cliente)}
                  >
                    <div className="font-medium text-white">{cliente.nome}</div>
                    <div className="flex flex-col text-xs text-gray-400">
                      {cliente.documento && (
                        <span>
                          {cliente.tipo_documento}: {formatarDocumento(cliente.documento, cliente.tipo_documento)}
                        </span>
                      )}
                      {cliente.telefone && (
                        <span>Tel: {cliente.telefone}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClienteDropdown;
