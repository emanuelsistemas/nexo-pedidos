import React, { useEffect } from 'react';

interface PageTitleProps {
  title: string;
  description?: string;
  bgColor?: string;
}

const PageTitle: React.FC<PageTitleProps> = ({ title, description, bgColor }) => {
  useEffect(() => {
    // Salvar o título original
    const originalTitle = document.title;
    
    // Atualizar o título
    document.title = title;
    
    // Adicionar meta tag de descrição se fornecida
    let metaDescription: HTMLMetaElement | null = null;
    if (description) {
      metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = 'description';
        document.head.appendChild(metaDescription);
      }
      metaDescription.content = description;
    }
    
    // Adicionar meta tag de cor de fundo se fornecida
    let metaThemeColor: HTMLMetaElement | null = null;
    if (bgColor) {
      metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.name = 'theme-color';
        document.head.appendChild(metaThemeColor);
      }
      metaThemeColor.content = bgColor;
    }
    
    // Restaurar o título original e remover meta tags quando o componente for desmontado
    return () => {
      document.title = originalTitle;
      
      if (metaDescription && description) {
        document.head.removeChild(metaDescription);
      }
      
      if (metaThemeColor && bgColor) {
        document.head.removeChild(metaThemeColor);
      }
    };
  }, [title, description, bgColor]);
  
  // Este componente não renderiza nada visível
  return null;
};

export default PageTitle;
