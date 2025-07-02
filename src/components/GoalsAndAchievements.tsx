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
  
  const [goals, setGoals] = useState<Goal[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
      const [userGoals, userAchievements, stats, userExpenses] = await Promise.all([
        database.getGoalsByUser(user.id),
        database.getUserAchievements(user.id),
        database.getUserStats(user.id),
        database.getExpensesByUser(user.id)
      ]);

      setGoals(userGoals);
      setAchievements(userAchievements);
      setUserStats(stats);
      setExpenses(userExpenses);

      // Check for new achievements
      await checkAchievements(user.id, userExpenses, userGoals, userAchievements);
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
      await database.createGoal({
        usuario_id: user.id,
        tipo: newGoal.tipo,
        titulo: newGoal.titulo,
        descricao: newGoal.descricao,
        valor_meta: parseFloat(newGoal.valor_meta),
        categoria: newGoal.categoria || undefined,
        prazo: newGoal.prazo
      });

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
      loadData();
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
      {/* Header with User Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🎯 Metas & Conquistas</h1>
          <p className="text-muted-foreground">Alcance seus objetivos financeiros e desbloqueie conquistas</p>
        </div>
        
        {userStats && (
          <div className="text-right">
            <div className="flex items-center space-x-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              <span className="text-lg font-bold">Nível {levelInfo.nivel}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {userStats.pontos_totais} pontos | {levelInfo.pontosProximoNivel} para próximo nível
            </div>
            <Progress value={levelInfo.progressoNivel} className="w-32 h-2 mt-1" />
          </div>
        )}
      </div>

      {/* User Stats Cards */}
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

      {/* Tabs for Goals and Achievements */}
      <Tabs defaultValue="goals" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="goals" className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Metas Financeiras</span>
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
          <h2 className="text-2xl font-bold">Conquistas Desbloqueadas</h2>
          
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
                      <span className="text-xs text-green-600">
                        Desbloqueado em {new Date(achievement.data_desbloqueio!).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-1 mt-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-xs text-gray-500">Não desbloqueado</span>
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