import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import LoadingScreen from './LoadingScreen';
import SessionCheck from '../comum/SessionCheck';
import { useSidebarStore } from '../../store/sidebarStore';
import { useResponsiveRedirect } from '../../hooks/useResponsiveRedirect';

const DashboardLayout: React.FC = () => {
  const { isExpanded } = useSidebarStore();
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  // Hook para redirecionamento responsivo automático
  useResponsiveRedirect();

  // Verificar se estamos na página do PDV
  const isPDVPage = location.pathname === '/dashboard/pdv';

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <SessionCheck fallback={<LoadingScreen />}>
      <div className="min-h-screen bg-background-dark">
        <Sidebar />
        <motion.main
          initial={{ marginLeft: '72px' }}
          animate={{ marginLeft: isExpanded ? '240px' : '72px' }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="min-h-screen h-screen overflow-y-auto custom-scrollbar"
        >
          <div className={isPDVPage ? '' : 'p-6'}>
            <Outlet />
          </div>
        </motion.main>
      </div>
    </SessionCheck>
  );
};

export default DashboardLayout;