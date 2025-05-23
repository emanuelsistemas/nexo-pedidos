import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { showMessage } from '../utils/toast';

/**
 * Hook para gerenciar sessões de autenticação e detectar expiração
 */
export const useAuthSession = () => {
  const navigate = useNavigate();

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

      // Verificar se o token está próximo do vencimento (5 minutos antes)
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at || 0;
      const timeUntilExpiry = expiresAt - now;

      if (timeUntilExpiry <= 0) {
        console.log('Sessão expirada');
        return false;
      }

      if (timeUntilExpiry <= 300) { // 5 minutos
        console.log('Sessão próxima do vencimento, tentando renovar...');
        return await refreshSession();
      }

      return true;
    } catch (error) {
      console.error('Erro ao verificar sessão:', error);
      return false;
    }
  }, []);

  /**
   * Tenta renovar a sessão atual
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Erro ao renovar sessão:', error);
        return false;
      }

      if (data.session) {
        console.log('Sessão renovada com sucesso');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erro ao renovar sessão:', error);
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
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_OUT') {
          console.log('Usuário deslogado');
          navigate('/entrar', { replace: true });
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token renovado automaticamente');
        } else if (event === 'SIGNED_IN') {
          console.log('Usuário logado');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  /**
   * Verifica a sessão periodicamente (a cada 5 minutos)
   */
  useEffect(() => {
    const interval = setInterval(async () => {
      const isValid = await checkSession();
      if (!isValid) {
        await handleSessionExpired();
      }
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [checkSession, handleSessionExpired]);

  return {
    checkSession,
    refreshSession,
    withSessionCheck,
    handleSessionExpired
  };
};
