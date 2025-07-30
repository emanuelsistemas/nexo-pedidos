import React, { useState, useEffect, useRef } from 'react';
import { Building, Search, X, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';

interface Fornecedor {
  id: string;
  nome: string;
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
  telefone?: string;
  email?: string;
}

interface FornecedorDropdownProps {
  value: string;
  onChange: (
    fornecedorId: string,
    fornecedorNome: string,
    fornecedorDocumento?: string,
    fornecedorData?: {
      documento?: string;
      tipo_documento?: string;
      razao_social?: string;
      nome_fantasia?: string;
      endereco?: string;
      numero?: string;
      bairro?: string;
      cidade?: string;
      estado?: string;
      cep?: string;
      complemento?: string;
      telefone?: string;
      email?: string;
    }
  ) => void;
  empresaId: string;
  placeholder?: string;
  required?: boolean;
  onNovoFornecedor?: () => void;
}

const FornecedorDropdown: React.FC<FornecedorDropdownProps> = ({
  value,
  onChange,
  empresaId,
  placeholder = 'Selecione um fornecedor',
  required = false,
  onNovoFornecedor,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'nome' | 'documento'>('nome');
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [filteredFornecedores, setFilteredFornecedores] = useState<Fornecedor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = useState<Fornecedor | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filtrar fornecedores baseado no termo de busca
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredFornecedores(fornecedores);
    } else {
      const searchLower = searchTerm.toLowerCase();

      if (searchType === 'nome') {
        // Buscar por nome, nome fantasia ou razão social
        setFilteredFornecedores(
          fornecedores.filter(
            fornecedor =>
              fornecedor.nome.toLowerCase().includes(searchLower) ||
              (fornecedor.nome_fantasia && fornecedor.nome_fantasia.toLowerCase().includes(searchLower)) ||
              (fornecedor.razao_social && fornecedor.razao_social.toLowerCase().includes(searchLower))
          )
        );
      } else {
        // Buscar por documento (CNPJ/CPF)
        // Remove caracteres não numéricos para comparação
        const searchNumeric = searchTerm.replace(/\D/g, '');
        setFilteredFornecedores(
          fornecedores.filter(
            fornecedor => fornecedor.documento && fornecedor.documento.includes(searchNumeric)
          )
        );
      }
    }
  }, [searchTerm, searchType, fornecedores]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Carregar fornecedores quando o dropdown abrir
  useEffect(() => {
    if (isOpen && fornecedores.length === 0) {
      loadFornecedores();
    }
  }, [isOpen, empresaId]);

  // Buscar fornecedor selecionado pelo value
  useEffect(() => {
    if (value && fornecedores.length > 0) {
      const fornecedor = fornecedores.find(f => f.id === value);
      setSelectedFornecedor(fornecedor || null);
    } else {
      setSelectedFornecedor(null);
    }
  }, [value, fornecedores]);

  const loadFornecedores = async () => {
    try {
      setIsLoading(true);

      // Por enquanto, vamos buscar na tabela clientes com is_fornecedor = true
      // Quando a tabela fornecedores for criada, ajustaremos aqui
      const { data, error } = await supabase
        .from('clientes')
        .select(`
          id,
          nome,
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
          cep,
          telefone
        `)
        .eq('empresa_id', empresaId)
        .eq('is_fornecedor', true)
        .eq('deletado', false)
        .order('nome');

      if (error) {
        console.error('Erro ao carregar fornecedores:', error);
        return;
      }

      setFornecedores(data || []);
      setFilteredFornecedores(data || []);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFornecedor = (fornecedor: Fornecedor) => {
    setSelectedFornecedor(fornecedor);
    onChange(
      fornecedor.id,
      fornecedor.nome,
      fornecedor.documento,
      {
        documento: fornecedor.documento,
        tipo_documento: fornecedor.tipo_documento,
        razao_social: fornecedor.razao_social,
        nome_fantasia: fornecedor.nome_fantasia,
        endereco: fornecedor.endereco,
        numero: fornecedor.numero,
        bairro: fornecedor.bairro,
        cidade: fornecedor.cidade,
        estado: fornecedor.estado,
        cep: fornecedor.cep,
        complemento: fornecedor.complemento,
        telefone: fornecedor.telefone
      }
    );
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    setSelectedFornecedor(null);
    onChange('', '', '', undefined);
    setSearchTerm('');
  };

  const formatarDocumento = (documento: string, tipo?: string) => {
    if (!documento) return '';
    
    const numeros = documento.replace(/\D/g, '');
    
    if (tipo === 'CNPJ' && numeros.length === 14) {
      return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    } else if (tipo === 'CPF' && numeros.length === 11) {
      return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    
    return documento;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Building size={16} className="text-gray-500" />
        </div>

        {selectedFornecedor ? (
          <div
            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-10 pr-10 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 cursor-pointer flex items-center"
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="flex flex-col flex-1">
              <span className="text-white">{selectedFornecedor.nome}</span>
              {selectedFornecedor.documento && (
                <span className="text-xs text-gray-400">
                  {selectedFornecedor.tipo_documento}: {formatarDocumento(selectedFornecedor.documento, selectedFornecedor.tipo_documento)}
                </span>
              )}
            </div>
          </div>
        ) : (
          <input
            type="text"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-10 pr-10 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 cursor-pointer"
            placeholder={placeholder}
            value=""
            onClick={() => setIsOpen(!isOpen)}
            readOnly
            required={required}
          />
        )}

        {selectedFornecedor && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
          >
            <X size={16} />
          </button>
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
                Buscar por CNPJ/CPF
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
                  placeholder={searchType === 'nome' ? "Digite o nome do fornecedor..." : "Digite o CNPJ/CPF..."}
                  autoFocus
                />
              </div>
            </div>

            {/* Lista de fornecedores */}
            <div className="max-h-60 overflow-y-auto">
              {/* Botão Novo Fornecedor */}
              {onNovoFornecedor && (
                <div className="p-2 border-b border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      onNovoFornecedor();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors"
                  >
                    <Building size={16} />
                    <span className="font-medium">Novo Fornecedor</span>
                  </button>
                </div>
              )}

              {isLoading ? (
                <div className="p-4 text-center text-gray-400">
                  <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-2"></div>
                  Carregando fornecedores...
                </div>
              ) : filteredFornecedores.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  Nenhum fornecedor encontrado
                </div>
              ) : (
                filteredFornecedores.map((fornecedor) => (
                  <div
                    key={fornecedor.id}
                    className="px-3 py-2 hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => handleSelectFornecedor(fornecedor)}
                  >
                    <div className="font-medium text-white">{fornecedor.nome}</div>
                    <div className="flex flex-col text-xs text-gray-400">
                      {fornecedor.documento && (
                        <span>
                          {fornecedor.tipo_documento}: {formatarDocumento(fornecedor.documento, fornecedor.tipo_documento)}
                        </span>
                      )}
                      {fornecedor.telefone && (
                        <span>Tel: {fornecedor.telefone}</span>
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

export default FornecedorDropdown;
