
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
          temperature: 0.7,
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

  async extractExpenseData(
    userMessage: string, 
    systemInstructions: string, 
    conversationHistory: any[] = [],
    userPersonality?: string
  ): Promise<{
    response: string;
    extraction: ExpenseExtraction;
    personalityUpdate?: string;
  }> {
    
    const personalityContext = userPersonality ? `
PERFIL DO USUÁRIO (aprenda e se adapte):
${userPersonality}

Com base no perfil, adapte seu jeito de falar para ficar mais próximo do usuário.
` : '';

    const extractionPrompt = `Você é um assistente financeiro brasileiro MUITO ESPERTO e descontraído! Use gírias, seja natural e divertido.

${personalityContext}

PERSONALIDADE:
- Fale como um brasileiro jovem e descontraído
- Use gírias tipo: "massa", "show", "beleza", "top", "valeu", "rolou", "maneiro", "demais", "dahora"
- Seja empolgado quando registrar gastos: "Opa!", "Show!", "Fechou!", "Mandou bem!"
- Use emojis com moderação
- Seja MUITO INTELIGENTE e conecte informações entre mensagens
- NÃO seja burro - se o usuário falou um valor antes, LEMBRE!
- APRENDA com cada interação para ficar mais próximo do usuário

HISTÓRICO DA CONVERSA:
${conversationHistory.map(msg => `${msg.type}: ${msg.content}`).join('\n')}

CATEGORIAS E PALAVRAS-CHAVE (seja MUITO esperto na identificação):
- alimentação: picanha, carne, frango, peixe, almoço, jantar, lanche, restaurante, pizza, hambúrguer, café, bar, bebida, comida, refeição, delivery, ifood, mercado (comida), feira, açougue, padaria
- vestuário: camisa, calça, sapato, tênis, roupa, blusa, vestido, shorts, jaqueta, casaco, meia, cueca, calcinha, sutiã, moda, camiseta, polo, social
- transporte: uber, taxi, ônibus, gasolina, combustível, carro, metrô, trem, avião, passagem, viagem (transporte)
- mercado: supermercado, compras (mantimentos), mantimentos, feira (compras), açougue (compras), padaria (compras)
- lazer: cinema, festa, show, teatro, diversão, jogo, parque, viagem (lazer), balada, rolê
- saúde: remédio, médico, farmácia, hospital, dentista, consulta, exame
- educação: curso, livro, faculdade, escola, material escolar, aula
- contas: luz, água, internet, telefone, energia, gás, iptu, financiamento, conta
- casa: móvel, sofá, mesa, decoração, panela, utensílio, limpeza, reforma, casa
- outros: quando não rola encaixar em nenhuma categoria

REGRAS IMPORTANTES (seja MUITO esperto):
1. ANALISE TODO O HISTÓRICO DA CONVERSA - se o usuário mencionou um valor antes e agora fala de um produto, CONECTE AS INFORMAÇÕES!
2. Se o usuário disse "gastei 300" e depois "comprei camisa", é R$ 300 em vestuário!
3. SAQUE valores de qualquer formato (200, 50, 25.5, "vinte", "trezentos", etc)
4. IDENTIFIQUE categorias por contexto inteligente
5. Se achar VALOR E CATEGORIA (mesmo em mensagens separadas), processe e marque isValid: true
6. CONFIRME sempre de forma animada quando registrar
7. Seja esperto com números por extenso: trezentos = 300, cinquenta = 50, etc.
8. APRENDA o jeito do usuário falar e se adapte (formal/informal, gírias preferidas, etc)

NÚMEROS POR EXTENSO:
- dez = 10, vinte = 20, trinta = 30, quarenta = 40, cinquenta = 50
- sessenta = 60, setenta = 70, oitenta = 80, noventa = 90, cem = 100
- duzentos = 200, trezentos = 300, quatrocentos = 400, quinhentos = 500
- seiscentos = 600, setecentos = 700, oitocentos = 800, novecentos = 900, mil = 1000

FORMATO OBRIGATÓRIO (JSON):
{
  "response": "resposta_humanizada_com_girias_e_descontracao_adaptada_ao_usuario",
  "extraction": {
    "valor": numero_ou_0,
    "categoria": "categoria_ou_vazio",
    "descricao": "descrição_natural_do_gasto",
    "data": "YYYY-MM-DD",
    "isValid": true_se_valor_E_categoria_identificados
  },
  "personalityUpdate": "observacoes_sobre_o_jeito_do_usuario_falar_para_aprender_ex_usa_girias_formais_informal_etc"
}

IMPORTANTE: 
- Seja MUITO ESPERTO - conecte informações de mensagens anteriores!
- Use o histórico da conversa para pegar valores mencionados antes
- SEMPRE JSON válido
- Respostas HUMANIZADAS com gírias brasileiras adaptadas ao usuário
- APRENDA com cada interação!`;

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
            console.log('No JSON found, using direct fallback parsing for:', result);
            // Direct fallback parsing for simple cases like "gastei 20"
            let valor = 0;
            let categoria = 'outros';
            
            const numberMatch = userMessage.match(/\d+(?:[.,]\d+)?/);
            if (numberMatch) {
              valor = parseFloat(numberMatch[0].replace(',', '.'));
            }
            
            return {
              response: valor > 0 ? 
                `Opa, R$ ${valor.toFixed(2)} anotado! Mas em que categoria rolou esse gasto? (alimentação, vestuário, transporte...)` :
                'Opa, não consegui sacar direito... Pode falar tipo "gastei R$ 50 no mercado"? 😅',
              extraction: {
                valor: valor,
                categoria: valor > 0 ? '' : categoria,
                descricao: valor > 0 ? 'Gasto a categorizar' : 'Gasto',
                data: new Date().toISOString().split('T')[0],
                isValid: false
              }
            };
          }
        }
        
        const parsed = JSON.parse(cleanedResult);
        
        // Enhanced validation and value extraction with conversation context
        let valor = 0;
        let categoria = '';
        
        // First, try to get from parsed response
        if (parsed.extraction?.valor) {
          valor = parsed.extraction.valor;
        }
        
        if (parsed.extraction?.categoria) {
          categoria = parsed.extraction.categoria;
        }
        
        // Enhanced context analysis - look at conversation history
        const allMessages = conversationHistory.map(msg => msg.content).join(' ').toLowerCase();
        const currentMessage = userMessage.toLowerCase();
        const fullText = allMessages + ' ' + currentMessage;
        
        // Smart value extraction from current message or history
        if (!valor) {
          // Try current message first
          const numberMatch = userMessage.match(/\d+(?:[.,]\d+)?/);
          if (numberMatch) {
            valor = parseFloat(numberMatch[0].replace(',', '.'));
          } else {
            // Try conversation history for recent values - look at last 3 messages
            const recentHistory = conversationHistory.slice(-3);
            for (let i = recentHistory.length - 1; i >= 0; i--) {
              const msg = recentHistory[i];
              if (msg.type === 'user') {
                const historyMatch = msg.content.match(/(?:gastei|paguei|custou|foi)\s*(\d+(?:[.,]\d+)?)/);
                if (historyMatch) {
                  valor = parseFloat(historyMatch[1].replace(',', '.'));
                  console.log(`Found value ${valor} from history message: ${msg.content}`);
                  break;
                }
                // Also try simple number in user messages
                const simpleMatch = msg.content.match(/\d+(?:[.,]\d+)?/);
                if (simpleMatch) {
                  valor = parseFloat(simpleMatch[0].replace(',', '.'));
                  console.log(`Found simple value ${valor} from history: ${msg.content}`);
                  break;
                }
              }
            }
          }
          
          // Smart number words recognition
          const numberWords: {[key: string]: number} = {
            'dez': 10, 'vinte': 20, 'trinta': 30, 'quarenta': 40, 'cinquenta': 50,
            'sessenta': 60, 'setenta': 70, 'oitenta': 80, 'noventa': 90, 'cem': 100,
            'duzentos': 200, 'trezentos': 300, 'quatrocentos': 400, 'quinhentos': 500,
            'seiscentos': 600, 'setecentos': 700, 'oitocentos': 800, 'novecentos': 900, 'mil': 1000
          };
          
          for (const [word, num] of Object.entries(numberWords)) {
            if (fullText.includes(word)) {
              valor = num;
              break;
            }
          }
        }
        
        // Enhanced category detection with conversation context
        if (!categoria) {
          const fullContext = allMessages + ' ' + currentMessage;
          
          const categoryMappings = {
            'vestuário': ['camisa', 'calça', 'sapato', 'tênis', 'roupa', 'blusa', 'vestido', 'shorts', 'moda', 'camiseta', 'polo', 'social', 'jaqueta', 'casaco'],
            'alimentação': ['picanha', 'carne', 'comida', 'almoço', 'jantar', 'lanche', 'restaurante', 'pizza', 'hambúrguer', 'café', 'bar', 'bebida', 'delivery', 'ifood', 'açougue', 'padaria', 'feira'],
            'mercado': ['mercado', 'supermercado', 'compras', 'mantimentos'],
            'transporte': ['uber', 'taxi', 'gasolina', 'posto', 'combustível', 'ônibus', 'metrô', 'passagem'],
            'lazer': ['cinema', 'festa', 'show', 'teatro', 'jogo', 'parque', 'balada', 'rolê', 'diversão'],
            'saúde': ['remédio', 'médico', 'farmácia', 'hospital', 'dentista'],
            'casa': ['móvel', 'sofá', 'mesa', 'decoração', 'casa', 'limpeza'],
            'contas': ['luz', 'água', 'internet', 'telefone', 'energia', 'conta']
          };
          
          for (const [cat, terms] of Object.entries(categoryMappings)) {
            if (terms.some(term => fullContext.includes(term))) {
              categoria = cat;
              break;
            }
          }
        }
        
        const isValid = valor > 0 && categoria && categoria !== '';
        
        let response = parsed.response || '';
        
        // Smarter fallback responses
        if (!response || response.length < 10) {
          if (isValid) {
            const celebrations = ["Show demais!", "Massa!", "Fechou!", "Top!", "Mandou bem!", "Dahora!", "Perfeito!"];
            const randomCelebration = celebrations[Math.floor(Math.random() * celebrations.length)];
            const categoryEmojis: {[key: string]: string} = {
              'vestuário': '👕',
              'alimentação': '🍽️',
              'transporte': '🚗',
              'mercado': '🛒',
              'lazer': '🎉',
              'saúde': '🏥',
              'casa': '🏠',
              'contas': '💡'
            };
            const emoji = categoryEmojis[categoria] || '💰';
            response = `${randomCelebration} Registrei aqui: R$ ${valor.toFixed(2)} em ${categoria}! ${emoji}`;
          } else if (valor > 0 && !categoria) {
            response = `Opa, R$ ${valor.toFixed(2)} anotado! Mas em que categoria rolou esse gasto? (alimentação, vestuário, transporte...)`;
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
          },
          personalityUpdate: parsed.personalityUpdate || ''
        };
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        console.log('Raw response that failed to parse:', result);
        
        // Enhanced fallback with conversation context
        let valor = 0;
        let categoria = '';
        
        const fullHistory = conversationHistory.map(msg => msg.content).join(' ').toLowerCase();
        const fullText = fullHistory + ' ' + userMessage.toLowerCase();
        
        // Extract number from full context
        const numberMatch = fullText.match(/(?:gastei|paguei|custou|foi)\s+(\d+(?:[.,]\d+)?)/);
        if (numberMatch) {
          valor = parseFloat(numberMatch[1].replace(',', '.'));
        } else {
          const simpleMatch = userMessage.match(/\d+(?:[.,]\d+)?/);
          if (simpleMatch) {
            valor = parseFloat(simpleMatch[0].replace(',', '.'));
          }
        }
        
        // Simple category detection from full context
        if (['camisa', 'calça', 'roupa', 'sapato', 'tênis', 'blusa', 'vestido'].some(term => fullText.includes(term))) {
          categoria = 'vestuário';
        } else if (['picanha', 'carne', 'comida', 'almoço', 'jantar', 'mercado'].some(term => fullText.includes(term))) {
          categoria = 'alimentação';
        } else if (['uber', 'taxi', 'gasolina', 'posto'].some(term => fullText.includes(term))) {
          categoria = 'transporte';
        }
        
        const isValid = valor > 0 && categoria !== '';
        
        return {
          response: isValid ? 
            `Show! Conectei as informações e registrei R$ ${valor.toFixed(2)} em ${categoria}! Mandou bem! 💰` : 
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
