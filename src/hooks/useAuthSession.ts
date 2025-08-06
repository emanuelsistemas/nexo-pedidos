import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { showMessage } from '../utils/toast';

/**
 * Hook para gerenciar sessões de autenticação e detectar expiração
 */
export const useAuthSession = () => {
  const navigate = useNavigate();
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);
  const lastRefreshAttemptRef = useRef(0);

  /**
   * Verifica se a sessão atual é válida
   */
  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Erro ao verificar sessão:', error);
        return false;
      }

      if (!session) {
        console.log('Sessão não encontrada');
        return false;
      }

      // Verificar se o token está próximo do vencimento
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at || 0;
      const timeUntilExpiry = expiresAt - now;

      if (timeUntilExpiry <= 0) {
        console.log('⏰ Sessão expirada');
        return false;
      }

      // Se não há renovação agendada, agendar uma
      if (!refreshTimeoutRef.current) {
        scheduleNextRefresh(session);
      }

      // Renovar apenas se estiver muito próximo da expiração (2 minutos)
      if (timeUntilExpiry <= 120) {
        console.log('⚠️ Sessão expirando em breve, renovando...');
        return await refreshSession();
      }

      return true;
    } catch (error) {
      console.error('Erro ao verificar sessão:', error);
      return false;
    }
  }, []);

  /**
   * Faz logout e redireciona para a página de login
   */
  const handleSessionExpired = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      showMessage('warning', 'Sua sessão expirou. Faça login novamente.');
      navigate('/entrar', { replace: true });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Forçar redirecionamento mesmo se o logout falhar
      window.location.href = '/entrar';
    }
  }, [navigate]);

  /**
   * Tenta renovar a sessão atual com controle de rate limiting
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    // Evitar múltiplas tentativas simultâneas
    if (isRefreshingRef.current) {
      console.log('🔄 Renovação já em andamento, aguardando...');
      return false;
    }

    // Controle de rate limiting - mínimo 30 segundos entre tentativas
    const now = Date.now();
    const timeSinceLastAttempt = now - lastRefreshAttemptRef.current;
    if (timeSinceLastAttempt < 30000) {
      console.log('⏳ Rate limiting: aguardando antes de tentar renovar novamente');
      return false;
    }

    try {
      isRefreshingRef.current = true;
      lastRefreshAttemptRef.current = now;

      console.log('🔄 Tentando renovar sessão...');
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('❌ Erro ao renovar sessão:', error);

        // Se for erro 403 (Forbidden) ou refresh token inválido, fazer logout
        if (error.message?.includes('403') ||
            error.message?.includes('Forbidden') ||
            error.message?.includes('refresh_token') ||
            error.message?.includes('invalid_grant')) {
          console.log('🚪 Refresh token expirado, fazendo logout...');
          await handleSessionExpired();
          return false;
        }

        // Se for erro de rate limiting, aguardar mais tempo
        if (error.message?.includes('rate limit') || error.message?.includes('429')) {
          console.log('⚠️ Rate limit atingido, aguardando 2 minutos...');
          lastRefreshAttemptRef.current = now + 120000; // Aguardar 2 minutos extras
        }

        return false;
      }

      if (data.session) {
        console.log('✅ Sessão renovada com sucesso');
        scheduleNextRefresh(data.session);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Erro ao renovar sessão:', error);
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [handleSessionExpired]);

  /**
   * Agenda a próxima renovação automática baseada no tempo de expiração
   */
  const scheduleNextRefresh = useCallback((session: any) => {
    // Limpar timeout anterior
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    if (!session?.expires_at) return;

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at;
    const timeUntilExpiry = expiresAt - now;

    // Renovar 10 minutos antes da expiração (ou 50% do tempo, o que for menor)
    const refreshTime = Math.min(600, Math.floor(timeUntilExpiry * 0.5));
    const refreshInMs = Math.max(refreshTime * 1000, 60000); // Mínimo 1 minuto

    // Log removido para limpar console

    refreshTimeoutRef.current = setTimeout(async () => {
      console.log('🔄 Executando renovação automática agendada...');
      const success = await refreshSession();

      if (!success) {
        console.log('❌ Renovação automática falhou, tentando novamente em 2 minutos...');
        // Tentar novamente em 2 minutos se falhar
        refreshTimeoutRef.current = setTimeout(() => refreshSession(), 120000);
      }
    }, refreshInMs);
  }, [refreshSession]);



  /**
   * Executa uma função com verificação automática de sessão
   */
  const withSessionCheck = useCallback(async <T>(
    fn: () => Promise<T>
  ): Promise<T | null> => {
    const isSessionValid = await checkSession();

    if (!isSessionValid) {
      await handleSessionExpired();
      return null;
    }

    try {
      return await fn();
    } catch (error: any) {
      // Verificar se o erro é relacionado à autenticação
      if (
        error?.message?.includes('JWT') ||
        error?.message?.includes('session') ||
        error?.message?.includes('unauthorized') ||
        error?.code === 'PGRST301' // Supabase auth error
      ) {
        console.log('Erro de autenticação detectado, verificando sessão...');
        const isStillValid = await checkSession();

        if (!isStillValid) {
          await handleSessionExpired();
          return null;
        }
      }

      throw error;
    }
  }, [checkSession, handleSessionExpired]);

  /**
   * Configura listeners para mudanças de estado da autenticação
   */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          // Limpar renovação agendada
          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
            refreshTimeoutRef.current = null;
          }
          navigate('/entrar', { replace: true });
        } else if (event === 'SIGNED_IN' && session) {
          // Agendar renovação para nova sessão
          scheduleNextRefresh(session);
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Reagendar renovação após refresh
          scheduleNextRefresh(session);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      // Limpar timeout ao desmontar
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [navigate, scheduleNextRefresh]);

  /**
   * Inicializa o sistema de renovação automática
   */
  useEffect(() => {
    const initializeAutoRefresh = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          scheduleNextRefresh(session);
        }
      } catch (error) {
        console.error('Erro ao inicializar renovação automática:', error);
      }
    };

    initializeAutoRefresh();
  }, [scheduleNextRefresh]);

  return {
    checkSession,
    refreshSession,
    withSessionCheck,
    handleSessionExpired,
    scheduleNextRefresh
  };
};
