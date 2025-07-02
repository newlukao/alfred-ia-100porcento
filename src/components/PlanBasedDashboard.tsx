import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '../hooks/use-toast';
import { database } from '../lib/database';
import { User, Expense, Income } from '../lib/database';
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
  Star
} from 'lucide-react';

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
      const userExpenses = await database.getExpensesByUser(user.id);
      setExpenses(userExpenses);

      // Load incomes (only for gold plan)
      if (user.plan_type === 'ouro' && database.getIncomesByUser) {
        const userIncomes = await database.getIncomesByUser(user.id);
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

  const handleAddIncome = async () => {
    if (!database.addIncome) {
      toast({
        title: "Erro",
        description: "Funcionalidade não disponível",
        variant: "destructive"
      });
      return;
    }

    try {
      const newIncome = await database.addIncome({
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
    if (!database.addExpense) {
      toast({
        title: "Erro",
        description: "Funcionalidade não disponível",
        variant: "destructive"
      });
      return;
    }

    try {
      const newExpense = await database.addExpense({
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
    if (!database.updateUserPlan) {
      toast({
        title: "Erro",
        description: "Funcionalidade não disponível",
        variant: "destructive"
      });
      return;
    }

    try {
      const updatedUser = await database.updateUserPlan(user.id, 'ouro');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plan Header */}
      <Card className={`border-2 ${user.plan_type === 'ouro' ? 'border-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50' : 'border-gray-300 bg-gray-50'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {user.plan_type === 'ouro' ? (
                <Crown className="h-8 w-8 text-yellow-600" />
              ) : (
                <Shield className="h-8 w-8 text-gray-600" />
              )}
              <div>
                <CardTitle className="flex items-center gap-2">
                  Plano {user.plan_type === 'ouro' ? 'Ouro' : 'Bronze'}
                  <Badge variant={user.plan_type === 'ouro' ? 'default' : 'secondary'} className={user.plan_type === 'ouro' ? 'bg-yellow-600' : ''}>
                    {user.plan_type === 'ouro' ? 'Premium' : 'Básico'}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {user.plan_type === 'ouro' 
                    ? 'Acesso completo a gastos e recebimentos' 
                    : 'Controle básico de gastos'
                  }
                </CardDescription>
              </div>
            </div>
            
            {user.plan_type === 'bronze' && (
              <Button onClick={() => setShowUpgrade(true)} className="bg-yellow-600 hover:bg-yellow-700">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade para Ouro
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Expenses Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos do Mês</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {totalExpenses.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {monthlyExpenses.length} transações
            </p>
          </CardContent>
        </Card>

        {/* Incomes Card (Gold Plan Only) */}
        {user.plan_type === 'ouro' ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recebimentos do Mês</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {totalIncomes.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {monthlyIncomes.length} recebimentos
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-gray-300 opacity-60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Recebimentos</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-400">
                Plano Ouro
              </div>
              <p className="text-xs text-gray-400">
                Upgrade necessário
              </p>
            </CardContent>
          </Card>
        )}

        {/* Balance Card (Gold Plan Only) */}
        {user.plan_type === 'ouro' ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo do Mês</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {balance.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {balance >= 0 ? 'Superávit' : 'Déficit'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-gray-300 opacity-60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Saldo</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-400">
                Plano Ouro
              </div>
              <p className="text-xs text-gray-400">
                Upgrade necessário
              </p>
            </CardContent>
          </Card>
        )}

        {/* Savings Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meta de Economia</CardTitle>
            <PiggyBank className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {user.plan_type === 'ouro' ? `${((balance / (totalIncomes || 1)) * 100).toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {user.plan_type === 'ouro' ? 'da receita poupada' : 'Plano Ouro necessário'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Management - Unified for all plans */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Minhas transações
              </CardTitle>
              <CardDescription>
                Acompanhe suas transações em tempo real
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowExpenseForm(true)} variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50">
                <span className="text-lg font-bold mr-2">-</span>
                Saída
              </Button>
              {user.plan_type === 'ouro' && (
                <Button onClick={() => setShowIncomeForm(true)} variant="outline" size="sm" className="text-green-600 border-green-300 hover:bg-green-50">
                  <span className="text-lg font-bold mr-2">+</span>
                  Entrada
                </Button>
              )}
              <Button onClick={handleGoToChat} variant="outline" size="sm" className="text-blue-600 border-blue-300 hover:bg-blue-50">
                💬 Chat IA
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {showIncomeForm && user.plan_type === 'ouro' && (
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
        
        {/* Unified Transactions List */}
        <CardContent>
          <h4 className="font-medium mb-3">Transações Recentes</h4>
          {(() => {
            // Combine and sort all transactions
            const allTransactions = [
              ...expenses.map(expense => ({
                id: expense.id,
                type: 'expense' as const,
                description: expense.descricao,
                amount: expense.valor,
                category: expense.categoria,
                date: expense.data,
                created_at: expense.created_at
              })),
              ...(user.plan_type === 'ouro' ? incomes.map(income => ({
                id: income.id,
                type: 'income' as const,
                description: income.description,
                amount: income.amount,
                category: income.category,
                date: income.date,
                created_at: income.created_at,
                tags: income.tags
              })) : [])
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            if (allTransactions.length === 0) {
              return (
                <p className="text-gray-500 text-center py-4">
                  Nenhuma transação registrada ainda. Use os botões acima para cadastrar diretamente
                  {user.plan_type === 'ouro' ? ' ou converse com o Chat IA!' : ' ou use o Chat IA!'}
                </p>
              );
            }

            return (
              <div className="space-y-2">
                {allTransactions.slice(0, 8).map((transaction) => (
                  <div key={`${transaction.type}-${transaction.id}`} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {transaction.type === 'income' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-gray-500">
                          {transaction.category} • {new Date(transaction.date).toLocaleDateString()}
                          {transaction.type === 'income' && (
                            <Badge variant="outline" className="ml-2 text-xs bg-green-50 text-green-700">
                              Entrada
                            </Badge>
                          )}
                          {transaction.type === 'expense' && (
                            <Badge variant="outline" className="ml-2 text-xs bg-red-50 text-red-700">
                              Saída
                            </Badge>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'income' ? '+' : '-'} R$ {transaction.amount.toFixed(2)}
                      </p>
                      {transaction.type === 'income' && 'tags' in transaction && transaction.tags.length > 0 && (
                        <div className="flex gap-1 mt-1 justify-end">
                          {transaction.tags.slice(0, 2).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {allTransactions.length > 8 && (
                  <p className="text-sm text-gray-500 text-center mt-3">
                    E mais {allTransactions.length - 8} transações... Use as análises para ver todas!
                  </p>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>

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
                  <span>Chat IA para recebimentos</span>
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
