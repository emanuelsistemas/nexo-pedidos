import { useState, useEffect, useCallback } from 'react';

/**
 * Hook personalizado para gerenciar o modo fullscreen
 */
export const useFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Verificar se o navegador suporta a API Fullscreen
  const isSupported = useCallback(() => {
    return !!(
      document.fullscreenEnabled ||
      (document as any).webkitFullscreenEnabled ||
      (document as any).mozFullScreenEnabled ||
      (document as any).msFullscreenEnabled
    );
  }, []);

  // Entrar em modo fullscreen
  const enterFullscreen = useCallback(async () => {
    if (!isSupported()) {
      console.warn('Fullscreen API não é suportada neste navegador');
      return false;
    }

    try {
      const element = document.documentElement;
      
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen();
      } else if ((element as any).mozRequestFullScreen) {
        await (element as any).mozRequestFullScreen();
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen();
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao entrar em fullscreen:', error);
      return false;
    }
  }, [isSupported]);

  // Sair do modo fullscreen
  const exitFullscreen = useCallback(async () => {
    if (!isSupported()) {
      return false;
    }

    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao sair do fullscreen:', error);
      return false;
    }
  }, [isSupported]);

  // Alternar entre fullscreen e modo normal
  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) {
      return await exitFullscreen();
    } else {
      return await enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  // Verificar se está em fullscreen
  const checkFullscreenStatus = useCallback(() => {
    const fullscreenElement = 
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement;
    
    return !!fullscreenElement;
  }, []);

  // Listener para mudanças no estado fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(checkFullscreenStatus());
    };

    // Adicionar listeners para diferentes navegadores
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // Verificar estado inicial
    setIsFullscreen(checkFullscreenStatus());

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [checkFullscreenStatus]);

  return {
    isFullscreen,
    isSupported: isSupported(),
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen
  };
};
