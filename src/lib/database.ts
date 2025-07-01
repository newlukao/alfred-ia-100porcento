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
  criterios_sucesso: string;
  situacoes_interrupcao: string;
  contexto_geral: string;
  instrucoes_individuais: string;
  mensagem_inicial: string;
  updated_at: string;
}

export interface UserPersonality {
  id: string;
  usuario_id: string;
  personality_profile: string;
  conversation_count: number;
  last_updated: string;
}

export interface ConversationHistory {
  id: string;
  usuario_id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
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

  private configuration: Configuration;

  private userPersonalities: UserPersonality[] = [];
  private conversationHistories: ConversationHistory[] = [];

  constructor() {
    // Load configuration from localStorage or use default
    const savedConfig = localStorage.getItem('app_configuration');
    if (savedConfig) {
      this.configuration = JSON.parse(savedConfig);
    } else {
      this.configuration = {
        id: '1',
        instrucoes_personalizadas: 'Você é um assistente financeiro amigável e motivacional. Use emojis e seja positivo ao ajudar os usuários a organizarem seus gastos. Sempre parabenize quando eles registrarem gastos e dê dicas financeiras úteis.',
        modelo_usado: 'gpt-3.5-turbo',
        openai_api_key: '',
        criterios_sucesso: 'O usuário confirmou que suas dúvidas foram esclarecidas, expressou satisfação com as informações recebidas, ou indicou que não precisa de mais ajuda no momento.',
        situacoes_interrupcao: 'Usuário solicita falar com atendente humano, apresenta problema técnico complexo, demonstra insatisfação extrema, ou faz perguntas fora do escopo do assistente.',
        contexto_geral: 'Somos uma empresa de tecnologia focada em soluções financeiras inovadoras. Ajudamos pessoas a organizarem melhor seus gastos e tomarem decisões financeiras mais inteligentes.',
        instrucoes_individuais: 'Personalize a conversa com base no histórico do usuário: {{nome_usuario}}, {{historico_gastos}}, {{categoria_preferida}}.',
        mensagem_inicial: '👋 Olá! Sou seu assistente financeiro pessoal. Estou aqui para ajudar você a organizar seus gastos e melhorar sua vida financeira. Como posso te ajudar hoje?',
        updated_at: new Date().toISOString()
      };
    }

    // Load expenses from localStorage
    const savedExpenses = localStorage.getItem('app_expenses');
    if (savedExpenses) {
      this.expenses = JSON.parse(savedExpenses);
    }

    // Load user personalities from localStorage
    const savedPersonalities = localStorage.getItem('app_user_personalities');
    if (savedPersonalities) {
      this.userPersonalities = JSON.parse(savedPersonalities);
    }

    // Load conversation histories from localStorage
    const savedHistories = localStorage.getItem('app_conversation_histories');
    if (savedHistories) {
      this.conversationHistories = JSON.parse(savedHistories);
    }
  }

  private saveConfiguration() {
    localStorage.setItem('app_configuration', JSON.stringify(this.configuration));
  }

  private saveExpenses() {
    localStorage.setItem('app_expenses', JSON.stringify(this.expenses));
  }

  private saveUserPersonalities() {
    localStorage.setItem('app_user_personalities', JSON.stringify(this.userPersonalities));
  }

  private saveConversationHistories() {
    localStorage.setItem('app_conversation_histories', JSON.stringify(this.conversationHistories));
  }

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
    this.saveExpenses();
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
    this.saveConfiguration();
    return { ...this.configuration };
  }

  async getUserPersonality(userId: string): Promise<UserPersonality | null> {
    return this.userPersonalities.find(p => p.usuario_id === userId) || null;
  }

  async updateUserPersonality(userId: string, personalityUpdate: string): Promise<UserPersonality> {
    const existing = this.userPersonalities.find(p => p.usuario_id === userId);
    
    if (existing) {
      existing.personality_profile = personalityUpdate;
      existing.conversation_count += 1;
      existing.last_updated = new Date().toISOString();
    } else {
      const newPersonality: UserPersonality = {
        id: (this.userPersonalities.length + 1).toString(),
        usuario_id: userId,
        personality_profile: personalityUpdate,
        conversation_count: 1,
        last_updated: new Date().toISOString()
      };
      this.userPersonalities.push(newPersonality);
    }
    
    this.saveUserPersonalities();
    return this.userPersonalities.find(p => p.usuario_id === userId)!;
  }

  async addConversationMessage(userId: string, type: 'user' | 'assistant', content: string): Promise<ConversationHistory> {
    const newMessage: ConversationHistory = {
      id: (Date.now() + Math.random()).toString(),
      usuario_id: userId,
      type,
      content,
      timestamp: new Date().toISOString()
    };
    
    this.conversationHistories.push(newMessage);
    
    // Keep only last 50 messages per user to avoid memory issues
    const userMessages = this.conversationHistories.filter(h => h.usuario_id === userId);
    if (userMessages.length > 50) {
      const toRemove = userMessages.slice(0, userMessages.length - 50);
      this.conversationHistories = this.conversationHistories.filter(h => 
        !toRemove.some(r => r.id === h.id)
      );
    }
    
    this.saveConversationHistories();
    return newMessage;
  }

  async getConversationHistory(userId: string, limit: number = 10): Promise<ConversationHistory[]> {
    return this.conversationHistories
      .filter(h => h.usuario_id === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
      .reverse(); // Return in chronological order
  }

  async deleteExpense(id: string): Promise<void> {
    const index = this.expenses.findIndex(expense => expense.id === id);
    if (index > -1) {
      this.expenses.splice(index, 1);
      this.saveExpenses();
    }
  }
}

export const database = new MockDatabase();
