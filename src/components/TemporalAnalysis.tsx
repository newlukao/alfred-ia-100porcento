import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Sun, Moon, Coffee, Utensils, Sunset, Star } from 'lucide-react';
import { Expense } from '@/lib/database';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface TemporalAnalysisProps {
  expenses: Expense[];
}

const TemporalAnalysis: React.FC<TemporalAnalysisProps> = ({ expenses }) => {
  
  // Análise por hora do dia (simulada - baseada em padrões típicos)
  const hourlyAnalysis = useMemo(() => {
    // Como não temos hora exata, vamos simular baseado em categorias e padrões típicos
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${hour}:00`,
      total: 0,
      count: 0,
      period: hour < 6 ? 'Madrugada' : hour < 12 ? 'Manhã' : hour < 18 ? 'Tarde' : 'Noite'
    }));

    // Simular distribuição baseada em categorias
    expenses.forEach(expense => {
      let probableHours: number[] = [];
      
      switch (expense.categoria) {
        case 'alimentação':
          // Picos no café da manhã, almoço e jantar
          probableHours = [7, 8, 12, 13, 19, 20];
          break;
        case 'transporte':
          // Picos nos horários de trabalho
          probableHours = [7, 8, 17, 18, 19];
          break;
        case 'mercado':
          // Mais comum aos fins de semana e após o trabalho
          probableHours = [10, 11, 18, 19, 20];
          break;
        case 'lazer':
          // Noites e fins de semana
          probableHours = [20, 21, 22, 23];
          break;
        case 'contas':
          // Horário comercial
          probableHours = [9, 10, 11, 14, 15, 16];
          break;
        default:
          // Distribuição geral durante o dia
          probableHours = [9, 10, 11, 14, 15, 16, 17, 18];
      }

      // Distribuir o valor entre as horas prováveis
      const valuePerHour = expense.valor / probableHours.length;
      probableHours.forEach(hour => {
        hourlyData[hour].total += valuePerHour;
        hourlyData[hour].count += 1 / probableHours.length;
      });
    });

    return hourlyData;
  }, [expenses]);

  // Análise por dia da semana
  const weekdayAnalysis = useMemo(() => {
    const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const weekdayData = weekdays.map((day, index) => ({
      day,
      shortDay: day.substring(0, 3),
      total: 0,
      count: 0,
      average: 0,
      isWeekend: index === 0 || index === 6
    }));

    expenses.forEach(expense => {
      const date = new Date(expense.data);
      const dayOfWeek = date.getDay();
      weekdayData[dayOfWeek].total += expense.valor;
      weekdayData[dayOfWeek].count++;
    });

    weekdayData.forEach(day => {
      day.average = day.count > 0 ? day.total / day.count : 0;
    });

    return weekdayData;
  }, [expenses]);

  // Análise por período do dia (simulada baseada em categorias)
  const periodAnalysis = useMemo(() => {
    const periods = [
      { name: 'Manhã', icon: Sun, color: '#f59e0b', total: 0, percentage: 0 },
      { name: 'Tarde', icon: Coffee, color: '#10b981', total: 0, percentage: 0 },
      { name: 'Noite', icon: Sunset, color: '#8b5cf6', total: 0, percentage: 0 },
      { name: 'Madrugada', icon: Moon, color: '#374151', total: 0, percentage: 0 }
    ];

    expenses.forEach(expense => {
      // Simular distribuição baseada em categorias
      switch (expense.categoria) {
        case 'alimentação':
          periods[0].total += expense.valor * 0.3; // Manhã
          periods[1].total += expense.valor * 0.4; // Tarde
          periods[2].total += expense.valor * 0.3; // Noite
          break;
        case 'transporte':
          periods[0].total += expense.valor * 0.4; // Manhã
          periods[1].total += expense.valor * 0.1; // Tarde
          periods[2].total += expense.valor * 0.5; // Noite
          break;
        case 'lazer':
          periods[1].total += expense.valor * 0.2; // Tarde
          periods[2].total += expense.valor * 0.8; // Noite
          break;
        default:
          periods[1].total += expense.valor * 0.6; // Tarde
          periods[2].total += expense.valor * 0.4; // Noite
      }
    });

    const total = periods.reduce((sum, p) => sum + p.total, 0);
    periods.forEach(period => {
      period.percentage = total > 0 ? (period.total / total) * 100 : 0;
    });

    return periods;
  }, [expenses]);

  // Análise sazonal (por mês)
  const monthlySeasonalAnalysis = useMemo(() => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const monthlyData = months.map((month, index) => ({
      month,
      shortMonth: month.substring(0, 3),
      total: 0,
      count: 0,
      average: 0,
      season: index < 3 || index === 11 ? 'Verão' : index < 6 ? 'Outono' : index < 9 ? 'Inverno' : 'Primavera'
    }));

    expenses.forEach(expense => {
      const date = new Date(expense.data);
      const month = date.getMonth();
      monthlyData[month].total += expense.valor;
      monthlyData[month].count++;
    });

    monthlyData.forEach(month => {
      month.average = month.count > 0 ? month.total / month.count : 0;
    });

    return monthlyData.filter(month => month.total > 0);
  }, [expenses]);

  // Insights temporais
  const temporalInsights = useMemo(() => {
    const insights = [];

    // Período de maior gasto
    const maxPeriod = periodAnalysis.reduce((max, period) => 
      period.total > max.total ? period : max, periodAnalysis[0]
    );

    if (maxPeriod && maxPeriod.total > 0) {
      insights.push({
        type: 'info',
        icon: maxPeriod.icon,
        title: `Período de Maior Gasto`,
        description: `${maxPeriod.name}: ${maxPeriod.percentage.toFixed(1)}% dos gastos`,
        value: `R$ ${maxPeriod.total.toFixed(2)}`
      });
    }

    // Dia da semana preferido
    const maxWeekday = weekdayAnalysis.reduce((max, day) => 
      day.total > max.total ? day : max, weekdayAnalysis[0]
    );

    if (maxWeekday && maxWeekday.total > 0) {
      insights.push({
        type: maxWeekday.isWeekend ? 'warning' : 'info',
        icon: Calendar,
        title: 'Dia de Maior Gasto',
        description: `${maxWeekday.day}: R$ ${maxWeekday.total.toFixed(2)}`,
        value: `${maxWeekday.count} gastos`
      });
    }

    // Padrão de fim de semana vs semana
    const weekendTotal = weekdayAnalysis
      .filter(day => day.isWeekend)
      .reduce((sum, day) => sum + day.total, 0);
    
    const weekdayTotal = weekdayAnalysis
      .filter(day => !day.isWeekend)
      .reduce((sum, day) => sum + day.total, 0);

    if (weekendTotal > 0 && weekdayTotal > 0) {
      const weekendPercentage = (weekendTotal / (weekendTotal + weekdayTotal)) * 100;
      insights.push({
        type: weekendPercentage > 40 ? 'warning' : 'success',
        icon: Calendar,
        title: 'Gastos de Fim de Semana',
        description: `${weekendPercentage.toFixed(1)}% dos gastos ocorrem nos fins de semana`,
        value: `R$ ${weekendTotal.toFixed(2)}`
      });
    }

    return insights;
  }, [periodAnalysis, weekdayAnalysis]);

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPeriodIcon = (periodName: string) => {
    switch (periodName) {
      case 'Manhã': return Sun;
      case 'Tarde': return Coffee;
      case 'Noite': return Sunset;
      case 'Madrugada': return Moon;
      default: return Clock;
    }
  };

  return (
    <div className="space-y-6">
      {/* Insights Temporais */}
      {temporalInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Insights Temporais</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {temporalInsights.map((insight, index) => {
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
      )}

      {/* Análise por Período do Dia */}
      <Card>
        <CardHeader>
          <CardTitle>Gastos por Período do Dia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {periodAnalysis.map((period) => {
              const Icon = period.icon;
              return (
                <div key={period.name} className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <Icon className="h-5 w-5" style={{ color: period.color }} />
                    <span className="font-medium">{period.name}</span>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: period.color }}>
                    {period.percentage?.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    R$ {period.total.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={periodAnalysis}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} ${percentage?.toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="total"
              >
                {periodAnalysis.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Total']} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Análise por Dia da Semana */}
      <Card>
        <CardHeader>
          <CardTitle>Gastos por Dia da Semana</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weekdayAnalysis}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="shortDay" />
              <YAxis />
              <Tooltip 
                formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Total']}
                labelFormatter={(label) => {
                  const day = weekdayAnalysis.find(d => d.shortDay === label);
                  return day ? day.day : label;
                }}
              />
              <Bar dataKey="total" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Análise Sazonal */}
      {monthlySeasonalAnalysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Análise Sazonal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlySeasonalAnalysis}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="shortMonth" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Total']}
                  labelFormatter={(label) => {
                    const month = monthlySeasonalAnalysis.find(m => m.shortMonth === label);
                    return month ? `${month.month} (${month.season})` : label;
                  }}
                />
                <Bar dataKey="total" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Resumo dos Padrões */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo dos Padrões Temporais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">🕐 Padrões Diários</h4>
              <div className="space-y-2 text-sm">
                {periodAnalysis
                  .sort((a, b) => b.total - a.total)
                  .slice(0, 2)
                  .map((period, index) => (
                    <div key={period.name} className="flex justify-between">
                      <span>{index + 1}º {period.name}</span>
                      <span className="font-semibold">R$ {period.total.toFixed(2)}</span>
                    </div>
                  ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">📅 Padrões Semanais</h4>
              <div className="space-y-2 text-sm">
                {weekdayAnalysis
                  .sort((a, b) => b.total - a.total)
                  .slice(0, 3)
                  .map((day, index) => (
                    <div key={day.day} className="flex justify-between">
                      <span>{index + 1}º {day.day}</span>
                      <span className="font-semibold">R$ {day.total.toFixed(2)}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TemporalAnalysis; 