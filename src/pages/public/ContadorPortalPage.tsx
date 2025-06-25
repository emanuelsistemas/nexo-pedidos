import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Download, Calendar, FolderOpen, AlertCircle, Clock, ChevronDown } from 'lucide-react';
import Logo from '../../components/comum/Logo';
import Button from '../../components/comum/Button';
import FileExplorer from '../../components/contador/FileExplorer';

const ContadorPortalPage: React.FC = () => {
  const [cnpj, setCnpj] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [empresaData, setEmpresaData] = useState<any>(null);
  const [error, setError] = useState('');
  const [historicoCnpjs, setHistoricoCnpjs] = useState<string[]>([]);
  const [showHistorico, setShowHistorico] = useState(false);

  // Carregar histórico do localStorage ao inicializar
  useEffect(() => {
    const historicoSalvo = localStorage.getItem('contador_cnpjs_historico');
    if (historicoSalvo) {
      try {
        const cnpjs = JSON.parse(historicoSalvo);
        setHistoricoCnpjs(Array.isArray(cnpjs) ? cnpjs : []);
      } catch (error) {
        console.error('Erro ao carregar histórico de CNPJs:', error);
        setHistoricoCnpjs([]);
      }
    }
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showHistorico && !target.closest('.relative')) {
        setShowHistorico(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHistorico]);

  // Função para salvar CNPJ no histórico
  const salvarCnpjNoHistorico = (cnpjFormatado: string) => {
    const cnpjLimpo = cnpjFormatado.replace(/\D/g, '');

    // Não salvar CNPJs inválidos
    if (cnpjLimpo.length !== 14) return;

    const novoHistorico = [cnpjFormatado, ...historicoCnpjs.filter(c => c !== cnpjFormatado)].slice(0, 5); // Manter apenas os 5 mais recentes

    setHistoricoCnpjs(novoHistorico);
    localStorage.setItem('contador_cnpjs_historico', JSON.stringify(novoHistorico));
  };

  // Função para selecionar CNPJ do histórico
  const selecionarCnpjHistorico = (cnpjSelecionado: string) => {
    setCnpj(cnpjSelecionado);
    setShowHistorico(false);
    setError('');
  };

  // Função para limpar histórico
  const limparHistorico = () => {
    setHistoricoCnpjs([]);
    localStorage.removeItem('contador_cnpjs_historico');
    setShowHistorico(false);
  };

  // Função para formatar CNPJ
  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 14) {
      return numbers.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }
    return value;
  };

  // Função para validar CNPJ
  const validarCNPJ = (cnpj: string) => {
    const numbers = cnpj.replace(/\D/g, '');
    
    if (numbers.length !== 14) return false;
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(numbers)) return false;
    
    // Validar dígitos verificadores
    let soma = 0;
    let peso = 2;
    
    for (let i = 11; i >= 0; i--) {
      soma += parseInt(numbers[i]) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    
    const digito1 = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    
    if (parseInt(numbers[12]) !== digito1) return false;
    
    soma = 0;
    peso = 2;
    
    for (let i = 12; i >= 0; i--) {
      soma += parseInt(numbers[i]) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    
    const digito2 = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    
    return parseInt(numbers[13]) === digito2;
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setCnpj(formatted);
    setError('');
  };

  const handleBuscarEmpresa = async () => {
    if (!cnpj.trim()) {
      setError('Por favor, digite um CNPJ');
      return;
    }

    const cnpjNumbers = cnpj.replace(/\D/g, '');

    if (!validarCNPJ(cnpjNumbers)) {
      setError('CNPJ inválido. Verifique os dígitos informados.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Mapeamento direto CNPJ -> ID da empresa (dados reais do sistema)
      const empresas: Record<string, any> = {
        '24163237000151': {
          id: 'acd26a4f-7220-405e-9c96-faffb7e6480e',
          nome: 'EMANUEL LUIS PEREIRA SOUZA VALESIS INFORMATICA',
          cnpj: '24163237000151',
          razao_social: 'EMANUEL LUIS PEREIRA SOUZA VALESIS INFORMATICA',
          nome_fantasia: 'DISTRIBUIDORA EXEMPLO',
          inscricao_estadual: '392188360119',
          segmento: 'Bar'
        }
      };

      if (empresas[cnpjNumbers]) {
        setEmpresaData(empresas[cnpjNumbers]);
        // Salvar CNPJ no histórico quando a busca for bem-sucedida
        salvarCnpjNoHistorico(cnpj);
      } else {
        setError('Empresa não encontrada');
        setEmpresaData(null);
      }
    } catch (error) {
      console.error('Erro ao buscar empresa:', error);
      setError('Erro ao processar dados. Tente novamente.');
      setEmpresaData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBuscarEmpresa();
    }
  };

  return (
    <div className="min-h-screen bg-background-dark">
      {/* Header */}
      <header className="bg-background-card border-b border-gray-800 py-2">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo size="sm" />
              <div>
                <h1 className="text-lg font-bold text-white leading-tight">Portal do Contador</h1>
                <p className="text-xs text-gray-400 leading-tight">Acesso aos XMLs das Notas Fiscais</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 leading-tight">Sistema</p>
              <p className="text-sm font-semibold text-white leading-tight">Nexo PDV</p>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {!empresaData ? (
          /* Formulário de Busca */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto"
          >
            <div className="bg-background-card rounded-lg border border-gray-800 p-8">
              <div className="text-center mb-6">
                <FileText className="w-16 h-16 text-accent-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">
                  Acesso aos XMLs
                </h2>
                <p className="text-gray-400">
                  Digite o CNPJ da empresa para acessar os arquivos XML das Notas Fiscais
                </p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      CNPJ da Empresa
                    </label>
                    {historicoCnpjs.length > 0 && (
                      <button
                        onClick={() => setShowHistorico(!showHistorico)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-accent-400 transition-colors"
                      >
                        <Clock className="w-3 h-3" />
                        Histórico
                        <ChevronDown className={`w-3 h-3 transition-transform ${showHistorico ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={cnpj}
                      onChange={handleCnpjChange}
                      onKeyPress={handleKeyPress}
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                      className="w-full bg-background-input border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-all duration-300"
                    />

                    {/* Dropdown do Histórico */}
                    <AnimatePresence>
                      {showHistorico && historicoCnpjs.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full left-0 right-0 mt-1 bg-background-card border border-gray-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto"
                        >
                          <div className="p-2">
                            <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-400 border-b border-gray-700">
                              <span>CNPJs Pesquisados Recentemente</span>
                              <button
                                onClick={limparHistorico}
                                className="text-red-400 hover:text-red-300 transition-colors"
                              >
                                Limpar
                              </button>
                            </div>
                            {historicoCnpjs.map((cnpjHistorico, index) => (
                              <button
                                key={index}
                                onClick={() => selecionarCnpjHistorico(cnpjHistorico)}
                                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800/50 rounded transition-colors flex items-center gap-2"
                              >
                                <Clock className="w-4 h-4 text-gray-500" />
                                {cnpjHistorico}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </motion.div>
                )}

                <Button
                  onClick={handleBuscarEmpresa}
                  disabled={isLoading || !cnpj.trim()}
                  className="w-full"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Buscando...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Search className="w-5 h-5" />
                      Buscar Empresa
                    </div>
                  )}
                </Button>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-800">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-2">
                    Acesso autorizado apenas para contadores
                  </p>
                  <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      XMLs NFe 55/65
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      Download ZIP
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Por período
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Interface de Navegação de Arquivos */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Informações da Empresa */}
            <div className="bg-background-card rounded-lg border border-gray-800 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {empresaData.razao_social}
                  </h2>
                  <p className="text-gray-400">CNPJ: {formatCNPJ(empresaData.cnpj)}</p>
                  {empresaData.nome_fantasia && (
                    <p className="text-sm text-gray-500">{empresaData.nome_fantasia}</p>
                  )}
                </div>
                <Button
                  onClick={() => {
                    setEmpresaData(null);
                    setCnpj('');
                  }}
                  variant="outline"
                  size="sm"
                >
                  Nova Busca
                </Button>
              </div>
            </div>

            {/* Navegador de Arquivos */}
            <FileExplorer empresaData={empresaData} />
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-background-card border-t border-gray-800 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm">
            © 2025 Nexo PDV - Portal do Contador | Acesso seguro aos XMLs das Notas Fiscais
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ContadorPortalPage;
