
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
- vestuário: camisa, calça, sapato, tênis, roupa, blusa, vestido, shorts, jaqueta, casaco, meia, cueca, calcinha, sutiã
- transporte: uber, taxi, ônibus, gasolina, combustível, carro, metrô, trem, avião, passagem
- mercado: supermercado, feira, compras, mantimentos, comida, fruta, verdura, carne, pão
- alimentação: almoço, jantar, lanche, restaurante, pizza, hambúrguer, café, bar, bebida
- lazer: cinema, festa, show, teatro, diversão, jogo, parque, viagem
- saúde: remédio, médico, farmácia, hospital, dentista, consulta, exame
- educação: curso, livro, faculdade, escola, material escolar
- contas: luz, água, internet, telefone, energia, gás, iptu, financiamento
- casa: móvel, sofá, mesa, decoração, panela, utensílio, limpeza, reforma
- outros: quando não se encaixa em nenhuma categoria específica

REGRAS IMPORTANTES:
1. Se houver VALOR e CATEGORIA identificados, SEMPRE marque isValid: true
2. Extraia valores de números na mensagem (300, 20, 45.50, etc)
3. Identifique categoria pelas palavras-chave da mensagem
4. Use data de hoje se não especificada
5. Seja POSITIVO e CONFIRME o registro quando isValid for true

EXEMPLOS DE SUCESSO:
- "gastei 300" + "camisa" = valor: 300, categoria: "vestuário", isValid: true
- "comprei uma camisa" + contexto de 300 = valor: 300, categoria: "vestuário", isValid: true
- "sapato 50" = valor: 50, categoria: "vestuário", isValid: true

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
{
  "response": "sua_resposta_positiva_confirmando_o_registro",
  "extraction": {
    "valor": número_extraído,
    "categoria": "categoria_identificada",
    "descricao": "descrição_do_gasto",
    "data": "YYYY-MM-DD",
    "isValid": true_se_valor_e_categoria_identificados
  }
}

IMPORTANTE: 
- SEMPRE retorne JSON válido
- Se identificar valor E categoria, SEMPRE isValid: true
- Confirme o registro na resposta quando isValid for true`;

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
        
        // Ensure we have proper validation logic
        const valor = parsed.extraction?.valor || 0;
        const categoria = parsed.extraction?.categoria || '';
        const isValid = valor > 0 && categoria && categoria !== '';
        
        return {
          response: parsed.response || 'Gasto registrado com sucesso! 💰',
          extraction: {
            valor: valor,
            categoria: categoria,
            descricao: parsed.extraction?.descricao || `Gasto em ${categoria}`,
            data: parsed.extraction?.data || new Date().toISOString().split('T')[0],
            isValid: isValid
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
