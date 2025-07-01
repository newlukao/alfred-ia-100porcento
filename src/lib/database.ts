
export interface User {
  id: string;
  nome: string;
  email: string;
  data_criacao: string;
  is_admin?: boolean;
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
  updated_at: string;
}

// Mock database service - In real app, this would connect to Supabase
export class DatabaseService {
  private users: User[] = [
    {
      id: '1',
      nome: 'Usuário Demo',
      email: 'demo@exemplo.com',
      data_criacao: new Date().toISOString(),
      is_admin: false
    },
    {
      id: 'admin',
      nome: 'Administrador',
      email: 'admin@exemplo.com',
      data_criacao: new Date().toISOString(),
      is_admin: true
    }
  ];

  private expenses: Expense[] = [
    {
      id: '1',
      usuario_id: '1',
      valor: 45.50,
      categoria: 'mercado',
      descricao: 'Compras do supermercado',
      data: '2025-01-01',
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      usuario_id: '1',
      valor: 20.00,
      categoria: 'transporte',
      descricao: 'Uber para o trabalho',
      data: '2025-01-01',
      created_at: new Date().toISOString()
    }
  ];

  private config: Configuration = {
    id: '1',
    instrucoes_personalizadas: 'Você é um assistente financeiro amigável. Use emojis e seja motivacional. Ajude o usuário a organizar seus gastos de forma positiva.',
    modelo_usado: 'gpt-3.5-turbo',
    updated_at: new Date().toISOString()
  };

  async getUser(id: string): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.users.find(user => user.email === email) || null;
  }

  async createUser(userData: Omit<User, 'id' | 'data_criacao'>): Promise<User> {
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      data_criacao: new Date().toISOString()
    };
    this.users.push(newUser);
    return newUser;
  }

  async getExpenses(userId: string): Promise<Expense[]> {
    return this.expenses.filter(expense => expense.usuario_id === userId);
  }

  async addExpense(expenseData: Omit<Expense, 'id' | 'created_at'>): Promise<Expense> {
    const newExpense: Expense = {
      ...expenseData,
      id: Date.now().toString(),
      created_at: new Date().toISOString()
    };
    this.expenses.push(newExpense);
    return newExpense;
  }

  async getAllExpenses(): Promise<Expense[]> {
    return this.expenses;
  }

  async getAllUsers(): Promise<User[]> {
    return this.users;
  }

  async getConfiguration(): Promise<Configuration> {
    return this.config;
  }

  async updateConfiguration(updates: Partial<Configuration>): Promise<Configuration> {
    this.config = {
      ...this.config,
      ...updates,
      updated_at: new Date().toISOString()
    };
    return this.config;
  }

  async deleteExpense(id: string): Promise<boolean> {
    const index = this.expenses.findIndex(expense => expense.id === id);
    if (index > -1) {
      this.expenses.splice(index, 1);
      return true;
    }
    return false;
  }
}

export const database = new DatabaseService();
