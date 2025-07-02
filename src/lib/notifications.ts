export interface NotificationSettings {
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
  quiet_hours_start: string; // "22:00"
  quiet_hours_end: string; // "08:00"
  created_at: string;
  updated_at: string;
}

export interface NotificationHistory {
  id: string;
  usuario_id: string;
  tipo: 'budget_alert' | 'goal_progress' | 'daily_reminder' | 'achievement' | 'expense_limit' | 'weekly_summary';
  titulo: string;
  mensagem: string;
  icone: string;
  lida: boolean;
  data_criacao: string;
  data_leitura?: string;
}

export class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  private constructor() {
    this.requestPermission();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      this.permission = await Notification.requestPermission();
      return this.permission;
    }
    return 'denied';
  }

  async sendNotification(title: string, options: NotificationOptions & { 
    tag?: string;
    badge?: string;
    vibrate?: number[];
    data?: any;
  }): Promise<void> {
    if (this.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      if (this.serviceWorkerRegistration) {
        await this.serviceWorkerRegistration.showNotification(title, {
          ...options,
          badge: '/favicon.ico'
        });
      } else {
        new Notification(title, options);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  // Budget alerts
  async sendBudgetAlert(categoria: string, percentage: number, spent: number, budget: number): Promise<void> {
    const title = percentage >= 100 ? '🚨 Orçamento Estourado!' : '⚠️ Alerta de Orçamento';
    const message = percentage >= 100 
      ? `Você estourou o orçamento de ${categoria}! Gastou R$ ${spent.toFixed(2)} de R$ ${budget.toFixed(2)}`
      : `Você já gastou ${percentage.toFixed(1)}% do orçamento de ${categoria}`;

    await this.sendNotification(title, {
      body: message,
      icon: '/favicon.ico',
      tag: `budget-${categoria}`,
      data: { type: 'budget_alert', categoria, percentage, spent, budget }
    });
  }

  // Goal progress notifications
  async sendGoalProgress(goalTitle: string, percentage: number, isCompleted: boolean): Promise<void> {
    const title = isCompleted ? '🎉 Meta Concluída!' : '📈 Progresso da Meta';
    const message = isCompleted 
      ? `Parabéns! Você completou a meta: ${goalTitle}`
      : `Você está ${percentage.toFixed(1)}% próximo de completar: ${goalTitle}`;

    await this.sendNotification(title, {
      body: message,
      icon: '/favicon.ico',
      tag: `goal-${goalTitle}`,
      data: { type: 'goal_progress', goalTitle, percentage, isCompleted }
    });
  }

  // Achievement notifications
  async sendAchievementUnlock(title: string, description: string, points: number): Promise<void> {
    await this.sendNotification('🏆 Conquista Desbloqueada!', {
      body: `${title} - ${description} (+${points} pontos)`,
      icon: '/favicon.ico',
      tag: `achievement-${title}`,
      data: { type: 'achievement', title, description, points }
    });
  }

  // Daily reminders
  async sendDailyReminder(): Promise<void> {
    const messages = [
      'Não esqueça de registrar seus gastos de hoje! 💰',
      'Como estão suas finanças hoje? Registre seus gastos! 📊',
      'Mantenha o controle! Já registrou seus gastos? 🎯',
      'Seu assistente financeiro está esperando! Registre seus gastos 📱',
      'Continue sua sequência! Registre os gastos de hoje 🔥'
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    await this.sendNotification('📅 Lembrete Diário', {
      body: randomMessage,
      icon: '/favicon.ico',
      tag: 'daily-reminder',
      data: { type: 'daily_reminder' }
    });
  }

  // Expense limit alerts
  async sendExpenseLimit(amount: number, limit: number): Promise<void> {
    await this.sendNotification('🚨 Limite de Gastos', {
      body: `Você gastou R$ ${amount.toFixed(2)} hoje. Limite diário: R$ ${limit.toFixed(2)}`,
      icon: '/favicon.ico',
      tag: 'expense-limit',
      data: { type: 'expense_limit', amount, limit }
    });
  }

  // Weekly summary
  async sendWeeklySummary(totalSpent: number, budget: number, savings: number): Promise<void> {
    await this.sendNotification('📊 Resumo Semanal', {
      body: `Esta semana: R$ ${totalSpent.toFixed(2)} gastos, R$ ${savings.toFixed(2)} economizados`,
      icon: '/favicon.ico',
      tag: 'weekly-summary',
      data: { type: 'weekly_summary', totalSpent, budget, savings }
    });
  }

  // Check if in quiet hours
  isQuietHours(quietStart: string, quietEnd: string): boolean {
    const now = new Date();
    const currentTime = now.getHours() + ':' + now.getMinutes().toString().padStart(2, '0');
    
    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (quietStart > quietEnd) {
      return currentTime >= quietStart || currentTime <= quietEnd;
    }
    
    return currentTime >= quietStart && currentTime <= quietEnd;
  }

  // Schedule notifications
  scheduleNotification(title: string, body: string, delay: number): void {
    setTimeout(() => {
      this.sendNotification(title, { body });
    }, delay);
  }

  // Register service worker for notifications
  async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }
}

export const notificationService = NotificationService.getInstance(); 