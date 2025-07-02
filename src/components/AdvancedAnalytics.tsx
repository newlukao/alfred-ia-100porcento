import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Calendar, Clock, Target, AlertTriangle, CheckCircle, BarChart3, Tags } from 'lucide-react';
import { Expense } from '@/lib/database';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';
import CategoryAnalysis from './CategoryAnalysis';
import TemporalAnalysis from './TemporalAnalysis';

interface AdvancedAnalyticsProps {
  expenses: Expense[];
}

const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({ expenses }) => {
  
  // Análise comparativa mensal
  const monthlyComparison = useMemo(() => {
    const now = new Date();
    const currentMonth = now.toISOString().substring(0, 7);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().substring(0, 7);
    
    const currentMonthTotal = expenses
      .filter(e => e.data.startsWith(currentMonth))
      .reduce((sum, e) => sum + e.valor, 0);
    
    const lastMonthTotal = expenses
      .filter(e => e.data.startsWith(lastMonth))
      .reduce((sum, e) => sum + e.valor, 0);
    
    const difference = currentMonthTotal - lastMonthTotal;
    const percentageChange = lastMonthTotal > 0 ? (difference / lastMonthTotal) * 100 : 0;
    
    return {
      currentMonth: currentMonthTotal,
      lastMonth: lastMonthTotal,
      difference,
      percentageChange,
      isIncrease: difference > 0
    };
  }, [expenses]);

  // Análise por dia da semana
  const weekdayAnalysis = useMemo(() => {
    const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const weekdayTotals = Array(7).fill(0);
    const weekdayCounts = Array(7).fill(0);
    
    expenses.forEach(expense => {
      const date = new Date(expense.data);
      const dayOfWeek = date.getDay();
      weekdayTotals[dayOfWeek] += expense.valor;
      weekdayCounts[dayOfWeek]++;
    });
    
    const maxSpendingDay = weekdayTotals.indexOf(Math.max(...weekdayTotals));
    const minSpendingDay = weekdayTotals.indexOf(Math.min(...weekdayTotals.filter(t => t > 0)));
    
    return {
      data: weekdays.map((day, index) => ({
        day,
        total: weekdayTotals[index],
        average: weekdayCounts[index] > 0 ? weekdayTotals[index] / weekdayCounts[index] : 0,
        count: weekdayCounts[index]
      })),
      maxSpendingDay: weekdays[maxSpendingDay],
      minSpendingDay: weekdays[minSpendingDay],
      maxAmount: weekdayTotals[maxSpendingDay]
    };
  }, [expenses]);

  // Previsão de gastos do mês
  const monthlyForecast = useMemo(() => {
    const now = new Date();
    const currentMonth = now.toISOString().substring(0, 7);
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    const currentMonthExpenses = expenses.filter(e => e.data.startsWith(currentMonth));
    const totalSoFar = currentMonthExpenses.reduce((sum, e) => sum + e.valor, 0);
    
    const dailyAverage = totalSoFar / dayOfMonth;
    const projectedTotal = dailyAverage * daysInMonth;
    const remainingDays = daysInMonth - dayOfMonth;
    const projectedRemaining = dailyAverage * remainingDays;
    
    return {
      totalSoFar,
      dailyAverage,
      projectedTotal,
      projectedRemaining,
      remainingDays,
      progressPercentage: (dayOfMonth / daysInMonth) * 100
    };
  }, [expenses]);

  // Insights inteligentes
  const insights = useMemo(() => {
    const insights = [];
    
    // Insight sobre mudança mensal
    if (Math.abs(monthlyComparison.percentageChange) > 10) {
      insights.push({
        type: monthlyComparison.isIncrease ? 'warning' : 'success',
        icon: monthlyComparison.isIncrease ? TrendingUp : TrendingDown,
        title: monthlyComparison.isIncrease ? 'Gastos Aumentaram' : 'Gastos Diminuíram',
        description: `${Math.abs(monthlyComparison.percentageChange).toFixed(1)}% ${monthlyComparison.isIncrease ? 'mais' : 'menos'} que o mês passado`,
        value: `R$ ${Math.abs(monthlyComparison.difference).toFixed(2)}`
      });
    }
    
    // Insight sobre dia da semana
    if (weekdayAnalysis.maxAmount > 0) {
      insights.push({
        type: 'info',
        icon: Calendar,
        title: 'Dia de Maior Gasto',
        description: `Você gasta mais às ${weekdayAnalysis.maxSpendingDay.toLowerCase()}s`,
        value: `R$ ${weekdayAnalysis.maxAmount.toFixed(2)}`
      });
    }
    
    // Insight sobre previsão
    if (monthlyForecast.projectedTotal > monthlyForecast.totalSoFar * 1.5) {
      insights.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'Previsão de Gastos Alta',
        description: `No ritmo atual, você pode gastar R$ ${monthlyForecast.projectedTotal.toFixed(2)} este mês`,
        value: `+R$ ${monthlyForecast.projectedRemaining.toFixed(2)}`
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
        description: `Você registrou gastos em ${last7Days.length} dos últimos 7 dias`,
        value: 'Parabéns!'
      });
    }
    
    return insights;
  }, [expenses, monthlyComparison, weekdayAnalysis, monthlyForecast]);

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
                <span className="text-sm text-muted-foreground">Mês Atual</span>
                <span className="font-semibold">R$ {monthlyComparison.currentMonth.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Mês Anterior</span>
                <span className="font-semibold">R$ {monthlyComparison.lastMonth.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Diferença</span>
                  <div className="flex items-center space-x-2">
                    {monthlyComparison.isIncrease ? (
                      <TrendingUp className="h-4 w-4 text-red-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-green-500" />
                    )}
                    <span className={`font-semibold ${monthlyComparison.isIncrease ? 'text-red-500' : 'text-green-500'}`}>
                      {Math.abs(monthlyComparison.percentageChange).toFixed(1)}%
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
                <span className="text-sm text-muted-foreground">Gasto até agora</span>
                <span className="font-semibold">R$ {monthlyForecast.totalSoFar.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Média diária</span>
                <span className="font-semibold">R$ {monthlyForecast.dailyAverage.toFixed(2)}</span>
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
                  <span className="text-sm font-medium">Projeção total</span>
                  <span className="font-semibold text-orange-600">
                    R$ {monthlyForecast.projectedTotal.toFixed(2)}
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
            <CardTitle>Gastos por Dia da Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weekdayAnalysis.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Total']} />
                <Bar dataKey="total" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      </TabsContent>

      <TabsContent value="categories" className="space-y-6">
        <CategoryAnalysis expenses={expenses} />
      </TabsContent>

      <TabsContent value="temporal" className="space-y-6">
        <TemporalAnalysis expenses={expenses} />
      </TabsContent>
    </Tabs>
  );
};

export default AdvancedAnalytics;