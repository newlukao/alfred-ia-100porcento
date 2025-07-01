
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Webhook, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { database } from '@/lib/database';
import { OpenAIService } from '@/lib/openai';

interface WhatsAppMessage {
  from: string;
  body: string;
  timestamp: string;
}

const WhatsAppWebhook: React.FC = () => {
  const { toast } = useToast();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [verifyToken, setVerifyToken] = useState('meu_token_secreto_123');
  const [isProcessingEnabled, setIsProcessingEnabled] = useState(true);
  const [testMessage, setTestMessage] = useState('Gastei 50 reais no mercado');
  const [recentMessages, setRecentMessages] = useState<WhatsAppMessage[]>([]);

  // Simula o processamento de webhook do WhatsApp
  const handleWebhookSimulation = async () => {
    if (!testMessage.trim()) return;

    const simulatedMessage: WhatsAppMessage = {
      from: '+5511999999999',
      body: testMessage,
      timestamp: new Date().toISOString()
    };

    try {
      // Processa a mensagem como se fosse um webhook real
      const config = await database.getConfiguration();
      const openAI = new OpenAIService(config.openai_api_key);
      
      const result = await openAI.extractExpenseData(testMessage, config.instrucoes_personalizadas);
      
      // Adiciona na lista de mensagens recentes
      setRecentMessages(prev => [simulatedMessage, ...prev.slice(0, 4)]);

      // Se o gasto for válido, salva no banco
      if (result.extraction.isValid && result.extraction.valor > 0) {
        // Como não temos usuário do WhatsApp, usa o usuário demo
        await database.addExpense({
          usuario_id: '1', // Demo user
          valor: result.extraction.valor,
          categoria: result.extraction.categoria,
          descricao: `[WhatsApp] ${result.extraction.descricao}`,
          data: result.extraction.data
        });

        toast({
          title: "✅ Gasto registrado via WhatsApp!",
          description: `R$ ${result.extraction.valor.toFixed(2)} em ${result.extraction.categoria}`,
        });
      } else {
        toast({
          title: "⚠️ Mensagem processada",
          description: result.response,
          variant: "destructive"
        });
      }

      setTestMessage('');
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      toast({
        title: "Erro",
        description: "Falha ao processar mensagem do WhatsApp",
        variant: "destructive"
      });
    }
  };

  const generateWebhookCode = () => {
    return `
// Endpoint para receber webhooks do WhatsApp
app.post('/webhook/whatsapp', async (req, res) => {
  try {
    const { messages } = req.body.entry[0].changes[0].value;
    
    if (messages && messages.length > 0) {
      const message = messages[0];
      
      // Processa a mensagem de gasto
      const openAI = new OpenAIService(process.env.OPENAI_API_KEY);
      const result = await openAI.extractExpenseData(message.text.body);
      
      // Salva no banco se válido
      if (result.extraction.isValid) {
        await database.addExpense({
          usuario_id: message.from, // número do WhatsApp
          valor: result.extraction.valor,
          categoria: result.extraction.categoria,
          descricao: result.extraction.descricao,
          data: result.extraction.data
        });
        
        // Opcional: responder no WhatsApp
        await sendWhatsAppMessage(message.from, result.response);
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});

// Verificação do webhook (obrigatório para WhatsApp)
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode === 'subscribe' && token === '${verifyToken}') {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="w-6 h-6 text-green-600" />
            <span>WhatsApp Webhook Integration</span>
          </CardTitle>
          <CardDescription>
            Configure seu sistema para receber gastos diretamente via WhatsApp Business API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">URL do Webhook</Label>
              <Input
                id="webhook-url"
                placeholder="https://seu-servidor.com/webhook/whatsapp"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="verify-token">Token de Verificação</Label>
              <Input
                id="verify-token"
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
              />
            </div>
          </div>

          <Alert>
            <Webhook className="h-4 w-4" />
            <AlertDescription>
              <strong>Como configurar:</strong>
              <br />1. Configure seu webhook no Meta for Developers
              <br />2. Use a URL e token acima para verificação
              <br />3. Implemente o código do servidor (exemplo abaixo)
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Simulador de Teste */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span>Teste de Mensagem</span>
          </CardTitle>
          <CardDescription>
            Simule como seria o processamento de uma mensagem do WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Digite uma mensagem de gasto..."
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleWebhookSimulation()}
            />
            <Button onClick={handleWebhookSimulation} disabled={!testMessage.trim()}>
              Testar
            </Button>
          </div>

          {recentMessages.length > 0 && (
            <div className="space-y-2">
              <Label>Mensagens Processadas:</Label>
              {recentMessages.map((msg, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-muted rounded">
                  <Badge variant="outline">{msg.from}</Badge>
                  <span className="text-sm">{msg.body}</span>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Código do Servidor */}
      <Card>
        <CardHeader>
          <CardTitle>Código para seu Servidor</CardTitle>
          <CardDescription>
            Implemente este código no seu backend para processar webhooks do WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={generateWebhookCode()}
            readOnly
            className="font-mono text-sm"
            rows={25}
          />
        </CardContent>
      </Card>

      {/* Vantagens */}
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600">Vantagens do WhatsApp</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">✅ Mais Natural</h4>
              <p className="text-sm text-muted-foreground">
                Usuários já estão acostumados com WhatsApp
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">⚡ Mais Rápido</h4>
              <p className="text-sm text-muted-foreground">
                Não precisa abrir app ou site específico
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">🔄 Automático</h4>
              <p className="text-sm text-muted-foreground">
                Processa gastos automaticamente via webhook
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">📱 Mobile First</h4>
              <p className="text-sm text-muted-foreground">
                Perfeito para registrar gastos na hora
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppWebhook;
