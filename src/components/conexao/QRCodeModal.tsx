import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw } from 'lucide-react';
import Button from '../comum/Button';
import { QRCodeSVG } from 'qrcode.react';

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
    console.log('Iniciando updateConnectionStatus, connectionNotifiedRef:', connectionNotifiedRef.current);
    
    if (connectionNotifiedRef.current) {
      console.log('Conexão já notificada, ignorando notificação duplicada');
      return;
    }
    
    console.log('Atualizando status da conexão para conectado');
    try {
      // Marcar que já notificamos, antes mesmo de fazer a requisição
      connectionNotifiedRef.current = true;
      console.log('connectionNotifiedRef atualizado para true');
      
      const response = await fetch(`http://localhost:3000/api/updateConnection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId,
          status: 'connected',
          last_connection: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        console.log('Status atualizado com sucesso no banco de dados');
        // Notificar componente pai sobre a conexão
        onConnect();
        console.log('onConnect chamado');
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
        console.log('Evento recebido:', data);
        
        if (data.type === 'qr') {
          console.log('Evento QR recebido:', typeof data.data, data.data === "", data.data === null);
          
          // QR vazio ou null significa que o WhatsApp conectou
          if (data.data === "" || data.data === null) {
            console.log('QR code vazio detectado, indicando conexão bem-sucedida');
            setStatus('connected');
            console.log('Status atualizado para connected');
            
            // Atualizar status no banco de dados
            updateConnectionStatus();
            
            // Fechar o modal imediatamente após conexão bem-sucedida
            onClose();
          }
          // QR code válido para ser exibido
          else if (data.data) {
            console.log('QR code válido recebido, exibindo para escaneamento');
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
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="w-full max-w-xs bg-background-card border border-gray-800 rounded-lg shadow-xl z-50"
              style={{ margin: '0 auto' }}
            >
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-semibold text-white">
                    Conectar: {connectionName}
                  </h2>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3">
                  {status === 'loading' && (
                    <div className="flex flex-col items-center justify-center py-4">
                      <div className="w-10 h-10 border-3 border-gray-600 border-t-primary-500 rounded-full animate-spin mb-2" />
                      <p className="text-xs text-gray-300">Carregando QR Code...</p>
                    </div>
                  )}

                  {status === 'ready' && qrCode && (
                    <div className="flex flex-col items-center justify-center py-1">
                      <div className="bg-white p-1 rounded-lg">
                        <QRCodeSVG value={qrCode} size={150} />
                      </div>
                      <div className="mt-2 text-center">
                        <p className="text-xs text-gray-300 mb-1">Escaneie o QR Code</p>
                        <p className="text-xs text-gray-400">
                          Abra o WhatsApp e selecione WhatsApp Web
                        </p>
                      </div>
                    </div>
                  )}

                  {status === 'connected' && (
                    <motion.div 
                      className="flex flex-col items-center justify-center py-4"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <motion.div 
                        className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-2"
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 10, stiffness: 200 }}
                      >
                        <motion.svg 
                          className="w-6 h-6 text-green-500" 
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
                      <h3 className="text-sm font-medium text-white mb-1">Conectado com sucesso!</h3>
                      <p className="text-xs text-gray-400 text-center">
                        WhatsApp pronto para uso.
                      </p>
                    </motion.div>
                  )}

                  {status === 'error' && (
                    <div className="flex flex-col items-center justify-center py-4">
                      <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-2">
                        <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-medium text-white mb-1">Erro na conexão</h3>
                      <p className="text-xs text-gray-400 text-center mb-2">
                        {errorMessage || 'Não foi possível conectar ao WhatsApp'}
                      </p>
                      <Button
                        type="button"
                        variant="primary"
                        className="flex items-center gap-1 text-xs py-1 px-2"
                        onClick={handleReload}
                      >
                        <RefreshCw size={12} />
                        Tentar novamente
                      </Button>
                    </div>
                  )}

                  {(status === 'ready' || status === 'loading') && (
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
                      <Button
                        type="button"
                        variant="text"
                        onClick={onClose}
                        className="text-xs py-1 px-2"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        disabled={status === 'loading'}
                        onClick={handleReload}
                        className="flex items-center gap-1 text-xs py-1 px-2"
                      >
                        <RefreshCw size={12} />
                        Recarregar
                      </Button>
                    </div>
                  )}

                  {status === 'connected' && (
                    <div className="flex justify-end pt-2 border-t border-gray-800">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={onClose}
                        className="text-xs py-1 px-2"
                      >
                        Fechar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default QRCodeModal;
