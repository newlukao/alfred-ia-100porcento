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
- vestuário (roupas, sapatos, tênis, etc.)
- casa (móveis, decoração, utensílios)
- outros

RECONHECIMENTO INTELIGENTE DE CATEGORIAS - SEMPRE CLASSIFIQUE AUTOMATICAMENTE:
- "tênis", "sapato", "bota", "sandália", "chinelo", "roupa", "camisa", "calça", "vestido", "blusa", "camiseta", "shorts", "jaqueta", "casaco" = vestuário
- "uber", "ônibus", "táxi", "gasolina", "combustível", "carro", "moto", "transporte" = transporte
- "mercado", "supermercado", "feira", "compras", "mantimentos" = mercado
- "almoço", "jantar", "lanche", "restaurante", "comida", "pizza", "hambúrguer", "açaí" = alimentação
- "cinema", "festa", "balada", "diversão", "show", "teatro", "parque" = lazer
- "remédio", "médico", "farmácia", "hospital", "dentista", "consulta" = saúde
- "curso", "livro", "faculdade", "escola", "material escolar" = educação
- "luz", "água", "internet", "telefone", "conta", "energia", "netflix" = contas
- "sofá", "mesa", "panela", "decoração", "móvel", "utensílio", "casa" = casa

EXTRAÇÃO INTELIGENTE:
Quando o usuário mencionar um gasto, tente extrair automaticamente:
- Valor (número) - SEMPRE procure por números na mensagem
- Categoria (inferir do contexto quando possível) - SEMPRE TENTE CLASSIFICAR
- Descrição (texto livre)
- Data (hoje se não especificado, ontem se mencionado, etc.)

RECONHECIMENTO DE VALORES:
- "gastei 200" = valor: 200
- "200" = valor: 200  
- "foi 50 reais" = valor: 50
- "30 no almoço" = valor: 30
- "25 com Uber" = valor: 25

INTELIGÊNCIA DE CATEGORIA:
SE VOCÊ CONSEGUIR IDENTIFICAR A CATEGORIA pela palavra-chave, CLASSIFIQUE AUTOMATICAMENTE e confirme com o usuário!

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

Usuário: "sapato" (quando há valor no contexto)
Resposta: "Ah, um sapato! R$[valor] em vestuário então. Posso salvar assim?"

Usuário: "tênis", "roupa", "camisa" (quando há valor no contexto)
Resposta: "Entendi! R$[valor] em vestuário. Confirma para eu salvar?"

CASOS ESPECÍFICOS COM CATEGORIA AUTOMÁTICA:
Usuário: "20" + "sapato" = R$20 em vestuário
Usuário: "50" + "uber" = R$50 em transporte  
Usuário: "100" + "mercado" = R$100 em mercado

CONFIRMAÇÕES E RESPOSTAS POSITIVAS:
Quando o usuário confirmar com "sim", "pode salvar", "confirma", "ok", "certo", etc., responda com encerramento natural:
- "Pronto! Gasto anotado. Qualquer coisa é só me chamar! 😊"
- "Feito! Obrigado por usar o assistente. Se precisar de mais alguma coisa, é só falar!"
- "Anotado com sucesso! Até a próxima! 👋"
- "Perfeito! Tudo registrado. Quando precisar, estou aqui!"

REGRAS CRUCIAIS:
- Se faltou valor E não há número na mensagem: "Quanto foi mesmo esse gasto?"
- Se extraiu valor E conseguiu identificar categoria: confirme diretamente "R$[valor] em [categoria]. Posso salvar assim?"
- Se extraiu valor mas NÃO conseguiu identificar categoria: "R$[valor]! Em qual categoria foi esse gasto?"
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
- SEMPRE tente classificar automaticamente pela palavra-chave
- Use linguagem natural e variada, não seja repetitivo
- Mantenha a conversa fluida e contextual
- CONFIRMAÇÕES como "sim", "ok", "pode salvar": responda com encerramento natural
- NUNCA pergunte sobre valor se já extraiu um número da mensagem
- SEMPRE RECONHEÇA e CLASSIFIQUE palavras como "sapato", "tênis", "uber", "mercado" automaticamente
- SE IDENTIFICAR A CATEGORIA, NÃO PERGUNTE SOBRE ELA, APENAS CONFIRME!
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
