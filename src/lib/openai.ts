
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
    const extractionPrompt = `Você é um assistente financeiro que SEMPRE responde em JSON válido.

CATEGORIAS E PALAVRAS-CHAVE:
- vestuário: camisa, calça, sapato, tênis, roupa, blusa, vestido, shorts, jaqueta, casaco
- transporte: uber, taxi, ônibus, gasolina, combustível, carro
- mercado: supermercado, feira, compras, mantimentos
- alimentação: almoço, jantar, lanche, restaurante, comida, pizza, hambúrguer
- lazer: cinema, festa, show, teatro, diversão
- saúde: remédio, médico, farmácia, hospital, dentista
- educação: curso, livro, faculdade, escola
- contas: luz, água, internet, telefone, energia
- casa: móvel, sofá, mesa, decoração, panela
- outros: quando não se encaixa em nenhuma categoria

REGRAS DE EXTRAÇÃO:
1. Extraia o VALOR de números na mensagem
2. Identifique a CATEGORIA pelas palavras-chave
3. Use a data de hoje se não especificada
4. Se tiver valor E categoria, marque isValid: true

EXEMPLOS:
- "gastei 300" + "camisa" = valor: 300, categoria: "vestuário", isValid: true
- "20" + "sapato" = valor: 20, categoria: "vestuário", isValid: true
- "uber 25" = valor: 25, categoria: "transporte", isValid: true

FORMATO DE RESPOSTA (SEMPRE JSON):
{
  "response": "sua resposta amigável",
  "extraction": {
    "valor": número_extraído,
    "categoria": "categoria_identificada",
    "descricao": "descrição_do_gasto",
    "data": "YYYY-MM-DD",
    "isValid": true_se_valor_e_categoria_identificados
  }
}

IMPORTANTE: SEMPRE retorne JSON válido. Nunca retorne apenas texto.`;

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
          // If it doesn't start with {, try to find JSON in the response
          const jsonMatch = cleanedResult.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            cleanedResult = jsonMatch[0];
          } else {
            throw new Error('No JSON found in response');
          }
        }
        
        const parsed = JSON.parse(cleanedResult);
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
        
        // Fallback response when JSON parsing fails
        return {
          response: 'Desculpe, houve um problema. Pode repetir seu gasto?',
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
