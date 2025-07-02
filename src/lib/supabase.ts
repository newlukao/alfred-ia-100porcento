import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log das variáveis para debug
console.log('🔧 SUPABASE CONFIG DEBUG:', {
  url: supabaseUrl ? 'CONFIGURADO' : 'FALTANDO',
  key: supabaseAnonKey ? 'CONFIGURADO' : 'FALTANDO',
  urlValue: supabaseUrl,
  keyValue: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'undefined'
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ SUPABASE NÃO CONFIGURADO!');
  console.error('📋 Crie um arquivo .env.local na raiz do projeto com:');
  console.error('VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co');
  console.error('VITE_SUPABASE_ANON_KEY=SUA_CHAVE_AQUI');
  throw new Error('❌ Missing Supabase environment variables. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Types para o banco de dados
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          nome: string;
          email: string;
          is_admin: boolean;
          plan_type: 'bronze' | 'ouro';
          data_criacao: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          email: string;
          is_admin?: boolean;
          plan_type?: 'bronze' | 'ouro';
          data_criacao?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          email?: string;
          is_admin?: boolean;
          plan_type?: 'bronze' | 'ouro';
          data_criacao?: string;
          updated_at?: string;
        };
      };
      expenses: {
        Row: {
          id: string;
          usuario_id: string;
          valor: number;
          categoria: string;
          descricao: string;
          data: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          valor: number;
          categoria: string;
          descricao: string;
          data: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          usuario_id?: string;
          valor?: number;
          categoria?: string;
          descricao?: string;
          data?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      incomes: {
        Row: {
          id: string;
          user_id: string;
          description: string;
          amount: number;
          category: string;
          date: string;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          description: string;
          amount: number;
          category: string;
          date: string;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          description?: string;
          amount?: number;
          category?: string;
          date?: string;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      notification_history: {
        Row: {
          id: string;
          usuario_id: string;
          tipo: string;
          titulo: string;
          mensagem: string;
          icone: string;
          lida: boolean;
          data_criacao: string;
          data_leitura: string | null;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          tipo: string;
          titulo: string;
          mensagem: string;
          icone: string;
          lida?: boolean;
          data_criacao?: string;
          data_leitura?: string | null;
        };
        Update: {
          id?: string;
          usuario_id?: string;
          tipo?: string;
          titulo?: string;
          mensagem?: string;
          icone?: string;
          lida?: boolean;
          data_criacao?: string;
          data_leitura?: string | null;
        };
      };
      notification_settings: {
        Row: {
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
        };
        Insert: {
          id?: string;
          usuario_id: string;
          budget_alerts?: boolean;
          goal_progress?: boolean;
          daily_reminders?: boolean;
          achievement_unlocks?: boolean;
          expense_limits?: boolean;
          weekly_summaries?: boolean;
          push_enabled?: boolean;
          email_enabled?: boolean;
          quiet_hours_start?: string;
          quiet_hours_end?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          usuario_id?: string;
          budget_alerts?: boolean;
          goal_progress?: boolean;
          daily_reminders?: boolean;
          achievement_unlocks?: boolean;
          expense_limits?: boolean;
          weekly_summaries?: boolean;
          push_enabled?: boolean;
          email_enabled?: boolean;
          quiet_hours_start?: string;
          quiet_hours_end?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
