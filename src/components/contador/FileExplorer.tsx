import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderOpen, 
  Folder, 
  FileText, 
  Download, 
  Calendar,
  ChevronDown,
  ChevronRight,
  Package,
  AlertCircle,
  Clock,
  FileBarChart
} from 'lucide-react';
import Button from '../comum/Button';

interface FileExplorerProps {
  empresaData: any;
}

interface EstruturaPasta {
  tipo: string;
  anos: Array<{
    ano: string;
    meses: Array<{
      mes: string;
      nome_mes: string;
      total_arquivos: number;
      path: string;
    }>;
    total_arquivos: number;
  }>;
  total_arquivos: number;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ empresaData }) => {
  const [estrutura, setEstrutura] = useState<Record<string, EstruturaPasta>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});

  useEffect(() => {
    carregarEstrutura();
  }, [empresaData]);

  const carregarEstrutura = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/backend/public/contador-portal.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'listar_estrutura',
          empresa_id: empresaData.id
        })
      });

      const data = await response.json();

      if (data.success) {
        setEstrutura(data.data);
        
        // Expandir automaticamente se houver poucos tipos
        const tipos = Object.keys(data.data);
        if (tipos.length <= 2) {
          const expanded: Record<string, boolean> = {};
          tipos.forEach(tipo => {
            expanded[tipo] = true;
          });
          setExpandedTypes(expanded);
        }
      } else {
        setError(data.message || 'Erro ao carregar estrutura de arquivos');
      }
    } catch (error) {
      console.error('Erro ao carregar estrutura:', error);
      setError('Erro ao conectar com o servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleType = (tipo: string) => {
    setExpandedTypes(prev => ({
      ...prev,
      [tipo]: !prev[tipo]
    }));
  };

  const toggleYear = (key: string) => {
    setExpandedYears(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleDownloadMes = async (tipo: string, ano: string, mes: string) => {
    try {
      // Implementar download do ZIP do mês
      const response = await fetch('/backend/public/contador-download.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'download_mes',
          empresa_id: empresaData.id,
          tipo,
          ano,
          mes
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${empresaData.nome_fantasia || empresaData.razao_social}_${tipo}_${ano}_${mes}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Erro ao baixar arquivo');
      }
    } catch (error) {
      console.error('Erro no download:', error);
      alert('Erro ao baixar arquivo. Tente novamente.');
    }
  };

  const handleDownloadRelatorio = async (tipo: string, ano: string, mes: string) => {
    try {
      const response = await fetch('/backend/public/contador-relatorio.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'relatorio_mes',
          empresa_id: empresaData.id,
          tipo,
          ano,
          mes
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Relatorio_${tipo}_${ano}_${mes}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Erro ao gerar relatório');
      }
    } catch (error) {
      console.error('Erro no relatório:', error);
      alert('Erro ao gerar relatório. Tente novamente.');
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'Autorizados':
        return <FileText className="w-5 h-5 text-green-500" />;
      case 'Cancelados':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'CCe':
        return <FileText className="w-5 h-5 text-yellow-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTipoDescription = (tipo: string) => {
    switch (tipo) {
      case 'Autorizados':
        return 'NFe autorizadas pela SEFAZ';
      case 'Cancelados':
        return 'NFe canceladas';
      case 'CCe':
        return 'Cartas de Correção Eletrônica';
      default:
        return tipo;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-background-card rounded-lg border border-gray-800 p-8">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
            <span className="text-gray-400">Carregando estrutura de arquivos...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-background-card rounded-lg border border-gray-800 p-8">
        <div className="flex items-center justify-center gap-3 text-red-400">
          <AlertCircle className="w-6 h-6" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const tiposDisponiveis = Object.keys(estrutura);

  if (tiposDisponiveis.length === 0) {
    return (
      <div className="bg-background-card rounded-lg border border-gray-800 p-8">
        <div className="text-center">
          <FolderOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Nenhum arquivo encontrado</h3>
          <p className="text-gray-400">
            Não foram encontrados arquivos XML para esta empresa.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-card rounded-lg border border-gray-800 p-6">
      <div className="flex items-center gap-2 mb-6">
        <FolderOpen className="w-6 h-6 text-accent-500" />
        <h3 className="text-lg font-semibold text-white">Arquivos XML</h3>
        <span className="text-sm text-gray-400">
          ({tiposDisponiveis.reduce((total, tipo) => total + estrutura[tipo].total_arquivos, 0)} arquivos)
        </span>
      </div>

      <div className="space-y-4">
        {tiposDisponiveis.map((tipo) => {
          const tipoData = estrutura[tipo];
          const isExpanded = expandedTypes[tipo];

          return (
            <motion.div
              key={tipo}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-gray-700 rounded-lg overflow-hidden"
            >
              {/* Header do Tipo */}
              <button
                onClick={() => toggleType(tipo)}
                className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getTipoIcon(tipo)}
                  <div className="text-left">
                    <h4 className="font-semibold text-white">{tipo}</h4>
                    <p className="text-sm text-gray-400">{getTipoDescription(tipo)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">
                    {tipoData.total_arquivos} arquivos
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Conteúdo do Tipo */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-3">
                      {tipoData.anos.map((anoData) => {
                        const yearKey = `${tipo}-${anoData.ano}`;
                        const isYearExpanded = expandedYears[yearKey];

                        return (
                          <div key={anoData.ano} className="border border-gray-700 rounded-lg">
                            {/* Header do Ano */}
                            <button
                              onClick={() => toggleYear(yearKey)}
                              className="w-full flex items-center justify-between p-3 bg-gray-900/50 hover:bg-gray-900/70 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-blue-400" />
                                <span className="font-medium text-white">{anoData.ano}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-400">
                                  {anoData.total_arquivos} arquivos
                                </span>
                                {isYearExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                              </div>
                            </button>

                            {/* Meses do Ano */}
                            <AnimatePresence>
                              {isYearExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="p-3 space-y-2">
                                    {anoData.meses.map((mesData) => (
                                      <div
                                        key={mesData.mes}
                                        className="flex items-center justify-between p-3 bg-background-input rounded-lg"
                                      >
                                        <div className="flex items-center gap-3">
                                          <Clock className="w-4 h-4 text-gray-400" />
                                          <div>
                                            <span className="text-white font-medium">
                                              {mesData.nome_mes}
                                            </span>
                                            <span className="text-sm text-gray-400 ml-2">
                                              ({mesData.total_arquivos} arquivos)
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            onClick={() => handleDownloadMes(tipo, anoData.ano, mesData.mes)}
                                            size="sm"
                                            variant="outline"
                                            className="flex items-center gap-2"
                                          >
                                            <Download className="w-4 h-4" />
                                            ZIP
                                          </Button>
                                          <Button
                                            onClick={() => handleDownloadRelatorio(tipo, anoData.ano, mesData.mes)}
                                            size="sm"
                                            variant="outline"
                                            className="flex items-center gap-2"
                                          >
                                            <FileBarChart className="w-4 h-4" />
                                            PDF
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default FileExplorer;
