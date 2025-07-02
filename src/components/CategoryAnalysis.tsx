import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Calendar, Target, AlertCircle, Crown } from 'lucide-react';
import { Expense, Income } from '@/lib/database';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Area, AreaChart, ComposedChart } from 'recharts';

interface CategoryAnalysisProps {
  expenses: Expense[];
  incomes?: Income[];
}

const CategoryAnalysis: React.FC<CategoryAnalysisProps> = ({ expenses, incomes = [] }) => {
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
    mercado: '#ef4444',
    transporte: '#3b82f6',
    contas: '#f59e0b',
    lazer: '#8b5cf6',
    alimentação: '#f97316',
    saúde: '#06b6d4',
    educação: '#84cc16',
    outros: '#6b7280',
    // Income categories
    salario: '#22c55e',
    freelance: '#10b981',
    investimento: '#14b8a6',
    vendas: '#16a34a',
    bonus: '#15803d',
    aluguel: '#166534',
    dividendos: '#14532d',
  };

  // Análise detalhada por categoria
  const categoryAnalysis = useMemo(() => {
    const expenseAnalysis = expenseCategories.map(category => {
      const categoryExpenses = expenses.filter(e => e.categoria === category);
      
      if (categoryExpenses.length === 0) {
        return null;
      }

      const total = categoryExpenses.reduce((sum, e) => sum + e.valor, 0);
      const count = categoryExpenses.length;
      const average = total / count;
      
      // Calcular tendência dos últimos 3 meses
      const now = new Date();
      const currentMonth = now.toISOString().substring(0, 7);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().substring(0, 7);
      
      const currentMonthTotal = categoryExpenses
        .filter(e => e.data.startsWith(currentMonth))
        .reduce((sum, e) => sum + e.valor, 0);
      
      const lastMonthTotal = categoryExpenses
        .filter(e => e.data.startsWith(lastMonth))
        .reduce((sum, e) => sum + e.valor, 0);

      const percentageChange = lastMonthTotal > 0 ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;
      
      // Dados mensais para gráfico
      const monthlyMap = new Map();
      categoryExpenses.forEach(expense => {
        const month = expense.data.substring(0, 7);
        monthlyMap.set(month, (monthlyMap.get(month) || 0) + expense.valor);
      });
      
      const monthlyData = Array.from(monthlyMap.entries())
        .map(([month, total]) => ({
          month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          total,
          monthKey: month
        }))
        .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
        .slice(-6);

      const values = categoryExpenses.map(e => e.valor);
      const maxExpense = Math.max(...values);
      const minExpense = Math.min(...values);
      
      // Frequência (gastos por mês)
      const monthsWithExpenses = new Set(categoryExpenses.map(e => e.data.substring(0, 7))).size;
      const frequency = count / Math.max(monthsWithExpenses, 1);

      return {
        categoria: category,
        tipo: 'saida' as const,
        total,
        count,
        average,
        monthlyData,
        lastMonthTotal,
        currentMonthTotal,
        percentageChange,
        maxValue: maxExpense,
        minValue: minExpense,
        frequency
      };
    }).filter(item => item !== null);

    const incomeAnalysis = incomeCategories.map(category => {
      const categoryIncomes = incomes.filter(i => i.category === category);
      
      if (categoryIncomes.length === 0) {
        return null;
      }

      const total = categoryIncomes.reduce((sum, i) => sum + i.amount, 0);
      const count = categoryIncomes.length;
      const average = total / count;
      
      // Calcular tendência dos últimos 3 meses
      const now = new Date();
      const currentMonth = now.toISOString().substring(0, 7);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().substring(0, 7);
      
      const currentMonthTotal = categoryIncomes
        .filter(i => i.date.startsWith(currentMonth))
        .reduce((sum, i) => sum + i.amount, 0);
      
      const lastMonthTotal = categoryIncomes
        .filter(i => i.date.startsWith(lastMonth))
        .reduce((sum, i) => sum + i.amount, 0);

      const percentageChange = lastMonthTotal > 0 ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;
      
      // Dados mensais para gráfico
      const monthlyMap = new Map();
      categoryIncomes.forEach(income => {
        const month = income.date.substring(0, 7);
        monthlyMap.set(month, (monthlyMap.get(month) || 0) + income.amount);
      });
      
      const monthlyData = Array.from(monthlyMap.entries())
        .map(([month, total]) => ({
          month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          total,
          monthKey: month
        }))
        .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
        .slice(-6);

      const values = categoryIncomes.map(i => i.amount);
      const maxIncome = Math.max(...values);
      const minIncome = Math.min(...values);
      
      // Frequência (recebimentos por mês)
      const monthsWithIncomes = new Set(categoryIncomes.map(i => i.date.substring(0, 7))).size;
      const frequency = count / Math.max(monthsWithIncomes, 1);

      return {
        categoria: category,
        tipo: 'entrada' as const,
        total,
        count,
        average,
        monthlyData,
        lastMonthTotal,
        currentMonthTotal,
        percentageChange,
        maxValue: maxIncome,
        minValue: minIncome,
        frequency
      };
    }).filter(item => item !== null);

    return [...expenseAnalysis, ...incomeAnalysis].sort((a, b) => b.total - a.total);
  }, [expenses, incomes]);

  // Top insights por categoria
  const categoryInsights = useMemo(() => {
    const insights = [];
    
    // Categoria com maior crescimento
    const maxGrowth = categoryAnalysis.reduce((max, item) => 
      item.percentageChange > max.percentageChange ? item : max, 
      { percentageChange: -Infinity, categoria: '' }
    );
    
    if (maxGrowth.percentageChange > 20) {
      insights.push({
        type: 'warning',
        icon: TrendingUp,
        title: 'Maior Crescimento',
        description: `${maxGrowth.categoria} aumentou ${maxGrowth.percentageChange.toFixed(1)}%`,
        category: maxGrowth.categoria
      });
    }
    
    // Categoria com maior redução
    const maxReduction = categoryAnalysis.reduce((min, item) => 
      item.percentageChange < min.percentageChange ? item : min, 
      { percentageChange: Infinity, categoria: '' }
    );
    
    if (maxReduction.percentageChange < -20) {
      insights.push({
        type: 'success',
        icon: TrendingDown,
        title: 'Maior Redução',
        description: `${maxReduction.categoria} diminuiu ${Math.abs(maxReduction.percentageChange).toFixed(1)}%`,
        category: maxReduction.categoria
      });
    }
    
    // Categoria dominante
    const dominant = categoryAnalysis[0];
    if (dominant && categoryAnalysis.length > 1) {
      const totalGeral = categoryAnalysis.reduce((sum, item) => sum + item.total, 0);
      const dominantPercentage = (dominant.total / totalGeral) * 100;
      
      if (dominantPercentage > 40) {
        insights.push({
          type: 'info',
          icon: Crown,
          title: 'Categoria Dominante',
          description: `${dominant.categoria} representa ${dominantPercentage.toFixed(1)}% dos gastos`,
          category: dominant.categoria
        });
      }
    }
    
    // Categoria mais frequente
    const mostFrequent = categoryAnalysis.reduce((max, item) => 
      item.frequency > max.frequency ? item : max, 
      { frequency: 0, categoria: '' }
    );
    
    if (mostFrequent.frequency > 5) {
      insights.push({
        type: 'info',
        icon: Calendar,
        title: 'Mais Frequente',
        description: `${mostFrequent.categoria}: ${mostFrequent.frequency.toFixed(1)} gastos/mês`,
        category: mostFrequent.categoria
      });
    }
    
    return insights;
  }, [categoryAnalysis]);

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      // Expense categories
      mercado: '🛒',
      transporte: '🚗',
      contas: '📄',
      lazer: '🎮',
      alimentação: '🍕',
      saúde: '🏥',
      educação: '📚',
      outros: '📦',
      // Income categories
      salario: '💰',
      freelance: '💻',
      investimento: '📈',
      vendas: '🛍️',
      bonus: '🎁',
      aluguel: '🏠',
      dividendos: '💎',
    };
    return icons[category as keyof typeof icons] || '📦';
  };

  const getTypeLabel = (tipo: string) => {
    return tipo === 'entrada' ? 'Entrada' : 'Saída';
  };

  const getTypeColor = (tipo: string) => {
    return tipo === 'entrada' ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Insights por Categoria */}
      {categoryInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Insights por Categoria</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryInsights.map((insight, index) => {
                const Icon = insight.icon;
                return (
                  <div key={index} className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}>
                    <div className="flex items-start space-x-3">
                      <Icon className="h-5 w-5 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium flex items-center space-x-2">
                          <span>{insight.title}</span>
                          <span>{getCategoryIcon(insight.category)}</span>
                        </h4>
                        <p className="text-sm opacity-80 mt-1">{insight.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Análise Detalhada por Categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categoryAnalysis.map((category) => (
          <Card key={`${category.tipo}-${category.categoria}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span>{getCategoryIcon(category.categoria)}</span>
                  <span className="capitalize">{category.categoria}</span>
                  <Badge variant="outline" className={`text-xs ${getTypeColor(category.tipo)}`}>
                    {getTypeLabel(category.tipo)}
                  </Badge>
                </div>
                <Badge 
                  variant="outline"
                  style={{ 
                    borderColor: categoryColors[category.categoria as keyof typeof categoryColors],
                    color: categoryColors[category.categoria as keyof typeof categoryColors]
                  }}
                >
                  R$ {category.total.toFixed(2)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Estatísticas Básicas */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total de {category.tipo === 'entrada' ? 'recebimentos' : 'gastos'}</p>
                  <p className="font-semibold">{category.count}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{category.tipo === 'entrada' ? 'Recebimento' : 'Gasto'} médio</p>
                  <p className="font-semibold">R$ {category.average.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Maior {category.tipo === 'entrada' ? 'recebimento' : 'gasto'}</p>
                  <p className="font-semibold">R$ {category.maxValue.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Frequência</p>
                  <p className="font-semibold">{category.frequency.toFixed(1)}/mês</p>
                </div>
              </div>

              {/* Comparativo Mensal */}
              {category.lastMonthTotal > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Variação mensal</span>
                    <div className="flex items-center space-x-1">
                      {category.percentageChange > 0 ? (
                        <TrendingUp className={`h-3 w-3 ${category.tipo === 'entrada' ? 'text-green-500' : 'text-red-500'}`} />
                      ) : (
                        <TrendingDown className={`h-3 w-3 ${category.tipo === 'entrada' ? 'text-red-500' : 'text-green-500'}`} />
                      )}
                      <span className={`font-semibold ${
                        (category.tipo === 'entrada' && category.percentageChange > 0) || 
                        (category.tipo === 'saida' && category.percentageChange < 0) 
                          ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {Math.abs(category.percentageChange).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Mês atual: R$ {category.currentMonthTotal.toFixed(2)} | 
                    Mês anterior: R$ {category.lastMonthTotal.toFixed(2)}
                  </div>
                </div>
              )}

              {/* Gráfico de Tendência */}
              {category.monthlyData.length > 1 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Tendência (últimos 6 meses)</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={category.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" fontSize={10} />
                      <YAxis fontSize={10} />
                      <Tooltip formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Total']} />
                      <Area 
                        type="monotone" 
                        dataKey="total" 
                        stroke={categoryColors[category.categoria as keyof typeof categoryColors]} 
                        fill={categoryColors[category.categoria as keyof typeof categoryColors]} 
                        fillOpacity={0.3} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comparativo Geral */}
      {categoryAnalysis.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Comparativo entre Categorias</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={categoryAnalysis}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="categoria" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'total') return [`R$ ${Number(value).toFixed(2)}`, 'Total'];
                    if (name === 'average') return [`R$ ${Number(value).toFixed(2)}`, 'Média'];
                    return [value, name];
                  }} 
                />
                <Bar dataKey="total" fill="#3b82f6" name="total" />
                <Bar dataKey="average" fill="#10b981" name="average" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CategoryAnalysis;