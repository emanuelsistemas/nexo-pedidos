import React, { useState, useEffect } from 'react';
import { Plus, X, QrCode, LogOut } from 'lucide-react';
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

const ConexaoPage: React.FC = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [novaConexao, setNovaConexao] = useState({ nome: '' });
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);

  useEffect(() => {
    loadConnections();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaConexao.nome.trim()) return;

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
    setSelectedConnection(connection);
    setShowQrModal(true);
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

  const handleRemoveConnection = async (connectionId: string) => {
    if (!window.confirm('Tem certeza que deseja remover esta conexão?')) return;
    
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
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      const response = await fetch('http://localhost:3000/api/logout', {
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
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Conexões WhatsApp</h1>
          <p className="text-gray-400 mt-1">Gerencie suas conexões do WhatsApp</p>
        </div>
        <Button
          type="button"
          variant="primary"
          className="flex items-center gap-2"
          onClick={() => setShowSidebar(true)}
        >
          <Plus size={20} />
          Adicionar Conexão
        </Button>
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
              onClick={() => setShowSidebar(true)}
            >
              <Plus size={20} />
              Adicionar Conexão
            </Button>
          </div>
        ) : (
          connections.map((connection) => (
            <div
              key={connection.id}
              className="bg-background-card rounded-lg p-6 border border-gray-800 hover:border-primary-500/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-white">{connection.nome}</h3>
                  <p className="text-sm text-gray-400">Última conexão: {connection.last_connection}</p>
                </div>
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
              
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="text"
                  className="flex-1 flex items-center justify-center gap-2"
                  onClick={() => handleConnect(connection)}
                >
                  <QrCode size={16} />
                  {connection.status === 'connected' ? 'Reconectar' : 'Conectar'}
                </Button>
                {connection.status === 'connected' && (
                  <Button
                    type="button"
                    variant="text"
                    className="flex-1 flex items-center justify-center gap-2 text-yellow-400 hover:text-yellow-300"
                    onClick={() => handleDisconnect(connection.id)}
                  >
                    <LogOut size={16} />
                    Desconectar
                  </Button>
                )}
                <Button
                  type="button"
                  variant="text"
                  className="flex-1 text-red-400 hover:text-red-300"
                  onClick={() => handleRemoveConnection(connection.id)}
                >
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
      {selectedConnection && (
        <QRCodeModal 
          isOpen={showQrModal}
          onClose={() => {
            console.log('QRCodeModal onClose chamado');
            setShowQrModal(false);
          }}
          connectionId={selectedConnection.id}
          connectionName={selectedConnection.nome}
          onConnect={handleConnectionSuccess}
        />
      )}
    </div>
  );
};

export default ConexaoPage;