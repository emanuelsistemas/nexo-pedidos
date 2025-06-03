import { useState, useCallback } from 'react';

interface ApiLog {
  timestamp: string;
  level: string;
  source: string;
  message: string;
  status?: string;
}

interface ApiLogsResponse {
  success: boolean;
  data: ApiLog[];
  total: number;
  level: string;
  limit: number;
  offset: number;
  timestamp: string;
}

export const useApiLogs = () => {
  const [apiLogs, setApiLogs] = useState<ApiLog[]>([]);
  const [isLoadingApiLogs, setIsLoadingApiLogs] = useState(false);
  const [apiLogsError, setApiLogsError] = useState<string | null>(null);

  const fetchApiLogs = useCallback(async (
    level: 'all' | 'error' | 'info' | 'debug' = 'error',
    limit: number = 10
  ) => {
    setIsLoadingApiLogs(true);
    setApiLogsError(null);

    try {
      const params = new URLSearchParams({
        level,
        limit: limit.toString(),
        offset: '0'
      });

      const response = await fetch(`/backend/public/logs.php?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiLogsResponse = await response.json();

      if (data.success) {
        setApiLogs(data.data);
        return data;
      } else {
        throw new Error('Falha ao buscar logs da API');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setApiLogsError(errorMessage);
      console.error('🔴 Erro ao buscar logs da API:', err);
      return null;
    } finally {
      setIsLoadingApiLogs(false);
    }
  }, []);

  const formatApiLog = useCallback((log: ApiLog) => {
    const timestamp = new Date(log.timestamp).toLocaleTimeString();
    const source = log.source?.toUpperCase() || 'API';

    // Ícones por nível
    const icon = log.level.toLowerCase() === 'error' ? '🔴' :
                 log.level.toLowerCase() === 'info' ? '🔵' :
                 log.level.toLowerCase() === 'debug' ? '🔧' : '📝';

    // Truncar mensagem se muito longa
    const message = log.message.length > 100 ?
                   log.message.substring(0, 100) + '...' :
                   log.message;

    return `${icon} [${timestamp}] [${source}] ${message}`;
  }, []);

  const copyApiLogsToClipboard = useCallback(() => {
    const logsText = apiLogs.map(formatApiLog).join('\n');
    return navigator.clipboard.writeText(logsText);
  }, [apiLogs, formatApiLog]);

  const clearApiLogs = useCallback(() => {
    setApiLogs([]);
    setApiLogsError(null);
  }, []);

  return {
    apiLogs,
    isLoadingApiLogs,
    apiLogsError,
    fetchApiLogs,
    formatApiLog,
    copyApiLogsToClipboard,
    clearApiLogs
  };
};
