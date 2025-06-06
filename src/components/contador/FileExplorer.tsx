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

interface EstruturaAno {
  ano: string;
  meses: Array<{
    mes: string;
    nome_mes: string;
    tipos: {
      Autorizados: number;
      Cancelados: number;
      CCe: number;
    };
    total_arquivos: number;
    path: string;
  }>;
  total_arquivos: number;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ empresaData }) => {
  const [estrutura, setEstrutura] = useState<Record<string, EstruturaAno>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});

  useEffect(() => {
    carregarEstrutura();
  }, [empresaData]);

  const carregarEstrutura = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Nova estrutura: Ano → Mês → [Todos os tipos juntos]
      const estruturaSimulada = {
        '2025': {
          ano: '2025',
          meses: [
            {
              mes: '06',
              nome_mes: 'Junho',
              tipos: {
                'Autorizados': 5,
                'Cancelados': 0,
                'CCe': 3
              },
              total_arquivos: 8,
              path: `/storage/xml/empresa_${empresaData.id}/2025/06`
            }
          ],
          total_arquivos: 8
        }
      };

      setEstrutura(estruturaSimulada);

      // Expandir automaticamente o ano
      setExpandedYears({ '2025': true });

    } catch (error) {
      console.error('Erro ao carregar estrutura:', error);
      setError('Erro ao processar estrutura de arquivos');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleYear = (ano: string) => {
    setExpandedYears(prev => ({
      ...prev,
      [ano]: !prev[ano]
    }));
  };

  const handleDownloadMes = async (ano: string, mes: string) => {
    try {
      // Download do ZIP completo do mês (todos os tipos juntos)
      const response = await fetch('/backend/public/contador-download.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'download_mes_completo',
          empresa_id: empresaData.id,
          ano,
          mes
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${empresaData.nome_fantasia || empresaData.razao_social}_${ano}_${mes}.zip`;
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

  const handleDownloadRelatorio = async (ano: string, mes: string) => {
    try {
      const response = await fetch('/backend/public/contador-relatorio.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'relatorio_mes_completo',
          empresa_id: empresaData.id,
          ano,
          mes
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Relatorio_${ano}_${mes}.pdf`;
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

  const getTiposResumo = (tipos: { Autorizados: number; Cancelados: number; CCe: number }) => {
    const resumo = [];
    if (tipos.Autorizados > 0) resumo.push(`${tipos.Autorizados} Autorizados`);
    if (tipos.Cancelados > 0) resumo.push(`${tipos.Cancelados} Cancelados`);
    if (tipos.CCe > 0) resumo.push(`${tipos.CCe} CCe`);
    return resumo.join(', ') || 'Nenhum arquivo';
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

  const anosDisponiveis = Object.keys(estrutura);

  if (anosDisponiveis.length === 0) {
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
          ({anosDisponiveis.reduce((total, ano) => total + estrutura[ano].total_arquivos, 0)} arquivos)
        </span>
      </div>

      <div className="space-y-4">
        {anosDisponiveis.map((ano) => {
          const anoData = estrutura[ano];
          const isExpanded = expandedYears[ano];

          return (
            <motion.div
              key={ano}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-gray-700 rounded-lg overflow-hidden"
            >
              {/* Header do Ano */}
              <button
                onClick={() => toggleYear(ano)}
                className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <div className="text-left">
                    <h4 className="font-semibold text-white">Ano {ano}</h4>
                    <p className="text-sm text-gray-400">{anoData.meses.length} mês(es) disponível(is)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">
                    {anoData.total_arquivos} arquivos
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Meses do Ano */}
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
                      {anoData.meses.map((mesData) => (
                        <div
                          key={mesData.mes}
                          className="flex items-center justify-between p-4 bg-background-input rounded-lg border border-gray-700"
                        >
                          <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-gray-400" />
                            <div>
                              <div className="text-white font-medium">
                                {mesData.nome_mes}
                              </div>
                              <div className="text-sm text-gray-400">
                                {getTiposResumo(mesData.tipos)}
                              </div>
                              <div className="text-xs text-gray-500">
                                Total: {mesData.total_arquivos} arquivos
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleDownloadMes(ano, mesData.mes)}
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-2"
                            >
                              <Download className="w-4 h-4" />
                              ZIP Completo
                            </Button>
                            <Button
                              onClick={() => handleDownloadRelatorio(ano, mesData.mes)}
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-2"
                            >
                              <FileBarChart className="w-4 h-4" />
                              Relatório PDF
                            </Button>
                          </div>
                        </div>
                      ))}
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
