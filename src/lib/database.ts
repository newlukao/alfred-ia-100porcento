export interface User {
  id: string;
  nome: string;
  email: string;
  is_admin: boolean;
  data_criacao: string;
}

export interface Expense {
  id: string;
  usuario_id: string;
  valor: number;
  categoria: string;
  descricao: string;
  data: string;
  created_at: string;
}

export interface Configuration {
  id: string;
  instrucoes_personalizadas: string;
  modelo_usado: string;
  openai_api_key: string;
  criterios_sucesso: string;
  situacoes_interrupcao: string;
  contexto_geral: string;
  instrucoes_individuais: string;
  mensagem_inicial: string;
  updated_at: string;
}

export interface UserPersonality {
  id: string;
  usuario_id: string;
  personality_profile: string;
  conversation_count: number;
  last_updated: string;
}

export interface ConversationHistory {
  id: string;
  usuario_id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Budget {
  id: string;
  usuario_id: string;
  categoria: string;
  valor_orcamento: number;
  mes_ano: string; // formato "2025-01"
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  usuario_id: string;
  tipo: 'economia' | 'reduzir_categoria' | 'limite_mensal' | 'frequencia';
  titulo: string;
  descricao: string;
  valor_meta: number;
  categoria?: string;
  prazo: string; // "2025-03-31"
  valor_atual: number;
  status: 'ativa' | 'concluida' | 'falhada';
  created_at: string;
  completed_at?: string;
}

export interface Achievement {
  id: string;
  usuario_id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  icone: string;
  pontos: number;
  desbloqueado: boolean;
  data_desbloqueio?: string;
  created_at: string;
}

export interface UserStats {
  id: string;
  usuario_id: string;
  nivel: number;
  pontos_totais: number;
  streak_dias: number;
  ultima_atividade: string;
  metas_concluidas: number;
  conquistas_desbloqueadas: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationSettings {
  id: string;
  usuario_id: string;
  budget_alerts: boolean;
  goal_progress: boolean;
  daily_reminders: boolean;
  achievement_unlocks: boolean;
  expense_limits: boolean;
  weekly_summaries: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationHistory {
  id: string;
  usuario_id: string;
  tipo: 'budget_alert' | 'goal_progress' | 'daily_reminder' | 'achievement' | 'expense_limit' | 'weekly_summary' | 'admin_message';
  titulo: string;
  mensagem: string;
  icone: string;
  lida: boolean;
  data_criacao: string;
  data_leitura?: string;
}

class MockDatabase {
  private static instance: MockDatabase;
  
  private users: User[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      nome: 'Demo User',
      email: 'demo@exemplo.com',
      is_admin: false,
      data_criacao: new Date().toISOString()
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      nome: 'Admin User',
      email: 'admin@exemplo.com',
      is_admin: true,
      data_criacao: new Date().toISOString()
    }
  ];

  private expenses: Expense[] = [
    {
      id: '1',
      usuario_id: '550e8400-e29b-41d4-a716-446655440001',
      valor: 45.50,
      categoria: 'mercado',
      descricao: 'Compras do supermercado',
      data: '2024-01-15',
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      usuario_id: '550e8400-e29b-41d4-a716-446655440001',
      valor: 25.00,
      categoria: 'transporte',
      descricao: 'Uber para o trabalho',
      data: '2024-01-15',
      created_at: new Date().toISOString()
    }
  ];

  private configuration: Configuration;

  private userPersonalities: UserPersonality[] = [];
  private conversationHistories: ConversationHistory[] = [];
  private budgets: Budget[] = [];
  private goals: Goal[] = [];
  private achievements: Achievement[] = [];
  private userStats: UserStats[] = [];
  private notificationSettings: NotificationSettings[] = [];
  private notificationHistory: NotificationHistory[] = [];

  private constructor() {
    console.log('⚠️ MockDatabase - Backup instance (not used)');
  }

  public static getInstance(): MockDatabase {
    if (!MockDatabase.instance) {
      MockDatabase.instance = new MockDatabase();
    }
    return MockDatabase.instance;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    console.log('⚠️ MockDatabase method called - should use Supabase');
    return null;
  }

  async getAllUsers(): Promise<User[]> {
    console.log('⚠️ MockDatabase method called - should use Supabase');
    return [];
  }

  async getAllExpenses(): Promise<Expense[]> {
    return [...this.expenses];
  }

  async getExpensesByUser(userId: string): Promise<Expense[]> {
    return this.expenses.filter(expense => expense.usuario_id === userId);
  }

  async addExpense(expense: Omit<Expense, 'id' | 'created_at'>): Promise<Expense> {
    const newExpense: Expense = {
      ...expense,
      id: (this.expenses.length + 1).toString(),
      created_at: new Date().toISOString()
    };
    this.expenses.push(newExpense);

    // Update user stats and check for achievements
    await this.updateUserStats(expense.usuario_id, { pontos_totais: 5 }); // 5 points per expense
    await this.checkAndUpdateStreak(expense.usuario_id);

    // Check for first expense achievement
    const userExpenses = this.expenses.filter(e => e.usuario_id === expense.usuario_id);
    if (userExpenses.length === 1) {
      await this.unlockAchievement(expense.usuario_id, 'primeiro_gasto');
    }

    // Check budget alerts
    await this.checkBudgetAlerts(expense.usuario_id, expense.categoria, expense.valor);

    return newExpense;
  }

  private async checkBudgetAlerts(userId: string, categoria: string, valor: number): Promise<void> {
    try {
      const currentMonth = new Date().toISOString().substring(0, 7);
      const budgets = await this.getBudgetsByUser(userId, currentMonth);
      const budget = budgets.find(b => b.categoria === categoria);
      
      if (budget) {
        const monthlyExpenses = this.expenses.filter(e => 
          e.usuario_id === userId && 
          e.categoria === categoria && 
          e.data.startsWith(currentMonth)
        );
        const totalSpent = monthlyExpenses.reduce((sum, e) => sum + e.valor, 0);
        const percentage = (totalSpent / budget.valor_orcamento) * 100;
        
        // Check notification settings
        const settings = await this.getNotificationSettings(userId);
        
        if (settings.budget_alerts && (percentage >= 80 || percentage >= 100)) {
          await this.addNotificationHistory({
            usuario_id: userId,
            tipo: 'budget_alert',
            titulo: percentage >= 100 ? '🚨 Orçamento Estourado!' : '⚠️ Alerta de Orçamento',
            mensagem: percentage >= 100 
              ? `Você estourou o orçamento de ${categoria}! Gastou R$ ${totalSpent.toFixed(2)} de R$ ${budget.valor_orcamento.toFixed(2)}`
              : `Você já gastou ${percentage.toFixed(1)}% do orçamento de ${categoria}`,
            icone: percentage >= 100 ? '🚨' : '⚠️',
            lida: false
          });
          
          // Send browser notification if enabled
          if (settings.push_enabled && typeof window !== 'undefined') {
            const { notificationService } = await import('./notifications');
            await notificationService.sendBudgetAlert(categoria, percentage, totalSpent, budget.valor_orcamento);
          }
        }
      }
    } catch (error) {
      console.error('Error checking budget alerts:', error);
    }
  }

  async getConfiguration(): Promise<Configuration> {
    return { ...this.configuration };
  }

  async updateConfiguration(updates: Partial<Omit<Configuration, 'id'>>): Promise<Configuration> {
    this.configuration = {
      ...this.configuration,
      ...updates,
      updated_at: new Date().toISOString()
    };
    return { ...this.configuration };
  }

  async getUserPersonality(userId: string): Promise<UserPersonality | null> {
    return this.userPersonalities.find(p => p.usuario_id === userId) || null;
  }

  async updateUserPersonality(userId: string, personalityUpdate: string): Promise<UserPersonality> {
    const existing = this.userPersonalities.find(p => p.usuario_id === userId);
    
    if (existing) {
      existing.personality_profile = personalityUpdate;
      existing.conversation_count += 1;
      existing.last_updated = new Date().toISOString();
    } else {
      const newPersonality: UserPersonality = {
        id: (this.userPersonalities.length + 1).toString(),
        usuario_id: userId,
        personality_profile: personalityUpdate,
        conversation_count: 1,
        last_updated: new Date().toISOString()
      };
      this.userPersonalities.push(newPersonality);
    }
    
    return this.userPersonalities.find(p => p.usuario_id === userId)!;
  }

  async addConversationMessage(userId: string, type: 'user' | 'assistant', content: string): Promise<ConversationHistory> {
    const newMessage: ConversationHistory = {
      id: (Date.now() + Math.random()).toString(),
      usuario_id: userId,
      type,
      content,
      timestamp: new Date().toISOString()
    };
    
    this.conversationHistories.push(newMessage);
    
    // Keep only last 50 messages per user to avoid memory issues
    const userMessages = this.conversationHistories.filter(h => h.usuario_id === userId);
    if (userMessages.length > 50) {
      const toRemove = userMessages.slice(0, userMessages.length - 50);
      this.conversationHistories = this.conversationHistories.filter(h => 
        !toRemove.some(r => r.id === h.id)
      );
    }
    
    return newMessage;
  }

  async getConversationHistory(userId: string, limit: number = 10): Promise<ConversationHistory[]> {
    return this.conversationHistories
      .filter(h => h.usuario_id === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
      .reverse(); // Return in chronological order
  }

  async deleteExpense(id: string): Promise<void> {
    const index = this.expenses.findIndex(expense => expense.id === id);
    if (index > -1) {
      this.expenses.splice(index, 1);
    }
  }

  async updateExpense(id: string, updates: Partial<Omit<Expense, 'id' | 'usuario_id' | 'created_at'>>): Promise<Expense | null> {
    const index = this.expenses.findIndex(expense => expense.id === id);
    if (index > -1) {
      this.expenses[index] = {
        ...this.expenses[index],
        ...updates
      };
      return this.expenses[index];
    }
    return null;
  }

  // Budget methods
  async getBudgetsByUser(userId: string, mesAno?: string): Promise<Budget[]> {
    let userBudgets = this.budgets.filter(budget => budget.usuario_id === userId);
    if (mesAno) {
      userBudgets = userBudgets.filter(budget => budget.mes_ano === mesAno);
    }
    return userBudgets;
  }

  async setBudget(budget: Omit<Budget, 'id' | 'created_at' | 'updated_at'>): Promise<Budget> {
    // Check if budget already exists for this user, category and month
    const existingIndex = this.budgets.findIndex(b => 
      b.usuario_id === budget.usuario_id && 
      b.categoria === budget.categoria && 
      b.mes_ano === budget.mes_ano
    );

    if (existingIndex > -1) {
      // Update existing budget
      this.budgets[existingIndex] = {
        ...this.budgets[existingIndex],
        valor_orcamento: budget.valor_orcamento,
        updated_at: new Date().toISOString()
      };
      return this.budgets[existingIndex];
    } else {
      // Create new budget
      const newBudget: Budget = {
        ...budget,
        id: (this.budgets.length + 1).toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.budgets.push(newBudget);
      return newBudget;
    }
  }

  async deleteBudget(id: string): Promise<void> {
    const index = this.budgets.findIndex(budget => budget.id === id);
    if (index > -1) {
      this.budgets.splice(index, 1);
    }
  }

  // Goals methods
  async getGoalsByUser(userId: string): Promise<Goal[]> {
    return this.goals.filter(goal => goal.usuario_id === userId);
  }

  async createGoal(goal: Omit<Goal, 'id' | 'valor_atual' | 'status' | 'created_at'>): Promise<Goal> {
    const newGoal: Goal = {
      ...goal,
      id: (this.goals.length + 1).toString(),
      valor_atual: 0,
      status: 'ativa',
      created_at: new Date().toISOString()
    };
    this.goals.push(newGoal);
    return newGoal;
  }

  async updateGoal(id: string, updates: Partial<Omit<Goal, 'id' | 'usuario_id' | 'created_at'>>): Promise<Goal | null> {
    const index = this.goals.findIndex(goal => goal.id === id);
    if (index > -1) {
      this.goals[index] = {
        ...this.goals[index],
        ...updates,
        ...(updates.status === 'concluida' && !this.goals[index].completed_at ? { completed_at: new Date().toISOString() } : {})
      };
      return this.goals[index];
    }
    return null;
  }

  async deleteGoal(id: string): Promise<void> {
    const index = this.goals.findIndex(goal => goal.id === id);
    if (index > -1) {
      this.goals.splice(index, 1);
    }
  }

  // Achievements methods
  async getUserAchievements(userId: string): Promise<Achievement[]> {
    // First check if user has achievements, if not copy from default
    const userAchievements = this.achievements.filter(achievement => achievement.usuario_id === userId);
    
    if (userAchievements.length === 0) {
      const defaultAchievements = this.achievements.filter(achievement => achievement.usuario_id === 'default');
      const userAchievementsCopy = defaultAchievements.map(achievement => ({
        ...achievement,
        id: `${userId}_${achievement.tipo}`,
        usuario_id: userId,
        desbloqueado: false,
        created_at: new Date().toISOString()
      }));
      
      this.achievements.push(...userAchievementsCopy);
      return userAchievementsCopy;
    }
    
    return userAchievements;
  }

  async unlockAchievement(userId: string, tipo: string): Promise<Achievement | null> {
    const index = this.achievements.findIndex(achievement => 
      achievement.usuario_id === userId && achievement.tipo === tipo && !achievement.desbloqueado
    );
    
    if (index > -1) {
      this.achievements[index].desbloqueado = true;
      this.achievements[index].data_desbloqueio = new Date().toISOString();
      
      // Update user stats
      await this.updateUserStats(userId, { conquistas_desbloqueadas: 1, pontos_totais: this.achievements[index].pontos });
      
      return this.achievements[index];
    }
    
    return null;
  }

  // User Stats methods
  async getUserStats(userId: string): Promise<UserStats> {
    let userStats = this.userStats.find(stats => stats.usuario_id === userId);
    
    if (!userStats) {
      userStats = {
        id: (this.userStats.length + 1).toString(),
        usuario_id: userId,
        nivel: 1,
        pontos_totais: 0,
        streak_dias: 0,
        ultima_atividade: new Date().toISOString(),
        metas_concluidas: 0,
        conquistas_desbloqueadas: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      this.userStats.push(userStats);
    }
    
    return userStats;
  }

  async updateUserStats(userId: string, updates: { 
    pontos_totais?: number; 
    metas_concluidas?: number; 
    conquistas_desbloqueadas?: number;
    streak_dias?: number;
  }): Promise<UserStats> {
    let userStats = await this.getUserStats(userId);
    const index = this.userStats.findIndex(stats => stats.usuario_id === userId);
    
    if (updates.pontos_totais) {
      userStats.pontos_totais += updates.pontos_totais;
    }
    if (updates.metas_concluidas) {
      userStats.metas_concluidas += updates.metas_concluidas;
    }
    if (updates.conquistas_desbloqueadas) {
      userStats.conquistas_desbloqueadas += updates.conquistas_desbloqueadas;
    }
    if (updates.streak_dias !== undefined) {
      userStats.streak_dias = updates.streak_dias;
    }
    
    // Calculate level based on points
    userStats.nivel = Math.floor(userStats.pontos_totais / 100) + 1;
    userStats.ultima_atividade = new Date().toISOString();
    userStats.updated_at = new Date().toISOString();
    
    if (index > -1) {
      this.userStats[index] = userStats;
    }
    
    return userStats;
  }

  async checkAndUpdateStreak(userId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const todayExpenses = this.expenses.filter(expense => 
      expense.usuario_id === userId && expense.data === today
    );
    
    const yesterdayExpenses = this.expenses.filter(expense => 
      expense.usuario_id === userId && expense.data === yesterday
    );
    
    const userStats = await this.getUserStats(userId);
    
    if (todayExpenses.length > 0) {
      if (yesterdayExpenses.length > 0 || userStats.streak_dias === 0) {
        // Continue or start streak
        await this.updateUserStats(userId, { streak_dias: userStats.streak_dias + 1 });
        return userStats.streak_dias + 1;
      }
    } else if (userStats.ultima_atividade.split('T')[0] !== today) {
      // Reset streak if no activity today and yesterday
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      if (userStats.ultima_atividade.split('T')[0] === twoDaysAgo) {
        await this.updateUserStats(userId, { streak_dias: 0 });
        return 0;
      }
    }
    
    return userStats.streak_dias;
  }

  // Notification Settings methods
  async getNotificationSettings(userId: string): Promise<NotificationSettings> {
    let settings = this.notificationSettings.find(s => s.usuario_id === userId);
    
    if (!settings) {
      settings = {
        id: (this.notificationSettings.length + 1).toString(),
        usuario_id: userId,
        budget_alerts: true,
        goal_progress: true,
        daily_reminders: true,
        achievement_unlocks: true,
        expense_limits: true,
        weekly_summaries: true,
        push_enabled: true,
        email_enabled: false,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      this.notificationSettings.push(settings);
    }
    
    return settings;
  }

  async updateNotificationSettings(userId: string, updates: Partial<Omit<NotificationSettings, 'id' | 'usuario_id' | 'created_at'>>): Promise<NotificationSettings> {
    let settings = await this.getNotificationSettings(userId);
    const index = this.notificationSettings.findIndex(s => s.usuario_id === userId);
    
    settings = {
      ...settings,
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    if (index > -1) {
      this.notificationSettings[index] = settings;
    }
    
    return settings;
  }

  // Notification History methods
  async addNotificationHistory(notification: Omit<NotificationHistory, 'id' | 'data_criacao'>): Promise<NotificationHistory> {
    const newNotification: NotificationHistory = {
      ...notification,
      id: (this.notificationHistory.length + 1).toString(),
      data_criacao: new Date().toISOString()
    };
    
    this.notificationHistory.push(newNotification);
    
    // Keep only last 50 notifications per user
    const userNotifications = this.notificationHistory.filter(n => n.usuario_id === notification.usuario_id);
    if (userNotifications.length > 50) {
      const toRemove = userNotifications.slice(0, userNotifications.length - 50);
      this.notificationHistory = this.notificationHistory.filter(n => 
        !toRemove.some(r => r.id === n.id)
      );
    }
    
    return newNotification;
  }

  async getNotificationHistory(userId: string, limit: number = 20): Promise<NotificationHistory[]> {
    const userNotifications = this.notificationHistory.filter(n => n.usuario_id === userId);
    
    const result = userNotifications
      .sort((a, b) => new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime())
      .slice(0, limit);
      
    return result;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    const index = this.notificationHistory.findIndex(n => n.id === id);
    if (index > -1) {
      this.notificationHistory[index].lida = true;
      this.notificationHistory[index].data_leitura = new Date().toISOString();
    }
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const unreadNotifications = this.notificationHistory.filter(n => n.usuario_id === userId && !n.lida);
    return unreadNotifications.length;
  }

  // Admin notification methods
  async sendAdminNotification(userIds: string[], titulo: string, mensagem: string): Promise<NotificationHistory[]> {
    const notifications: NotificationHistory[] = [];
    
    for (const userId of userIds) {
      const notification = await this.addNotificationHistory({
        usuario_id: userId,
        tipo: 'admin_message',
        titulo,
        mensagem,
        icone: '📢',
        lida: false
      });
      
      notifications.push(notification);
    }
    
    return notifications;
  }

  async getAdminNotificationStats(): Promise<{
    total: number;
    sent_today: number;
    read_rate: number;
    recent_notifications: any[];
  }> {
    const adminNotifications = this.notificationHistory.filter(n => n.tipo === 'admin_message');
    const today = new Date().toISOString().split('T')[0];
    const sentToday = adminNotifications.filter(n => n.data_criacao.startsWith(today));
    const readCount = adminNotifications.filter(n => n.lida).length;
    const readRate = adminNotifications.length > 0 ? (readCount / adminNotifications.length) * 100 : 0;
    
    const recentNotifications = adminNotifications
      .sort((a, b) => new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime())
      .slice(0, 10)
      .map(notification => {
        const user = this.users.find(u => u.id === notification.usuario_id);
        return {
          ...notification,
          user_name: user?.nome || 'Usuário não encontrado'
        };
      });
    
    return {
      total: adminNotifications.length,
      sent_today: sentToday.length,
      read_rate: readRate,
      recent_notifications: recentNotifications
    };
  }
}

// Import and use Supabase database
import { supabaseDatabase } from './supabase-database';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return url && key && url !== 'https://SEU_PROJETO.supabase.co' && key !== 'SUA_CHAVE_ANONIMA_AQUI';
};

// Create database instance based on configuration
const createDatabase = () => {
  if (isSupabaseConfigured()) {
    console.log('🚀 Usando Supabase Database');
    return supabaseDatabase;
  } else {
    console.log('⚠️ Supabase não configurado, usando MockDatabase como fallback');
    return MockDatabase.getInstance();
  }
};

// Export the appropriate database
export const database = createDatabase();
