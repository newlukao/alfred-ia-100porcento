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
    if (location.pathname === '/advanced-analytics') return 'analytics';
    if (location.pathname === '/notification-center') return 'notifications';
    if (location.pathname === '/calendar') return 'calendar';
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
      case 'analytics':
        window.location.href = '/advanced-analytics';
        break;
      case 'notifications':
        window.location.href = '/notification-center';
        break;
      case 'calendar':
        window.location.href = '/calendar';
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
