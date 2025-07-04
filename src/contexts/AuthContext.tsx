import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { authService, AppUser } from '@/lib/supabase-auth';
import { triggerWebhooks } from '@/lib/webhooks';

interface AuthContextType {
  user: AppUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, nome: string, whatsapp: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('🚀 AuthContext - Inicializando com Supabase Auth');
          
    // Verificar se já existe um usuário logado
    const initializeAuth = async () => {
      try {
        console.log('🔍 AuthContext - Verificando usuário atual...');
        const currentUser = await authService.getCurrentUser();
        
        if (currentUser) {
          console.log('✅ AuthContext - Usuário encontrado:', currentUser);
          setUser(currentUser);
        } else {
          console.log('ℹ️ AuthContext - Nenhum usuário logado');
        }
      } catch (error) {
        console.error('❌ Erro ao inicializar auth:', error);
      } finally {
        console.log('🏁 AuthContext - Finalizando inicialização');
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      console.log('🔄 AuthContext - Estado mudou:', user ? `Usuário: ${user.email}` : 'Logout');
      setUser(user);
      setIsLoading(false);
    });

    return () => {
      console.log('🧹 AuthContext - Cleanup subscription');
      subscription?.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔐 AuthContext - Fazendo login:', email);
      
      const { user: loggedUser, error } = await authService.signIn(email, password);
      
      if (error) {
        console.error('❌ AuthContext - Erro no login:', error);
        return { success: false, error };
      }

      if (loggedUser) {
        console.log('✅ AuthContext - Login bem-sucedido:', loggedUser);
        setUser(loggedUser);
        return { success: true };
      }

      return { success: false, error: 'Credenciais inválidas' };
    } catch (error) {
      console.error('❌ AuthContext - Erro no login:', error);
      return { success: false, error: 'Erro interno do sistema' };
    }
  }, []);

    const register = useCallback(async (email: string, password: string, nome: string, whatsapp: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('📝 AuthContext - Registrando usuário:', email, nome, whatsapp);
      
      const { user: newUser, error } = await authService.signUp(email, password, nome, whatsapp);
      
      if (error) {
        console.error('❌ AuthContext - Erro no registro:', error);
        return { success: false, error };
      }
      
      if (newUser) {
        console.log('✅ AuthContext - Registro bem-sucedido:', newUser);
        setUser(newUser);
        // Disparar webhook de criação de conta
        await triggerWebhooks('criou_conta', {
          id: newUser.id,
          email: newUser.email,
          nome: newUser.nome,
          whatsapp: newUser.whatsapp,
          data_criacao: newUser.data_criacao
        });
        return { success: true };
      }

      return { success: false, error: 'Falha ao registrar usuário' };
    } catch (error) {
      console.error('❌ AuthContext - Erro no registro:', error);
      return { success: false, error: 'Erro interno do sistema' };
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      console.log('🚪 AuthContext - Fazendo logout');
      await authService.signOut();
	setUser(null);
      console.log('✅ AuthContext - Logout realizado');
    } catch (error) {
      console.error('❌ AuthContext - Erro no logout:', error);
    }
  }, []);

  const contextValue = useMemo(() => ({
    user,
    login,
    register,
    logout,
    isLoading
  }), [user, login, register, logout, isLoading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
