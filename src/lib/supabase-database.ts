import { supabase } from './supabase';
import { User, Expense, NotificationSettings, NotificationHistory } from './database';

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
      quiet_hours_end: '08:00'
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
      const today = new Date().toISOString().split('T')[0];
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
}

export const supabaseDatabase = SupabaseDatabase.getInstance(); 