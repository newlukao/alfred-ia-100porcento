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
  
  // ✅ PROTEÇÃO BÁSICA CONTRA ABUSO
  private static lastRequest = 0;
  private static requestCount = 0;
  private static readonly MAX_REQUESTS_PER_HOUR = 50;
  private static readonly MIN_INTERVAL_MS = 2000; // 2 segundos entre requests

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chatCompletion(messages: ChatMessage[], model: string = 'gpt-4o-mini'): Promise<string> {
    // ✅ RATE LIMITING - Proteção básica
    const now = Date.now();
    const timeSinceLastRequest = now - OpenAIService.lastRequest;
    
    if (timeSinceLastRequest < OpenAIService.MIN_INTERVAL_MS) {
      const waitTime = OpenAIService.MIN_INTERVAL_MS - timeSinceLastRequest;
      throw new Error(`⏳ Aguarde ${Math.ceil(waitTime / 1000)} segundos antes de fazer outra pergunta`);
    }
    
    if (OpenAIService.requestCount >= OpenAIService.MAX_REQUESTS_PER_HOUR) {
      throw new Error('🚫 Limite de 50 perguntas por hora atingido. Tente novamente mais tarde.');
    }
    
    OpenAIService.lastRequest = now;
    OpenAIService.requestCount++;
    
    // Reset counter every hour
    if (OpenAIService.requestCount === 1) {
      setTimeout(() => {
        OpenAIService.requestCount = 0;
        console.log('🔄 Rate limit resetado - 50 requests disponíveis novamente');
      }, 3600000); // 1 hora
    }
    
    console.log(`📊 Request ${OpenAIService.requestCount}/${OpenAIService.MAX_REQUESTS_PER_HOUR} - Rate limiting ativo`);
    
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
    
    // PRIORITY #1: DETECÇÕES BÁSICAS (ANTES DE QUALQUER OUTRO PROCESSAMENTO)
    const currentMessage = userMessage.toLowerCase().trim();
    console.log('🔍 VERIFICANDO MENSAGEM:', userMessage);
    
    // 🙏 DETECÇÃO DE AGRADECIMENTOS E DESPEDIDAS (PRIORITY #1)
    const thankYouWords = ['obrigado', 'obrigada', 'valeu', 'vlw', 'thanks', 'thank you', 'brigado', 'brigada', 'muito obrigado', 'muito obrigada', 'valeu mesmo', 'tchau', 'até logo', 'ate logo', 'falou', 'flw', 'bye', 'adeus'];
    const isThankYou = thankYouWords.some(word => 
      currentMessage.includes(word) || 
      currentMessage.startsWith(word) || 
      currentMessage.endsWith(word)
    );
    
    if (isThankYou) {
      console.log('🙏 AGRADECIMENTO DETECTADO - FINALIZANDO');
      const thankYouResponses = [
        'Disponha! 😊 Sempre que precisar, é só chamar! Tô aqui pra te ajudar com seus gastos! 💰',
        'Por nada! 🤙 Qualquer coisa, me chama! Bora manter essas finanças organizadas! 📊',
        'Valeu! 😄 Tô sempre aqui pra ajudar! Se rolar mais algum gasto, é só falar! 🚀',
        'De boa! 😎 Sempre que quiser registrar algum gasto, me dá um toque! 💸',
        'Tranquilo! 🙌 Tô aqui pra isso mesmo! Bora manter o controle das finanças! ✨'
      ];
      
      const randomResponse = thankYouResponses[Math.floor(Math.random() * thankYouResponses.length)];
      
      return {
        response: randomResponse,
        extraction: {
          valor: 0,
          categoria: '',
          descricao: '',
          data: new Date().toISOString().split('T')[0],
          isValid: false
        }
      };
    }

    // 👋 DETECÇÃO DE SAUDAÇÕES (PRIORITY #2)
    const greetingWords = ['ola', 'olá', 'eai', 'e ai', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'hello', 'salve', 'fala'];
    const isGreeting = greetingWords.some(word => 
      currentMessage.startsWith(word) || 
      currentMessage.includes(' ' + word + ' ') || 
      currentMessage.endsWith(' ' + word) ||
      (word.includes(' ') && currentMessage.includes(word))
    ) || currentMessage === 'oi'; // Detecção específica para "oi" sozinho
    
    if (isGreeting) {
      console.log('👋 SAUDAÇÃO DETECTADA - FINALIZANDO');
      const greetingResponses = [
        'E aí! Beleza? 😄 Pronto pra anotar uns gastos? Manda aí: "gastei R$ 50 no mercado" ou algo assim! 💰',
        'Opa! Tudo jóia? 😊 Vamos registrar seus gastos? É só falar: "gastei R$ 30 no lanche" que eu anoto tudo! 🍔💸',
        'Salve! Show de bola! 🤙 Bora organizar as finanças? Fala aí qualquer gasto: "gastei R$ 100 na roupa"! 👕',
        'E aí, tranquilo? 😎 Tô aqui pra te ajudar com os gastos! Manda qualquer coisa tipo: "gastei R$ 80 no uber"! 🚗',
        'Opa! Beleza demais! 🎉 Pronto pra registrar uns gastos maneiros? Só falar: "gastei R$ 25 no açaí"! 🍨'
      ];
      
      const randomResponse = greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
      
      return {
        response: randomResponse,
        extraction: {
          valor: 0,
          categoria: '',
          descricao: '',
          data: new Date().toISOString().split('T')[0],
          isValid: false
        }
      };
    }
    
    // 🔥 CONEXÃO INTELIGENTE FORÇADA: Se bot perguntou categoria e usuário responde com categoria/produto
    const botMessages = conversationHistory.filter(msg => msg.type === 'assistant');
    const lastBotMessage = botMessages[botMessages.length - 1];
    
    if (lastBotMessage && lastBotMessage.content.includes('em que categoria')) {
      console.log('🔗 DETECTADO: Bot perguntou categoria, analisando resposta do usuário...');
      
      // Extrair valor da mensagem do bot
      const valorMatch = lastBotMessage.content.match(/R\$\s*(\d+(?:[.,]\d+)?)/);
      
      if (valorMatch) {
        const valor = parseFloat(valorMatch[1].replace(',', '.'));
        console.log(`💰 VALOR ENCONTRADO NA PERGUNTA: R$ ${valor}`);
        
        // Detectar categoria na resposta atual do usuário
        let categoria = '';
        let descricao = currentMessage;
        
        // Mapeamento inteligente de categorias
        if (currentMessage.includes('agua') || currentMessage.includes('água') || currentMessage.includes('luz') || currentMessage.includes('internet') || currentMessage.includes('telefone') || currentMessage.includes('energia') || currentMessage.includes('conta')) {
          categoria = 'contas';
          descricao = currentMessage.replace(/paguei|gastei|comprei/gi, '').trim();
        } else if (currentMessage.includes('almoç') || currentMessage.includes('jantar') || currentMessage.includes('lanche') || currentMessage.includes('comida') || currentMessage.includes('hambur') || currentMessage.includes('pizza') || currentMessage.includes('restaurante') || currentMessage.includes('café') || currentMessage.includes('bar')) {
          categoria = 'alimentação';
          descricao = currentMessage.replace(/paguei|gastei|comprei/gi, '').trim();
        } else if (currentMessage.includes('uber') || currentMessage.includes('taxi') || currentMessage.includes('gasolina') || currentMessage.includes('combustível') || currentMessage.includes('ônibus') || currentMessage.includes('metro') || currentMessage.includes('passagem')) {
          categoria = 'transporte';
          descricao = currentMessage.replace(/paguei|gastei|comprei/gi, '').trim();
        } else if (currentMessage.includes('mercado') || currentMessage.includes('supermercado') || currentMessage.includes('compras') || currentMessage.includes('feira') || currentMessage.includes('atacadão')) {
          categoria = 'mercado';
          descricao = currentMessage.replace(/paguei|gastei|comprei/gi, '').trim();
                 } else if (currentMessage.includes('cinema') || currentMessage.includes('festa') || currentMessage.includes('show') || currentMessage.includes('teatro') || currentMessage.includes('jogo') || currentMessage.includes('netflix') || currentMessage.includes('streaming') || currentMessage.includes('spotify') || currentMessage.includes('youtube')) {
           categoria = 'lazer';
           descricao = currentMessage.replace(/paguei|gastei|comprei/gi, '').trim();
        } else if (currentMessage.includes('roupa') || currentMessage.includes('camisa') || currentMessage.includes('calça') || currentMessage.includes('sapato') || currentMessage.includes('tênis') || currentMessage.includes('shopping')) {
          categoria = 'vestuário';
          descricao = currentMessage.replace(/paguei|gastei|comprei/gi, '').trim();
        } else if (currentMessage.includes('médico') || currentMessage.includes('farmácia') || currentMessage.includes('remédio') || currentMessage.includes('hospital') || currentMessage.includes('dentista')) {
          categoria = 'saúde';
          descricao = currentMessage.replace(/paguei|gastei|comprei/gi, '').trim();
        } else {
          // Categoria genérica baseada no contexto
          categoria = 'outros';
          descricao = currentMessage.replace(/paguei|gastei|comprei/gi, '').trim();
        }
        
        if (categoria && descricao.length > 2) {
          console.log(`🎯 CONEXÃO FORÇADA DETECTADA: R$ ${valor} em ${categoria} (${descricao})`);
          
          return {
            response: `Show! Conectei as informações! R$ ${valor.toFixed(2)} em ${categoria} (${descricao})! 💰 Tá certo?`,
            extraction: {
              valor: valor,
              categoria: categoria,
              descricao: descricao,
              data: new Date().toISOString().split('T')[0],
              isValid: false // Aguardando confirmação
            }
          };
        }
      }
    }
    
    // PRIORITY #2: CONFIRMAÇÃO FINAL DA DATA
    if (currentMessage === 'sim' || currentMessage === 'ta sim' || currentMessage === 'tá sim') {
      const lastBotMessage = [...conversationHistory]
        .reverse()
        .find(msg => msg.type === 'assistant');
      
      // CONFIRMAÇÃO DE DATA "HOJE"
      if (lastBotMessage && (
        lastBotMessage.content.includes('foi hoje') || 
        lastBotMessage.content.includes('Esse gasto foi hoje')
      )) {
        console.log('✅ CONFIRMAÇÃO DE DATA HOJE DETECTADA');
        
        const valorMatch = lastBotMessage.content.match(/R\$\s*(\d+(?:[.,]\d+)?)/);
        
        if (valorMatch) {
          const valor = parseFloat(valorMatch[1].replace(',', '.'));
          const dataHoje = getBrazilDate().toISOString().split('T')[0];
          
          // Extrair categoria e descrição do histórico
          let categoria = 'outros';
          let descricao = 'Gasto registrado';
          
          // Buscar categoria nas mensagens do bot
          for (let i = conversationHistory.length - 1; i >= 0; i--) {
            const msg = conversationHistory[i];
            if (msg.type === 'assistant' && msg.content.includes('em ')) {
              const categoriaMatch = msg.content.match(/em\s+([a-záêçã]+(?:\s+[a-záêçã]+)*?)(?:\s|!|\?|\.)/i);
              if (categoriaMatch) {
                categoria = categoriaMatch[1].toLowerCase();
                break;
              }
            }
          }
          
          // 🔥 BUSCAR DESCRIÇÃO INTELIGENTE: Priorizar mensagens de categoria/produto
          for (let i = conversationHistory.length - 1; i >= 0; i--) {
            const msg = conversationHistory[i];
            if (msg.type === 'user') {
              // 1. PRIORIDADE: Mensagens sem "gastei", "sim", "não" (provavelmente categoria/produto)
              if (!msg.content.includes('gastei') && !msg.content.includes('sim') && !msg.content.includes('não') && !msg.content.includes('comprei') && !msg.content.includes('paguei')) {
                const cleanDescription = msg.content
                  .replace(/\d+([.,]\d+)?/g, '') // Remove números
                  .replace(/r\$|reais?/gi, '') // Remove R$ e reais
                  .trim();
                
                if (cleanDescription && cleanDescription.length > 2) {
                  descricao = cleanDescription;
                  console.log('✨ DESCRIÇÃO CATEGORIA/PRODUTO EXTRAÍDA:', descricao, 'da mensagem:', msg.content);
                  break;
                }
              }
              
              // 2. FALLBACK: Mensagens com "gastei" mas extrair o produto
              if (msg.content.includes('gastei') || msg.content.includes('comprei') || msg.content.includes('paguei')) {
                const itemMatch = msg.content.match(/(?:gastei|comprei|paguei).*?(?:com|no|na|de|em|para|pro)\s+([a-záêçã\s]+?)(?:\s|$)/i);
                if (itemMatch) {
                  descricao = itemMatch[1].trim();
                  console.log('📝 DESCRIÇÃO EXTRAÍDA:', descricao, 'da mensagem:', msg.content);
                  break;
                }
                // Fallback final: remover palavras de ação
                const fallbackMatch = msg.content
                  .replace(/\d+([.,]\d+)?/g, '') // Remove números
                  .replace(/r\$|reais?/gi, '') // Remove R$ e reais
                  .replace(/\b(gastei|comprei|paguei|foi|com|no|na|de|em|para|pro|um|uma|o|a)\b/gi, '') // Remove palavras de ação
                  .trim();
                if (fallbackMatch && fallbackMatch.length > 3) {
                  descricao = fallbackMatch;
                  console.log('📝 DESCRIÇÃO FALLBACK MELHORADA:', descricao);
                  break;
                }
              }
            }
          }
          
          console.log('🎉 FINALIZANDO GASTO DE HOJE:', valor, categoria, descricao);
          
          return {
            response: `Perfeito! R$ ${valor.toFixed(2)} em ${categoria} de hoje registrado! 🎉\n\nGasto salvo com sucesso!\n\nE aí, rolou mais algum gasto que você quer anotar? 😊`,
            extraction: {
              valor: valor,
              categoria: categoria,
              descricao: descricao,
              data: dataHoje,
              isValid: true // FINALIZA!
            }
          };
        }
      }
      
      // CONFIRMAÇÃO DE DATA ESPECÍFICA
      if (lastBotMessage && lastBotMessage.content.includes('Então foi dia') && lastBotMessage.content.includes('pra confirmar')) {
        console.log('✅ CONFIRMAÇÃO FINAL DA DATA DETECTADA');
        
        const valorMatch = lastBotMessage.content.match(/R\$\s*(\d+(?:[.,]\d+)?)/);
        const dataMatch = lastBotMessage.content.match(/\d{2}\/\d{2}\/\d{4}/);
        
        if (valorMatch && dataMatch) {
          const valor = parseFloat(valorMatch[1].replace(',', '.'));
          const dataFormatada = dataMatch[0];
          const partesData = dataFormatada.split('/'); // [DD, MM, YYYY]
          const dataISO = `${partesData[2]}-${partesData[1].padStart(2, '0')}-${partesData[0].padStart(2, '0')}`;
          
          // Extrair categoria e descrição do histórico
          let categoria = 'outros';
          let descricao = 'Gasto registrado';
          
          // Buscar categoria nas mensagens do bot
          for (let i = conversationHistory.length - 1; i >= 0; i--) {
            const msg = conversationHistory[i];
            if (msg.type === 'assistant' && msg.content.includes('em ')) {
              const categoriaMatch = msg.content.match(/em\s+([a-záêçã]+(?:\s+[a-záêçã]+)*?)(?:\s|!|\?|\.)/i);
              if (categoriaMatch) {
                categoria = categoriaMatch[1].toLowerCase();
                break;
              }
            }
          }
          
          // 🔥 BUSCAR DESCRIÇÃO INTELIGENTE: Priorizar mensagens de categoria/produto
          for (let i = conversationHistory.length - 1; i >= 0; i--) {
            const msg = conversationHistory[i];
            if (msg.type === 'user') {
              // 1. PRIORIDADE: Mensagens sem "gastei", "sim", "não" (provavelmente categoria/produto)
              if (!msg.content.includes('gastei') && !msg.content.includes('sim') && !msg.content.includes('não') && !msg.content.includes('comprei') && !msg.content.includes('paguei')) {
                const cleanDescription = msg.content
                  .replace(/\d+([.,]\d+)?/g, '') // Remove números
                  .replace(/r\$|reais?/gi, '') // Remove R$ e reais
                  .trim();
                
                if (cleanDescription && cleanDescription.length > 2) {
                  descricao = cleanDescription;
                  console.log('✨ DESCRIÇÃO CATEGORIA/PRODUTO EXTRAÍDA:', descricao, 'da mensagem:', msg.content);
                  break;
                }
              }
              
              // 2. FALLBACK: Mensagens com "gastei" mas extrair o produto
              if (msg.content.includes('gastei') || msg.content.includes('comprei') || msg.content.includes('paguei')) {
                const itemMatch = msg.content.match(/(?:gastei|comprei|paguei).*?(?:com|no|na|de|em|para|pro)\s+([a-záêçã\s]+?)(?:\s|$)/i);
                if (itemMatch) {
                  descricao = itemMatch[1].trim();
                  console.log('📝 DESCRIÇÃO EXTRAÍDA:', descricao, 'da mensagem:', msg.content);
                  break;
                }
                // Fallback final: remover palavras de ação
                const fallbackMatch = msg.content
                  .replace(/\d+([.,]\d+)?/g, '') // Remove números
                  .replace(/r\$|reais?/gi, '') // Remove R$ e reais
                  .replace(/\b(gastei|comprei|paguei|foi|com|no|na|de|em|para|pro|um|uma|o|a)\b/gi, '') // Remove palavras de ação
                  .trim();
                if (fallbackMatch && fallbackMatch.length > 3) {
                  descricao = fallbackMatch;
                  console.log('📝 DESCRIÇÃO FALLBACK MELHORADA:', descricao);
                  break;
                }
              }
            }
          }
          
          console.log('🎉 FINALIZANDO GASTO:', valor, dataFormatada);
          
          return {
            response: `Show demais! R$ ${valor.toFixed(2)} do dia ${dataFormatada} registrado! 🎉\n\nGasto salvo com sucesso!\n\nE aí, rolou mais algum gasto que você quer anotar? 😊`,
            extraction: {
              valor: valor,
              categoria: categoria,
              descricao: descricao,
              data: dataISO,
              isValid: true // FINALIZA!
            }
          };
        }
      }
    }
    
    // PRIORITY #3: RESPOSTA NEGATIVA PARA MAIS GASTOS
    const negativeResponses = ['rolou não', 'rolou nao', 'não rolou', 'nao rolou', 'nada', 'sem mais', 'por hoje não', 'hoje não', 'acabou', 'só isso', 'nenhum', 'não tem', 'nao tem'];
    const isNegativeResponse = negativeResponses.some(phrase => currentMessage.includes(phrase)) || 
                              (currentMessage === 'não' || currentMessage === 'nao');
    
    if (isNegativeResponse) {
      const lastBotMessage = [...conversationHistory]
        .reverse()
        .find(msg => msg.type === 'assistant');
      
      if (lastBotMessage && lastBotMessage.content.includes('mais algum gasto')) {
        console.log('❌ RESPOSTA NEGATIVA PARA MAIS GASTOS DETECTADA');
        
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
    
    if (currentMessage.includes('foi dia') && /\d{2}\/\d{2}\/\d{4}/.test(currentMessage)) {
      console.log('📅 DETECTADO: Resposta de data!');
      
      // Buscar qualquer gasto recente no histórico
      const allMessages = [...conversationHistory];
      console.log('📋 TOTAL DE MENSAGENS NO HISTÓRICO:', allMessages.length);
      
      for (let i = allMessages.length - 1; i >= 0; i--) {
        const msg = allMessages[i];
        if (msg.type === 'assistant' && msg.content.includes('R$')) {
          const valorMatch = msg.content.match(/R\$\s*(\d+(?:[.,]\d+)?)/);
          if (valorMatch) {
            console.log('💰 GASTO ENCONTRADO NA MENSAGEM:', msg.content);
            const valor = parseFloat(valorMatch[1].replace(',', '.'));
            
            // Extrair data
            const dataMatch = userMessage.match(/\d{2}\/\d{2}\/\d{4}/);
            if (dataMatch) {
              const dataFormatada = dataMatch[0];
              const partesData = dataFormatada.split('/');
              const dataISO = `${partesData[2]}-${partesData[1].padStart(2, '0')}-${partesData[0].padStart(2, '0')}`;
              
              console.log('✅ PROCESSANDO DATA:', dataFormatada);
              
              return {
                response: `Perfeito! Então foi dia ${dataFormatada}? 📅\n\nR$ ${valor.toFixed(2)} no dia ${dataFormatada}.\n\nResponde "sim" pra confirmar ou "não" se a data tá errada!`,
                extraction: {
                  valor: valor,
                  categoria: 'pendente',
                  descricao: `Confirmando data: ${dataFormatada}`,
                  data: dataISO,
                  isValid: false
                }
              };
            }
          }
        }
      }
      
      console.log('❌ NENHUM GASTO ENCONTRADO NO HISTÓRICO');
    }
    
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

CONEXÃO INTELIGENTE DE VALOR + CATEGORIA:
- Se bot perguntou "em que categoria" e usuário responde com categoria/produto → CONECTE com valor anterior
- Se usuário disse "gastei 1000" e depois "paguei agua e luz" → R$ 1000 em contas (água e luz)
- Se usuário disse "gastei 50" e depois "hambúrguer" → R$ 50 em alimentação (hambúrguer)
- SEMPRE conecte valor de mensagem anterior com categoria de mensagem atual

DETECÇÃO DE CONFIRMAÇÕES:
- Positivas: sim, ta sim, certo, isso mesmo, exato, correto, confirmo, pode ser, tá certo, é isso, isso aí
- Negativas: não, nao, errado, não é isso, tá errado

DETECÇÃO INTELIGENTE DE CATEGORIAS (com sinônimos e abreviações):
- alimentação: comida, almoço, jantar, lanche, restaurante, pizza, hambúrguer, hamburg, hamb, burger, burguer, habburg, churros, churro, mc, mcdonalds, bk, kfc, subway, ifood, delivery, café, bar, bebida, picanha, carne, frango, peixe, feira, açougue, padaria, sanduíche, sanduiche, food, fastfood, churrasco, churrascaria, alimentos, comer, eating, bebidas, suco, refrigerante, cerveja, vinho, água, leite, café, cappuccino
- vestuário: roupa, roupas, camisa, calça, sapato, tênis, blusa, vestido, shorts, jaqueta, casaco, moda, camiseta, polo, social, bermuda, shopping, loja, lojas, magazine, renner, c&a, zara, riachuelo, bolsa, bolsas, sapatos, sneaker, chinelo, sandália, boné, óculos, relógio
- transporte: uber, taxi, gasolina, combustível, posto, ônibus, metrô, trem, passagem, viagem, carro, moto, 99, cabify, aplicativo, transporte, deslocamento, ida, volta, corrida, carona
- mercado: supermercado, compras, mantimentos, feira, mercadinho, atacadão, assaí, carrefour, extra, pão de açúcar, walmart, compra, comprar, shopping, hipermercado
- lazer: cinema, festa, show, teatro, jogo, parque, balada, rolê, diversão, netflix, streaming, spotify, ingresso, entretenimento, passeio, viagem, turismo, clube, academia
- saúde: remédio, médico, farmácia, hospital, dentista, consulta, exame, tratamento, medicamento, drogaria, clínica, laboratório, check-up, fisioterapia
- casa: móvel, sofá, mesa, decoração, limpeza, reforma, casa, lar, móveis, eletrodomésticos, geladeira, fogão, microondas, tv, televisão, cama, colchão
- contas: luz, água, internet, telefone, energia, gás, conta, fatura, boleto, prestação, financiamento, cartão, taxa, iptu, ipva, seguro, agua e luz, água e luz, paguei agua, paguei luz

DETECÇÃO ESPECIAL DE CONEXÃO:
- Se usuário disse valor antes e agora menciona "paguei agua e luz" → CONECTE com valor anterior em categoria "contas"
- Se usuário disse valor antes e agora menciona categoria/produto → CONECTE sempre
- "paguei agua e luz" após "gastei X" = R$ X em contas (água e luz)

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

EXEMPLO CONEXÃO INTELIGENTE:
Usuário: "gastei 1000"
Bot: "Opa, R$ 1000 anotado! Em que categoria?"
Usuário: "paguei agua e luz"
Bot: "Show! Conectei as informações! R$ 1000 em contas (água e luz)! Tá certo?" (CONECTA valor anterior)

EXEMPLO CONEXÃO COM CATEGORIA:
Usuário: "gastei 50"
Bot: "Opa, R$ 50 anotado! Em que categoria?"
Usuário: "cinema"
Bot: "Show! R$ 50 no cinema! Tá certo?" (CONECTA valor anterior)

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
      
      // SISTEMA DE CONFIRMAÇÃO (PRIORITY #1)
      const currentMessage = userMessage.toLowerCase();
      const confirmationWords = ['sim', 'ta sim', 'tá sim', 'certo', 'isso mesmo', 'exato', 'correto', 'confirmo', 'pode ser', 'tá certo', 'é isso', 'isso aí', 'ta certo'];
      const isConfirmation = confirmationWords.some(word => currentMessage.includes(word));
      
      console.log(`❓ Verificando confirmação para: "${userMessage}"`);
      console.log(`✅ É confirmação? ${isConfirmation}`);
      
      if (isConfirmation) {
        // Buscar a última mensagem do bot que pediu confirmação
        const botMessages = conversationHistory.filter(msg => msg.type === 'assistant');
        const lastBotMessage = botMessages[botMessages.length - 1];
        
        console.log(`🤖 Última mensagem do bot: "${lastBotMessage?.content}"`);
        
        if (lastBotMessage && lastBotMessage.content.includes('Tá certo?')) {
          // Extrair valor e categoria da mensagem do bot
          const valorMatch = lastBotMessage.content.match(/R\$\s*(\d+(?:[.,]\d+)?)/);
          const categoriaMatch = lastBotMessage.content.match(/em\s+([a-záêçã]+(?:\s+[a-záêçã]+)*?)(?:\s+(?:confirmado|registrado|anotado)|[^\w\sá-ú]|$)/i);
          
          console.log(`💰 Valor extraído: ${valorMatch?.[1]}`);
          console.log(`🏷️ Categoria extraída: ${categoriaMatch?.[1]}`);
          
          if (valorMatch && categoriaMatch) {
            const valor = parseFloat(valorMatch[1].replace(',', '.'));
            let categoria = categoriaMatch[1].toLowerCase();
            
            // 🔥 EXTRAÇÃO INTELIGENTE DA DESCRIÇÃO
            let descricao = 'Gasto registrado';
            
            // 1. PRIORIDADE: Buscar nas mensagens do usuário que mencionaram categoria/produto
            for (let i = conversationHistory.length - 1; i >= 0; i--) {
              const msg = conversationHistory[i];
              if (msg.type === 'user' && !msg.content.includes('gastei') && !msg.content.includes('sim') && !msg.content.includes('não')) {
                // Esta é provavelmente a mensagem com a categoria/produto
                const cleanDescription = msg.content
                  .replace(/\d+([.,]\d+)?/g, '') // Remove números
                  .replace(/r\$|reais?/gi, '') // Remove R$ e reais
                  .replace(/\b(gastei|comprei|paguei|foi|com|no|na|de|em|para|pro|um|uma|o|a|esse|essa|isso)\b/gi, '') // Remove palavras de ação
                  .trim();
                
                if (cleanDescription && cleanDescription.length > 2) {
                  descricao = cleanDescription;
                  console.log('✨ DESCRIÇÃO INTELIGENTE EXTRAÍDA:', descricao, 'da mensagem:', msg.content);
                  break;
                }
              }
            }
            
            // Mapear categorias corretamente
            console.log(`🔧 Categoria original detectada: "${categoria}"`);
            
            // Validar se é uma categoria válida ou mapear para a correta
            const validCategories = ['tecnologia', 'alimentação', 'vestuário', 'transporte', 'mercado', 'lazer', 'saúde', 'casa', 'contas', 'educação', 'beleza', 'pets'];
            
            if (!validCategories.includes(categoria)) {
              // Mapear para categoria correta
              if (categoria.includes('aliment') || categoria.includes('hamburg') || categoria.includes('comida')) {
                categoria = 'alimentação';
              } else if (categoria.includes('tecnolog') || categoria.includes('computador')) {
                categoria = 'tecnologia';
              } else if (categoria.includes('pet') || categoria.includes('veterinar')) {
                categoria = 'pets';
              } else {
                categoria = 'outros';
              }
            }
            
            console.log(`🎉 CONFIRMAÇÃO PROCESSADA: R$ ${valor} em ${categoria} - ${descricao}`);
            
            // NOVO FLUXO: Perguntar sobre a data
            const hoje = formatBrazilDate(getBrazilDate());
            
            return {
              response: `Show! R$ ${valor.toFixed(2)} em ${categoria} confirmado! 👍\n\n📅 Esse gasto foi hoje (${hoje})?\n\nResponde "sim" se foi hoje ou "não" se foi outro dia!`,
              extraction: {
                valor: valor,
                categoria: categoria,
                descricao: descricao, // 🔥 AGORA COM A DESCRIÇÃO CORRETA!
                data: '', // Vazio até confirmar data
                isValid: false // Ainda não finalizado
              }
            };
          }
        }
        
        // NOVO: Detectar negativa para data "hoje" - quando não foi hoje
        
        // DETECÇÃO ROBUSTA DE DATA: Se a mensagem for "foi dia DD/MM/YYYY", buscar gasto pendente no histórico
        if (/^foi dia \d{2}\/\d{2}\/\d{4}$/.test(currentMessage.trim())) {
          console.log('🔍 DETECTADO: Resposta de data no formato correto');
          
          // Buscar qualquer mensagem recente do bot que contenha valor e categoria
          const recentBotMessages = [...conversationHistory]
            .reverse()
            .filter(msg => msg.type === 'assistant')
            .slice(0, 10); // Últimas 10 mensagens do bot
          
          let gastoEncontrado = null;
          
          for (const botMsg of recentBotMessages) {
            const valorMatch = botMsg.content.match(/R\$\s*(\d+(?:[.,]\d+)?)/);
            const categoriaMatch = botMsg.content.match(/\b(alimentação|vestuário|transporte|mercado|lazer|saúde|casa|contas|educação|beleza|pets|tecnologia|outros)\b/i);
            
            if (valorMatch && categoriaMatch) {
              gastoEncontrado = {
                valor: parseFloat(valorMatch[1].replace(',', '.')),
                categoria: categoriaMatch[1].toLowerCase(),
                botMessage: botMsg.content
              };
              console.log('💰 GASTO ENCONTRADO:', gastoEncontrado);
              break;
            }
          }
          
          if (gastoEncontrado) {
            // Extrair a data da mensagem do usuário
            const dataMatch = currentMessage.match(/\d{2}\/\d{2}\/\d{4}/);
            if (dataMatch) {
              const dataFormatada = dataMatch[0];
              const partesData = dataFormatada.split('/');
              const dataISO = `${partesData[2]}-${partesData[1].padStart(2, '0')}-${partesData[0].padStart(2, '0')}`;
              
              console.log('✅ PROCESSANDO DATA:', dataFormatada, 'ISO:', dataISO);
              
              return {
                response: `Perfeito! Então foi dia ${dataFormatada}? 📅\n\nR$ ${gastoEncontrado.valor.toFixed(2)} em ${gastoEncontrado.categoria} no dia ${dataFormatada}.\n\nResponde "sim" pra confirmar ou "não" se a data tá errada!`,
                extraction: {
                  valor: gastoEncontrado.valor,
                  categoria: gastoEncontrado.categoria,
                  descricao: `Confirmando data: ${dataFormatada}`,
                  data: dataISO,
                  isValid: false // Aguardando confirmação final
                }
              };
            }
          } else {
            console.log('❌ NENHUM GASTO PENDENTE ENCONTRADO NO HISTÓRICO');
          }
        }
      }
      
      // DETECÇÃO ESPECÍFICA: "Não foi hoje" (PRIORITY #2 - ANTES DE DETECTAR NEGATIVAS GERAIS)
      const botMessages = conversationHistory.filter(msg => msg.type === 'assistant');
      const lastBotMessage = botMessages[botMessages.length - 1];
      
      // Torna a detecção de 'foi hoje' mais robusta (ignora acentos e variações)
      function normalize(str) {
        return str
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, ''); // Remove apenas acentos
      }
      if (
        lastBotMessage &&
        normalize(lastBotMessage.content).includes('foi hoje') &&
        normalize(currentMessage).includes('nao')
      ) {
        console.log(`📅 DETECTADO: Usuário disse que NÃO foi hoje`);
        // Buscar dados do gasto pendente na mensagem do bot
        const valorMatch = lastBotMessage.content.match(/R\$\s*(\d+(?:[.,]\d+)?)/);
        const categoriaMatch = lastBotMessage.content.match(/em\s+([a-záêçã]+(?:\s+[a-záêçã]+)*?)(?:\s+(?:confirmado|registrado|anotado)|[^\w\sá-ú]|$)/i);
        if (valorMatch && categoriaMatch) {
          const valor = parseFloat(valorMatch[1].replace(',', '.'));
          const categoria = categoriaMatch[1].toLowerCase();
          console.log(`📅 PROCESSANDO: R$ ${valor} em ${categoria} - perguntando data específica`);
          return {
            response: `Beleza! Então quando foi esse gasto de R$ ${valor.toFixed(2)} em ${categoria}? 📅\n\nMe fala a data: "foi ontem", "foi dia 15/12" ou "foi segunda-feira"!`,
            extraction: {
              valor: valor,
              categoria: categoria,
              descricao: `Aguardando data específica`,
              data: '', // Vazio até confirmar data
              isValid: false
            }
          };
        }
      }
      
      // DETECÇÃO DE RESPOSTAS NEGATIVAS (não tem mais gastos)
      const negativeWords = ['não', 'nada', 'sem mais', 'rolou não', 'não rolou', 'por hoje não', 'hoje não', 'acabou', 'só isso', 'nenhum'];
      const isNegative = negativeWords.some(word => currentMessage.includes(word)) && !currentMessage.includes('última') && !currentMessage.includes('gastei') && !conversationHistory.some(msg => msg.content && msg.content.includes('foi hoje'));
      
      console.log(`❌ Verificando negativa para: "${userMessage}"`);
      console.log(`❌ É negativa? ${isNegative}`);
      
      if (isNegative) {
        // Verificar se a pergunta anterior foi sobre mais gastos
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
      

      
      // DETECÇÃO DE CONFIRMAÇÕES CONVERSACIONAIS (respostas positivas após saudação)
      const conversationalWords = ['vamos', 'bora', 'ok', 'beleza', 'claro', 'dale', 'show', 'massa', 'vamo', 'bora lá', 'pode ser', 'tranquilo', 'fechou'];
      const isConversational = conversationalWords.some(word => currentMessage.includes(word)) && !isConfirmation;
      
      console.log(`💬 Verificando resposta conversacional para: "${userMessage}"`);
      console.log(`💬 É conversacional? ${isConversational}`);
      
      if (isConversational) {
        // Verificar se a mensagem anterior do bot foi uma saudação OU pergunta sobre mais gastos
        const botMessages = conversationHistory.filter(msg => msg.type === 'assistant');
        const lastBotMessage = botMessages[botMessages.length - 1];
        
        console.log(`🤖 Última mensagem do bot para conversacional: "${lastBotMessage?.content}"`);
        
        // Check if bot was asking about expenses, greeting, or asking for more expenses
        if (lastBotMessage && (
          lastBotMessage.content.includes('Pronto pra anotar') || 
          lastBotMessage.content.includes('Vamos registrar') ||
          lastBotMessage.content.includes('mais algum gasto') ||
          lastBotMessage.content.includes('organizar as finanças') ||
          lastBotMessage.content.includes('anotar uns gastos') ||
          lastBotMessage.content.includes('Bora organizar') ||
          lastBotMessage.content.includes('Show de bola') ||
          lastBotMessage.content.includes('Fala aí qualquer gasto') ||
          lastBotMessage.content.includes('💰') // Any message with money emoji is likely asking for expenses
        )) {
          console.log(`✅ CONVERSACIONAL DETECTADO - retornando resposta apropriada`);
          
          const readyResponses = [
            'Beleza! Tô aqui pra ajudar a organizar suas finanças! Fala aí, já teve algum gasto que você quer anotar? Pode ser qualquer coisa, tipo "gastei R$ 100 na internet" ou "gastei R$ 50 no cinema"! 🎉',
            'Show! 🎉 Então me fala aí, qual foi o último gasto que você fez? Pode ser qualquer coisa: comida, roupa, transporte... 💰',
            'Massa! 😊 Vamos lá então! Me conta, gastou com o quê hoje? Almoço? Uber? Compras? 🛒',
            'Dahora! 🚀 Bora anotar! Qual foi a última vez que você abriu a carteira? Me fala aí! 💳',
            'Top! 🔥 Perfeito! Então me conta: qual foi o gasto mais recente? Pode ser desde um café até uma compra maior! ☕💸',
            'Beleza! 🤙 Vamos organizar essas finanças! Me fala qualquer gasto que você lembra... o que rolou? 📊'
          ];
          
          const randomResponse = readyResponses[Math.floor(Math.random() * readyResponses.length)];
          
          return {
            response: randomResponse,
            extraction: {
              valor: 0,
              categoria: '',
              descricao: '',
              data: new Date().toISOString().split('T')[0],
              isValid: false
            }
          };
        } else {
          console.log(`❌ CONVERSACIONAL não correspondeu ao contexto esperado`);
        }
      }
      
      // DETECÇÃO DE CONVERSAS VAGAS (quando não entende o contexto)
      const vagueWords = ['sim', 'não', 'ok', 'certo', 'talvez', 'pode ser'];
      const isVague = vagueWords.some(word => currentMessage === word.toLowerCase()) && !isConfirmation;
      
      if (isVague) {
        const helpResponses = [
          'Hmm, não entendi muito bem... 🤔 Você quer anotar algum gasto? Me fala tipo: "gastei R$ 30 no almoço"! 🍽️',
          'Opa, ficou meio vago aí! 😅 Tá querendo registrar alguma despesa? Fala aí: "comprei uma camisa por R$ 80"! 👕',
          'Não tô sacando... 🧐 Bora ser mais específico? Me conta algum gasto: "paguei R$ 15 no uber"! 🚗',
          'Meio confuso aqui! 😵 Você gastou alguma coisa que quer anotar? Tipo: "gastei R$ 50 no mercado"! 🛒'
        ];
        
        const randomResponse = helpResponses[Math.floor(Math.random() * helpResponses.length)];
        
        return {
          response: randomResponse,
          extraction: {
            valor: 0,
            categoria: '',
            descricao: '',
            data: new Date().toISOString().split('T')[0],
            isValid: false
          }
        };
      }
      
      // DETECÇÃO DE CONSULTAS DE RELATÓRIO/HISTÓRICO (PRIORITY #2)
      const reportWords = ['quanto gastei', 'gastos', 'total', 'semana', 'mês', 'mes', 'hoje', 'ontem', 'relatório', 'relatrio', 'histórico', 'historico', 'resumo', 'balanço', 'balanco', 'última semana', 'ultimo mes', 'gasto total', 'quanto foi'];
      const isReportQuery = reportWords.some(word => currentMessage.includes(word));
      
      // VERIFICAR SE NÃO ESTÁ NO MEIO DE UM FLUXO DE CADASTRO DE GASTO
      const allBotMessages = conversationHistory.filter(msg => msg.type === 'assistant');
      const mostRecentBotMessage = allBotMessages[allBotMessages.length - 1];
      const isInExpenseFlow = mostRecentBotMessage && (
        mostRecentBotMessage.content.includes('quando foi esse gasto') ||
        mostRecentBotMessage.content.includes('foi hoje') ||
        mostRecentBotMessage.content.includes('Tá certo?') ||
        mostRecentBotMessage.content.includes('Em que categoria')
      );
      
      console.log(`📊 Verificando consulta de relatório para: "${userMessage}"`);
      console.log(`📊 É consulta de relatório? ${isReportQuery}`);
      console.log(`📊 Está em fluxo de gasto? ${isInExpenseFlow}`);
      
      if (isReportQuery && userId && !isInExpenseFlow) {
        console.log(`📊 Executando consulta de relatório para usuário: ${userId}`);
        
        try {
          // Buscar todos os gastos do usuário
          const userExpenses = await database.getExpensesByUser(userId);
          console.log(`📋 Total de gastos encontrados: ${userExpenses.length}`);
          
          // Detectar período solicitado
          let periodo = 'total';
          let startDate = new Date('2000-01-01'); // Data muito antiga para incluir tudo
          let endDate = new Date();
          
          if (currentMessage.includes('semana') || currentMessage.includes('última semana')) {
            periodo = 'última semana';
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
          } else if (currentMessage.includes('mês') || currentMessage.includes('mes') || currentMessage.includes('último mês')) {
            periodo = 'último mês';
            startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 1);
          } else if (currentMessage.includes('hoje')) {
            periodo = 'hoje';
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
          } else if (currentMessage.includes('ontem')) {
            periodo = 'ontem';
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date();
            endDate.setDate(endDate.getDate() - 1);
            endDate.setHours(23, 59, 59, 999);
          }
          
          // Filtrar gastos por período
          const filteredExpenses = userExpenses.filter(expense => {
            const expenseDate = new Date(expense.data);
            return expenseDate >= startDate && expenseDate <= endDate;
          });
          
          console.log(`📅 Período: ${periodo}`);
          console.log(`📅 Data início: ${startDate.toISOString()}`);
          console.log(`📅 Data fim: ${endDate.toISOString()}`);
          console.log(`📅 Gastos filtrados para ${periodo}: ${filteredExpenses.length}`);
          console.log(`📋 Todos os gastos do usuário:`, userExpenses.map(e => ({ data: e.data, valor: e.valor, categoria: e.categoria })));
          console.log(`📋 Gastos filtrados:`, filteredExpenses.map(e => ({ data: e.data, valor: e.valor, categoria: e.categoria })));
          
          if (filteredExpenses.length === 0) {
            const motivadores = ['Beleza!', 'Tranquilo!', 'Show!', 'Massa!'];
            const motivador = motivadores[Math.floor(Math.random() * motivadores.length)];
            
            return {
              response: `${motivador} Não achei gastos ${periodo === 'total' ? 'registrados ainda' : `da ${periodo}`}! 🤷‍♂️\n\n💡 Bora começar? Fala aí qualquer gasto: "gastei R$ 50 no almoço" ou "paguei R$ 30 no uber"!\n\n✨ Quanto mais você registrar, melhor vou te ajudar a controlar as finanças! 😊`,
              extraction: {
                valor: 0,
                categoria: '',
                descricao: `Consulta sem gastos: ${periodo}`,
                data: new Date().toISOString().split('T')[0],
                isValid: false
              }
            };
          }
          
          // Calcular total geral
          const totalGeral = filteredExpenses.reduce((sum, expense) => sum + expense.valor, 0);
          
          // Agrupar por categoria
          const porCategoria: { [key: string]: number } = {};
          filteredExpenses.forEach(expense => {
            porCategoria[expense.categoria] = (porCategoria[expense.categoria] || 0) + expense.valor;
          });
          
          // Ordenar categorias por valor (maior primeiro)
          const categoriasOrdenadas = Object.entries(porCategoria)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5); // Top 5 categorias
          
          // Emojis para categorias
          const categoryEmojis: {[key: string]: string} = {
            'alimentação': '🍽️',
            'vestuário': '👕',
            'transporte': '🚗',
            'tecnologia': '💻',
            'mercado': '🛒',
            'lazer': '🎉',
            'saúde': '🏥',
            'casa': '🏠',
            'contas': '💡',
            'educação': '📚',
            'beleza': '💅',
            'pets': '🐕',
            'outros': '💰'
          };
          
          // Montar resposta com visual bonito e organizado
          const saudacoes = ['Show de bola!', 'Massa!', 'Mandou bem!', 'Top demais!', 'Dahora!'];
          const saudacao = saudacoes[Math.floor(Math.random() * saudacoes.length)];
          
          let resposta = `${saudacao} Aqui está o que você gastou ${periodo === 'última semana' ? 'na última semana' : periodo === 'último mês' ? 'no último mês' : periodo === 'hoje' ? 'hoje' : periodo === 'ontem' ? 'ontem' : 'no total'}!\n\n`;
          
          resposta += `💰 TOTAL GASTO: R$ ${totalGeral.toFixed(2)}\n`;
          resposta += `📋 TRANSAÇÕES: ${filteredExpenses.length} gastos registrados\n\n`;
          
          if (categoriasOrdenadas.length > 0) {
            resposta += `🎯 RANKING POR CATEGORIA:\n`;
            categoriasOrdenadas.forEach(([categoria, valor], index) => {
              const emoji = categoryEmojis[categoria] || '💰';
              const percentual = ((valor / totalGeral) * 100).toFixed(1);
              const posicao = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`;
              resposta += `${posicao} ${emoji} ${categoria.toUpperCase()} - R$ ${valor.toFixed(2)} • ${percentual}%\n`;
            });
            resposta += `\n`;
          }
          
          // Adicionar comentários personalizados baseados nos gastos
          resposta += `💭 ANÁLISE: `;
          if (totalGeral > 1000) {
            resposta += `Eita! Gastou uma grana boa aí! Mas tranquilo, o importante é ter controle! 😎\n\n`;
          } else if (totalGeral > 500) {
            resposta += `Beleza! Gastos na medida, tá controlando direitinho! 😊\n\n`;
          } else if (totalGeral > 100) {
            resposta += `Show! Gastinhos bem controlados, parabéns! 🎉\n\n`;
          } else {
            resposta += `Top! Super econômico, mandou muito bem! 💪\n\n`;
          }
          
          resposta += `🚀 DICA: No Dashboard tem gráficos maneiros pra ver tudo detalhado!`;
          
          return {
            response: resposta,
            extraction: {
              valor: totalGeral,
              categoria: '',
              descricao: `Relatório ${periodo}: R$ ${totalGeral.toFixed(2)}`,
              data: new Date().toISOString().split('T')[0],
              isValid: false
            }
          };
          
        } catch (error) {
          console.error('Erro ao gerar relatório:', error);
          return {
            response: `😅 Eita! Deu um perrengue aqui ao buscar seus gastos... Tenta de novo em alguns segundos!\n\n💡 Ou vai direto no Dashboard que lá funciona certinho! 📊`,
            extraction: {
              valor: 0,
              categoria: '',
              descricao: `Erro ao consultar relatório`,
              data: new Date().toISOString().split('T')[0],
              isValid: false
            }
          };
        }
      } else if (isReportQuery && !userId) {
        return {
          response: `🤖 **ERRO TÉCNICO**\n\nDetectei que você quer ver seus gastos, mas houve um problema de autenticação!\n\n🔧 **Tente**:\n1. Recarregar a página\n2. Fazer login novamente\n3. Ou usar o Dashboard no menu`,
          extraction: {
            valor: 0,
            categoria: '',
            descricao: `Consulta sem userId`,
            data: new Date().toISOString().split('T')[0],
            isValid: false
          }
        };
      }
      
      // DETECÇÃO DE INTENÇÃO DE GASTO (antes da análise local)
      const expenseIntentWords = ['gastei', 'gasto', 'comprei', 'paguei', 'saiu', 'foi', 'dinheiro', 'real', 'reais'];
      const hasExpenseIntent = expenseIntentWords.some(word => currentMessage.includes(word)) && !isThankYou;
      
      console.log(`💡 Verificando intenção de gasto para: "${userMessage}"`);
      console.log(`💡 Tem intenção de gasto? ${hasExpenseIntent}`);
      
      if (hasExpenseIntent) {
        // Se detectou intenção de gasto mas não tem valor específico, perguntar
        const numberMatch = userMessage.match(/\d+(?:[.,]\d+)?/);
        if (!numberMatch) {
          const helpfulResponses = [
            'Opa! Vi que você gastou! 💰 Me conta quanto foi? Tipo: "gastei R$ 100" ou "foram R$ 50"!',
            'Show! Rolou um gasto aí! 😊 Qual foi o valor? Me fala tipo: "saiu R$ 80" ou "gastei R$ 30"!',
            'Beleza! Então você gastou hoje! 🤑 Quanto que foi? Pode ser: "paguei R$ 25" ou "foram R$ 60"!',
            'Massa! Vamos anotar esse gasto! 📝 Me diz o valor: "gastei R$ 40" ou "saiu R$ 90"!',
            'Top! Vi que rolou uma despesa! 💸 Qual foi a quantia? Tipo: "gastei R$ 15" ou "paguei R$ 120"!'
          ];
          
          const randomResponse = helpfulResponses[Math.floor(Math.random() * helpfulResponses.length)];
          
          return {
            response: randomResponse,
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
      
      // ANÁLISE LOCAL INTELIGENTE (BACKUP SYSTEM) - SÓ RODA SE NÃO FOR CONFIRMAÇÃO, NEGATIVA, SAUDAÇÃO OU CONVERSACIONAL
      console.log('🔧 INICIANDO ANÁLISE LOCAL...');
      console.log('📝 Mensagem do usuário:', userMessage);
      
      let valor = 0;
      let categoria = '';
      
      // Buscar valor na mensagem atual ou histórico
      const numberMatch = userMessage.match(/\d+(?:[.,]\d+)?/);
      if (numberMatch) {
        valor = parseFloat(numberMatch[0].replace(',', '.'));
        console.log(`💰 VALOR ENCONTRADO na mensagem atual: R$ ${valor}`);
        
        // Se encontrou valor na mensagem atual, RESETAR contexto - é um novo gasto!
        console.log('🔄 NOVO GASTO DETECTADO - resetando contexto de categoria');
        
      } else {
        // Buscar nas mensagens anteriores SOMENTE se não há valor na mensagem atual
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
        
        // LÓGICA ESPECIAL: Se bot perguntou sobre categoria e não há valor na mensagem atual
        const botMessages = conversationHistory.filter(msg => msg.type === 'assistant');
        const lastBotMessage = botMessages[botMessages.length - 1];
        
        if (lastBotMessage && lastBotMessage.content.includes('em que categoria rolou esse gasto')) {
          console.log(`🎯 BOT PERGUNTOU CATEGORIA - analisando resposta de categoria`);
          // Usuário está respondendo sobre categoria, não precisa de valor na mensagem atual
        }
      }
      
      // Buscar categoria SOMENTE na mensagem atual se há valor na mensagem atual
      // OU no histórico completo se o valor veio do histórico
      let textToAnalyze = '';
      
      if (numberMatch) {
        // Valor na mensagem atual = analisar APENAS a mensagem atual para categoria
        textToAnalyze = userMessage.toLowerCase();
        console.log(`🏷️ Analisando APENAS mensagem atual: "${textToAnalyze}"`);
      } else {
        // Valor do histórico = pode analisar histórico completo
        textToAnalyze = (conversationHistory.filter(msg => msg.type === 'user').map(m => m.content).join(' ') + ' ' + userMessage).toLowerCase();
        console.log(`🏷️ Analisando histórico completo: "${textToAnalyze}"`);
      }
      
      const categoryMap = {
        'alimentação': [
          // Comidas específicas - incluindo churrasco
          'churrasco', 'churras', 'bbq', 'picanha', 'carne', 'frango', 'porco', 'linguiça', 'costela', 'alcatra',
          'comida', 'almoço', 'jantar', 'lanche', 'café', 'refeição', 'pizza', 'hambúrguer', 'hamburg', 'burger', 'churros', 'açaí', 'sorvete', 'doce', 'bolo', 'sanduíche', 'pão', 'biscoito', 'chocolate', 'peixe', 'salada', 'sopa', 'macarrão', 'arroz', 'feijão', 'batata', 'ovo', 'queijo', 'presunto', 'frutas', 'verduras', 'legumes',
          // Bebidas  
          'bebida', 'água', 'refrigerante', 'suco', 'cerveja', 'vinho', 'caipirinha', 'drink', 'whisky', 'vodka', 'energético', 'isotônico', 'leite', 'café', 'cappuccino', 'expresso',
          // Restaurantes e locais
          'restaurante', 'bar', 'lanchonete', 'padaria', 'açougue', 'pizzaria', 'churrascaria', 'fast-food', 'delivery', 'ifood', 'mcdonalds', 'bk', 'subway', 'kfc', 'dominos', 'outback', 'giraffas'
        ],
        'tecnologia': [
          // Dispositivos
          'computador', 'notebook', 'pc', 'desktop', 'mac', 'macbook', 'celular', 'smartphone', 'iphone', 'samsung', 'motorola', 'lg', 'xiaomi', 'tablet', 'ipad', 'tv', 'televisão', 'monitor', 'smartwatch', 'relógio',
          // Acessórios
          'mouse', 'teclado', 'fone', 'headset', 'carregador', 'cabo', 'adaptador', 'powerbank', 'capinha', 'película', 'suporte',
          // Games e entretenimento
          'playstation', 'xbox', 'nintendo', 'switch', 'ps5', 'ps4', 'jogo', 'game', 'controle', 'headphone',
          // Software e serviços
          'software', 'aplicativo', 'netflix', 'spotify', 'amazon', 'google', 'microsoft', 'adobe', 'steam'
        ],
        'vestuário': [
          // Roupas básicas
          'roupa', 'camisa', 'camiseta', 'polo', 'blusa', 'regata', 'calça', 'jeans', 'shorts', 'bermuda', 'vestido', 'saia', 'casaco', 'jaqueta', 'blazer', 'suéter', 'moletom', 'pijama',
          // Calçados
          'sapato', 'tênis', 'sandália', 'chinelo', 'bota', 'sapatilha', 'scarpin', 'salto', 'all-star', 'nike', 'adidas', 'havaianas',
          // Acessórios e íntimos
          'meia', 'cueca', 'calcinha', 'sutiã', 'cinto', 'bolsa', 'carteira', 'mochila', 'óculos', 'relógio', 'colar', 'pulseira', 'anel', 'brinco', 'chapéu', 'boné', 'lenço'
        ],
        'transporte': [
          // Transporte público e privado
          'uber', 'taxi', '99', 'cabify', 'ônibus', 'metrô', 'trem', 'avião', 'passagem', 'viagem', 'pedágio', 'estacionamento', 'valet',
          // Veículos
          'carro', 'moto', 'bicicleta', 'bike', 'patinete', 'scooter',
          // Combustível e manutenção
          'gasolina', 'álcool', 'diesel', 'combustível', 'posto', 'shell', 'petrobras', 'ipiranga', 'ale', 'conserto', 'manutenção', 'mecânico', 'oficina', 'pneu', 'óleo', 'revisão', 'lavagem', 'seguro', 'ipva', 'licenciamento', 'multa'
        ],
        'casa': [
          // Móveis
          'móvel', 'sofá', 'mesa', 'cadeira', 'cama', 'guarda-roupa', 'armário', 'estante', 'rack', 'cômoda', 'poltrona', 'banqueta', 'escrivaninha',
          // Decoração
          'decoração', 'quadro', 'espelho', 'vaso', 'planta', 'cortina', 'tapete', 'almofada', 'luminária', 'abajur',
          // Utensílios e eletrodomésticos
          'panela', 'frigideira', 'prato', 'copo', 'talheres', 'microondas', 'geladeira', 'fogão', 'liquidificador', 'batedeira', 'aspirador', 'ferro', 'ventilador', 'ar-condicionado',
          // Reforma e manutenção
          'reforma', 'pintura', 'tinta', 'pedreiro', 'eletricista', 'encanador', 'azulejo', 'piso', 'porta', 'janela', 'fechadura',
          // Limpeza
          'limpeza', 'detergente', 'sabão', 'desinfetante', 'vassoura', 'rodo', 'pano', 'esponja', 'produto'
        ],
        'saúde': [
          // Medicamentos
          'remédio', 'medicamento', 'vitamina', 'suplemento', 'antibiótico', 'analgésico', 'dipirona', 'paracetamol', 'ibuprofeno',
          // Profissionais
          'médico', 'dentista', 'psicólogo', 'fisioterapeuta', 'nutricionista', 'dermatologista', 'cardiologista', 'ginecologista',
          // Locais e procedimentos
          'hospital', 'clínica', 'farmácia', 'drogaria', 'consulta', 'exame', 'raio-x', 'ultrassom', 'cirurgia', 'tratamento', 'terapia', 'vacina', 'óculos', 'lente'
        ],
        'lazer': [
          // Entretenimento
          'cinema', 'filme', 'teatro', 'show', 'concerto', 'festa', 'balada', 'bar', 'clube', 'parque', 'zoológico', 'aquário', 'museu',
          // Esportes e atividades
          'academia', 'natação', 'futebol', 'tênis', 'golf', 'surf', 'skate', 'bike', 'corrida', 'caminhada', 'yoga', 'pilates',
          // Hobbies
          'livro', 'revista', 'jornal', 'jogo', 'quebra-cabeça', 'pintura', 'desenho', 'artesanato', 'música', 'instrumento',
          // Viagens
          'viagem', 'hotel', 'pousada', 'resort', 'turismo', 'excursão', 'cruzeiro'
        ],
        'educação': [
          'curso', 'faculdade', 'universidade', 'escola', 'colégio', 'aula', 'professor', 'tutor', 'livro', 'apostila', 'material', 'caderno', 'caneta', 'lápis', 'mochila', 'estojo', 'calculadora', 'mensalidade', 'matrícula', 'formatura', 'diploma'
        ],
        'beleza': [
          'salão', 'cabelo', 'corte', 'escova', 'pintura', 'luzes', 'alisamento', 'unha', 'manicure', 'pedicure', 'sobrancelha', 'depilação', 'massagem', 'facial', 'limpeza', 'hidratação', 'maquiagem', 'perfume', 'creme', 'shampoo', 'condicionador', 'batom', 'base', 'rímel', 'esmalte'
        ],
        'pets': [
          'veterinário', 'ração', 'petshop', 'vacina', 'consulta', 'banho', 'tosa', 'coleira', 'brinquedo', 'casinha', 'cama', 'comedouro', 'bebedouro', 'remédio', 'cachorro', 'gato', 'pássaro', 'peixe', 'hamster'
        ],
        'mercado': [
          'mercado', 'supermercado', 'hipermercado', 'compras', 'mantimentos', 'feira', 'hortifruti', 'atacadão', 'extra', 'carrefour', 'pão-de-açúcar', 'walmart', 'assaí', 'sam'
        ],
        'contas': [
          'luz', 'energia', 'elétrica', 'água', 'saneamento', 'internet', 'wifi', 'telefone', 'celular', 'gás', 'condomínio', 'aluguel', 'iptu', 'financiamento', 'empréstimo', 'cartão', 'fatura', 'boleto', 'conta'
        ]
      };
      
      for (const [cat, words] of Object.entries(categoryMap)) {
        const found = words.find(word => textToAnalyze.includes(word));
        if (found) {
          categoria = cat;
          console.log(`🎯 CATEGORIA ENCONTRADA: ${categoria} (palavra: ${found}) em texto: "${textToAnalyze}"`);
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
            const categoria = 'outros';
            
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
            const categoriaMatch = lastBotMessage.content.match(/em\s+([a-záêçã]+(?:\s+[a-záêçã]+)*?)(?:\s+(?:confirmado|registrado|anotado)|[^\w\sá-ú]|$)/i);
            
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
            'vestuário': ['camisa', 'calça', 'sapato', 'tênis', 'roupa', 'roupas', 'blusa', 'vestido', 'shorts', 'moda', 'camiseta', 'polo', 'social', 'jaqueta', 'casaco', 'shopping', 'loja', 'lojas', 'magazine', 'boutique', 'renner', 'c&a', 'zara', 'riachuelo', 'marisa', 'hering', 'bolsa', 'bolsas', 'carteira', 'sapatos', 'sneaker', 'chinelo', 'sandália', 'sandalia', 'boné', 'bone', 'chapéu', 'óculos', 'oculos', 'relógio', 'relogio', 'cinto', 'bermuda', 'jeans', 'all star', 'havaianas', 'bota', 'cueca', 'calcinha', 'meia', 'meias'],
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
          // Usar apenas as últimas 3 mensagens para contexto, não toda a conversa
          const recentMessages = conversationHistory.slice(-3).map(m => m.content).join(' ') + ' ' + userMessage;
          const fullContext = recentMessages.toLowerCase();
          
          const categoryMappings = {
            'vestuário': ['camisa', 'calça', 'sapato', 'tênis', 'roupa', 'roupas', 'blusa', 'vestido', 'shorts', 'moda', 'camiseta', 'polo', 'social', 'jaqueta', 'casaco', 'shopping', 'loja', 'lojas', 'magazine', 'boutique', 'renner', 'c&a', 'zara', 'riachuelo', 'marisa', 'hering', 'bolsa', 'bolsas', 'carteira', 'sapatos', 'sneaker', 'chinelo', 'sandália', 'sandalia', 'boné', 'bone', 'chapéu', 'óculos', 'oculos', 'relógio', 'relogio', 'cinto', 'bermuda', 'jeans', 'all star', 'havaianas', 'bota', 'cueca', 'calcinha', 'meia', 'meias'],
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
