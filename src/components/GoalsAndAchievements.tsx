import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Target, Trophy, Star, Plus, Calendar, TrendingDown, 
  Flame, Crown, Award, CheckCircle, Clock, Zap 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { database, Goal, Achievement, UserStats, Expense } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';

const GoalsAndAchievements: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // 🥇 ACESSO EXCLUSIVO PLANO OURO
  if (!user || user.plan_type !== 'ouro') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-50">
        <Card className="max-w-md mx-auto text-center border-2 border-yellow-300">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <Crown className="h-16 w-16 text-yellow-600" />
            </div>
            <CardTitle className="text-2xl text-yellow-800">
              🏆 Metas & Conquistas
            </CardTitle>
            <p className="text-yellow-700">
              Funcionalidade exclusiva do <strong>Plano Ouro</strong>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-100 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-semibold text-yellow-800 mb-2">
                🎯 O que você terá acesso:
              </h4>
              <ul className="text-sm text-yellow-700 space-y-1 text-left">
                <li>• 🤖 Metas sugeridas por IA</li>
                <li>• 🏅 Sistema de conquistas e badges</li>
                <li>• 📊 Análise preditiva de metas</li>
                <li>• ⚡ Metas adaptativas inteligentes</li>
                <li>• 🎮 Desafios semanais</li>
                <li>• 🎯 Metas temporais avançadas</li>
                <li>• 👑 Gamificação premium</li>
              </ul>
            </div>
            
            <Button 
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
              onClick={() => window.location.href = '/'}
            >
              <Crown className="h-4 w-4 mr-2" />
              Fazer Upgrade para Ouro
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = '/'}
            >
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const [goals, setGoals] = useState<Goal[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // 🚀 FASE 1 - Melhorias Imediatas
  const [metasSugeridas, setMetasSugeridas] = useState<any[]>([]);
  const [desafioSemanal, setDesafioSemanal] = useState<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // 🚀 FASE 2 - Funcionalidades Avançadas  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [badges, setBadges] = useState<any[]>([]);
  
  // 🚀 FASE 3 - Inovações
  const [previsaoSucesso, setPrevisaoSucesso] = useState<any>(null);
  const [trilhaAtiva, setTrilhaAtiva] = useState<'economista' | 'investidor' | 'organizador'>('economista');

  const [newGoal, setNewGoal] = useState({
    tipo: 'economia' as Goal['tipo'],
    titulo: '',
    descricao: '',
    valor_meta: '',
    categoria: '',
    prazo: ''
  });

  const categories = [
    'mercado', 'transporte', 'contas', 'lazer', 'alimentação', 
    'saúde', 'educação', 'outros'
  ];

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Carregar dados básicos
      const userExpenses = await database.getExpensesByUser(user.id);
      setExpenses(userExpenses);

      // Simular dados para demonstração (já que nem todos os métodos estão implementados no Supabase)
      const mockGoals: Goal[] = [
        {
          id: '1',
          usuario_id: user.id,
          tipo: 'economia',
          titulo: 'Economizar R$ 500 este mês',
          descricao: 'Meta de economia para viagem',
          valor_meta: 500,
          valor_atual: 150,
          status: 'ativa',
          prazo: '2024-02-29',
          created_at: new Date().toISOString(),
          sugerida_ia: true,
          adaptativa: false,
          dificuldade: 'medio',
          pontos_bonus: 50
        }
      ];

      const mockAchievements = [
        {
          id: '1',
          usuario_id: user.id,
          tipo: 'primeiro_gasto',
          titulo: 'Primeiro Passo',
          descricao: 'Registrou seu primeiro gasto',
          icone: '🎯',
          pontos: 10,
          desbloqueado: userExpenses.length > 0,
          created_at: new Date().toISOString(),
          categoria: 'basico' as const,
          raridade: 'comum' as const
        },
        {
          id: '2',
          usuario_id: user.id,
          tipo: 'plano_ouro',
          titulo: 'Premium Member',
          descricao: 'Upgrade para o Plano Ouro',
          icone: '👑',
          pontos: 100,
          desbloqueado: user.plan_type === 'ouro',
          created_at: new Date().toISOString(),
          categoria: 'premium' as const,
          raridade: 'epico' as const
        }
      ];

      const mockStats = {
        id: '1',
        usuario_id: user.id,
        nivel: Math.floor((userExpenses.length * 10) / 100) + 1,
        pontos_totais: userExpenses.length * 10 + (user.plan_type === 'ouro' ? 100 : 0),
        streak_dias: 3,
        ultima_atividade: new Date().toISOString(),
        metas_concluidas: 0,
        conquistas_desbloqueadas: mockAchievements.filter(a => a.desbloqueado).length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        trilha_economista: 25,
        trilha_investidor: 15,
        trilha_organizador: 30,
        desafios_semanais_completados: 2,
        metas_sugeridas_aceitas: 1,
        analises_temporais_visualizadas: 5,
        orcamentos_criados: 3,
        conversas_ia: 12,
        badges: ['plano_ouro']
      };

      setGoals(mockGoals);
      setAchievements(mockAchievements);
      setUserStats(mockStats);

      // 🚀 FASE 1: Carregar funcionalidades avançadas
      loadMetasSugeridasIA();
      loadDesafioSemanal();
      loadBadges();
      calcularPrevisaoSucesso();

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar dados",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 🚀 FASE 1: Funções para Metas Sugeridas pela IA
  const loadMetasSugeridasIA = () => {
    // Simular análise inteligente baseada nos gastos do usuário
    const categorySpending = expenses.reduce((acc, expense) => {
      acc[expense.categoria] = (acc[expense.categoria] || 0) + expense.valor;
      return acc;
    }, {} as Record<string, number>);

    const suggestions = [];
    
    // Sugestão baseada na categoria dominante
    const dominantCategory = Object.entries(categorySpending).reduce((a, b) => 
      categorySpending[a[0]] > categorySpending[b[0]] ? a : b, ['outros', 0]
    );

    if (dominantCategory[1] > 100) {
      suggestions.push({
        id: 'meta_ia_1',
        titulo: `Reduzir gastos com ${dominantCategory[0]}`,
        descricao: `A IA detectou que você gasta muito com ${dominantCategory[0]}. Que tal reduzir 15%?`,
        valor_meta: dominantCategory[1] * 0.15,
        categoria: dominantCategory[0],
        tipo: 'reduzir_categoria',
        confianca: 85,
        justificativa: `Baseado no seu padrão, uma redução de 15% em ${dominantCategory[0]} geraria uma economia de R$ ${(dominantCategory[1] * 0.15).toFixed(2)}`
      });
    }

    // Sugestão de economia geral
    const totalGastos = Object.values(categorySpending).reduce((sum, val) => sum + val, 0);
    if (totalGastos > 200) {
      suggestions.push({
        id: 'meta_ia_2',
        titulo: 'Meta de Economia Inteligente',
        descricao: 'A IA calculou uma meta de economia realista para você',
        valor_meta: totalGastos * 0.1,
        tipo: 'economia',
        confianca: 80,
        justificativa: `Com base no seu histórico de R$ ${totalGastos.toFixed(2)}, economizar 10% é uma meta realista e impactante`
      });
    }

    setMetasSugeridas(suggestions);
  };

  // 🚀 FASE 1: Função para Desafio Semanal
  const loadDesafioSemanal = () => {
    const desafios = [
      {
        titulo: '📊 Semana do Analista',
        descricao: 'Visualize suas análises temporais e de categorias 3 vezes',
        progresso: 1,
        meta: 3,
        pontos: 50,
        tipo: 'analise'
      },
      {
        titulo: '💰 Economista da Semana',
        descricao: 'Registre todos os gastos sem exceção',
        progresso: 3,
        meta: 7,
        pontos: 75,
        tipo: 'economia'
      },
      {
        titulo: '🎯 Organizador Master',
        descricao: 'Configure orçamentos para 3 categorias diferentes',
        progresso: 1,
        meta: 3,
        pontos: 60,
        tipo: 'organizacao'
      }
    ];

    const desafioAleatorio = desafios[Math.floor(Math.random() * desafios.length)];
    setDesafioSemanal(desafioAleatorio);
  };

  // 🚀 FASE 2: Função para Badges
  const loadBadges = () => {
    const availableBadges = [
      {
        id: 'analista',
        nome: 'Analista Financeiro',
        descricao: 'Visualizou análises 10+ vezes',
        icone: '📊',
        desbloqueada: userStats?.analises_temporais_visualizadas >= 10,
        raridade: 'comum',
        categoria: 'temporal'
      },
      {
        id: 'organizador',
        nome: 'Organizador Master',
        descricao: 'Criou orçamentos completos',
        icone: '📋',
        desbloqueada: userStats?.orcamentos_criados >= 5,
        raridade: 'raro',
        categoria: 'organizador'
      },
      {
        id: 'conversa_ia',
        nome: 'Consultor IA',
        descricao: '50+ conversas com IA',
        icone: '🤖',
        desbloqueada: userStats?.conversas_ia >= 50,
        raridade: 'comum',
        categoria: 'social'
      },
      {
        id: 'premium',
        nome: 'Premium Member',
        descricao: 'Plano Ouro ativo',
        icone: '👑',
        desbloqueada: user?.plan_type === 'ouro',
        raridade: 'epico',
        categoria: 'premium'
      }
    ];

    setBadges(availableBadges);
  };

  // 🚀 FASE 3: Função para Previsão de Sucesso
  const calcularPrevisaoSucesso = () => {
    if (!userStats) return;

    const fatores = {
      consistencia: userStats.streak_dias * 10,
      experiencia: userStats.metas_concluidas * 20,
      engajamento: userStats.conversas_ia * 2,
      organizacao: userStats.orcamentos_criados * 15,
      plano: user?.plan_type === 'ouro' ? 25 : 0
    };

    const pontuacaoTotal = Object.values(fatores).reduce((sum, val) => sum + val, 0);
    const probabilidade = Math.min(Math.max(pontuacaoTotal, 0), 100);

    setPrevisaoSucesso({
      probabilidade,
      fatores,
      recomendacao: probabilidade > 70 ? 'Alta chance de sucesso!' : 
                   probabilidade > 40 ? 'Boas chances, continue assim!' : 
                   'Foque na consistência para melhorar'
    });
  };

  const checkAchievements = async (
    userId: string, 
    userExpenses: Expense[], 
    userGoals: Goal[], 
    userAchievements: Achievement[]
  ) => {
    // Check for "primeiro_gasto"
    if (userExpenses.length >= 1 && !userAchievements.find(a => a.tipo === 'primeiro_gasto' && a.desbloqueado)) {
      const achievement = await database.unlockAchievement(userId, 'primeiro_gasto');
      if (achievement) {
        toast({
          title: "🎉 Conquista Desbloqueada!",
          description: `${achievement.titulo} - ${achievement.descricao}`
        });
      }
    }

    // Check for "sequencia_7_dias"
    const streak = await database.checkAndUpdateStreak(userId);
    if (streak >= 7 && !userAchievements.find(a => a.tipo === 'sequencia_7_dias' && a.desbloqueado)) {
      const achievement = await database.unlockAchievement(userId, 'sequencia_7_dias');
      if (achievement) {
        toast({
          title: "🔥 Conquista Desbloqueada!",
          description: `${achievement.titulo} - ${achievement.descricao}`
        });
      }
    }

    // Check for "economista"
    const completedGoals = userGoals.filter(g => g.status === 'concluida');
    if (completedGoals.length >= 1 && !userAchievements.find(a => a.tipo === 'economista' && a.desbloqueado)) {
      const achievement = await database.unlockAchievement(userId, 'economista');
      if (achievement) {
        toast({
          title: "💰 Conquista Desbloqueada!",
          description: `${achievement.titulo} - ${achievement.descricao}`
        });
      }
    }

    // Check for "mestre_economia"
    if (completedGoals.length >= 5 && !userAchievements.find(a => a.tipo === 'mestre_economia' && a.desbloqueado)) {
      const achievement = await database.unlockAchievement(userId, 'mestre_economia');
      if (achievement) {
        toast({
          title: "👑 Conquista Desbloqueada!",
          description: `${achievement.titulo} - ${achievement.descricao}`
        });
      }
    }

    // Reload achievements after checking
    const updatedAchievements = await database.getUserAchievements(userId);
    setAchievements(updatedAchievements);
    
    const updatedStats = await database.getUserStats(userId);
    setUserStats(updatedStats);
  };

  const handleCreateGoal = async () => {
    if (!user || !newGoal.titulo || !newGoal.valor_meta || !newGoal.prazo) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      // Simular criação da meta (já que o banco não tem todos os métodos implementados)
      const novaGoal: Goal = {
        id: (goals.length + 1).toString(),
        usuario_id: user.id,
        tipo: newGoal.tipo,
        titulo: newGoal.titulo,
        descricao: newGoal.descricao,
        valor_meta: parseFloat(newGoal.valor_meta),
        categoria: newGoal.categoria || undefined,
        prazo: newGoal.prazo,
        valor_atual: 0,
        status: 'ativa',
        created_at: new Date().toISOString(),
        sugerida_ia: false,
        adaptativa: false,
        dificuldade: 'medio',
        pontos_bonus: 25
      };

      // Adicionar à lista local
      setGoals([...goals, novaGoal]);

      toast({
        title: "Sucesso! 🎯",
        description: "Meta criada com sucesso"
      });

      setNewGoal({
        tipo: 'economia',
        titulo: '',
        descricao: '',
        valor_meta: '',
        categoria: '',
        prazo: ''
      });
      setIsGoalDialogOpen(false);
    } catch (error) {
      console.error('Error creating goal:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar meta",
        variant: "destructive"
      });
    }
  };

  const updateGoalProgress = async (goal: Goal) => {
    if (!user) return;

    let valorAtual = 0;

    switch (goal.tipo) {
      case 'economia':
        // Calculate savings (budget - spent)
        const currentMonth = new Date().toISOString().substring(0, 7);
        const monthlyExpenses = expenses.filter(e => e.data.startsWith(currentMonth));
        const totalSpent = monthlyExpenses.reduce((sum, e) => sum + e.valor, 0);
        
        // Simple savings calculation (assuming income or previous month comparison)
        const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().substring(0, 7);
        const lastMonthExpenses = expenses.filter(e => e.data.startsWith(lastMonth));
        const lastMonthSpent = lastMonthExpenses.reduce((sum, e) => sum + e.valor, 0);
        
        valorAtual = Math.max(0, lastMonthSpent - totalSpent);
        break;

      case 'reduzir_categoria':
        if (goal.categoria) {
          const currentMonth = new Date().toISOString().substring(0, 7);
          const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().substring(0, 7);
          
          const currentCategorySpent = expenses
            .filter(e => e.data.startsWith(currentMonth) && e.categoria === goal.categoria)
            .reduce((sum, e) => sum + e.valor, 0);
          
          const lastCategorySpent = expenses
            .filter(e => e.data.startsWith(lastMonth) && e.categoria === goal.categoria)
            .reduce((sum, e) => sum + e.valor, 0);
          
          valorAtual = Math.max(0, lastCategorySpent - currentCategorySpent);
        }
        break;

             case 'limite_mensal':
         const currentMonth2 = new Date().toISOString().substring(0, 7);
         const monthlySpent = expenses
           .filter(e => e.data.startsWith(currentMonth2))
           .reduce((sum, e) => sum + e.valor, 0);
         
         valorAtual = Math.max(0, goal.valor_meta - monthlySpent);
         break;

       case 'frequencia':
         const currentMonth3 = new Date().toISOString().substring(0, 7);
         const monthlyCount = expenses
           .filter(e => e.data.startsWith(currentMonth3) && (!goal.categoria || e.categoria === goal.categoria))
           .length;
        
        valorAtual = Math.max(0, goal.valor_meta - monthlyCount);
        break;
    }

    const percentage = (valorAtual / goal.valor_meta) * 100;
    const newStatus = percentage >= 100 ? 'concluida' : 'ativa';

    if (newStatus !== goal.status) {
      await database.updateGoal(goal.id, { valor_atual: valorAtual, status: newStatus });
      
      if (newStatus === 'concluida') {
        await database.updateUserStats(user.id, { metas_concluidas: 1, pontos_totais: 50 });
        toast({
          title: "🎉 Meta Concluída!",
          description: `Parabéns! Você completou: ${goal.titulo}`,
        });
      }
    } else {
      await database.updateGoal(goal.id, { valor_atual: valorAtual });
    }
  };

  // Update all goals progress
  useEffect(() => {
    if (goals.length > 0 && expenses.length > 0 && user) {
      goals.forEach(goal => {
        if (goal.status === 'ativa') {
          updateGoalProgress(goal);
        }
      });
    }
  }, [expenses, goals, user]);

  const getGoalIcon = (tipo: Goal['tipo']) => {
    switch (tipo) {
      case 'economia': return '💰';
      case 'reduzir_categoria': return '📉';
      case 'limite_mensal': return '🎯';
      case 'frequencia': return '📊';
      default: return '🎯';
    }
  };

  const getGoalProgress = (goal: Goal) => {
    const percentage = (goal.valor_atual / goal.valor_meta) * 100;
    return Math.min(Math.max(percentage, 0), 100);
  };

  const getStatusBadge = (status: Goal['status']) => {
    switch (status) {
      case 'ativa':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Ativa</Badge>;
      case 'concluida':
        return <Badge variant="outline" className="text-green-600 border-green-600">Concluída</Badge>;
      case 'falhada':
        return <Badge variant="outline" className="text-red-600 border-red-600">Falhada</Badge>;
    }
  };

  const getLevelInfo = (pontos: number) => {
    const nivel = Math.floor(pontos / 100) + 1;
    const pontosProximoNivel = (nivel * 100) - pontos;
    const progressoNivel = ((pontos % 100) / 100) * 100;
    
    return { nivel, pontosProximoNivel, progressoNivel };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando metas e conquistas...</p>
        </div>
      </div>
    );
  }

  const levelInfo = userStats ? getLevelInfo(userStats.pontos_totais) : { nivel: 1, pontosProximoNivel: 100, progressoNivel: 0 };

    return (
    <div className="space-y-6">
      {/* Header Simples mas Premium */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown className="h-8 w-8 text-yellow-600" />
            🎯 Metas & Conquistas
          </h1>
          <p className="text-muted-foreground">
            Funcionalidade premium do Plano Ouro • Crie e acompanhe suas metas financeiras
          </p>
        </div>
        
        {userStats && (
          <div className="text-right">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span className="text-lg font-bold">Nível {userStats.nivel}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {userStats.pontos_totais} pontos | {userStats.metas_concluidas} metas concluídas
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {userStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pontos Totais</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {userStats.pontos_totais}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sequência</CardTitle>
              <Flame className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {userStats.streak_dias} dias
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Metas Concluídas</CardTitle>
              <Target className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {userStats.metas_concluidas}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conquistas</CardTitle>
              <Trophy className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {achievements.filter(a => a.desbloqueado).length}/{achievements.length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Metas Sugeridas pela IA - Compacto */}
      {metasSugeridas.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              🤖 IA sugere metas para você
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {metasSugeridas.slice(0, 2).map((meta) => (
                <div key={meta.id} className="bg-white p-3 rounded-lg border border-blue-200 flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-blue-800">{meta.titulo}</h4>
                    <p className="text-sm text-blue-600">Meta: R$ {meta.valor_meta.toFixed(2)}</p>
                  </div>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Aceitar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Abas Principais */}
      <Tabs defaultValue="goals" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="goals" className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Minhas Metas</span>
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center space-x-2">
            <Trophy className="h-4 w-4" />
            <span>Conquistas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Suas Metas</h2>
            <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus size={16} className="mr-2" />
                  Nova Meta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Meta</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="tipo">Tipo de Meta</Label>
                    <Select value={newGoal.tipo} onValueChange={(value: Goal['tipo']) => setNewGoal(prev => ({ ...prev, tipo: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="economia">💰 Economia</SelectItem>
                        <SelectItem value="reduzir_categoria">📉 Reduzir Categoria</SelectItem>
                        <SelectItem value="limite_mensal">🎯 Limite Mensal</SelectItem>
                        <SelectItem value="frequencia">📊 Controle de Frequência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="titulo">Título</Label>
                    <Input
                      id="titulo"
                      value={newGoal.titulo}
                      onChange={(e) => setNewGoal(prev => ({ ...prev, titulo: e.target.value }))}
                      placeholder="Ex: Economizar para viagem"
                    />
                  </div>

                  <div>
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      value={newGoal.descricao}
                      onChange={(e) => setNewGoal(prev => ({ ...prev, descricao: e.target.value }))}
                      placeholder="Descreva sua meta..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="valor_meta">
                      {newGoal.tipo === 'frequencia' ? 'Número de Ocorrências' : 'Valor da Meta (R$)'}
                    </Label>
                    <Input
                      id="valor_meta"
                      type="number"
                      step="0.01"
                      value={newGoal.valor_meta}
                      onChange={(e) => setNewGoal(prev => ({ ...prev, valor_meta: e.target.value }))}
                      placeholder={newGoal.tipo === 'frequencia' ? "Ex: 5" : "Ex: 1000.00"}
                    />
                  </div>

                  {(newGoal.tipo === 'reduzir_categoria' || newGoal.tipo === 'frequencia') && (
                    <div>
                      <Label htmlFor="categoria">Categoria</Label>
                      <Select value={newGoal.categoria} onValueChange={(value) => setNewGoal(prev => ({ ...prev, categoria: value }))}>
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
                  )}

                  <div>
                    <Label htmlFor="prazo">Prazo</Label>
                    <Input
                      id="prazo"
                      type="date"
                      value={newGoal.prazo}
                      onChange={(e) => setNewGoal(prev => ({ ...prev, prazo: e.target.value }))}
                    />
                  </div>

                  <Button onClick={handleCreateGoal} className="w-full">
                    Criar Meta
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goals.map(goal => (
              <Card key={goal.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span>{getGoalIcon(goal.tipo)}</span>
                      <span>{goal.titulo}</span>
                    </div>
                    {getStatusBadge(goal.status)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{goal.descricao}</p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso</span>
                      <span>{getGoalProgress(goal).toFixed(1)}%</span>
                    </div>
                    <Progress value={getGoalProgress(goal)} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {goal.tipo === 'frequencia' ? 
                          `${goal.valor_atual.toFixed(0)} de ${goal.valor_meta.toFixed(0)}` :
                          `R$ ${goal.valor_atual.toFixed(2)} de R$ ${goal.valor_meta.toFixed(2)}`
                        }
                      </span>
                      <span>Prazo: {new Date(goal.prazo).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>

                  {goal.categoria && (
                    <Badge variant="outline">{goal.categoria}</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {goals.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma meta definida</h3>
                <p className="text-muted-foreground mb-4">
                  Crie sua primeira meta financeira para começar a gamificar suas economias!
                </p>
                <Button onClick={() => setIsGoalDialogOpen(true)}>
                  <Plus size={16} className="mr-2" />
                  Criar Primeira Meta
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <h2 className="text-2xl font-bold">Conquistas</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {achievements.map(achievement => (
              <Card key={achievement.id} className={`${achievement.desbloqueado ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200' : 'opacity-60'}`}>
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-3">{achievement.icone}</div>
                  <h3 className="font-bold mb-2">{achievement.titulo}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{achievement.descricao}</p>
                  
                  <div className="flex items-center justify-center space-x-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="font-semibold text-yellow-600">{achievement.pontos} pontos</span>
                  </div>
                  
                  {achievement.desbloqueado ? (
                    <div className="flex items-center justify-center space-x-1 mt-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-xs text-green-600">Desbloqueado</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-1 mt-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-xs text-gray-500">Bloqueado</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
    );
};

export default GoalsAndAchievements;