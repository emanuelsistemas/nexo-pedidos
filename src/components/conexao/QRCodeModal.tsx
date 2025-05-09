import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw } from 'lucide-react';
import Button from '../comum/Button';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string;
  connectionName: string;
  onConnect: () => void;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  connectionId,
  connectionName,
  onConnect,
}) => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'connected' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const eventSourceRef = useRef<EventSource | null>(null);
  const statusUpdatedRef = useRef<boolean>(false);

  // Efeito para fechar automaticamente o modal após conexão bem-sucedida
  useEffect(() => {
    if (status === 'connected') {
      // Aguardar 1.5 segundos antes de fechar o modal para mostrar a animação do check
      const timer = setTimeout(() => {
        onConnect();
        setTimeout(() => {
          onClose();
        }, 500);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [status, onConnect, onClose]);

  // Verificador de status a cada 1 segundo
  useEffect(() => {
    if (!isOpen) return;
    
    // Reset o status quando o modal é aberto
    statusUpdatedRef.current = false;
    
    // Verificar status inicial
    checkStatus();
    
    // Configurar intervalo para verificar status a cada 1 segundo
    const statusInterval = setInterval(() => {
      checkStatus();
    }, 1000);
    
    return () => {
      clearInterval(statusInterval);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Inicializar conexão com eventos SSE
      const source = new EventSource('http://localhost:3000/api/events');
      // Salvar referência para poder fechar a conexão depois
      eventSourceRef.current = source;

      source.onopen = () => {
        console.log('Conexão SSE estabelecida');
      };

      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Evento recebido:', data);
          
          if (data.type === 'qr' && data.data) {
            setQrCode(data.data);
            setStatus('ready');
          } else if (data.type === 'status' && data.data) {
            if (data.data.state === 'connected') {
              setStatus('connected');
              // Quando conectado, atualizar status da conexão no backend
              updateConnectionStatus();
            } else if (data.data.state === 'auth_failure') {
              setStatus('error');
              setErrorMessage('Falha na autenticação do WhatsApp');
            }
          }
        } catch (error) {
          console.error('Erro ao processar evento:', error);
        }
      };

      source.onerror = (error) => {
        console.error('Erro na conexão SSE:', error);
        setStatus('error');
        setErrorMessage('Erro na conexão com o servidor WhatsApp');
      };

      // Verificar status inicial
      checkStatus();

      return () => {
        // Limpar evento SSE ao fechar o modal
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      };
    }
  }, [isOpen, connectionId]);

  const checkStatus = async () => {
    try {
      console.log('Verificando status da conexão...');
      const response = await fetch('http://localhost:3000/api/status');
      const data = await response.json();
      
      console.log('Status recebido:', data.whatsapp.state);
      
      // Detectar quando a conexão foi estabelecida
      if (data.whatsapp.state === 'connected' || data.whatsapp.state === 'authenticated') {
        console.log('WhatsApp conectado!');
        if (status !== 'connected' && !statusUpdatedRef.current) {
          setStatus('connected');
          // Marcar que o status já foi atualizado para evitar múltiplas chamadas
          statusUpdatedRef.current = true;
          // Atualizar o status da conexão apenas uma vez
          updateConnectionStatus();
        }
      } 
      // Verificar o status de QR code apenas se ainda não estiver conectado
      else if (status !== 'connected') {
        if (data.whatsapp.hasQR && data.whatsapp.qrCode) {
          // Se o servidor já tem o QR code, usar diretamente
          setQrCode(data.whatsapp.qrCode);
          setStatus('ready');
        } else if (data.whatsapp.hasQR) {
          // Se já existe um QR code disponível, solicitar ao backend
          const qrResponse = await fetch('http://localhost:3000/api/qrcode');
          const qrData = await qrResponse.json();
          if (qrData.qrCode) {
            setQrCode(qrData.qrCode);
            setStatus('ready');
          }
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      setStatus('error');
      setErrorMessage('Não foi possível se comunicar com o servidor WhatsApp');
    }
  };

  const updateConnectionStatus = async () => {
    try {
      // Obter o status atual do servidor WhatsApp com detalhes completos
      const statusResponse = await fetch('http://localhost:3000/api/status?details=true');
      const statusData = await statusResponse.json();
      
      // Obter informações detalhadas do WhatsApp se disponível
      let phoneInfo = {};
      if (statusData.whatsapp.state === 'connected' || statusData.whatsapp.state === 'authenticated') {
        try {
          // Tentar obter informações adicionais do telefone
          const phoneInfoResponse = await fetch('http://localhost:3000/api/phone-info');
          if (phoneInfoResponse.ok) {
            const phoneData = await phoneInfoResponse.json();
            phoneInfo = {
              phone_number: phoneData.number,
              platform: phoneData.platform,
              device_model: phoneData.device,
              whatsapp_version: phoneData.wa_version
            };
            console.log('Informações do telefone obtidas:', phoneInfo);
          }
        } catch (phoneError) {
          // Não bloquear o fluxo se não conseguir obter informações do telefone
          console.warn('Não foi possível obter informações do telefone:', phoneError);
        }
      }
      
      // Preparar os dados para atualizar no banco com informações completas
      const connectionData = {
        connectionId,
        status: 'connected',
        lastConnection: new Date().toISOString(),
        // Status de conexão
        conectado: true,
        ultima_verificacao: new Date().toISOString(),
        // Se houver um ID de sessão disponível, salvá-lo
        id_sessao: statusData.whatsapp.sessionId || statusData.whatsapp.clientId || null,
        // Adicionar informações do telefone se disponíveis
        ...phoneInfo
      };
      
      console.log('Atualizando status da conexão com dados completos:', connectionData);
      
      // Chamada para API que atualizará o status no Supabase
      const response = await fetch(`http://localhost:3000/api/updateConnection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(connectionData),
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('Conexão atualizada com sucesso:', responseData);
        onConnect(); // Notificar o componente pai sobre a conexão
      }
    } catch (error) {
      console.error('Erro ao atualizar status da conexão:', error);
    }
  };

  const handleReload = () => {
    setStatus('loading');
    setErrorMessage('');
    setQrCode(null);
    
    // Realizar reinicialização completa do cliente WhatsApp
    fetch('http://localhost:3000/api/reinitialize', { method: 'POST' })
      .then(() => {
        // Aguardar um pouco mais para a reinicialização completa ocorrer
        setTimeout(checkStatus, 3000);
      })
      .catch((error) => {
        console.error('Erro ao reinicializar cliente:', error);
        setStatus('error');
        setErrorMessage('Não foi possível reinicializar o cliente WhatsApp');
      });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background-card border border-gray-800 rounded-lg shadow-xl z-50"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">
                  Conectar WhatsApp: {connectionName}
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                {status === 'loading' && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 border-4 border-gray-600 border-t-primary-500 rounded-full animate-spin mb-4" />
                    <p className="text-gray-300">Carregando QR Code...</p>
                  </div>
                )}

                {status === 'ready' && qrCode && (
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className="bg-white p-4 rounded-lg">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrCode)}&size=200x200`}
                        alt="QR Code para conexão do WhatsApp"
                        className="w-48 h-48"
                      />
                    </div>
                    <div className="mt-4 text-center">
                      <p className="text-gray-300 mb-2">Escaneie o QR Code com seu WhatsApp</p>
                      <p className="text-sm text-gray-400">
                        Abra o WhatsApp no seu celular, toque em Menu ou Configurações e selecione WhatsApp Web
                      </p>
                    </div>
                  </div>
                )}

                {status === 'connected' && (
                  <motion.div 
                    className="flex flex-col items-center justify-center py-8"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div 
                      className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4"
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 10, stiffness: 200 }}
                    >
                      <motion.svg 
                        className="w-10 h-10 text-green-500" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                      >
                        <motion.path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={3} 
                          d="M5 13l4 4L19 7" 
                        />
                      </motion.svg>
                    </motion.div>
                    <h3 className="text-lg font-medium text-white mb-2">Conectado com sucesso!</h3>
                    <p className="text-gray-400 text-center">
                      Sua instância do WhatsApp está conectada e pronta para uso.
                    </p>
                  </motion.div>
                )}

                {status === 'error' && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">Erro na conexão</h3>
                    <p className="text-gray-400 text-center mb-4">
                      {errorMessage || 'Não foi possível estabelecer conexão com o WhatsApp'}
                    </p>
                    <Button
                      type="button"
                      variant="primary"
                      className="flex items-center gap-2"
                      onClick={handleReload}
                    >
                      <RefreshCw size={18} />
                      Tentar novamente
                    </Button>
                  </div>
                )}

                {(status === 'ready' || status === 'loading') && (
                  <div className="flex justify-end gap-4 pt-4 border-t border-gray-800">
                    <Button
                      type="button"
                      variant="text"
                      onClick={onClose}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      disabled={status === 'loading'}
                      onClick={handleReload}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw size={18} />
                      Recarregar QR
                    </Button>
                  </div>
                )}

                {status === 'connected' && (
                  <div className="flex justify-end pt-4 border-t border-gray-800">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={onClose}
                    >
                      Fechar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default QRCodeModal;
