import { supabase } from './supabase';

export interface User {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  is_admin: boolean;
  plan_type: 'bronze' | 'ouro' | 'trial' | null;
  plan_expiration: string | null;
  data_criacao: string;
  is_blocked?: boolean;
}

export interface Income {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  tags: string[];
  created_at: string;
  updated_at: string;
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
  tipo: 'economia' | 'reduzir_categoria' | 'limite_mensal' | 'frequencia' | 'temporal' | 'saldo_positivo' | 'diversificacao' | 'fluxo_caixa';
  titulo: string;
  descricao: string;
  valor_meta: number;
  categoria?: string;
  prazo: string; // "2025-03-31"
  valor_atual: number;
  status: 'ativa' | 'concluida' | 'falhada';
  created_at: string;
  completed_at?: string;
  sugerida_ia: boolean; // Se foi sugerida pela IA
  periodo_temporal?: 'manha' | 'tarde' | 'noite' | 'madrugada' | 'fim_semana' | 'dia_semana';
  adaptativa: boolean; // Se a meta se adapta automaticamente
  dificuldade: 'facil' | 'medio' | 'dificil';
  pontos_bonus: number; // Pontos extras por completar
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
  categoria: 'basico' | 'economista' | 'investidor' | 'organizador' | 'social' | 'temporal' | 'premium';
  raridade: 'comum' | 'raro' | 'epico' | 'lendario';
  requisitos?: string; // JSON com requisitos específicos
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
  // Novos campos para gamificação avançada
  trilha_economista: number;
  trilha_investidor: number;
  trilha_organizador: number;
  desafios_semanais_completados: number;
  metas_sugeridas_aceitas: number;
  analises_temporais_visualizadas: number;
  orcamentos_criados: number;
  conversas_ia: number;
  badges: string[]; // Array de IDs de badges conquistadas
}

export interface NotificationSettings {
  id: string;
  usuario_id: string;
  daily_reminders: boolean;
  weekly_summaries: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  created_at: string;
  updated_at: string;
  appointment_alerts: boolean;
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

export interface MetaSugerida {
  id: string;
  usuario_id: string;
  tipo: Goal['tipo'];
  titulo: string;
  descricao: string;
  valor_meta: number;
  categoria?: string;
  justificativa: string; // Por que a IA sugeriu
  baseada_em: 'gastos_historicos' | 'padroes_temporais' | 'analise_categorias' | 'comportamento_usuario';
  pontuacao_confianca: number; // 0-100
  aceita: boolean;
  created_at: string;
}

export interface DesafioSemanal {
  id: string;
  usuario_id: string;
  titulo: string;
  descricao: string;
  tipo: 'economia' | 'organizacao' | 'analise' | 'conversa';
  objetivo: number;
  progresso_atual: number;
  pontos_recompensa: number;
  data_inicio: string;
  data_fim: string;
  completado: boolean;
  created_at: string;
}

export interface Badge {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  categoria: Achievement['categoria'];
  raridade: Achievement['raridade'];
  condicoes: string; // JSON com as condições para desbloquear
}

// 📅 NOVA INTERFACE: Para compromissos/agendamentos
export interface Appointment {
  id: string;
  user_id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  location?: string;
  category: 'pessoal' | 'trabalho' | 'saúde' | 'educação' | 'família' | 'negócios' | 'lazer' | 'financeiro' | 'outros';
  created_at: string;
  updated_at: string;
  status: 'pendente' | 'concluido' | 'cancelado';
}

export interface Sale {
  id: string;
  admin_id: string;
  email: string;
  plano: 'ouro' | 'bronze' | 'trial' | 'none';
  tempo_plano: string;
  valor: number;
  data_venda: string;
  created_at: string;
}

export interface Webhook {
  id: string;
  url: string;
  evento: 'criou_conta' | 'trial_expirou' | 'trial_expira_1h' | 'plano_expirou' | 'venda_realizada' | 'compromisso';
  criado_em: string;
}

class MockDatabase {
  private static instance: MockDatabase;
  
  private users: User[] = [
    {
      id: '1',
      nome: 'Usuário Demo',
      email: 'demo@demo.com',
      whatsapp: '1234567890',
      is_admin: false,
      plan_type: 'bronze',
      plan_expiration: null,
      data_criacao: new Date().toISOString()
    },
    {
      id: '2',
      nome: 'Admin',
      email: 'admin@admin.com',
      whatsapp: '0987654321',
      is_admin: true,
      plan_type: 'ouro',
      plan_expiration: null,
      data_criacao: new Date().toISOString()
    },
    {
      id: '3',
      nome: 'Trial User',
      email: 'trial@demo.com',
      whatsapp: '1122334455',
      is_admin: false,
      plan_type: 'trial',
      plan_expiration: null,
      data_criacao: new Date().toISOString()
    },
    {
      id: '4',
      nome: 'Sem Plano',
      email: 'semplano@demo.com',
      whatsapp: '5555555555',
      is_admin: false,
      plan_type: null,
      plan_expiration: null,
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
  private incomes: Income[] = [];
  private appointments: Appointment[] = [];
  private webhooks: Webhook[] = [];

  private constructor() {
    console.log('⚠️ MockDatabase - Backup instance (not used)');
  }

  // Income methods (Plano Ouro apenas)
  async getIncomesByUser(userId: string): Promise<Income[]> {
    const user = this.users.find(u => u.id === userId);
    if (!user || user.plan_type !== 'ouro') {
      return [];
    }
    return this.incomes.filter(income => income.user_id === userId);
  }

  async addIncome(income: Omit<Income, 'id' | 'created_at' | 'updated_at'>): Promise<Income | null> {
    const user = this.users.find(u => u.id === income.user_id);
    if (!user || user.plan_type !== 'ouro') {
      return null;
    }

    const newIncome: Income = {
      ...income,
      id: (this.incomes.length + 1).toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.incomes.push(newIncome);
    return newIncome;
  }

  async updateIncome(id: string, updates: Partial<Omit<Income, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Income | null> {
    const index = this.incomes.findIndex(income => income.id === id);
    if (index > -1) {
      this.incomes[index] = {
        ...this.incomes[index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      return this.incomes[index];
    }
    return null;
  }

  async deleteIncome(id: string): Promise<void> {
    const index = this.incomes.findIndex(income => income.id === id);
    if (index > -1) {
      this.incomes.splice(index, 1);
    }
  }

  // 📅 Appointment methods (Plano Ouro apenas)
  async getAppointmentsByUser(userId: string): Promise<Appointment[]> {
    const user = this.users.find(u => u.id === userId);
    if (!user || user.plan_type !== 'ouro') {
      return [];
    }
    return this.appointments.filter(appointment => appointment.user_id === userId)
      .sort((a, b) => {
        // Ordenar por data e hora
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA.getTime() - dateB.getTime();
      });
  }

  async addAppointment(appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<Appointment | null> {
    try {
      console.log('📅 addAppointment - Adicionando compromisso:', appointment);
      // Check if user has gold plan
      const user = await this.getUserById(appointment.user_id);
      if (!user || (user.plan_type !== 'ouro' && user.plan_type !== 'trial')) {
        console.log('🚫 Usuário não tem plano ouro, compromisso negado');
        return null;
      }
      const { data, error } = await supabase
        .from('appointments')
        .insert([{ ...appointment, status: appointment.status || 'pendente' }])
        .select()
        .single();
      if (error) throw error;
      console.log('✅ Compromisso adicionado ao Supabase:', data);
      return data as Appointment;
    } catch (error) {
      console.error('Error adding appointment:', error);
      return null;
    }
  }

  async updateAppointment(id: string, updates: Partial<Omit<Appointment, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Appointment | null> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({ ...updates, status: updates.status || 'pendente' })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Appointment;
    } catch (error) {
      console.error('Error updating appointment:', error);
      return null;
    }
  }

  async deleteAppointment(id: string): Promise<void> {
    const index = this.appointments.findIndex(appointment => appointment.id === id);
    if (index > -1) {
      this.appointments.splice(index, 1);
    }
  }

  async getAppointmentsByDate(userId: string, date: string): Promise<Appointment[]> {
    const user = this.users.find(u => u.id === userId);
    if (!user || user.plan_type !== 'ouro') {
      return [];
    }
    return this.appointments.filter(appointment => 
      appointment.user_id === userId && appointment.date === date
    ).sort((a, b) => a.time.localeCompare(b.time));
  }

  async getUpcomingAppointments(userId: string, days: number = 7): Promise<Appointment[]> {
    const user = this.users.find(u => u.id === userId);
    if (!user || user.plan_type !== 'ouro') {
      return [];
    }

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    return this.appointments.filter(appointment => {
      if (appointment.user_id !== userId) return false;
      
      const appointmentDate = new Date(`${appointment.date}T${appointment.time}`);
      return appointmentDate >= now && appointmentDate <= futureDate;
    }).sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.users.find(u => u.id === userId) || null;
  }

  async updateUserPlan(userId: string, planType: 'bronze' | 'ouro' | 'trial' | null, plan_expiration?: string | null): Promise<User | null> {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.plan_type = planType;
      if (typeof plan_expiration !== 'undefined') {
        user.plan_expiration = plan_expiration;
      }
      return user;
    }
    return null;
  }

  async getUserPlan(userId: string): Promise<'bronze' | 'ouro' | 'trial' | null> {
    const user = this.users.find(u => u.id === userId);
    return user?.plan_type || null;
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
        updated_at: new Date().toISOString(),
        // Novos campos para gamificação avançada
        trilha_economista: 0,
        trilha_investidor: 0,
        trilha_organizador: 0,
        desafios_semanais_completados: 0,
        metas_sugeridas_aceitas: 0,
        analises_temporais_visualizadas: 0,
        orcamentos_criados: 0,
        conversas_ia: 0,
        badges: []
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
    trilha_economista?: number;
    trilha_investidor?: number;
    trilha_organizador?: number;
    desafios_semanais_completados?: number;
    metas_sugeridas_aceitas?: number;
    analises_temporais_visualizadas?: number;
    orcamentos_criados?: number;
    conversas_ia?: number;
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
    // Novos campos
    if (updates.trilha_economista) {
      userStats.trilha_economista += updates.trilha_economista;
    }
    if (updates.trilha_investidor) {
      userStats.trilha_investidor += updates.trilha_investidor;
    }
    if (updates.trilha_organizador) {
      userStats.trilha_organizador += updates.trilha_organizador;
    }
    if (updates.desafios_semanais_completados) {
      userStats.desafios_semanais_completados += updates.desafios_semanais_completados;
    }
    if (updates.metas_sugeridas_aceitas) {
      userStats.metas_sugeridas_aceitas += updates.metas_sugeridas_aceitas;
    }
    if (updates.analises_temporais_visualizadas) {
      userStats.analises_temporais_visualizadas += updates.analises_temporais_visualizadas;
    }
    if (updates.orcamentos_criados) {
      userStats.orcamentos_criados += updates.orcamentos_criados;
    }
    if (updates.conversas_ia) {
      userStats.conversas_ia += updates.conversas_ia;
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

  // 🔥 Função auxiliar para data brasileira em formato string
  private getBrazilDateString(): string {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const brazilTime = new Date(utc + (-3 * 3600000)); // UTC-3
    const year = brazilTime.getFullYear();
    const month = String(brazilTime.getMonth() + 1).padStart(2, '0');
    const day = String(brazilTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async checkAndUpdateStreak(userId: string): Promise<number> {
    const today = this.getBrazilDateString();
    const yesterday = (() => {
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const brazilTime = new Date(utc + (-3 * 3600000)); // UTC-3
      brazilTime.setDate(brazilTime.getDate() - 1);
      const year = brazilTime.getFullYear();
      const month = String(brazilTime.getMonth() + 1).padStart(2, '0');
      const day = String(brazilTime.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })();
    
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
        daily_reminders: true,
        weekly_summaries: true,
        push_enabled: true,
        email_enabled: false,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        appointment_alerts: true
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

  // Novos métodos para funcionalidades avançadas
  private metasSugeridas: MetaSugerida[] = [];
  private desafiosSemanais: DesafioSemanal[] = [];
  private badges: Badge[] = [
    { id: 'analista', nome: 'Analista Financeiro', descricao: 'Visualizou análises temporais 10 vezes', icone: '📊', categoria: 'temporal', raridade: 'comum', condicoes: JSON.stringify({ analises_temporais: 10 }) },
    { id: 'organizador', nome: 'Organizador Master', descricao: 'Criou orçamentos para todas as categorias', icone: '📋', categoria: 'organizador', raridade: 'raro', condicoes: JSON.stringify({ orcamentos_completos: true }) },
    { id: 'conversa_ia', nome: 'Consultor IA', descricao: 'Teve 50 conversas com a IA', icone: '🤖', categoria: 'social', raridade: 'comum', condicoes: JSON.stringify({ conversas_ia: 50 }) },
    { id: 'plano_ouro', nome: 'Premium Member', descricao: 'Upgrade para o Plano Ouro', icone: '👑', categoria: 'premium', raridade: 'epico', condicoes: JSON.stringify({ plano: 'ouro' }) },
    { id: 'equilibrista', nome: 'Equilibrista Financeiro', descricao: 'Manteve saldo positivo por 3 meses', icone: '⚖️', categoria: 'investidor', raridade: 'lendario', condicoes: JSON.stringify({ saldo_positivo_meses: 3 }) }
  ];

  // Metas Sugeridas pela IA
  async gerarMetasSugeridaIA(userId: string): Promise<MetaSugerida[]> {
    const expenses = await this.getExpensesByUser(userId);
    const userStats = await this.getUserStats(userId);
    const metas: MetaSugerida[] = [];

    // Análise de gastos dos últimos 3 meses
    const currentMonth = new Date().toISOString().substring(0, 7);
    const lastMonths = [0, 1, 2].map(i => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return date.toISOString().substring(0, 7);
    });

    const monthlyExpenses = lastMonths.map(month => ({
      month,
      expenses: expenses.filter(e => e.data.startsWith(month))
    }));

    // Meta baseada em categoria dominante
    const categorySpending = expenses.reduce((acc, expense) => {
      acc[expense.categoria] = (acc[expense.categoria] || 0) + expense.valor;
      return acc;
    }, {} as Record<string, number>);

    const dominantCategory = Object.entries(categorySpending).reduce((a, b) => 
      categorySpending[a[0]] > categorySpending[b[0]] ? a : b
    );

    if (dominantCategory && dominantCategory[1] > 0) {
      const avgMonthly = dominantCategory[1] / 3;
      const reductionTarget = avgMonthly * 0.15; // 15% de redução

      metas.push({
        id: `meta_${Date.now()}_1`,
        usuario_id: userId,
        tipo: 'reduzir_categoria',
        titulo: `Reduzir gastos com ${dominantCategory[0]}`,
        descricao: `Reduza 15% dos gastos em ${dominantCategory[0]} este mês`,
        valor_meta: reductionTarget,
        categoria: dominantCategory[0],
        justificativa: `Você gasta em média R$ ${avgMonthly.toFixed(2)} com ${dominantCategory[0]}. Uma redução de 15% pode gerar uma economia significativa.`,
        baseada_em: 'analise_categorias',
        pontuacao_confianca: 85,
        aceita: false,
        created_at: new Date().toISOString()
      });
    }

    // Meta de economia baseada no padrão atual
    const avgMonthlyTotal = expenses.reduce((sum, e) => sum + e.valor, 0) / 3;
    if (avgMonthlyTotal > 0) {
      const savingsTarget = avgMonthlyTotal * 0.1; // 10% de economia

      metas.push({
        id: `meta_${Date.now()}_2`,
        usuario_id: userId,
        tipo: 'economia',
        titulo: 'Meta de Economia Mensal',
        descricao: 'Economize 10% dos seus gastos habituais',
        valor_meta: savingsTarget,
        justificativa: `Baseado no seu padrão de gastos (R$ ${avgMonthlyTotal.toFixed(2)}/mês), economizar 10% é uma meta realista e impactante.`,
        baseada_em: 'gastos_historicos',
        pontuacao_confianca: 80,
        aceita: false,
        created_at: new Date().toISOString()
      });
    }

    return metas;
  }

  async aceitarMetaSugerida(metaId: string): Promise<Goal | null> {
    const metaSugerida = this.metasSugeridas.find(m => m.id === metaId);
    if (!metaSugerida) return null;

    const novaGoal: Goal = {
      id: (this.goals.length + 1).toString(),
      usuario_id: metaSugerida.usuario_id,
      tipo: metaSugerida.tipo,
      titulo: metaSugerida.titulo,
      descricao: metaSugerida.descricao,
      valor_meta: metaSugerida.valor_meta,
      categoria: metaSugerida.categoria,
      prazo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 dias
      valor_atual: 0,
      status: 'ativa',
      created_at: new Date().toISOString(),
      sugerida_ia: true,
      adaptativa: false,
      dificuldade: 'medio',
      pontos_bonus: 25
    };

    this.goals.push(novaGoal);
    metaSugerida.aceita = true;

    // Atualizar stats do usuário
    await this.updateUserStats(metaSugerida.usuario_id, { 
      pontos_totais: 10 // Pontos por aceitar sugestão da IA
    });

    return novaGoal;
  }

  // Desafios Semanais
  async gerarDesafioSemanal(userId: string): Promise<DesafioSemanal | null> {
    const userStats = await this.getUserStats(userId);
    const expenses = await this.getExpensesByUser(userId);
    
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));

    // Verifica se já tem desafio ativo esta semana
    const activeChallenge = this.desafiosSemanais.find(d => 
      d.usuario_id === userId && 
      !d.completado && 
      new Date(d.data_inicio) <= new Date() && 
      new Date(d.data_fim) >= new Date()
    );

    if (activeChallenge) return activeChallenge;

    // Gerar novo desafio baseado no histórico
    const desafios = [
      {
        titulo: 'Semana da Economia',
        descricao: 'Gaste 20% menos que a semana passada',
        tipo: 'economia' as const,
        objetivo: 20,
        pontos: 50
      },
      {
        titulo: 'Organizador da Semana',
        descricao: 'Registre pelo menos 5 gastos',
        tipo: 'organizacao' as const,
        objetivo: 5,
        pontos: 30
      },
      {
        titulo: 'Analista Financeiro',
        descricao: 'Visualize suas análises 3 vezes',
        tipo: 'analise' as const,
        objetivo: 3,
        pontos: 25
      }
    ];

    const randomDesafio = desafios[Math.floor(Math.random() * desafios.length)];

    const novoDesafio: DesafioSemanal = {
      id: (this.desafiosSemanais.length + 1).toString(),
      usuario_id: userId,
      titulo: randomDesafio.titulo,
      descricao: randomDesafio.descricao,
      tipo: randomDesafio.tipo,
      objetivo: randomDesafio.objetivo,
      progresso_atual: 0,
      pontos_recompensa: randomDesafio.pontos,
      data_inicio: startOfWeek.toISOString(),
      data_fim: endOfWeek.toISOString(),
      completado: false,
      created_at: new Date().toISOString()
    };

    this.desafiosSemanais.push(novoDesafio);
    return novoDesafio;
  }

  async atualizarProgressoDesafio(userId: string, tipo: DesafioSemanal['tipo'], incremento: number = 1): Promise<DesafioSemanal | null> {
    const desafioAtivo = this.desafiosSemanais.find(d => 
      d.usuario_id === userId && 
      d.tipo === tipo &&
      !d.completado && 
      new Date(d.data_inicio) <= new Date() && 
      new Date(d.data_fim) >= new Date()
    );

    if (!desafioAtivo) return null;

    desafioAtivo.progresso_atual += incremento;

    if (desafioAtivo.progresso_atual >= desafioAtivo.objetivo) {
      desafioAtivo.completado = true;
      
      // Dar pontos de recompensa
      await this.updateUserStats(userId, { 
        pontos_totais: desafioAtivo.pontos_recompensa,
        desafios_semanais_completados: 1
      });

      // Notificar usuário
      await this.addNotificationHistory({
        usuario_id: userId,
        tipo: 'achievement',
        titulo: '🎉 Desafio Completado!',
        mensagem: `Você completou: ${desafioAtivo.titulo}`,
        icone: '🏆',
        lida: false
      });
    }

    return desafioAtivo;
  }

  // Sistema de Badges
  async verificarNovasBadges(userId: string): Promise<Badge[]> {
    const userStats = await this.getUserStats(userId);
    const user = await this.getUserById(userId);
    const novasBadges: Badge[] = [];

    for (const badge of this.badges) {
      // Verificar se usuário já tem esta badge
      if (userStats.badges.includes(badge.id)) continue;

      const condicoes = JSON.parse(badge.condicoes);
      let deveDesbloquear = false;

      switch (badge.id) {
        case 'analista':
          deveDesbloquear = userStats.analises_temporais_visualizadas >= condicoes.analises_temporais;
          break;
        case 'organizador':
          const userBudgets = await this.getBudgetsByUser(userId, new Date().toISOString().substring(0, 7));
          deveDesbloquear = userBudgets.length >= 5; // Assumindo 5+ categorias
          break;
        case 'conversa_ia':
          deveDesbloquear = userStats.conversas_ia >= condicoes.conversas_ia;
          break;
        case 'plano_ouro':
          deveDesbloquear = user?.plan_type === 'ouro';
          break;
        case 'equilibrista':
          // Lógica mais complexa - verificar saldo positivo por 3 meses
          const incomes = user?.plan_type === 'ouro' ? await this.getIncomesByUser(userId) : [];
          const expenses = await this.getExpensesByUser(userId);
          
          const last3Months = [0, 1, 2].map(i => {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            return date.toISOString().substring(0, 7);
          });

          const monthlyBalances = last3Months.map(month => {
            const monthIncomes = incomes.filter(i => i.date.startsWith(month)).reduce((sum, i) => sum + i.amount, 0);
            const monthExpenses = expenses.filter(e => e.data.startsWith(month)).reduce((sum, e) => sum + e.valor, 0);
            return monthIncomes - monthExpenses;
          });

          deveDesbloquear = monthlyBalances.every(balance => balance > 0) && monthlyBalances.length === 3;
          break;
      }

      if (deveDesbloquear) {
        // Adicionar badge ao usuário
        userStats.badges.push(badge.id);
        novasBadges.push(badge);

        // Notificar
        await this.addNotificationHistory({
          usuario_id: userId,
          tipo: 'achievement',
          titulo: '🏅 Nova Badge Desbloqueada!',
          mensagem: `${badge.nome}: ${badge.descricao}`,
          icone: badge.icone,
          lida: false
        });
      }
    }

    return novasBadges;
  }

  // Metas Adaptativas
  async ajustarMetaAdaptativa(goalId: string): Promise<Goal | null> {
    const goal = this.goals.find(g => g.id === goalId && g.adaptativa);
    if (!goal) return null;

    const expenses = await this.getExpensesByUser(goal.usuario_id);
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthlyExpenses = expenses.filter(e => e.data.startsWith(currentMonth));

    // Analisar progresso atual
    const progressPercentage = (goal.valor_atual / goal.valor_meta) * 100;
    const daysIntoMonth = new Date().getDate();
    const expectedProgress = (daysIntoMonth / 30) * 100; // Progresso esperado baseado nos dias

    // Se estiver muito abaixo do esperado, ajustar meta
    if (progressPercentage < expectedProgress * 0.5) {
      const newTarget = goal.valor_meta * 0.8; // Reduzir meta em 20%
      
      goal.valor_meta = newTarget;
      
      await this.addNotificationHistory({
        usuario_id: goal.usuario_id,
        tipo: 'goal_progress',
        titulo: '🎯 Meta Ajustada',
        mensagem: `Sua meta "${goal.titulo}" foi ajustada para ser mais realista: R$ ${newTarget.toFixed(2)}`,
        icone: '⚙️',
        lida: false
      });
    }

    return goal;
  }

  async getAdminNotificationStats(): Promise<{
    total: number;
    sent_today: number;
    read_rate: number;
    recent_notifications: any[];
  }> {
    const adminNotifications = this.notificationHistory.filter(n => n.tipo === 'admin_message');
    const today = this.getBrazilDateString();
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

  async createUser(user: Omit<User, 'id' | 'data_criacao'> & { plan_expiration?: string | null }): Promise<User | null> {
    const newUser: User = {
      id: (this.users.length + 1).toString(),
      nome: user.nome,
      email: user.email,
      whatsapp: user.whatsapp,
      is_admin: user.is_admin,
      plan_type: user.plan_type ?? null,
      plan_expiration: user.plan_expiration ?? null,
      data_criacao: new Date().toISOString().split('T')[0],
    };
    this.users.push(newUser);
    return newUser;
  }

  async getAllIncomes(): Promise<Income[]> {
    return [...this.incomes];
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return [...this.appointments];
  }

  async getAllUserStats(): Promise<UserStats[]> {
    return [...this.userStats];
  }

  async addWebhook(webhook: Omit<Webhook, 'id' | 'criado_em'>): Promise<Webhook> {
    const newWebhook: Webhook = {
      ...webhook,
      id: Math.random().toString(36).substr(2, 9),
      criado_em: new Date().toISOString(),
    };
    this.webhooks.push(newWebhook);
    return newWebhook;
  }

  async getWebhooks(): Promise<Webhook[]> {
    return this.webhooks;
  }

  async removeWebhook(id: string): Promise<void> {
    this.webhooks = this.webhooks.filter(w => w.id !== id);
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
