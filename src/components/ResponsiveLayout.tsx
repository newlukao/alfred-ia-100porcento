import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Menu, X, Home, BarChart3, TrendingUp, Trophy, 
  Bell, MessageCircle, Settings, User, LogOut,
  Plus, Search, Filter, Crown, Shield, Calendar
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDevice } from '@/hooks/use-device';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useToast } from '@/hooks/use-toast';
import { database } from '../lib/database';

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
  const { toast } = useToast();
  const device = useDevice();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // States para controlar os dialogs
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    nome: user?.nome || '',
    email: user?.email || '',
    telefone: '(11) 99999-9999' // Telefone fixo apenas para visualização
  });

  // Estados para badges
  const [todayAppointmentsCount, setTodayAppointmentsCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleProfileSave = async () => {
    // TODO: Implementar salvamento do perfil
    toast({
      title: "Perfil atualizado! ✨",
      description: "Suas informações foram salvas com sucesso."
    });
    setIsProfileDialogOpen(false);
    setIsMobileMenuOpen(false);
  };

  // Atualizar formulário quando usuário mudar
  React.useEffect(() => {
    if (user) {
      setProfileForm({
        nome: user.nome || '',
        email: user.email || '',
        telefone: '(11) 99999-9999'
      });
    }
  }, [user]);

  React.useEffect(() => {
    const loadBadges = async () => {
      if (!user) return;
      // Compromissos do dia (apenas para plano ouro)
      if (user.plan_type === 'ouro' && database.getAppointmentsByUser) {
        const userAppointments = await database.getAppointmentsByUser(user.id);
        const today = new Date().toISOString().split('T')[0];
        const todayAppointments = userAppointments.filter(apt => apt.date === today);
        setTodayAppointmentsCount(todayAppointments.length);
      }
      // Notificações não lidas
      if (database.getUnreadNotificationCount) {
        const unreadCount = await database.getUnreadNotificationCount(user.id);
        setUnreadNotificationsCount(unreadCount);
      }
    };
    loadBadges();
  }, [user]);

  const baseNavigationItems = [
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
      id: 'notifications', 
      label: 'Alertas', 
      icon: Bell, 
      mobileIcon: Bell,
      color: 'text-purple-500',
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined
    }
  ];

  // Adicionar calendário apenas para plano Gold
  const navigationItems = user?.plan_type === 'ouro' 
    ? [
        ...baseNavigationItems.slice(0, 3), // Chat, Dashboard, Análises
        { 
          id: 'calendar', 
          label: 'Meus compromissos', 
          icon: Calendar, 
          mobileIcon: Calendar,
          color: 'text-amber-500',
          badge: todayAppointmentsCount > 0 ? todayAppointmentsCount : undefined
        },
        ...baseNavigationItems.slice(3), // Alertas
        { 
          id: 'profile', 
          label: 'Perfil', 
          icon: User, 
          mobileIcon: User,
          color: 'text-orange-500' 
        }
      ]
    : [
        ...baseNavigationItems,
        { 
          id: 'profile', 
          label: 'Perfil', 
          icon: User, 
          mobileIcon: User,
          color: 'text-orange-500' 
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
                <SheetContent side="right" className="w-[85vw] sm:w-80 p-0 max-h-screen overflow-hidden">
                  <div className="flex flex-col h-full max-h-screen">
                    {/* User Info */}
                    <div className="bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 p-4 text-white shrink-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-base truncate">{user?.nome || 'Usuário'}</p>
                          <p className="text-white/80 text-xs truncate">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Navigation - Scrollable */}
                    <div className="flex-1 overflow-y-auto py-4 px-3">
                      {/* Menu Items do Dropdown */}
                      <div className="space-y-2 mb-4">
                        <h3 className="text-xs font-semibold text-muted-foreground px-2 mb-2">Menu Principal</h3>
                        
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-10 rounded-lg hover:bg-muted/50"
                          onClick={() => {
                            onPageChange('overview');
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                            <Home className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="text-sm font-medium">Início</span>
                        </Button>

                        <Button
                          variant="ghost"
                          className="w-full justify-start h-10 rounded-lg hover:bg-muted/50"
                          onClick={() => {
                            setIsProfileDialogOpen(true);
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center mr-3">
                            <User className="h-4 w-4 text-green-600" />
                          </div>
                          <span className="text-sm font-medium">Meu Perfil</span>
                        </Button>

                        <Button
                          variant="ghost"
                          className="w-full justify-start h-10 rounded-lg hover:bg-muted/50"
                          onClick={() => {
                            setIsPlanDialogOpen(true);
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center mr-3">
                            {user?.plan_type === 'ouro' ? (
                              <Crown className="h-4 w-4 text-yellow-600" />
                            ) : (
                              <Shield className="h-4 w-4 text-gray-600" />
                            )}
                          </div>
                          <span className="text-sm font-medium">Meu Plano</span>
                        </Button>
                      </div>

                      {/* Navigation Items Originais */}
                      <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-muted-foreground px-2 mb-2">Páginas</h3>
                        {navigationItems.map((item) => {
                          const Icon = item.icon;
                          const isActive = currentPage === item.id;
                          
                          return (
                            <Button
                              key={item.id}
                              variant={isActive ? "secondary" : "ghost"}
                              className={`w-full justify-start h-11 rounded-lg transition-all duration-200 ${
                                isActive 
                                  ? 'bg-primary/10 border border-primary/20 shadow-sm' 
                                  : 'hover:bg-muted/50'
                              }`}
                              onClick={() => handleNavigation(item.id)}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
                                isActive ? 'bg-primary/20' : 'bg-muted/50'
                              }`}>
                                <Icon className={`h-4 w-4 ${isActive ? item.color : 'text-muted-foreground'}`} />
                              </div>
                              <div className="flex-1 text-left">
                                <span className={`text-[10px] font-medium leading-tight ${isActive ? 'font-bold' : ''}`} style={{marginTop: 2}}>
                                  {item.id === 'chat' ? 'Alfred IA' : item.label}
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
                    <div className="border-t bg-muted/30 p-3 space-y-2 shrink-0">
                      <div className="flex items-center justify-between p-2 bg-background rounded-lg border">
                        <span className="text-xs font-medium">Tema</span>
                        <ThemeToggle />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-10 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        onClick={() => {
                          logout();
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center mr-3">
                          <LogOut className="h-3 w-3 text-red-500" />
                        </div>
                        <span className="text-sm font-medium">Sair</span>
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
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border shadow-lg">
          <div className="flex items-center justify-center px-4 py-2">
            <div className="flex items-center justify-between w-full max-w-sm space-x-2">
              {navigationItems.map((item) => {
                const Icon = item.mobileIcon;
                const isActive = currentPage === item.id;
                
                return (
                  <button
                    key={item.id}
                    className={`
                      flex flex-col items-center justify-center p-2 min-w-[60px] h-14 rounded-xl
                      transition-all duration-200 ease-in-out relative
                      ${isActive 
                        ? 'text-primary bg-primary/10 scale-105 shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }
                    `}
                    onClick={() => {
                      if (item.id === 'profile') {
                        setIsProfileDialogOpen(true);
                      } else {
                        handleNavigation(item.id);
                      }
                    }}
                  >
                    <div className={`${isActive ? 'animate-pulse' : ''}`}>
                      <Icon className={`h-5 w-5 ${isActive ? item.color : ''}`} />
                    </div>
                    <span className={`text-[10px] font-medium leading-tight ${isActive ? 'font-bold' : ''}`} style={{marginTop: 2}}>
                      {item.id === 'chat' ? 'Alfred IA' : item.label}
                    </span>
                    
                    {/* Badge de notificação */}
                    {item.id === 'calendar' && item.badge && (
                      <Badge 
                        variant="default" 
                        className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center bg-blue-500 text-white animate-bounce"
                      >
                        {item.badge > 9 ? '9+' : item.badge}
                      </Badge>
                    )}
                    {item.id === 'notifications' && item.badge && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center animate-bounce"
                      >
                        {item.badge > 9 ? '9+' : item.badge}
                      </Badge>
                    )}
                    
                    {/* Indicador ativo */}
                    {isActive && (
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-primary rounded-b-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Dialogs para Mobile */}
        {/* Profile Dialog */}
        <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
          <DialogContent className="w-[95vw] max-w-md mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Meu Perfil
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 px-1 py-2">
              {/* Avatar e Info Básica */}
              <div className="flex flex-col items-center space-y-4">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  {getInitials(user?.nome || 'U')}
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-lg">{user?.nome}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <div className="flex justify-center gap-2 mt-2">
                    <Badge 
                      variant={user?.plan_type === 'ouro' ? 'default' : 'secondary'}
                      className={user?.plan_type === 'ouro' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                    >
                      {user?.plan_type === 'ouro' ? <Crown className="w-3 h-3 mr-1" /> : null}
                      Plano {user?.plan_type === 'ouro' ? 'Ouro' : 'Bronze'}
                    </Badge>
                    {user?.is_admin && (
                      <Badge variant="destructive">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Formulário de Edição */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nome" className="text-sm font-medium">Nome Completo</Label>
                  <Input
                    id="nome"
                    value={profileForm.nome}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Seu nome completo"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="seu@email.com"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="telefone" className="text-sm font-medium">Telefone</Label>
                  <Input
                    id="telefone"
                    value={profileForm.telefone}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, telefone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Informações da Conta */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Informações da Conta
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo de conta:</span>
                    <span>{user?.is_admin ? 'Administrador' : 'Usuário'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plano atual:</span>
                    <span className="capitalize">{user?.plan_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Membro desde:</span>
                    <span>{new Date(user?.data_criacao || '').toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex flex-col space-y-3 pt-2">
                {(!user?.plan_type || user?.plan_type === 'bronze') && (
                  <Button
                    variant="default"
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold mb-2"
                    onClick={() => {
                      setIsProfileDialogOpen(false);
                      setIsPlanDialogOpen(true);
                    }}
                  >
                    {!user?.plan_type ? 'Contratar Plano' : 'Upgrade para Ouro'}
                  </Button>
                )}
                
                <Button onClick={handleProfileSave} className="w-full">
                  <User className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => setIsProfileDialogOpen(false)} 
                  className="w-full"
                >
                  Cancelar
                </Button>
                
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    logout();
                    setIsProfileDialogOpen(false);
                  }} 
                  className="w-full"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair da Conta
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Plan Dialog */}
        <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
          <DialogContent className="w-[95vw] max-w-lg mx-auto max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">
                {user?.plan_type === 'ouro' ? '👑 Meu Plano Ouro' : '🛡️ Meu Plano Bronze'}
              </DialogTitle>
            </DialogHeader>
            <div className="py-2 px-1">
              {user && <UserPlanInfo user={user} />}
            </div>
          </DialogContent>
        </Dialog>
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

// Componente para informações do plano (simplificado para mobile)
const UserPlanInfo: React.FC<{ user: any }> = ({ user }) => {
  const { toast } = useToast();
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    // Simular upgrade - aqui você implementaria a lógica real
    setTimeout(() => {
      toast({
        title: "🎉 Upgrade realizado!",
        description: "Seu plano foi atualizado para Ouro!"
      });
      setIsUpgrading(false);
    }, 2000);
  };

  const planFeatures = {
    bronze: [
      "📊 Controle de gastos",
      "🤖 Alfred IA para gastos",
      "📈 Relatórios básicos",
      "💾 Backup automático"
    ],
    ouro: [
      "📊 Controle de gastos",
      "💰 Controle de recebimentos", 
      "🤖 Alfred IA completo",
      "📈 Relatórios avançados",
      "🎯 Metas e orçamentos",
      "📱 Acesso prioritário",
      "💾 Backup premium",
      "🏆 Conquistas exclusivas"
    ]
  };

  const currentPlan = user?.plan_type === 'ouro' ? 'ouro' : 'bronze';
  const features = planFeatures[currentPlan] || planFeatures.bronze;

  return (
    <div className="space-y-4">
      {/* Plan Header */}
      <div className={`p-4 rounded-lg border-2 ${
        currentPlan === 'ouro' 
          ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-400' 
          : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300'
      }`}>
        <div className="flex items-center space-x-3">
          {currentPlan === 'ouro' ? (
            <Crown className="h-8 w-8 text-yellow-600" />
          ) : (
            <Shield className="h-8 w-8 text-gray-600" />
          )}
          <div>
            <h2 className="text-lg font-bold">
              Plano {currentPlan === 'ouro' ? 'Ouro' : 'Bronze'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {currentPlan === 'ouro' 
                ? 'Acesso completo' 
                : 'Funcionalidades básicas'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Features List */}
      <div>
        <h3 className="font-semibold mb-3">✨ Suas funcionalidades:</h3>
        <div className="space-y-2">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="flex items-center space-x-2 p-2 bg-muted/50 rounded-lg"
            >
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade Section for Bronze */}
      {currentPlan === 'bronze' && (
        <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <Crown className="h-5 w-5 text-yellow-600 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800">
                💎 Upgrade para Ouro!
              </h3>
              <p className="text-sm text-yellow-700 mb-3">
                Controle completo das suas finanças!
              </p>
              
              <div className="space-y-1 mb-3">
                <div className="flex items-center text-xs text-yellow-700">
                  <span className="mr-2">🆕</span>
                  <span>Controle de recebimentos</span>
                </div>
                <div className="flex items-center text-xs text-yellow-700">
                  <span className="mr-2">🤖</span>
                  <span>Alfred IA completo</span>
                </div>
                <div className="flex items-center text-xs text-yellow-700">
                  <span className="mr-2">📊</span>
                  <span>Análise de fluxo de caixa</span>
                </div>
              </div>

              <Button 
                onClick={handleUpgrade}
                disabled={isUpgrading}
                size="sm"
                className="w-full bg-yellow-600 hover:bg-yellow-700"
              >
                {isUpgrading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Crown className="h-3 w-3 mr-2" />
                    Upgrade Grátis!
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Gold Plan Benefits */}
      {currentPlan === 'ouro' && (
        <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-800">
              🎉 Você tem o Plano Ouro!
            </h3>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            Acesso completo a todas as funcionalidades.
          </p>
        </div>
      )}
    </div>
  );
};

export default ResponsiveLayout; 