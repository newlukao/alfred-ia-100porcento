
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

    const extractionPrompt = `Você é um assistente financeiro brasileiro SUPER INTELIGENTE! Use gírias, seja natural e conecte TODAS as informações da conversa.

${personalityContext}

PERSONALIDADE MELHORADA:
- Fale como um brasileiro jovem e descontraído
- Use gírias tipo: "massa", "show", "beleza", "top", "valeu", "rolou", "maneiro", "demais", "dahora"
- Seja empolgado quando registrar gastos: "Opa!", "Show!", "Fechou!", "Mandou bem!"
- Use emojis com moderação
- Seja EXTREMAMENTE INTELIGENTE e conecte informações entre mensagens
- SEMPRE LEMBRE valores mencionados anteriormente
- ENTENDA confirmações: "sim", "ta sim", "certo", "isso mesmo", "exato", "correto"

SUPER INTELIGÊNCIA - CONTEXTO DA CONVERSA:
${conversationHistory.map((msg, index) => `${index + 1}. ${msg.type}: "${msg.content}"`).join('\n')}

LÓGICA DE CONFIRMAÇÃO:
- Se a última mensagem do bot perguntou "Tá certo?" e o usuário responde "sim", "ta sim", "certo", "isso", "exato" → REGISTRE o gasto e confirme com animação
- Se detectar confirmação, use extraction da mensagem anterior do bot e marque isValid: true

REGRAS DE CONEXÃO CONTEXTUAL (MUITO IMPORTANTE):
1. 🧠 ANALISE TODA A CONVERSA - não só a mensagem atual
2. 🔗 Se usuário disse "gastei X" em qualquer mensagem anterior e agora menciona um produto/categoria, CONECTE!
3. ✅ PRIMEIRA VEZ: Pergunte "Tá certo?" para confirmar
4. ✅ CONFIRMAÇÃO: Se usuário confirmar, registre e celebre: "Show! R$ X em Y registrado! 🎉"
5. 🎯 Se encontrar VALOR + CATEGORIA (mesmo em mensagens separadas), pergunte confirmação primeiro
6. 🤔 Se não conseguir conectar, pergunte de forma específica

DETECÇÃO DE CONFIRMAÇÕES:
- Positivas: sim, ta sim, certo, isso mesmo, exato, correto, confirmo, pode ser, tá certo, é isso, isso aí
- Negativas: não, nao, errado, não é isso, tá errado

DETECÇÃO INTELIGENTE DE CATEGORIAS (com sinônimos e abreviações):
- alimentação: comida, almoço, jantar, lanche, restaurante, pizza, hambúrguer, hamburg, hamb, burger, burguer, habburg, churros, churro, mc, mcdonalds, bk, kfc, subway, ifood, delivery, café, bar, bebida, picanha, carne, frango, peixe, feira, açougue, padaria, sanduíche, sanduiche, food, fastfood
- vestuário: roupa, camisa, calça, sapato, tênis, blusa, vestido, shorts, jaqueta, casaco, moda, camiseta, polo, social, bermuda
- transporte: uber, taxi, gasolina, combustível, posto, ônibus, metrô, trem, passagem, viagem, carro, moto
- mercado: supermercado, compras, mantimentos, feira
- lazer: cinema, festa, show, teatro, jogo, parque, balada, rolê, diversão, netflix, streaming
- saúde: remédio, médico, farmácia, hospital, dentista, consulta
- casa: móvel, sofá, mesa, decoração, limpeza, reforma
- contas: luz, água, internet, telefone, energia, gás, conta

NÚMEROS POR EXTENSO E VARIAÇÕES:
- dez = 10, vinte = 20, trinta = 30, quarenta = 40, cinquenta = 50
- sessenta = 60, setenta = 70, oitenta = 80, noventa = 90, cem = 100
- duzentos = 200, trezentos = 300, quatrocentos = 400, quinhentos = 500
- mil = 1000, "um mil" = 1000, "dois mil" = 2000

FORMATO OBRIGATÓRIO (JSON):
{
  "response": "resposta_humanizada_com_confirmacao_ou_celebracao",
  "extraction": {
    "valor": numero_ou_0,
    "categoria": "categoria_ou_vazio",
    "descricao": "descrição_natural_do_gasto",
    "data": "YYYY-MM-DD",
    "isValid": true_se_valor_E_categoria_identificados_E_confirmados
  },
  "personalityUpdate": "observacoes_sobre_o_jeito_do_usuario_falar"
}

EXEMPLOS DE FLUXO COMPLETO:
Usuário: "gastei 200"
Bot: "Opa, R$ 200 anotado! Em que categoria?"
Usuário: "hambúrguer"  
Bot: "Show! R$ 200 no hambúrguer! Tá certo?" (isValid: false - aguardando confirmação)
Usuário: "ta sim"
Bot: "Massa! R$ 200 em alimentação registrado! 🎉" (isValid: true - confirma e registra)

IMPORTANTE: 
- SEMPRE confirme antes de registrar gastos
- ENTENDA confirmações do usuário
- Celebre quando confirmado e registrado
- JSON válido SEMPRE`;

    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: extractionPrompt },
        { role: 'user', content: userMessage }
      ];

      const result = await this.chatCompletion(messages);
      console.log('OpenAI raw response:', result);
      
      // FORÇAR ANÁLISE LOCAL SE OpenAI FALHAR
      console.log('🔧 INICIANDO ANÁLISE LOCAL FORÇADA...');
      console.log('📝 Mensagem do usuário:', userMessage);
      console.log('📚 Histórico da conversa:', conversationHistory);
      
      // ANÁLISE LOCAL INTELIGENTE (BACKUP SYSTEM)
      let valor = 0;
      let categoria = '';
      
      // Buscar valor na mensagem atual ou histórico
      const numberMatch = userMessage.match(/\d+(?:[.,]\d+)?/);
      if (numberMatch) {
        valor = parseFloat(numberMatch[0].replace(',', '.'));
        console.log(`💰 VALOR ENCONTRADO na mensagem atual: R$ ${valor}`);
      } else {
        // Buscar nas mensagens anteriores
        const userMessages = conversationHistory.filter(msg => msg.type === 'user');
        console.log(`🔍 Procurando valor em ${userMessages.length} mensagens...`);
        
        for (const msg of userMessages.reverse()) {
          const valueMatch = msg.content.match(/(\d+(?:[.,]\d+)?)/);
          if (valueMatch) {
            valor = parseFloat(valueMatch[1].replace(',', '.'));
            console.log(`🧠 VALOR CONECTADO: R$ ${valor} da mensagem: "${msg.content}"`);
            break;
          }
        }
      }
      
      // Buscar categoria
      const allText = (conversationHistory.filter(msg => msg.type === 'user').map(m => m.content).join(' ') + ' ' + userMessage).toLowerCase();
      console.log(`🏷️ Texto completo para análise: "${allText}"`);
      
      const categoryMap = {
        'alimentação': ['hamburg', 'hambúrguer', 'burger', 'churros', 'comida', 'pizza', 'lanche'],
        'tecnologia': ['computador', 'notebook', 'pc', 'celular', 'tablet'],
        'vestuário': ['camisa', 'roupa', 'sapato']
      };
      
      for (const [cat, words] of Object.entries(categoryMap)) {
        const found = words.find(word => allText.includes(word));
        if (found) {
          categoria = cat;
          console.log(`🎯 CATEGORIA ENCONTRADA: ${categoria} (palavra: ${found})`);
          break;
        }
      }
      
      // SE CONECTOU VALOR + CATEGORIA = SUCESSO!
      if (valor > 0 && categoria) {
        console.log(`✅ CONEXÃO REALIZADA: R$ ${valor} em ${categoria}`);
        return {
          response: `Show! Conectei as informações! R$ ${valor.toFixed(2)} em ${categoria}! 💰 Tá certo?`,
          extraction: {
            valor: valor,
            categoria: categoria,
            descricao: `Gasto em ${categoria}`,
            data: new Date().toISOString().split('T')[0],
            isValid: false // Aguarda confirmação
          }
        };
      }
      
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
        
        
        // DETECÇÃO DE CONFIRMAÇÃO: Verificar se usuário está confirmando um gasto anterior
        const currentMessage = userMessage.toLowerCase();
        const confirmationWords = ['sim', 'ta sim', 'tá sim', 'certo', 'isso mesmo', 'exato', 'correto', 'confirmo', 'pode ser', 'tá certo', 'é isso', 'isso aí', 'ta certo'];
        const isConfirmation = confirmationWords.some(word => currentMessage.includes(word.toLowerCase()));
        
        if (isConfirmation) {
          // Buscar o último gasto sugerido pelo bot na conversa
          const botMessages = conversationHistory.filter(msg => msg.type === 'assistant');
          const lastBotMessage = botMessages[botMessages.length - 1];
          
          if (lastBotMessage && lastBotMessage.content.includes('Tá certo?')) {
            // Extrair valor e categoria da mensagem do bot
            const valorMatch = lastBotMessage.content.match(/R\$\s*(\d+(?:[.,]\d+)?)/);
            const categoriaMatch = lastBotMessage.content.match(/em\s+(\w+)/i);
            
            if (valorMatch && categoriaMatch) {
              valor = parseFloat(valorMatch[1].replace(',', '.'));
              categoria = categoriaMatch[1].toLowerCase();
              
              // Mapear categorias detectadas no texto para categorias padronizadas
              if (['hamburg', 'hambúrguer', 'burger', 'churros', 'comida'].includes(categoria)) {
                categoria = 'alimentação';
              }
              
              return {
                response: `Show demais! R$ ${valor.toFixed(2)} em ${categoria} registrado! 🎉 Gasto salvo com sucesso!`,
                extraction: {
                  valor: valor,
                  categoria: categoria,
                  descricao: `Gasto em ${categoria}`,
                  data: new Date().toISOString().split('T')[0],
                  isValid: true // CONFIRMA E REGISTRA
                },
                personalityUpdate: parsed.personalityUpdate || ''
              };
            }
          }
        }
        
        // SUPER INTELIGÊNCIA CONTEXTUAL: Analise até 10 mensagens para conexão completa
        const recentMessages = conversationHistory.slice(-10); // Últimas 10 mensagens para contexto máximo
        const allUserMessages = recentMessages.filter(msg => msg.type === 'user').map(msg => msg.content).join(' ').toLowerCase();
        const fullConversationText = allUserMessages + ' ' + currentMessage;
        
        // SISTEMA DE MEMÓRIA TEMPORÁRIA: Buscar valor em TODAS as mensagens se não encontrado
        if (!valor) {
          // Primeiro tenta a mensagem atual
          const numberMatch = userMessage.match(/\d+(?:[.,]\d+)?/);
          if (numberMatch) {
            valor = parseFloat(numberMatch[0].replace(',', '.'));
            console.log(`💰 VALOR ENCONTRADO na mensagem atual: R$ ${valor}`);
          } else {
            // BUSCA SUPER INTELIGENTE: Procurar qualquer valor nas mensagens do usuário
            const allUserMessages = conversationHistory.filter(msg => msg.type === 'user');
            console.log(`🔍 Procurando valor em ${allUserMessages.length} mensagens do usuário...`);
            
            for (const msg of allUserMessages.reverse()) {
              const patterns = [
                /(?:gastei|paguei|custou|foi|comprei|gasto|valor|)\s*(?:r\$|rs|reais|)\s*(\d+(?:[.,]\d+)?)/i,
                /(\d+(?:[.,]\d+)?)\s*(?:r\$|rs|reais|)/i,
                /(\d+(?:[.,]\d+)?)/
              ];
              
              for (const pattern of patterns) {
                const valueMatch = msg.content.match(pattern);
                if (valueMatch) {
                  valor = parseFloat(valueMatch[1].replace(',', '.'));
                  console.log(`🧠 SUPER CONEXÃO: Valor R$ ${valor} da mensagem: "${msg.content}"`);
                  break;
                }
              }
              if (valor > 0) break;
            }
          }
        }
        
        // Enhanced category detection with conversation context
        if (!categoria) {
          const fullContext = fullConversationText;
          console.log(`🏷️ Procurando categoria em: "${fullContext}"`);
          
          const categoryMappings = {
            'vestuário': ['camisa', 'calça', 'sapato', 'tênis', 'roupa', 'blusa', 'vestido', 'shorts', 'moda', 'camiseta', 'polo', 'social', 'jaqueta', 'casaco'],
            'alimentação': ['picanha', 'carne', 'comida', 'almoço', 'jantar', 'lanche', 'restaurante', 'pizza', 'hambúrguer', 'hamburg', 'hamb', 'burger', 'burguer', 'habburg', 'churros', 'churro', 'café', 'bar', 'bebida', 'delivery', 'ifood', 'açougue', 'padaria', 'feira', 'sanduíche', 'sanduiche', 'food', 'mcdonalds', 'bk', 'subway', 'fastfood'],
            'tecnologia': ['computador', 'notebook', 'celular', 'smartphone', 'tablet', 'mouse', 'teclado', 'monitor', 'tv', 'televisão', 'playstation', 'xbox', 'nintendo', 'fone', 'headset', 'carregador', 'cabo', 'eletrônicos', 'eletronicos', 'pc', 'mac', 'iphone', 'samsung', 'motorola', 'lg'],
            'mercado': ['mercado', 'supermercado', 'compras', 'mantimentos'],
            'transporte': ['uber', 'taxi', 'gasolina', 'posto', 'combustível', 'ônibus', 'metrô', 'passagem'],
            'lazer': ['cinema', 'festa', 'show', 'teatro', 'jogo', 'parque', 'balada', 'rolê', 'diversão'],
            'saúde': ['remédio', 'médico', 'farmácia', 'hospital', 'dentista'],
            'casa': ['móvel', 'sofá', 'mesa', 'decoração', 'casa', 'limpeza'],
            'contas': ['luz', 'água', 'internet', 'telefone', 'energia', 'conta']
          };
          
          for (const [cat, terms] of Object.entries(categoryMappings)) {
            const foundTerm = terms.find(term => fullContext.includes(term));
            if (foundTerm) {
              categoria = cat;
              console.log(`🎯 CATEGORIA ENCONTRADA: ${categoria} (palavra: ${foundTerm})`);
              break;
            }
          }
        }
        
        // Smart number words recognition if value still not found
        if (!valor) {
          const numberWords: {[key: string]: number} = {
            'dez': 10, 'vinte': 20, 'trinta': 30, 'quarenta': 40, 'cinquenta': 50,
            'sessenta': 60, 'setenta': 70, 'oitenta': 80, 'noventa': 90, 'cem': 100,
            'duzentos': 200, 'trezentos': 300, 'quatrocentos': 400, 'quinhentos': 500,
            'seiscentos': 600, 'setecentos': 700, 'oitocentos': 800, 'novecentos': 900, 'mil': 1000
          };
          
          for (const [word, num] of Object.entries(numberWords)) {
            if (fullConversationText.includes(word)) {
              valor = num;
              break;
            }
          }
        }
        
        // Enhanced category detection with conversation context
        if (!categoria) {
          const fullContext = fullConversationText;
          
          const categoryMappings = {
            'vestuário': ['camisa', 'calça', 'sapato', 'tênis', 'roupa', 'blusa', 'vestido', 'shorts', 'moda', 'camiseta', 'polo', 'social', 'jaqueta', 'casaco'],
            'alimentação': ['picanha', 'carne', 'comida', 'almoço', 'jantar', 'lanche', 'restaurante', 'pizza', 'hambúrguer', 'hamburg', 'hamb', 'burger', 'burguer', 'habburg', 'churros', 'churro', 'café', 'bar', 'bebida', 'delivery', 'ifood', 'açougue', 'padaria', 'feira', 'sanduíche', 'sanduiche', 'food', 'mcdonalds', 'bk', 'subway', 'fastfood'],
            'tecnologia': ['computador', 'notebook', 'celular', 'smartphone', 'tablet', 'mouse', 'teclado', 'monitor', 'tv', 'televisão', 'playstation', 'xbox', 'nintendo', 'fone', 'headset', 'carregador', 'cabo', 'eletrônicos', 'eletronicos', 'pc', 'mac', 'iphone', 'samsung', 'motorola', 'lg'],
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
        
        const isValid = valor > 0 && categoria && categoria.trim() !== '';
        
        let response = parsed.response || '';
        
        // INTELIGÊNCIA APRIMORADA: Se tem valor E categoria, confirma e registra!
        if (isValid && !response.includes('registr')) {
          const celebrations = ["Show demais!", "Massa!", "Fechou!", "Top!", "Mandou bem!", "Dahora!", "Perfeito!"];
          const randomCelebration = celebrations[Math.floor(Math.random() * celebrations.length)];
          const categoryEmojis: {[key: string]: string} = {
            'vestuário': '👕',
            'alimentação': '🍽️',
            'tecnologia': '💻',
            'transporte': '🚗',
            'mercado': '🛒',
            'lazer': '🎉',
            'saúde': '🏥',
            'casa': '🏠',
            'contas': '💡'
          };
          const emoji = categoryEmojis[categoria] || '💰';
          response = `${randomCelebration} Conectei as informações! R$ ${valor.toFixed(2)} em ${categoria}! ${emoji} Tá certo?`;
        }
        
        // Fallback responses for incomplete data
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
        } else if (['picanha', 'carne', 'comida', 'almoço', 'jantar', 'mercado', 'hambúrguer', 'hamburg', 'pizza', 'lanche'].some(term => fullText.includes(term))) {
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
