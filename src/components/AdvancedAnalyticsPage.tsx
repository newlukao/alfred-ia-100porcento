import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { database, Expense, Income } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import AdvancedAnalytics from './AdvancedAnalytics';

const AdvancedAnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Load expenses
      const userExpenses = await database.getExpensesByUser(user.id);
      setExpenses(userExpenses.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      
      // Load incomes (for gold plan users)
      if (user.plan_type === 'ouro' && database.getIncomesByUser) {
        const userIncomes = await database.getIncomesByUser(user.id);
        setIncomes(userIncomes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar dados para análise",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in-50 duration-300">
        <div className="space-y-2">
          <div className="h-8 bg-muted rounded-md animate-pulse"></div>
          <div className="h-4 bg-muted/60 rounded-md animate-pulse max-w-md"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="h-64 bg-muted/30 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // Verificar se usuário tem acesso (plano ouro para análises avançadas)
  if (user?.plan_type !== 'ouro') {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-6xl">🥇</div>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Análises Avançadas</h2>
          <p className="text-muted-foreground mb-4">
            Esta funcionalidade está disponível apenas no Plano Ouro
          </p>
          <div className="text-sm text-muted-foreground">
            <p>• Análises de fluxo de caixa</p>
            <p>• Insights inteligentes</p>
            <p>• Previsões financeiras</p>
            <p>• Relatórios detalhados</p>
          </div>
        </div>
      </div>
    );
  }

  return <AdvancedAnalytics expenses={expenses} incomes={incomes} />;
};

export default AdvancedAnalyticsPage; 