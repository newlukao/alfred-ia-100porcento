import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { database, Expense, Income } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  PiggyBank,
  Target,
  Bell,
  Search,
  BookTemplate,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Filter,
  Menu,
  X,
  Home,
  Crown,
  Shield,
  LogOut,
  Settings,
  User,
  MessageCircle
} from 'lucide-react';
import AdvancedAnalytics from './AdvancedAnalytics';
import NotificationCenter from './NotificationCenter';
import AdvancedSearch from './AdvancedSearch';
import SimpleExpenseTemplates from './SimpleExpenseTemplates';
import PlanBasedDashboard from './PlanBasedDashboard';
import Chat from './Chat';
import UserProfile from './UserProfile';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import AdminPanel from './AdminPanel';
import MobileBottomNav from './MobileBottomNav';
import { useDevice } from '@/hooks/use-device';
import CalendarPage from './CalendarPage';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
  badge?: string;
  planRequired?: 'bronze' | 'ouro';
  adminRequired?: boolean;
}

function getPlanoLabel(plan_type) {
  if (plan_type === 'ouro') return 'Ouro';
  if (plan_type === 'bronze') return 'Bronze';
  if (plan_type === 'trial') return 'Trial';
  return 'Sem Plano';
}

const SidebarDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [activeItem, setActiveItem] = useState('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const device = useDevice();
  
  // 🔥 NOVO: Estado para contar compromissos do dia e notificações
  const [todayAppointmentsCount, setTodayAppointmentsCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (user && (!user.plan_type)) {
      setIsPlanModalOpen(true);
    } else {
      setIsPlanModalOpen(false);
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Load expenses
      const userExpenses = await database.getExpensesByUser(user.id);
      setExpenses(userExpenses.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      
      // Load incomes (for gold plan users)
      if (user?.plan_type === 'ouro' && database.getIncomesByUser) {
        const userIncomes = await database.getIncomesByUser(user.id);
        setIncomes(userIncomes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
      
      // 🔥 NOVO: Carregar compromissos do dia (apenas para plano ouro)
      if (user?.plan_type === 'ouro' && database.getAppointmentsByUser) {
        const userAppointments = await database.getAppointmentsByUser(user.id);
        const today = new Date().toISOString().split('T')[0];
        const todayAppointments = userAppointments.filter(apt => apt.date === today);
        setTodayAppointmentsCount(todayAppointments.length);
      }
      
      // 🔥 NOVO: Carregar notificações não lidas
      if (database.getUnreadNotificationCount) {
        const unreadCount = await database.getUnreadNotificationCount(user.id);
        setUnreadNotificationsCount(unreadCount);
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar dados",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePlan = async () => {
    if (selectedPlan !== 'bronze' && selectedPlan !== 'ouro') return;
    await database.updateUserPlan(user.id, selectedPlan as 'bronze' | 'ouro');
    setIsPlanModalOpen(false);
    window.location.reload();
  };

  // Menu items configuration
  const menuItems: SidebarItem[] = [
    {
      id: 'chat',
      label: 'Alfred IA',
      icon: <MessageCircle className="w-5 h-5" />,
      component: <Chat />
    },
    {
      id: 'overview',
      label: 'Visão Geral',
      icon: <Home className="w-5 h-5" />,
      component: <PlanBasedDashboard user={user!} />
    },
    {
      id: 'analytics',
      label: 'Análises Avançadas',
      icon: <BarChart3 className="w-5 h-5" />,
      component: <AdvancedAnalytics expenses={expenses} incomes={incomes} />,
      planRequired: 'ouro'
    },
    {
      id: 'calendar',
      label: 'Meus Compromissos',
      icon: <Calendar className="w-5 h-5" />,
      component: <CalendarPage />,
      planRequired: 'ouro',
      badge: todayAppointmentsCount > 0 ? todayAppointmentsCount.toString() : undefined
    },
    {
      id: 'notifications',
      label: 'Notificações',
      icon: <Bell className="w-5 h-5" />,
      component: <NotificationCenter />,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount.toString() : undefined
    },
    {
      id: 'profile',
      label: 'Perfil',
      icon: <User className="w-5 h-5" />,
      component: <UserProfile />
    },
    {
      id: 'admin',
      label: 'Admin',
      icon: <Shield className="w-5 h-5" />,
      component: <AdminPanel />,
      adminRequired: true
    }
  ];

  // Filter menu items based on user plan and admin status
  const filteredMenuItems = menuItems.filter(item => {
    // Check plan requirement
    if (item.planRequired && (user?.plan_type !== item.planRequired && user?.plan_type !== 'trial')) {
      return false;
    }
    // Check admin requirement
    if (item.adminRequired && !user?.is_admin) {
      return false;
    }
    return true;
  });

  const activeMenuItem = filteredMenuItems.find(item => item.id === activeItem);

  // Calculate quick stats
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.valor, 0);
  const totalIncomes = incomes.reduce((sum, income) => sum + income.amount, 0);
  const netBalance = totalIncomes - totalExpenses;

  const StatCard = ({ title, value, icon, trend, trendValue }: any) => (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {trend && (
            <div className={`flex items-center mt-1 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {trendValue}
            </div>
          )}
        </div>
        <div className="text-muted-foreground">
          {icon}
        </div>
      </div>
    </Card>
  );

  // Renderização condicional: mobile vs desktop
  if (device.isMobile) {
    return (
      <div className="relative w-full bg-gray-50 dark:bg-gray-900" style={{ height: '100vh' }}>
        {/* User Info */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{user?.nome}</p>
              {user?.is_admin && (
                <Badge variant="default" className="text-xs bg-red-600 hover:bg-red-700">
                  <Shield className="w-3 h-3 mr-1" />
                  Admin
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        {/* Quick Stats */}
        <div className="p-4 space-y-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-muted-foreground">Resumo Rápido</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <span className="text-sm">Gastos</span>
              <span className="text-sm font-medium text-red-600">R$ {totalExpenses.toFixed(2)}</span>
            </div>
            {user?.plan_type === 'ouro' && (
              <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-sm">Recebimentos</span>
                <span className="text-sm font-medium text-green-600">R$ {totalIncomes.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center p-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 rounded">
              <span className="text-sm font-medium">Saldo</span>
              <span className={`text-sm font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>R$ {netBalance.toFixed(2)}</span>
            </div>
          </div>
        </div>
        {/* Top Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">{activeMenuItem?.label}</h1>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {user?.plan_type === 'bronze' && (
                <Button variant="outline" size="sm" className="text-yellow-600 border-yellow-300">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade para Ouro
                </Button>
              )}
              <ThemeToggle />
              <Button variant="ghost" size="sm">
                <Bell className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>
        {/* Content Area - Position absolute para forçar scroll */}
        <div 
          className="absolute inset-x-0 overflow-y-auto overflow-x-hidden p-2" 
          style={{ 
            top: '280px', 
            bottom: '64px',
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth'
          }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="pb-8">
              {activeMenuItem?.component}
            </div>
          )}
        </div>
        {/* Menu fixo na parte inferior */}
        <div className="absolute bottom-0 left-0 right-0">
          <MobileBottomNav 
            active={activeItem} 
            onChange={setActiveItem}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - apenas desktop/tablet */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        "hidden md:flex"
      )}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <img src="/alfred-logo.png" alt="Logo Alfred IA" style={{ width: 32, height: 32, borderRadius: '50%', background: 'white' }} />
            <div>
              <h1 className="text-lg font-semibold">Alfred IA</h1>
              <p className="text-xs text-muted-foreground">
                {getPlanoLabel(user?.plan_type)}
                {user?.plan_type === 'trial' && (
                  <span className="text-xs text-yellow-600 ml-2">Acesso Ouro (Trial)</span>
                )}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{user?.nome}</p>
                {user?.is_admin && (
                  <Badge variant="default" className="text-xs bg-red-600 hover:bg-red-700">
                    <Shield className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="p-4 space-y-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-muted-foreground">Resumo Rápido</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <span className="text-sm">Gastos</span>
              <span className="text-sm font-medium text-red-600">R$ {totalExpenses.toFixed(2)}</span>
            </div>
            {user?.plan_type === 'ouro' && (
              <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-sm">Recebimentos</span>
                <span className="text-sm font-medium text-green-600">R$ {totalIncomes.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center p-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 rounded">
              <span className="text-sm font-medium">Saldo</span>
              <span className={`text-sm font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {netBalance.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveItem(item.id);
                setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                activeItem === item.id
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              )}
            >
              <div className="flex items-center space-x-3">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <Badge variant="secondary" className="text-xs">
                  {item.badge}
                </Badge>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <Button variant="ghost" className="w-full justify-start" size="sm">
            <Settings className="w-4 h-4 mr-3" />
            Configurações
          </Button>
          <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" size="sm" onClick={logout}>
            <LogOut className="w-4 h-4 mr-3" />
            Sair
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
        {/* Top Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">{activeMenuItem?.label}</h1>
                <p className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString('pt-BR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {user?.plan_type === 'bronze' && (
                <Button variant="outline" size="sm" className="text-yellow-600 border-yellow-300">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade para Ouro
                </Button>
              )}
              <ThemeToggle />
              <Button variant="ghost" size="sm">
                <Bell className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            activeMenuItem?.component
          )}
        </main>
        {/* Mobile Bottom Navigation */}
        <div className="md:hidden">
          <MobileBottomNav 
            active={activeItem} 
            onChange={setActiveItem}
          />
        </div>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Modal de escolha de plano */}
      <Dialog open={isPlanModalOpen}>
        <DialogContent className="backdrop-blur-sm bg-black/60 border-none shadow-none flex flex-col items-center justify-center min-h-[40vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white text-center">Você está sem plano!</DialogTitle>
          </DialogHeader>
          <p className="text-white text-center mb-4">Para acessar o FinanceAI, adquira um plano. Seu acesso está bloqueado até a confirmação do pagamento.</p>
          <DialogFooter className="w-full mt-4">
            <Button className="w-full" onClick={() => window.location.href = 'https://seu-checkout.com/plano'}>
              Adquirir um Plano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal especial de fim de trial */}
      {!user?.plan_type && user?.trial_start && (
        <Dialog open={true}>
          <DialogContent className="backdrop-blur-sm bg-black/60 border-none shadow-none flex flex-col items-center justify-center min-h-[40vh]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white text-center">Seu período de teste acabou!</DialogTitle>
            </DialogHeader>
            <p className="text-white text-center mb-4">O trial gratuito expirou. Adquira um plano para continuar usando o FinanceAI.</p>
            <DialogFooter className="w-full mt-4">
              <Button className="w-full" onClick={() => window.location.href = 'https://seu-checkout.com/plano'}>
                Adquirir um Plano
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SidebarDashboard; 