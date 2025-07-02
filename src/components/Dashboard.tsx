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
import { Plus, TrendingDown, Calendar, Filter, Trash2, Download, Edit, Target, BarChart3, TrendingUp, Trophy, Bell, BookTemplate } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { database, Expense, Budget } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Progress } from '@/components/ui/progress';
import AdvancedAnalytics from './AdvancedAnalytics';
import GoalsAndAchievements from './GoalsAndAchievements';
import NotificationCenter from './NotificationCenter';
import AdvancedSearch from './AdvancedSearch';
import SimpleExpenseTemplates from './SimpleExpenseTemplates';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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

  const categories = [
    'mercado', 'transporte', 'contas', 'lazer', 'alimentação', 
    'saúde', 'educação', 'outros'
  ];

  const categoryColors = {
    mercado: '#10b981',
    transporte: '#3b82f6',
    contas: '#f59e0b',
    lazer: '#8b5cf6',
    alimentação: '#ef4444',
    saúde: '#06b6d4',
    educação: '#84cc16',
    outros: '#6b7280'
  };

  useEffect(() => {
    loadExpenses();
    loadBudgets();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [expenses, dateFilter, categoryFilter, minValue, maxValue]);

  const loadExpenses = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      console.log('📊 Dashboard - Carregando gastos para usuário:', user.id);
      console.log('📊 Dashboard - Tipo de database:', database.constructor.name);
      
      const userExpenses = await database.getExpensesByUser(user.id);
      console.log('📊 Dashboard - Gastos carregados:', userExpenses.length);
      console.log('📊 Dashboard - Gastos:', userExpenses);
      
      setExpenses(userExpenses.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (error) {
      console.error('❌ Dashboard - Error loading expenses:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar gastos",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadBudgets = async () => {
    if (!user) return;
    
    try {
      const currentMonth = new Date().toISOString().substring(0, 7); // "2025-01"
      const userBudgets = await database.getBudgetsByUser(user.id, currentMonth);
      setBudgets(userBudgets);
    } catch (error) {
      console.error('Error loading budgets:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...expenses];

    if (dateFilter) {
      filtered = filtered.filter(expense => expense.data === dateFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(expense => expense.categoria === categoryFilter);
    }

    if (minValue) {
      filtered = filtered.filter(expense => expense.valor >= parseFloat(minValue));
    }

    if (maxValue) {
      filtered = filtered.filter(expense => expense.valor <= parseFloat(maxValue));
    }

    setFilteredExpenses(filtered);
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
      loadExpenses();
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
      loadExpenses();
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
      loadExpenses();
    } catch (error) {
      console.error('Error updating expense:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar gasto",
        variant: "destructive"
      });
    }
  };

  const exportData = () => {
    const csvContent = [
      ['Data', 'Categoria', 'Descrição', 'Valor'],
      ...filteredExpenses.map(expense => [
        expense.data,
        expense.categoria,
        expense.descricao,
        expense.valor.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gastos-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Calculate statistics
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.valor, 0);
  const averageExpense = filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0;
  
  // Calculate current month expenses for budget comparison
  const currentMonth = new Date().toISOString().substring(0, 7);
  const currentMonthExpenses = expenses.filter(expense => expense.data.startsWith(currentMonth));
  
  const categoryTotals = categories.map(category => ({
    name: category,
    value: currentMonthExpenses
      .filter(expense => expense.categoria === category)
      .reduce((sum, expense) => sum + expense.valor, 0)
  })).filter(item => item.value > 0);

  // Calculate budget progress
  const budgetProgress = categories.map(category => {
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
      loadBudgets();
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
          <p className="text-muted-foreground">Visão geral dos seus gastos</p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadExpenses}>
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
                      {categories.map(category => (
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Análises Avançadas</span>
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center space-x-2">
            <Trophy className="h-4 w-4" />
            <span>Metas & Conquistas</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Notificações</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Gastos</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              R$ {totalExpenses.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gasto Médio</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {averageExpense.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quantidade</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredExpenses.length} gastos
            </div>
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
                  {categories.map(category => (
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
      {categoryTotals.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Gastos por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryTotals}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryTotals.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={categoryColors[entry.name as keyof typeof categoryColors]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Total']} />
                </PieChart>
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

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Gastos ({filteredExpenses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum gasto encontrado com os filtros aplicados.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge 
                        variant="outline"
                        style={{ 
                          borderColor: categoryColors[expense.categoria as keyof typeof categoryColors],
                          color: categoryColors[expense.categoria as keyof typeof categoryColors]
                        }}
                      >
                        {expense.categoria}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(expense.data).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className="font-medium">{expense.descricao}</p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-red-500">
                      R$ {expense.valor.toFixed(2)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditExpense(expense)}
                      className="text-blue-500 hover:text-blue-600"
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteExpense(expense.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 size={16} />
                    </Button>
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
                  {categories.map(category => (
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
                  {categories.map(category => (
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
          <AdvancedAnalytics expenses={expenses} />
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <GoalsAndAchievements />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationCenter />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
