import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Calendar, Clock, Target, AlertTriangle, CheckCircle, BarChart3, Tags, DollarSign, PiggyBank } from 'lucide-react';
import { Expense, Income } from '@/lib/database';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart, ComposedChart } from 'recharts';
import CategoryAnalysis from './CategoryAnalysis';
import TemporalAnalysis from './TemporalAnalysis';
import { useAuth } from '@/contexts/AuthContext';

interface AdvancedAnalyticsProps {
  expenses: Expense[];
  incomes?: Income[];
}

const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({ expenses, incomes = [] }) => {
  const { user } = useAuth();
  
  // Análise comparativa mensal de fluxo de caixa
  const monthlyComparison = useMemo(() => {
    const now = new Date();
    const currentMonth = now.toISOString().substring(0, 7);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().substring(0, 7);
    
    const currentMonthExpenses = expenses
      .filter(e => e.data.startsWith(currentMonth))
      .reduce((sum, e) => sum + e.valor, 0);
    
    const lastMonthExpenses = expenses
      .filter(e => e.data.startsWith(lastMonth))
      .reduce((sum, e) => sum + e.valor, 0);

    const currentMonthIncomes = incomes
      .filter(i => i.date.startsWith(currentMonth))
      .reduce((sum, i) => sum + i.amount, 0);
    
    const lastMonthIncomes = incomes
      .filter(i => i.date.startsWith(lastMonth))
      .reduce((sum, i) => sum + i.amount, 0);
    
    const currentBalance = currentMonthIncomes - currentMonthExpenses;
    const lastBalance = lastMonthIncomes - lastMonthExpenses;
    const balanceDifference = currentBalance - lastBalance;
    const balancePercentageChange = lastBalance !== 0 ? (balanceDifference / Math.abs(lastBalance)) * 100 : 0;
    
    return {
      currentMonth: {
        expenses: currentMonthExpenses,
        incomes: currentMonthIncomes,
        balance: currentBalance
      },
      lastMonth: {
        expenses: lastMonthExpenses,
        incomes: lastMonthIncomes,
        balance: lastBalance
      },
      difference: {
        expenses: currentMonthExpenses - lastMonthExpenses,
        incomes: currentMonthIncomes - lastMonthIncomes,
        balance: balanceDifference
      },
      percentageChange: {
        balance: balancePercentageChange
      },
      isBalanceImproving: balanceDifference > 0
    };
  }, [expenses, incomes]);

  // Análise de fluxo de caixa por dia da semana
  const weekdayAnalysis = useMemo(() => {
    const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const weekdayData = Array(7).fill(null).map(() => ({ expenses: 0, incomes: 0, balance: 0, count: 0 }));
    
    expenses.forEach(expense => {
      const date = new Date(expense.data);
      const dayOfWeek = date.getDay();
      weekdayData[dayOfWeek].expenses += expense.valor;
      weekdayData[dayOfWeek].count++;
    });

    incomes.forEach(income => {
      const date = new Date(income.date);
      const dayOfWeek = date.getDay();
      weekdayData[dayOfWeek].incomes += income.amount;
    });
    
    weekdayData.forEach((day, index) => {
      day.balance = day.incomes - day.expenses;
    });

    const maxBalanceDay = weekdayData.indexOf(weekdayData.reduce((max, day) => day.balance > max.balance ? day : max));
    const minBalanceDay = weekdayData.indexOf(weekdayData.reduce((min, day) => day.balance < min.balance ? day : min));
    
    return {
      data: weekdays.map((day, index) => ({
        day,
        expenses: weekdayData[index].expenses,
        incomes: weekdayData[index].incomes,
        balance: weekdayData[index].balance,
        count: weekdayData[index].count
      })),
      bestDay: weekdays[maxBalanceDay],
      worstDay: weekdays[minBalanceDay],
      bestBalance: weekdayData[maxBalanceDay].balance
    };
  }, [expenses, incomes]);

  // Previsão de fluxo de caixa do mês
  const monthlyForecast = useMemo(() => {
    const now = new Date();
    const currentMonth = now.toISOString().substring(0, 7);
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    const currentMonthExpenses = expenses.filter(e => e.data.startsWith(currentMonth));
    const currentMonthIncomes = incomes.filter(i => i.date.startsWith(currentMonth));
    
    const totalExpensesSoFar = currentMonthExpenses.reduce((sum, e) => sum + e.valor, 0);
    const totalIncomesSoFar = currentMonthIncomes.reduce((sum, i) => sum + i.amount, 0);
    const balanceSoFar = totalIncomesSoFar - totalExpensesSoFar;
    
    const dailyExpenseAverage = totalExpensesSoFar / dayOfMonth;
    const dailyIncomeAverage = totalIncomesSoFar / dayOfMonth;
    
    const projectedExpenses = dailyExpenseAverage * daysInMonth;
    const projectedIncomes = dailyIncomeAverage * daysInMonth;
    const projectedBalance = projectedIncomes - projectedExpenses;
    
    const remainingDays = daysInMonth - dayOfMonth;
    const projectedRemainingExpenses = dailyExpenseAverage * remainingDays;
    const projectedRemainingIncomes = dailyIncomeAverage * remainingDays;
    
    return {
      totalExpensesSoFar,
      totalIncomesSoFar,
      balanceSoFar,
      dailyExpenseAverage,
      dailyIncomeAverage,
      projectedExpenses,
      projectedIncomes,
      projectedBalance,
      projectedRemainingExpenses,
      projectedRemainingIncomes,
      remainingDays,
      progressPercentage: (dayOfMonth / daysInMonth) * 100
    };
  }, [expenses, incomes]);

  // Insights inteligentes
  const insights = useMemo(() => {
    const insights = [];
    
    // Insight sobre mudança mensal
    if (Math.abs(monthlyComparison.percentageChange.balance) > 10) {
      insights.push({
        type: monthlyComparison.isBalanceImproving ? 'warning' : 'success',
        icon: monthlyComparison.isBalanceImproving ? TrendingUp : TrendingDown,
        title: monthlyComparison.isBalanceImproving ? 'Saldo Melhorou' : 'Saldo Piorou',
        description: `${Math.abs(monthlyComparison.percentageChange.balance).toFixed(1)}% ${monthlyComparison.isBalanceImproving ? 'melhorou' : 'piorou'} que o mês passado`,
        value: `R$ ${Math.abs(monthlyComparison.difference.balance).toFixed(2)}`
      });
    }
    
    // Insight sobre dia da semana
    if (weekdayAnalysis.bestBalance > 0) {
      insights.push({
        type: 'info',
        icon: Calendar,
        title: 'Dia de Melhor Saldo',
        description: `Você teve o melhor saldo às ${weekdayAnalysis.bestDay.toLowerCase()}s`,
        value: `R$ ${weekdayAnalysis.bestBalance.toFixed(2)}`
      });
    }
    
         // Insight sobre previsão
     if (monthlyForecast.projectedBalance < 0) {
       insights.push({
         type: 'warning',
         icon: AlertTriangle,
         title: 'Previsão de Déficit',
         description: `No ritmo atual, você pode ter déficit de R$ ${Math.abs(monthlyForecast.projectedBalance).toFixed(2)} este mês`,
         value: `Atenção!`
       });
     }
    
    // Insight sobre consistência
    const last7Days = expenses.filter(e => {
      const expenseDate = new Date(e.data);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return expenseDate >= sevenDaysAgo;
    });
    
    if (last7Days.length >= 5) {
      insights.push({
        type: 'success',
        icon: CheckCircle,
        title: 'Registro Consistente',
        description: `Você registrou gastos e receitas em ${last7Days.length} dos últimos 7 dias`,
        value: 'Parabéns!'
      });
    }
    
    return insights;
  }, [expenses, incomes, monthlyComparison, weekdayAnalysis, monthlyForecast]);

  // Dados para gráfico de tendência mensal
  const monthlyTrend = useMemo(() => {
    const monthlyData = new Map();
    
    expenses.forEach(expense => {
      const month = expense.data.substring(0, 7);
      monthlyData.set(month, (monthlyData.get(month) || 0) + expense.valor);
    });
    
    return Array.from(monthlyData.entries())
      .map(([month, total]) => ({
        month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        total,
        monthKey: month
      }))
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .slice(-6); // Últimos 6 meses
  }, [expenses]);

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview" className="flex items-center space-x-2">
          <BarChart3 className="h-4 w-4" />
          <span>Visão Geral</span>
        </TabsTrigger>
        <TabsTrigger value="categories" className="flex items-center space-x-2">
          <Tags className="h-4 w-4" />
          <span>Por Categorias</span>
        </TabsTrigger>
        <TabsTrigger value="temporal" className="flex items-center space-x-2">
          <Clock className="h-4 w-4" />
          <span>Padrões Temporais</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        {/* Insights Inteligentes */}
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Insights Inteligentes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight, index) => {
              const Icon = insight.icon;
              return (
                <div key={index} className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}>
                  <div className="flex items-start space-x-3">
                    <Icon className="h-5 w-5 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium">{insight.title}</h4>
                      <p className="text-sm opacity-80 mt-1">{insight.description}</p>
                      <p className="font-semibold mt-2">{insight.value}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Comparativo Mensal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Comparativo Mensal</CardTitle>
          </CardHeader>
          <CardContent>
                          <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Saldo Atual</span>
                  <span className={`font-semibold ${monthlyComparison.currentMonth.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {monthlyComparison.currentMonth.balance.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Saldo mês anterior</span>
                  <span className={`font-semibold ${monthlyComparison.lastMonth.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {monthlyComparison.lastMonth.balance.toFixed(2)}
                  </span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Diferença no Saldo</span>
                    <div className="flex items-center space-x-2">
                      {monthlyComparison.isBalanceImproving ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`font-semibold ${monthlyComparison.isBalanceImproving ? 'text-green-500' : 'text-red-500'}`}>
                        R$ {Math.abs(monthlyComparison.difference.balance).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Previsão do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Saldo até agora</span>
                <span className={`font-semibold ${monthlyForecast.balanceSoFar >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R$ {monthlyForecast.balanceSoFar.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Receitas até agora</span>
                <span className="font-semibold text-green-600">R$ {monthlyForecast.totalIncomesSoFar.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Gastos até agora</span>
                <span className="font-semibold text-red-600">R$ {monthlyForecast.totalExpensesSoFar.toFixed(2)}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso do mês</span>
                  <span>{monthlyForecast.progressPercentage.toFixed(1)}%</span>
                </div>
                <Progress value={monthlyForecast.progressPercentage} className="h-2" />
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Projeção de Saldo</span>
                  <span className={`font-semibold ${monthlyForecast.projectedBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {monthlyForecast.projectedBalance.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de Análise */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tendência Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Total']} />
                <Area type="monotone" dataKey="total" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fluxo de Caixa por Dia da Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={weekdayAnalysis.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(value, name) => [
                  `R$ ${Number(value).toFixed(2)}`, 
                  name === 'expenses' ? 'Gastos' : name === 'incomes' ? 'Receitas' : 'Saldo'
                ]} />
                <Bar dataKey="expenses" fill="#ef4444" name="Gastos" />
                <Bar dataKey="incomes" fill="#22c55e" name="Receitas" />
                <Line dataKey="balance" stroke="#000000" strokeWidth={2} name="Saldo" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      </TabsContent>

      <TabsContent value="categories" className="space-y-6">
        <CategoryAnalysis expenses={expenses} incomes={incomes} />
      </TabsContent>

      <TabsContent value="temporal" className="space-y-6">
        <TemporalAnalysis expenses={expenses} incomes={incomes} />
      </TabsContent>
    </Tabs>
  );
};

export default AdvancedAnalytics;