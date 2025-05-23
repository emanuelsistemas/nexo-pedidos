import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  isMobileScreen,
  webToMobileRoute,
  mobileToWebRoute
} from '../config/responsive';

/**
 * Hook para gerenciar redirecionamento automático baseado no tamanho da tela
 *
 * Este hook:
 * - Detecta mudanças no tamanho da tela
 * - Redireciona automaticamente entre versões web e mobile
 * - Preserva parâmetros da rota atual
 * - Usa configuração global de breakpoint
 */
export const useResponsiveRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleResponsiveChange = (isMobile: boolean) => {
      const currentPath = location.pathname;

      // Se está em mobile e na versão web, redirecionar para mobile
      if (isMobile && currentPath.startsWith('/dashboard')) {
        const mobileRoute = webToMobileRoute(currentPath);
        console.log(`Redirecionando para mobile: ${currentPath} -> ${mobileRoute}`);
        navigate(mobileRoute, { replace: true });
      }

      // Se está em desktop e na versão mobile, redirecionar para web
      else if (!isMobile && currentPath.startsWith('/user')) {
        const webRoute = mobileToWebRoute(currentPath);
        console.log(`Redirecionando para web: ${currentPath} -> ${webRoute}`);
        navigate(webRoute, { replace: true });
      }
    };

    const handleResize = () => {
      handleResponsiveChange(isMobileScreen());
    };

    // Adicionar listener
    window.addEventListener('resize', handleResize);

    // Verificar tamanho inicial
    handleResize();

    // Cleanup quando o componente for desmontado
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [navigate, location.pathname]);

  // Retornar estado atual da tela
  return {
    isMobile: isMobileScreen(),
    isDesktop: !isMobileScreen()
  };
};

/**
 * Hook simples para apenas detectar o tamanho da tela sem redirecionamento
 */
export const useResponsiveDetection = () => {
  const [isMobile, setIsMobile] = useState(isMobileScreen());

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(isMobileScreen());
    };

    // Adicionar listener
    window.addEventListener('resize', handleResize);

    // Verificar tamanho inicial
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return {
    isMobile,
    isDesktop: !isMobile
  };
};
