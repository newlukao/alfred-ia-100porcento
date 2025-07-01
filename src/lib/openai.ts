
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

DETECÇÃO INTELIGENTE DE CATEGORIAS (use sua inteligência para interpretar):
- alimentação: qualquer comida, bebida, restaurante, delivery, mercado (quando for comida)
- tecnologia: eletrônicos, computadores, celulares, games, software, streaming
- vestuário: roupas, sapatos, acessórios, bolsas, óculos
- transporte: uber, taxi, gasolina, carro, moto, ônibus, passagens, consertos de veículo
- casa: móveis, decoração, utensílios, eletrodomésticos, reforma, limpeza
- saúde: remédios, médicos, dentista, exames, hospitais, farmácia
- lazer: cinema, shows, viagens, hotéis, academia, livros, hobbies
- educação: cursos, faculdade, livros educacionais, material escolar
- beleza: salão, cabelo, maquiagem, perfumes, produtos de beleza
- pets: veterinário, ração, petshop, cuidados com animais
- mercado: supermercado, compras de mantimentos (não comida pronta)
- contas: luz, água, internet, telefone, aluguel, financiamentos

IMPORTANTE: USE SUA INTELIGÊNCIA! 
- "veterinário" = pets (óbvio!)
- "shampoo" = beleza (óbvio!)
- "netflix" = tecnologia (óbvio!)
- "gasolina" = transporte (óbvio!)
- "pizza" = alimentação (óbvio!)

Não seja literal com palavras-chave. INTERPRETE o contexto como um humano faria!

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
          const categoriaMatch = lastBotMessage.content.match(/em\s+(\w+)/i);
          
          console.log(`💰 Valor extraído: ${valorMatch?.[1]}`);
          console.log(`🏷️ Categoria extraída: ${categoriaMatch?.[1]}`);
          
          if (valorMatch && categoriaMatch) {
            const valor = parseFloat(valorMatch[1].replace(',', '.'));
            let categoria = categoriaMatch[1].toLowerCase();
            
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
            
            console.log(`🎉 CONFIRMAÇÃO PROCESSADA: R$ ${valor} em ${categoria}`);
            
            return {
              response: `Show demais! R$ ${valor.toFixed(2)} em ${categoria} registrado! 🎉 Gasto salvo com sucesso!\n\nE aí, rolou mais algum gasto hoje que você quer anotar? 😊`,
              extraction: {
                valor: valor,
                categoria: categoria,
                descricao: `Gasto em ${categoria}`,
                data: new Date().toISOString().split('T')[0],
                isValid: true // CONFIRMA E REGISTRA!
              }
            };
          }
        }
      }
      
      // DETECÇÃO DE RESPOSTAS NEGATIVAS (não tem mais gastos)
      const negativeWords = ['nao', 'não', 'nada', 'sem', 'rolou nao', 'rolou não', 'não rolou', 'nao rolou', 'por hoje não', 'hoje não', 'sem mais', 'acabou', 'só isso'];
      const isNegative = negativeWords.some(word => currentMessage.includes(word));
      
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
      
      // DETECÇÃO DE SAUDAÇÕES E CUMPRIMENTOS
      const greetingWords = ['ola', 'olá', 'oi', 'eai', 'e ai', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'hello', 'salve', 'fala'];
      const isGreeting = greetingWords.some(word => currentMessage.includes(word));
      
      console.log(`👋 Verificando saudação para: "${userMessage}"`);
      console.log(`👋 É saudação? ${isGreeting}`);
      
      if (isGreeting) {
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
      
      // DETECÇÃO DE CONFIRMAÇÕES CONVERSACIONAIS (respostas positivas após saudação)
      const conversationalWords = ['vamos', 'bora', 'ok', 'beleza', 'sim', 'claro', 'dale', 'show', 'massa', 'vamo', 'bora lá', 'pode ser', 'tranquilo', 'fechou'];
      const isConversational = conversationalWords.some(word => currentMessage.includes(word));
      
      console.log(`💬 Verificando resposta conversacional para: "${userMessage}"`);
      console.log(`💬 É conversacional? ${isConversational}`);
      
      if (isConversational) {
        // Verificar se a mensagem anterior do bot foi uma saudação
        const botMessages = conversationHistory.filter(msg => msg.type === 'assistant');
        const lastBotMessage = botMessages[botMessages.length - 1];
        
        if (lastBotMessage && (lastBotMessage.content.includes('Pronto pra anotar') || lastBotMessage.content.includes('Vamos registrar'))) {
          const readyResponses = [
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
      
      // PRIORIZAR RESPOSTA DA OpenAI - ELA É INTELIGENTE!
      try {
        // Clean the response to ensure it's valid JSON
        let cleanedResult = result.trim();
        if (!cleanedResult.startsWith('{')) {
          const jsonMatch = cleanedResult.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            cleanedResult = jsonMatch[0];
          } else {
            // FALLBACK SIMPLES: só se OpenAI falhar completamente
            console.log('OpenAI não retornou JSON válido, usando fallback');
            const numberMatch = userMessage.match(/\d+(?:[.,]\d+)?/);
            const valor = numberMatch ? parseFloat(numberMatch[0].replace(',', '.')) : 0;
            
            return {
              response: valor > 0 ? 
                `Opa, R$ ${valor.toFixed(2)} anotado! Mas em que categoria rolou esse gasto? (alimentação, vestuário, transporte...)` :
                'Opa, não consegui sacar direito... Pode falar tipo "gastei R$ 50 no mercado"? 😅',
              extraction: {
                valor: valor,
                categoria: '',
                descricao: valor > 0 ? 'Gasto a categorizar' : 'Gasto',
                data: new Date().toISOString().split('T')[0],
                isValid: false
              }
            };
          }
        }
        
        const parsed = JSON.parse(cleanedResult);
        
        // USAR DIRETAMENTE A RESPOSTA DA OpenAI - ELA SABE O QUE FAZ!
        return {
          response: parsed.response || 'Opa, não consegui sacar direito... Pode falar tipo "gastei R$ 50 no mercado"? 😅',
          extraction: {
            valor: parsed.extraction?.valor || 0,
            categoria: parsed.extraction?.categoria || '',
            descricao: parsed.extraction?.descricao || 'Gasto',
            data: parsed.extraction?.data || new Date().toISOString().split('T')[0],
            isValid: parsed.extraction?.isValid || false
          },
          personalityUpdate: parsed.personalityUpdate || ''
        };
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
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
    } catch (error) {
      console.error('Error extracting expense data:', error);
      throw error;
    }
  }
}
