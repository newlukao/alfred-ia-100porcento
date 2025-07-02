import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Moon, Sun, LogOut, Settings, BarChart3, MessageCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import ResponsiveLayout from '@/components/ResponsiveLayout';
import { useDevice } from '@/hooks/use-device';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const device = useDevice();

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

  // Layout desktop original
  const navigation = [
    { name: 'Chat', href: '/', icon: MessageCircle },
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    ...(user?.is_admin ? [{ name: 'Admin', href: '/admin', icon: Settings }] : [])
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-bold financial-gradient bg-clip-text text-transparent">
              💰 FinanceAI
            </h1>
            
            <nav className="hidden md:flex space-x-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center space-x-2">
            <ThemeToggle />
            
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-muted-foreground">
                {user?.nome}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="w-9 h-9"
              >
                <LogOut size={16} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-2">
          <div className="flex space-x-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;
