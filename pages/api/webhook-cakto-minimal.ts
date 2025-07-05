import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[Cakto Minimal] Método:', req.method);
  console.log('[Cakto Minimal] Body:', req.body);

  // Permitir GET para teste
  if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'Webhook Cakto funcionando!',
      timestamp: new Date().toISOString(),
      env_vars: {
        supabase_url: !!process.env.VITE_SUPABASE_URL || !!process.env.SUPABASE_URL,
        supabase_key: !!process.env.VITE_SUPABASE_ANON_KEY || !!process.env.SUPABASE_ANON_KEY,
        webhook_secret: !!process.env.CAKTO_WEBHOOK_SECRET
      }
    });
  }

  // Só aceita POST para webhook real
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { secret, event, data } = req.body || {};

    // Log básico
    console.log('[Cakto Minimal] Evento:', event);
    console.log('[Cakto Minimal] Secret presente:', !!secret);

    // Validação básica
    if (!event) {
      return res.status(400).json({ error: 'Evento é obrigatório' });
    }

    // Simular processamento sem Supabase
    if (event === 'purchase_approved') {
      console.log('[Cakto Minimal] Processando venda:', data?.customer?.email);
      
      return res.status(200).json({ 
        success: true,
        message: 'Venda processada (modo teste)',
        event,
        customer: data?.customer?.email
      });
    }

    return res.status(200).json({ 
      success: true,
      message: 'Evento recebido (modo teste)',
      event
    });

  } catch (error) {
    console.error('[Cakto Minimal] Erro:', error);
    return res.status(500).json({ 
      error: 'Erro interno', 
      message: error.message 
    });
  }
} 