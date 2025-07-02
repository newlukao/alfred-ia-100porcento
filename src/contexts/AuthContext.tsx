import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, database } from '@/lib/database';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // LIMPEZA FORÇADA - Remove dados antigos com IDs incorretos
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Se o ID não é um UUID válido, remove do localStorage
        if (!parsedUser.id || parsedUser.id.length < 30) {
          console.log('🔧 Removendo usuário com ID inválido:', parsedUser.id);
          localStorage.removeItem('auth_user');
          setUser(null);
        } else {
          setUser(parsedUser);
        }
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('auth_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Simple auth - usando UUIDs corretos para compatibilidade com Supabase
      let foundUser: User | null = null;
      
      if (email === 'demo@exemplo.com' && password === 'demo') {
        foundUser = {
          id: '550e8400-e29b-41d4-a716-446655440001', // UUID correto para Demo User
          nome: 'Demo User',
          email: 'demo@exemplo.com',
          is_admin: false,
          data_criacao: new Date().toISOString()
        };
      } else if (email === 'admin@exemplo.com' && password === 'admin') {
        foundUser = {
          id: '550e8400-e29b-41d4-a716-446655440002', // UUID correto para Admin User
          nome: 'Admin User',
          email: 'admin@exemplo.com',
          is_admin: true,
          data_criacao: new Date().toISOString()
        };
      }
      
      if (foundUser) {
        setUser(foundUser);
        localStorage.setItem('auth_user', JSON.stringify(foundUser));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
