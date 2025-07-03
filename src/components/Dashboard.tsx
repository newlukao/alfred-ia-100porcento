import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, TrendingDown, TrendingUp, Calendar, Filter, Trash2, Download, Edit, Edit2, Target, BarChart3, Trophy, Bell, BookTemplate, Crown, Shield, DollarSign, PiggyBank, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { database, Expense, Budget, Income } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ComposedChart, Area, AreaChart } from 'recharts';
import { Progress } from '@/components/ui/progress';
import AdvancedAnalytics from './AdvancedAnalytics';
import NotificationCenter from './NotificationCenter';
import AdvancedSearch from './AdvancedSearch';
import SimpleExpenseTemplates from './SimpleExpenseTemplates';
import PlanBasedDashboard from './PlanBasedDashboard';
import MobileBottomNav from './MobileBottomNav';
import { useDevice } from '@/hooks/use-device';
import { isGold } from '../lib/utils';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [filteredIncomes, setFilteredIncomes] = useState<Income[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  
  // Filters
  const [dateFilter, setDateFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  
  // Mobile date range filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Pagination for transactions
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 10;
  
  // New expense form
  const [newExpense, setNewExpense] = useState({
    valor: '',
    categoria: '',
    descricao: '',
    data: new Date().toISOString().split('T')[0]
  });

  // New income form
  const [newIncome, setNewIncome] = useState({
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    tags: ''
  });

  // Edit expense form
  const [editExpense, setEditExpense] = useState({
    valor: '',
    categoria: '',
    descricao: '',
    data: ''
  });

  // Edit income form
  const [editIncome, setEditIncome] = useState({
    amount: '',
    category: '',
    description: '',
    date: '',
    tags: ''
  });
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [isEditIncomeDialogOpen, setIsEditIncomeDialogOpen] = useState(false);

  // Budget form
  const [budgetForm, setBudgetForm] = useState({
    categoria: '',
    valor_orcamento: ''
  });

  const [todayAppointmentsCount, setTodayAppointmentsCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const expenseCategories = [
    'mercado', 'transporte', 'contas', 'lazer', 'alimentação', 
    'saúde', 'educação', 'outros'
  ];

  const incomeCategories = [
    'salario', 'freelance', 'investimento', 'vendas', 'bonus', 
    'aluguel', 'dividendos', 'outros'
  ];

  const categoryColors = {
    // Expense categories
    mercado: '#10b981',
    transporte: '#3b82f6',
    contas: '#f59e0b',
    lazer: '#8b5cf6',
    alimentação: '#ef4444',
    saúde: '#06b6d4',
    educação: '#84cc16',
    outros: '#6b7280',
    // Income categories
    salario: '#22c55e',
    freelance: '#3b82f6',
    investimento: '#8b5cf6',
    vendas: '#f59e0b',
    bonus: '#06b6d4',
    aluguel: '#10b981',
    dividendos: '#84cc16'
  };

  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const device = useDevice();
  useEffect(() => {
    if (device.isMobile) {
      setShowInstallBanner(true);
    }
  }, [device.isMobile]);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    applyFilters();
    setCurrentPage(1); // Reset pagination when filters change
  }, [expenses, incomes, dateFilter, categoryFilter, minValue, maxValue, startDate, endDate]);

  useEffect(() => {
    if (!user) return;
    // Buscar compromissos do dia
    if (isGold(user) && database.getAppointmentsByUser) {
      database.getAppointmentsByUser(user.id).then(userAppointments => {
        const today = new Date().toISOString().split('T')[0];
        const todayAppointments = userAppointments.filter(apt => apt.date === today);
        setTodayAppointmentsCount(todayAppointments.length);
      });
    }
    // Buscar notificações não lidas
    if (database.getUnreadNotificationCount) {
      database.getUnreadNotificationCount(user.id).then(count => setUnreadNotificationsCount(count));
    }
  }, [user]);

  const loadData = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // console.log('📊 Dashboard - Carregando dados para usuário:', user.id);
      
      // Load expenses
      const userExpenses = await database.getExpensesByUser(user.id);
      setExpenses(userExpenses.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      
      // Load incomes (for gold plan users)
      if (isGold(user) && database.getIncomesByUser) {
        const userIncomes = await database.getIncomesByUser(user.id);
        setIncomes(userIncomes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
      
      // Load budgets
      const currentMonth = new Date().toISOString().substring(0, 7);
      if (database.getBudgetsByUser) {
        const userBudgets = await database.getBudgetsByUser(user.id, currentMonth);
        setBudgets(userBudgets);
      }
      
    } catch (error) {
      console.error('❌ Dashboard - Error loading data:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar dados",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const applyFilters = () => {
    let filteredExp = [...expenses];
    let filteredInc = [...incomes];

    // Priority: Use mobile date range if set, otherwise use desktop single date
    if (startDate || endDate) {
      if (startDate) {
        filteredExp = filteredExp.filter(expense => expense.data >= startDate);
        filteredInc = filteredInc.filter(income => income.date >= startDate);
      }
      if (endDate) {
        filteredExp = filteredExp.filter(expense => expense.data <= endDate);
        filteredInc = filteredInc.filter(income => income.date <= endDate);
      }
    } else if (dateFilter) {
      filteredExp = filteredExp.filter(expense => expense.data === dateFilter);
      filteredInc = filteredInc.filter(income => income.date === dateFilter);
    }

    if (categoryFilter !== 'all') {
      filteredExp = filteredExp.filter(expense => expense.categoria === categoryFilter);
      filteredInc = filteredInc.filter(income => income.category === categoryFilter);
    }

    if (minValue) {
      filteredExp = filteredExp.filter(expense => expense.valor >= parseFloat(minValue));
      filteredInc = filteredInc.filter(income => income.amount >= parseFloat(minValue));
    }

    if (maxValue) {
      filteredExp = filteredExp.filter(expense => expense.valor <= parseFloat(maxValue));
      filteredInc = filteredInc.filter(income => income.amount <= parseFloat(maxValue));
    }

    setFilteredExpenses(filteredExp);
    setFilteredIncomes(filteredInc);
  };

  const handleAddExpense = async () => {
    if (!user || !newExpense.valor || !newExpense.categoria || !newExpense.descricao) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      await database.addExpense({
        usuario_id: user.id,
        valor: parseFloat(newExpense.valor),
        categoria: newExpense.categoria,
        descricao: newExpense.descricao,
        data: newExpense.data
      });

      toast({
        title: "Sucesso! 💰",
        description: "Gasto adicionado com sucesso"
      });

      setNewExpense({
        valor: '',
        categoria: '',
        descricao: '',
        data: new Date().toISOString().split('T')[0]
      });
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: "Erro",
        description: "Falha ao adicionar gasto",
        variant: "destructive"
      });
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await database.deleteExpense(id);
      toast({
        title: "Sucesso",
        description: "Gasto removido com sucesso"
      });
      loadData();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover gasto",
        variant: "destructive"
      });
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setEditExpense({
      valor: expense.valor.toString(),
      categoria: expense.categoria,
      descricao: expense.descricao,
      data: expense.data
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense || !editExpense.valor || !editExpense.categoria || !editExpense.descricao) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      await database.updateExpense(editingExpense.id, {
        valor: parseFloat(editExpense.valor),
        categoria: editExpense.categoria,
        descricao: editExpense.descricao,
        data: editExpense.data
      });

      toast({
        title: "Sucesso! ✏️",
        description: "Gasto atualizado com sucesso"
      });

      setIsEditDialogOpen(false);
      setEditingExpense(null);
      loadData();
    } catch (error) {
      console.error('Error updating expense:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar gasto",
        variant: "destructive"
      });
    }
  };

  const handleAddIncome = async () => {
    if (!user || !newIncome.amount || !newIncome.category || !newIncome.description) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (!isGold(user)) {
      toast({
        title: "Upgrade Necessário! 🥇",
        description: "Para registrar recebimentos, você precisa do Plano Ouro!",
        variant: "destructive"
      });
      return;
    }

    try {
      await database.addIncome({
        user_id: user.id,
        amount: parseFloat(newIncome.amount),
        category: newIncome.category,
        description: newIncome.description,
        date: newIncome.date,
        tags: newIncome.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      });

      toast({
        title: "Sucesso! 💰",
        description: "Recebimento adicionado com sucesso"
      });

      setNewIncome({
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        tags: ''
      });
      setIsIncomeDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error adding income:', error);
      toast({
        title: "Erro",
        description: "Falha ao adicionar recebimento",
        variant: "destructive"
      });
    }
  };

  const handleEditIncome = (income: Income) => {
    setEditingIncome(income);
    setEditIncome({
      amount: income.amount.toString(),
      category: income.category,
      description: income.description,
      date: income.date,
      tags: income.tags.join(', ')
    });
    setIsEditIncomeDialogOpen(true);
  };

  const handleUpdateIncome = async () => {
    if (!editingIncome || !editIncome.amount || !editIncome.category || !editIncome.description) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      await database.updateIncome(editingIncome.id, {
        amount: parseFloat(editIncome.amount),
        category: editIncome.category,
        description: editIncome.description,
        date: editIncome.date,
        tags: editIncome.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      });

      toast({
        title: "Sucesso! ✏️",
        description: "Recebimento atualizado com sucesso"
      });

      setIsEditIncomeDialogOpen(false);
      setEditingIncome(null);
      loadData();
    } catch (error) {
      console.error('Error updating income:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar recebimento",
        variant: "destructive"
      });
    }
  };

  const handleDeleteIncome = async (id: string) => {
    try {
      await database.deleteIncome(id);
      toast({
        title: "Sucesso",
        description: "Recebimento removido com sucesso"
      });
      loadData();
    } catch (error) {
      console.error('Error deleting income:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover recebimento",
        variant: "destructive"
      });
    }
  };

  const exportData = () => {
    // Export both expenses and incomes
    const expensesData = filteredExpenses.map(expense => [
      expense.data,
      'SAÍDA',
      expense.categoria,
      expense.descricao,
      `-${expense.valor.toString()}`
    ]);

    const incomesData = filteredIncomes.map(income => [
      income.date,
      'ENTRADA',
      income.category,
      income.description,
      income.amount.toString()
    ]);

    const csvContent = [
      ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor'],
      ...expensesData,
      ...incomesData
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fluxo-caixa-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Calculate comprehensive statistics
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.valor, 0);
  const totalIncomes = filteredIncomes.reduce((sum, income) => sum + income.amount, 0);
  const netBalance = totalIncomes - totalExpenses;
  const averageExpense = filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0;
  const averageIncome = filteredIncomes.length > 0 ? totalIncomes / filteredIncomes.length : 0;
  
  // Calculate current month data for unified analysis
  const currentMonth = new Date().toISOString().substring(0, 7);
  const currentMonthExpenses = expenses.filter(expense => expense.data.startsWith(currentMonth));
  const currentMonthIncomes = incomes.filter(income => income.date.startsWith(currentMonth));
  const monthlyBalance = currentMonthIncomes.reduce((sum, i) => sum + i.amount, 0) - 
                        currentMonthExpenses.reduce((sum, e) => sum + e.valor, 0);

  // Cash flow data for chart
  const cashFlowData = React.useMemo(() => {
    const monthlyData = new Map();
    
    // Process expenses
    filteredExpenses.forEach(expense => {
      const month = expense.data.substring(0, 7);
      if (!monthlyData.has(month)) {
        monthlyData.set(month, { month, expenses: 0, incomes: 0, balance: 0 });
      }
      monthlyData.get(month).expenses += expense.valor;
    });
    
    // Process incomes
    filteredIncomes.forEach(income => {
      const month = income.date.substring(0, 7);
      if (!monthlyData.has(month)) {
        monthlyData.set(month, { month, expenses: 0, incomes: 0, balance: 0 });
      }
      monthlyData.get(month).incomes += income.amount;
    });
    
    // Calculate balance and format
    return Array.from(monthlyData.values())
      .map(data => ({
        ...data,
        balance: data.incomes - data.expenses,
        monthName: new Date(data.month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredExpenses, filteredIncomes]);

  // Calculate budget progress
  const budgetProgress = expenseCategories.map(category => {
    const budget = budgets.find(b => b.categoria === category);
    const spent = currentMonthExpenses
      .filter(expense => expense.categoria === category)
      .reduce((sum, expense) => sum + expense.valor, 0);
    
    return {
      categoria: category,
      orcamento: budget?.valor_orcamento || 0,
      gasto: spent,
      percentual: budget ? (spent / budget.valor_orcamento) * 100 : 0,
      restante: budget ? budget.valor_orcamento - spent : 0
    };
  }).filter(item => item.orcamento > 0);

  const monthlyData = React.useMemo(() => {
    const monthlyMap = new Map();
    filteredExpenses.forEach(expense => {
      const month = expense.data.substring(0, 7);
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + expense.valor);
    });
    
    return Array.from(monthlyMap.entries())
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredExpenses]);

  const handleSetBudget = async () => {
    if (!user || !budgetForm.categoria || !budgetForm.valor_orcamento) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    try {
      const currentMonth = new Date().toISOString().substring(0, 7);
      await database.setBudget({
        usuario_id: user.id,
        categoria: budgetForm.categoria,
        valor_orcamento: parseFloat(budgetForm.valor_orcamento),
        mes_ano: currentMonth
      });

      toast({
        title: "Sucesso! 🎯",
        description: "Orçamento definido com sucesso"
      });

      setBudgetForm({ categoria: '', valor_orcamento: '' });
      setIsBudgetDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error setting budget:', error);
      toast({
        title: "Erro",
        description: "Falha ao definir orçamento",
        variant: "destructive"
      });
    }
  };

  const handleFilterChange = (filtered: Expense[]) => {
    setFilteredExpenses(filtered);
  };

  const handleTemplateSelect = (template: any) => {
    setNewExpense(prev => ({
      ...prev,
      categoria: template.categoria || '',
      valor: template.valor ? template.valor.toString() : '',
      descricao: template.descricao || '',
    }));
    setShowTemplates(false);
    setIsDialogOpen(true);
    
    toast({
      title: "Template aplicado! 📋",
      description: "Dados preenchidos automaticamente"
    });
  };

  function getPlanoLabel(plan_type) {
    if (plan_type === 'ouro') return 'Ouro';
    if (plan_type === 'bronze') return 'Bronze';
    if (plan_type === 'trial') return 'Trial';
    return 'Sem Plano';
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in-50 duration-300">
        <div className="space-y-2">
          <div className="h-8 bg-muted rounded-md animate-pulse"></div>
          <div className="h-4 bg-muted/60 rounded-md animate-pulse max-w-md"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-6 border rounded-lg space-y-3">
              <div className="h-4 bg-muted rounded animate-pulse"></div>
              <div className="h-8 bg-muted rounded animate-pulse"></div>
              <div className="h-3 bg-muted/60 rounded animate-pulse max-w-20"></div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 border rounded-lg space-y-4">
            <div className="h-6 bg-muted rounded animate-pulse max-w-32"></div>
            <div className="h-64 bg-muted/30 rounded animate-pulse"></div>
          </div>
          <div className="p-6 border rounded-lg space-y-4">
            <div className="h-6 bg-muted rounded animate-pulse max-w-32"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted/40 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32 md:pb-6">
      {/* Banner sutil de instalação no mobile */}
      {showInstallBanner && device.isMobile && (
        <div className="sticky top-0 z-30 flex items-center justify-center bg-blue-50 text-blue-900 px-3 py-1 shadow-sm text-xs font-medium gap-2 rounded-b-md">
          <button
            className="flex items-center gap-2 focus:outline-none"
            onClick={() => setShowInstallPrompt(true)}
          >
            <Download size={16} />
            Clique aqui para instalar o app
          </button>
          <button
            className="ml-2 text-blue-400 hover:text-blue-700 text-base"
            onClick={() => setShowInstallBanner(false)}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
      )}
      {/* Modal de instrução de instalação */}
      {showInstallPrompt && device.isMobile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-xs w-full relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowInstallPrompt(false)}
              aria-label="Fechar"
            >
              ×
            </button>
            <h2 className="text-lg font-bold mb-2 text-center">Instale o App na Tela Inicial</h2>
            {device.isIOS ? (
              <div className="text-sm text-gray-700 space-y-2">
                <p>Para instalar no iPhone/iPad:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Toque no ícone <span className="inline-block align-middle"> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12l7-7 7 7"/></svg> </span> no Safari.</li>
                  <li>Selecione <b>Adicionar à Tela de Início</b>.</li>
                  <li>Confirme e pronto! O app ficará como um aplicativo normal.</li>
                </ol>
              </div>
            ) : device.isAndroid ? (
              <div className="text-sm text-gray-700 space-y-2">
                <p>Para instalar no Android:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Toque no menu <b>⋮</b> no navegador.</li>
                  <li>Selecione <b>Adicionar à tela inicial</b> ou <b>Instalar app</b>.</li>
                  <li>Confirme e pronto! O app ficará como um aplicativo normal.</li>
                </ol>
              </div>
            ) : null}
          </div>
        </div>
      )}
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">📊 Dashboard</h1>
        <p className="text-muted-foreground">
          {isGold(user) ? 'Controle completo do seu fluxo de caixa' : 'Visão geral dos seus gastos'}
        </p>
        
        {/* Botão Ver Opções - Mobile */}
        <div className="md:hidden">
          <Button 
            variant="outline" 
            onClick={() => setShowOptions(!showOptions)}
            className="w-full flex items-center justify-center gap-2"
          >
            Ver opções
            {showOptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </div>

        {/* Ações principais - Mobile */}
        <div className="md:hidden flex gap-2 mb-4">
          <Button 
            onClick={() => setIsDialogOpen(true)} 
            variant="outline" 
            className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
          >
            <span className="text-lg font-bold mr-2">-</span>
            Saída
          </Button>
          {isGold(user) && (
            <Button 
              onClick={() => setIsIncomeDialogOpen(true)} 
              variant="outline" 
              className="flex-1 text-green-600 border-green-300 hover:bg-green-50"
            >
              <span className="text-lg font-bold mr-2">+</span>
              Entrada
            </Button>
          )}
          <Button 
            variant="outline" 
            className="flex-1 text-blue-600 border-blue-300 hover:bg-blue-50"
          >
            <MessageCircle size={20} />
          </Button>
        </div>

        {/* Container de opções - sempre visível no desktop, expansível no mobile */}
        <div className={`${showOptions ? 'block' : 'hidden'} md:block`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full mb-4">
            <Button variant="outline" onClick={loadData} className="w-full sm:w-auto">
              🔄 Recarregar
            </Button>
            <Button variant="outline" onClick={() => setShowAdvancedSearch(!showAdvancedSearch)} className="w-full sm:w-auto">
              <Filter size={16} className="mr-2" />
              Busca Avançada
            </Button>
            <Button variant="outline" onClick={() => setShowTemplates(!showTemplates)} className="w-full sm:w-auto">
              <BookTemplate size={16} className="mr-2" />
              Templates
            </Button>
            <Button variant="outline" onClick={exportData} className="w-full sm:w-auto">
              <Download size={16} className="mr-2" />
              Exportar
            </Button>
            <Button variant="outline" onClick={() => setIsBudgetDialogOpen(true)} className="w-full sm:w-auto">
              <Target size={16} className="mr-2" />
              Orçamentos
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/calendar'} className="w-full sm:w-auto">
              <Calendar size={16} className="mr-2" />
              Meus compromissos
            </Button>
            {/* Botões de ação principal apenas no desktop */}
            <div className="hidden md:flex gap-2">
              {isGold(user) && (
                <Dialog open={isIncomeDialogOpen} onOpenChange={setIsIncomeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-green-200 text-green-700 hover:bg-green-50">
                      <TrendingUp size={16} className="mr-2" />
                      Nova Entrada
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Novo Recebimento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="income-amount">Valor (R$)</Label>
                        <Input
                          id="income-amount"
                          type="number"
                          step="0.01"
                          value={newIncome.amount}
                          onChange={(e) => setNewIncome(prev => ({ ...prev, amount: e.target.value }))}
                          placeholder="0,00"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="income-category">Categoria</Label>
                        <Select value={newIncome.category} onValueChange={(value) => setNewIncome(prev => ({ ...prev, category: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {incomeCategories.map(category => (
                              <SelectItem key={category} value={category}>
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="income-description">Descrição</Label>
                        <Textarea
                          id="income-description"
                          value={newIncome.description}
                          onChange={(e) => setNewIncome(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Descreva o recebimento..."
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="income-date">Data</Label>
                        <Input
                          id="income-date"
                          type="date"
                          value={newIncome.date}
                          onChange={(e) => setNewIncome(prev => ({ ...prev, date: e.target.value }))}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="income-tags">Tags (separadas por vírgula)</Label>
                        <Input
                          id="income-tags"
                          value={newIncome.tags}
                          onChange={(e) => setNewIncome(prev => ({ ...prev, tags: e.target.value }))}
                          placeholder="trabalho, extra, mensal..."
                        />
                      </div>
                      
                      <Button onClick={handleAddIncome} className="w-full bg-green-600 hover:bg-green-700">
                        Adicionar Recebimento
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus size={16} className="mr-2" />
                    Novo Gasto
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Novo Gasto</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="valor">Valor (R$)</Label>
                      <Input
                        id="valor"
                        type="number"
                        step="0.01"
                        value={newExpense.valor}
                        onChange={(e) => setNewExpense(prev => ({ ...prev, valor: e.target.value }))}
                        placeholder="0,00"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="categoria">Categoria</Label>
                      <Select value={newExpense.categoria} onValueChange={(value) => setNewExpense(prev => ({ ...prev, categoria: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseCategories.map(category => (
                            <SelectItem key={category} value={category}>
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="descricao">Descrição</Label>
                      <Textarea
                        id="descricao"
                        value={newExpense.descricao}
                        onChange={(e) => setNewExpense(prev => ({ ...prev, descricao: e.target.value }))}
                        placeholder="Descreva o gasto..."
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="data">Data</Label>
                      <Input
                        id="data"
                        type="date"
                        value={newExpense.data}
                        onChange={(e) => setNewExpense(prev => ({ ...prev, data: e.target.value }))}
                      />
                    </div>
                    
                    <Button onClick={handleAddExpense} className="w-full">
                      Adicionar Gasto
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Search */}
      {showAdvancedSearch && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              🔍 Busca Avançada
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAdvancedSearch(false)}
              >
                ✕
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AdvancedSearch 
              expenses={expenses} 
              onFilterChange={handleFilterChange}
            />
          </CardContent>
        </Card>
      )}

      {/* Templates */}
      {showTemplates && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              📋 Templates de Gastos
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowTemplates(false)}
              >
                ✕
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleExpenseTemplates onTemplateSelect={handleTemplateSelect} />
          </CardContent>
        </Card>
      )}

      {/* Mobile: Filtro Minimalista */}
      <div className="md:hidden">
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-md bg-blue-100 flex items-center justify-center">
              <Filter className="h-2.5 w-2.5 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-700">Período</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-gray-500">De</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Até</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
          
          {(startDate || endDate) && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="w-full mt-2 h-6 text-xs text-gray-400"
            >
              ✕ Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Análises Avançadas</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="hidden md:flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Notificações</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Mobile: Cards Minimalistas */}
          <div className="md:hidden grid grid-cols-2 gap-3">
            {/* Card Total de Entradas - Mobile */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl p-3 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                {isGold(user) && (
                  <div className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center">
                    <span className="text-xs">🔒</span>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-green-700">Entradas</p>
                <p className="text-lg font-bold text-green-800">
              R$ {totalIncomes.toFixed(2)}
                </p>
                <p className="text-xs text-green-600 opacity-80">
                  {filteredIncomes.length} registros
                </p>
            </div>
              <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-green-200 rounded-full opacity-20"></div>
            </div>

            {/* Card Total de Saídas - Mobile */}
            <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-100 rounded-xl p-3 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-red-700">Saídas</p>
                <p className="text-lg font-bold text-red-800">
                  R$ {totalExpenses.toFixed(2)}
                </p>
                <p className="text-xs text-red-600 opacity-80">
                  {filteredExpenses.length} gastos
                </p>
              </div>
              <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-red-200 rounded-full opacity-20"></div>
            </div>

            {/* Card Saldo Líquido - Mobile */}
            <div className={`bg-gradient-to-br ${netBalance >= 0 ? 'from-blue-50 to-indigo-50 border-blue-100' : 'from-orange-50 to-amber-50 border-orange-100'} border rounded-xl p-3 relative overflow-hidden`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg ${netBalance >= 0 ? 'bg-blue-100' : 'bg-orange-100'} flex items-center justify-center`}>
                  <DollarSign className={`h-4 w-4 ${netBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                </div>
              </div>
              <div className="space-y-1">
                <p className={`text-xs font-medium ${netBalance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Saldo Geral</p>
                <p className={`text-lg font-bold ${netBalance >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                  R$ {netBalance.toFixed(2)}
                </p>
                <p className={`text-xs ${netBalance >= 0 ? 'text-blue-600' : 'text-orange-600'} opacity-80`}>
                  {netBalance >= 0 ? 'Positivo' : 'Negativo'}
                </p>
              </div>
              <div className={`absolute -right-4 -bottom-4 w-16 h-16 ${netBalance >= 0 ? 'bg-blue-200' : 'bg-orange-200'} rounded-full opacity-20`}></div>
            </div>

            {/* Card Gasto Médio - Mobile */}
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 rounded-xl p-3 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <PiggyBank className="h-4 w-4 text-purple-600" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-purple-700">Gasto Médio</p>
                <p className="text-lg font-bold text-purple-800">
                  R$ {averageExpense.toFixed(2)}
                </p>
                <p className="text-xs text-purple-600 opacity-80">
                  por item
                </p>
              </div>
              <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-purple-200 rounded-full opacity-20"></div>
            </div>
          </div>

          {/* Desktop: Cards Minimalistas */}
          <div className="hidden md:grid grid-cols-4 gap-4">
            {/* Card Total de Entradas - Desktop */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
            {isGold(user) && (
                  <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center">
                    <span className="text-sm">🔒</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-green-700">Entradas</p>
                <p className="text-2xl font-bold text-green-800">
                  R$ {totalIncomes.toFixed(2)}
                </p>
                <p className="text-sm text-green-600 opacity-80">
                  {filteredIncomes.length} registros
                </p>
                {isGold(user) && (
                  <p className="text-xs text-yellow-600 mt-2">
                🥇 Upgrade para Ouro para registrar
              </p>
            )}
              </div>
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-green-200 rounded-full opacity-20"></div>
            </div>

            {/* Card Total de Saídas - Desktop */}
            <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-100 rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-700">Saídas</p>
                <p className="text-2xl font-bold text-red-800">
                  R$ {totalExpenses.toFixed(2)}
                </p>
                <p className="text-sm text-red-600 opacity-80">
              {filteredExpenses.length} gastos
            </p>
              </div>
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-red-200 rounded-full opacity-20"></div>
            </div>

            {/* Card Saldo Líquido - Desktop */}
            <div className={`bg-gradient-to-br ${netBalance >= 0 ? 'from-blue-50 to-indigo-50 border-blue-100' : 'from-orange-50 to-amber-50 border-orange-100'} border rounded-xl p-4 relative overflow-hidden`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${netBalance >= 0 ? 'bg-blue-100' : 'bg-orange-100'} flex items-center justify-center`}>
                  <DollarSign className={`h-5 w-5 ${netBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
            </div>
              </div>
              <div className="space-y-2">
                <p className={`text-sm font-medium ${netBalance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Saldo Geral</p>
                <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                  R$ {netBalance.toFixed(2)}
                </p>
                <p className={`text-sm ${netBalance >= 0 ? 'text-blue-600' : 'text-orange-600'} opacity-80`}>
                  {netBalance >= 0 ? 'Positivo' : 'Negativo'}
                </p>
              </div>
              <div className={`absolute -right-6 -bottom-6 w-20 h-20 ${netBalance >= 0 ? 'bg-blue-200' : 'bg-orange-200'} rounded-full opacity-20`}></div>
            </div>

            {/* Card Gasto Médio - Desktop */}
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <PiggyBank className="h-5 w-5 text-purple-600" />
            </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-purple-700">Gasto Médio</p>
                <p className="text-2xl font-bold text-purple-800">
                  R$ {averageExpense.toFixed(2)}
                </p>
                <p className="text-sm text-purple-600 opacity-80">
                  por item
                </p>
              </div>
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-purple-200 rounded-full opacity-20"></div>
            </div>
      </div>

      {/* Budget Progress */}
      {budgetProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Progresso do Orçamento - {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {budgetProgress.map((budget) => (
                <div key={budget.categoria} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium capitalize">{budget.categoria}</span>
                      {budget.percentual >= 80 && (
                        <Badge variant="destructive" className="text-xs">
                          {budget.percentual >= 100 ? 'Estourado!' : 'Atenção!'}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      R$ {budget.gasto.toFixed(2)} / R$ {budget.orcamento.toFixed(2)}
                    </div>
                  </div>
                  
                  <Progress 
                    value={Math.min(budget.percentual, 100)} 
                    className={`h-2 ${budget.percentual >= 100 ? 'bg-red-100' : budget.percentual >= 80 ? 'bg-yellow-100' : 'bg-green-100'}`}
                  />
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{budget.percentual.toFixed(1)}% usado</span>
                    <span>
                      {budget.restante >= 0 
                        ? `Restam R$ ${budget.restante.toFixed(2)}`
                        : `Estourou R$ ${Math.abs(budget.restante).toFixed(2)}`
                      }
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

          {/* Desktop: Filtros Completos */}
          <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            
            <div>
              <Label>Categoria</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {expenseCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Valor Mínimo</Label>
              <Input
                type="number"
                step="0.01"
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
                placeholder="0,00"
              />
            </div>
            
            <div>
              <Label>Valor Máximo</Label>
              <Input
                type="number"
                step="0.01"
                value={maxValue}
                onChange={(e) => setMaxValue(e.target.value)}
                placeholder="0,00"
              />
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setDateFilter('');
                  setCategoryFilter('all');
                  setMinValue('');
                  setMaxValue('');
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      {cashFlowData.length > 0 && (
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📊 Fluxo de Caixa
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-64 md:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={cashFlowData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis 
                        dataKey="monthName" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `R$ ${value}`}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value, name) => [
                          `R$ ${Number(value).toFixed(2)}`,
                          name === 'expenses' ? '💸 Saídas' : '💰 Entradas'
                        ]}
                        labelFormatter={(label) => `📅 ${label}`}
                      />
                      <Bar 
                        dataKey="expenses" 
                        fill="#ef4444" 
                        name="expenses"
                        radius={[4, 4, 0, 0]}
                        opacity={0.8}
                      />
                      <Bar 
                        dataKey="incomes" 
                        fill="#22c55e" 
                        name="incomes"
                        radius={[4, 4, 0, 0]}
                        opacity={0.8}
                      />
                </ComposedChart>
              </ResponsiveContainer>
                </div>
            </CardContent>
          </Card>
          )}

          {/* Histórico de Transações */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium">Transações</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                // Combine and sort all transactions
                const allTransactions = [
                  ...filteredIncomes.map(income => ({
                    ...income,
                    type: 'income' as const,
                    amount: income.amount,
                    description: income.description,
                    category: income.category,
                    date: income.date
                  })),
                  ...filteredExpenses.map(expense => ({
                    ...expense,
                    type: 'expense' as const,
                    amount: expense.valor,
                    description: expense.descricao,
                    category: expense.categoria,
                    date: expense.data
                  }))
                ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                const totalPages = Math.ceil(allTransactions.length / transactionsPerPage);
                const startIndex = (currentPage - 1) * transactionsPerPage;
                const currentTransactions = allTransactions.slice(startIndex, startIndex + transactionsPerPage);

                                 return (
                   <>
                     <div className="max-h-80 overflow-y-auto">
                       <div className="space-y-2 pr-2">
                         {currentTransactions.map((transaction, index) => (
                           <div 
                             key={`${transaction.type}-${index}`} 
                             className="group flex items-center justify-between py-2 px-1 hover:bg-gray-50 rounded-md transition-colors"
                           >
                             <div className="flex items-center gap-2 flex-1 min-w-0">
                               <div className={`w-2 h-2 rounded-full ${transaction.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                               <div className="min-w-0 flex-1">
                                 <p className="font-medium text-sm text-gray-900 truncate">{transaction.description}</p>
                                 <p className="text-xs text-gray-500 capitalize">{transaction.category}</p>
                               </div>
                             </div>
                             
                             <div className="flex items-center gap-2">
                               <div className="text-right flex-shrink-0">
                                 <p className={`font-semibold text-sm ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                   {transaction.type === 'income' ? '+' : '-'}R$ {transaction.amount.toFixed(2)}
                                 </p>
                                 <p className="text-xs text-gray-400">
                                   {new Date(transaction.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                 </p>
                               </div>
                               
                               {/* Ações - sempre visíveis no mobile, hover no desktop */}
                               <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   className="h-6 w-6 p-0 hover:bg-blue-100"
                                   onClick={() => {
                                     if (transaction.type === 'expense') {
                                       handleEditExpense(transaction as any);
                                     } else {
                                       handleEditIncome(transaction as any);
                                     }
                                   }}
                                 >
                                   <Edit2 className="h-3 w-3 text-blue-600" />
                                 </Button>
                                 
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   className="h-6 w-6 p-0 hover:bg-red-100"
                                   onClick={() => {
                                     if (confirm('Tem certeza que deseja excluir esta transação?')) {
                                       if (transaction.type === 'expense') {
                                         handleDeleteExpense(transaction.id);
                                       } else {
                                         handleDeleteIncome(transaction.id);
                                       }
                                     }
                                   }}
                                 >
                                   <Trash2 className="h-3 w-3 text-red-600" />
                                 </Button>
                               </div>
                             </div>
                           </div>
                         ))}
                         
                         {allTransactions.length === 0 && (
                           <div className="text-center py-8 text-gray-400">
                             <p className="text-sm">Nenhuma transação encontrada</p>
        </div>
      )}
                       </div>
                     </div>

                    {/* Paginação */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="text-xs"
                        >
                          ← Anterior
                        </Button>
                        
                        <span className="text-xs text-gray-500">
                          {currentPage} de {totalPages}
                        </span>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="text-xs"
                        >
                          Próxima →
                        </Button>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
    </TabsContent>

    <TabsContent value="analytics" className="space-y-6">
      <AdvancedAnalytics 
        expenses={expenses} 
        incomes={isGold(user) ? incomes : []} 
      />
    </TabsContent>

    <TabsContent value="notifications" className="space-y-6">
      <NotificationCenter />
    </TabsContent>
  </Tabs>

  {/* Modal de Edição de Receitas */}
  <Dialog open={isEditIncomeDialogOpen} onOpenChange={setIsEditIncomeDialogOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Editar Recebimento</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="edit-income-amount">Valor (R$)</Label>
          <Input
            id="edit-income-amount"
            type="number"
            step="0.01"
            value={editIncome.amount}
            onChange={(e) => setEditIncome(prev => ({ ...prev, amount: e.target.value }))}
            placeholder="0,00"
          />
        </div>
        
        <div>
          <Label htmlFor="edit-income-category">Categoria</Label>
          <Select value={editIncome.category} onValueChange={(value) => setEditIncome(prev => ({ ...prev, category: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent>
              {incomeCategories.map(category => (
                <SelectItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="edit-income-description">Descrição</Label>
          <Textarea
            id="edit-income-description"
            value={editIncome.description}
            onChange={(e) => setEditIncome(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Descreva o recebimento..."
          />
        </div>
        
        <div>
          <Label htmlFor="edit-income-date">Data</Label>
          <Input
            id="edit-income-date"
            type="date"
            value={editIncome.date}
            onChange={(e) => setEditIncome(prev => ({ ...prev, date: e.target.value }))}
          />
        </div>
        
        <div>
          <Label htmlFor="edit-income-tags">Tags (separadas por vírgula)</Label>
          <Input
            id="edit-income-tags"
            value={editIncome.tags}
            onChange={(e) => setEditIncome(prev => ({ ...prev, tags: e.target.value }))}
            placeholder="trabalho, extra, mensal..."
          />
        </div>
        
        <Button onClick={handleUpdateIncome} className="w-full bg-green-600 hover:bg-green-700">
          Atualizar Recebimento
        </Button>
      </div>
    </DialogContent>
  </Dialog>
  <MobileBottomNav
    active={/* id do menu ativo, se houver */ 'overview'}
    onChange={() => {}}
    agendaBadge={todayAppointmentsCount}
    avisosBadge={unreadNotificationsCount}
  />
</div>
  );
};

export default React.memo(Dashboard);