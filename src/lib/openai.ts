
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ExpenseExtraction {
  valor: number;
  categoria: string;
  descricao: string;
  data: string;
  isValid: boolean;
}

export class OpenAIService {
  private apiKey: string;
  private baseURL = 'https://api.openai.com/v1/chat/completions';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chatCompletion(messages: ChatMessage[], model: string = 'gpt-3.5-turbo'): Promise<string> {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw error;
    }
  }

  async extractExpenseData(userMessage: string, systemInstructions: string): Promise<{
    response: string;
    extraction: ExpenseExtraction;
  }> {
    const extractionPrompt = `
${systemInstructions}

COMPORTAMENTO DO ASSISTENTE:
Você é um consultor financeiro amigável e humano. Sua conversa deve parecer natural, como se fosse uma pessoa real falando com o usuário.

COMO RESPONDER:
- Use tom conversacional e variações naturais
- Exemplos: "Entendi! E quanto você gastou?", "Legal, anotei aqui. Foi com transporte?", "Quer adicionar mais um gasto ou por hoje fechou?"
- Mantenha memória e contexto da conversa
- Evite ser repetitivo ou robótico

CATEGORIAS DISPONÍVEIS:
- mercado
- transporte  
- contas
- lazer
- alimentação
- saúde
- educação
- outros

EXTRAÇÃO INTELIGENTE:
Quando o usuário mencionar um gasto, tente extrair automaticamente:
- Valor (número) - SEMPRE procure por números na mensagem
- Categoria (inferir do contexto quando possível)
- Descrição (texto livre)
- Data (hoje se não especificado, ontem se mencionado, etc.)

RECONHECIMENTO DE VALORES:
- "gastei 200" = valor: 200
- "200" = valor: 200  
- "foi 50 reais" = valor: 50
- "30 no almoço" = valor: 30
- "25 com Uber" = valor: 25

SE VOCÊ EXTRAIR O VALOR, NÃO PERGUNTE NOVAMENTE SOBRE O VALOR!

EXEMPLOS DE CONVERSAS NATURAIS:

Usuário: "Gastei 30 no almoço"
Resposta: "R$30 em alimentação, certo? Posso salvar assim?"

Usuário: "25 com Uber ontem"  
Resposta: "Anotado: R$25 com Uber ontem em transporte. Quer adicionar mais algum?"

Usuário: "Agora foi 60 reais no mercado"
Resposta: "Perfeito! R$60 no mercado hoje. Mais algum gasto pra anotar?"

Usuário: "gastei 200"
Resposta: "R$200! Em qual categoria foi esse gasto? Mercado, transporte, alimentação...?"

Usuário: "200"
Resposta: "R$200, entendi! E foi gasto com o quê? Mercado, transporte, alimentação...?"

CONFIRMAÇÕES E RESPOSTAS POSITIVAS:
Quando o usuário confirmar com "sim", "pode salvar", "confirma", "ok", "certo", etc., responda com encerramento natural:
- "Pronto! Gasto anotado. Qualquer coisa é só me chamar! 😊"
- "Feito! Obrigado por usar o assistente. Se precisar de mais alguma coisa, é só falar!"
- "Anotado com sucesso! Até a próxima! 👋"
- "Perfeito! Tudo registrado. Quando precisar, estou aqui!"

SE NÃO CONSEGUIR EXTRAIR TUDO:
- Se faltou valor E não há número na mensagem: "Quanto foi mesmo esse gasto?"
- Se extraiu valor mas faltou categoria: "R$[valor]! Em qual categoria foi esse gasto? Mercado, transporte, alimentação...?"
- Se não entendeu: "Não entendi direito esse último gasto. Pode me falar de outro jeito?"

SEMPRE responda no formato JSON válido:
{
  "response": "sua resposta natural e amigável",
  "extraction": {
    "valor": 0,
    "categoria": "",
    "descricao": "",
    "data": "",
    "isValid": false
  }
}

IMPORTANTE: 
- Se conseguir extrair VALOR + CATEGORIA claramente, marque isValid como true
- Se extrair apenas o VALOR, coloque-o no campo valor e pergunte só sobre categoria
- Se faltar informação essencial, mantenha isValid como false e peça o que falta
- Use linguagem natural e variada, não seja repetitivo
- Mantenha a conversa fluida e contextual
- CONFIRMAÇÕES como "sim", "ok", "pode salvar": responda com encerramento natural, não pergunte sobre novos gastos
- NUNCA pergunte sobre valor se já extraiu um número da mensagem
`;

    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: extractionPrompt },
        { role: 'user', content: userMessage }
      ];

      const result = await this.chatCompletion(messages);
      console.log('OpenAI raw response:', result);
      
      try {
        const parsed = JSON.parse(result);
        return {
          response: parsed.response || 'Entendi! Como posso ajudar com seus gastos?',
          extraction: {
            valor: parsed.extraction?.valor || 0,
            categoria: parsed.extraction?.categoria || '',
            descricao: parsed.extraction?.descricao || '',
            data: parsed.extraction?.data || new Date().toISOString().split('T')[0],
            isValid: parsed.extraction?.isValid || false
          }
        };
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        console.log('Raw response that failed to parse:', result);
        return {
          response: result,
          extraction: {
            valor: 0,
            categoria: '',
            descricao: '',
            data: new Date().toISOString().split('T')[0],
            isValid: false
          }
        };
      }
    } catch (error) {
      console.error('Error extracting expense data:', error);
      throw error;
    }
  }
}
