import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Bot, User, Loader2, AlertTriangle, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { OpenAIService } from '@/lib/openai';
import { supabaseDatabase } from '@/lib/supabase-database';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  showOptions?: boolean;
  options?: Array<{
    label: string;
    value: string;
    icon?: string;
  }>;
}

type ChatState = 'initial' | 'waiting_expense' | 'waiting_income' | 'waiting_appointment' | 'completed';
type TransactionType = 'expense' | 'income' | 'appointment' | null;

const Chat: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [isCheckingConfig, setIsCheckingConfig] = useState(true);
  const [isSecureMode, setIsSecureMode] = useState(true);
  const [chatState, setChatState] = useState<ChatState>('initial');
  const [transactionType, setTransactionType] = useState<TransactionType>(null);
  const [awaitingReportFollowup, setAwaitingReportFollowup] = useState<null | 'gastos' | 'compromissos'>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    checkApiKeyConfiguration();
    if (user) {
      loadConversationHistory();
    }
  }, [user]);

  const loadConversationHistory = async () => {
    if (!user) return;
    
    try {
      const history = await supabaseDatabase.getConversationHistory(user.id, 20);
      
      if (history.length === 0) {
        // First time user - show welcome message based on plan
        let welcomeMessage: Message;
        
        if (user.plan_type === 'ouro' || user.plan_type === 'trial') {
          welcomeMessage = {
            id: '1',
            type: 'assistant',
            content: `👋 E aí! Sou seu assistente financeiro premium! 💎

Posso te ajudar com suas finanças e agenda! O que você quer fazer hoje?`,
            timestamp: new Date(),
            showOptions: true,
            options: [
              { label: 'Registrar um Gasto', value: 'expense', icon: '💸' },
              { label: 'Registrar um Recebimento', value: 'income', icon: '💰' },
              { label: 'Agendar um Compromisso', value: 'appointment', icon: '📅' },
              { label: 'Buscar Relatório', value: 'report', icon: '📊' }
            ]
          };
        } else {
          welcomeMessage = {
            id: '1',
            type: 'assistant',
            content: `👋 E aí! Sou seu assistente financeiro! 

Posso te ajudar a controlar seus gastos! O que você quer fazer?`,
            timestamp: new Date(),
            showOptions: true,
            options: [
              { label: 'Registrar um Gasto', value: 'expense', icon: '💸' }
            ]
          };
        }
        setMessages([welcomeMessage]);
        
        // Save welcome message to history
        await supabaseDatabase.addConversationMessage(user.id, 'assistant', welcomeMessage.content);
      } else {
        // Load existing conversation but ALWAYS show options after the last message
        const loadedMessages: Message[] = history.map(h => ({
          id: h.id,
          type: h.type,
          content: h.content,
          timestamp: new Date(h.timestamp)
        }));
        
        // Se a última mensagem não tem botões, adicionar uma nova com botões
        const lastMessage = loadedMessages[loadedMessages.length - 1];
        const needsOptions = !lastMessage?.showOptions && lastMessage?.type === 'assistant';
        
        if (needsOptions) {
          let optionsMessage: Message;
          if (user.plan_type === 'ouro' || user.plan_type === 'trial') {
            optionsMessage = {
              id: Date.now().toString(),
              type: 'assistant',
              content: `👋 E aí! O que você gostaria de fazer agora?`,
              timestamp: new Date(),
              showOptions: true,
              options: [
                { label: 'Registrar um Gasto', value: 'expense', icon: '💸' },
                { label: 'Registrar um Recebimento', value: 'income', icon: '💰' },
                { label: 'Agendar um Compromisso', value: 'appointment', icon: '📅' },
                { label: 'Buscar Relatório', value: 'report', icon: '📊' },
                { label: 'Finalizar por agora', value: 'finish', icon: '✅' }
              ]
            };
          } else {
            optionsMessage = {
              id: Date.now().toString(),
              type: 'assistant',
              content: `👋 E aí! Pronto para registrar um gasto?`,
              timestamp: new Date(),
              showOptions: true,
              options: [
                { label: 'Registrar um Gasto', value: 'expense', icon: '💸' }
              ]
            };
          }
          loadedMessages.push(optionsMessage);
        }
        
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };

  const checkApiKeyConfiguration = async () => {
    setIsCheckingConfig(true);
    try {
      console.log('🔍 Chat - Verificando configuração da API Key...');
      
      if (isSecureMode) {
        console.log('✅ Sistema configurado automaticamente');
        setApiKeyConfigured(true);
        setIsCheckingConfig(false);
        return;
      }
      
      const config = await supabaseDatabase.getConfiguration();
      console.log('🔧 Chat - Configuração recebida:', config);
      console.log('🔑 Chat - API Key:', config.openai_api_key ? `${config.openai_api_key.substring(0, 10)}...` : 'VAZIA');
      
      const isConfigured = config.openai_api_key && config.openai_api_key.trim().length > 0;
      console.log('✅ Chat - API Key configurada?', isConfigured);
      
      setApiKeyConfigured(isConfigured);
    } catch (error) {
      console.error('❌ Chat - Error checking API key configuration:', error);
      setApiKeyConfigured(false);
    } finally {
      setIsCheckingConfig(false);
    }
  };

  const createOptionsMessage = (content: string, options: Array<{label: string, value: string, icon?: string}>): Message => {
    return {
      id: Date.now().toString(),
      type: 'assistant',
      content,
      timestamp: new Date(),
      showOptions: true,
      options
    };
  };

  // Definir o array de botões do menu principal em uma constante para reutilizar
  const MAIN_MENU_OPTIONS = [
    { label: 'Registrar um Gasto', value: 'expense', icon: '💸' },
    { label: 'Registrar um Recebimento', value: 'income', icon: '💰' },
    { label: 'Agendar um Compromisso', value: 'appointment', icon: '📅' },
    { label: 'Buscar Relatório', value: 'report', icon: '📊' },
    { label: 'Finalizar por agora', value: 'finish', icon: '✅' }
  ];

  const createCompletionMessage = (): Message => {
    console.log('🎉 Creating completion message for plan type:', user?.plan_type);
    
    if (user?.plan_type === 'ouro' || user?.plan_type === 'trial') {
      const message = createOptionsMessage(
        '🎉 Perfeito! Registrado com sucesso!\n\nPosso te ajudar com mais alguma coisa?',
        MAIN_MENU_OPTIONS
      );
      console.log('🎉 Gold completion message created with options:', message.options?.map(o => o.label));
      return message;
    } else {
      const message = createOptionsMessage(
        '🎉 Massa! Gasto registrado! Quer adicionar mais algum?',
        MAIN_MENU_OPTIONS
      );
      console.log('🎉 Bronze completion message created with options:', message.options?.map(o => o.label));
      return message;
    }
  };

  const handleOptionSelect = async (option: string) => {
    console.log('🎯 Opção selecionada:', option);

    // 1. Relatórios: tratar antes de qualquer fallback/menu principal
    if (option.startsWith('report_') || option.startsWith('appointments_')) {
      let reportText = '';
      let followupType: null | 'gastos' | 'compromissos' = null;
      if (option === 'report_today' || option === 'report_week' || option === 'report_month' || option === 'report_category') {
        // Gastos
        const now = new Date();
        if (option === 'report_today') {
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0];
          const expenses = await supabaseDatabase.getExpensesByUser(user!.id);
          const todayExpenses = expenses.filter(e => e.data === todayStr);
          const total = todayExpenses.reduce((sum, e) => sum + e.valor, 0);
          if (todayExpenses.length === 0) {
            reportText = 'Você não registrou nenhum gasto hoje.';
          } else {
            reportText = `Você gastou **R$ ${total.toFixed(2)}** hoje.\n\n`;
            todayExpenses.forEach(e => {
              const data = new Date(e.data).toLocaleDateString('pt-BR');
              reportText += `• **R$ ${e.valor.toFixed(2)}** em ${e.categoria} - ${data}\n`;
            });
          }
        } else if (option === 'report_week') {
          const now = new Date();
          const firstDay = new Date(now);
          firstDay.setDate(now.getDate() - now.getDay());
          const lastDay = new Date(firstDay);
          lastDay.setDate(firstDay.getDate() + 6);
          const expenses = await supabaseDatabase.getExpensesByUser(user!.id);
          const weekExpenses = expenses.filter(e => {
            const d = new Date(e.data);
            return d >= firstDay && d <= lastDay;
          });
          const total = weekExpenses.reduce((sum, e) => sum + e.valor, 0);
          if (weekExpenses.length === 0) {
            reportText = 'Você não registrou nenhum gasto nesta semana.';
          } else {
            reportText = `Você gastou **R$ ${total.toFixed(2)}** nesta semana.\n\n`;
            weekExpenses.forEach(e => {
              const data = new Date(e.data).toLocaleDateString('pt-BR');
              reportText += `• **R$ ${e.valor.toFixed(2)}** em ${e.categoria} - ${data}\n`;
            });
          }
        } else if (option === 'report_month') {
          const now = new Date();
          const monthStr = now.toISOString().slice(0, 7);
          const expenses = await supabaseDatabase.getExpensesByUser(user!.id);
          const monthExpenses = expenses.filter(e => e.data.startsWith(monthStr));
          const total = monthExpenses.reduce((sum, e) => sum + e.valor, 0);
          if (monthExpenses.length === 0) {
            reportText = 'Você não registrou nenhum gasto neste mês.';
          } else {
            reportText = `Você gastou **R$ ${total.toFixed(2)}** neste mês.\n\n`;
            monthExpenses.forEach(e => {
              const data = new Date(e.data).toLocaleDateString('pt-BR');
              reportText += `• **R$ ${e.valor.toFixed(2)}** em ${e.categoria} - ${data}\n`;
            });
          }
        } else if (option === 'report_category') {
          const now = new Date();
          const monthStr = now.toISOString().slice(0, 7);
          const expenses = await supabaseDatabase.getExpensesByUser(user!.id);
          const monthExpenses = expenses.filter(e => e.data.startsWith(monthStr));
          const byCategory: Record<string, { total: number, items: { valor: number, descricao: string, data: string }[] }> = {};
          monthExpenses.forEach(e => {
            if (!byCategory[e.categoria]) byCategory[e.categoria] = { total: 0, items: [] };
            byCategory[e.categoria].total += e.valor;
            byCategory[e.categoria].items.push({ valor: e.valor, descricao: e.descricao, data: e.data });
          });
          if (Object.keys(byCategory).length === 0) {
            reportText = 'Você não registrou nenhum gasto neste mês.';
          } else {
            reportText = '**Gastos por categoria neste mês:**\n\n';
            Object.entries(byCategory).forEach(([cat, val]) => {
              reportText += `• ${cat}: \n\n`;
              val.items.forEach(item => {
                const data = new Date(item.data).toLocaleDateString('pt-BR');
                reportText += `- **R$ ${item.valor.toFixed(2)}** - ${data}\n`;
              });
              reportText += '\n';
            });
          }
          followupType = 'gastos';
        }
        followupType = 'gastos';
      } else if (option === 'appointments_today' || option === 'appointments_week' || option === 'appointments_month') {
        // Compromissos
        if (option === 'appointments_today') {
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0];
          const appointments = await supabaseDatabase.getAppointmentsByDate(user!.id, todayStr);
          if (appointments.length === 0) {
            reportText = 'Você não tem compromissos para hoje.';
          } else {
            reportText = 'Seus compromissos para hoje:\n';
            appointments.forEach(a => {
              reportText += `• ${a.title} às ${a.time} (${a.category})\n`;
            });
          }
        } else if (option === 'appointments_week') {
          // Buscar compromissos da semana atual
          const now = new Date();
          const firstDay = new Date(now);
          firstDay.setDate(now.getDate() - now.getDay()); // Domingo
          const lastDay = new Date(firstDay);
          lastDay.setDate(firstDay.getDate() + 6); // Sábado
          // Buscar todos os compromissos do usuário
          const allAppointments = await supabaseDatabase.getAppointmentsByUser(user!.id);
          // Filtrar compromissos da semana
          const weekAppointments = allAppointments.filter(a => {
            const d = new Date(a.date);
            return d >= firstDay && d <= lastDay;
          });
          if (weekAppointments.length === 0) {
            reportText = 'Você não tem compromissos para esta semana.';
          } else {
            reportText = 'Seus compromissos desta semana:\n';
            weekAppointments.forEach(a => {
              const dia = new Date(a.date).toLocaleDateString('pt-BR');
              reportText += `• ${a.title} em ${dia} às ${a.time} (${a.category})\n`;
            });
          }
        } else if (option === 'appointments_month') {
          // Compromissos do mês
          const now = new Date();
          const monthStr = now.toISOString().slice(0, 7); // YYYY-MM
          const allAppointments = await supabaseDatabase.getAppointmentsByUser(user!.id);
          const monthAppointments = allAppointments.filter(a => a.date.startsWith(monthStr));
          if (monthAppointments.length === 0) {
            reportText = 'Você não tem compromissos para este mês.';
          } else {
            reportText = 'Seus compromissos deste mês:\n';
            monthAppointments.forEach(a => {
              const dia = new Date(a.date).toLocaleDateString('pt-BR');
              reportText += `• ${a.title} em ${dia} às ${a.time} (${a.category})\n`;
            });
          }
        }
        followupType = 'compromissos';
      }
      const reportMsg: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: reportText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, reportMsg]);
      await supabaseDatabase.addConversationMessage(user!.id, 'assistant', reportMsg.content);
      // Pergunta contextual
      let followupMsg: Message;
      if (followupType === 'gastos') {
        followupMsg = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: 'Deseja ver outro relatório, registrar um novo gasto ou consultar outra informação?',
          timestamp: new Date()
        };
      } else if (followupType === 'compromissos') {
        followupMsg = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: 'Quer agendar um novo compromisso, ver outra semana ou consultar outra informação?',
          timestamp: new Date()
        };
      } else {
        followupMsg = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: 'Se precisar de mais alguma coisa é só me dizer!',
          timestamp: new Date()
        };
      }
      setMessages(prev => [...prev, followupMsg]);
      await supabaseDatabase.addConversationMessage(user!.id, 'assistant', followupMsg.content);
      setAwaitingReportFollowup(followupType);
      return;
    }

    // 2. Exibir menu de relatórios ao selecionar 'Buscar Relatório' no menu principal
    if (option === 'report') {
      const reportOptions = [
        { label: 'Gastos Hoje', value: 'report_today', icon: '📅' },
        { label: 'Gastos na Semana', value: 'report_week', icon: '🗓️' },
        { label: 'Gastos no Mês', value: 'report_month', icon: '📆' },
        { label: 'Gastos por Categoria', value: 'report_category', icon: '📊' },
        { label: 'Compromissos Hoje', value: 'appointments_today', icon: '📅' },
        { label: 'Compromissos da Semana', value: 'appointments_week', icon: '🗓️' },
        { label: 'Compromissos do Mês', value: 'appointments_month', icon: '📆' }
      ];
      const reportMenu = createOptionsMessage(
        'Qual relatório você deseja ver?',
        reportOptions
      );
      setMessages(prev => [...prev, reportMenu]);
      await supabaseDatabase.addConversationMessage(user!.id, 'assistant', reportMenu.content);
      setAwaitingReportFollowup('gastos');
      return;
    }
    
    // 🔥 TRATAR CONFIRMAÇÕES SEPARADAMENTE
    if (option === 'sim' || option === 'não') {
      // Para confirmações, usar handleSendMessage para processar a resposta
      await handleSendMessage(option);
      return;
    }
    
    // Add user message showing the selected option
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: option === 'expense' ? 'Adicionar um Gasto' : 
               option === 'income' ? 'Adicionar um Recebimento' : 
               option === 'appointment' ? 'Agendar um Compromisso' :
               option === 'finish' ? 'Finalizar por agora' : option,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    await supabaseDatabase.addConversationMessage(user!.id, 'user', userMessage.content);
    
    let responseMessage: Message;
    
    if (option === 'expense') {
      setTransactionType('expense');
      setChatState('waiting_expense');
      responseMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `💸 Perfeito! Vamos registrar um gasto!

📝 **EXEMPLOS FÁCEIS:**
• "gastei 50 no mercado"
• "comprei pizza por 35"
• "paguei 100 de luz"
• "saiu 25 do uber"

🎯 **Dica:** Fale VALOR + ONDE gastou!

Me conta seu gasto:`,
        timestamp: new Date()
      };
    } else if (option === 'income') {
      setTransactionType('income');
      setChatState('waiting_income');
      responseMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `💰 Excelente! Vamos registrar um recebimento!

📝 **EXEMPLOS FÁCEIS:**
• "recebi 3000 de salário"
• "ganhei 500 de freelance"
• "recebi 200 de dívida"
• "ganhei 1000 de vendas"

🎯 **Dica:** Fale VALOR + DE ONDE veio!

Me conta seu recebimento:`,
        timestamp: new Date()
      };
    } else if (option === 'appointment') {
      setTransactionType('appointment');
      setChatState('waiting_appointment');
      responseMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `📅 Show! Vamos agendar um compromisso!

📝 **EXEMPLOS FÁCEIS:**
• "compromisso dia 20 no dentista às 15h"
• "reunião amanhã às 14h"
• "consulta médica dia 25 às 10h"
• "encontro com cliente dia 15 às 9h"

🎯 **Dica:** Fale O QUE É + QUANDO (dia/hora)!

Me conta seu compromisso:`,
        timestamp: new Date()
      };
    } else if (option === 'finish') {
      setChatState('initial');
      setTransactionType(null);
      responseMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: '✅ Beleza! Qualquer coisa é só me chamar! Estou aqui para te ajudar sempre! 😊',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, responseMessage]);
      await supabaseDatabase.addConversationMessage(user!.id, 'assistant', responseMessage.content);
      // Exibir menu principal após finalizar
      if (user?.plan_type === 'ouro' || user?.plan_type === 'trial') {
        const mainMenu = createOptionsMessage(
          'Se precisar de mais alguma coisa é só me dizer!',
          MAIN_MENU_OPTIONS
        );
        setMessages(prev => [...prev, mainMenu]);
        await supabaseDatabase.addConversationMessage(user.id, 'assistant', mainMenu.content);
      }
      return;
    } else {
      // Reset to initial state para opções não reconhecidas
      setChatState('initial');
      setTransactionType(null);
      if (user?.plan_type === 'ouro' || user?.plan_type === 'trial') {
        responseMessage = createOptionsMessage(
          'Se precisar de mais alguma coisa é só me dizer!',
          MAIN_MENU_OPTIONS
        );
      } else {
        responseMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: '👋 E aí! Manda aí o que você gastou! 💰',
          timestamp: new Date()
        };
      }
    }
    
    setMessages(prev => [...prev, responseMessage]);
    await supabaseDatabase.addConversationMessage(user!.id, 'assistant', responseMessage.content);

    // Relatórios
    if (option.startsWith('report_') || option.startsWith('appointments_')) {
      let reportText = '';
      let followupType: null | 'gastos' | 'compromissos' = null;
      if (option === 'report_today' || option === 'report_week' || option === 'report_month' || option === 'report_category') {
        // Gastos
        const now = new Date();
        if (option === 'report_today') {
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0];
          const expenses = await supabaseDatabase.getExpensesByUser(user!.id);
          const todayExpenses = expenses.filter(e => e.data === todayStr);
          const total = todayExpenses.reduce((sum, e) => sum + e.valor, 0);
          if (todayExpenses.length === 0) {
            reportText = 'Você não registrou nenhum gasto hoje.';
          } else {
            reportText = `Você gastou **R$ ${total.toFixed(2)}** hoje.\n\n`;
            todayExpenses.forEach(e => {
              const data = new Date(e.data).toLocaleDateString('pt-BR');
              reportText += `• **R$ ${e.valor.toFixed(2)}** em ${e.categoria} - ${data}\n`;
            });
          }
        } else if (option === 'report_week') {
          const now = new Date();
          const firstDay = new Date(now);
          firstDay.setDate(now.getDate() - now.getDay());
          const lastDay = new Date(firstDay);
          lastDay.setDate(firstDay.getDate() + 6);
          const expenses = await supabaseDatabase.getExpensesByUser(user!.id);
          const weekExpenses = expenses.filter(e => {
            const d = new Date(e.data);
            return d >= firstDay && d <= lastDay;
          });
          const total = weekExpenses.reduce((sum, e) => sum + e.valor, 0);
          if (weekExpenses.length === 0) {
            reportText = 'Você não registrou nenhum gasto nesta semana.';
          } else {
            reportText = `Você gastou **R$ ${total.toFixed(2)}** nesta semana.\n\n`;
            weekExpenses.forEach(e => {
              const data = new Date(e.data).toLocaleDateString('pt-BR');
              reportText += `• **R$ ${e.valor.toFixed(2)}** em ${e.categoria} - ${data}\n`;
            });
          }
        } else if (option === 'report_month') {
          const now = new Date();
          const monthStr = now.toISOString().slice(0, 7);
          const expenses = await supabaseDatabase.getExpensesByUser(user!.id);
          const monthExpenses = expenses.filter(e => e.data.startsWith(monthStr));
          const total = monthExpenses.reduce((sum, e) => sum + e.valor, 0);
          if (monthExpenses.length === 0) {
            reportText = 'Você não registrou nenhum gasto neste mês.';
          } else {
            reportText = `Você gastou **R$ ${total.toFixed(2)}** neste mês.\n\n`;
            monthExpenses.forEach(e => {
              const data = new Date(e.data).toLocaleDateString('pt-BR');
              reportText += `• **R$ ${e.valor.toFixed(2)}** em ${e.categoria} - ${data}\n`;
            });
          }
        } else if (option === 'report_category') {
          const now = new Date();
          const monthStr = now.toISOString().slice(0, 7);
          const expenses = await supabaseDatabase.getExpensesByUser(user!.id);
          const monthExpenses = expenses.filter(e => e.data.startsWith(monthStr));
          const byCategory: Record<string, { total: number, items: { valor: number, descricao: string, data: string }[] }> = {};
          monthExpenses.forEach(e => {
            if (!byCategory[e.categoria]) byCategory[e.categoria] = { total: 0, items: [] };
            byCategory[e.categoria].total += e.valor;
            byCategory[e.categoria].items.push({ valor: e.valor, descricao: e.descricao, data: e.data });
          });
          if (Object.keys(byCategory).length === 0) {
            reportText = 'Você não registrou nenhum gasto neste mês.';
          } else {
            reportText = '**Gastos por categoria neste mês:**\n\n';
            Object.entries(byCategory).forEach(([cat, val]) => {
              reportText += `• ${cat}: \n\n`;
              val.items.forEach(item => {
                const data = new Date(item.data).toLocaleDateString('pt-BR');
                reportText += `- **R$ ${item.valor.toFixed(2)}** - ${data}\n`;
              });
              reportText += '\n';
            });
          }
        }
        followupType = 'gastos';
      } else if (option === 'appointments_today' || option === 'appointments_week' || option === 'appointments_month') {
        // Compromissos
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const appointments = await supabaseDatabase.getAppointmentsByDate(user!.id, todayStr);
        if (appointments.length === 0) {
          reportText = 'Você não tem compromissos para hoje.';
        } else {
          reportText = 'Seus compromissos para hoje:\n';
          appointments.forEach(a => {
            reportText += `• ${a.title} às ${a.time} (${a.category})\n`;
          });
        }
        followupType = 'compromissos';
      }
      const reportMsg: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: reportText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, reportMsg]);
      await supabaseDatabase.addConversationMessage(user!.id, 'assistant', reportMsg.content);
      // Pergunta contextual
      let followupMsg: Message;
      if (followupType === 'gastos') {
        followupMsg = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: 'Deseja ver outro relatório, registrar um novo gasto ou consultar outra informação?',
          timestamp: new Date()
        };
      } else if (followupType === 'compromissos') {
        followupMsg = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: 'Quer agendar um novo compromisso, ver outra semana ou consultar outra informação?',
          timestamp: new Date()
        };
      } else {
        followupMsg = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: 'Se precisar de mais alguma coisa é só me dizer!',
          timestamp: new Date()
        };
      }
      setMessages(prev => [...prev, followupMsg]);
      await supabaseDatabase.addConversationMessage(user!.id, 'assistant', followupMsg.content);
      setAwaitingReportFollowup(followupType);
      return;
    }
  };

  const handleSendMessage = async (customValue?: string) => {
    const valueToSend = typeof customValue === 'string' ? customValue : inputValue;
    if (!valueToSend.trim() || !user) return;

    if (!apiKeyConfigured) {
      toast({
        title: "Configuração necessária",
        description: "O sistema está carregando. Tente novamente em alguns segundos.",
        variant: "destructive"
      });
      return;
    }

    // Se estava aguardando followup de relatório, após a resposta do usuário mostra o menu principal
    if (awaitingReportFollowup) {
      // Adiciona a mensagem do usuário ao chat e ao histórico
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: valueToSend,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      await supabaseDatabase.addConversationMessage(user.id, 'user', valueToSend);
      setAwaitingReportFollowup(null);
      setInputValue('');
      if (user?.plan_type === 'ouro' || user?.plan_type === 'trial') {
        const mainMenu = createOptionsMessage(
          'Se precisar de mais alguma coisa é só me dizer!',
          MAIN_MENU_OPTIONS
        );
        setMessages(prev => [...prev, mainMenu]);
        await supabaseDatabase.addConversationMessage(user.id, 'assistant', mainMenu.content);
      }
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: valueToSend,
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];

    setMessages(prev => [...prev, userMessage]);
    
    await supabaseDatabase.addConversationMessage(user.id, 'user', valueToSend);
    
    if (!customValue) setInputValue('');
    
    setIsLoading(true);

    try {
      const config = await supabaseDatabase.getConfiguration();
      
      const userPersonality = await supabaseDatabase.getUserPersonality(user.id);
      
      console.log('🚀 Processando com sistema otimizado');
      
      const openaiService = new OpenAIService(config.openai_api_key);
      const conversationHistory = updatedMessages.slice(-20);
      
      // 📅 DETECTAR SE É COMPROMISSO E USAR MÉTODO ESPECÍFICO
      let result: any;
      
      if (chatState === 'waiting_appointment') {
        // Processar como compromisso
        console.log('📅 Processando como compromisso');
        result = await openaiService.extractAppointmentData(
        valueToSend, 
        config.instrucoes_personalizadas, 
        conversationHistory,
        userPersonality?.personality_profile,
        user.id,
          chatState
        );
      } else {
        // Processar como transação financeira
        console.log('💰 Processando como transação financeira');
        result = await openaiService.extractTransactionData(
          valueToSend, 
          config.instrucoes_personalizadas, 
          conversationHistory,
          userPersonality?.personality_profile,
          user.id,
          chatState,
          user.plan_type // 🔥 PASSAR O TIPO DE PLANO
        );
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: result.response,
        timestamp: new Date()
      };

      // 🔥 DETECTAR SE É PERGUNTA DE CONFIRMAÇÃO E ADICIONAR BOTÕES
      let finalAssistantMessage = assistantMessage;
      
      if (result.response.includes('Tá certo?')) {
        finalAssistantMessage = {
          ...assistantMessage,
          showOptions: true,
          options: [
            { label: 'Sim, tá certo!', value: 'sim', icon: '✅' },
            { label: 'Não, tá errado', value: 'não', icon: '❌' }
          ]
        };
      }

      setMessages(prev => [...prev, finalAssistantMessage]);
      
      await supabaseDatabase.addConversationMessage(user.id, 'assistant', result.response);
      
      if (result.personalityUpdate && result.personalityUpdate.trim().length > 0) {
        await supabaseDatabase.updateUserPersonality(user.id, result.personalityUpdate);
        console.log('Personality updated:', result.personalityUpdate);
      }

      console.log('💰 Chat - Resultado da IA:', result);
      console.log('💰 Chat - Tipo do resultado:', typeof result);
      console.log('💰 Chat - Extraction válida?', result.extraction?.isValid);
      console.log('💰 Chat - Valor extraído:', result.extraction?.valor);
      console.log('💰 Chat - Categoria extraída:', result.extraction?.categoria);
      console.log('💰 Chat - Tipo extraído:', result.extraction?.type);
      console.log('💰 Chat - Condição completa:', result.extraction?.isValid && result.extraction?.valor > 0);
      
      // 📅 PROCESSAR COMPROMISSO VÁLIDO (verificar se tem extraction de compromisso real)
      if (chatState === 'waiting_appointment' && result.extraction?.isValid) {
        console.log('📅 Chat - Processando compromisso do estado waiting_appointment');
        
        // Re-chamar extractAppointmentData para ter todos os dados do compromisso
        const appointmentResult = await openaiService.extractAppointmentData(
          valueToSend,
          config.instrucoes_personalizadas,
          conversationHistory,
          userPersonality?.personality_profile,
          user.id,
          chatState
        );
        
        if (appointmentResult.extraction?.isValid) {
          console.log('📅 Chat - Compromisso válido detectado:', {
            titulo: appointmentResult.extraction?.titulo,
            data: appointmentResult.extraction?.data,
            hora: appointmentResult.extraction?.hora,
            categoria: appointmentResult.extraction?.categoria
          });

          // Só salvar se for usuário Gold (tem acesso ao calendário)
          if (user.plan_type === 'ouro' || user.plan_type === 'trial') {
            try {
              const savedAppointment = await supabaseDatabase.addAppointment({
                user_id: user.id,
                title: appointmentResult.extraction.titulo,
                description: appointmentResult.extraction.descricao,
                date: appointmentResult.extraction.data,
                time: appointmentResult.extraction.hora,
                location: appointmentResult.extraction.local || '',
                category: appointmentResult.extraction.categoria as any
              });
              console.log('✅ Chat - Compromisso salvo com sucesso:', savedAppointment);

              const appointmentSuccessMessages = [
                "🎉 Show! Compromisso agendado! Não esquece, hein! 📅",
                "✅ Massa! Agendado com sucesso! Vou te lembrar! 🔔",
                "🚀 Top! Compromisso na agenda! Tudo organizadinho! 📋",
                "💪 Beleza! Agendei pra você! Não perde, viu? ⏰",
                "🎯 Dahora! Compromisso confirmado! Tô de olho! 👀",
                "⭐ Show de bola! Agendado e confirmado! 📆",
                "🔥 Irado! Mais um compromisso na agenda! 📝",
                "✨ Perfeito! Agendado com sucesso! 🗓️"
              ];
              
              const randomMessage = appointmentSuccessMessages[Math.floor(Math.random() * appointmentSuccessMessages.length)];

              // Toast de sucesso
              toast({
                title: "Compromisso agendado!",
                description: `${appointmentResult.extraction.titulo} - ${appointmentResult.extraction.data} às ${appointmentResult.extraction.hora}`,
              });
              
              // Reset state and show completion options
              setChatState('completed');
              setTransactionType(null);
              
              // Mensagem divertida no chat + completion options
              setTimeout(() => {
                const funMessage: Message = {
                  id: (Date.now() + 2).toString(),
                  type: 'assistant',
                  content: randomMessage,
                  timestamp: new Date()
                };
                
                setMessages(prev => [...prev, funMessage]);
                supabaseDatabase.addConversationMessage(user.id, 'assistant', randomMessage);
                
                // Completion message com delay
                setTimeout(() => {
                  const completionMessage = createCompletionMessage();
                  setMessages(prev => [...prev, completionMessage]);
                  // NÃO salvar mensagem de completion no histórico para evitar problemas com botões
                  // supabaseDatabase.addConversationMessage(user.id, 'assistant', completionMessage.content);
                }, 1500);
              }, 1000);
              
            } catch (appointmentError) {
              console.error('❌ Chat - Erro ao salvar compromisso:', appointmentError);
            }
          } else {
            // Suggest upgrade for bronze users trying to add appointments
            toast({
              title: "🥇 Upgrade para Plano Ouro!",
              description: "Para agendar compromissos, você precisa do plano ouro!",
              variant: "default"
            });
          }
        }
      }
      // 📅 PROCESSAR COMPROMISSO DETECTADO AUTOMATICAMENTE
      else if (result.extraction?.type === 'appointment' && result.extraction?.isValid) {
        console.log('📅 Chat - Compromisso válido detectado:', {
          titulo: result.extraction?.titulo,
          data: result.extraction?.data,
          hora: result.extraction?.hora,
          categoria: result.extraction?.categoria
        });

        // Só salvar se for usuário Gold (tem acesso ao calendário)
        if (user.plan_type === 'ouro' || user.plan_type === 'trial') {
          try {
            const savedAppointment = await supabaseDatabase.addAppointment({
              user_id: user.id,
              title: result.extraction.titulo,
              description: result.extraction.descricao,
              date: result.extraction.data,
              time: result.extraction.hora,
              location: result.extraction.local || '',
              category: result.extraction.categoria
            });
            console.log('✅ Chat - Compromisso salvo com sucesso:', savedAppointment);

            const appointmentSuccessMessages = [
              "🎉 Show! Compromisso agendado! Não esquece, hein! 📅",
              "✅ Massa! Agendado com sucesso! Vou te lembrar! 🔔",
              "🚀 Top! Compromisso na agenda! Tudo organizadinho! 📋",
              "💪 Beleza! Agendei pra você! Não perde, viu? ⏰",
              "🎯 Dahora! Compromisso confirmado! Tô de olho! 👀",
              "⭐ Show de bola! Agendado e confirmado! 📆",
              "🔥 Irado! Mais um compromisso na agenda! 📝",
              "✨ Perfeito! Agendado com sucesso! 🗓️"
            ];
            
            const randomMessage = appointmentSuccessMessages[Math.floor(Math.random() * appointmentSuccessMessages.length)];

                          // Toast de sucesso
              toast({
                title: "Compromisso agendado!",
                description: `${result.extraction.titulo} - ${result.extraction.data} às ${result.extraction.hora}`,
              });
              
              // Reset state and show completion options
              setChatState('completed');
              setTransactionType(null);
              
              // Mensagem divertida no chat + completion options
              setTimeout(() => {
                const funMessage: Message = {
                  id: (Date.now() + 2).toString(),
                  type: 'assistant',
                  content: randomMessage,
                  timestamp: new Date()
                };
                
                setMessages(prev => [...prev, funMessage]);
                supabaseDatabase.addConversationMessage(user.id, 'assistant', randomMessage);
                
                // Completion message com delay
                setTimeout(() => {
                  const completionMessage = createCompletionMessage();
                  setMessages(prev => [...prev, completionMessage]);
                  // NÃO salvar mensagem de completion no histórico para evitar problemas com botões
                  // supabaseDatabase.addConversationMessage(user.id, 'assistant', completionMessage.content);
                }, 1500);
              }, 1000);
            
          } catch (appointmentError) {
            console.error('❌ Chat - Erro ao salvar compromisso:', appointmentError);
          }
        } else {
          // Suggest upgrade for bronze users trying to add appointments
          toast({
            title: "🥇 Upgrade para Plano Ouro!",
            description: "Para agendar compromissos, você precisa do plano ouro!",
            variant: "default"
          });
        }
      }
      // 💰 PROCESSAR TRANSAÇÕES FINANCEIRAS
      else if (result.extraction?.isValid && result.extraction?.valor > 0) {
        console.log('✅ Chat - ENTRANDO na condição de processar transação financeira!');
        console.log('💰 Chat - Valor extraído:', result.extraction?.valor);
        console.log('💰 Chat - Descrição:', result.extraction?.descricao);
        // 🔥 USAR NOVO CAMPO TYPE da extração
        const isIncome = result.extraction.type === 'income';
        const isExpense = result.extraction.type === 'expense';
        console.log('💰 Chat - isIncome:', isIncome);
        console.log('💰 Chat - isExpense:', isExpense);
        console.log('💰 Chat - user.plan_type:', user.plan_type);
        console.log('💰 Chat - supabaseDatabase.addIncome exists:', !!supabaseDatabase.addIncome);
        
        if (isExpense) {
          console.log('💾 Chat - Salvando gasto no banco:', {
            usuario_id: user.id,
            valor: result.extraction?.valor,
            categoria: result.extraction?.categoria,
            descricao: result.extraction?.descricao,
            data: result.extraction?.data
          });
          
          try {
              console.log('💸 Chat - TENTANDO salvar gasto...');
            const savedExpense = await supabaseDatabase.addExpense({
              usuario_id: user.id,
              valor: result.extraction.valor,
              categoria: result.extraction.categoria,
              descricao: result.extraction.descricao,
              data: result.extraction.data
            });
            console.log('✅ Chat - Gasto salvo com sucesso:', savedExpense);
            
            const expenseSuccessMessages = [
              "Opa! Lá se foi mais uma graninha... 😅",
              "Anotado! Mas ó... vai com calma aí! 🤨",
              "Beleza! Mais um furo no bolso registrado! 💸",
              "Show! Gastou de novo, né danado? 😏",
              "Registrei! Mas tá gastando muito, hein? 🤔",
              "Fechou! O dinheiro voando... 🛩️",
              "Pronto! Mais um desembolso anotado! 📝",
              "Salvei! Mas ó... modera essa gastança! 😬",
              "Anotado! O bolso chorou mais um pouco... 😢",
              "Registrado! Vai ter que cortar o supérfluo! ✂️",
              "Show! Mas tenta economizar, vai? 🙏",
              "Feito! A carteira suspirou mais uma vez... 😮‍💨"
            ];
            
            const randomMessage = expenseSuccessMessages[Math.floor(Math.random() * expenseSuccessMessages.length)];

            // Toast de sucesso
            toast({
              title: "Gasto registrado!",
              description: `R$ ${result.extraction.valor.toFixed(2)} em ${result.extraction.categoria}`,
            });
            
            // Reset state and show completion options
            setChatState('completed');
            setTransactionType(null);
            
            // Mensagem divertida no chat + completion options
            setTimeout(() => {
              const funMessage: Message = {
                id: (Date.now() + 2).toString(),
                type: 'assistant',
                content: randomMessage,
                timestamp: new Date()
              };
              
              setMessages(prev => [...prev, funMessage]);
              supabaseDatabase.addConversationMessage(user.id, 'assistant', randomMessage);
              
              // Completion message com delay
              setTimeout(() => {
                const completionMessage = createCompletionMessage();
                setMessages(prev => [...prev, completionMessage]);
                // NÃO salvar mensagem de completion no histórico para evitar problemas com botões
                // supabaseDatabase.addConversationMessage(user.id, 'assistant', completionMessage.content);
              }, 1500);
            }, 1000);
            
          } catch (expenseError) {
            console.error('❌ Chat - Erro ao salvar gasto:', expenseError);
              console.error('❌ Chat - Stack trace:', expenseError.stack);
              toast({
                title: "Erro ao salvar gasto!",
                description: "Verifique o console para mais detalhes.",
                variant: "destructive"
              });
            }
        } else if (isIncome && user.plan_type === 'ouro' || user.plan_type === 'trial') {
          console.log('💎 Chat - ENTRANDO na condição de recebimento para usuário OURO');
          // Save as income for gold plan users
          console.log('💎 Chat - Salvando recebimento no banco (Plano Ouro):', {
            user_id: user.id,
            amount: result.extraction?.valor,
            category: result.extraction?.categoria,
            description: result.extraction?.descricao,
            date: result.extraction?.data
          });
          
          try {
              console.log('💎 Chat - TENTANDO salvar recebimento...');
            const savedIncome = await supabaseDatabase.addIncome({
              user_id: user.id,
              amount: result.extraction.valor,
              category: result.extraction.categoria,
              description: result.extraction.descricao,
              date: result.extraction.data,
              tags: []
            });
            console.log('✅ Chat - Recebimento salvo com sucesso:', savedIncome);
            
            const incomeSuccessMessages = [
              "Aê! Chegou dinheiro! Tu é fera! 💎",
              "Boaaa! Chuva de grana! Parabéns, meu rei! 🎉",
              "Show de bola! Mais um recebimento no bolso! ✨",
              "Dahoraaa! Tu tá bombando! 🔥",
              "Caraca, que onda boa! Recebeu e eu anotei! ��",
              "Eitaaa! Olha a grana chegando! Tu é o cara! 🚀",
              "Aêêê! Gordinho no bolso! Sucesso total! 💪",
              "Iradooo! Mais dinheiro na conta! 💰",
              "Topzera! A grana tá rolando! 🎯",
              "Massaaa! Tu mandou muito bem! 🏆",
              "Showzaço! Dinheiro na veia! 🔥",
              "Dahora demais! Tá rico, patrão! 💎"
            ];
            
            const randomMessage = incomeSuccessMessages[Math.floor(Math.random() * incomeSuccessMessages.length)];

            // Toast de sucesso
            toast({
              title: "Recebimento salvo!",
              description: `R$ ${result.extraction.valor.toFixed(2)} em ${result.extraction.categoria}`,
            });
            
            // Reset state and show completion options
            setChatState('completed');
            setTransactionType(null);
            
            // Mensagem divertida no chat + completion options
            setTimeout(() => {
              const funMessage: Message = {
                id: (Date.now() + 2).toString(),
                type: 'assistant',
                content: randomMessage,
                timestamp: new Date()
              };
              
              setMessages(prev => [...prev, funMessage]);
              supabaseDatabase.addConversationMessage(user.id, 'assistant', randomMessage);
              
              // Completion message com delay
              setTimeout(() => {
                const completionMessage = createCompletionMessage();
                setMessages(prev => [...prev, completionMessage]);
                // NÃO salvar mensagem de completion no histórico para evitar problemas com botões
                // supabaseDatabase.addConversationMessage(user.id, 'assistant', completionMessage.content);
              }, 1500);
            }, 1000);
            
          } catch (incomeError) {
            console.error('❌ Chat - Erro ao salvar recebimento:', incomeError);
              console.error('❌ Chat - Stack trace:', incomeError.stack);
              toast({
                title: "Erro ao salvar recebimento!",
                description: "Verifique o console para mais detalhes.",
                variant: "destructive"
              });
          }
        } else if (isIncome && user.plan_type === 'bronze') {
          console.log('🥉 Chat - ENTRANDO na condição de recebimento para usuário BRONZE (sugerindo upgrade)');
          // Suggest upgrade for bronze users trying to add income
          toast({
            title: "🥇 Upgrade para Plano Ouro!",
            description: "Para registrar recebimentos, você precisa do plano ouro!",
            variant: "default"
          });
        } else {
          console.log('❌ Chat - NÃO entrou na condição de processar transação financeira');
          console.log('❌ Chat - isValid:', result.extraction?.isValid);
          console.log('❌ Chat - valor:', result.extraction?.valor);
          console.log('❌ Chat - valor > 0:', result.extraction?.valor > 0);
          console.log('❌ Chat - type:', result.extraction?.type);
        }
      } else {
        console.log('❌ Chat - NÃO entrou na condição de processar transação financeira');
        console.log('❌ Chat - isValid:', result.extraction?.isValid);
        console.log('❌ Chat - valor:', result.extraction?.valor);
        console.log('❌ Chat - valor > 0:', result.extraction?.valor > 0);
        console.log('❌ Chat - type:', result.extraction?.type);
      }

    } catch (error) {
      console.error('Error in secure chat:', error);
      
      let errorMessage = '😅 Opa, rolou um perrengue aqui! ';
      
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        errorMessage = '🚫 Calma aí! Muitas perguntas... Aguarda uns segundinhos! ⏳';
      } else if (error.message.includes('authentication') || error.message.includes('401')) {
        errorMessage = '🔐 Eita! Problema de autenticação... Recarrega a página! 🔄';
      } else {
        errorMessage = '😅 Opa, deu ruim aqui... Tenta de novo em alguns segundos! 🔄';
      }
      
      const errorMessageObj: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessageObj]);
      
      await supabaseDatabase.addConversationMessage(user.id, 'assistant', errorMessage);
      
      toast({
        title: "Oops!",
        description: "Deu um probleminha, tenta de novo! 🔄",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Não enviar se há botões na última mensagem
      if (!shouldDisableInput()) {
        handleSendMessage();
      }
    }
  };

  function isDateRequestMessage(content: string) {
    const lower = content.toLowerCase();
    return (
      lower.includes('quando foi esse gasto') ||
      lower.includes('me fala a data')
    );
  }

  const resetChatState = () => {
    setChatState('initial');
    setTransactionType(null);
  };

  const handleSendButtonClick = () => {
    handleSendMessage();
  };
  
  const handleSendConfirmation = (value: string) => () => {
    void handleSendMessage(value);
  };

  // Função para verificar se deve desabilitar o input
  const shouldDisableInput = (): boolean => {
    if (messages.length === 0) return false;
    
    // Pega a última mensagem
    const lastMessage = messages[messages.length - 1];
    
    // Se a última mensagem é do assistente e tem botões, desabilita o input
    if (lastMessage.type === 'assistant' && lastMessage.showOptions && lastMessage.options && lastMessage.options.length > 0) {
      return true;
    }
    
    return false;
  };

  // Função para gerar placeholder dinâmico
  const getInputPlaceholder = (): string => {
    if (shouldDisableInput()) {
      return "👆 Use os botões acima para responder";
    }
    
    if (chatState === 'waiting_expense') {
      return "Ex: 'gastei 50 no mercado' ou 'paguei 100 de luz' 💸";
    }
    
    if (chatState === 'waiting_income') {
      return "Ex: 'recebi 3000 de salário' ou 'ganhei 500 de freelance' 💰";
    }
    
    if (chatState === 'waiting_appointment') {
      return "Ex: 'compromisso dia 20 no dentista às 15h' 📅";
    }
    
    if (user?.plan_type === 'ouro' || user?.plan_type === 'trial') {
      return "Ex: 'gastei 50 no mercado' ou 'compromisso amanhã às 14h' 😎💎";
    }
    
    return "Ex: 'gastei 50 no mercado' ou 'paguei 100 de luz' 😎";
  };

  if (isCheckingConfig) {
    return (
      <div className="max-w-4xl mx-auto h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-green-500 mx-auto mb-4 animate-pulse" />
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">⚙️ Carregando sistema...</p>
          <p className="text-xs text-muted-foreground mt-2">Preparando assistente financeiro</p>
        </div>
      </div>
    );
  }

  if (!apiKeyConfigured && !isSecureMode) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-6">
          <div className="text-center mb-6">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">🔧 Configuração Necessária</h2>
            <p className="text-muted-foreground">
              O chat com IA não está disponível ainda
            </p>
          </div>
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              💡 O administrador do sistema precisa configurar a API key do OpenAI no painel administrativo para que o chat funcione.
            </AlertDescription>
          </Alert>

          <div className="mt-4 text-center">
            <Button 
              onClick={checkApiKeyConfiguration}
              variant="outline"
            >
              Verificar Novamente
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-200px)] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <Bot className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Alfred IA {user?.plan_type === 'ouro' && '💎'}</h2>
            {chatState !== 'initial' && (
              <p className="text-xs text-muted-foreground">
                {chatState === 'waiting_expense' && '💸 Aguardando dados do gasto...'}
                {chatState === 'waiting_income' && '💰 Aguardando dados do recebimento...'}
                {chatState === 'waiting_appointment' && '📅 Aguardando dados do compromisso...'}
                {chatState === 'completed' && '✅ Registrado com sucesso!'}
              </p>
            )}
          </div>
          {isSecureMode && (
            <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900 px-2 py-1 rounded-full">
              <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-xs text-green-700 dark:text-green-300 font-medium">Online</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-muted-foreground">Online</span>
          {(chatState !== 'initial' && user?.plan_type === 'ouro' || user?.plan_type === 'trial') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetChatState}
              className="text-xs"
            >
              🔄 Reiniciar
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, idx) => {
          const showDatePicker =
            message.type === 'assistant' && isDateRequestMessage(message.content);
          return (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${
                  message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {message.type === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div
                  className={`rounded-lg p-3 ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <div 
                    className="text-sm whitespace-pre-line"
                    dangerouslySetInnerHTML={{
                      __html: message.content
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n/g, '<br/>')
                    }}
                  />
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                  
                  {/* Botões minimalistas apenas */}
                  {message.showOptions && message.options && (
                    <div className="flex flex-col gap-2 mt-3">
                      {message.options.map((option, index) => (
                        <Button
                          key={index}
                          size="sm"
                          variant="outline"
                          onClick={() => void handleOptionSelect(option.value)}
                          disabled={isLoading}
                          className="justify-start text-left h-auto py-2 px-3"
                        >
                          <span className="mr-2">{option.icon}</span>
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  {showDatePicker ? (
                    <div className="mt-2">
                      <Calendar
                        mode="single"
                        selected={undefined}
                        onSelect={(date) => {
                          if (date) {
                            const day = String(date.getDate()).padStart(2, '0');
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const year = date.getFullYear();
                            const formatted = `foi dia ${day}/${month}/${year}`;
                            void handleSendMessage(formatted);
                          }
                        }}
                        disabled={isLoading}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2">
              <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div className="bg-muted text-muted-foreground rounded-lg p-3">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={getInputPlaceholder()}
            className="flex-1"
            disabled={isLoading || !apiKeyConfigured || shouldDisableInput()}
          />
          <Button
            onClick={handleSendButtonClick}
            disabled={!inputValue.trim() || isLoading || !apiKeyConfigured || shouldDisableInput()}
            size="icon"
          >
            <Send size={16} />
          </Button>
        </div>

      </div>
    </div>
  );
};

export default Chat;
