import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Bot, User, Loader2, AlertTriangle, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { OpenAIService } from '@/lib/openai';
import { database } from '@/lib/database';
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

type ChatState = 'initial' | 'waiting_expense' | 'waiting_income' | 'completed';
type TransactionType = 'expense' | 'income' | null;

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
      const history = await database.getConversationHistory(user.id, 20);
      
      if (history.length === 0) {
        // First time user - show welcome message based on plan
        let welcomeMessage: Message;
        
        if (user.plan_type === 'ouro') {
          welcomeMessage = {
            id: '1',
            type: 'assistant',
            content: `👋 E aí! Sou seu assistente financeiro premium! 💎

Como você tem o plano ouro, posso ajudar com GASTOS e RECEBIMENTOS!

📝 **COMO USAR (super fácil):**

💸 **Para GASTOS:**
• "gastei 50 no mercado"
• "comprei uma pizza por 35"
• "paguei 100 de luz"

💰 **Para RECEBIMENTOS:**
• "recebi 3000 de salário" 
• "ganhei 500 de freelance"
• "recebi 200 de dívida"

🎯 **Dica:** Sempre fale o VALOR e ONDE/DO QUE foi!

O que você quer registrar hoje?`,
            timestamp: new Date(),
            showOptions: true,
            options: [
              { label: '💸 Registrar um Gasto', value: 'expense', icon: '💸' },
              { label: '💰 Registrar um Recebimento', value: 'income', icon: '💰' }
            ]
          };
        } else {
          welcomeMessage = {
            id: '1',
            type: 'assistant',
            content: `👋 E aí! Sou seu assistente financeiro! 

📝 **COMO USAR (super fácil):**

💸 **Para GASTOS, fale assim:**
• "gastei 50 no mercado"
• "comprei uma pizza por 35" 
• "paguei 100 de luz"
• "saiu 25 do uber"

🎯 **Dica:** Sempre fale o VALOR e ONDE foi!

Exemplos: "gastei 80 no supermercado", "paguei 200 de internet"

Manda aí seu gasto! 💰`,
            timestamp: new Date()
          };
        }
        setMessages([welcomeMessage]);
        
        // Save welcome message to history
        await database.addConversationMessage(user.id, 'assistant', welcomeMessage.content);
      } else {
        // Load existing conversation
        const loadedMessages: Message[] = history.map(h => ({
          id: h.id,
          type: h.type,
          content: h.content,
          timestamp: new Date(h.timestamp)
        }));
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
      
      const config = await database.getConfiguration();
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

  const createCompletionMessage = (): Message => {
    if (user?.plan_type === 'ouro') {
      return createOptionsMessage(
        '🎉 Perfeito! Transação registrada com sucesso!\n\nPosso te ajudar com mais alguma coisa?',
        [
          { label: 'Registrar outro Gasto', value: 'expense', icon: '💸' },
          { label: 'Registrar outro Recebimento', value: 'income', icon: '💰' },
          { label: 'Finalizar por agora', value: 'finish', icon: '✅' }
        ]
      );
    } else {
      return createOptionsMessage(
        '🎉 Massa! Gasto registrado! Quer adicionar mais algum?',
        [
          { label: 'Registrar outro Gasto', value: 'expense', icon: '💸' },
          { label: 'Finalizar por agora', value: 'finish', icon: '✅' }
        ]
      );
    }
  };

  const handleOptionSelect = async (option: string) => {
    console.log('🎯 Opção selecionada:', option);
    
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
      content: option === 'expense' ? '💸 Adicionar um Gasto' : 
               option === 'income' ? '💰 Adicionar um Recebimento' : 
               option === 'finish' ? '✅ Finalizar por agora' : option,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    await database.addConversationMessage(user!.id, 'user', userMessage.content);
    
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
    } else if (option === 'finish') {
      setChatState('initial');
      setTransactionType(null);
      responseMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: '✅ Beleza! Qualquer coisa é só me chamar! Estou aqui para te ajudar sempre! 😊',
        timestamp: new Date()
      };
    } else {
      // Reset to initial state para opções não reconhecidas
      setChatState('initial');
      setTransactionType(null);
      if (user?.plan_type === 'ouro') {
        responseMessage = createOptionsMessage(
          '👋 E aí! O que você gostaria de fazer?',
          [
            { label: 'Adicionar um Gasto', value: 'expense', icon: '💸' },
            { label: 'Adicionar um Recebimento', value: 'income', icon: '💰' }
          ]
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
    await database.addConversationMessage(user!.id, 'assistant', responseMessage.content);
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

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: valueToSend,
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];

    setMessages(prev => [...prev, userMessage]);
    
    await database.addConversationMessage(user.id, 'user', valueToSend);
    
    if (!customValue) setInputValue('');
    
    setIsLoading(true);

    try {
      const config = await database.getConfiguration();
      
      const userPersonality = await database.getUserPersonality(user.id);
      
      console.log('🚀 Processando com sistema otimizado');
      
      const openaiService = new OpenAIService(config.openai_api_key);
      const conversationHistory = updatedMessages.slice(-20);
      // 🔥 USAR NOVO MÉTODO: extractTransactionData
      const result = await openaiService.extractTransactionData(
        valueToSend, 
        config.instrucoes_personalizadas, 
        conversationHistory,
        userPersonality?.personality_profile,
        user.id,
        chatState // Passa o estado do chat
      );
      
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
      
      await database.addConversationMessage(user.id, 'assistant', result.response);
      
      if (result.personalityUpdate && result.personalityUpdate.trim().length > 0) {
        await database.updateUserPersonality(user.id, result.personalityUpdate);
        console.log('Personality updated:', result.personalityUpdate);
      }

      console.log('💰 Chat - Resultado da IA:', result);
      console.log('💰 Chat - Tipo do resultado:', typeof result);
      console.log('💰 Chat - Extraction válida?', result.extraction?.isValid);
      console.log('💰 Chat - Valor extraído:', result.extraction?.valor);
      console.log('💰 Chat - Descrição:', result.extraction?.descricao);
      
      if (result.extraction?.isValid && result.extraction?.valor > 0) {
        // 🔥 USAR NOVO CAMPO TYPE da extração
        const isIncome = result.extraction.type === 'income';
        
        if (isIncome && user.plan_type === 'ouro' && database.addIncome) {
          // Save as income for gold plan users
          console.log('💎 Chat - Salvando recebimento no banco (Plano Ouro):', {
            user_id: user.id,
            amount: result.extraction?.valor,
            category: result.extraction?.categoria,
            description: result.extraction?.descricao,
            date: result.extraction?.data
          });
          
          try {
            const savedIncome = await database.addIncome({
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
              "Caraca, que onda boa! Recebeu e eu anotei! 📈",
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
              database.addConversationMessage(user.id, 'assistant', randomMessage);
              
              // Completion message com delay
              setTimeout(() => {
                const completionMessage = createCompletionMessage();
                setMessages(prev => [...prev, completionMessage]);
                database.addConversationMessage(user.id, 'assistant', completionMessage.content);
              }, 1500);
            }, 1000);
            
          } catch (incomeError) {
            console.error('❌ Chat - Erro ao salvar recebimento:', incomeError);
          }
        } else if (isIncome && user.plan_type === 'bronze') {
          // Suggest upgrade for bronze users trying to add income
          toast({
            title: "🥇 Upgrade para Plano Ouro!",
            description: "Para registrar recebimentos, você precisa do plano ouro!",
            variant: "default"
          });
        } else {
          // Save as expense (default behavior)
          console.log('💾 Chat - Salvando gasto no banco:', {
            usuario_id: user.id,
            valor: result.extraction?.valor,
            categoria: result.extraction?.categoria,
            descricao: result.extraction?.descricao,
            data: result.extraction?.data
          });
          
          try {
            const savedExpense = await database.addExpense({
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
              database.addConversationMessage(user.id, 'assistant', randomMessage);
              
              // Completion message com delay
              setTimeout(() => {
                const completionMessage = createCompletionMessage();
                setMessages(prev => [...prev, completionMessage]);
                database.addConversationMessage(user.id, 'assistant', completionMessage.content);
              }, 1500);
            }, 1000);
            
          } catch (expenseError) {
            console.error('❌ Chat - Erro ao salvar gasto:', expenseError);
          }
        }
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
      
      await database.addConversationMessage(user.id, 'assistant', errorMessage);
      
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
    
    if (user?.plan_type === 'ouro') {
      return "Ex: 'gastei 50 no mercado' ou 'recebi 3000 de salário' 😎💎";
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
            <h2 className="text-lg font-semibold">
              Assistente Financeiro {user?.plan_type === 'ouro' && '💎'}
            </h2>
            {chatState !== 'initial' && (
              <p className="text-xs text-muted-foreground">
                {chatState === 'waiting_expense' && '💸 Aguardando dados do gasto...'}
                {chatState === 'waiting_income' && '💰 Aguardando dados do recebimento...'}
                {chatState === 'completed' && '✅ Transação concluída!'}
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
          {(chatState !== 'initial' && user?.plan_type === 'ouro') && (
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
