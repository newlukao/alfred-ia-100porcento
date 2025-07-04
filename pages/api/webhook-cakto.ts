import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseDatabase } from '@/lib/supabase-database';

// Segredo do webhook - configure no .env.local como CAKTO_WEBHOOK_SECRET
const SECRET = process.env.CAKTO_WEBHOOK_SECRET || '123';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { secret, event, data } = req.body;

    // Log para debug
    console.log('[Cakto Webhook] Evento recebido:', event);
    console.log('[Cakto Webhook] Dados:', JSON.stringify(data, null, 2));

    // Validação do segredo (segurança)
    if (secret !== SECRET) {
      console.error('[Cakto Webhook] Segredo inválido:', secret);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Processar eventos de pagamento aprovado ou renovação
    if (event === 'purchase_approved' || event === 'subscription_renewed') {
      await processarVendaAprovada(data);
      return res.status(200).json({ ok: true, message: 'Venda processada com sucesso' });
    }

    // Processar cancelamento de assinatura
    if (event === 'subscription_canceled') {
      await processarCancelamento(data);
      return res.status(200).json({ ok: true, message: 'Cancelamento processado com sucesso' });
    }

    // Processar reembolso
    if (event === 'refund') {
      await processarReembolso(data);
      return res.status(200).json({ ok: true, message: 'Reembolso processado com sucesso' });
    }

    // Outros eventos: apenas logar
    console.log('[Cakto Webhook] Evento não processado:', event);
    return res.status(200).json({ ok: true, message: 'Evento recebido mas não processado' });

  } catch (error) {
    console.error('[Cakto Webhook] Erro:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

async function processarVendaAprovada(data: any) {
  // Extrair dados do cliente
  const email = data.customer?.email?.toLowerCase()?.trim();
  const nome = data.customer?.name || '';
  const whatsapp = data.customer?.phone || '';

  if (!email) {
    console.error('[Cakto Webhook] Email não encontrado no payload');
    return;
  }

  // Extrair dados do produto/plano
  const produtoNome = data.product?.name || data.offer?.name || '';
  const valor = data.amount || data.offer?.price || 0;
  const tipo = data.product?.type || 'unique'; // 'unique' ou 'subscription'

  // Determinar o plano e duração baseado no nome do produto
  let plano = 'bronze';
  let diasPlano = 30;

  // Lógica para determinar o plano baseado no nome do produto
  const produtoLower = produtoNome.toLowerCase();
  
  // Detectar tipo de plano
  if (produtoLower.includes('ouro') || produtoLower.includes('gold') || produtoLower.includes('premium')) {
    plano = 'ouro';
  } else if (produtoLower.includes('bronze') || produtoLower.includes('basico') || produtoLower.includes('basic')) {
    plano = 'bronze';
  } else if (produtoLower.includes('trial')) {
    plano = 'trial';
    diasPlano = 7;
  } else {
    // Fallback por valor
    if (valor >= 100) {
      plano = 'ouro';
    } else {
      plano = 'bronze';
    }
  }

  // Detectar duração do plano pelo nome do produto
  if (produtoLower.includes('1 mes') || produtoLower.includes('1mes') || produtoLower.includes('mensal')) {
    diasPlano = 30;
  } else if (produtoLower.includes('3 mes') || produtoLower.includes('3mes') || produtoLower.includes('trimestral')) {
    diasPlano = 90;
  } else if (produtoLower.includes('6 mes') || produtoLower.includes('6mes') || produtoLower.includes('semestral')) {
    diasPlano = 180;
  } else if (produtoLower.includes('1 ano') || produtoLower.includes('anual') || produtoLower.includes('12 mes')) {
    diasPlano = 365;
  } else if (plano === 'ouro' && !produtoLower.includes('trial')) {
    // Ouro padrão: 1 ano
    diasPlano = 365;
  } else if (plano === 'bronze' && !produtoLower.includes('trial')) {
    // Bronze padrão: 1 mês
    diasPlano = 30;
  }

  // Para assinaturas recorrentes, usar o período de recorrência se disponível
  if (tipo === 'subscription' && data.subscription?.recurrence_period) {
    diasPlano = Number(data.subscription.recurrence_period);
  }

  // Calcular data de expiração
  const plan_expiration = new Date(Date.now() + diasPlano * 24 * 60 * 60 * 1000).toISOString();

  console.log('[Cakto Webhook] Processando venda:', {
    email,
    nome,
    plano,
    diasPlano,
    valor,
    tipo,
    produtoNome
  });

  // Buscar usuário existente
  let user = await supabaseDatabase.getUserByEmail(email);

  if (user) {
    // Usuário existe: atualizar plano
    console.log('[Cakto Webhook] Atualizando usuário existente:', user.id);
    await supabaseDatabase.updateUserPlan(user.id, plano as any, plan_expiration);
    
    // Atualizar nome e whatsapp se necessário
    if (nome && nome !== user.nome) {
      await supabaseDatabase.updateUser(user.id, { nome, whatsapp });
    }
  } else {
    // Usuário não existe: criar novo
    console.log('[Cakto Webhook] Criando novo usuário:', email);
    user = await supabaseDatabase.createUser({
      nome,
      email,
      whatsapp,
      plan_type: plano as any,
      plan_expiration,
      is_admin: false,
      data_criacao: new Date().toISOString(),
    });
  }

  // Registrar a venda
  await supabaseDatabase.addSale({
    admin_id: 'webhook-cakto',
    email,
    plano: plano as any,
    tempo_plano: `${diasPlano} dias`,
    valor,
    data_venda: data.paidAt || data.createdAt || new Date().toISOString(),
  });

  console.log('[Cakto Webhook] Venda processada com sucesso para:', email);
}

async function processarCancelamento(data: any) {
  const email = data.customer?.email?.toLowerCase()?.trim();

  if (!email) {
    console.error('[Cakto Webhook] Email não encontrado no payload de cancelamento');
    return;
  }

  console.log('[Cakto Webhook] Processando cancelamento para:', email);

  // Buscar usuário
  const user = await supabaseDatabase.getUserByEmail(email);

  if (user) {
    // Remover plano do usuário
    await supabaseDatabase.updateUserPlan(user.id, null, null);
    console.log('[Cakto Webhook] Plano cancelado para usuário:', user.id);
  } else {
    console.log('[Cakto Webhook] Usuário não encontrado para cancelamento:', email);
  }
}

async function processarReembolso(data: any) {
  const email = data.customer?.email?.toLowerCase()?.trim();

  if (!email) {
    console.error('[Cakto Webhook] Email não encontrado no payload de reembolso');
    return;
  }

  console.log('[Cakto Webhook] Processando reembolso para:', email);

  // Buscar usuário
  const user = await supabaseDatabase.getUserByEmail(email);

  if (user) {
    // Remover plano do usuário devido ao reembolso
    await supabaseDatabase.updateUserPlan(user.id, null, null);
    console.log('[Cakto Webhook] Plano removido devido ao reembolso para usuário:', user.id);
  } else {
    console.log('[Cakto Webhook] Usuário não encontrado para reembolso:', email);
  }
} 