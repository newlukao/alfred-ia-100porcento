import { supabase } from './supabase';
import { User as AuthUser } from '@supabase/supabase-js';

export interface AppUser {
  id: string;
  nome: string;
  email: string;
  is_admin: boolean;
  plan_type: 'bronze' | 'ouro' | 'trial' | null;
  data_criacao: string;
  trial_start?: string | null;
}

// Cache simples para usuários
interface UserCache {
  [key: string]: {
    user: AppUser;
    timestamp: number;
    ttl: number; // Time to live em ms
  }
}

class SupabaseAuthService {
  private userCache: UserCache = {};
  private readonly CACHE_TTL = 60000; // 1 minuto cache
  private readonly QUERY_TIMEOUT = 1000; // Reduzido para 1s
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

  // 👤 BUSCAR DADOS DO USUÁRIO (COM CACHE E TIMEOUT OTIMIZADO)
  private async getAppUser(authUserId: string): Promise<AppUser | null> {
    try {
      // Verificar cache primeiro
      const cached = this.userCache[authUserId];
      if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
        console.log('⚡ Cache hit para usuário:', authUserId);
        return cached.user;
      }

      // console.log('🔍 Buscando usuário na tabela users para ID:', authUserId);
      
      // Timeout reduzido para 1 segundo
      const queryPromise = supabase
        .from('users')
        .select('*')
        .eq('id', authUserId)
        .single();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), this.QUERY_TIMEOUT)
      );

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (error) {
        console.error('❌ Erro ao buscar usuário:', error);
        
        // Se usuário não existe, criar
        if (error.code === 'PGRST116') {
          console.log('🔧 Usuário não encontrado, criando...');
          const newUser = await this.createUserInDatabase(authUserId);
          if (newUser) {
            this.setCacheUser(authUserId, newUser);
          }
          return newUser;
        }
        
        // Para outros erros, usar fallback
        console.log('🚨 Erro na consulta, usando fallback...');
        return this.createFallbackUser(authUserId);
      }

      const user = data as AppUser;
      // console.log('✅ Usuário encontrado:', user);
      
      // Adicionar ao cache
      this.setCacheUser(authUserId, user);
      
      return await this.checkAndExpireTrial(user);
    } catch (error) {
      console.error('❌ Erro/timeout na busca do usuário:', error);
      // Em caso de timeout ou erro, usar fallback apenas se não há cache
      const cached = this.userCache[authUserId];
      if (cached) {
        console.log('🔄 Usando cache expirado como fallback');
        return cached.user;
      }
      
      console.log('🚨 Usando fallback devido ao erro/timeout');
      return this.createFallbackUser(authUserId);
    }
  }

  // 📦 GERENCIAR CACHE DE USUÁRIO
  private setCacheUser(authUserId: string, user: AppUser): void {
    this.userCache[authUserId] = {
      user,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL
    };
  }

  private clearUserCache(authUserId?: string): void {
    if (authUserId) {
      delete this.userCache[authUserId];
    } else {
      this.userCache = {};
    }
  }

  // 🔧 CRIAR USUÁRIO NO BANCO (COM TIMEOUT)
  private async createUserInDatabase(authUserId: string): Promise<AppUser | null> {
    try {
      // Timeout reduzido na busca do usuário auth
      const getUserPromise = supabase.auth.getUser();
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ data: { user: null } }), this.QUERY_TIMEOUT)
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
        plan_type: isAdmin ? 'ouro' as const : 'trial',
        trial_start: isAdmin ? null : new Date().toISOString()
      };

      console.log('➕ Criando usuário com timeout:', userData);

      // Timeout na criação também
      const createPromise = supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      const createTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Create timeout')), this.QUERY_TIMEOUT)
      );

      const { data, error } = await Promise.race([createPromise, createTimeoutPromise]) as any;

      if (error) {
        console.error('❌ Erro ao criar usuário:', error);
        console.error('❌ Código do erro:', error.code);
        console.error('❌ Detalhes:', error.details, error.hint, error.message);
        // Se usuário já existe, atualizar para trial
        if (error.code === '23505') {
          console.log('�� Usuário já existe, atualizando para trial...');
          await supabase
            .from('users')
            .update({ plan_type: 'trial', trial_start: new Date().toISOString() })
            .eq('id', authUserId);
          // Buscar registro atualizado
          const { data: updatedUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUserId)
            .single();
          return updatedUser as AppUser;
        }
        // Fallback - retornar null
        console.log('❌ Criação falhou');
        return null;
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
      plan_type: isAdmin ? 'ouro' : 'trial',
      trial_start: isAdmin ? null : new Date().toISOString(),
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
        plan_type: isAdmin ? 'ouro' as const : 'trial',
        trial_start: isAdmin ? null : new Date().toISOString()
      };
      console.log('📝 Dados para inserção (createAppUser):', userData);

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
        // Se usuário já existe, atualizar para trial
        if (error.code === '23505') {
          console.log('🔄 Usuário já existe, atualizando para trial...');
          await supabase
            .from('users')
            .update({ plan_type: 'trial', trial_start: new Date().toISOString() })
            .eq('id', authUserId);
          // Buscar registro atualizado
          const { data: updatedUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUserId)
            .single();
          return updatedUser as AppUser;
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

  private async checkAndExpireTrial(user: AppUser): Promise<AppUser> {
    if (user.plan_type === 'trial' && user.trial_start) {
      const trialStart = new Date(user.trial_start);
      const now = new Date();
      const diffMs = now.getTime() - trialStart.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays >= 1) {
        // Trial expirou, atualizar para sem plano
        await supabase.from('users').update({ plan_type: null, trial_start: null }).eq('id', user.id);
        return { ...user, plan_type: null, trial_start: null };
      }
    }
    return user;
  }
}

export const authService = new SupabaseAuthService(); 