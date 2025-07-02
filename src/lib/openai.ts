import { database } from './database';

// Função para obter data no fuso horário UTC-3 (Brasil)
function getBrazilDate(): Date {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const brazilTime = new Date(utc + (-3 * 3600000)); // UTC-3
  return brazilTime;
}

// Função para formatar data brasileira
function formatBrazilDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface TransactionExtraction {
  valor: number;
  categoria: string;
  descricao: string;
  data: string;
  isValid: boolean;
  type: 'expense' | 'income'; // 🔥 NOVO: Tipo da transação
}

// Manter compatibilidade com código existente
interface ExpenseExtraction extends TransactionExtraction {
  type: 'expense';
}

export class OpenAIService {
  private apiKey: string;
  private baseURL = 'https://api.openai.com/v1/chat/completions';
  
  // ✅ RATE LIMITING MAIS FLEXÍVEL
  private static lastRequest = 0;
  private static requestCount = 0;
  private static readonly MAX_REQUESTS_PER_HOUR = 200; // Aumentado de 50 para 200
  private static readonly MIN_INTERVAL_MS = 500; // Reduzido de 2000ms para 500ms

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chatCompletion(messages: ChatMessage[], model: string = 'gpt-4o-mini'): Promise<string> {
    // ✅ RATE LIMITING MAIS LEVE
    const now = Date.now();
    const timeSinceLastRequest = now - OpenAIService.lastRequest;
    
    if (timeSinceLastRequest < OpenAIService.MIN_INTERVAL_MS) {
      const waitTime = OpenAIService.MIN_INTERVAL_MS - timeSinceLastRequest;
      console.log(`⏳ Aguardando ${waitTime}ms antes da próxima mensagem`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    if (OpenAIService.requestCount >= OpenAIService.MAX_REQUESTS_PER_HOUR) {
      throw new Error('🚫 Limite de mensagens por hora atingido. Tente novamente mais tarde.');
    }
    
    OpenAIService.lastRequest = Date.now();
    OpenAIService.requestCount++;
    
    // Reset counter every hour
    if (OpenAIService.requestCount === 1) {
      setTimeout(() => {
        OpenAIService.requestCount = 0;
        console.log('🔄 Rate limit resetado - 200 requests disponíveis novamente');
      }, 3600000); // 1 hora
    }
    
    console.log(`📊 Request ${OpenAIService.requestCount}/${OpenAIService.MAX_REQUESTS_PER_HOUR}`);
    
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
        if (response.status === 429) {
          throw new Error('🚫 OpenAI rate limit atingido. Aguarde alguns minutos.');
        }
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw error;
    }
  }

  // 🔥 NOVO MÉTODO: Processa transações (gastos E recebimentos)
  async extractTransactionData(
    userMessage: string, 
    systemInstructions: string, 
    conversationHistory: any[] = [],
    userPersonality?: string,
    userId?: string,
    chatState?: string // 'waiting_expense' | 'waiting_income' | 'initial'
  ): Promise<{
    response: string;
    extraction: TransactionExtraction;
    personalityUpdate?: string;
  }> {
    
    // PRIORITY #1: DETECÇÕES BÁSICAS RÁPIDAS (SEM CHAMAR API)
    const currentMessage = userMessage.toLowerCase().trim();
    console.log('🔍 VERIFICANDO MENSAGEM:', userMessage);
    console.log('🎯 ESTADO DO CHAT:', chatState);
    
    // 🧠 ANÁLISE CONTEXTUAL ROBUSTA
    const lastUserMessage = conversationHistory
      .slice()
      .reverse()
      .find(msg => msg.type === 'user')?.content?.toLowerCase() || '';
    
    const lastBotMessage = conversationHistory
      .slice()
      .reverse()
      .find(msg => msg.type === 'assistant')?.content || '';
    
    // 💡 DETECÇÃO DIRETA: Se bot perguntou categoria e temos valor de recebimento
    const botAskedCategory = lastBotMessage.includes('categoria');
    const botMentionedReceived = lastBotMessage.includes('recebimento');
    const userSaidReceived = lastUserMessage.includes('recebi');
    const isWaitingForIncomeCategory = botAskedCategory && (botMentionedReceived || userSaidReceived);

    // 💰 EXTRAÇÃO DIRETA DE VALOR DO CONTEXTO
    let contextValue = 0;
    let isContextIncome = false;
    
    if (isWaitingForIncomeCategory) {
      const valueMatch = lastBotMessage.match(/R\$\s*(\d+(?:[.,]\d{1,2})?)/);
      if (valueMatch) {
        contextValue = parseFloat(valueMatch[1].replace(',', '.'));
        isContextIncome = true;
        console.log(`💰 VALOR EXTRAÍDO DO CONTEXTO: R$ ${contextValue} (RECEBIMENTO)`);
      }
    } else if (botAskedCategory && !botMentionedReceived) {
      const valueMatch = lastBotMessage.match(/R\$\s*(\d+(?:[.,]\d{1,2})?)/);
      if (valueMatch) {
        contextValue = parseFloat(valueMatch[1].replace(',', '.'));
        isContextIncome = false;
        console.log(`💰 VALOR EXTRAÍDO DO CONTEXTO: R$ ${contextValue} (GASTO)`);
      }
    }

    // 🎯 PROCESSAMENTO DIRETO DE CATEGORIA
    if (contextValue > 0 && (isWaitingForIncomeCategory || botAskedCategory)) {
      const categoria = this.mapCategory(currentMessage);
      console.log(`🎯 CATEGORIA MAPEADA: "${currentMessage}" → "${categoria}"`);
      
      if (categoria && categoria !== 'outros' || currentMessage.includes('outros') || currentMessage.includes('divida') || currentMessage.includes('salario')) {
        const finalCategory = categoria === 'outros' && (currentMessage.includes('divida') || currentMessage.includes('dívida')) ? 'outros' : categoria;
        
        return {
          response: isContextIncome ? 
            `Show! R$ ${contextValue.toFixed(2)} de recebimento em ${finalCategory}! Tá certo?` :
            `Show! R$ ${contextValue.toFixed(2)} em ${finalCategory}! Tá certo?`,
          extraction: {
            valor: contextValue,
            categoria: finalCategory,
            descricao: isContextIncome ? `Recebimento em ${finalCategory}` : `Gasto em ${finalCategory}`,
            data: new Date().toISOString().split('T')[0],
            isValid: false, // Aguarda confirmação
            type: isContextIncome ? 'income' : 'expense'
          }
        };
      }
    }

    console.log('💰 Última mensagem do usuário:', lastUserMessage);
    console.log('🤖 Última mensagem do bot:', lastBotMessage);
    console.log('📝 Aguardando categoria de recebimento?', isWaitingForIncomeCategory);

    // 🔥 DETECÇÃO DE CONFIRMAÇÃO INTELIGENTE
    const confirmationWords = ['sim', 'ta sim', 'tá sim', 'certo', 'isso mesmo', 'exato', 'correto', 'confirmo', 'pode ser', 'tá certo', 'é isso', 'isso aí', 'ta certo', 'perfeito', 'ok', 'okay'];
    const isConfirmation = confirmationWords.some(word => currentMessage === word || currentMessage.includes(word));
    
    if (isConfirmation && conversationHistory.length > 0) {
      // Buscar a última mensagem do bot que pediu confirmação
      const lastBotMessage = conversationHistory
        .slice()
        .reverse()
        .find(msg => msg.type === 'assistant');
      
      if (lastBotMessage && lastBotMessage.content.includes('Tá certo?')) {
        console.log('✅ CONFIRMAÇÃO DETECTADA! Processando...');
        
        // Extrair dados da mensagem de confirmação do bot
        const valorMatch = lastBotMessage.content.match(/R\$\s*(\d+(?:[.,]\d{1,2})?)/);
        const categoriaMatch = lastBotMessage.content.match(/(?:em|no|na|de|para)\s+([a-záêçã]+(?:\s+[a-záêçã]+)*?)(?:\s|!|\?|$)/i);
        
        if (valorMatch) {
          const valor = parseFloat(valorMatch[1].replace(',', '.'));
          let categoria = categoriaMatch?.[1] || 'outros';
          
          // Mapear categoria
          categoria = this.mapCategory(categoria);
          
          console.log(`🎉 TRANSAÇÃO CONFIRMADA: R$ ${valor} em ${categoria}`);
          
          const isIncome = chatState === 'waiting_income' || 
                          lastBotMessage.content.includes('recebimento') || 
                          lastBotMessage.content.includes('recebi') ||
                          isWaitingForIncomeCategory;
          
          return {
            response: isIncome ? 
              `Massa! R$ ${valor.toFixed(2)} de recebimento em ${categoria} registrado! 🎉💎\n\nShow de bola! Quer adicionar mais alguma entrada?` :
              `Massa! R$ ${valor.toFixed(2)} em ${categoria} registrado! 🎉\n\nShow! Rolou mais algum gasto que você quer anotar?`,
            extraction: {
              valor: valor,
              categoria: categoria,
              descricao: isIncome ? `Recebimento em ${categoria}` : `Gasto em ${categoria}`,
              data: new Date().toISOString().split('T')[0],
              isValid: true,
              type: isIncome ? 'income' : 'expense'
            }
          };
        }
      }
    }

    // 🙏 DETECÇÃO DE AGRADECIMENTOS (PRIORITY #2)
    const thankYouWords = ['obrigado', 'obrigada', 'valeu', 'vlw', 'thanks', 'thank you', 'brigado', 'brigada', 'tchau', 'até logo', 'falou', 'flw', 'bye'];
    const isThankYou = thankYouWords.some(word => currentMessage.includes(word));
    
    if (isThankYou) {
      const responses = [
        'Disponha! 😊 Qualquer gasto ou recebimento, é só me chamar!',
        'Por nada! 🤙 Tô sempre aqui pra ajudar com suas finanças!',
        'Valeu! 😄 Bora manter esse controle em dia! 💰',
        'De boa! 😎 Sempre que precisar, me dá um toque!',
        'Tranquilo! 🙌 Estou aqui pra isso! 💪'
      ];
      
      return {
        response: responses[Math.floor(Math.random() * responses.length)],
        extraction: {
          valor: 0, categoria: '', descricao: '', data: new Date().toISOString().split('T')[0],
          isValid: false, type: 'expense'
        }
      };
    }

    // 👋 DETECÇÃO DE SAUDAÇÕES (PRIORITY #3)
    const greetingWords = ['ola', 'olá', 'eai', 'e ai', 'oi', 'hey', 'hello', 'salve', 'fala'];
    const isGreeting = greetingWords.some(word => currentMessage.startsWith(word) || currentMessage === word);
    
    if (isGreeting) {
      const responses = [
        `E aí! Beleza? 😄

📝 **COMO USAR (super fácil):**

💸 **Para GASTOS:**
• "gastei 50 no mercado"
• "comprei pizza por 35"
• "paguei 100 de luz"

💰 **Para RECEBIMENTOS:**
• "recebi 3000 de salário"
• "ganhei 500 de freelance"

🎯 **Dica:** Sempre fale VALOR + ONDE/DO QUE!

Manda aí! 🚀`,
        
        `Opa! Tudo jóia? 😊

📝 **EXEMPLOS FÁCEIS:**

💸 **Gastos:**
• "gastei 80 no supermercado"
• "paguei 200 de internet"
• "comprei roupa por 150"

💰 **Recebimentos:**
• "recebi 2500 de salário"
• "ganhei 300 de extra"

Qual você quer registrar? 💰`,

        `Salve! 🤙

📝 **JEITO MAIS FÁCIL:**

💸 **Para gastos, fale:**
• "gastei [valor] em/no/na [coisa]"
• "paguei [valor] de [conta]"

💰 **Para recebimentos:**
• "recebi [valor] de [origem]"

🎯 **Exemplos:**
• "gastei 45 no lanche"
• "recebi 1500 de freelance"

Bora registrar? 💪`
      ];
      
      return {
        response: responses[Math.floor(Math.random() * responses.length)],
        extraction: {
          valor: 0, categoria: '', descricao: '', data: new Date().toISOString().split('T')[0],
          isValid: false, type: 'expense'
        }
      };
    }

    // 🔥 DETECÇÃO INTELIGENTE BASEADA NO ESTADO DO CHAT E CONTEXTO
    let transactionType = this.detectTransactionType(userMessage, chatState);
    
    // 🧠 OVERRIDE: Se estamos aguardando categoria de recebimento, força income
    if (isWaitingForIncomeCategory) {
      transactionType = 'income';
      console.log('🔄 OVERRIDE: Detectando como income devido ao contexto');
    }
    
    console.log('🎯 TIPO DETECTADO:', transactionType);

    // 🚀 DETECÇÃO DIRETA DE VALOR + CATEGORIA NA MENSAGEM INICIAL
    const valorMatch = userMessage.match(/(\d+(?:[.,]\d{1,2})?)/);
    if (valorMatch && !isWaitingForIncomeCategory && !botAskedCategory) {
      const valor = parseFloat(valorMatch[1].replace(',', '.'));
      const messageWithoutValue = userMessage.replace(/\d+(?:[.,]\d{1,2})?/, '').toLowerCase();
      
      // Tentar detectar categoria na mensagem
      let detectedCategory = '';
      
      // Para recebimentos
      if (transactionType === 'income') {
        if (messageWithoutValue.includes('salario') || messageWithoutValue.includes('salário')) detectedCategory = 'salário';
        else if (messageWithoutValue.includes('freela') || messageWithoutValue.includes('freelance')) detectedCategory = 'freelance';
        else if (messageWithoutValue.includes('venda') || messageWithoutValue.includes('vendas')) detectedCategory = 'vendas';
        else if (messageWithoutValue.includes('divida') || messageWithoutValue.includes('dívida')) detectedCategory = 'outros';
        else if (messageWithoutValue.includes('investiment') || messageWithoutValue.includes('dividend')) detectedCategory = 'investimentos';
      }
      // Para gastos
      else {
        if (messageWithoutValue.includes('mercad') || messageWithoutValue.includes('supermerc')) detectedCategory = 'mercado';
        else if (messageWithoutValue.includes('aliment') || messageWithoutValue.includes('comida') || messageWithoutValue.includes('pizza') || messageWithoutValue.includes('lanche')) detectedCategory = 'alimentação';
        else if (messageWithoutValue.includes('transport') || messageWithoutValue.includes('uber') || messageWithoutValue.includes('taxi')) detectedCategory = 'transporte';
        else if (messageWithoutValue.includes('luz') || messageWithoutValue.includes('internet') || messageWithoutValue.includes('água') || messageWithoutValue.includes('conta')) detectedCategory = 'contas';
        else if (messageWithoutValue.includes('roup') || messageWithoutValue.includes('vestuár')) detectedCategory = 'vestuário';
        else if (messageWithoutValue.includes('casa') || messageWithoutValue.includes('móv')) detectedCategory = 'casa';
        else if (messageWithoutValue.includes('saúde') || messageWithoutValue.includes('médic') || messageWithoutValue.includes('farmác')) detectedCategory = 'saúde';
        else if (messageWithoutValue.includes('lazer') || messageWithoutValue.includes('cinema')) detectedCategory = 'lazer';
        else if (messageWithoutValue.includes('educaç') || messageWithoutValue.includes('curso')) detectedCategory = 'educação';
      }
      
      if (detectedCategory) {
        console.log(`🎯 DETECÇÃO COMPLETA: R$ ${valor} em ${detectedCategory} (${transactionType})`);
        
        return {
          response: transactionType === 'income' ? 
            `Show! R$ ${valor.toFixed(2)} de recebimento em ${detectedCategory}! Tá certo?` :
            `Show! R$ ${valor.toFixed(2)} em ${detectedCategory}! Tá certo?`,
          extraction: {
            valor: valor,
            categoria: detectedCategory,
            descricao: transactionType === 'income' ? `Recebimento em ${detectedCategory}` : `Gasto em ${detectedCategory}`,
            data: new Date().toISOString().split('T')[0],
            isValid: false, // Aguarda confirmação
            type: transactionType
          }
        };
      }
    }

    // Prompt simplificado e mais eficiente
    const extractionPrompt = `Você é um assistente financeiro brasileiro SUPER INTELIGENTE! 

CONTEXTO DA CONVERSA:
${conversationHistory.slice(-5).map((msg, i) => `${i + 1}. ${msg.type}: "${msg.content}"`).join('\n')}

ESTADO ATUAL: ${chatState || 'initial'}
TIPO ESPERADO: ${transactionType}

DETECÇÃO INTELIGENTE:
- Se usuário disse "recebi X" = RECEBIMENTO (income)
- Se usuário disse "gastei X" = GASTO (expense)
- Se menciona "divida", "dívida", "emprestimo" = categoria "outros" para recebimentos
- Se menciona "salário", "freelance", "vendas" = essas categorias para recebimentos

VOCÊ É SUPER INTELIGENTE E:
- Fala como brasileiro jovem: "massa", "show", "beleza", "top", "rolou"
- CONECTA informações entre mensagens
- LEMBRA valores mencionados antes
- ENTENDE confirmações: "sim", "certo", "isso"
- Celebra registros: "Show!", "Massa!", "Top!"

LÓGICA SIMPLES:
1. Se tem VALOR + CATEGORIA → pergunta "Tá certo?"
2. Se usuário confirma → registra e celebra
3. Se falta info → pergunta especificamente

CATEGORIAS PARA GASTOS:
alimentação, transporte, mercado, lazer, saúde, casa, contas, vestuário, educação, outros

CATEGORIAS PARA RECEBIMENTOS:
salário, freelance, vendas, investimentos, outros (para dívidas, empréstimos, etc)

EXEMPLOS:
Usuário: "recebi 200"
Bot: "Opa! R$ 200,00 de recebimento anotado! De que categoria?"

Usuário: "recebimento de divida"
Bot: "Show! R$ 200,00 de recebimento em outros! Tá certo?"

FORMATO (JSON):
{
  "response": "resposta_natural_brasileira",
  "extraction": {
    "valor": numero_ou_0,
    "categoria": "categoria_detectada",
    "descricao": "descrição_natural",
    "data": "YYYY-MM-DD",
    "type": "${transactionType}",
    "isValid": true_se_completo_e_confirmado
  }
}

IMPORTANTES:
- JSON válido sempre
- isValid = true APENAS se valor>0 + categoria + confirmado
- Pergunte "Tá certo?" antes de confirmar
- Para recebimentos, use "de [categoria]" em vez de "em [categoria]"
- Seja natural e brasileiro`;

    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: extractionPrompt },
        { role: 'user', content: userMessage }
      ];

      const result = await this.chatCompletion(messages);
      console.log('🤖 Resposta da IA:', result);
      
      // Parse melhorado
      try {
        const cleanResult = result.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleanResult);
        
        if (parsed.extraction && parsed.response) {
          // Garantir tipo correto
          if (chatState === 'waiting_expense') {
            parsed.extraction.type = 'expense';
          } else if (chatState === 'waiting_income') {
            parsed.extraction.type = 'income';
          }
          
          return parsed;
        }
      } catch (parseError) {
        console.log('❌ Erro parse JSON, usando fallback inteligente');
      }
      
      // Fallback inteligente
      return this.createIntelligentFallback(userMessage, result, transactionType);
      
    } catch (error) {
      console.error('Error in extractTransactionData:', error);
      throw error;
    }
  }

  // 🔧 HELPER: Mapear categoria corretamente
  private mapCategory(categoria: string): string {
    categoria = categoria.toLowerCase();
    
    // Categorias de GASTOS
    if (categoria.includes('aliment') || categoria.includes('comida') || categoria.includes('hamburg') || categoria.includes('pizza') || categoria.includes('lanche')) {
      return 'alimentação';
    } else if (categoria.includes('transport') || categoria.includes('uber') || categoria.includes('taxi') || categoria.includes('ônibus')) {
      return 'transporte';
    } else if (categoria.includes('mercad') || categoria.includes('compra') || categoria.includes('supermerc')) {
      return 'mercado';
    } else if (categoria.includes('casa') || categoria.includes('móv') || categoria.includes('decoraç')) {
      return 'casa';
    } else if (categoria.includes('saúde') || categoria.includes('médic') || categoria.includes('farmác')) {
      return 'saúde';
    } else if (categoria.includes('conta') || categoria.includes('luz') || categoria.includes('internet') || categoria.includes('água')) {
      return 'contas';
    } else if (categoria.includes('roup') || categoria.includes('vestuár') || categoria.includes('sapato')) {
      return 'vestuário';
    } else if (categoria.includes('lazer') || categoria.includes('cinema') || categoria.includes('festa')) {
      return 'lazer';
    } else if (categoria.includes('educaç') || categoria.includes('curso') || categoria.includes('livro')) {
      return 'educação';
    }
    
    // Categorias de RECEBIMENTOS
    else if (categoria.includes('salár') || categoria.includes('salary') || categoria.includes('trabalho')) {
      return 'salário';
    } else if (categoria.includes('freela') || categoria.includes('freelance')) {
      return 'freelance';
    } else if (categoria.includes('venda') || categoria.includes('vendas')) {
      return 'vendas';
    } else if (categoria.includes('investiment') || categoria.includes('dividend')) {
      return 'investimentos';
    } else if (categoria.includes('divida') || categoria.includes('dívida') || categoria.includes('emprest') || categoria.includes('pagament') || categoria.includes('recebimento')) {
      return 'outros'; // Para recebimentos de dívida/empréstimos
    } else if (categoria.includes('bonus') || categoria.includes('bônus') || categoria.includes('extra')) {
      return 'outros';
    }
    
    return categoria || 'outros';
  }

  // 🧠 HELPER: Fallback inteligente
  private createIntelligentFallback(userMessage: string, aiResponse: string, transactionType: 'expense' | 'income'): any {
    const valorMatch = userMessage.match(/(\d+(?:[.,]\d{1,2})?)/);
    const valor = valorMatch ? parseFloat(valorMatch[1].replace(',', '.')) : 0;
    
    // Detectar categoria na mensagem
    let categoria = '';
    const message = userMessage.toLowerCase();
    
    if (transactionType === 'income') {
      // Categorias para recebimentos
      if (message.includes('salár') || message.includes('trabalho')) categoria = 'salário';
      else if (message.includes('freela') || message.includes('freelance')) categoria = 'freelance';
      else if (message.includes('venda') || message.includes('vendas')) categoria = 'vendas';
      else if (message.includes('divida') || message.includes('dívida') || message.includes('recebimento')) categoria = 'outros';
      else if (message.includes('investiment') || message.includes('dividend')) categoria = 'investimentos';
      else categoria = 'outros';
    } else {
      // Categorias para gastos
      if (message.includes('mercad') || message.includes('compra')) categoria = 'mercado';
      else if (message.includes('aliment') || message.includes('comida') || message.includes('lanche')) categoria = 'alimentação';
      else if (message.includes('transport') || message.includes('uber')) categoria = 'transporte';
      else categoria = 'outros';
    }
    
    return {
      response: valor > 0 ? 
        (transactionType === 'income' ? 
          `Opa! R$ ${valor.toFixed(2)} de recebimento anotado! ${categoria !== 'outros' ? `De ${categoria}! Tá certo?` : 'De que categoria?'}` :
          `Opa! R$ ${valor.toFixed(2)} anotado! ${categoria !== 'outros' ? `Em ${categoria}! Tá certo?` : 'Mas em que categoria?'}`
        ) :
        (transactionType === 'income' ? 
          'Não consegui sacar direito... Pode falar tipo "recebi R$ 500 de salário"? 😅' :
          'Não consegui sacar direito... Pode falar tipo "gastei R$ 50 no mercado"? 😅'
        ),
      extraction: {
        valor: valor,
        categoria: categoria !== 'outros' ? categoria : '',
        descricao: transactionType === 'income' ? 'Recebimento' : 'Gasto',
        data: new Date().toISOString().split('T')[0],
        isValid: false,
        type: transactionType
      }
    };
  }

  // 🔥 MÉTODO AUXILIAR: Detecta tipo de transação
  private detectTransactionType(message: string, chatState?: string): 'expense' | 'income' {
    const lowerMessage = message.toLowerCase();
    
    // Se o estado do chat já define o tipo, usar ele
    if (chatState === 'waiting_expense') return 'expense';
    if (chatState === 'waiting_income') return 'income';
    
    // Palavras-chave para recebimentos (melhoradas)
    const incomeWords = ['recebi', 'recebimento', 'ganhei', 'salário', 'freelance', 'renda', 'entrou', 'pagaram', 'vendas', 'venda', 'divida', 'dívida', 'pagaram', 'deposito', 'depósito'];
    const expenseWords = ['gastei', 'gasto', 'comprei', 'paguei', 'saiu', 'foi', 'despesa'];
    
    const hasIncomeWords = incomeWords.some(word => lowerMessage.includes(word));
    const hasExpenseWords = expenseWords.some(word => lowerMessage.includes(word));
    
    // Priorizar recebimento se detectado
    if (hasIncomeWords && !hasExpenseWords) return 'income';
    if (hasExpenseWords && !hasIncomeWords) return 'expense';
    
    // Se a mensagem começa com "recebi", é definitivamente income
    if (lowerMessage.startsWith('recebi')) return 'income';
    
    // Default para gasto se ambíguo
    return 'expense';
  }

  // 🔄 MANTER COMPATIBILIDADE: Método antigo que chama o novo
  async extractExpenseData(
    userMessage: string, 
    systemInstructions: string, 
    conversationHistory: any[] = [],
    userPersonality?: string,
    userId?: string
  ): Promise<{
    response: string;
    extraction: ExpenseExtraction;
    personalityUpdate?: string;
  }> {
    const result = await this.extractTransactionData(
      userMessage, 
      systemInstructions, 
      conversationHistory, 
      userPersonality, 
      userId, 
      'waiting_expense' // Força tipo gasto para compatibilidade
    );
    
    return {
      ...result,
      extraction: {
        ...result.extraction,
        type: 'expense'
      } as ExpenseExtraction
    };
  }
}
