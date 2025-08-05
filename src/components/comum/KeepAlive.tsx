import React, { useEffect, useRef } from 'react';
import { useAuthSession } from '../../hooks/useAuthSession';

interface KeepAliveProps {
  /**
   * Intervalo em minutos para verificar a sessão (padrão: 5 minutos)
   */
  intervalMinutes?: number;
  /**
   * Se deve mostrar logs no console (padrão: false)
   */
  debug?: boolean;
  /**
   * Callback chamado quando a sessão é renovada com sucesso
   */
  onSessionRefreshed?: () => void;
  /**
   * Callback chamado quando a sessão expira
   */
  onSessionExpired?: () => void;
}

/**
 * Componente para manter a sessão ativa automaticamente
 * Ideal para páginas que ficam abertas por muito tempo (como PDV)
 */
const KeepAlive: React.FC<KeepAliveProps> = ({
  intervalMinutes = 5,
  debug = false,
  onSessionRefreshed,
  onSessionExpired
}) => {
  const { checkSession, refreshSession } = useAuthSession();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef(Date.now());

  /**
   * Atualiza o timestamp da última atividade
   */
  const updateActivity = () => {
    lastActivityRef.current = Date.now();
    if (debug) {
      console.log('🔄 KeepAlive: Atividade detectada');
    }
  };

  /**
   * Verifica e renova a sessão se necessário
   */
  const checkAndRefreshSession = async () => {
    try {
      if (debug) {
        console.log('🔍 KeepAlive: Verificando sessão...');
      }

      const isValid = await checkSession();
      
      if (!isValid) {
        if (debug) {
          console.log('❌ KeepAlive: Sessão inválida, tentando renovar...');
        }

        const refreshed = await refreshSession();
        
        if (refreshed) {
          if (debug) {
            console.log('✅ KeepAlive: Sessão renovada com sucesso');
          }
          onSessionRefreshed?.();
        } else {
          if (debug) {
            console.log('❌ KeepAlive: Falha ao renovar sessão');
          }
          onSessionExpired?.();
        }
      } else {
        if (debug) {
          console.log('✅ KeepAlive: Sessão válida');
        }
      }
    } catch (error) {
      console.error('❌ KeepAlive: Erro ao verificar sessão:', error);
    }
  };

  /**
   * Configura listeners de atividade do usuário
   */
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, []);

  /**
   * Configura o intervalo de verificação da sessão
   */
  useEffect(() => {
    const intervalMs = intervalMinutes * 60 * 1000;

    // Verificação inicial
    checkAndRefreshSession();

    // Configurar intervalo
    intervalRef.current = setInterval(() => {
      // Só verificar se houve atividade recente (últimos 30 minutos)
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      const maxInactiveTime = 30 * 60 * 1000; // 30 minutos

      if (timeSinceActivity < maxInactiveTime) {
        checkAndRefreshSession();
      } else if (debug) {
        console.log('⏸️ KeepAlive: Usuário inativo, pulando verificação');
      }
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [intervalMinutes, debug]);

  // Componente não renderiza nada visualmente
  return null;
};

export default KeepAlive;
