import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDevice } from '@/hooks/use-device';
import { useLocation } from 'react-router-dom';
import ResponsiveLayout from '@/components/ResponsiveLayout';
import SidebarDashboard from '@/components/SidebarDashboard';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const device = useDevice();
  const location = useLocation();

  const getCurrentPage = () => {
    if (location.pathname === '/') return 'chat';
    if (location.pathname === '/dashboard') return 'overview';
    if (location.pathname === '/admin') return 'admin';
    return 'overview';
  };

  const handlePageChange = (pageId: string) => {
    switch (pageId) {
      case 'chat':
        window.location.href = '/';
        break;
      case 'overview':
        window.location.href = '/dashboard';
        break;
      case 'admin':
        window.location.href = '/admin';
        break;
      default:
        break;
    }
  };

  // Se for mobile/tablet, usar o ResponsiveLayout
  if (device.isMobile || device.isTablet) {
    return (
      <ResponsiveLayout
        currentPage={getCurrentPage()}
        onPageChange={handlePageChange}
        unreadNotifications={0} // TODO: Integrar com sistema de notificações
      >
        {children}
      </ResponsiveLayout>
    );
  }

  // No desktop, sempre usar SidebarDashboard para consistência
  return <SidebarDashboard />;
};

export default Layout;
