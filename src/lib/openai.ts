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

// 🔥 NOVA FUNÇÃO: Gera data brasileira no formato YYYY-MM-DD
function getBrazilDateString(): string {
  const brazilDate = getBrazilDate();
  const year = brazilDate.getFullYear();
  const month = String(brazilDate.getMonth() + 1).padStart(2, '0');
  const day = String(brazilDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

// 📅 NOVO: Interface para compromissos
interface AppointmentExtraction {
  titulo: string;
  descricao: string;
  data: string;
  hora: string;
  local?: string;
  categoria: string;
  isValid: boolean;
  type: 'appointment';
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
    chatState?: string, // 'waiting_expense' | 'waiting_income' | 'initial'
    userPlanType?: 'bronze' | 'ouro' // NOVO: tipo de plano do usuário
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
            data: getBrazilDateString(),
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
    
    console.log('🔥 OpenAI - Mensagem atual:', currentMessage);
    console.log('🔥 OpenAI - É confirmação?', isConfirmation);
    
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
          
          console.log('🎉 OpenAI - CONFIRMAÇÃO DETECTADA! Criando extraction com isValid: true');
          console.log('🎉 OpenAI - Valor:', valor, 'Categoria:', categoria, 'Tipo:', isIncome ? 'income' : 'expense');
          
          return {
            response: isIncome ? 
              `Massa! R$ ${valor.toFixed(2)} de recebimento em ${categoria} registrado! 🎉💎\n\nShow de bola! Quer adicionar mais alguma entrada?` :
              `Massa! R$ ${valor.toFixed(2)} em ${categoria} registrado! 🎉\n\nShow! Rolou mais algum gasto que você quer anotar?`,
                          extraction: {
                valor: valor,
                categoria: categoria,
                descricao: isIncome ? `Recebimento em ${categoria}` : `Gasto em ${categoria}`,
                data: getBrazilDateString(),
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
            valor: 0, categoria: '', descricao: '', data: getBrazilDateString(),
            isValid: false, type: 'expense'
          }
        };
    }

    // 👋 DETECÇÃO DE SAUDAÇÕES (PRIORITY #3)
    const greetingWords = ['ola', 'olá', 'eai', 'e ai', 'oi', 'hey', 'hello', 'salve', 'fala'];
    const isGreeting = greetingWords.some(word => currentMessage.startsWith(word) || currentMessage === word);
    
    if (isGreeting) {
      // 🥇 MENSAGENS SIMPLES PARA USUÁRIOS (direcionando para botões)
      if (userPlanType === 'ouro') {
        const goldResponses = [
          `E aí! Beleza? 😄💎\n\nPosso te ajudar com finanças e agenda! Use os botões abaixo para escolher o que quer fazer! 🚀`,
          `Opa! Tudo jóia? 😊💎\n\nBora organizar suas finanças e compromissos? Clica em um dos botões aí embaixo! 💰📅`,
          `Salve! 🤙💎\n\nAqui é seu assistente premium! Use os botões abaixo para registrar gastos, recebimentos ou compromissos! 💪`
        ];
        
        return {
          response: goldResponses[Math.floor(Math.random() * goldResponses.length)],
          extraction: {
            valor: 0, categoria: '', descricao: '', data: getBrazilDateString(),
            isValid: false, type: 'expense'
          }
        };
      }
      
      // 🥉 MENSAGENS SIMPLES PARA USUÁRIOS BRONZE
      const bronzeResponses = [
        `E aí! Beleza? 😄\n\nBora controlar seus gastos? Clica no botão aí embaixo! 🚀`,
        `Opa! Tudo jóia? 😊\n\nPronto para registrar um gasto? Use o botão abaixo! 💰`,
        `Salve! 🤙\n\nVamos organizar suas finanças? Clica no botão de "Registrar Gasto" embaixo! 💪`
      ];
      
              return {
          response: bronzeResponses[Math.floor(Math.random() * bronzeResponses.length)],
          extraction: {
            valor: 0, categoria: '', descricao: '', data: getBrazilDateString(),
            isValid: false, type: 'expense'
          }
        };
    }

    // 📅 DETECÇÃO PRIORITÁRIA DE COMPROMISSOS (antes de valores)
    const actionType = this.detectActionType(userMessage, chatState);
    
    if (actionType === 'appointment') {
      console.log('📅 COMPROMISSO DETECTADO! Chamando extractAppointmentData');
      // Se é compromisso, processar direto como appointment (não como transação)
      return this.extractAppointmentData(
        userMessage,
        systemInstructions,
        conversationHistory,
        userPersonality,
        userId,
        chatState
      ).then(result => ({
        response: result.response,
        extraction: {
          valor: 0,
          categoria: result.extraction.categoria,
          descricao: result.extraction.titulo,
          data: result.extraction.data,
          isValid: result.extraction.isValid,
          type: 'expense' // Compatibilidade com interface TransactionExtraction
        } as TransactionExtraction,
        personalityUpdate: result.personalityUpdate
      }));
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
            data: getBrazilDateString(),
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
          data: getBrazilDateString(),
          isValid: false,
          type: transactionType
        }
      };
  }

  // 🔥 MÉTODO AUXILIAR: Detecta tipo geral (transação ou compromisso)
  private detectActionType(message: string, chatState?: string): 'expense' | 'income' | 'appointment' {
    const lowerMessage = message.toLowerCase();
    
    // Se o estado do chat já define o tipo, usar ele
    if (chatState === 'waiting_expense') return 'expense';
    if (chatState === 'waiting_income') return 'income';
    if (chatState === 'waiting_appointment') return 'appointment';
    
    // 📅 Palavras-chave para compromissos (NOVA DETECÇÃO)
    const appointmentWords = ['compromisso', 'agendamento', 'agendar', 'consulta', 'reunião', 'reuniao', 'encontro', 'dentista', 'médico', 'medico', 'doutor', 'doutora', 'hospital', 'clínica', 'clinica', 'appointment', 'meeting', 'lembrete', 'evento', 'aniversário', 'aniversario'];
    const timeWords = ['hoje', 'amanha', 'amanhã', 'dia', 'hora', 'horas', 'às', 'as'];
    
    const hasAppointmentWords = appointmentWords.some(word => lowerMessage.includes(word));
    const hasTimeContext = timeWords.some(word => lowerMessage.includes(word));
    
    // Se detecta palavras de compromisso + contexto de tempo, é appointment
    if (hasAppointmentWords || (hasTimeContext && (lowerMessage.includes('no ') || lowerMessage.includes('na ') || lowerMessage.includes('com ')))) {
      return 'appointment';
    }
    
    return this.detectTransactionType(message, chatState);
  }

  // 🔥 MÉTODO AUXILIAR: Detecta tipo de transação financeira
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

  // 📅 NOVO MÉTODO: Processa compromissos
  async extractAppointmentData(
    userMessage: string, 
    systemInstructions: string, 
    conversationHistory: any[] = [],
    userPersonality?: string,
    userId?: string,
    chatState?: string
  ): Promise<{
    response: string;
    extraction: AppointmentExtraction;
    personalityUpdate?: string;
  }> {
    
    const currentMessage = userMessage.toLowerCase().trim();
    console.log('📅 VERIFICANDO COMPROMISSO:', userMessage);
    console.log('🎯 ESTADO DO CHAT:', chatState);
    
    // 🧠 ANÁLISE CONTEXTUAL
    const lastBotMessage = conversationHistory
      .slice()
      .reverse()
      .find(msg => msg.type === 'assistant')?.content || '';
    
    // 🔥 DETECÇÃO DE CONFIRMAÇÃO PARA COMPROMISSOS
    const confirmationWords = ['sim', 'ta sim', 'tá sim', 'certo', 'isso mesmo', 'exato', 'correto', 'confirmo', 'pode ser', 'tá certo', 'é isso', 'isso aí', 'ta certo', 'perfeito', 'ok', 'okay'];
    const isConfirmation = confirmationWords.some(word => currentMessage === word || currentMessage.includes(word));
    
    if (isConfirmation && lastBotMessage.includes('Tá certo?')) {
      console.log('✅ CONFIRMAÇÃO DE COMPROMISSO DETECTADA!');
      
      // Extrair dados da mensagem de confirmação do bot
      const tituloMatch = lastBotMessage.match(/Compromisso:\s*([^,\n]+)/i);
      const dataMatch = lastBotMessage.match(/Data:\s*([^,\n]+)/i);
      const horaMatch = lastBotMessage.match(/Hora:\s*([^,\n]+)/i);
      const localMatch = lastBotMessage.match(/Local:\s*([^,\n]+)/i);
      const categoriaMatch = lastBotMessage.match(/Categoria:\s*([^,\n]+)/i);
      
      if (tituloMatch && dataMatch && horaMatch) {
        // 🔧 LIMPAR ASTERISCOS E FORMATAÇÃO MARKDOWN DO TÍTULO
        const tituloLimpo = tituloMatch[1].replace(/\*\*/g, '').trim();
        const horaLimpa = horaMatch[1].replace(/\*\*/g, '').trim();
        const dataLimpa = dataMatch[1].replace(/\*\*/g, '').trim();
        const localLimpo = localMatch?.[1]?.replace(/\*\*/g, '').trim() || '';
        
        return {
          response: `🎉 Massa! Compromisso agendado com sucesso! 📅\n\n✅ ${tituloLimpo} - ${dataLimpa} às ${horaLimpa}`,
          extraction: {
            titulo: tituloLimpo,
            descricao: tituloLimpo,
            data: this.parseAppointmentDate(dataLimpa),
            hora: horaLimpa,
            local: localLimpo,
            categoria: this.mapAppointmentCategory(categoriaMatch?.[1] || ''),
            isValid: true,
            type: 'appointment'
          }
        };
      }
    }

    // Prompt para processamento de compromissos
    const appointmentPrompt = `Você é um assistente brasileiro SUPER INTELIGENTE para compromissos! 📅

CONTEXTO DA CONVERSA:
${conversationHistory.slice(-5).map((msg, i) => `${i + 1}. ${msg.type}: "${msg.content}"`).join('\n')}

ESTADO ATUAL: ${chatState || 'initial'}

VOCÊ É SUPER INTELIGENTE E:
- Fala como brasileiro jovem: "massa", "show", "beleza", "top"
- CONECTA informações entre mensagens  
- ENTENDE confirmações: "sim", "certo", "isso"
- Detecta compromissos facilmente: reunião, dentista, consulta, etc.

DETECÇÃO INTELIGENTE DE COMPROMISSOS:
- "reunião amanhã às 14h" = título="Reunião", data="amanhã", hora="14:00", categoria="trabalho"
- "dentista dia 20 às 15h" = título="Dentista", data="dia 20", hora="15:00", categoria="saúde"
- "consulta médica às 10h" = título="Consulta médica", data="hoje", hora="10:00", categoria="saúde"
- "encontro cliente às 9h" = título="Encontro cliente", data="hoje", hora="09:00", categoria="negócios"
- "reuniao depois de amanha as 15 horas" = título="Reunião", data="depois de amanhã", hora="15:00", categoria="trabalho"
- "consulta dia 25 as 10 horas" = título="Consulta", data="dia 25", hora="10:00", categoria="saúde"

CATEGORIAS AUTOMÁTICAS:
- reunião, meeting, trabalho → "trabalho"
- dentista, médico, consulta, hospital → "saúde"  
- cliente, vendas, negócio → "negócios"
- família, casa, pessoal → "família"
- escola, curso, aula → "educação"
- outros casos → "pessoal"

LÓGICA SIMPLES:
1. Se tem TÍTULO + DATA/TEMPO + HORA → pergunta "Tá certo?" mostrando detalhes
2. Se falta info específica → pergunta o que falta
3. Se usuário confirma → isValid = true

FORMATO (JSON):
{
  "response": "resposta_natural_brasileira",
  "extraction": {
    "titulo": "titulo_claro",
    "descricao": "titulo_claro", 
    "data": "amanhã_ou_hoje_ou_dia_X",
    "hora": "HH:MM",
    "local": "",
    "categoria": "categoria_detectada",
    "isValid": false_se_perguntando_confirmacao,
    "type": "appointment"
  }
}

EXEMPLOS DE RESPOSTA:
Usuário: "reunião amanhã às 14h"
→ "Show! Vou agendar:

📅 Compromisso: Reunião
📅 Data: Amanhã  
📅 Hora: 14:00
📅 Categoria: Trabalho

Tá certo?"

IMPORTANTES:
- JSON válido sempre
- isValid = false até confirmar (para perguntar "Tá certo?")
- Seja natural e brasileiro
- Detecte até info parcial e pergunte o resto`;

    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: appointmentPrompt },
        { role: 'user', content: userMessage }
      ];

      const result = await this.chatCompletion(messages);
      console.log('🤖 Resposta da IA (Compromisso):', result);
      
      try {
        const cleanResult = result.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleanResult);
        
        if (parsed.extraction && parsed.response) {
          // 🔧 LIMPAR ASTERISCOS DE TODOS OS CAMPOS
          if (parsed.extraction.titulo) {
            parsed.extraction.titulo = parsed.extraction.titulo.replace(/\*\*/g, '').trim();
          }
          if (parsed.extraction.descricao) {
            parsed.extraction.descricao = parsed.extraction.descricao.replace(/\*\*/g, '').trim();
          }
          if (parsed.extraction.local) {
            parsed.extraction.local = parsed.extraction.local.replace(/\*\*/g, '').trim();
          }
          
          parsed.extraction.type = 'appointment';
          return parsed;
        }
      } catch (parseError) {
        console.log('❌ Erro parse JSON, usando fallback para compromisso');
      }
      
      // Fallback para compromissos
      return this.createAppointmentFallback(userMessage, result);
      
    } catch (error) {
      console.error('Error in extractAppointmentData:', error);
      throw error;
    }
  }

  // 🔧 HELPER: Mapear categoria de compromisso
  private mapAppointmentCategory(categoria: string): string {
    categoria = categoria.toLowerCase();
    
    if (categoria.includes('médic') || categoria.includes('dentist') || categoria.includes('consulta') || categoria.includes('hospital') || categoria.includes('clínic')) {
      return 'saúde';
    } else if (categoria.includes('trabalho') || categoria.includes('reunião') || categoria.includes('meeting') || categoria.includes('escritório')) {
      return 'trabalho';
    } else if (categoria.includes('família') || categoria.includes('family') || categoria.includes('casa') || categoria.includes('irmã') || categoria.includes('pai') || categoria.includes('mãe')) {
      return 'família';
    } else if (categoria.includes('escola') || categoria.includes('curso') || categoria.includes('aula') || categoria.includes('professor')) {
      return 'educação';
    } else if (categoria.includes('lazer') || categoria.includes('cinema') || categoria.includes('festa') || categoria.includes('show')) {
      return 'lazer';
    } else if (categoria.includes('banco') || categoria.includes('financ') || categoria.includes('contador')) {
      return 'financeiro';
    } else if (categoria.includes('negóc') || categoria.includes('client') || categoria.includes('vendas')) {
      return 'negócios';
    }
    
    return 'pessoal';
  }

  // 🔧 HELPER: Converter data de compromisso
  private parseAppointmentDate(dateText: string): string {
    const hoje = new Date();
    const text = dateText.toLowerCase();
    
    if (text.includes('hoje')) {
      return hoje.toISOString().split('T')[0];
    } else if (text.includes('depois de amanhã') || text.includes('depois de amanha')) {
      const depoisAmanha = new Date(hoje);
      depoisAmanha.setDate(hoje.getDate() + 2);
      return depoisAmanha.toISOString().split('T')[0];
    } else if (text.includes('amanhã') || text.includes('amanha')) {
      const amanha = new Date(hoje);
      amanha.setDate(hoje.getDate() + 1);
      return amanha.toISOString().split('T')[0];
    } else if (text.includes('dia ')) {
      const dayMatch = text.match(/dia (\d{1,2})/);
      if (dayMatch) {
        const day = parseInt(dayMatch[1]);
        const thisMonth = new Date(hoje.getFullYear(), hoje.getMonth(), day);
        // Se o dia já passou neste mês, assume próximo mês
        if (thisMonth < hoje) {
          thisMonth.setMonth(thisMonth.getMonth() + 1);
        }
        return thisMonth.toISOString().split('T')[0];
      }
    }
    
    // Se não conseguiu parsear, retorna hoje
    return hoje.toISOString().split('T')[0];
  }

  // 🧠 HELPER: Fallback para compromissos
  private createAppointmentFallback(userMessage: string, aiResponse: string): any {
    const message = userMessage.toLowerCase();
    
    // Tentar extrair informações básicas
    let titulo = '';
    let categoria = 'pessoal';
    let data = 'hoje';
    let hora = '';
    
    // Detectar título/tipo
    if (message.includes('dentist')) {
      titulo = 'Dentista';
      categoria = 'saúde';
    } else if (message.includes('médic') || message.includes('medico')) {
      titulo = 'Consulta médica';
      categoria = 'saúde';
    } else if (message.includes('reunião') || message.includes('reuniao')) {
      titulo = 'Reunião';
      categoria = 'trabalho';
    } else if (message.includes('consulta')) {
      titulo = 'Consulta';
      categoria = 'saúde';
    } else if (message.includes('encontro')) {
      titulo = 'Encontro';
      categoria = 'pessoal';
    } else if (message.includes('compromisso')) {
      titulo = 'Compromisso';
    } else {
      // Tentar extrair o primeiro termo como título
      const words = userMessage.split(' ');
      titulo = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    }
    
    // Adicionar pessoa se mencionada "com [nome]"
    const comMatch = message.match(/com (\w+)/);
    if (comMatch) {
      titulo += ` com ${comMatch[1].charAt(0).toUpperCase() + comMatch[1].slice(1)}`;
    }
    
    // Detectar data
    if (message.includes('depois de amanhã') || message.includes('depois de amanha')) {
      data = 'depois de amanhã';
    } else if (message.includes('amanhã') || message.includes('amanha')) {
      data = 'amanhã';
    } else if (message.includes('hoje')) {
      data = 'hoje';
    } else if (message.includes('dia ')) {
      const dayMatch = message.match(/dia (\d{1,2})/);
      if (dayMatch) {
        data = `dia ${dayMatch[1]}`;
      }
    }
    
    // Detectar hora
    const horaMatch = message.match(/(\d{1,2})h|(\d{1,2}):(\d{2})|às (\d{1,2})|as (\d{1,2})|(\d{1,2}) horas/);
    if (horaMatch) {
      if (horaMatch[1]) hora = `${horaMatch[1]}:00`;
      else if (horaMatch[2] && horaMatch[3]) hora = `${horaMatch[2]}:${horaMatch[3]}`;
      else if (horaMatch[4]) hora = `${horaMatch[4]}:00`;
      else if (horaMatch[5]) hora = `${horaMatch[5]}:00`;
      else if (horaMatch[6]) hora = `${horaMatch[6]}:00`;
    }
    
    // Se conseguiu extrair informações básicas, fazer confirmação
    if (titulo && hora && data) {
      return {
        response: `Show! Vou agendar:

📅 Compromisso: ${titulo}
📅 Data: ${data.charAt(0).toUpperCase() + data.slice(1)}
📅 Hora: ${hora}
📅 Categoria: ${categoria.charAt(0).toUpperCase() + categoria.slice(1)}

Tá certo?`,
        extraction: {
          titulo: titulo,
          descricao: titulo,
          data: data,
          hora: hora,
          local: '',
          categoria: categoria,
          isValid: false, // Aguardando confirmação
          type: 'appointment'
        }
      };
    }
    
    return {
      response: 'Quase lá! Pode me falar mais detalhes? Ex: "Reunião amanhã às 14h" ou "Dentista dia 20 às 15h" 😊',
      extraction: {
        titulo: titulo || 'Compromisso',
        descricao: titulo || 'Compromisso',
        data: data,
        hora: hora,
        local: '',
        categoria: categoria,
        isValid: false,
        type: 'appointment'
      }
    };
  }

  // 🔄 MANTER COMPATIBILIDADE: Método antigo que chama o novo
  async extractExpenseData(
    userMessage: string, 
    systemInstructions: string, 
    conversationHistory: any[] = [],
    userPersonality?: string,
    userId?: string,
    userPlanType?: 'bronze' | 'ouro'
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
      'waiting_expense', // Força tipo gasto para compatibilidade
      userPlanType
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
