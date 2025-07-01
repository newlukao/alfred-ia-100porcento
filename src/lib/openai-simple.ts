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
    
    const currentMessage = userMessage.toLowerCase();
    
    // SISTEMA DE CONFIRMAÇÃO
    const confirmationWords = ['sim', 'ta sim', 'tá sim', 'certo', 'isso mesmo', 'exato', 'correto', 'confirmo', 'pode ser', 'tá certo', 'é isso', 'isso aí', 'ta certo'];
    const isConfirmation = confirmationWords.some(word => currentMessage.includes(word));
    
    if (isConfirmation) {
      const botMessages = conversationHistory.filter(msg => msg.type === 'assistant');
      const lastBotMessage = botMessages[botMessages.length - 1];
      
      if (lastBotMessage && lastBotMessage.content.includes('Tá certo?')) {
        const valorMatch = lastBotMessage.content.match(/R\$\s*(\d+(?:[.,]\d+)?)/);
        const categoriaMatch = lastBotMessage.content.match(/em\s+(\w+)/i);
        
        if (valorMatch && categoriaMatch) {
          const valor = parseFloat(valorMatch[1].replace(',', '.'));
          const categoria = categoriaMatch[1].toLowerCase();
          
          return {
            response: `Show demais! R$ ${valor.toFixed(2)} em ${categoria} registrado! 🎉 Gasto salvo com sucesso!\n\nE aí, rolou mais algum gasto hoje que você quer anotar? 😊`,
            extraction: {
              valor: valor,
              categoria: categoria,
              descricao: `Gasto em ${categoria}`,
              data: new Date().toISOString().split('T')[0],
              isValid: true
            }
          };
        }
      }
    }
    
    // DETECÇÃO DE SAUDAÇÕES
    const greetingWords = ['ola', 'olá', 'oi', 'eai', 'e ai', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'hello', 'salve', 'fala'];
    const isGreeting = greetingWords.some(word => currentMessage.includes(word));
    
    if (isGreeting) {
      return {
        response: 'E aí! Beleza? 😄 Pronto pra anotar uns gastos? Manda aí: "gastei R$ 50 no mercado" ou algo assim! 💰',
        extraction: {
          valor: 0,
          categoria: '',
          descricao: '',
          data: new Date().toISOString().split('T')[0],
          isValid: false
        }
      };
    }
    
    // DETECÇÃO DE RESPOSTAS CONVERSACIONAIS
    const conversationalWords = ['vamos', 'bora', 'ok', 'beleza', 'dale', 'show', 'massa'];
    const isConversational = conversationalWords.some(word => currentMessage.includes(word));
    
    if (isConversational) {
      const botMessages = conversationHistory.filter(msg => msg.type === 'assistant');
      const lastBotMessage = botMessages[botMessages.length - 1];
      
      if (lastBotMessage && lastBotMessage.content.includes('Pronto pra anotar')) {
        return {
          response: 'Show! 🎉 Então me fala aí, qual foi o último gasto que você fez? Pode ser qualquer coisa: comida, roupa, transporte... 💰',
          extraction: {
            valor: 0,
            categoria: '',
            descricao: '',
            data: new Date().toISOString().split('T')[0],
            isValid: false
          }
        };
      }
    }
    
    // DETECÇÃO DE NEGATIVAS
    const negativeWords = ['nao', 'não', 'nada', 'sem', 'rolou nao', 'rolou não', 'não rolou', 'nao rolou'];
    const isNegative = negativeWords.some(word => currentMessage.includes(word));
    
    if (isNegative) {
      const botMessages = conversationHistory.filter(msg => msg.type === 'assistant');
      const lastBotMessage = botMessages[botMessages.length - 1];
      
      if (lastBotMessage && lastBotMessage.content.includes('mais algum gasto')) {
        return {
          response: 'Show! Qualquer coisa, se aparecer mais algum gasto, é só me chamar! Tô sempre aqui pra te ajudar! 😊✌️',
          extraction: {
            valor: 0,
            categoria: '',
            descricao: '',
            data: new Date().toISOString().split('T')[0],
            isValid: false
          }
        };
      }
    }
    
    // ANÁLISE DE GASTOS SIMPLES E EFICAZ
    let valor = 0;
    let categoria = '';
    
    // Extrair valor da mensagem atual ou histórico
    const numberMatch = userMessage.match(/\d+(?:[.,]\d+)?/);
    if (numberMatch) {
      valor = parseFloat(numberMatch[0].replace(',', '.'));
    } else {
      // Buscar valor no histórico
      const userMessages = conversationHistory.filter(msg => msg.type === 'user');
      for (const msg of userMessages.reverse()) {
        const valueMatch = msg.content.match(/(\d+(?:[.,]\d+)?)/);
        if (valueMatch) {
          valor = parseFloat(valueMatch[1].replace(',', '.'));
          break;
        }
      }
    }
    
    // Mapear categorias de forma simples
    const allText = (conversationHistory.filter(msg => msg.type === 'user').map(m => m.content).join(' ') + ' ' + userMessage).toLowerCase();
    
    const categoryMap = {
      'alimentação': ['comida', 'almoço', 'jantar', 'lanche', 'pizza', 'hambúrguer', 'hamburg', 'burger', 'xtudo', 'sanduíche', 'café', 'bar', 'restaurante', 'ifood', 'delivery'],
      'tecnologia': ['computador', 'notebook', 'pc', 'celular', 'smartphone', 'iphone', 'tablet', 'tv', 'netflix', 'mouse', 'teclado'],
      'vestuário': ['roupa', 'camisa', 'calça', 'sapato', 'tênis', 'blusa', 'vestido'],
      'transporte': ['uber', 'taxi', 'gasolina', 'carro', 'ônibus', 'passagem'],
      'casa': ['móvel', 'sofá', 'mesa', 'decoração'],
      'saúde': ['remédio', 'médico', 'farmácia', 'hospital'],
      'pets': ['veterinário', 'ração', 'petshop'],
      'beleza': ['salão', 'cabelo', 'shampoo', 'maquiagem'],
      'mercado': ['mercado', 'supermercado', 'compras']
    };
    
    for (const [cat, words] of Object.entries(categoryMap)) {
      if (words.some(word => allText.includes(word))) {
        categoria = cat;
        break;
      }
    }
    
    // RESPOSTAS BASEADAS NO QUE FOI DETECTADO
    if (valor > 0 && categoria) {
      // Valor + categoria = pergunta confirmação
      const emojis = {
        'alimentação': '🍽️',
        'tecnologia': '💻',
        'vestuário': '👕',
        'transporte': '🚗',
        'casa': '🏠',
        'saúde': '🏥',
        'pets': '🐶',
        'beleza': '💄',
        'mercado': '🛒'
      };
      
      return {
        response: `Show! Conectei as informações! R$ ${valor.toFixed(2)} em ${categoria}! ${emojis[categoria] || '💰'} Tá certo?`,
        extraction: {
          valor: valor,
          categoria: categoria,
          descricao: `Gasto em ${categoria}`,
          data: new Date().toISOString().split('T')[0],
          isValid: false // Aguarda confirmação
        }
      };
    } else if (valor > 0 && !categoria) {
      // Só valor = pergunta categoria
      return {
        response: `Opa, R$ ${valor.toFixed(2)} anotado! Mas em que categoria rolou esse gasto? (alimentação, vestuário, transporte...)`,
        extraction: {
          valor: valor,
          categoria: '',
          descricao: 'Gasto a categorizar',
          data: new Date().toISOString().split('T')[0],
          isValid: false
        }
      };
    } else {
      // Não entendeu nada
      return {
        response: 'Opa, não consegui sacar direito... Pode falar tipo "gastei R$ 50 no mercado"? 😅',
        extraction: {
          valor: 0,
          categoria: '',
          descricao: 'Gasto',
          data: new Date().toISOString().split('T')[0],
          isValid: false
        }
      };
    }
  }
}