import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Componente que força o scroll para o topo sempre que a rota mudar
 * Resolve o problema de navegação SPA onde a posição do scroll é mantida
 */
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Força o scroll para o topo da página
    window.scrollTo(0, 0);
    
    // Também força o scroll do elemento main se existir
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTo(0, 0);
    }
    
    // Força o scroll de qualquer elemento com classe custom-scrollbar
    const scrollableElements = document.querySelectorAll('.custom-scrollbar');
    scrollableElements.forEach(element => {
      element.scrollTo(0, 0);
    });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
