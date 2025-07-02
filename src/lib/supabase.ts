import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
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
          data_criacao: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          email: string;
          is_admin?: boolean;
          data_criacao?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          email?: string;
          is_admin?: boolean;
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
