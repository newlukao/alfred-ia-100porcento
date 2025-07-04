import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseDatabase } from '@/lib/supabase-database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end('Unauthorized');
  }
  try {
    await supabaseDatabase.checkAndNotifyUpcomingAppointments();
    res.status(200).json({ ok: true, message: 'Webhooks de compromisso verificados e disparados.' });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
} 