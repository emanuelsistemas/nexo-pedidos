import React, { useState, useEffect } from 'react';
import { Plus, X, QrCode, LogOut, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import Button from '../../components/comum/Button';
import { showMessage } from '../../utils/toast';
import QRCodeModal from '../../components/conexao/QRCodeModal';

interface Connection {
  id: string;
  nome: string;
  status: 'connected' | 'disconnected' | 'pending';
  last_connection: string;
  empresa_id?: string;
}

// Função para formatar data e hora no formato brasileiro (São Paulo)
const formatarDataHoraBrasil = (dataString: string): string => {
  if (!dataString) return 'Não disponível';

  try {
    // Criar objeto de data a partir da string
    const data = new Date(dataString);

    // Verificar se a data é válida
    if (isNaN(data.getTime())) return 'Data inválida';

    // Formatar para o fuso horário de São Paulo (GMT-3)
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    }).format(data);
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return 'Erro na data';
  }
};

// Componente de confirmação para ações importantes
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="bg-background-card border border-gray-800 rounded-lg p-6 max-w-sm w-full">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="text-yellow-400" size={24} />
          <h3 className="text-lg font-medium text-white">{title}</h3>
        </div>
        <p className="text-gray-300 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="text"
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onConfirm}
          >
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
};

const ConexaoPage: React.FC = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [novaConexao, setNovaConexao] = useState({ nome: '' });
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'loading'>('loading');
  const [validandoConfiguracoes, setValidandoConfiguracoes] = useState(false);

  // Estados para os diálogos de confirmação
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Função para verificar o status do servidor
  const checkServerStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/status', {
        signal: AbortSignal.timeout(3000) // Timeout de 3 segundos
      });

      if (response.ok) {
        setServerStatus('online');
      } else {
        setServerStatus('offline');
      }
    } catch (error) {
      console.error('Erro ao verificar status do servidor:', error);
      setServerStatus('offline');
    }
  };

  useEffect(() => {
    loadConnections();
    checkServerStatus();

    // Verificar o status do servidor a cada 30 segundos
    const intervalId = setInterval(checkServerStatus, 30000);

    // Limpar o intervalo quando o componente for desmontado
    return () => clearInterval(intervalId);
  }, []);

  const loadConnections = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      const { data: conexoesData } = await supabase
        .from('conexao')
        .select('*')
        .eq('empresa_id', usuarioData.empresa_id);

      setConnections(conexoesData || []);
    } catch (error: any) {
      console.error('Error loading connections:', error);
      showMessage('error', 'Erro ao carregar conexões');
    }
  };

  // Função para verificar configurações antes de abrir o sidebar
  const verificarConfiguracoesAntesDeAdicionar = async () => {
    if (connections.length > 0) {
      showMessage('error', 'No momento, apenas uma instância de WhatsApp é permitida por empresa.');
      return;
    }

    setValidandoConfiguracoes(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        showMessage('error', 'Usuário não autenticado');
        return;
      }

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        showMessage('error', 'Empresa não encontrada');
        return;
      }

      // Validar configurações
      const validacao = await validarConfiguracoesPrevias(usuarioData.empresa_id);
      if (!validacao.valido) {
        showMessage('error', validacao.mensagem);
        return;
      }

      // Se chegou até aqui, pode abrir o sidebar
      setShowSidebar(true);
    } catch (error: any) {
      showMessage('error', 'Erro ao verificar configurações: ' + error.message);
    } finally {
      setValidandoConfiguracoes(false);
    }
  };

  // Função para validar se todas as configurações necessárias estão preenchidas
  const validarConfiguracoesPrevias = async (empresaId: string): Promise<{ valido: boolean; mensagem: string }> => {
    try {
      // 1. Verificar se a empresa existe (já validado ao obter empresa_id)

      // 2. Verificar formas de pagamento
      const { data: formasPagamento, error: errorFormasPagamento } = await supabase
        .from('formas_pagamento')
        .select('id')
        .eq('empresa_id', empresaId)
        .limit(1);

      if (errorFormasPagamento || !formasPagamento || formasPagamento.length === 0) {
        return {
          valido: false,
          mensagem: 'Você precisa cadastrar pelo menos uma forma de pagamento antes de criar uma conexão WhatsApp.'
        };
      }

      // 3. Verificar horários de atendimento
      const { data: horariosAtendimento, error: errorHorarios } = await supabase
        .from('horario_atendimento')
        .select('id')
        .eq('empresa_id', empresaId)
        .limit(1);

      if (errorHorarios || !horariosAtendimento || horariosAtendimento.length === 0) {
        return {
          valido: false,
          mensagem: 'Você precisa cadastrar pelo menos um horário de atendimento antes de criar uma conexão WhatsApp.'
        };
      }

      // 4. Verificar grupos
      const { data: grupos, error: errorGrupos } = await supabase
        .from('grupos')
        .select('id')
        .eq('empresa_id', empresaId)
        .limit(1);

      if (errorGrupos || !grupos || grupos.length === 0) {
        return {
          valido: false,
          mensagem: 'Você precisa cadastrar pelo menos um grupo de produtos antes de criar uma conexão WhatsApp.'
        };
      }

      // 5. Verificar produtos
      const { data: produtos, error: errorProdutos } = await supabase
        .from('produtos')
        .select('id')
        .eq('empresa_id', empresaId)
        .limit(1);

      if (errorProdutos || !produtos || produtos.length === 0) {
        return {
          valido: false,
          mensagem: 'Você precisa cadastrar pelo menos um produto antes de criar uma conexão WhatsApp.'
        };
      }

      // 6. Verificar taxas de entrega
      const { data: taxasEntrega, error: errorTaxas } = await supabase
        .from('taxa_entrega')
        .select('id')
        .eq('empresa_id', empresaId)
        .limit(1);

      if (errorTaxas || !taxasEntrega || taxasEntrega.length === 0) {
        return {
          valido: false,
          mensagem: 'Você precisa cadastrar pelo menos uma taxa de entrega antes de criar uma conexão WhatsApp.'
        };
      }

      // Se chegou até aqui, todas as validações passaram
      return { valido: true, mensagem: 'Todas as configurações necessárias estão preenchidas.' };

    } catch (error: any) {
      console.error('Erro ao validar configurações:', error);
      return {
        valido: false,
        mensagem: 'Erro ao validar configurações: ' + error.message
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaConexao.nome.trim()) return;

    // Verificar se já existe uma conexão
    if (connections.length > 0) {
      showMessage('error', 'No momento, apenas uma instância de WhatsApp é permitida por empresa.');
      setShowSidebar(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

      // Verificar novamente no banco de dados se já existe uma conexão para esta empresa
      const { data: existingConnections } = await supabase
        .from('conexao')
        .select('id')
        .eq('empresa_id', usuarioData.empresa_id);

      if (existingConnections && existingConnections.length > 0) {
        throw new Error('No momento, apenas uma instância de WhatsApp é permitida por empresa.');
      }

      // Validar se todas as configurações necessárias estão preenchidas
      const validacao = await validarConfiguracoesPrevias(usuarioData.empresa_id);
      if (!validacao.valido) {
        throw new Error(validacao.mensagem);
      }

      const { error } = await supabase
        .from('conexao')
        .insert([{
          nome: novaConexao.nome,
          empresa_id: usuarioData.empresa_id
        }]);

      if (error) throw error;

      setNovaConexao({ nome: '' });
      setShowSidebar(false);
      loadConnections();
      showMessage('success', 'Conexão criada com sucesso!');
    } catch (error: any) {
      showMessage('error', 'Erro ao criar conexão: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = (connection: Connection) => {
    console.log('handleConnect chamado para conexão:', connection);

    // TRAVA DE SEGURANÇA: Sempre verificar o status atual da conexão no banco de dados
    // antes de permitir a conexão direta
    const checkConnectionStatus = async () => {
      try {
        // Buscar o status atual da conexão diretamente do Supabase
        const { data, error } = await supabase
          .from('conexao')
          .select('status')
          .eq('id', connection.id)
          .single();

        if (error) {
          console.error('Erro ao verificar status da conexão:', error);
          showMessage('error', 'Erro ao verificar status da conexão');
          return;
        }

        console.log('Status atual da conexão no banco de dados:', data?.status);

        // TRAVA: Independentemente do status visual, sempre forçar a exibição do QR code
        // se o status no banco for 'disconnected'
        if (data?.status === 'disconnected' || !data?.status) {
          console.log('Conexão desconectada no banco de dados. Exibindo QR code.');
          // Definir os estados em sequência
          setSelectedConnection(connection);
          console.log('selectedConnection definido:', connection);

          // Usar um pequeno timeout para garantir que o estado anterior foi atualizado
          setTimeout(() => {
            setShowQrModal(true);
            console.log('showQrModal definido como true');
          }, 100);
        } else {
          // Mesmo que o status seja 'connected', vamos forçar a exibição do QR code
          // para garantir que o usuário tenha que escanear novamente
          console.log('Forçando exibição do QR code mesmo com status:', data?.status);
          setSelectedConnection(connection);

          setTimeout(() => {
            setShowQrModal(true);
            console.log('showQrModal definido como true');
          }, 100);
        }
      } catch (error) {
        console.error('Erro ao verificar status da conexão:', error);
        showMessage('error', 'Erro ao verificar status da conexão');
      }
    };

    // Executar a verificação
    checkConnectionStatus();
  };

  // Flag para controlar se já mostramos a mensagem de sucesso
  const [connectionNotified, setConnectionNotified] = useState(false);

  const handleConnectionSuccess = async () => {
    console.log('ConexaoPage: handleConnectionSuccess chamado');

    if (connectionNotified) {
      console.log('ConexaoPage: Notificação de conexão já processada anteriormente, retornando.');
      // Mesmo que já notificado, garantir que o modal seja fechado se ainda estiver aberto.
      if (showQrModal) {
        console.log('ConexaoPage: Fechando QRCodeModal pois conexão já foi notificada e modal ainda aberto.');
        setShowQrModal(false);
      }
      return;
    }

    setConnectionNotified(true);
    console.log('ConexaoPage: connectionNotified atualizado para true.');

    if (selectedConnection) {
      console.log('ConexaoPage: Atualizando status visual da conexão:', selectedConnection.id);
      setConnections(prev => prev.map(conn => {
        if (conn.id === selectedConnection.id) {
          return {
            ...conn,
            status: 'connected',
            last_connection: new Date().toISOString()
          };
        }
        return conn;
      }));
    }

    showMessage('success', 'WhatsApp conectado com sucesso!');

    // FECHAR O MODAL APÓS SUCESSO
    console.log('ConexaoPage: Fechando QRCodeModal após sucesso da conexão.');
    setShowQrModal(false);

    console.log('ConexaoPage: Iniciando recarga de conexões do servidor.');
    setTimeout(() => {
      loadConnections();
      setTimeout(() => {
        setConnectionNotified(false);
        console.log('ConexaoPage: connectionNotified resetado para false após delay.');
      }, 1000);
    }, 500);
  };

  const handleRemoveConnection = (connectionId: string) => {
    // Abrir diálogo de confirmação
    setConfirmDialog({
      isOpen: true,
      title: 'Remover Conexão',
      message: 'Tem certeza que deseja remover esta conexão? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        // Fechar o diálogo
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));

        try {
          const { error } = await supabase
            .from('conexao')
            .delete()
            .eq('id', connectionId);

          if (error) throw error;

          showMessage('success', 'Conexão removida com sucesso!');
          loadConnections();
        } catch (error: any) {
          showMessage('error', 'Erro ao remover conexão: ' + error.message);
        }
      }
    });
  };

  const handleDisconnect = (connectionId: string) => {
    // Abrir diálogo de confirmação
    setConfirmDialog({
      isOpen: true,
      title: 'Desconectar WhatsApp',
      message: 'Tem certeza que deseja desconectar esta instância do WhatsApp? Você precisará escanear o QR code novamente para reconectar.',
      onConfirm: async () => {
        // Fechar o diálogo
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));

        try {
          const response = await fetch('http://localhost:3001/api/logout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ connectionId }),
          });

          const result = await response.json();

          if (result.success) {
            // Atualizar imediatamente o status visual da conexão para dar feedback ao usuário
            setConnections(prev => prev.map(conn => {
              if (conn.id === connectionId) {
                return {
                  ...conn,
                  status: 'disconnected',
                  last_connection: new Date().toISOString()
                };
              }
              return conn;
            }));

            showMessage('success', 'WhatsApp desconectado com sucesso!');

            // Recarregar os dados para sincronizar com o banco de dados
            setTimeout(loadConnections, 500);
          } else {
            showMessage('error', result.error || 'Erro ao desconectar WhatsApp');
          }
        } catch (error: any) {
          console.error('Erro ao desconectar WhatsApp:', error);
          showMessage('error', 'Erro ao desconectar WhatsApp: ' + error.message);
        }
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Conexões WhatsApp</h1>
          <p className="text-gray-400 mt-1">Gerencie suas conexões do WhatsApp</p>
        </div>
        <div className="relative group">
          <Button
            type="button"
            variant="primary"
            className="flex items-center gap-2"
            onClick={verificarConfiguracoesAntesDeAdicionar}
            disabled={connections.length > 0 || validandoConfiguracoes}
          >
            {validandoConfiguracoes ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                Verificando...
              </>
            ) : (
              <>
                <Plus size={20} />
                Adicionar Conexão
              </>
            )}
          </Button>
          {connections.length > 0 && (
            <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              No momento, apenas uma instância de WhatsApp é permitida por empresa.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {connections.length === 0 ? (
          <div className="col-span-full bg-background-card rounded-lg p-8 text-center">
            <div className="bg-primary-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus size={24} className="text-primary-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Nenhuma conexão encontrada</h3>
            <p className="text-gray-400 mb-6">
              Adicione sua primeira conexão do WhatsApp para começar a receber pedidos.
            </p>
            <Button
              type="button"
              variant="primary"
              className="flex items-center gap-2 mx-auto"
              onClick={verificarConfiguracoesAntesDeAdicionar}
              disabled={connections.length > 0 || validandoConfiguracoes}
            >
              {validandoConfiguracoes ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Verificando...
                </>
              ) : (
                <>
                  <Plus size={20} />
                  Adicionar Conexão
                </>
              )}
            </Button>
          </div>
        ) : (
          connections.map((connection) => (
            <div
              key={connection.id}
              className="bg-background-card rounded-lg p-6 border border-gray-800 hover:border-primary-500/50 transition-colors relative overflow-hidden"
            >
              {/* Indicador de status na borda esquerda */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${
                  connection.status === 'connected' ? 'bg-green-500' :
                  connection.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                }`}
              ></div>
              <div className="flex flex-col mb-4">
                {/* Status badge no canto superior direito */}
                <div className="flex justify-end mb-1">
                  <div className={`px-3 py-1 rounded-full text-sm ${
                    connection.status === 'connected'
                      ? 'bg-green-500/10 text-green-400'
                      : connection.status === 'pending'
                      ? 'bg-yellow-500/10 text-yellow-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}>
                    {connection.status === 'connected' ? 'Conectado' :
                     connection.status === 'pending' ? 'Pendente' : 'Desconectado'}
                  </div>
                </div>

                {/* Nome da conexão em destaque */}
                <h3 className="text-xl font-medium text-white mb-2">
                  {connection.nome}
                </h3>

                {/* Status do servidor */}
                <div className="flex items-center gap-2 mb-2">
                  {serverStatus === 'loading' ? (
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-primary-500 rounded-full animate-spin"></div>
                  ) : serverStatus === 'online' ? (
                    <CheckCircle size={16} className="text-green-500" />
                  ) : (
                    <XCircle size={16} className="text-red-500" />
                  )}
                  <span className="text-sm font-medium">
                    Status servidor: {serverStatus === 'loading' ? 'Verificando...' : serverStatus === 'online' ? 'Online' : 'Offline'}
                  </span>
                </div>

                {/* Data da última conexão */}
                <p className="text-sm text-gray-400">
                  Última conexão: {formatarDataHoraBrasil(connection.last_connection)}
                </p>
              </div>

              {/* Separador sutil antes dos botões */}
              <div className="w-full h-px bg-gray-800 mb-4 mt-2"></div>

              <div className="flex flex-wrap gap-3">
                {/* Mostrar botão Conectar apenas quando não estiver conectado */}
                {connection.status !== 'connected' && (
                  <Button
                    type="button"
                    variant="text"
                    className={`flex-1 flex items-center justify-center gap-2 py-2 border border-gray-700 rounded-md ${
                      serverStatus === 'online' ? 'hover:bg-gray-800/50' : 'opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() => serverStatus === 'online' && handleConnect(connection)}
                    disabled={serverStatus !== 'online'}
                    title={serverStatus !== 'online' ? 'Servidor offline. Não é possível conectar.' : 'Conectar ao WhatsApp'}
                  >
                    <QrCode size={16} />
                    Conectar
                  </Button>
                )}

                {/* Botão Desconectar apenas quando estiver conectado */}
                {connection.status === 'connected' && (
                  <Button
                    type="button"
                    variant="text"
                    className="flex-1 flex items-center justify-center gap-2 py-2 border border-yellow-900/30 rounded-md text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/10"
                    onClick={() => handleDisconnect(connection.id)}
                  >
                    <LogOut size={16} />
                    Desconectar
                  </Button>
                )}

                {/* Botão Remover sempre visível */}
                <Button
                  type="button"
                  variant="text"
                  className="flex-1 flex items-center justify-center gap-2 py-2 border border-red-900/30 rounded-md text-red-400 hover:text-red-300 hover:bg-red-900/10"
                  onClick={() => handleRemoveConnection(connection.id)}
                >
                  <X size={16} />
                  Remover
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowSidebar(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed right-0 top-0 h-screen w-full max-w-md bg-background-card border-l border-gray-800 z-50 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">Nova Conexão</h2>
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Nome da Conexão
                    </label>
                    <input
                      type="text"
                      value={novaConexao.nome}
                      onChange={(e) => setNovaConexao({ nome: e.target.value })}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                      placeholder="Digite o nome da conexão"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button
                      type="button"
                      variant="text"
                      className="flex-1"
                      onClick={() => setShowSidebar(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      className="flex-1"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Criando...' : 'Criar Conexão'}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal de QR Code */}
      {console.log('Renderizando QRCodeModal? selectedConnection:', selectedConnection, 'showQrModal:', showQrModal)}

      {/* Renderizar o modal independentemente do selectedConnection para debug */}
      <QRCodeModal
        isOpen={showQrModal && selectedConnection !== null}
        onClose={() => {
          console.log('QRCodeModal onClose chamado');
          setShowQrModal(false);
        }}
        connectionId={selectedConnection?.id || ''}
        connectionName={selectedConnection?.nome || ''}
        onConnect={handleConnectionSuccess}
      />

      {/* Diálogo de confirmação para ações importantes */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default ConexaoPage;