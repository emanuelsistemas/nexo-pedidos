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
  const connectionNotifiedRef = useRef<boolean>(false);
  
  // Função para atualizar status no banco de dados quando conectado
  const updateConnectionStatus = async () => {
    if (connectionNotifiedRef.current) {
      console.log('Conexão já notificada, ignorando notificação duplicada');
      return;
    }
    
    console.log('Atualizando status da conexão para conectado');
    try {
      // Marcar que já notificamos, antes mesmo de fazer a requisição
      // para evitar chamadas duplicadas devido a corridas
      connectionNotifiedRef.current = true;
      
      const response = await fetch(`http://localhost:3000/api/updateConnection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId,
          status: 'connected',
          lastConnection: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        console.log('Status atualizado com sucesso no banco de dados');
        // Notificar componente pai sobre a conexão
        onConnect();
        
        // Fechar o modal após exibir o sucesso por um curto período
        setTimeout(() => {
          console.log('Fechando modal após conexão bem-sucedida');
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error('Erro ao atualizar status da conexão:', error);
    }
  };

  // Reiniciar o cliente WhatsApp
  const handleReload = () => {
    setStatus('loading');
    setErrorMessage('');
    setQrCode(null);
    
    fetch('http://localhost:3000/api/reinitialize', { method: 'POST' })
      .then(() => {
        // Apenas verificamos o status uma vez após reinicialização
        setTimeout(() => {
          fetch('http://localhost:3000/api/status')
            .then(res => res.json())
            .then(data => {
              if (data.whatsapp.hasQR) {
                fetch('http://localhost:3000/api/qrcode')
                  .then(res => res.json())
                  .then(qrData => {
                    if (qrData.qrCode) {
                      setQrCode(qrData.qrCode);
                      setStatus('ready');
                    }
                  });
              }
            });
        }, 2000);
      })
      .catch((error) => {
        console.error('Erro ao reinicializar cliente:', error);
        setStatus('error');
        setErrorMessage('Não foi possível reinicializar o cliente WhatsApp');
      });
  };

  // Configurar o EventSource quando o modal é aberto
  useEffect(() => {
    if (!isOpen) return;
    
    // Resetar estado quando abrimos o modal
    setStatus('loading');
    setQrCode(null);
    setErrorMessage('');
    connectionNotifiedRef.current = false;
    
    // Verificar status inicial
    fetch('http://localhost:3000/api/status')
      .then(res => res.json())
      .then(data => {
        if (data.whatsapp.state === 'connected') {
          setStatus('connected');
          updateConnectionStatus();
        } else if (data.whatsapp.hasQR) {
          fetch('http://localhost:3000/api/qrcode')
            .then(res => res.json())
            .then(qrData => {
              if (qrData.qrCode) {
                setQrCode(qrData.qrCode);
                setStatus('ready');
              }
            });
        }
      })
      .catch(error => {
        console.error('Erro ao verificar status inicial:', error);
        setStatus('error');
        setErrorMessage('Não foi possível se comunicar com o servidor WhatsApp');
      });
    
    // Configurar EventSource para atualizações em tempo real
    const source = new EventSource('http://localhost:3000/api/events');
    eventSourceRef.current = source;
    
    // Tratar mensagens recebidas
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'qr') {
          // QR vazio ou null significa que o WhatsApp conectou
          if (data.data === "" || data.data === null) {
            console.log('QR code vazio detectado, indicando conexão bem-sucedida');
            setStatus('connected');
            updateConnectionStatus();
          }
          // QR code válido para ser exibido
          else if (data.data) {
            setQrCode(data.data);
            setStatus('ready');
          }
        } 
        else if (data.type === 'status' && data.data) {
          if (data.data.state === 'connected') {
            console.log('Status conectado recebido');
            setStatus('connected');
            updateConnectionStatus();
          } 
          else if (data.data.state === 'auth_failure') {
            setStatus('error');
            setErrorMessage('Falha na autenticação do WhatsApp');
          }
        }
      } catch (error) {
        console.error('Erro ao processar evento:', error);
      }
    };
    
    source.onerror = () => {
      setStatus('error');
      setErrorMessage('Erro na conexão com o servidor WhatsApp');
    };
    
    // Limpar recursos quando o modal é fechado
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [isOpen, connectionId]);

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
