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
  FileBarChart,
  Filter
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
      Autorizados: number | { modelo55: number; modelo65: number };
      Cancelados: number | { modelo55: number; modelo65: number };
      CCe: number | { modelo55: number; modelo65: number };
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
  const [downloadingZip, setDownloadingZip] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [filtroModelo, setFiltroModelo] = useState<'todos' | '55' | '65'>('todos');
  const [filtroAmbiente, setFiltroAmbiente] = useState<'todos' | 'producao' | 'homologacao'>('todos');
  const [dropdownAberto, setDropdownAberto] = useState(false);

  useEffect(() => {
    carregarEstrutura();
  }, [empresaData, filtroModelo, filtroAmbiente]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (dropdownAberto && !target.closest('.relative')) {
        setDropdownAberto(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownAberto]);

  const carregarEstrutura = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Fazer chamada real para a API do contador
      const response = await fetch('/backend/public/contador-portal.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'listar_estrutura',
          empresa_id: empresaData.id,
          ambiente: filtroAmbiente,
          modelo: filtroModelo
        })
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Erro ao carregar estrutura');
      }

      // Converter estrutura da API para o formato esperado pelo componente
      const estruturaConvertida = converterEstruturaAPI(result.data);

      // Como a API já filtra por modelo, não precisamos aplicar filtro adicional
      setEstrutura(estruturaConvertida);

      // Expandir automaticamente o primeiro ano disponível
      const primeiroAno = Object.keys(estruturaConvertida)[0];
      if (primeiroAno) {
        setExpandedYears({ [primeiroAno]: true });
      }

    } catch (error) {
      console.error('Erro ao carregar estrutura:', error);
      setError(error instanceof Error ? error.message : 'Erro ao processar estrutura de arquivos');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Converte a estrutura retornada pela API para o formato esperado pelo componente
   */
  const converterEstruturaAPI = (dadosAPI: any): Record<string, EstruturaAno> => {
    const estruturaConvertida: Record<string, EstruturaAno> = {};

    // Se não há dados, retorna estrutura vazia
    if (!dadosAPI || Object.keys(dadosAPI).length === 0) {
      return estruturaConvertida;
    }

    // Processar cada tipo (Autorizados, Cancelados, CCe)
    Object.keys(dadosAPI).forEach(tipo => {
      const tipoData = dadosAPI[tipo];

      if (tipoData && tipoData.anos) {
        tipoData.anos.forEach((anoData: any) => {
          const ano = anoData.ano;

          // Inicializar ano se não existe
          if (!estruturaConvertida[ano]) {
            estruturaConvertida[ano] = {
              ano: ano,
              meses: [],
              total_arquivos: 0
            };
          }

          // Processar meses do ano
          anoData.meses.forEach((mesData: any) => {
            const mesExistente = estruturaConvertida[ano].meses.find(m => m.mes === mesData.mes);

            if (mesExistente) {
              // Atualizar mês existente
              (mesExistente.tipos as any)[tipo] = mesData.total_arquivos;
              mesExistente.total_arquivos =
                (mesExistente.tipos.Autorizados || 0) +
                (mesExistente.tipos.Cancelados || 0) +
                (mesExistente.tipos.CCe || 0);
            } else {
              // Criar novo mês
              const novoMes = {
                mes: mesData.mes,
                nome_mes: mesData.nome_mes,
                tipos: {
                  Autorizados: tipo === 'Autorizados' ? mesData.total_arquivos : 0,
                  Cancelados: tipo === 'Cancelados' ? mesData.total_arquivos : 0,
                  CCe: tipo === 'CCe' ? mesData.total_arquivos : 0
                },
                total_arquivos: mesData.total_arquivos,
                path: mesData.path || `/storage/xml/empresa_${empresaData.id}/${ano}/${mesData.mes}`
              };
              estruturaConvertida[ano].meses.push(novoMes);
            }
          });

          // Recalcular total do ano
          estruturaConvertida[ano].total_arquivos = estruturaConvertida[ano].meses.reduce(
            (total, mes) => total + mes.total_arquivos, 0
          );
        });
      }
    });

    // Ordenar meses dentro de cada ano
    Object.keys(estruturaConvertida).forEach(ano => {
      estruturaConvertida[ano].meses.sort((a, b) => parseInt(a.mes) - parseInt(b.mes));
    });

    return estruturaConvertida;
  };

  const toggleYear = (ano: string) => {
    setExpandedYears(prev => ({
      ...prev,
      [ano]: !prev[ano]
    }));
  };

  const handleDownloadMes = async (ano: string, mes: string) => {
    const downloadKey = `${ano}-${mes}`;

    try {
      setDownloadingZip(downloadKey);

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
          mes,
          modelo: filtroModelo,
          ambiente: filtroAmbiente
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
    } finally {
      setDownloadingZip(null);
    }
  };

  const handleDownloadRelatorio = async (ano: string, mes: string) => {
    const downloadKey = `${ano}-${mes}`;

    try {
      setDownloadingPdf(downloadKey);

      const response = await fetch('/backend/public/contador-relatorio.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'relatorio_mes_completo',
          empresa_id: empresaData.id,
          ano,
          mes,
          modelo: filtroModelo
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
    } finally {
      setDownloadingPdf(null);
    }
  };

  const aplicarFiltroModelo = (estrutura: any, filtro: 'todos' | '55' | '65'): Record<string, EstruturaAno> => {
    try {
      if (filtro === 'todos') {
        // Converter estrutura detalhada para formato simples
        const estruturaSimples: Record<string, EstruturaAno> = {};

        Object.keys(estrutura).forEach(ano => {
          const anoData = estrutura[ano];
          estruturaSimples[ano] = {
            ano: anoData.ano,
            meses: anoData.meses.map((mes: any) => ({
              mes: mes.mes,
              nome_mes: mes.nome_mes,
              tipos: {
                Autorizados: (mes.tipos.Autorizados?.modelo55 || 0) + (mes.tipos.Autorizados?.modelo65 || 0),
                Cancelados: (mes.tipos.Cancelados?.modelo55 || 0) + (mes.tipos.Cancelados?.modelo65 || 0),
                CCe: (mes.tipos.CCe?.modelo55 || 0) + (mes.tipos.CCe?.modelo65 || 0)
              },
              total_arquivos: mes.total_arquivos,
              path: mes.path
            })),
            total_arquivos: anoData.total_arquivos
          };
        });

        return estruturaSimples;
      }

      // Filtrar por modelo específico
      const estruturaFiltrada: Record<string, EstruturaAno> = {};

      Object.keys(estrutura).forEach(ano => {
        const anoData = estrutura[ano];
        const mesesFiltrados = anoData.meses.map((mes: any) => {
          const tiposFiltrados = {
            Autorizados: filtro === '55' ? (mes.tipos.Autorizados?.modelo55 || 0) : (mes.tipos.Autorizados?.modelo65 || 0),
            Cancelados: filtro === '55' ? (mes.tipos.Cancelados?.modelo55 || 0) : (mes.tipos.Cancelados?.modelo65 || 0),
            CCe: filtro === '55' ? (mes.tipos.CCe?.modelo55 || 0) : (mes.tipos.CCe?.modelo65 || 0)
          };

          const totalFiltrado = tiposFiltrados.Autorizados + tiposFiltrados.Cancelados + tiposFiltrados.CCe;

          return {
            mes: mes.mes,
            nome_mes: mes.nome_mes,
            tipos: tiposFiltrados,
            total_arquivos: totalFiltrado,
            path: mes.path
          };
        }).filter((mes: any) => mes.total_arquivos > 0);

        if (mesesFiltrados.length > 0) {
          estruturaFiltrada[ano] = {
            ano: anoData.ano,
            meses: mesesFiltrados,
            total_arquivos: mesesFiltrados.reduce((total: number, mes: any) => total + mes.total_arquivos, 0)
          };
        }
      });

      return estruturaFiltrada;
    } catch (error) {
      console.error('Erro ao aplicar filtro de modelo:', error);
      return {};
    }
  };

  const getTiposResumo = (tipos: { Autorizados: number; Cancelados: number; CCe: number }) => {
    const resumo = [];
    if (tipos.Autorizados > 0) resumo.push(`${tipos.Autorizados} Autorizados`);
    if (tipos.Cancelados > 0) resumo.push(`${tipos.Cancelados} Cancelados`);
    if (tipos.CCe > 0) resumo.push(`${tipos.CCe} CCe`);
    return resumo.join(', ') || 'Nenhum arquivo';
  };

  const getFiltroTexto = () => {
    const modelo = filtroModelo === '55' ? 'NFe Modelo 55' :
                   filtroModelo === '65' ? 'NFC-e Modelo 65' :
                   'Todos os Modelos';

    const ambiente = filtroAmbiente === 'producao' ? 'Produção' :
                     filtroAmbiente === 'homologacao' ? 'Homologação' :
                     'Todos os Ambientes';

    return `${modelo} • ${ambiente}`;
  };

  const getFiltroModeloOpcoes = () => [
    { value: 'todos', label: 'Todos os Modelos', disponivel: true },
    { value: '55', label: 'NFe Modelo 55', disponivel: true },
    { value: '65', label: 'NFC-e Modelo 65', disponivel: true }
  ];

  const getFiltroAmbienteOpcoes = () => [
    { value: 'todos', label: 'Todos os Ambientes', disponivel: true },
    { value: 'producao', label: 'Produção', disponivel: true },
    { value: 'homologacao', label: 'Homologação', disponivel: true }
  ];

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

  // Componente de filtro que sempre aparece
  const renderFiltros = () => (
    <div className="bg-background-card rounded-lg border border-gray-800 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-accent-500" />
          <div>
            <h3 className="text-lg font-semibold text-white">Filtros de Busca</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">Exibindo:</span>
              <span className="text-accent-400 font-medium">{getFiltroTexto()}</span>
            </div>
          </div>
        </div>

        {/* Dropdown de Filtros */}
        <div className="relative">
          <Button
            onClick={() => setDropdownAberto(!dropdownAberto)}
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Alterar Filtros
            <ChevronDown className={`w-4 h-4 transition-transform ${dropdownAberto ? 'rotate-180' : ''}`} />
          </Button>

          {dropdownAberto && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-background-card border border-gray-700 rounded-lg shadow-lg z-10">
              {/* Seção Modelo */}
              <div className="p-3 border-b border-gray-700">
                <div className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
                  Modelo do Documento
                </div>
                {getFiltroModeloOpcoes().map((opcao) => (
                  <button
                    key={opcao.value}
                    onClick={() => {
                      setFiltroModelo(opcao.value as 'todos' | '55' | '65');
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded transition-colors mb-1 last:mb-0 ${
                      filtroModelo === opcao.value
                        ? 'bg-primary-500/20 text-primary-400 font-medium'
                        : 'text-gray-300 hover:bg-gray-800/50'
                    }`}
                  >
                    {opcao.label}
                  </button>
                ))}
              </div>

              {/* Seção Ambiente */}
              <div className="p-3">
                <div className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
                  Ambiente
                </div>
                {getFiltroAmbienteOpcoes().map((opcao) => (
                  <button
                    key={opcao.value}
                    onClick={() => {
                      setFiltroAmbiente(opcao.value as 'todos' | 'producao' | 'homologacao');
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded transition-colors mb-1 last:mb-0 ${
                      filtroAmbiente === opcao.value
                        ? 'bg-accent-500/20 text-accent-400 font-medium'
                        : 'text-gray-300 hover:bg-gray-800/50'
                    }`}
                  >
                    {opcao.label}
                  </button>
                ))}
              </div>

              {/* Botão Fechar */}
              <div className="p-3 border-t border-gray-700">
                <button
                  onClick={() => setDropdownAberto(false)}
                  className="w-full px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (anosDisponiveis.length === 0) {
    return (
      <div className="space-y-6">
        {renderFiltros()}
        <div className="bg-background-card rounded-lg border border-gray-800 p-8">
          <div className="text-center">
            <FolderOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Nenhum arquivo encontrado</h3>
            <p className="text-gray-400">
              Não foram encontrados arquivos XML para esta empresa com os filtros selecionados.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Tente alterar os filtros de modelo ou ambiente acima.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderFiltros()}

      <div className="bg-background-card rounded-lg border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-6 h-6 text-accent-500" />
            <div>
              <h3 className="text-lg font-semibold text-white">Arquivos XML</h3>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">
                  {anosDisponiveis.reduce((total, ano) => total + estrutura[ano].total_arquivos, 0)} arquivos encontrados
                </span>
              </div>
            </div>
          </div>
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
                              size="md"
                              variant="default"
                              disabled={downloadingZip === `${ano}-${mesData.mes}`}
                              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-medium px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-md"
                            >
                              {downloadingZip === `${ano}-${mesData.mes}` ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  <span>Gerando ZIP...</span>
                                </>
                              ) : (
                                <>
                                  <Download className="w-4 h-4" />
                                  <span>ZIP Completo</span>
                                </>
                              )}
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
    </div>
  );
};

export default FileExplorer;
