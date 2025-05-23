/**
 * Configurações globais de responsividade
 * 
 * Para alterar o breakpoint mobile, modifique apenas o valor MOBILE_BREAKPOINT
 * e todo o sistema será atualizado automaticamente.
 */

// Breakpoint para ativar a versão mobile (em pixels)
export const MOBILE_BREAKPOINT = 600;

/**
 * Verifica se a tela atual é considerada mobile
 * @returns true se a largura da tela for menor que o breakpoint mobile
 */
export const isMobileScreen = (): boolean => {
  return window.innerWidth < MOBILE_BREAKPOINT;
};

/**
 * Verifica se a tela atual é considerada desktop
 * @returns true se a largura da tela for maior ou igual ao breakpoint mobile
 */
export const isDesktopScreen = (): boolean => {
  return window.innerWidth >= MOBILE_BREAKPOINT;
};

/**
 * Hook personalizado para detectar mudanças no tamanho da tela
 * @param callback Função a ser executada quando o tamanho da tela mudar
 */
export const useResponsiveListener = (callback: (isMobile: boolean) => void) => {
  const handleResize = () => {
    callback(isMobileScreen());
  };

  // Adicionar listener
  window.addEventListener('resize', handleResize);
  
  // Verificar tamanho inicial
  handleResize();

  // Função de cleanup
  return () => {
    window.removeEventListener('resize', handleResize);
  };
};

/**
 * Classe CSS para media queries baseada no breakpoint
 */
export const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;
export const DESKTOP_MEDIA_QUERY = `(min-width: ${MOBILE_BREAKPOINT}px)`;

/**
 * Configurações de redirecionamento
 */
export const REDIRECT_CONFIG = {
  // Rotas da versão web que devem ser redirecionadas para mobile
  WEB_TO_MOBILE_ROUTES: {
    '/dashboard': '/user/dashboard',
    '/dashboard/pedidos': '/user/pedidos',
    '/dashboard/pedidos/novo': '/user/pedidos/novo',
    '/dashboard/pedidos/editar': '/user/pedidos/editar',
    '/dashboard/produtos': '/user/produtos',
    '/dashboard/clientes': '/user/clientes',
    '/dashboard/configuracoes': '/user/configuracoes',
  },
  
  // Rotas da versão mobile que devem ser redirecionadas para web
  MOBILE_TO_WEB_ROUTES: {
    '/user/dashboard': '/dashboard',
    '/user/pedidos': '/dashboard/pedidos',
    '/user/pedidos/novo': '/dashboard/pedidos/novo',
    '/user/pedidos/editar': '/dashboard/pedidos/editar',
    '/user/produtos': '/dashboard/produtos',
    '/user/clientes': '/dashboard/clientes',
    '/user/configuracoes': '/dashboard/configuracoes',
  }
};

/**
 * Converte uma rota web para mobile
 * @param webRoute Rota da versão web
 * @returns Rota correspondente na versão mobile
 */
export const webToMobileRoute = (webRoute: string): string => {
  // Verificar rotas exatas primeiro
  if (REDIRECT_CONFIG.WEB_TO_MOBILE_ROUTES[webRoute]) {
    return REDIRECT_CONFIG.WEB_TO_MOBILE_ROUTES[webRoute];
  }
  
  // Verificar rotas com parâmetros (ex: /dashboard/pedidos/editar/123)
  for (const [webPattern, mobileRoute] of Object.entries(REDIRECT_CONFIG.WEB_TO_MOBILE_ROUTES)) {
    if (webRoute.startsWith(webPattern)) {
      // Preservar parâmetros da rota
      const params = webRoute.replace(webPattern, '');
      return mobileRoute + params;
    }
  }
  
  // Se não encontrar correspondência, redirecionar para dashboard mobile
  return '/user/dashboard';
};

/**
 * Converte uma rota mobile para web
 * @param mobileRoute Rota da versão mobile
 * @returns Rota correspondente na versão web
 */
export const mobileToWebRoute = (mobileRoute: string): string => {
  // Verificar rotas exatas primeiro
  if (REDIRECT_CONFIG.MOBILE_TO_WEB_ROUTES[mobileRoute]) {
    return REDIRECT_CONFIG.MOBILE_TO_WEB_ROUTES[mobileRoute];
  }
  
  // Verificar rotas com parâmetros (ex: /user/pedidos/editar/123)
  for (const [mobilePattern, webRoute] of Object.entries(REDIRECT_CONFIG.MOBILE_TO_WEB_ROUTES)) {
    if (mobileRoute.startsWith(mobilePattern)) {
      // Preservar parâmetros da rota
      const params = mobileRoute.replace(mobilePattern, '');
      return webRoute + params;
    }
  }
  
  // Se não encontrar correspondência, redirecionar para dashboard web
  return '/dashboard';
};
