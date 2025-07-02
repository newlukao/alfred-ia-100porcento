import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { 
  Menu, X, Home, BarChart3, TrendingUp, Trophy, 
  Bell, MessageCircle, Settings, User, LogOut,
  Plus, Search, Filter
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDevice } from '@/hooks/use-device';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
  unreadNotifications?: number;
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ 
  children, 
  currentPage, 
  onPageChange,
  unreadNotifications = 0 
}) => {
  const { user, logout } = useAuth();
  const device = useDevice();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    { 
      id: 'chat', 
      label: 'Chat', 
      icon: MessageCircle, 
      mobileIcon: MessageCircle,
      color: 'text-indigo-500' 
    },
    { 
      id: 'overview', 
      label: 'Dashboard', 
      icon: Home, 
      mobileIcon: Home,
      color: 'text-blue-500' 
    },
    { 
      id: 'analytics', 
      label: 'Análises', 
      icon: BarChart3, 
      mobileIcon: BarChart3,
      color: 'text-green-500' 
    },
    { 
      id: 'goals', 
      label: 'Metas', 
      icon: Trophy, 
      mobileIcon: Trophy,
      color: 'text-yellow-500' 
    },
    { 
      id: 'notifications', 
      label: 'Alertas', 
      icon: Bell, 
      mobileIcon: Bell,
      color: 'text-purple-500',
      badge: unreadNotifications > 0 ? unreadNotifications : undefined
    }
  ];

  const quickActions = [
    { id: 'add-expense', label: 'Novo Gasto', icon: Plus, action: () => {} },
    { id: 'search', label: 'Buscar', icon: Search, action: () => {} },
    { id: 'filter', label: 'Filtrar', icon: Filter, action: () => {} }
  ];

  const handleNavigation = (pageId: string) => {
    onPageChange(pageId);
    setIsMobileMenuOpen(false);
  };

  // Mobile Layout
  if (device.isMobile) {
    return (
      <div className="flex flex-col h-screen bg-background overflow-hidden">
        {/* Mobile Header - Redesigned */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border/50 shadow-sm">
          <div className="flex items-center justify-between h-16 px-6">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-base">AI</span>
              </div>
              <div>
                <h1 className="font-bold text-xl text-foreground">FinanceAI</h1>
                <p className="text-xs text-muted-foreground -mt-1">Assistente Financeiro</p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-3">
              {/* Quick Add Button */}
              <Button 
                size="sm" 
                variant="outline"
                className="h-9 w-9 p-0 rounded-full shadow-sm border-primary/20 hover:bg-primary/5"
                onClick={() => onPageChange('chat')}
              >
                <Plus className="h-4 w-4 text-primary" />
              </Button>

              {/* Notifications Badge */}
              {unreadNotifications > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 w-9 p-0 rounded-full shadow-sm border-red-200 hover:bg-red-50 relative"
                  onClick={() => onPageChange('notifications')}
                >
                  <Bell className="h-4 w-4 text-red-500" />
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 text-xs p-0 flex items-center justify-center"
                  >
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </Badge>
                </Button>
              )}

              {/* Mobile Menu */}
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-9 w-9 p-0 rounded-full shadow-sm border-border/50"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 p-0">
                  <div className="flex flex-col h-full">
                    {/* User Info */}
                    <div className="bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 p-6 text-white">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-lg">{user?.nome || 'Usuário'}</p>
                          <p className="text-white/80 text-sm">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex-1 py-6 px-4">
                      <div className="space-y-3">
                        {navigationItems.map((item) => {
                          const Icon = item.icon;
                          const isActive = currentPage === item.id;
                          
                          return (
                            <Button
                              key={item.id}
                              variant={isActive ? "secondary" : "ghost"}
                              className={`w-full justify-start h-14 rounded-xl transition-all duration-200 ${
                                isActive 
                                  ? 'bg-primary/10 border border-primary/20 shadow-sm' 
                                  : 'hover:bg-muted/50'
                              }`}
                              onClick={() => handleNavigation(item.id)}
                            >
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                                isActive ? 'bg-primary/20' : 'bg-muted/50'
                              }`}>
                                <Icon className={`h-5 w-5 ${isActive ? item.color : 'text-muted-foreground'}`} />
                              </div>
                              <div className="flex-1 text-left">
                                <span className={`font-medium ${isActive ? 'text-primary' : ''}`}>
                                  {item.label}
                                </span>
                              </div>
                              {item.badge && (
                                <Badge variant="destructive" className="ml-2 text-xs">
                                  {item.badge}
                                </Badge>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="border-t bg-muted/30 p-4 space-y-3">
                      <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                        <span className="text-sm font-medium">Tema</span>
                        <ThemeToggle />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-12 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        onClick={logout}
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center mr-3">
                          <LogOut className="h-4 w-4 text-red-500" />
                        </div>
                        <span className="font-medium">Sair</span>
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 pt-16 pb-20 overflow-auto">
          <div className="p-6 h-full">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border">
          <div className="grid grid-cols-5 h-16">
            {navigationItems.map((item) => {
              const Icon = item.mobileIcon;
              const isActive = currentPage === item.id;
              
              return (
                <button
                  key={item.id}
                  className={`flex flex-col items-center justify-center space-y-1 relative transition-colors ${
                    isActive 
                      ? 'text-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => handleNavigation(item.id)}
                >
                  <Icon className={`h-5 w-5 ${isActive ? item.color : ''}`} />
                  <span className="text-xs font-medium">{item.label}</span>
                  {item.badge && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
                    >
                      {item.badge > 9 ? '9+' : item.badge}
                    </Badge>
                  )}
                  {isActive && (
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary rounded-b-full" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    );
  }

  // Desktop/Tablet Layout
  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-card border-r border-border">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center space-x-3 p-6 border-b">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">AI</span>
            </div>
            <div>
              <h1 className="font-bold text-xl">FinanceAI</h1>
              <p className="text-sm text-muted-foreground">Assistente Financeiro</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 p-4">
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "secondary" : "ghost"}
                    className={`w-full justify-start h-11 ${isActive ? 'bg-primary/10' : ''}`}
                    onClick={() => handleNavigation(item.id)}
                  >
                    <Icon className={`h-5 w-5 mr-3 ${item.color}`} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <Badge variant="destructive" className="ml-2">
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                Ações Rápidas
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.id}
                      variant="outline"
                      size="sm"
                      className="h-16 flex-col space-y-1"
                      onClick={action.action}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs">{action.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="p-4 border-t">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{user?.nome || 'Usuário'}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 h-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default ResponsiveLayout; 