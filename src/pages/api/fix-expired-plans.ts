import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Proteção por segredo (opcional, recomendado)
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end('Unauthorized');
  }

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .not('plan_type', 'is', null)
      .neq('is_admin', true);

    if (error) {
      console.error('Erro ao buscar usuários:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    const now = new Date();
    let count = 0;

    for (const user of users) {
      let expired = false;

      if (user.plan_type === 'trial' && user.trial_start) {
        const trialStart = new Date(user.trial_start);
        const diffDays = (now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays >= 1) expired = true;
      } else if ((user.plan_type === 'ouro' || user.plan_type === 'bronze') && user.plan_expiration) {
        const planExpiration = new Date(user.plan_expiration);
        if (planExpiration < now) expired = true;
      }

      if (expired) {
        await supabase
          .from('users')
          .update({ plan_type: null, plan_expiration: null, trial_start: null })
          .eq('id', user.id);
        count++;
        console.log(`Usuário ${user.email} (${user.id}) atualizado para SEM PLANO`);
      }
    }

    return res.status(200).json({ ok: true, updated: count });
  } catch (err) {
    console.error('Erro geral:', err);
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
} 