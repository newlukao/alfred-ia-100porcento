
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

  async chatCompletion(messages: ChatMessage[], model: string = 'gpt-4o-mini'): Promise<string> {
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
          temperature: 0.3,
          max_tokens: 300,
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
    const extractionPrompt = `Você é um assistente financeiro que SEMPRE responde em JSON válido e registra gastos automaticamente.

CATEGORIAS E PALAVRAS-CHAVE:
- alimentação: picanha, carne, frango, peixe, almoço, jantar, lanche, restaurante, pizza, hambúrguer, café, bar, bebida, comida, refeição, delivery, ifood
- vestuário: camisa, calça, sapato, tênis, roupa, blusa, vestido, shorts, jaqueta, casaco, meia, cueca, calcinha, sutiã
- transporte: uber, taxi, ônibus, gasolina, combustível, carro, metrô, trem, avião, passagem
- mercado: supermercado, feira, compras, mantimentos, fruta, verdura, carne, pão, açougue, padaria
- lazer: cinema, festa, show, teatro, diversão, jogo, parque, viagem
- saúde: remédio, médico, farmácia, hospital, dentista, consulta, exame
- educação: curso, livro, faculdade, escola, material escolar
- contas: luz, água, internet, telefone, energia, gás, iptu, financiamento
- casa: móvel, sofá, mesa, decoração, panela, utensílio, limpeza, reforma
- outros: quando não se encaixa em nenhuma categoria específica

REGRAS CRÍTICAS:
1. EXTRAIA VALORES de qualquer número mencionado (200, 50, 25.5, etc)
2. IDENTIFIQUE CATEGORIAS por palavras-chave (picanha = alimentação, camisa = vestuário)
3. Se encontrar VALOR OU CATEGORIA, processe e marque isValid: true
4. CONFIRME sempre que registrar um gasto válido
5. Para palavras como "picanha", "comida" = categoria "alimentação"

EXEMPLOS FUNCIONAIS:
- "200" + "picanha" = valor: 200, categoria: "alimentação", isValid: true
- "gastei 50" + "camisa" = valor: 50, categoria: "vestuário", isValid: true  
- "30 reais" + "uber" = valor: 30, categoria: "transporte", isValid: true
- "picanha" (sem valor) = valor: 0, categoria: "alimentação", isValid: false
- "200" (sem categoria) = valor: 200, categoria: "", isValid: false

FORMATO OBRIGATÓRIO (JSON):
{
  "response": "mensagem_confirmando_o_registro_ou_pedindo_informacao_faltante",
  "extraction": {
    "valor": numero_encontrado_ou_0,
    "categoria": "categoria_identificada_ou_vazio",
    "descricao": "descrição_do_gasto",
    "data": "YYYY-MM-DD",
    "isValid": true_se_valor_E_categoria_identificados
  }
}

IMPORTANTE: 
- Se identificar categoria como "picanha" ou "comida", use "alimentação"
- SEMPRE retorne JSON válido
- Apenas marque isValid: true se tiver VALOR > 0 E CATEGORIA não vazia`;

    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: extractionPrompt },
        { role: 'user', content: userMessage }
      ];

      const result = await this.chatCompletion(messages);
      console.log('OpenAI raw response:', result);
      
      try {
        // Clean the response to ensure it's valid JSON
        let cleanedResult = result.trim();
        if (!cleanedResult.startsWith('{')) {
          const jsonMatch = cleanedResult.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            cleanedResult = jsonMatch[0];
          } else {
            throw new Error('No JSON found in response');
          }
        }
        
        const parsed = JSON.parse(cleanedResult);
        
        // Enhanced validation and value extraction
        let valor = 0;
        let categoria = '';
        
        // Extract value from the message if not properly extracted
        if (parsed.extraction?.valor) {
          valor = parsed.extraction.valor;
        } else {
          // Try to extract number from user message
          const numberMatch = userMessage.match(/\d+(?:\.\d+)?/);
          if (numberMatch) {
            valor = parseFloat(numberMatch[0]);
          }
        }
        
        // Extract category with better mapping
        if (parsed.extraction?.categoria) {
          categoria = parsed.extraction.categoria;
        } else {
          // Map common food terms to alimentação
          const foodTerms = ['picanha', 'carne', 'comida', 'almoço', 'jantar', 'lanche', 'restaurante'];
          const clothingTerms = ['camisa', 'calça', 'sapato', 'roupa'];
          const transportTerms = ['uber', 'taxi', 'gasolina'];
          
          const lowerMessage = userMessage.toLowerCase();
          
          if (foodTerms.some(term => lowerMessage.includes(term))) {
            categoria = 'alimentação';
          } else if (clothingTerms.some(term => lowerMessage.includes(term))) {
            categoria = 'vestuário';
          } else if (transportTerms.some(term => lowerMessage.includes(term))) {
            categoria = 'transporte';
          }
        }
        
        const isValid = valor > 0 && categoria && categoria !== '';
        
        let response = parsed.response || '';
        if (isValid) {
          response = `✅ Gasto registrado! R$ ${valor.toFixed(2)} em ${categoria}`;
        } else if (valor > 0 && !categoria) {
          response = `R$ ${valor.toFixed(2)} registrado! Em qual categoria? (alimentação, vestuário, transporte...)`;
        } else if (!valor && categoria) {
          response = `Categoria ${categoria} identificada! Qual foi o valor do gasto?`;
        } else {
          response = 'Por favor, me informe o valor e a categoria do seu gasto. Ex: "Gastei R$ 50 no mercado"';
        }
        
        return {
          response: response,
          extraction: {
            valor: valor,
            categoria: categoria,
            descricao: parsed.extraction?.descricao || (categoria ? `Gasto em ${categoria}` : 'Gasto'),
            data: parsed.extraction?.data || new Date().toISOString().split('T')[0],
            isValid: isValid
          }
        };
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        console.log('Raw response that failed to parse:', result);
        
        // Enhanced fallback with better parsing
        let valor = 0;
        let categoria = '';
        
        // Extract number from user message
        const numberMatch = userMessage.match(/\d+(?:\.\d+)?/);
        if (numberMatch) {
          valor = parseFloat(numberMatch[0]);
        }
        
        // Simple category detection
        const lowerMessage = userMessage.toLowerCase();
        if (['picanha', 'carne', 'comida', 'almoço', 'jantar'].some(term => lowerMessage.includes(term))) {
          categoria = 'alimentação';
        } else if (['camisa', 'roupa', 'sapato'].some(term => lowerMessage.includes(term))) {
          categoria = 'vestuário';
        }
        
        const isValid = valor > 0 && categoria !== '';
        
        return {
          response: isValid ? 
            `✅ Gasto registrado! R$ ${valor.toFixed(2)} em ${categoria}` : 
            'Desculpe, não consegui processar. Pode repetir com valor e categoria? Ex: "Gastei R$ 50 em comida"',
          extraction: {
            valor: valor,
            categoria: categoria,
            descricao: categoria ? `Gasto em ${categoria}` : 'Gasto',
            data: new Date().toISOString().split('T')[0],
            isValid: isValid
          }
        };
      }
    } catch (error) {
      console.error('Error extracting expense data:', error);
      throw error;
    }
  }
}
