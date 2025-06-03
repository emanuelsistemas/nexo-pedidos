import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthSession } from '../../hooks/useAuthSession';

interface SessionCheckProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Componente que verifica a sessão antes de renderizar o conteúdo
 */
const SessionCheck: React.FC<SessionCheckProps> = ({ 
  children, 
  fallback = <SessionCheckLoading /> 
}) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { checkSession } = useAuthSession();
  const navigate = useNavigate();

  useEffect(() => {
    const verifySession = async () => {
      try {
        const isValid = await checkSession();
        
        if (isValid) {
          // Verificar se o usuário ainda existe no banco
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user) {
            const { data: usuarioData } = await supabase
              .from('usuarios')
              .select('id')
              .eq('id', userData.user.id)
              .single();
            
            if (usuarioData) {
              setIsAuthenticated(true);
            } else {
              // Usuário não existe mais no banco
              await supabase.auth.signOut();
              navigate('/entrar', { replace: true });
            }
          } else {
            navigate('/entrar', { replace: true });
          }
        } else {
          navigate('/entrar', { replace: true });
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        navigate('/entrar', { replace: true });
      } finally {
        setIsChecking(false);
      }
    };

    verifySession();
  }, [checkSession, navigate]);

  if (isChecking) {
    return <>{fallback}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};

/**
 * Componente de loading padrão para verificação de sessão
 */
const SessionCheckLoading: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400 text-sm">Verificando sessão...</p>
      </div>
    </div>
  );
};

export default SessionCheck;
export { SessionCheckLoading };
