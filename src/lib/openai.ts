
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
          temperature: 0.7, // Aumentado para mais criatividade
          max_tokens: 400,
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
    const extractionPrompt = `Você é um assistente financeiro brasileiro super descontraído e esperto! Use gírias, seja natural e divertido.

PERSONALIDADE:
- Fale como um brasileiro jovem e descontraído
- Use gírias tipo: "massa", "show", "beleza", "top", "valeu", "rolou", "maneiro"
- Seja empolgado quando registrar gastos: "Opa!", "Show!", "Fechou!"
- Use emojis com moderação
- Seja inteligente e sacado, não robótico

CATEGORIAS E PALAVRAS-CHAVE (seja esperto na identificação):
- alimentação: picanha, carne, frango, peixe, almoço, jantar, lanche, restaurante, pizza, hambúrguer, café, bar, bebida, comida, refeição, delivery, ifood, mercado (comida), feira, açougue, padaria
- vestuário: camisa, calça, sapato, tênis, roupa, blusa, vestido, shorts, jaqueta, casaco, meia, cueca, calcinha, sutiã, moda
- transporte: uber, taxi, ônibus, gasolina, combustível, carro, metrô, trem, avião, passagem, viagem (transporte)
- mercado: supermercado, compras (mantimentos), mantimentos, feira (compras), açougue (compras), padaria (compras)
- lazer: cinema, festa, show, teatro, diversão, jogo, parque, viagem (lazer), balada, rolê
- saúde: remédio, médico, farmácia, hospital, dentista, consulta, exame
- educação: curso, livro, faculdade, escola, material escolar, aula
- contas: luz, água, internet, telefone, energia, gás, iptu, financiamento, conta
- casa: móvel, sofá, mesa, decoração, panela, utensílio, limpeza, reforma, casa
- outros: quando não rola encaixar em nenhuma categoria

REGRAS (seja esperto):
1. SAQUE os valores de qualquer número (200, 50, 25.5, "vinte", etc)
2. IDENTIFIQUE categorias por contexto (não só palavra exata)
3. Se achar VALOR E CATEGORIA, processe e marque isValid: true
4. CONFIRME sempre de forma animada quando registrar
5. Seja inteligente: "comprei picanha" = alimentação, "fui no posto" = transporte

EXEMPLOS DE RESPOSTAS HUMANIZADAS:
- Sucesso: "Show! Registrei aqui: R$ 200 em alimentação pela picanha! 🥩"
- Falta categoria: "Opa, R$ 50 anotado! Mas em que categoria rolou esse gasto?"
- Falta valor: "Beleza, vi que foi em alimentação! Mas quanto custou?"
- Erro: "Opa, não consegui sacar direito... Pode falar tipo 'gastei R$ 50 no mercado'?"

FORMATO OBRIGATÓRIO (JSON):
{
  "response": "resposta_humanizada_e_descontraida",
  "extraction": {
    "valor": numero_ou_0,
    "categoria": "categoria_ou_vazio",
    "descricao": "descrição_natural_do_gasto",
    "data": "YYYY-MM-DD",
    "isValid": true_se_valor_E_categoria_identificados
  }
}

IMPORTANTE: 
- Seja ESPERTO na identificação (contexto > palavra exata)
- SEMPRE JSON válido
- Respostas HUMANIZADAS e com gírias brasileiras
- Não seja robô chato!`;

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
          // Try to extract number from user message - mais inteligente
          const numberMatch = userMessage.match(/\d+(?:[.,]\d+)?/);
          if (numberMatch) {
            valor = parseFloat(numberMatch[0].replace(',', '.'));
          }
          
          // Números por extenso básicos
          const numberWords: {[key: string]: number} = {
            'vinte': 20, 'trinta': 30, 'quarenta': 40, 'cinquenta': 50,
            'dez': 10, 'quinze': 15, 'cem': 100, 'duzentos': 200
          };
          
          const lowerMessage = userMessage.toLowerCase();
          for (const [word, num] of Object.entries(numberWords)) {
            if (lowerMessage.includes(word)) {
              valor = num;
              break;
            }
          }
        }
        
        // Extract category with better mapping - mais esperto
        if (parsed.extraction?.categoria) {
          categoria = parsed.extraction.categoria;
        } else {
          const lowerMessage = userMessage.toLowerCase();
          
          // Mapeamento mais inteligente por contexto
          const categoryMappings = {
            'alimentação': ['picanha', 'carne', 'comida', 'almoço', 'jantar', 'lanche', 'restaurante', 'pizza', 'hambúrguer', 'café', 'bar', 'bebida', 'delivery', 'ifood', 'açougue', 'padaria', 'feira', 'mercado'],
            'vestuário': ['camisa', 'calça', 'sapato', 'tênis', 'roupa', 'blusa', 'vestido', 'shorts', 'moda'],
            'transporte': ['uber', 'taxi', 'gasolina', 'posto', 'combustível', 'ônibus', 'metrô', 'passagem'],
            'lazer': ['cinema', 'festa', 'show', 'teatro', 'jogo', 'parque', 'balada', 'rolê', 'diversão'],
            'saúde': ['remédio', 'médico', 'farmácia', 'hospital', 'dentista'],
            'casa': ['móvel', 'sofá', 'mesa', 'decoração', 'casa', 'limpeza'],
            'contas': ['luz', 'água', 'internet', 'telefone', 'energia', 'conta']
          };
          
          for (const [cat, terms] of Object.entries(categoryMappings)) {
            if (terms.some(term => lowerMessage.includes(term))) {
              categoria = cat;
              break;
            }
          }
        }
        
        const isValid = valor > 0 && categoria && categoria !== '';
        
        let response = parsed.response || '';
        
        // Fallback humanizado se a IA não gerou resposta boa
        if (!response || response.length < 10) {
          if (isValid) {
            const celebrations = ["Show!", "Massa!", "Fechou!", "Top!", "Beleza!"];
            const randomCelebration = celebrations[Math.floor(Math.random() * celebrations.length)];
            response = `${randomCelebration} Registrei aqui: R$ ${valor.toFixed(2)} em ${categoria}! 💰`;
          } else if (valor > 0 && !categoria) {
            response = `Opa, R$ ${valor.toFixed(2)} anotado! Mas em que categoria rolou esse gasto? (alimentação, transporte, lazer...)`;
          } else if (!valor && categoria) {
            response = `Beleza, vi que foi em ${categoria}! Mas quanto custou essa parada?`;
          } else {
            response = 'Opa, não consegui sacar direito... Pode falar tipo "gastei R$ 50 no mercado"? 😅';
          }
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
        
        // Enhanced fallback mais humanizado
        let valor = 0;
        let categoria = '';
        
        // Extract number from user message
        const numberMatch = userMessage.match(/\d+(?:[.,]\d+)?/);
        if (numberMatch) {
          valor = parseFloat(numberMatch[0].replace(',', '.'));
        }
        
        // Simple category detection
        const lowerMessage = userMessage.toLowerCase();
        if (['picanha', 'carne', 'comida', 'almoço', 'jantar', 'mercado'].some(term => lowerMessage.includes(term))) {
          categoria = 'alimentação';
        } else if (['camisa', 'roupa', 'sapato', 'tênis'].some(term => lowerMessage.includes(term))) {
          categoria = 'vestuário';
        } else if (['uber', 'taxi', 'gasolina', 'posto'].some(term => lowerMessage.includes(term))) {
          categoria = 'transporte';
        }
        
        const isValid = valor > 0 && categoria !== '';
        
        return {
          response: isValid ? 
            `Show! Registrei R$ ${valor.toFixed(2)} em ${categoria}! 💰` : 
            'Opa, não consegui sacar direito... Pode repetir tipo "gastei R$ 50 em comida"? 😅',
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
