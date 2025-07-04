import { supabase } from './supabase';
import { User, Expense, Income, NotificationSettings, NotificationHistory, Appointment, Goal, Achievement, UserStats, Sale } from './database';
import { triggerWebhooks } from './webhooks';

// 🔥 Função auxiliar para data brasileira em formato string
function getBrazilDateString(): string {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const brazilTime = new Date(utc + (-3 * 3600000)); // UTC-3
  const year = brazilTime.getFullYear();
  const month = String(brazilTime.getMonth() + 1).padStart(2, '0');
  const day = String(brazilTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type { User, Expense, Income, Appointment };
export { supabase };

export class SupabaseDatabase {
  private static instance: SupabaseDatabase;

  private constructor() {
    console.log('🏗️ SupabaseDatabase - Inicializando instância singleton');
    this.testConnection();
  }

  private async testConnection() {
    try {
      console.log('🔗 Testando conexão com Supabase...');
      
      // Test basic connection
      const { data, error } = await supabase.from('users').select('count').limit(1);
      
      if (error) {
        console.error('❌ Erro de conexão Supabase:', error);
        console.error('📋 Detalhes do erro:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
      } else {
        console.log('✅ Conexão com Supabase estabelecida com sucesso');
      }
    } catch (error) {
      console.error('❌ Erro crítico na conexão:', error);
    }
  }

  public static getInstance(): SupabaseDatabase {
    if (!SupabaseDatabase.instance) {
      SupabaseDatabase.instance = new SupabaseDatabase();
    }
    return SupabaseDatabase.instance;
  }

  // ============================================================================
  // USER METHODS
  // ============================================================================

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      return data as User;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('nome');

      if (error) throw error;
      return data as User[];
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async createUser(user: Omit<User, 'id' | 'data_criacao'>): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([user])
        .select()
        .single();

      if (error) throw error;
      return data as User;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  // ============================================================================
  // EXPENSE METHODS
  // ============================================================================

  async getAllExpenses(): Promise<Expense[]> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('data', { ascending: false });

      if (error) throw error;
      return data as Expense[];
    } catch (error) {
      console.error('Error getting all expenses:', error);
      return [];
    }
  }

  async getExpensesByUser(userId: string): Promise<Expense[]> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('usuario_id', userId)
        .order('data', { ascending: false });

      if (error) throw error;
      return data as Expense[];
    } catch (error) {
      console.error('Error getting user expenses:', error);
      return [];
    }
  }

  async addExpense(expense: Omit<Expense, 'id' | 'created_at'>): Promise<Expense | null> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([expense])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Expense added to Supabase:', data);
      return data as Expense;
    } catch (error) {
      console.error('Error adding expense:', error);
      return null;
    }
  }

  async updateExpense(id: string, updates: Partial<Omit<Expense, 'id' | 'usuario_id' | 'created_at'>>): Promise<Expense | null> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Expense;
    } catch (error) {
      console.error('Error updating expense:', error);
      return null;
    }
  }

  async deleteExpense(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      console.log('✅ Expense deleted from Supabase:', id);
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  }

  // ============================================================================
  // INCOME METHODS (PLANO OURO APENAS)
  // ============================================================================

  async getIncomesByUser(userId: string): Promise<Income[]> {
    try {
      console.log('💰 getIncomesByUser - Buscando recebimentos para usuário:', userId);
      
      // First check if user has gold plan
      const user = await this.getUserById(userId);
      if (!user || (user.plan_type !== 'ouro' && user.plan_type !== 'trial')) {
        console.log('🚫 Usuário não tem plano ouro, retornando array vazio');
        return [];
      }

      const { data, error } = await supabase
        .from('incomes')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;
      
      console.log('✅ Recebimentos encontrados:', data?.length || 0);
      return data as Income[];
    } catch (error) {
      console.error('Error getting user incomes:', error);
      return [];
    }
  }

  async addIncome(income: Omit<Income, 'id' | 'created_at' | 'updated_at'>): Promise<Income | null> {
    try {
      console.log('💰 addIncome - Adicionando recebimento:', income);
      
      // Check if user has gold plan
      const user = await this.getUserById(income.user_id);
      if (!user || (user.plan_type !== 'ouro' && user.plan_type !== 'trial')) {
        console.log('🚫 Usuário não tem plano ouro, recebimento negado');
        return null;
      }

      const { data, error } = await supabase
        .from('incomes')
        .insert([income])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Recebimento adicionado ao Supabase:', data);
      return data as Income;
    } catch (error) {
      console.error('Error adding income:', error);
      return null;
    }
  }

  async updateIncome(id: string, updates: Partial<Omit<Income, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Income | null> {
    try {
      const { data, error } = await supabase
        .from('incomes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Income;
    } catch (error) {
      console.error('Error updating income:', error);
      return null;
    }
  }

  async deleteIncome(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('incomes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      console.log('✅ Income deleted from Supabase:', id);
    } catch (error) {
      console.error('Error deleting income:', error);
    }
  }

  async getAllIncomes(): Promise<Income[]> {
    try {
      const { data, error } = await supabase
        .from('incomes')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data as Income[];
    } catch (error) {
      console.error('Error getting all incomes:', error);
      return [];
    }
  }

  // ============================================================================
  // APPOINTMENT METHODS (PLANO OURO APENAS)
  // ============================================================================

  async getAppointmentsByUser(userId: string): Promise<Appointment[]> {
    try {
      console.log('📅 getAppointmentsByUser - Buscando compromissos para usuário:', userId);
      
      // First check if user has gold plan
      const user = await this.getUserById(userId);
      if (!user || (user.plan_type !== 'ouro' && user.plan_type !== 'trial')) {
        console.log('🚫 Usuário não tem plano ouro, retornando array vazio');
        return [];
      }

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;
      
      console.log('✅ Compromissos encontrados:', data?.length || 0);
      return data as Appointment[];
    } catch (error) {
      console.error('Error getting user appointments:', error);
      return [];
    }
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
        .insert([appointment])
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
        .update(updates)
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
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      console.log('✅ Appointment deleted from Supabase:', id);
    } catch (error) {
      console.error('Error deleting appointment:', error);
    }
  }

  async getAppointmentsByDate(userId: string, date: string): Promise<Appointment[]> {
    try {
      const user = await this.getUserById(userId);
      if (!user || (user.plan_type !== 'ouro' && user.plan_type !== 'trial')) {
        return [];
      }

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .order('time', { ascending: true });

      if (error) throw error;
      return data as Appointment[];
    } catch (error) {
      console.error('Error getting appointments by date:', error);
      return [];
    }
  }

  async getUpcomingAppointments(userId: string, days: number = 7): Promise<Appointment[]> {
    try {
      const user = await this.getUserById(userId);
      if (!user || (user.plan_type !== 'ouro' && user.plan_type !== 'trial')) {
        return [];
      }

      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + days);

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', userId)
        .gte('date', now.toISOString().split('T')[0])
        .lte('date', futureDate.toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;
      return data as Appointment[];
    } catch (error) {
      console.error('Error getting upcoming appointments:', error);
      return [];
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as User;
    } catch (error) {
      console.error('Error getting user by id:', error);
      return null;
    }
  }

  async getAllAppointments(): Promise<Appointment[]> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('date', { ascending: true })
        .order('time', { ascending: true });
      if (error) throw error;
      return data as Appointment[];
    } catch (error) {
      console.error('Error getting all appointments:', error);
      return [];
    }
  }

  // ============================================================================
  // PLAN METHODS
  // ============================================================================

  async updateUserPlan(userId: string, planType: 'bronze' | 'ouro' | 'trial' | null, plan_expiration?: string | null): Promise<User | null> {
    try {
      console.log(`📋 updateUserPlan - Atualizando usuário ${userId} para plano ${planType} e expiração ${plan_expiration}`);
      const updateFields: any = { plan_type: planType };
      if (typeof plan_expiration !== 'undefined') {
        updateFields.plan_expiration = plan_expiration;
      }
      const { data, error } = await supabase
        .from('users')
        .update(updateFields)
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      console.log('✅ Plano e expiração atualizados com sucesso:', data);
      // Disparar webhook se o plano expirou
      if (planType === null) {
        await triggerWebhooks('plano_expirou', {
          id: data.id,
          email: data.email,
          nome: data.nome,
          whatsapp: data.whatsapp,
          expirou_em: new Date().toISOString(),
          plan_expiration: data.plan_expiration
        });
      }
      return data as User;
    } catch (error) {
      console.error('Error updating user plan:', error);
      return null;
    }
  }

  async getUserPlan(userId: string): Promise<'bronze' | 'ouro' | 'trial' | null> {
    try {
      const user = await this.getUserById(userId);
      return user?.plan_type || null;
    } catch (error) {
      console.error('Error getting user plan:', error);
      return null;
    }
  }

  // ============================================================================
  // NOTIFICATION METHODS
  // ============================================================================

  async getNotificationSettings(userId: string): Promise<NotificationSettings> {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('usuario_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found, create default
          return await this.createDefaultNotificationSettings(userId);
        }
        throw error;
      }

      return data as NotificationSettings;
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return await this.createDefaultNotificationSettings(userId);
    }
  }

  private async createDefaultNotificationSettings(userId: string): Promise<NotificationSettings> {
    const defaultSettings = {
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
      appointment_alerts: false
    };

    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .insert([defaultSettings])
        .select()
        .single();

      if (error) throw error;
      return data as NotificationSettings;
    } catch (error) {
      console.error('Error creating default notification settings:', error);
      // Return default settings even if DB insert fails
      return {
        id: 'temp',
        ...defaultSettings,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  }

  async updateNotificationSettings(userId: string, updates: Partial<Omit<NotificationSettings, 'id' | 'usuario_id' | 'created_at'>>): Promise<NotificationSettings> {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .update(updates)
        .eq('usuario_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data as NotificationSettings;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      // Return current settings if update fails
      return await this.getNotificationSettings(userId);
    }
  }

  async getNotificationHistory(userId: string, limit: number = 20): Promise<NotificationHistory[]> {
    try {
      console.log('📖 getNotificationHistory - Buscando para usuário:', userId, 'limit:', limit);

      const { data, error } = await supabase
        .from('notification_history')
        .select('*')
        .eq('usuario_id', userId)
        .order('data_criacao', { ascending: false })
        .limit(limit);

      if (error) throw error;

      console.log('📤 Retornando notificações do Supabase:', data?.length || 0);
      return data as NotificationHistory[];
    } catch (error) {
      console.error('Error getting notification history:', error);
      return [];
    }
  }

  async addNotificationHistory(notification: Omit<NotificationHistory, 'id' | 'data_criacao'>): Promise<NotificationHistory | null> {
    try {
      console.log('💾 addNotificationHistory - Adicionando notificação no Supabase:', notification);

      const { data, error } = await supabase
        .from('notification_history')
        .insert([notification])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Notificação salva no Supabase:', data);
      return data as NotificationHistory;
    } catch (error) {
      console.error('Error adding notification history:', error);
      return null;
    }
  }

  async markNotificationAsRead(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notification_history')
        .update({ 
          lida: true, 
          data_leitura: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) throw error;
      console.log('✅ Notification marked as read:', id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notification_history')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', userId)
        .eq('lida', false);

      if (error) throw error;
      
      console.log('🔢 getUnreadNotificationCount - Usuário:', userId, 'Não lidas:', count || 0);
      return count || 0;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  // ============================================================================
  // ADMIN NOTIFICATION METHODS
  // ============================================================================

  async sendAdminNotification(userIds: string[], titulo: string, mensagem: string): Promise<NotificationHistory[]> {
    console.log('📨 sendAdminNotification - Iniciando envio no Supabase:', {
      userIds,
      titulo,
      mensagem,
      totalUsers: userIds.length
    });

    const notifications: NotificationHistory[] = [];

    try {
      const notificationData = userIds.map(userId => ({
        usuario_id: userId,
        tipo: 'admin_message' as const,
        titulo,
        mensagem,
        icone: '📢',
        lida: false
      }));

      const { data, error } = await supabase
        .from('notification_history')
        .insert(notificationData)
        .select();

      if (error) throw error;

      console.log('🎯 sendAdminNotification - Concluído no Supabase:', {
        totalNotifications: data?.length || 0,
        notifications: data
      });

      return data as NotificationHistory[];
    } catch (error) {
      console.error('❌ Error sending admin notifications:', error);
      return [];
    }
  }

  async getAdminNotificationStats(): Promise<{
    total: number;
    sent_today: number;
    read_rate: number;
    recent_notifications: any[];
  }> {
    try {
      // Get all admin notifications
      const { data: allAdminNotifications, error: allError } = await supabase
        .from('notification_history')
        .select('*')
        .eq('tipo', 'admin_message');

      if (allError) throw allError;

      // Get today's notifications
      const today = getBrazilDateString();
      const { data: todayNotifications, error: todayError } = await supabase
        .from('notification_history')
        .select('*')
        .eq('tipo', 'admin_message')
        .gte('data_criacao', today);

      if (todayError) throw todayError;

      // Calculate stats
      const total = allAdminNotifications?.length || 0;
      const sentToday = todayNotifications?.length || 0;
      const readCount = allAdminNotifications?.filter(n => n.lida).length || 0;
      const readRate = total > 0 ? (readCount / total) * 100 : 0;

      // Get recent notifications with user names
      const { data: recentNotifications, error: recentError } = await supabase
        .from('notification_history')
        .select(`
          *,
          users!notification_history_usuario_id_fkey(nome)
        `)
        .eq('tipo', 'admin_message')
        .order('data_criacao', { ascending: false })
        .limit(10);

      if (recentError) throw recentError;

      const recentWithUserNames = recentNotifications?.map(notification => ({
        ...notification,
        user_name: notification.users?.nome || 'Usuário não encontrado'
      })) || [];

      return {
        total,
        sent_today: sentToday,
        read_rate: readRate,
        recent_notifications: recentWithUserNames
      };
    } catch (error) {
      console.error('Error getting admin notification stats:', error);
      return {
        total: 0,
        sent_today: 0,
        read_rate: 0,
        recent_notifications: []
      };
    }
  }

  // ============================================================================
  // CONFIGURATION METHODS
  // ============================================================================

  async getConfiguration(): Promise<any> {
    try {
      console.log('📖 getConfiguration - Buscando configuração no Supabase');
      
      const { data, error } = await supabase
        .from('configuration')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No configuration found, create default
          console.log('⚙️ Nenhuma configuração encontrada, criando padrão');
          return await this.createDefaultConfiguration();
        }
        throw error;
      }

      console.log('✅ Configuração carregada do Supabase:', data);
      return data;
    } catch (error) {
      console.error('Error getting configuration:', error);
      return await this.createDefaultConfiguration();
    }
  }

  private async createDefaultConfiguration(): Promise<any> {
    const defaultConfig = {
      instrucoes_personalizadas: 'Você é um assistente financeiro amigável e motivacional. Use emojis e seja positivo ao ajudar os usuários a organizarem seus gastos. Sempre parabenize quando eles registrarem gastos e dê dicas financeiras úteis.',
      modelo_usado: 'gpt-3.5-turbo',
      openai_api_key: '',
      criterios_sucesso: 'O usuário confirmou que suas dúvidas foram esclarecidas, expressou satisfação com as informações recebidas, ou indicou que não precisa de mais ajuda no momento.',
      situacoes_interrupcao: 'Usuário solicita falar com atendente humano, apresenta problema técnico complexo, demonstra insatisfação extrema, ou faz perguntas fora do escopo do assistente.',
      contexto_geral: 'Somos uma empresa de tecnologia focada em soluções financeiras inovadoras. Ajudamos pessoas a organizarem melhor seus gastos e tomarem decisões financeiras mais inteligentes.',
      instrucoes_individuais: 'Personalize a conversa com base no histórico do usuário: {{nome_usuario}}, {{historico_gastos}}, {{categoria_preferida}}.',
      mensagem_inicial: '👋 Olá! Sou seu assistente financeiro pessoal. Estou aqui para ajudar você a organizar seus gastos e melhorar sua vida financeira. Como posso te ajudar hoje?'
    };

    try {
      console.log('🔧 Criando configuração padrão no Supabase');
      
      const { data, error } = await supabase
        .from('configuration')
        .insert([defaultConfig])
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Configuração padrão criada:', data);
      return data;
    } catch (error) {
      console.error('Error creating default configuration:', error);
      // Return default config even if DB insert fails
      return {
        id: 'temp',
        ...defaultConfig,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  }

  async updateConfiguration(updates: any): Promise<any> {
    try {
      console.log('💾 updateConfiguration - Salvando no Supabase:', updates);
      
      // First, get the current configuration to get the ID
      const currentConfig = await this.getConfiguration();
      
      if (!currentConfig || currentConfig.id === 'temp') {
        // If no config exists or it's a temp one, create a new one
        console.log('🔧 Nenhuma configuração existente, criando nova');
        
        const { data, error } = await supabase
          .from('configuration')
          .insert([updates])
          .select()
          .single();

        if (error) throw error;
        
        console.log('✅ Nova configuração criada:', data);
        return data;
      } else {
        // Update existing configuration
        console.log('🔄 Atualizando configuração existente ID:', currentConfig.id);
        
        const { data, error } = await supabase
          .from('configuration')
          .update(updates)
          .eq('id', currentConfig.id)
          .select()
          .single();

        if (error) throw error;
        
        console.log('✅ Configuração atualizada:', data);
        return data;
      }
    } catch (error) {
      console.error('❌ Error updating configuration:', error);
      // Return current config if update fails
      return await this.getConfiguration();
    }
  }

  // ============================================================================
  // CONVERSATION METHODS
  // ============================================================================

  async addConversationMessage(userId: string, type: 'user' | 'assistant', content: string): Promise<any> {
    try {
      console.log('💬 addConversationMessage - Salvando mensagem no Supabase:', { userId, type, content: content.substring(0, 50) + '...' });
      
      const { data, error } = await supabase
        .from('conversation_history')
        .insert([{
          usuario_id: userId,
          type,
          content
        }])
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Mensagem salva no Supabase:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Error adding conversation message:', error);
      // Return a mock object to avoid breaking the chat
      return {
        id: Date.now().toString(),
        usuario_id: userId,
        type,
        content,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getConversationHistory(userId: string, limit: number = 10): Promise<any[]> {
    try {
      console.log('📖 getConversationHistory - Buscando histórico no Supabase para usuário:', userId);
      
      const { data, error } = await supabase
        .from('conversation_history')
        .select('*')
        .eq('usuario_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      // Return in chronological order (oldest first)
      const result = (data || []).reverse();
      console.log('📤 Histórico carregado do Supabase:', result.length, 'mensagens');
      return result;
    } catch (error) {
      console.error('❌ Error getting conversation history:', error);
      return [];
    }
  }

  async getUserPersonality(userId: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('user_personality')
        .select('*')
        .eq('usuario_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No personality found
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting user personality:', error);
      return null;
    }
  }

  async updateUserPersonality(userId: string, personalityUpdate: string): Promise<any> {
    try {
      // First try to update existing
      const { data: existing } = await supabase
        .from('user_personality')
        .select('*')
        .eq('usuario_id', userId)
        .single();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('user_personality')
          .update({
            personality_profile: personalityUpdate,
            conversation_count: (existing.conversation_count || 0) + 1,
            last_updated: new Date().toISOString()
          })
          .eq('usuario_id', userId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('user_personality')
          .insert([{
            usuario_id: userId,
            personality_profile: personalityUpdate,
            conversation_count: 1,
            last_updated: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error updating user personality:', error);
      // Return a mock object to avoid breaking the chat
      return {
        id: Date.now().toString(),
        usuario_id: userId,
        personality_profile: personalityUpdate,
        conversation_count: 1,
        last_updated: new Date().toISOString()
      };
    }
  }

  async getUserStats(userId: string): Promise<UserStats | null> {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('usuario_id', userId)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as UserStats;
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  }

  async getAllUserStats(): Promise<UserStats[]> {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*');
      if (error) throw error;
      return data as UserStats[];
    } catch (error) {
      console.error('Error getting all user stats:', error);
      return [];
    }
  }

  async getChatInteractionRanking(limit = 10): Promise<{ usuario_id: string, total_mensagens: number }[]> {
    try {
      const { data, error } = await supabase
        .from('conversation_history')
        .select('usuario_id')
        .limit(10000); // Ajuste conforme o volume de dados
      if (error) throw error;
      // Agrupa e conta no frontend
      const counts: Record<string, number> = {};
      for (const msg of data as any[]) {
        if (!msg.usuario_id) continue;
        counts[msg.usuario_id] = (counts[msg.usuario_id] || 0) + 1;
      }
      return Object.entries(counts)
        .map(([usuario_id, total_mensagens]) => ({ usuario_id, total_mensagens }))
        .sort((a, b) => b.total_mensagens - a.total_mensagens)
        .slice(0, limit);
    } catch (error) {
      console.error('Erro ao buscar ranking de interações do chat:', error);
      return [];
    }
  }

  async updateUserBlockedStatus(userId: string, isBlocked: boolean): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ is_blocked: isBlocked })
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return data as User;
    } catch (error) {
      console.error('Error updating user blocked status:', error);
      return null;
    }
  }

  // ==========================================================================
  // SALES METHODS
  // ==========================================================================
  async addSale(sale: Omit<Sale, 'id' | 'created_at'>): Promise<Sale | null> {
    try {
      const { data, error } = await supabase
        .from('vendas')
        .insert([sale])
        .select()
        .single();
      if (error) throw error;
      // Disparar webhook de venda realizada
      await triggerWebhooks('venda_realizada', data);
      return data as Sale;
    } catch (error) {
      console.error('Error adding sale:', error);
      return null;
    }
  }

  async getSales({ page = 1, perPage = 20, email, plano, startDate, endDate }: {
    page?: number;
    perPage?: number;
    email?: string;
    plano?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ sales: Sale[]; total: number }> {
    try {
      let query = supabase
        .from('vendas')
        .select('*', { count: 'exact' })
        .order('data_venda', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);
      if (email) query = query.ilike('email', `%${email}%`);
      if (plano) query = query.eq('plano', plano);
      if (startDate) query = query.gte('data_venda', startDate);
      if (endDate) query = query.lte('data_venda', endDate);
      const { data, error, count } = await query;
      if (error) throw error;
      return { sales: data as Sale[], total: count || 0 };
    } catch (error) {
      console.error('Error fetching sales:', error);
      return { sales: [], total: 0 };
    }
  }

  async updateSale(id: string, updates: Partial<Omit<Sale, 'id' | 'usuario_id' | 'created_at'>>): Promise<Sale | null> {
    try {
      const { data, error } = await supabase
        .from('vendas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Sale;
    } catch (error) {
      console.error('Error updating sale:', error);
      return null;
    }
  }

  async deleteSale(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('vendas')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting sale:', error);
    }
  }

  // ==========================================================================
  // MÉTODOS DE AGREGAÇÃO DE VENDAS PARA DASHBOARD
  // ==========================================================================
  async getSalesByPlan({ data_inicio, data_fim }: { data_inicio?: string, data_fim?: string } = {}): Promise<{ plano: string, total: number }[]> {
    let query = supabase
      .from('vendas')
      .select('plano')
    if (data_inicio) query = query.gte('data_venda', data_inicio);
    if (data_fim) query = query.lte('data_venda', data_fim);
    const { data, error } = await query;
    if (error) throw error;
    // Agrupa no frontend
    const grouped: Record<string, number> = {};
    (data as any[]).forEach(item => {
      grouped[item.plano] = (grouped[item.plano] || 0) + 1;
    });
    return Object.entries(grouped).map(([plano, total]) => ({ plano, total }));
  }

  async getSalesEvolution({ data_inicio, data_fim }: { data_inicio?: string, data_fim?: string } = {}): Promise<{ data: string, total: number }[]> {
    let query = supabase
      .from('vendas')
      .select('data_venda')
      .order('data_venda', { ascending: true });
    if (data_inicio) query = query.gte('data_venda', data_inicio);
    if (data_fim) query = query.lte('data_venda', data_fim);
    const { data, error } = await query;
    if (error) throw error;
    // Agrupa por data no frontend
    const grouped: Record<string, number> = {};
    (data as any[]).forEach(item => {
      grouped[item.data_venda] = (grouped[item.data_venda] || 0) + 1;
    });
    return Object.entries(grouped).map(([data, total]) => ({ data, total }));
  }

  // Atualiza nome e whatsapp do usuário
  async updateUser(userId: string, updates: { nome?: string; whatsapp?: string }): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return data as User;
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  }

  // Função para notificar compromissos que vão acontecer em 1h
  async checkAndNotifyUpcomingAppointments(): Promise<void> {
    const now = new Date();
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
    const inOneHourAndFive = new Date(now.getTime() + 65 * 60 * 1000);
    const { data: compromissos, error } = await supabase
      .from('compromissos')
      .select('*')
      .gte('data', inOneHour.toISOString())
      .lt('data', inOneHourAndFive.toISOString())
      .eq('notificado_1h', false);
    if (error) {
      console.error('Erro ao buscar compromissos para notificação:', error);
      return;
    }
    for (const compromisso of compromissos || []) {
      await triggerWebhooks('compromisso', compromisso);
      await supabase
        .from('compromissos')
        .update({ notificado_1h: true })
        .eq('id', compromisso.id);
    }
  }
}

export const supabaseDatabase = SupabaseDatabase.getInstance(); 