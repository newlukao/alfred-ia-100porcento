import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!;

// Validar se as variáveis existem
if (!supabaseUrl || !supabaseKey) {
  console.error('[Webhook] Variáveis do Supabase não configuradas:', {
    url: !!supabaseUrl,
    key: !!supabaseKey
  });
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Segredo do webhook - configure na Vercel como CAKTO_WEBHOOK_SECRET
const SECRET = process.env.CAKTO_WEBHOOK_SECRET || 'sua_chave_secreta_aqui';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[Cakto Webhook] Requisição recebida:', {
    method: req.method,
    headers: req.headers,
    body: req.body ? 'presente' : 'ausente'
  });

  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verificar se o body existe
    if (!req.body) {
      console.error('[Cakto Webhook] Body da requisição está vazio');
      return res.status(400).json({ error: 'Body da requisição é obrigatório' });
    }

    const { secret, event, data } = req.body;

    // Log para debug
    console.log('[Cakto Webhook] Evento recebido:', event);
    console.log('[Cakto Webhook] Secret recebido:', secret ? 'presente' : 'ausente');
    console.log('[Cakto Webhook] Data recebida:', data ? 'presente' : 'ausente');
    console.log('[Cakto Webhook] Payload completo recebido:', JSON.stringify(req.body, null, 2));

    // Validação do segredo (segurança)
    if (secret !== SECRET) {
      console.error('[Cakto Webhook] Segredo inválido recebido:', secret);
      console.error('[Cakto Webhook] Segredo esperado:', SECRET);
      return res.status(401).json({ error: 'Acesso negado: secret inválido' });
    }

    // Processar eventos de pagamento aprovado ou renovação
    if (event === 'purchase_approved' || event === 'subscription_renewed') {
      const result = await processarVendaAprovada(data);
      return res.status(200).json({ 
        success: true, 
        message: 'Webhook processado com sucesso',
        user_id: result?.user_id,
        action: result?.action
      });
    }

    // Processar cancelamento de assinatura
    if (event === 'subscription_canceled') {
      await processarCancelamento(data);
      return res.status(200).json({ 
        success: true, 
        message: 'Cancelamento processado com sucesso' 
      });
    }

    // Processar reembolso
    if (event === 'refund') {
      await processarReembolso(data);
      return res.status(200).json({ 
        success: true, 
        message: 'Reembolso processado com sucesso' 
      });
    }

    // Eventos não suportados
    console.log('[Cakto Webhook] Evento não suportado:', event);
    return res.status(400).json({ error: `Evento não suportado: ${event}` });

  } catch (error) {
    console.error('[Cakto Webhook] Erro:', error);
    return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
}

async function processarVendaAprovada(data: any) {
  // Extrair dados do cliente
  const email = data.customer?.email?.toLowerCase()?.trim();
  const nome = data.customer?.name || '';
  const whatsapp = data.customer?.phone || '';

  if (!email) {
    console.error('[Cakto Webhook] Email não encontrado no payload');
    throw new Error('Email é obrigatório');
  }

  // Extrair dados do produto/plano
  const produtoNome = data.product?.name || '';
  const ofertaNome = data.offer?.name || data.offerName || '';
  const valor = data.product?.price || data.transaction?.amount || data.amount || 0;
  const transactionId = data.transaction?.id || data.id || '';

  // Determinar o plano e duração baseado no nome da oferta
  let plano = 'bronze';
  let diasPlano = 30;

  // Lógica para determinar o plano baseado no nome da oferta
  const ofertaLower = ofertaNome.toLowerCase().replace(/\s/g, '');

  if (ofertaLower.includes('ouro') || ofertaLower.includes('gold') || ofertaLower.includes('premium')) {
    plano = 'ouro';
  } else if (ofertaLower.includes('bronze') || ofertaLower.includes('basico') || ofertaLower.includes('basic')) {
    plano = 'bronze';
  } else if (ofertaLower.includes('trial')) {
    plano = 'trial';
    diasPlano = 7;
  }

  // Detectar duração do plano pelo nome da oferta
  if (ofertaLower.includes('1mes') || ofertaLower.includes('mensal')) {
    diasPlano = 30;
  } else if (ofertaLower.includes('3mes') || ofertaLower.includes('trimestral')) {
    diasPlano = 90;
  } else if (ofertaLower.includes('6mes') || ofertaLower.includes('semestral')) {
    diasPlano = 180;
  } else if (ofertaLower.includes('1ano') || ofertaLower.includes('anual') || ofertaLower.includes('12mes')) {
    diasPlano = 365;
  } else if (plano === 'ouro' && !ofertaLower.includes('trial')) {
    diasPlano = 365;
  } else if (plano === 'bronze' && !ofertaLower.includes('trial')) {
    diasPlano = 30;
  }

  // Fallback: se não achar oferta, usa produto
  if (!ofertaNome) {
    const produtoLower = produtoNome.toLowerCase();
    if (produtoLower.includes('ouro') || produtoLower.includes('gold') || produtoLower.includes('premium')) {
      plano = 'ouro';
    } else if (produtoLower.includes('bronze') || produtoLower.includes('basico') || produtoLower.includes('basic')) {
      plano = 'bronze';
    } else if (produtoLower.includes('trial')) {
      plano = 'trial';
      diasPlano = 7;
    }
    if (produtoLower.includes('1 mes') || produtoLower.includes('1mes') || produtoLower.includes('mensal')) {
      diasPlano = 30;
    } else if (produtoLower.includes('3 mes') || produtoLower.includes('3mes') || produtoLower.includes('trimestral')) {
      diasPlano = 90;
    } else if (produtoLower.includes('6 mes') || produtoLower.includes('6mes') || produtoLower.includes('semestral')) {
      diasPlano = 180;
    } else if (produtoLower.includes('1 ano') || produtoLower.includes('anual') || produtoLower.includes('12 mes')) {
      diasPlano = 365;
    } else if (plano === 'ouro' && !produtoLower.includes('trial')) {
      diasPlano = 365;
    } else if (plano === 'bronze' && !produtoLower.includes('trial')) {
      diasPlano = 30;
    }
  }

  // Calcular data de expiração
  const plan_expiration = new Date(Date.now() + diasPlano * 24 * 60 * 60 * 1000).toISOString();

  console.log('[Cakto Webhook] Processando venda:', {
    email,
    nome,
    plano,
    diasPlano,
    valor: valor / 100,
    produtoNome,
    ofertaNome,
    transactionId
  });

  // Buscar usuário existente
  const { data: existingUsers } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .limit(1);

  let user = existingUsers?.[0];
  let action = 'user_updated';

  if (user) {
    // Usuário existe: atualizar plano
    console.log('[Cakto Webhook] Atualizando usuário existente:', user.id);
    
    const { error: updateError } = await supabase
      .from('users')
      .update({
        plan_type: plano,
        plan_expiration,
        nome: nome || user.nome,
        whatsapp: whatsapp || user.whatsapp,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[Cakto Webhook] Erro ao atualizar usuário:', updateError);
      throw updateError;
    }
  } else {
    // Usuário não existe: criar novo
    console.log('[Cakto Webhook] Criando novo usuário:', email);
    action = 'user_created';
    
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        nome,
        email,
        whatsapp,
        plan_type: plano,
        plan_expiration,
        is_admin: false,
        data_criacao: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('[Cakto Webhook] Erro ao criar usuário:', createError);
      throw createError;
    }

    user = newUser;
  }

  // Registrar a venda
  const { error: saleError } = await supabase
    .from('vendas')
    .insert({
      email,
      plano,
      tempo_plano: `${diasPlano} dias`,
      valor: valor,
      data_venda: new Date().toISOString(),
      transaction_id: transactionId,
      produto_nome: produtoNome,
      oferta_nome: ofertaNome,
    });

  if (saleError) {
    console.error('[Cakto Webhook] Erro ao registrar venda:', saleError);
    // Não falha o processo se não conseguir registrar a venda
  }

  // Disparar webhook interno para notificações
  await triggerWebhooks('venda_realizada', {
    id: user.id,
    email,
    nome,
    whatsapp,
    plano,
    valor: valor / 100,
    produto: produtoNome,
    transaction_id: transactionId,
  });

  console.log('[Cakto Webhook] Venda processada com sucesso para:', email);
  
  return { user_id: user.id, action };
}

async function processarCancelamento(data: any) {
  const email = data.customer?.email?.toLowerCase()?.trim();

  if (!email) {
    console.error('[Cakto Webhook] Email não encontrado no payload de cancelamento');
    throw new Error('Email é obrigatório para cancelamento');
  }

  console.log('[Cakto Webhook] Processando cancelamento para:', email);

  // Buscar usuário
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .limit(1);

  const user = users?.[0];

  if (user) {
    // Remover plano do usuário
    const { error } = await supabase
      .from('users')
      .update({
        plan_type: null,
        plan_expiration: null,
      })
      .eq('id', user.id);

    if (error) {
      console.error('[Cakto Webhook] Erro ao cancelar plano:', error);
      throw error;
    }

    console.log('[Cakto Webhook] Plano cancelado para usuário:', user.id);
  } else {
    console.log('[Cakto Webhook] Usuário não encontrado para cancelamento:', email);
  }
}

async function processarReembolso(data: any) {
  const email = data.customer?.email?.toLowerCase()?.trim();

  if (!email) {
    console.error('[Cakto Webhook] Email não encontrado no payload de reembolso');
    throw new Error('Email é obrigatório para reembolso');
  }

  console.log('[Cakto Webhook] Processando reembolso para:', email);

  // Buscar usuário
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .limit(1);

  const user = users?.[0];

  if (user) {
    // Remover plano do usuário devido ao reembolso
    const { error } = await supabase
      .from('users')
      .update({
        plan_type: null,
        plan_expiration: null,
      })
      .eq('id', user.id);

    if (error) {
      console.error('[Cakto Webhook] Erro ao processar reembolso:', error);
      throw error;
    }

    console.log('[Cakto Webhook] Plano removido devido ao reembolso para usuário:', user.id);
  } else {
    console.log('[Cakto Webhook] Usuário não encontrado para reembolso:', email);
  }
}

async function triggerWebhooks(evento: string, payload: any) {
  try {
    // Buscar webhooks configurados para este evento
    const { data: webhooks } = await supabase
      .from('webhooks')
      .select('*')
      .eq('evento', evento);

    if (!webhooks || webhooks.length === 0) {
      console.log(`[Webhook] Nenhum webhook configurado para o evento: ${evento}`);
      return;
    }

    // Disparar para todos os webhooks configurados
    for (const webhook of webhooks) {
      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            evento,
            dados: payload,
            timestamp: new Date().toISOString(),
          }),
        });

        console.log(`[Webhook] Disparado para ${webhook.url} - Status: ${response.status}`);
      } catch (error) {
        console.error(`[Webhook] Erro ao disparar para ${webhook.url}:`, error);
      }
    }
  } catch (error) {
    console.error('[Webhook] Erro ao buscar webhooks:', error);
  }
} 
