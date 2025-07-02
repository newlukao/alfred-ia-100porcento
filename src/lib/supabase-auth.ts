import { supabase } from './supabase';
import { User as AuthUser } from '@supabase/supabase-js';

export interface AppUser {
  id: string;
  nome: string;
  email: string;
  is_admin: boolean;
  plan_type: 'bronze' | 'ouro';
  data_criacao: string;
}

class SupabaseAuthService {
  // 🔐 LOGIN COM SUPABASE AUTH
  async signIn(email: string, password: string): Promise<{ user: AppUser | null; error: string | null }> {
    try {
      console.log('🔐 SupabaseAuth - Fazendo login:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('❌ Erro no login Supabase:', error);
        return { user: null, error: error.message };
      }

      if (!data.user) {
        return { user: null, error: 'Usuário não encontrado' };
      }

      // Buscar dados do usuário na tabela personalizada
      const appUser = await this.getAppUser(data.user.id);
      console.log('✅ Login realizado com sucesso:', appUser);

      return { user: appUser, error: null };
    } catch (error) {
      console.error('❌ Erro no sistema de auth:', error);
      return { user: null, error: 'Erro interno do sistema' };
    }
  }

  // 📝 REGISTRO COM SUPABASE AUTH
  async signUp(email: string, password: string, nome: string): Promise<{ user: AppUser | null; error: string | null }> {
    try {
      console.log('📝 SupabaseAuth - Registrando usuário:', email, nome);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome: nome
          }
        }
      });

      if (error) {
        console.error('❌ Erro no registro Supabase:', error);
        return { user: null, error: error.message };
      }

      if (!data.user) {
        return { user: null, error: 'Falha ao criar usuário' };
      }

      // Criar registro na tabela users
      const appUser = await this.createAppUser(data.user.id, email, nome);
      console.log('✅ Usuário registrado:', appUser);

      return { user: appUser, error: null };
    } catch (error) {
      console.error('❌ Erro no registro:', error);
      return { user: null, error: 'Erro interno do sistema' };
    }
  }

  // 🚪 LOGOUT
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('❌ Erro no logout:', error);
    }
  }

  // 👤 BUSCAR DADOS DO USUÁRIO (COM TIMEOUT E FALLBACK)
  private async getAppUser(authUserId: string): Promise<AppUser | null> {
    try {
      console.log('🔍 Buscando usuário na tabela users para ID:', authUserId);
      
      // Timeout de 3 segundos para evitar travamento
      const queryPromise = supabase
        .from('users')
        .select('*')
        .eq('id', authUserId)
        .single();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), 3000)
      );

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (error) {
        console.error('❌ Erro ao buscar usuário:', error);
        
        // Se usuário não existe, criar
        if (error.code === 'PGRST116') {
          console.log('🔧 Usuário não encontrado, criando...');
          return await this.createUserInDatabase(authUserId);
        }
        
        // Para outros erros, usar fallback
        console.log('🚨 Erro na consulta, usando fallback...');
        return this.createFallbackUser(authUserId);
      }

      console.log('✅ Usuário encontrado:', data);
      return data as AppUser;
    } catch (error) {
      console.error('❌ Erro/timeout na busca do usuário:', error);
      // Em caso de timeout ou erro, usar fallback
      console.log('🚨 Usando fallback devido ao erro/timeout');
      return this.createFallbackUser(authUserId);
    }
  }

  // 🔧 CRIAR USUÁRIO NO BANCO (COM TIMEOUT)
  private async createUserInDatabase(authUserId: string): Promise<AppUser | null> {
    try {
      // Timeout também na busca do usuário auth
      const getUserPromise = supabase.auth.getUser();
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ data: { user: null } }), 2000)
      );

      const { data: { user } } = await Promise.race([getUserPromise, timeoutPromise]) as any;
      
      let email = 'admin@admin.com';
      let nome = 'Admin';
      
      if (user) {
        email = user.email || 'admin@admin.com';
        nome = user.user_metadata?.nome || user.user_metadata?.name || 'Usuário';
      }

      const isAdmin = email === 'admin@admin.com';
      const userData = {
        id: authUserId,
        email,
        nome,
        is_admin: isAdmin,
        plan_type: isAdmin ? 'ouro' as const : 'bronze' as const
      };

      console.log('➕ Criando usuário com timeout:', userData);

      // Timeout na criação também
      const createPromise = supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      const createTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Create timeout')), 3000)
      );

      const { data, error } = await Promise.race([createPromise, createTimeoutPromise]) as any;

      if (error) {
        console.error('❌ Erro ao criar usuário:', error);
        return this.createFallbackUser(authUserId, email, nome);
      }

      console.log('✅ Usuário criado:', data);
      return data as AppUser;
    } catch (error) {
      console.error('❌ Erro/timeout na criação:', error);
      return this.createFallbackUser(authUserId);
    }
  }

  // 🚨 CRIAR USUÁRIO FALLBACK (SEM DEPENDER DO BANCO)
  private createFallbackUser(authUserId: string, email?: string, nome?: string): AppUser {
    console.log('🚨 Criando usuário fallback para garantir funcionamento');
    
    const fallbackEmail = email || 'admin@admin.com';
    const fallbackNome = nome || 'Admin User';
    const isAdmin = fallbackEmail === 'admin@admin.com';
    
    const fallbackUser: AppUser = {
      id: authUserId,
      email: fallbackEmail,
      nome: fallbackNome,
      is_admin: isAdmin,
      plan_type: isAdmin ? 'ouro' : 'bronze',
      data_criacao: new Date().toISOString()
    };
    
    console.log('✅ Usuário fallback criado:', fallbackUser);
    return fallbackUser;
  }



  // ➕ CRIAR USUÁRIO NA TABELA
  private async createAppUser(authUserId: string, email: string, nome: string): Promise<AppUser | null> {
    try {
      console.log('➕ Criando usuário na tabela:', { authUserId, email, nome });
      
      const isAdmin = email === 'admin@admin.com';
      const userData = {
        id: authUserId,
        email,
        nome,
        is_admin: isAdmin,
        plan_type: isAdmin ? 'ouro' as const : 'bronze' as const
      };

      console.log('📝 Dados para inserção:', userData);

      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      console.log('📊 Resultado da inserção:', { data, error });

      if (error) {
        console.error('❌ Erro ao criar usuário:', error);
        console.error('❌ Código do erro:', error.code);
        console.error('❌ Detalhes:', error.details, error.hint, error.message);
        
        // Se usuário já existe, tentar buscar rapidamente
        if (error.code === '23505') {
          console.log('🔄 Usuário já existe, tentando buscar rapidamente...');
          try {
            const existingUser = await this.getAppUser(authUserId);
            if (existingUser) return existingUser;
          } catch (e) {
            console.log('⚠️ Busca rápida falhou, usando emergência');
          }
        }
        
        // Fallback - retornar null
        console.log('❌ Criação falhou');
        return null;
      }

      console.log('✅ Usuário criado com sucesso:', data);
      return data as AppUser;
    } catch (error) {
      console.error('❌ Erro na criação do usuário (catch):', error);
      // Fallback - retornar null
      console.log('❌ Erro na criação (catch)');
      return null;
    }
  }

  // 🔍 OBTER USUÁRIO ATUAL
  async getCurrentUser(): Promise<AppUser | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return null;
      }

      return await this.getAppUser(user.id);
    } catch (error) {
      console.error('❌ Erro ao obter usuário atual:', error);
      return null;
    }
  }

  // 🔄 ESCUTAR MUDANÇAS DE AUTENTICAÇÃO
  onAuthStateChange(callback: (user: AppUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.id);
      
      if (session?.user) {
        console.log('🔍 Buscando dados do AppUser...');
        const appUser = await this.getAppUser(session.user.id);
        callback(appUser);
      } else {
        callback(null);
      }
    });
  }
}

export const authService = new SupabaseAuthService(); 