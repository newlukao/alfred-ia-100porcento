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
}

const Chat: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [isCheckingConfig, setIsCheckingConfig] = useState(true);
  const [isSecureMode, setIsSecureMode] = useState(true);
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
        // First time user - show welcome message
        const welcomeMessage: Message = {
          id: '1',
          type: 'assistant',
          content: '👋 E aí! Beleza? Sou seu assistente financeiro pessoal e tô aqui pra te ajudar a organizar seus gastos! Manda aí o que você gastou! 💰',
          timestamp: new Date()
        };
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
      const result = await openaiService.extractExpenseData(
        valueToSend, 
        config.instrucoes_personalizadas, 
        conversationHistory,
        userPersonality?.personality_profile,
        user.id
      );
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: result.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      await database.addConversationMessage(user.id, 'assistant', result.response);
      
      if (result.personalityUpdate && result.personalityUpdate.trim().length > 0) {
        await database.updateUserPersonality(user.id, result.personalityUpdate);
        console.log('Personality updated:', result.personalityUpdate);
      }

      console.log('💰 Chat - Resultado da IA:', result);
      console.log('💰 Chat - Resultado RAW da Edge Function:', result);
      console.log('💰 Chat - Tipo do resultado:', typeof result);
      console.log('💰 Chat - Extraction válida?', result.extraction?.isValid);
      console.log('💰 Chat - Valor extraído:', result.extraction?.valor);
      
              if (result.extraction?.isValid && result.extraction?.valor > 0) {
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
          } catch (expenseError) {
            console.error('❌ Chat - Erro ao salvar gasto:', expenseError);
          }

        const successMessages = [
          "Massa! Gasto registrado! 💰",
          "Show! Anotado no sistema! 🎉",
          "Top! Registrado com sucesso! ✨",
          "Fechou! Mais um gasto no controle! 📊",
          "Mandou bem! Gasto salvo! 🚀",
          "Dahora! Tudo anotado! 💪"
        ];
        
        const randomMessage = successMessages[Math.floor(Math.random() * successMessages.length)];

        toast({
          title: randomMessage,
                      description: `R$ ${result.extraction.valor.toFixed(2)} em ${result.extraction.categoria}`,
        });
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
      handleSendMessage();
    }
  };

  function isConfirmationMessage(content: string) {
    const lower = content.toLowerCase();
    return (
      lower.includes('tá certo?') ||
      lower.includes('ta certo?') ||
      lower.includes('esse gasto foi hoje') ||
      lower.includes('responde "sim" se foi hoje') ||
      lower.includes('responde "sim" pra confirmar')
    );
  }

  function isDateRequestMessage(content: string) {
    const lower = content.toLowerCase();
    return (
      lower.includes('quando foi esse gasto') ||
      lower.includes('me fala a data')
    );
  }

  const handleSendButtonClick = () => {
    handleSendMessage();
  };
  const handleSendConfirmation = (value: string) => () => {
    void handleSendMessage(value);
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
          <h2 className="text-lg font-semibold">Assistente Financeiro</h2>
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
        </div>
      </div>



      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, idx) => {
          const showConfirmationButtons =
            message.type === 'assistant' && isConfirmationMessage(message.content);
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
                  <p className="text-sm whitespace-pre-line">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                  {showConfirmationButtons ? (
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleSendMessage('sim')}
                        disabled={isLoading}
                      >
                        Sim
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleSendMessage('não')}
                        disabled={isLoading}
                      >
                        Não
                      </Button>
                    </div>
                  ) : null}
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
            placeholder="Manda aí seu gasto... tipo: 'Gastei R$ 45 no mercado' 😎"
            className="flex-1"
            disabled={isLoading || !apiKeyConfigured}
          />
          <Button
            onClick={handleSendButtonClick}
            disabled={!inputValue.trim() || isLoading || !apiKeyConfigured}
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
