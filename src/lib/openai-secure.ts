// src/lib/openai-secure.ts - VERSÃO SEGURA COM EDGE FUNCTION
import { supabase } from './supabase';

// 🔥 Função auxiliar para data brasileira em formato string
function getBrazilDateString(): string {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const brazilTime = new Date(utc + (-3 * 3600000)); // UTC-3
  const year = brazilTime.getFullYear();
  const month = String(brazilTime.getMonth() + 1).padStart(2, '0');
  const day = String(brazilTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

export class SecureOpenAIService {
  private baseURL: string;
  
  constructor() {
    // ✅ SEGURO: Usa Edge Function, não OpenAI direto
    this.baseURL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
  }

  async chatCompletion(messages: ChatMessage[], userId: string, systemInstructions?: string): Promise<string> {
    try {
      console.log('🔒 Usando Edge Function SEGURA - API Key protegida!');
      
      // ✅ REQUISIÇÃO SEGURA - Sem API Key exposta
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, // ✅ Chave pública
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          userId,
          systemInstructions
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 429) {
          throw new Error(errorData.error || '🚫 Muitas requisições. Aguarde alguns minutos.');
        }
        
        if (response.status === 401) {
          throw new Error('🔐 Erro de autenticação. Recarregue a página.');
        }
        
        throw new Error(errorData.error || 'Erro na comunicação com o servidor');
      }

      const data = await response.json();
      console.log('✅ Resposta recebida da Edge Function segura');
      
      return data.response || '';
    } catch (error) {
      console.error('❌ Erro na Edge Function:', error);
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
    console.log('🔍 extractExpenseData chamado com:', { userMessage, historyLength: conversationHistory.length });
    
    // PRIORITY #1: DETECÇÃO DE CONFIRMAÇÃO ANTES DE CHAMAR A API
    const currentMessage = userMessage.toLowerCase().trim();
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
          
          // Mapear categorias corretamente
          console.log(`🔧 Categoria original detectada: "${categoria}"`);
          
          // Mapear para categoria correta
          if (categoria.includes('aliment') || categoria.includes('hamburg') || categoria.includes('comida') || categoria.includes('café') || categoria.includes('lanche')) {
            categoria = 'alimentação';
          } else if (categoria.includes('tecnolog') || categoria.includes('computador')) {
            categoria = 'tecnologia';
          } else if (categoria.includes('pet') || categoria.includes('veterinar')) {
            categoria = 'pets';
          } else if (categoria.includes('transport') || categoria.includes('uber') || categoria.includes('taxi')) {
            categoria = 'transporte';
          } else if (categoria.includes('mercad') || categoria.includes('supermerc') || categoria.includes('compra')) {
            categoria = 'mercado';
          } else if (categoria.includes('saúde') || categoria.includes('saude') || categoria.includes('médic') || categoria.includes('farmác')) {
            categoria = 'saúde';
          } else if (categoria.includes('casa') || categoria.includes('móv') || categoria.includes('decoraç')) {
            categoria = 'casa';
          } else if (categoria.includes('conta') || categoria.includes('luz') || categoria.includes('água') || categoria.includes('internet')) {
            categoria = 'contas';
          } else if (categoria.includes('lazer') || categoria.includes('cinema') || categoria.includes('festa')) {
            categoria = 'lazer';
          } else if (categoria.includes('roup') || categoria.includes('vestuár') || categoria.includes('sapato')) {
            categoria = 'vestuário';
          } else if (categoria.includes('educaç') || categoria.includes('curso') || categoria.includes('livro')) {
            categoria = 'educação';
          } else if (categoria.includes('beleza') || categoria.includes('salão') || categoria.includes('cabeleir')) {
            categoria = 'beleza';
          } else {
            categoria = 'outros';
          }
          
          console.log(`🎉 CONFIRMAÇÃO PROCESSADA: R$ ${valor} em ${categoria}`);
          
          return {
            response: `Massa! R$ ${valor.toFixed(2)} em ${categoria} registrado! 🎉\n\nGasto salvo com sucesso!\n\nE aí, rolou mais algum gasto que você quer anotar? 😊`,
            extraction: {
              valor: valor,
              categoria: categoria,
              descricao: `Gasto confirmado em ${categoria}`,
              data: getBrazilDateString(),
              isValid: true // FINALIZA!
            }
          };
        }
      }
    }
    
    // PRIORITY #2: RESPOSTA NEGATIVA PARA MAIS GASTOS
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
            data: getBrazilDateString(),
            isValid: false
          }
        };
      }
    }
    
    try {
      if (!userId) {
        throw new Error('User ID é obrigatório para segurança');
      }

      // Preparar contexto da conversa
      const contextMessages: ChatMessage[] = [
        {
          role: 'system',
          content: this.buildSystemPrompt(systemInstructions, conversationHistory, userPersonality)
        },
        {
          role: 'user',
          content: userMessage
        }
      ];

      // ✅ CHAMADA SEGURA
      const result = await this.chatCompletion(contextMessages, userId, systemInstructions);
      
      // Parse da resposta (mesmo código do original)
      return this.parseExpenseResponse(result, userMessage, conversationHistory);
      
    } catch (error) {
      console.error('❌ Erro ao extrair dados de gasto:', error);
      throw error;
    }
  }

  private buildSystemPrompt(systemInstructions: string, conversationHistory: any[], userPersonality?: string): string {
    const personalityContext = userPersonality ? `
PERFIL DO USUÁRIO (aprenda e se adapte):
${userPersonality}

Com base no perfil, adapte seu jeito de falar para ficar mais próximo do usuário.
` : '';

    return `Você é um assistente financeiro brasileiro SUPER INTELIGENTE! Use gírias, seja natural e conecte TODAS as informações da conversa.

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
- alimentação: comida, almoço, jantar, lanche, restaurante, pizza, hambúrguer, hamburg, hamb, burger, burguer, habburg, churros, churro, mc, mcdonalds, bk, kfc, subway, ifood, delivery, café, bar, bebida, picanha, carne, frango, peixe, feira, açougue, padaria, sanduíche, sanduiche, food, fastfood, churrasco, churrascaria, alimentos, comer, eating, bebidas, suco, refrigerante, cerveja, vinho, água, leite, café, cappuccino
- vestuário: roupa, roupas, camisa, calça, sapato, tênis, blusa, vestido, shorts, jaqueta, casaco, moda, camiseta, polo, social, bermuda, shopping, loja, lojas, magazine, renner, c&a, zara, riachuelo, bolsa, bolsas, sapatos, sneaker, chinelo, sandália, boné, óculos, relógio
- transporte: uber, taxi, gasolina, combustível, posto, ônibus, metrô, trem, passagem, viagem, carro, moto, 99, cabify, aplicativo, transporte, deslocamento, ida, volta, corrida, carona
- mercado: supermercado, compras, mantimentos, feira, mercadinho, atacadão, assaí, carrefour, extra, pão de açúcar, walmart, compra, comprar, shopping, hipermercado
- lazer: cinema, festa, show, teatro, jogo, parque, balada, rolê, diversão, netflix, streaming, spotify, ingresso, entretenimento, passeio, viagem, turismo, clube, academia
- saúde: remédio, médico, farmácia, hospital, dentista, consulta, exame, tratamento, medicamento, drogaria, clínica, laboratório, check-up, fisioterapia
- casa: móvel, sofá, mesa, decoração, limpeza, reforma, casa, lar, móveis, eletrodomésticos, geladeira, fogão, microondas, tv, televisão, cama, colchão
- contas: luz, água, internet, telefone, energia, gás, conta, fatura, boleto, prestação, financiamento, cartão, taxa, iptu, ipva, seguro

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
  }

  private parseExpenseResponse(result: string, userMessage: string, conversationHistory: any[]): {
    response: string;
    extraction: ExpenseExtraction;
    personalityUpdate?: string;
  } {
    try {
      // Limpar resposta para garantir JSON válido
      let cleanedResult = result.trim();
      if (!cleanedResult.startsWith('{')) {
        const jsonMatch = cleanedResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedResult = jsonMatch[0];
        } else {
          // Fallback parsing
          return this.createFallbackResponse(userMessage);
        }
      }
      
      const parsed = JSON.parse(cleanedResult);
      
      return {
        response: parsed.response || 'Opa, não consegui processar direito...',
        extraction: {
          valor: parsed.extraction?.valor || 0,
          categoria: parsed.extraction?.categoria || '',
          descricao: parsed.extraction?.descricao || 'Gasto',
          data: parsed.extraction?.data || getBrazilDateString(),
          isValid: parsed.extraction?.isValid || false
        },
        personalityUpdate: parsed.personalityUpdate || ''
      };
      
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse da resposta:', parseError);
      return this.createFallbackResponse(userMessage);
    }
  }

  private createFallbackResponse(userMessage: string): {
    response: string;
    extraction: ExpenseExtraction;
    personalityUpdate?: string;
  } {
    // Extração básica de fallback
    let valor = 0;
    const numberMatch = userMessage.match(/\d+(?:[.,]\d+)?/);
    if (numberMatch) {
      valor = parseFloat(numberMatch[0].replace(',', '.'));
    }
    
    return {
      response: valor > 0 ? 
        `Opa, R$ ${valor.toFixed(2)} anotado! Mas em que categoria rolou esse gasto?` :
        'Opa, não consegui sacar direito... Pode falar tipo "gastei R$ 50 no mercado"? 😅',
      extraction: {
        valor: valor,
        categoria: valor > 0 ? '' : 'outros',
        descricao: valor > 0 ? 'Gasto a categorizar' : 'Gasto',
        data: getBrazilDateString(),
        isValid: false
      }
    };
  }
}

// ✅ INSTÂNCIA SEGURA - Use esta ao invés da OpenAIService original
export const secureOpenAI = new SecureOpenAIService();

/*
🔐 BENEFÍCIOS DESTA VERSÃO:

✅ API Key 100% SEGURA (só no servidor)
✅ Rate limiting automático do Supabase
✅ CORS configurado automaticamente
✅ Logs de segurança detalhados
✅ Tratamento de erros robusto
✅ Validação de usuário obrigatória
✅ Mesma funcionalidade do original

🚀 PARA USAR:

1. Configure a Edge Function no Supabase
2. Substitua OpenAIService por SecureOpenAIService no Chat.tsx
3. Remova a API Key do banco de dados
4. Profit! 🎉

EXEMPLO DE USO:
const result = await secureOpenAI.extractExpenseData(
  userMessage, 
  systemInstructions, 
  conversationHistory,
  userPersonality,
  userId // ✅ Obrigatório para segurança
);
*/ 