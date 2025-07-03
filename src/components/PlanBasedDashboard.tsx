import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { useToast } from '../hooks/use-toast';
import { supabaseDatabase } from '../lib/supabase-database';
import { User, Expense, Income } from '../lib/supabase-database';
import { 
  Crown, 
  Shield, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PiggyBank,
  Plus,
  BarChart3,
  Zap,
  Star,
  Edit2,
  Trash2,
  Filter,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { isGold } from '../lib/utils';

interface PlanBasedDashboardProps {
  user: User;
}

export const PlanBasedDashboard: React.FC<PlanBasedDashboardProps> = ({ user }) => {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  
  // States para filtros e edição
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 10;
  
  // Edit states
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [editingIncome, setEditingIncome] = useState<any>(null);
  const [isEditExpenseDialogOpen, setIsEditExpenseDialogOpen] = useState(false);
  const [isEditIncomeDialogOpen, setIsEditIncomeDialogOpen] = useState(false);
  const [editExpense, setEditExpense] = useState({
    valor: '',
    categoria: '',
    descricao: '',
    data: ''
  });
  const [editIncome, setEditIncome] = useState({
    amount: '',
    category: '',
    description: '',
    date: '',
    tags: ''
  });

  // Form states for income
  const [incomeForm, setIncomeForm] = useState({
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    tags: ''
  });

  // Form states for expense
  const [expenseForm, setExpenseForm] = useState({
    descricao: '',
    valor: '',
    categoria: '',
    data: new Date().toISOString().split('T')[0]
  });

  const incomeCategories = [
    'salario',
    'freelance', 
    'investimento',
    'vendas',
    'bonus',
    'aluguel',
    'dividendos',
    'outros'
  ];

  const expenseCategories = [
    'mercado',
    'transporte',
    'alimentacao',
    'saude',
    'educacao',
    'lazer',
    'casa',
    'roupas',
    'tecnologia',
    'outros'
  ];

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load expenses (available for all plans)
      const userExpenses = await supabaseDatabase.getExpensesByUser(user.id);
      setExpenses(userExpenses);

      // Load incomes (only for gold plan)
      if (isGold(user) && supabaseDatabase.getIncomesByUser) {
        const userIncomes = await supabaseDatabase.getIncomesByUser(user.id);
        setIncomes(userIncomes);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtros
  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Reset da página quando os filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate]);

  // Edit/Delete functions for expenses
  const handleEditExpense = (transaction: any) => {
    setEditingExpense(transaction);
    setEditExpense({
      valor: transaction.amount.toString(),
      categoria: transaction.category,
      descricao: transaction.description,
      data: transaction.date
    });
    setIsEditExpenseDialogOpen(true);
  };

  const handleUpdateExpense = async () => {
    if (!supabaseDatabase.updateExpense || !editingExpense) {
      toast({
        title: "Erro",
        description: "Funcionalidade não disponível",
        variant: "destructive"
      });
      return;
    }

    try {
      const updatedExpense = await supabaseDatabase.updateExpense(editingExpense.id, {
        descricao: editExpense.descricao,
        valor: parseFloat(editExpense.valor),
        categoria: editExpense.categoria,
        data: editExpense.data
      });

      if (updatedExpense) {
        setExpenses(expenses.map(e => e.id === editingExpense.id ? updatedExpense : e));
        setIsEditExpenseDialogOpen(false);
        setEditingExpense(null);
        
        toast({
          title: "✅ Gasto Atualizado!",
          description: `${updatedExpense.descricao} foi atualizado`
        });
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar gasto",
        variant: "destructive"
      });
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!supabaseDatabase.deleteExpense) {
      toast({
        title: "Erro",
        description: "Funcionalidade não disponível",
        variant: "destructive"
      });
      return;
    }

    try {
      await supabaseDatabase.deleteExpense(expenseId);
      setExpenses(expenses.filter(e => e.id !== expenseId));
      
      toast({
        title: "✅ Gasto Excluído!",
        description: "O gasto foi removido com sucesso"
      });
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir gasto",
        variant: "destructive"
      });
    }
  };

  // Edit/Delete functions for incomes
  const handleEditIncome = (transaction: any) => {
    setEditingIncome(transaction);
    setEditIncome({
      amount: transaction.amount.toString(),
      category: transaction.category,
      description: transaction.description,
      date: transaction.date,
      tags: Array.isArray(transaction.tags) ? transaction.tags.join(', ') : ''
    });
    setIsEditIncomeDialogOpen(true);
  };

  const handleUpdateIncome = async () => {
    if (!supabaseDatabase.updateIncome || !editingIncome) {
      toast({
        title: "Erro",
        description: "Funcionalidade não disponível",
        variant: "destructive"
      });
      return;
    }

    try {
      const updatedIncome = await supabaseDatabase.updateIncome(editingIncome.id, {
        description: editIncome.description,
        amount: parseFloat(editIncome.amount),
        category: editIncome.category,
        date: editIncome.date,
        tags: editIncome.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      });

      if (updatedIncome) {
        setIncomes(incomes.map(i => i.id === editingIncome.id ? updatedIncome : i));
        setIsEditIncomeDialogOpen(false);
        setEditingIncome(null);
        
        toast({
          title: "✅ Recebimento Atualizado!",
          description: `${updatedIncome.description} foi atualizado`
        });
      }
    } catch (error) {
      console.error('Error updating income:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar recebimento",
        variant: "destructive"
      });
    }
  };

  const handleDeleteIncome = async (incomeId: string) => {
    if (!supabaseDatabase.deleteIncome) {
      toast({
        title: "Erro",
        description: "Funcionalidade não disponível",
        variant: "destructive"
      });
      return;
    }

    try {
      await supabaseDatabase.deleteIncome(incomeId);
      setIncomes(incomes.filter(i => i.id !== incomeId));
      
      toast({
        title: "✅ Recebimento Excluído!",
        description: "O recebimento foi removido com sucesso"
      });
    } catch (error) {
      console.error('Error deleting income:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir recebimento",
        variant: "destructive"
      });
    }
  };

  const handleAddIncome = async () => {
    if (!supabaseDatabase.addIncome) {
      toast({
        title: "Erro",
        description: "Funcionalidade não disponível",
        variant: "destructive"
      });
      return;
    }

    try {
      const newIncome = await supabaseDatabase.addIncome({
        user_id: user.id,
        description: incomeForm.description,
        amount: parseFloat(incomeForm.amount),
        category: incomeForm.category,
        date: incomeForm.date,
        tags: incomeForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      });

      if (newIncome) {
        setIncomes([newIncome, ...incomes]);
        setIncomeForm({
          description: '',
          amount: '',
          category: '',
          date: new Date().toISOString().split('T')[0],
          tags: ''
        });
        setShowIncomeForm(false);
        
        toast({
          title: "✅ Recebimento Adicionado!",
          description: `R$ ${newIncome.amount.toFixed(2)} em ${newIncome.category}`
        });
      }
    } catch (error) {
      console.error('Error adding income:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar recebimento",
        variant: "destructive"
      });
    }
  };

  const handleAddExpense = async () => {
    if (!supabaseDatabase.addExpense) {
      toast({
        title: "Erro",
        description: "Funcionalidade não disponível",
        variant: "destructive"
      });
      return;
    }

    try {
      const newExpense = await supabaseDatabase.addExpense({
        usuario_id: user.id,
        descricao: expenseForm.descricao,
        valor: parseFloat(expenseForm.valor),
        categoria: expenseForm.categoria,
        data: expenseForm.data
      });

      if (newExpense) {
        setExpenses([newExpense, ...expenses]);
        setExpenseForm({
          descricao: '',
          valor: '',
          categoria: '',
          data: new Date().toISOString().split('T')[0]
        });
        setShowExpenseForm(false);
        
        toast({
          title: "✅ Gasto Adicionado!",
          description: `R$ ${newExpense.valor.toFixed(2)} em ${newExpense.categoria}`
        });
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar gasto",
        variant: "destructive"
      });
    }
  };

  const handleGoToChat = () => {
    // Navigate to chat - assuming we're using a router or parent component handles this
    window.location.href = '/';
  };

  const handleUpgradePlan = async () => {
    if (!supabaseDatabase.updateUserPlan) {
      toast({
        title: "Erro",
        description: "Funcionalidade não disponível",
        variant: "destructive"
      });
      return;
    }

    try {
      const updatedUser = await supabaseDatabase.updateUserPlan(user.id, 'ouro');
      if (updatedUser) {
        // Force page reload to update user context
        window.location.reload();
        
        toast({
          title: "🎉 Upgrade Realizado!",
          description: "Agora você tem acesso ao Plano Ouro!"
        });
      }
    } catch (error) {
      console.error('Error upgrading plan:', error);
      toast({
        title: "Erro",
        description: "Erro ao fazer upgrade do plano",
        variant: "destructive"
      });
    }
  };

  // Calculate statistics
  const currentMonth = new Date().toISOString().substring(0, 7);
  const monthlyExpenses = expenses.filter(e => e.data.startsWith(currentMonth));
  const monthlyIncomes = incomes.filter(i => i.date.startsWith(currentMonth));
  
  const totalExpenses = monthlyExpenses.reduce((sum, e) => sum + e.valor, 0);
  const totalIncomes = monthlyIncomes.reduce((sum, i) => sum + i.amount, 0);
  const balance = totalIncomes - totalExpenses;

  // Adicionar função utilitária para exibir o nome do plano
  function getPlanoLabel(plan_type: string) {
    if (plan_type === 'ouro') return 'Ouro';
    if (plan_type === 'bronze') return 'Bronze';
    if (plan_type === 'trial') return 'Gold (Trial)';
    return 'Sem Plano';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-full w-full">
      {/* Plan Header */}
      <Card className={`border-2 ${isGold(user) ? 'border-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50' : 'border-gray-300 bg-gray-50'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isGold(user) ? (
                <Crown className="h-8 w-8 text-yellow-600" />
              ) : (
                <Shield className="h-8 w-8 text-gray-600" />
              )}
              <div>
                <CardTitle className="flex items-center gap-2">
                  Plano {isGold(user) ? 'Ouro' : 'Bronze'}
                  <Badge variant={isGold(user) ? 'default' : 'secondary'} className={isGold(user) ? 'bg-yellow-600' : ''}>
                    {isGold(user) ? 'Premium' : 'Básico'}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {isGold(user) 
                    ? 'Acesso completo a gastos e recebimentos' 
                    : 'Controle básico de gastos'
                  }
                </CardDescription>
              </div>
            </div>
            
            {!isGold(user) && (
              <Button onClick={() => setShowUpgrade(true)} className="bg-yellow-600 hover:bg-yellow-700">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade para Ouro
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Cards - Minimalistas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card Total de Saídas */}
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
              {monthlyExpenses.length} gastos
            </p>
          </div>
          <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-red-200 rounded-full opacity-20"></div>
        </div>

        {/* Card Total de Entradas */}
        {isGold(user) ? (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl p-4 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-700">Entradas</p>
              <p className="text-2xl font-bold text-green-800">
                R$ {totalIncomes.toFixed(2)}
              </p>
              <p className="text-sm text-green-600 opacity-80">
                {monthlyIncomes.length} registros
              </p>
            </div>
            <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-green-200 rounded-full opacity-20"></div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-4 relative overflow-hidden opacity-60">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-gray-400" />
              </div>
              <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center">
                <span className="text-sm">🔒</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">Entradas</p>
              <p className="text-2xl font-bold text-gray-500">
                Plano {getPlanoLabel(user.plan_type)}
              </p>
              {!isGold(user) && (
                <p className="text-sm text-gray-400 opacity-80">
                  Upgrade necessário
                </p>
              )}
            </div>
            <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-gray-200 rounded-full opacity-20"></div>
          </div>
        )}

        {/* Card Saldo Líquido */}
        {isGold(user) ? (
          <div className={`bg-gradient-to-br ${balance >= 0 ? 'from-blue-50 to-indigo-50 border-blue-100' : 'from-orange-50 to-amber-50 border-orange-100'} border rounded-xl p-4 relative overflow-hidden`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${balance >= 0 ? 'bg-blue-100' : 'bg-orange-100'} flex items-center justify-center`}>
                <DollarSign className={`h-5 w-5 ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
              </div>
            </div>
            <div className="space-y-2">
              <p className={`text-sm font-medium ${balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Saldo Geral</p>
              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                R$ {balance.toFixed(2)}
              </p>
              <p className={`text-sm ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'} opacity-80`}>
                {balance >= 0 ? 'Positivo' : 'Negativo'}
              </p>
            </div>
            <div className={`absolute -right-6 -bottom-6 w-20 h-20 ${balance >= 0 ? 'bg-blue-200' : 'bg-orange-200'} rounded-full opacity-20`}></div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-4 relative overflow-hidden opacity-60">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-gray-400" />
              </div>
              <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center">
                <span className="text-sm">🔒</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">Saldo</p>
              <p className="text-2xl font-bold text-gray-500">
                Plano {getPlanoLabel(user.plan_type)}
              </p>
              {!isGold(user) && (
                <p className="text-sm text-gray-400 opacity-80">
                  Upgrade necessário
                </p>
              )}
            </div>
            <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-gray-200 rounded-full opacity-20"></div>
          </div>
        )}

        {/* Card Gasto Médio */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <PiggyBank className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-purple-700">Gasto Médio</p>
            <p className="text-2xl font-bold text-purple-800">
              R$ {monthlyExpenses.length > 0 ? (totalExpenses / monthlyExpenses.length).toFixed(2) : '0.00'}
            </p>
            <p className="text-sm text-purple-600 opacity-80">
              por item
            </p>
          </div>
          <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-purple-200 rounded-full opacity-20"></div>
        </div>
      </div>

      {/* Transactions Management - Unified for all plans */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Minhas transações
              </CardTitle>
              <CardDescription>
                Acompanhe suas transações em tempo real
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button onClick={() => setShowExpenseForm(true)} variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50 w-full sm:w-auto">
                <span className="text-lg font-bold mr-2">-</span>
                Saída
              </Button>
              {isGold(user) && (
                <Button onClick={() => setShowIncomeForm(true)} variant="outline" size="sm" className="text-green-600 border-green-300 hover:bg-green-50 w-full sm:w-auto">
                  <span className="text-lg font-bold mr-2">+</span>
                  Entrada
                </Button>
              )}
              <Button onClick={handleGoToChat} variant="outline" size="sm" className="text-blue-600 border-blue-300 hover:bg-blue-50 w-full sm:w-auto">
                💬 Alfred IA
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {showIncomeForm && isGold(user) && (
          <CardContent className="border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={incomeForm.description}
                  onChange={(e) => setIncomeForm({...incomeForm, description: e.target.value})}
                  placeholder="Ex: Salário, Freelance..."
                />
              </div>
              
              <div>
                <Label htmlFor="amount">Valor</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={incomeForm.amount}
                  onChange={(e) => setIncomeForm({...incomeForm, amount: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select value={incomeForm.category} onValueChange={(value) => setIncomeForm({...incomeForm, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {incomeCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={incomeForm.date}
                  onChange={(e) => setIncomeForm({...incomeForm, date: e.target.value})}
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                <Input
                  id="tags"
                  value={incomeForm.tags}
                  onChange={(e) => setIncomeForm({...incomeForm, tags: e.target.value})}
                  placeholder="trabalho, extra, mensal..."
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button onClick={handleAddIncome} disabled={!incomeForm.description || !incomeForm.amount || !incomeForm.category}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Recebimento
              </Button>
              <Button variant="outline" onClick={() => setShowIncomeForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        )}
        
        {showExpenseForm && (
          <CardContent className="border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expense-description">Descrição</Label>
                <Input
                  id="expense-description"
                  value={expenseForm.descricao}
                  onChange={(e) => setExpenseForm({...expenseForm, descricao: e.target.value})}
                  placeholder="Ex: Supermercado, Uber, Restaurante..."
                />
              </div>
              
              <div>
                <Label htmlFor="expense-amount">Valor</Label>
                <Input
                  id="expense-amount"
                  type="number"
                  step="0.01"
                  value={expenseForm.valor}
                  onChange={(e) => setExpenseForm({...expenseForm, valor: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <Label htmlFor="expense-category">Categoria</Label>
                <Select value={expenseForm.categoria} onValueChange={(value) => setExpenseForm({...expenseForm, categoria: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="expense-date">Data</Label>
                <Input
                  id="expense-date"
                  type="date"
                  value={expenseForm.data}
                  onChange={(e) => setExpenseForm({...expenseForm, data: e.target.value})}
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button onClick={handleAddExpense} disabled={!expenseForm.descricao || !expenseForm.valor || !expenseForm.categoria} className="bg-red-600 hover:bg-red-700">
                <span className="text-lg font-bold mr-2">-</span>
                Adicionar Gasto
              </Button>
              <Button variant="outline" onClick={() => setShowExpenseForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        )}
        
        {/* Filtro Minimalista */}
        <CardContent className="border-t">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-blue-600" />
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-blue-700 mb-1 block">Data início</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-sm h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs text-blue-700 mb-1 block">Data fim</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-sm h-8"
                  />
                </div>
              </div>
              {(startDate || endDate) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClearFilters}
                  className="text-blue-600 hover:bg-blue-100 h-8 px-2"
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {/* Unified Transactions List */}
          <h4 className="font-medium mb-3">Transações Recentes</h4>
          {(() => {
            // Combine and sort all transactions
            let allTransactions = [
              ...expenses.map(expense => ({
                id: expense.id,
                type: 'expense' as const,
                description: expense.descricao,
                amount: expense.valor,
                category: expense.categoria,
                date: expense.data,
                created_at: expense.created_at
              })),
              ...(isGold(user) ? incomes.map(income => ({
                id: income.id,
                type: 'income' as const,
                description: income.description,
                amount: income.amount,
                category: income.category,
                date: income.date,
                created_at: income.created_at,
                tags: income.tags
              })) : [])
            ];

            // Aplicar filtros
            if (startDate || endDate) {
              allTransactions = allTransactions.filter(transaction => {
                const transactionDate = transaction.date;
                return (!startDate || transactionDate >= startDate) && 
                       (!endDate || transactionDate <= endDate);
              });
            }

            // Ordenar por data de criação (mais recentes primeiro)
            allTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            // Aplicar paginação
            const startIndex = (currentPage - 1) * transactionsPerPage;
            const endIndex = startIndex + transactionsPerPage;
            const paginatedTransactions = allTransactions.slice(startIndex, endIndex);
            const totalPages = Math.ceil(allTransactions.length / transactionsPerPage);

            if (allTransactions.length === 0) {
              return (
                <p className="text-gray-500 text-center py-4">
                  Nenhuma transação encontrada. Use os botões acima para cadastrar diretamente
                  {isGold(user) ? ' ou converse com o Alfred IA!' : ' ou use o Alfred IA!'}
                </p>
              );
            }

            return (
              <div className="space-y-2">
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {paginatedTransactions.map((transaction) => (
                    <div key={`${transaction.type}-${transaction.id}`} className="group/item flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${transaction.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-500">
                              {transaction.category} • {new Date(transaction.date).toLocaleDateString()}
                            </p>
                            <Badge 
                              variant="outline" 
                              className={`text-xs px-2 py-0.5 ${
                                transaction.type === 'income' 
                                  ? 'bg-green-50 text-green-700 border-green-200' 
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}
                            >
                              {transaction.type === 'income' ? 'Entrada' : 'Saída'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right flex items-center gap-2">
                          {transaction.type === 'income' ? (
                            <ArrowUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <ArrowDown className="h-4 w-4 text-red-500" />
                          )}
                          <p className={`font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            R$ {transaction.amount.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover/item:opacity-100 transition-opacity duration-200">
                          {transaction.type === 'expense' ? (
                            <>
                              <button
                                onClick={() => handleEditExpense(transaction)}
                                className="w-6 h-6 rounded-md bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"
                              >
                                <Edit2 className="h-3 w-3 text-blue-600" />
                              </button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button className="w-6 h-6 rounded-md bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors">
                                    <Trash2 className="h-3 w-3 text-red-600" />
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir gasto</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir o gasto "{transaction.description}"? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteExpense(transaction.id)} className="bg-red-600 hover:bg-red-700">
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          ) : (
                            isGold(user) && (
                              <>
                                <button
                                  onClick={() => handleEditIncome(transaction)}
                                  className="w-6 h-6 rounded-md bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"
                                >
                                  <Edit2 className="h-3 w-3 text-blue-600" />
                                </button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <button className="w-6 h-6 rounded-md bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors">
                                      <Trash2 className="h-3 w-3 text-red-600" />
                                    </button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir recebimento</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja excluir o recebimento "{transaction.description}"? Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteIncome(transaction.id)} className="bg-red-600 hover:bg-red-700">
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-3 border-t">
                    <p className="text-sm text-gray-500">
                      Página {currentPage} de {totalPages} ({allTransactions.length} itens)
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="h-8"
                      >
                        Anterior
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="h-8"
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Edit Expense Dialog */}
      <Dialog open={isEditExpenseDialogOpen} onOpenChange={setIsEditExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Gasto</DialogTitle>
            <DialogDescription>
              Faça as alterações necessárias no gasto selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-expense-description">Descrição</Label>
              <Input
                id="edit-expense-description"
                value={editExpense.descricao}
                onChange={(e) => setEditExpense({...editExpense, descricao: e.target.value})}
                placeholder="Ex: Supermercado, Uber..."
              />
            </div>
            <div>
              <Label htmlFor="edit-expense-amount">Valor</Label>
              <Input
                id="edit-expense-amount"
                type="number"
                step="0.01"
                value={editExpense.valor}
                onChange={(e) => setEditExpense({...editExpense, valor: e.target.value})}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="edit-expense-category">Categoria</Label>
              <Select value={editExpense.categoria} onValueChange={(value) => setEditExpense({...editExpense, categoria: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-expense-date">Data</Label>
              <Input
                id="edit-expense-date"
                type="date"
                value={editExpense.data}
                onChange={(e) => setEditExpense({...editExpense, data: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditExpenseDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateExpense} disabled={!editExpense.descricao || !editExpense.valor || !editExpense.categoria}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Income Dialog */}
      <Dialog open={isEditIncomeDialogOpen} onOpenChange={setIsEditIncomeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Recebimento</DialogTitle>
            <DialogDescription>
              Faça as alterações necessárias no recebimento selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-income-description">Descrição</Label>
              <Input
                id="edit-income-description"
                value={editIncome.description}
                onChange={(e) => setEditIncome({...editIncome, description: e.target.value})}
                placeholder="Ex: Salário, Freelance..."
              />
            </div>
            <div>
              <Label htmlFor="edit-income-amount">Valor</Label>
              <Input
                id="edit-income-amount"
                type="number"
                step="0.01"
                value={editIncome.amount}
                onChange={(e) => setEditIncome({...editIncome, amount: e.target.value})}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="edit-income-category">Categoria</Label>
              <Select value={editIncome.category} onValueChange={(value) => setEditIncome({...editIncome, category: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {incomeCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-income-date">Data</Label>
              <Input
                id="edit-income-date"
                type="date"
                value={editIncome.date}
                onChange={(e) => setEditIncome({...editIncome, date: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="edit-income-tags">Tags (separadas por vírgula)</Label>
              <Input
                id="edit-income-tags"
                value={editIncome.tags}
                onChange={(e) => setEditIncome({...editIncome, tags: e.target.value})}
                placeholder="trabalho, extra, mensal..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditIncomeDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateIncome} disabled={!editIncome.description || !editIncome.amount || !editIncome.category}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Modal */}
      {showUpgrade && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="text-center">
              <Crown className="h-12 w-12 text-yellow-600 mx-auto mb-2" />
              <CardTitle>Upgrade para Plano Ouro</CardTitle>
              <CardDescription>
                Desbloqueie funcionalidades premium
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-600" />
                  <span>Registro de recebimentos</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-yellow-600" />
                  <span>Análise de fluxo de caixa</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-600" />
                  <span>Alfred IA para recebimentos</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-yellow-600" />
                  <span>Relatórios comparativos</span>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={handleUpgradePlan} className="flex-1 bg-yellow-600 hover:bg-yellow-700">
                  <Crown className="h-4 w-4 mr-2" />
                  Fazer Upgrade
                </Button>
                <Button variant="outline" onClick={() => setShowUpgrade(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PlanBasedDashboard;
