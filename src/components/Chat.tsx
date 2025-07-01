import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Bot, User, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { OpenAIService } from '@/lib/openai';
import { database } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const Chat: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: '👋 E aí! Beleza? Sou seu assistente financeiro e tô aqui pra te ajudar a organizar seus gastos! Manda aí o que você gastou que eu anoto tudo certinho! 💰',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [isCheckingConfig, setIsCheckingConfig] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    checkApiKeyConfiguration();
  }, []);

  const checkApiKeyConfiguration = async () => {
    setIsCheckingConfig(true);
    try {
      const config = await database.getConfiguration();
      setApiKeyConfigured(config.openai_api_key && config.openai_api_key.trim().length > 0);
    } catch (error) {
      console.error('Error checking API key configuration:', error);
      setApiKeyConfigured(false);
    } finally {
      setIsCheckingConfig(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !user) return;

    if (!apiKeyConfigured) {
      toast({
        title: "API não configurada",
        description: "O administrador precisa configurar a API key do OpenAI",
        variant: "destructive"
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const config = await database.getConfiguration();
      const openAI = new OpenAIService(config.openai_api_key);
      
      // Pass conversation history to make the AI smarter
      const conversationHistory = messages.slice(-4); // Last 4 messages for context
      const result = await openAI.extractExpenseData(inputValue, config.instrucoes_personalizadas, conversationHistory);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: result.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save expense if valid
      if (result.extraction.isValid && result.extraction.valor > 0) {
        await database.addExpense({
          usuario_id: user.id,
          valor: result.extraction.valor,
          categoria: result.extraction.categoria,
          descricao: result.extraction.descricao,
          data: result.extraction.data
        });

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
      console.error('Error in chat:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: '😅 Opa, rolou um perrengue aqui! Tenta mandar de novo em alguns segundos, beleza?',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Eita!",
        description: "Deu ruim aqui... Tenta de novo! 😅",
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

  if (isCheckingConfig) {
    return (
      <div className="max-w-4xl mx-auto h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando configuração...</p>
        </div>
      </div>
    );
  }

  if (!apiKeyConfigured) {
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
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <Bot className="w-6 h-6 text-primary" />
          <h2 className="text-lg font-semibold">Assistente Financeiro</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-muted-foreground">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
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
                <p className="text-sm">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        ))}
        
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

      {/* Input */}
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
            onClick={handleSendMessage}
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
