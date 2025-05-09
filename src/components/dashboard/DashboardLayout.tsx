import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import LoadingScreen from './LoadingScreen';
import { useSidebarStore } from '../../store/sidebarStore';

const DashboardLayout: React.FC = () => {
  const { isExpanded } = useSidebarStore();
  const [isLoading, setIsLoading] = useState(true);

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
    <div className="min-h-screen bg-background-dark">
      <Sidebar />
      <motion.main
        initial={{ marginLeft: '72px' }}
        animate={{ marginLeft: isExpanded ? '240px' : '72px' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="min-h-screen p-6"
      >
        <Outlet />
      </motion.main>
    </div>
  );
};

export default DashboardLayout;