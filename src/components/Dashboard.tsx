import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, TrendingDown, TrendingUp, Calendar, Filter, Trash2, Download, Edit, Target, BarChart3, Trophy, Bell, BookTemplate, Crown, Shield, DollarSign, PiggyBank } from 'lucide-react';
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
  
  // Filters
  const [dateFilter, setDateFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  
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

  // Budget form
  const [budgetForm, setBudgetForm] = useState({
    categoria: '',
    valor_orcamento: ''
  });

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

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [expenses, incomes, dateFilter, categoryFilter, minValue, maxValue]);

  const loadData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      console.log('📊 Dashboard - Carregando dados para usuário:', user.id);
      
      // Load expenses
      const userExpenses = await database.getExpensesByUser(user.id);
      setExpenses(userExpenses.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      
      // Load incomes (for gold plan users)
      if (user.plan_type === 'ouro' && database.getIncomesByUser) {
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
  };

  const applyFilters = () => {
    let filteredExp = [...expenses];
    let filteredInc = [...incomes];

    if (dateFilter) {
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

    if (user.plan_type !== 'ouro') {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">📊 Dashboard</h1>
          <p className="text-muted-foreground">
            {user?.plan_type === 'ouro' 
              ? 'Controle completo do seu fluxo de caixa' 
              : 'Visão geral dos seus gastos'}
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadData}>
            🔄 Recarregar
          </Button>
          
          <Button variant="outline" onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}>
            <Filter size={16} className="mr-2" />
            Busca Avançada
          </Button>
          
          <Button variant="outline" onClick={() => setShowTemplates(!showTemplates)}>
            <BookTemplate size={16} className="mr-2" />
            Templates
          </Button>
          
          <Button variant="outline" onClick={exportData}>
            <Download size={16} className="mr-2" />
            Exportar
          </Button>
          
          <Button variant="outline" onClick={() => setIsBudgetDialogOpen(true)}>
            <Target size={16} className="mr-2" />
            Orçamentos
          </Button>
          
          {user?.plan_type === 'ouro' && (
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

      {/* Tabs Navigation */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Análises Avançadas</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Notificações</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Unified Cash Flow Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Entradas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {totalIncomes.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredIncomes.length} recebimentos
            </p>
            {user?.plan_type !== 'ouro' && (
              <p className="text-xs text-yellow-600 mt-1">
                🥇 Upgrade para Ouro para registrar
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Saídas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {totalExpenses.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredExpenses.length} gastos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Líquido</CardTitle>
            <DollarSign className={`h-4 w-4 ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              R$ {netBalance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {netBalance >= 0 ? 'Superávit' : 'Déficit'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Mensal</CardTitle>
            <PiggyBank className={`h-4 w-4 ${monthlyBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${monthlyBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              R$ {monthlyBalance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('pt-BR', { month: 'long' })}
            </p>
          </CardContent>
        </Card>
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

      {/* Filters */}
      <Card>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Fluxo de Caixa</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthName" />
                  <YAxis />
                  <Tooltip labelFormatter={(value) => {
                    const data = cashFlowData.find(d => d.month === value.dataKey);
                    return [
                      `Data: ${data?.monthName}`,
                      `Saldo: R$ ${data?.balance.toFixed(2)}`
                    ];
                  }} />
                  <Bar dataKey="expenses" fill="#ef4444" />
                  <Bar dataKey="incomes" fill="#22c55e" />
                  <Area dataKey="balance" type="monotone" stroke="#000000" fill="#ff7373" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {monthlyData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Gastos por Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Total']} />
                    <Bar dataKey="total" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Unified Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {user?.plan_type === 'ouro' 
              ? `Fluxo de Caixa (${filteredExpenses.length + filteredIncomes.length} transações)`
              : `Lista de Gastos (${filteredExpenses.length})`
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(filteredExpenses.length === 0 && filteredIncomes.length === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma transação encontrada com os filtros aplicados.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Combine and sort all transactions */}
              {[
                ...filteredExpenses.map(expense => ({
                  ...expense,
                  type: 'expense' as const,
                  amount: expense.valor,
                  date: expense.data,
                  category: expense.categoria,
                  description: expense.descricao
                })),
                ...filteredIncomes.map(income => ({
                  ...income,
                  type: 'income' as const,
                  amount: income.amount,
                  date: income.date,
                  category: income.category,
                  description: income.description
                }))
              ]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((transaction) => (
                  <div
                    key={`${transaction.type}-${transaction.id}`}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge 
                          variant={transaction.type === 'expense' ? 'destructive' : 'default'}
                          className={transaction.type === 'expense' ? '' : 'bg-green-100 text-green-800 border-green-200'}
                        >
                          {transaction.type === 'expense' ? '📤 Saída' : '📥 Entrada'}
                        </Badge>
                        <Badge 
                          variant="outline"
                          style={{ 
                            borderColor: categoryColors[transaction.category as keyof typeof categoryColors],
                            color: categoryColors[transaction.category as keyof typeof categoryColors]
                          }}
                        >
                          {transaction.category}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p className="font-medium">{transaction.description}</p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`text-lg font-bold ${
                        transaction.type === 'expense' ? 'text-red-500' : 'text-green-500'
                      }`}>
                        {transaction.type === 'expense' ? '-' : '+'}R$ {transaction.amount.toFixed(2)}
                      </span>
                      {transaction.type === 'expense' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditExpense(transaction as Expense)}
                            className="text-blue-500 hover:text-blue-600"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteExpense(transaction.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Expense Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Gasto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-valor">Valor (R$)</Label>
              <Input
                id="edit-valor"
                type="number"
                step="0.01"
                value={editExpense.valor}
                onChange={(e) => setEditExpense(prev => ({ ...prev, valor: e.target.value }))}
                placeholder="0,00"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-categoria">Categoria</Label>
              <Select value={editExpense.categoria} onValueChange={(value) => setEditExpense(prev => ({ ...prev, categoria: value }))}>
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
              <Label htmlFor="edit-descricao">Descrição</Label>
              <Textarea
                id="edit-descricao"
                value={editExpense.descricao}
                onChange={(e) => setEditExpense(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descreva o gasto..."
              />
            </div>
            
            <div>
              <Label htmlFor="edit-data">Data</Label>
              <Input
                id="edit-data"
                type="date"
                value={editExpense.data}
                onChange={(e) => setEditExpense(prev => ({ ...prev, data: e.target.value }))}
              />
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={handleUpdateExpense} className="flex-1">
                Salvar Alterações
              </Button>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Budget Dialog */}
      <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir Orçamento Mensal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="budget-categoria">Categoria</Label>
              <Select value={budgetForm.categoria} onValueChange={(value) => setBudgetForm(prev => ({ ...prev, categoria: value }))}>
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
              <Label htmlFor="budget-valor">Orçamento (R$)</Label>
              <Input
                id="budget-valor"
                type="number"
                step="0.01"
                value={budgetForm.valor_orcamento}
                onChange={(e) => setBudgetForm(prev => ({ ...prev, valor_orcamento: e.target.value }))}
                placeholder="0,00"
              />
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={handleSetBudget} className="flex-1">
                Definir Orçamento
              </Button>
              <Button variant="outline" onClick={() => setIsBudgetDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <AdvancedAnalytics 
            expenses={expenses} 
            incomes={user?.plan_type === 'ouro' ? incomes : []} 
          />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationCenter />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
