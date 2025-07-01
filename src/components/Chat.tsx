
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Bot, User, Loader2 } from 'lucide-react';
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
      content: '👋 Olá! Sou seu assistente financeiro pessoal. Conte-me sobre seus gastos e eu vou organizá-los para você!',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !apiKey.trim()) return;
    if (!user) return;

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
      const openAI = new OpenAIService(apiKey);
      const config = await database.getConfiguration();
      
      const result = await openAI.extractExpenseData(inputValue, config.instrucoes_personalizadas);
      
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

        toast({
          title: "Gasto registrado! 💰",
          description: `R$ ${result.extraction.valor.toFixed(2)} em ${result.extraction.categoria}`,
        });
      }

    } catch (error) {
      console.error('Error in chat:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: '😔 Desculpe, ocorreu um erro. Verifique sua API key do OpenAI e tente novamente.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Erro",
        description: "Falha ao processar mensagem. Verifique sua API key.",
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

  if (showApiKeyInput) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">🔑 Configurar API Key</h2>
            <p className="text-muted-foreground">
              Para usar o chat com IA, insira sua chave da API do OpenAI
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                API Key do OpenAI
              </label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full"
              />
            </div>
            
            <Alert>
              <AlertDescription>
                💡 Sua API key será armazenada apenas localmente no seu navegador e usada apenas para suas conversas.
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={() => setShowApiKeyInput(false)}
              className="w-full"
              disabled={!apiKey.trim()}
            >
              Começar Chat
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
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowApiKeyInput(true)}
        >
          Trocar API Key
        </Button>
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
            placeholder="Digite seu gasto... ex: Gastei R$ 45 no mercado"
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
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
