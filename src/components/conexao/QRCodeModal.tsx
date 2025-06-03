import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw } from 'lucide-react';
import Button from '../comum/Button';
import { QRCodeSVG } from 'qrcode.react';

// Componente para mostrar mensagens alternadas durante o carregamento
const LoadingMessages = () => {
  const messages = [
    "Inicializando WhatsApp...",
    "Preparando QR Code...",
    "Conectando ao servidor...",
    "Configurando sessão...",
    "Quase lá...",
    "Gerando QR Code...",
    "Estabelecendo conexão segura..."
  ];

  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    // Alternar entre as mensagens a cada 2.5 segundos
    const interval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={messageIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="text-xs text-gray-300 text-center min-h-[1.5rem]"
      >
        {messages[messageIndex]}
      </motion.p>
    </AnimatePresence>
  );
};

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
      // TRAVA DE SEGURANÇA: Verificar se o WhatsApp está realmente conectado
      // antes de atualizar o status no banco de dados
      const statusResponse = await fetch('http://localhost:3001/api/status');
      const statusData = await statusResponse.json();

      if (!statusData.whatsapp || statusData.whatsapp.state !== 'connected') {
        console.error('TRAVA DE SEGURANÇA: WhatsApp não está realmente conectado!', statusData);
        setStatus('error');
        setErrorMessage('Erro: WhatsApp não está realmente conectado. Tente novamente.');
        return;
      }

      // Marcar que já notificamos, antes mesmo de fazer a requisição
      connectionNotifiedRef.current = true;
      console.log('connectionNotifiedRef atualizado para true');

      const response = await fetch(`http://localhost:3001/api/updateConnection`, {
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
      } else {
        // Se a atualização falhar, reverter o flag
        connectionNotifiedRef.current = false;
        console.error('Falha ao atualizar status no banco de dados');
        setStatus('error');
        setErrorMessage('Erro ao atualizar status da conexão no banco de dados');
      }
    } catch (error) {
      // Se ocorrer um erro, reverter o flag
      connectionNotifiedRef.current = false;
      console.error('Erro ao atualizar status da conexão:', error);
      setStatus('error');
      setErrorMessage('Erro ao atualizar status da conexão');
    }
  };

  // Reiniciar o cliente WhatsApp
  const handleReload = () => {
    setStatus('loading');
    setErrorMessage('');
    setQrCode(null);

    fetch('http://localhost:3001/api/reinitialize', { method: 'POST' })
      .then(() => {
        // Apenas verificamos o status uma vez após reinicialização
        setTimeout(() => {
          fetch('http://localhost:3001/api/status')
            .then(res => res.json())
            .then(data => {
              if (data.whatsapp.hasQR) {
                fetch('http://localhost:3001/api/qrcode')
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

  useEffect(() => {
    if (!isOpen) {
      // Se o modal não está aberto, garantir que o EventSource seja fechado se existir
      if (eventSourceRef.current) {
        console.log('[QRCodeModal] Modal não está aberto, fechando EventSource existente.');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    console.log(`[QRCodeModal] useEffect executado para connectionId: ${connectionId}, isOpen: ${isOpen}`);
    setStatus('loading');
    setQrCode(null);
    setErrorMessage('');
    connectionNotifiedRef.current = false;

    const triggerReinitialize = () => {
      console.log(`[QRCodeModal] Disparando reinicialização para connectionId: ${connectionId}`);
      setStatus('loading');
      setQrCode(null);

      // Definir um timeout para mostrar uma mensagem se demorar muito
      const timeoutId = setTimeout(() => {
        if (status === 'loading') {
          console.log('[QRCodeModal] Gerando QR Code está demorando mais que o esperado...');
          setErrorMessage('Gerando QR Code... Isso pode levar alguns segundos.');
        }
      }, 3000); // 3 segundos

      fetch('http://localhost:3001/api/reinitialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: connectionId })
      })
      .then(res => res.json())
      .then(reinitData => {
        clearTimeout(timeoutId); // Limpar o timeout

        if (reinitData.success) {
          console.log('[QRCodeModal] Reinicialização solicitada com sucesso. Aguardando QR Code via SSE...');

          // Se já temos um QR code disponível imediatamente
          if (reinitData.hasExistingQR) {
            console.log('[QRCodeModal] QR code já disponível no backend, aguardando recebimento via SSE...');
          }
        } else {
          console.error('[QRCodeModal] Falha ao solicitar reinicialização:', reinitData.error);
          setStatus('error');
          setErrorMessage(reinitData.error || 'Falha ao tentar obter QR Code.');
        }
      })
      .catch(err => {
        clearTimeout(timeoutId); // Limpar o timeout
        console.error('[QRCodeModal] Erro de rede ao solicitar reinicialização:', err);
        setStatus('error');
        setErrorMessage('Erro de rede ao tentar obter QR Code.');
      });
    };

    fetch('http://localhost:3001/api/status')
      .then(res => res.json())
      .then(data => {
        const backendStatus = data.whatsapp;
        console.log('[QRCodeModal] Status inicial recebido:', backendStatus, 'para connectionId:', connectionId);

        if (backendStatus.connectionId === connectionId) {
          // TRAVA DE SEGURANÇA: Mesmo que o backend diga que está conectado,
          // vamos sempre forçar a exibição do QR code para garantir que o usuário escaneie novamente
          if (backendStatus.state === 'connected') {
            console.log('[QRCodeModal] Conexão parece estar estabelecida para este ID, mas vamos forçar reinicialização para garantir.');
            // Forçar reinicialização para garantir que o usuário escaneie o QR code novamente
            triggerReinitialize();
          } else if ((backendStatus.state === 'pending_qr' || backendStatus.state === 'initializing') && backendStatus.hasQR && backendStatus.qrCode) {
            console.log('[QRCodeModal] Backend tem QR Code para este ID. Exibindo.');
            setQrCode(backendStatus.qrCode);
            setStatus('ready');
          } else {
            console.log(`[QRCodeModal] Estado inicial (${backendStatus.state}) não ideal ou sem QR para ${connectionId}. Forçando reinicialização.`);
            triggerReinitialize();
          }
        } else {
          // Se o connectionId do backend não bate, OU se o backend está focado em NENHUMA conexão (connectionId: null)
          // E este modal foi aberto para uma connectionId específica, então precisamos reinicializar PARA ESTA connectionId.
          console.log(`[QRCodeModal] Backend focado em outra conexão (${backendStatus.connectionId}) ou nenhuma. Forçando reinicialização para ${connectionId}.`);
          triggerReinitialize();
        }
      })
      .catch(error => {
        console.error('[QRCodeModal] Erro ao verificar status inicial. Forçando reinicialização:', error);
        setErrorMessage('Não foi possível verificar o status inicial. Tentando obter QR Code...');
        triggerReinitialize();
      });

    // Configurar EventSource somente se não existir um
    if (!eventSourceRef.current) {
        console.log('[QRCodeModal] Configurando novo EventSource...');
    const source = new EventSource('http://localhost:3001/api/events');
    eventSourceRef.current = source;

        source.onopen = () => {
            console.log('[QRCodeModal] EventSource conectado.');
        };

    source.onmessage = (event) => {
      try {
            const eventData = JSON.parse(event.data);

            if (eventData.type === 'qr') {
              if (status !== 'connected') {
                if (eventData.data === "" || eventData.data === null) {
                  console.log('[QRCodeModal] Evento QR vazio/null recebido. Tratando como conectado.');
                  setStatus('connected');
                  if (!connectionNotifiedRef.current) {
                    updateConnectionStatus();
                  }
                } else if (eventData.data) {
                  console.log('[QRCodeModal] QR code válido recebido via SSE. Exibindo.');
                  // Limpar qualquer mensagem de erro que possa estar sendo exibida
                  setErrorMessage('');
                  // Definir o QR code e atualizar o status imediatamente
                  setQrCode(eventData.data);
                  setStatus('ready');
                }
              }
            }
            else if (eventData.type === 'status' && eventData.data) {
              if (eventData.data.connectionId === connectionId) {
                if (eventData.data.state === 'connected' && status !== 'connected') {
                  console.log(`[QRCodeModal] Evento de status 'connected' para ${connectionId}.`);

                  // TRAVA DE SEGURANÇA: Verificar se o WhatsApp está realmente conectado
                  // antes de atualizar o status
                  fetch('http://localhost:3001/api/status')
                    .then(res => res.json())
                    .then(statusData => {
                      if (statusData.whatsapp && statusData.whatsapp.state === 'connected') {
                        console.log('[QRCodeModal] Confirmado: WhatsApp realmente conectado.');
                        setStatus('connected');
                        if (!connectionNotifiedRef.current) updateConnectionStatus();
                      } else {
                        console.error('[QRCodeModal] TRAVA DE SEGURANÇA: Evento indica conexão, mas verificação mostra que não está conectado!');
                        // Não atualizar o status para conectado
                      }
                    })
                    .catch(err => {
                      console.error('[QRCodeModal] Erro ao verificar status real do WhatsApp:', err);
                    });
                } else if (eventData.data.state === 'auth_failure') {
                  console.log(`[QRCodeModal] Evento de status 'auth_failure' para ${connectionId}.`);
                  setStatus('error');
                  setErrorMessage('Falha na autenticação do WhatsApp.');
                } else if (eventData.data.state === 'disconnected' && status === 'connected'){
                  console.log(`[QRCodeModal] Evento de status 'disconnected' para ${connectionId} que estava conectada. Fechando modal.`);
                  onClose();
                } else if (eventData.data.state === 'pending_qr' && eventData.data.hasQR && eventData.data.qrCode && status !== 'ready') {
                  console.log(`[QRCodeModal] Evento de status 'pending_qr' com QR para ${connectionId}. Exibindo QR.`);
                  setQrCode(eventData.data.qrCode);
                  setStatus('ready');
                }
              }
            } else if (eventData.type === 'reload') {
              if (eventData.data.connectionId === connectionId || !eventData.data.connectionId) {
                console.log('[QRCodeModal] Evento SSE de reload do backend. Modal aguardando novo QR.');
                if(status !== 'connected') {
                  setStatus('loading');
                  setQrCode(null);
                }
          }
        }
      } catch (error) {
            console.error('[QRCodeModal] Erro ao processar evento SSE:', error);
      }
    };

        source.onerror = (err) => {
          console.error('[QRCodeModal] EventSource error:', err);
          if (status !== 'connected') {
      setStatus('error');
            setErrorMessage('Erro na conexão com o servidor de eventos (SSE).');
          }
          // Fechar e limpar o EventSource em caso de erro para tentar recriar se o modal reabrir
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
            console.log('[QRCodeModal] EventSource fechado devido a erro.');
          }
        };
    } else {
        console.log('[QRCodeModal] EventSource já existe. Não recriando.');
    }

    return () => {
      if (eventSourceRef.current) {
        console.log('[QRCodeModal] Limpando EventSource no return do useEffect.');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [isOpen, connectionId, onConnect, onClose]); // Removido status da dependência por enquanto para evitar loops não intencionais com setStatus

  console.log('QRCodeModal renderizando com isOpen:', isOpen);

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
                      {/* Loading animado mais interativo */}
                      <div className="relative w-16 h-16 mb-3">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 border-4 border-gray-600 border-t-primary-500 rounded-full animate-spin" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 border-3 border-gray-700 border-t-primary-400 rounded-full animate-spin-slow"
                               style={{animationDirection: 'reverse'}} />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-4 h-4 bg-primary-500 rounded-full animate-pulse" />
                        </div>
                      </div>

                      {/* Mensagens alternadas */}
                      <LoadingMessages />

                      {/* Mensagem de erro, se houver */}
                      {errorMessage && (
                        <p className="text-xs text-gray-400 mt-2 max-w-[200px] text-center">
                          {errorMessage}
                        </p>
                      )}

                      {/* Barra de progresso animada */}
                      <div className="w-48 h-1 bg-gray-800 rounded-full mt-3 overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full animate-progress-bar" />
                      </div>

                      <div className="mt-3 text-xs text-gray-500">
                        <p className="text-center">Aguarde enquanto preparamos sua conexão</p>
                      </div>
                  </div>
                )}

                {status === 'ready' && qrCode && (
                    <motion.div
                      className="flex flex-col items-center justify-center py-1"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", duration: 0.5 }}
                    >
                      <div className="relative">
                        {/* Moldura animada em volta do QR code */}
                        <div className="absolute -inset-2 rounded-lg bg-gradient-to-r from-primary-500 via-accent-500 to-primary-500 opacity-75 blur-sm animate-pulse"></div>

                        {/* QR code com fundo branco */}
                        <div className="relative bg-white p-2 rounded-lg shadow-lg">
                          <QRCodeSVG value={qrCode} size={120} />

                          {/* Indicador de escaneamento */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-20 h-20 border-2 border-primary-500 opacity-50 animate-ping rounded-sm"></div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 text-center">
                        <motion.p
                          className="text-sm font-medium text-white mb-1"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          QR Code pronto!
                        </motion.p>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          <p className="text-xs text-gray-300 mb-1">Escaneie o QR Code</p>
                          <p className="text-xs text-gray-400">
                            Abra o WhatsApp e selecione WhatsApp Web
                          </p>
                        </motion.div>
                      </div>
                    </motion.div>
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
