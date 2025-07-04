import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseDatabase } from '@/lib/supabase-database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Opcional: adicione autenticação por token para evitar disparos não autorizados
  try {
    await supabaseDatabase.checkAndNotifyUpcomingAppointments();
    res.status(200).json({ ok: true, message: 'Webhooks de compromisso verificados e disparados.' });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
} 