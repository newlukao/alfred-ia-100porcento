export interface User {
  id: string;
  nome: string;
  email: string;
  is_admin: boolean;
  data_criacao: string;
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
  updated_at: string;
}

class MockDatabase {
  private users: User[] = [
    {
      id: '1',
      nome: 'Demo User',
      email: 'demo@exemplo.com',
      is_admin: false,
      data_criacao: new Date().toISOString()
    },
    {
      id: '2',
      nome: 'Admin User',
      email: 'admin@exemplo.com',
      is_admin: true,
      data_criacao: new Date().toISOString()
    }
  ];

  private expenses: Expense[] = [
    {
      id: '1',
      usuario_id: '1',
      valor: 45.50,
      categoria: 'mercado',
      descricao: 'Compras do supermercado',
      data: '2024-01-15',
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      usuario_id: '1',
      valor: 25.00,
      categoria: 'transporte',
      descricao: 'Uber para o trabalho',
      data: '2024-01-15',
      created_at: new Date().toISOString()
    }
  ];

  private configuration: Configuration = {
    id: '1',
    instrucoes_personalizadas: 'Você é um assistente financeiro amigável e motivacional. Use emojis e seja positivo ao ajudar os usuários a organizarem seus gastos. Sempre parabenize quando eles registrarem gastos e dê dicas financeiras úteis.',
    modelo_usado: 'gpt-3.5-turbo',
    openai_api_key: '',
    updated_at: new Date().toISOString()
  };

  async getUserByEmail(email: string): Promise<User | null> {
    return this.users.find(user => user.email === email) || null;
  }

  async getAllUsers(): Promise<User[]> {
    return [...this.users];
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
    return newExpense;
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

  async deleteExpense(id: string): Promise<void> {
    const index = this.expenses.findIndex(expense => expense.id === id);
    if (index > -1) {
      this.expenses.splice(index, 1);
    }
  }
}

export const database = new MockDatabase();
