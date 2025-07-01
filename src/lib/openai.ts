
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

Analise a mensagem do usuário e extraia informações de gastos. Se houver um gasto mencionado, extraia:
- valor (número)
- categoria (mercado, transporte, contas, lazer, alimentação, saúde, educação, outros)
- descrição (texto livre)
- data (formato YYYY-MM-DD, use hoje se não especificado)

Responda no formato JSON:
{
  "response": "sua resposta amigável ao usuário",
  "extraction": {
    "valor": 0,
    "categoria": "",
    "descricao": "",
    "data": "",
    "isValid": false
  }
}

Se não houver gasto válido, mantenha isValid como false.
`;

    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: extractionPrompt },
        { role: 'user', content: userMessage }
      ];

      const result = await this.chatCompletion(messages);
      
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
